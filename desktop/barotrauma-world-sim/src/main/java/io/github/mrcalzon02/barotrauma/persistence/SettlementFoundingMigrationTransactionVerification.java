package io.github.mrcalzon02.barotrauma.persistence;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

/** Focused end-to-end contract for staged founders becoming one canonical station population. */
public final class SettlementFoundingMigrationTransactionVerification {
    private SettlementFoundingMigrationTransactionVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite::memory:")) {
            try (Statement statement = connection.createStatement()) {
                statement.execute("PRAGMA foreign_keys=ON");
                prerequisites(statement);
                for (String sql : SettlementLifecycleSchema.statements()) statement.execute(sql);
                for (String sql : SettlementFoundingMigrationSchema.statements()) statement.execute(sql);
                seedWorld(statement);
            }

            insertProject(connection, "project-success", "location-frontier", "ACTIVE", 9);
            insertFoundingFlow(connection, "flow-success", "project-success", "location-frontier");
            require(accounted(connection) == 100,
                    "Staged founding cohort was not conserved before project completion.");

            SettlementProjectEngine.EngineResult result;
            connection.setAutoCommit(false);
            try {
                result = SettlementProjectEngine.advance(connection, "world-1", 20);
                connection.commit();
            } catch (Exception exception) {
                try { connection.rollback(); }
                catch (SQLException rollbackFailure) { exception.addSuppressed(rollbackFailure); }
                throw exception;
            } finally {
                connection.setAutoCommit(true);
            }
            require(result.completedProjects() == 1,
                    "Founding project did not complete through the deterministic engine.");
            require(text(connection, "SELECT status FROM settlement_project WHERE project_id='project-success'")
                            .equals("COMPLETE"),
                    "Founding project did not retain its complete lifecycle state.");
            require(scalar(connection, "SELECT is_station FROM world_location "
                            + "WHERE location_id='location-frontier'") == 1,
                    "Founding did not activate the target location as a station.");
            require(scalar(connection, "SELECT COUNT(*) FROM world_station "
                            + "WHERE location_id='location-frontier'") == 1,
                    "Founding did not create exactly one canonical station.");
            String foundedStation = text(connection,
                    "SELECT station_id FROM settlement_founding_handoff WHERE project_id='project-success'");
            String foundedPopulation = text(connection,
                    "SELECT population_id FROM settlement_founding_handoff WHERE project_id='project-success'");
            require(scalar(connection, "SELECT civilians+industrial_workers+logistics_workers+security_personnel+"
                            + "medical_personnel+scientific_personnel+temporary_residents+refugees "
                            + "FROM npc_population_state WHERE population_id='" + foundedPopulation + "'") == 20,
                    "Founding did not install the exact staged survivor population.");
            require(text(connection, "SELECT baseline_kind FROM station_population_state WHERE station_id='"
                            + foundedStation + "'").equals("GENERATED_ALLOCATION"),
                    "Founded station did not receive a generated population baseline.");
            require(scalar(connection, "SELECT resident_count FROM station_population_state WHERE station_id='"
                            + foundedStation + "'") == 20,
                    "Founded station aggregate population differs from its detailed cohorts.");
            require(scalar(connection, "SELECT workforce_count FROM station_population_state WHERE station_id='"
                            + foundedStation + "'") == 7,
                    "Founded station aggregate workforce differs from its detailed cohorts.");
            require(text(connection, "SELECT status FROM station_simulation_state WHERE station_id='"
                            + foundedStation + "'").equals("STRAINED"),
                    "Founded station did not activate in strained operating state.");
            require(text(connection, "SELECT frontier_state FROM station_civilization_state WHERE station_id='"
                            + foundedStation + "'").equals("HOLDING"),
                    "Founded station did not establish a holding frontier.");
            require(scalar(connection, "SELECT COUNT(*) FROM settlement_founding_handoff_cohort "
                            + "WHERE project_id='project-success'") == 8,
                    "Founding did not preserve all eight cohort evidence rows.");
            require(scalar(connection, "SELECT SUM(quantity) FROM settlement_founding_handoff_cohort "
                            + "WHERE project_id='project-success'") == 20,
                    "Founding cohort evidence does not equal the settled quantity.");
            require(scalar(connection, "SELECT immigration FROM npc_population_ledger WHERE population_id='"
                            + foundedPopulation + "' AND tick_sequence=20") == 20,
                    "Founding did not record exact immigration ledger evidence.");
            require(accounted(connection) == 100,
                    "Founding handoff changed conserved world population.");

            insertProject(connection, "project-rollback", "location-rollback", "ACTIVE", 9);
            insertFoundingFlow(connection, "flow-rollback", "project-rollback", "location-rollback");
            try (Statement statement = connection.createStatement()) {
                statement.execute("CREATE TRIGGER founding_rollback_probe BEFORE INSERT ON settlement_founding_handoff "
                        + "WHEN NEW.project_id='project-rollback' BEGIN "
                        + "SELECT RAISE(ABORT,'Founding rollback probe'); END");
            }
            long stationsBefore = scalar(connection, "SELECT COUNT(*) FROM world_station");
            long populationsBefore = scalar(connection, "SELECT COUNT(*) FROM npc_population_state");
            long ledgerBefore = scalar(connection, "SELECT COUNT(*) FROM npc_population_ledger");
            long observationsBefore = scalar(connection, "SELECT COUNT(*) FROM world_observation_event");
            connection.setAutoCommit(false);
            try {
                SettlementProjectEngine.advance(connection, "world-1", 30);
                throw new IllegalStateException("Expected founding rollback probe failure.");
            } catch (SQLException exception) {
                require(exception.getMessage() != null && exception.getMessage().contains("Founding rollback probe"),
                        "Unexpected founding rollback failure: " + exception.getMessage());
                connection.rollback();
            } finally {
                connection.setAutoCommit(true);
            }
            try (Statement statement = connection.createStatement()) {
                statement.execute("DROP TRIGGER founding_rollback_probe");
            }
            require(text(connection, "SELECT status FROM settlement_project WHERE project_id='project-rollback'")
                            .equals("ACTIVE"),
                    "Failed founding retained its complete lifecycle transition.");
            require(scalar(connection, "SELECT progress_units FROM settlement_project "
                            + "WHERE project_id='project-rollback'") == 9,
                    "Failed founding retained its final work unit.");
            require(scalar(connection, "SELECT COUNT(*) FROM settlement_project_contribution "
                            + "WHERE project_id='project-rollback' AND contribution_kind='WORK'") == 0,
                    "Failed founding retained work contribution evidence.");
            require(scalar(connection, "SELECT is_station FROM world_location "
                            + "WHERE location_id='location-rollback'") == 0,
                    "Failed founding retained target-location activation.");
            require(scalar(connection, "SELECT COUNT(*) FROM world_station") == stationsBefore,
                    "Failed founding retained a partially initialized station.");
            require(scalar(connection, "SELECT COUNT(*) FROM npc_population_state") == populationsBefore,
                    "Failed founding retained a partially initialized population.");
            require(scalar(connection, "SELECT COUNT(*) FROM npc_population_ledger") == ledgerBefore,
                    "Failed founding retained population ledger evidence.");
            require(scalar(connection, "SELECT COUNT(*) FROM world_observation_event") == observationsBefore,
                    "Failed founding retained observation evidence.");
            require(scalar(connection, "SELECT COUNT(*) FROM settlement_founding_handoff "
                            + "WHERE project_id='project-rollback'") == 0,
                    "Failed founding retained a handoff row.");
            require(foreignKeys(connection) == 0,
                    "Founding transaction verification left foreign-key violations.");
        }
    }

    private static void prerequisites(Statement statement) throws SQLException {
        statement.execute("CREATE TABLE world_metadata(world_id TEXT PRIMARY KEY,display_name TEXT NOT NULL,"
                + "created_at TEXT NOT NULL,canonical_time TEXT)");
        statement.execute("CREATE TABLE simulation_transaction_context(world_id TEXT PRIMARY KEY,current_canonical TEXT)");
        statement.execute("CREATE TABLE world_location(location_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,"
                + "source_location_id TEXT NOT NULL,source_ordinal INTEGER NOT NULL,display_name TEXT NOT NULL,"
                + "location_type TEXT,ring INTEGER NOT NULL,location_level INTEGER NOT NULL,map_x REAL,map_y REAL,"
                + "biome TEXT,faction TEXT,is_station INTEGER NOT NULL DEFAULT 0)");
        statement.execute("CREATE TABLE world_station(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,"
                + "location_id TEXT NOT NULL UNIQUE,source_station_id TEXT NOT NULL,display_name TEXT NOT NULL,"
                + "station_type TEXT,faction TEXT,has_economy INTEGER NOT NULL DEFAULT 0)");
        statement.execute("CREATE TABLE station_simulation_state(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,"
                + "credits INTEGER NOT NULL,supplies INTEGER NOT NULL,ore INTEGER NOT NULL,industry INTEGER NOT NULL,"
                + "security INTEGER NOT NULL,integrity INTEGER NOT NULL,threat INTEGER NOT NULL,research INTEGER NOT NULL,"
                + "status TEXT NOT NULL,last_tick INTEGER NOT NULL)");
        statement.execute("CREATE TABLE station_civilization_state(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,"
                + "population_index INTEGER NOT NULL,civilization_strength INTEGER NOT NULL,fauna_pressure INTEGER NOT NULL,"
                + "supply_consumption_base INTEGER NOT NULL,last_consumption INTEGER NOT NULL,shortage_ticks INTEGER NOT NULL,"
                + "surplus_ticks INTEGER NOT NULL,frontier_position INTEGER NOT NULL,frontier_state TEXT NOT NULL,"
                + "last_tick INTEGER NOT NULL)");
        statement.execute("CREATE TABLE station_population_state(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,"
                + "baseline_kind TEXT NOT NULL,baseline_tick INTEGER NOT NULL,baseline_resident_count INTEGER NOT NULL,"
                + "resident_count INTEGER NOT NULL,baseline_workforce_count INTEGER NOT NULL,workforce_count INTEGER NOT NULL,"
                + "last_tick INTEGER NOT NULL)");
        statement.execute("CREATE TABLE npc_population_state(population_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,"
                + "station_id TEXT NOT NULL UNIQUE,civilians INTEGER NOT NULL,industrial_workers INTEGER NOT NULL,"
                + "logistics_workers INTEGER NOT NULL,security_personnel INTEGER NOT NULL,medical_personnel INTEGER NOT NULL,"
                + "scientific_personnel INTEGER NOT NULL,temporary_residents INTEGER NOT NULL,refugees INTEGER NOT NULL,"
                + "housing_capacity INTEGER NOT NULL,life_support_capacity INTEGER NOT NULL,employment_capacity INTEGER NOT NULL,"
                + "morale INTEGER NOT NULL,seed_source TEXT NOT NULL,last_tick INTEGER NOT NULL)");
        statement.execute("CREATE TABLE npc_population_reconciliation(population_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,"
                + "station_id TEXT NOT NULL,baseline_population_per_index REAL NOT NULL,imported_population_index INTEGER NOT NULL,"
                + "derived_detailed_population INTEGER NOT NULL,reconciliation_status TEXT NOT NULL,last_population_index INTEGER NOT NULL,"
                + "last_detailed_population INTEGER NOT NULL,last_tick INTEGER NOT NULL)");
        statement.execute("CREATE TRIGGER founding_verification_reconciliation_seed AFTER INSERT ON npc_population_state BEGIN "
                + "INSERT INTO npc_population_reconciliation(population_id,world_id,station_id,baseline_population_per_index,"
                + "imported_population_index,derived_detailed_population,reconciliation_status,last_population_index,"
                + "last_detailed_population,last_tick) SELECT NEW.population_id,NEW.world_id,NEW.station_id,1.0,"
                + "COALESCE((SELECT population_index FROM station_civilization_state WHERE station_id=NEW.station_id),0),"
                + "NEW.civilians+NEW.industrial_workers+NEW.logistics_workers+NEW.security_personnel+NEW.medical_personnel+"
                + "NEW.scientific_personnel+NEW.temporary_residents+NEW.refugees,'ALIGNED',"
                + "COALESCE((SELECT population_index FROM station_civilization_state WHERE station_id=NEW.station_id),0),"
                + "NEW.civilians+NEW.industrial_workers+NEW.logistics_workers+NEW.security_personnel+NEW.medical_personnel+"
                + "NEW.scientific_personnel+NEW.temporary_residents+NEW.refugees,NEW.last_tick; END");
        statement.execute("CREATE TABLE npc_vessel(npc_vessel_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,display_name TEXT NOT NULL,"
                + "current_location_id TEXT,destination_location_id TEXT,mission_id TEXT,status TEXT)");
        statement.execute("CREATE TABLE population_flow(flow_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,entity_type TEXT NOT NULL,"
                + "population_id TEXT NOT NULL,origin_location_id TEXT NOT NULL,destination_location_id TEXT,quantity INTEGER NOT NULL,"
                + "cause TEXT NOT NULL,status TEXT NOT NULL,departure_tick INTEGER,arrival_tick INTEGER,losses INTEGER NOT NULL,"
                + "created_tick INTEGER NOT NULL,updated_tick INTEGER NOT NULL,summary TEXT NOT NULL,flow_kind TEXT NOT NULL,"
                + "destination_population_id TEXT,origin_station_id TEXT,destination_station_id TEXT,assigned_npc_vessel_id TEXT,"
                + "transit_leg_id TEXT,transport_units_required INTEGER NOT NULL DEFAULT 1,transport_capacity INTEGER NOT NULL DEFAULT 0,"
                + "reserved_quantity INTEGER NOT NULL DEFAULT 0,embarked_quantity INTEGER NOT NULL DEFAULT 0,"
                + "arrived_quantity INTEGER NOT NULL DEFAULT 0,returned_quantity INTEGER NOT NULL DEFAULT 0,"
                + "stranded_quantity INTEGER NOT NULL DEFAULT 0,preparation_started_tick INTEGER,progress_ticks INTEGER NOT NULL DEFAULT 0,"
                + "duration_ticks INTEGER,return_tick INTEGER,failure_reason TEXT,origin_released INTEGER NOT NULL DEFAULT 0)");
        statement.execute("CREATE TABLE npc_population_flow_cohort(flow_id TEXT NOT NULL,cohort_key TEXT NOT NULL,"
                + "planned_quantity INTEGER NOT NULL,embarked_quantity INTEGER NOT NULL DEFAULT 0,"
                + "arrived_quantity INTEGER NOT NULL DEFAULT 0,returned_quantity INTEGER NOT NULL DEFAULT 0,"
                + "losses INTEGER NOT NULL DEFAULT 0,stranded_quantity INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(flow_id,cohort_key))");
        statement.execute("CREATE TABLE station_change_reason(reason_code TEXT PRIMARY KEY,display_name TEXT NOT NULL,"
                + "reason_family TEXT NOT NULL)");
        statement.execute("CREATE TABLE station_vendor_offer(offer_id TEXT PRIMARY KEY,station_id TEXT NOT NULL,"
                + "active INTEGER NOT NULL,last_tick INTEGER NOT NULL)");
        statement.execute("CREATE TABLE npc_population_ledger(ledger_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,"
                + "population_id TEXT NOT NULL,station_id TEXT NOT NULL,tick_sequence INTEGER NOT NULL,before_total INTEGER NOT NULL,"
                + "births INTEGER NOT NULL,deaths INTEGER NOT NULL,immigration INTEGER NOT NULL,emigration INTEGER NOT NULL,"
                + "disaster_losses INTEGER NOT NULL,other_gains INTEGER NOT NULL,other_losses INTEGER NOT NULL,after_total INTEGER NOT NULL,"
                + "housing_capacity INTEGER NOT NULL,life_support_capacity INTEGER NOT NULL,employment_capacity INTEGER NOT NULL,"
                + "morale INTEGER NOT NULL,population_index_before INTEGER NOT NULL,population_index_after INTEGER NOT NULL,"
                + "primary_cause TEXT NOT NULL,evidence_key TEXT NOT NULL,summary TEXT NOT NULL,UNIQUE(population_id,tick_sequence))");
        statement.execute("CREATE TABLE world_observation_event(event_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,"
                + "tick_sequence INTEGER NOT NULL,canonical_time TEXT NOT NULL,category TEXT NOT NULL,primary_entity_type TEXT NOT NULL,"
                + "primary_entity_id TEXT NOT NULL,primary_cause TEXT NOT NULL,primary_evidence_key TEXT NOT NULL,"
                + "contributing_factors TEXT NOT NULL,magnitude INTEGER NOT NULL,visibility TEXT NOT NULL,confidence INTEGER NOT NULL,"
                + "summary TEXT NOT NULL)");
    }

    private static void seedWorld(Statement statement) throws SQLException {
        statement.execute("INSERT INTO world_metadata VALUES('world-1','Verification World','2026-01-01T00:00:00Z',"
                + "'2026-01-01T00:00:00Z')");
        statement.execute("INSERT INTO world_location VALUES('location-origin','world-1','origin',1,'Origin','STATION',0,0,"
                + "0,0,'ICE','Coalition',1)");
        statement.execute("INSERT INTO world_location VALUES('location-frontier','world-1','frontier',2,'Frontier','SITE',1,1,"
                + "10,10,'ICE','Coalition',0)");
        statement.execute("INSERT INTO world_location VALUES('location-rollback','world-1','rollback',3,'Rollback','SITE',1,1,"
                + "20,20,'ICE','Coalition',0)");
        statement.execute("INSERT INTO world_station VALUES('station-origin','world-1','location-origin','origin-station',"
                + "'Origin Station','OUTPOST','Coalition',1)");
        statement.execute("INSERT INTO station_simulation_state VALUES('station-origin','world-1',10000,100,25,60,80,90,10,0,"
                + "'STABLE',0)");
        statement.execute("INSERT INTO station_civilization_state VALUES('station-origin','world-1',80,70,10,2,0,0,0,60,"
                + "'HOLDING',0)");
        statement.execute("INSERT INTO npc_population_state VALUES('population-origin','world-1','station-origin',50,10,5,5,3,2,3,2,"
                + "200,200,200,70,'verification-origin',0)");
        statement.execute("INSERT INTO station_population_state VALUES('station-origin','world-1','IMPORTED_ESTIMATE',0,80,80,25,25,0)");
    }

    private static void insertProject(Connection connection, String projectId, String locationId,
                                      String status, int progress) throws SQLException {
        try (var statement = connection.prepareStatement(
                "INSERT INTO settlement_project(project_id,world_id,project_kind,status,sponsor_faction,origin_station_id,"
                        + "target_station_id,target_location_id,related_population_id,assigned_npc_vessel_id,"
                        + "required_material_units,committed_material_units,required_supply_units,committed_supply_units,"
                        + "required_population,committed_population,required_transport_units,committed_transport_units,"
                        + "required_security,current_security,progress_units,target_progress_units,created_tick,activated_tick,"
                        + "updated_tick,summary) VALUES(?,'world-1','FOUNDING',?,'Coalition','station-origin',NULL,?,"
                        + "'population-origin',NULL,20,20,20,20,20,20,0,0,50,80,?,10,1,2,2,'Verified founding project')")) {
            statement.setString(1, projectId);
            statement.setString(2, status);
            statement.setString(3, locationId);
            statement.setInt(4, progress);
            statement.executeUpdate();
        }
    }

    private static void insertFoundingFlow(Connection connection, String flowId, String projectId,
                                           String locationId) throws SQLException {
        try (var statement = connection.prepareStatement(
                "INSERT INTO population_flow(flow_id,world_id,entity_type,population_id,origin_location_id,"
                        + "destination_location_id,quantity,cause,status,losses,created_tick,updated_tick,summary,flow_kind,"
                        + "origin_station_id,embarked_quantity,arrived_quantity,origin_released,destination_mode,"
                        + "settlement_project_id) VALUES(?,'world-1','NPC_POPULATION','population-origin','location-origin',"
                        + "?,20,'MIGRATION','ARRIVED',0,3,5,'Staged founders','ORDINARY_MIGRATION','station-origin',20,20,1,"
                        + "'FOUNDING_SITE',?)")) {
            statement.setString(1, flowId);
            statement.setString(2, locationId);
            statement.setString(3, projectId);
            statement.executeUpdate();
        }
        String[] rows = {"CIVILIANS:10","INDUSTRIAL_WORKERS:3","LOGISTICS_WORKERS:2",
                "SECURITY_PERSONNEL:1","MEDICAL_PERSONNEL:1","SCIENTIFIC_PERSONNEL:0",
                "TEMPORARY_RESIDENTS:2","REFUGEES:1"};
        try (var statement = connection.prepareStatement(
                "INSERT INTO npc_population_flow_cohort(flow_id,cohort_key,planned_quantity,embarked_quantity,"
                        + "arrived_quantity) VALUES(?,?,?,?,?)")) {
            for (String row : rows) {
                String[] parts = row.split(":");
                long quantity = Long.parseLong(parts[1]);
                statement.setString(1, flowId);
                statement.setString(2, parts[0]);
                statement.setLong(3, quantity);
                statement.setLong(4, quantity);
                statement.setLong(5, quantity);
                statement.addBatch();
            }
            statement.executeBatch();
        }
    }

    private static long accounted(Connection connection) throws SQLException {
        return scalar(connection, "SELECT station_population+population_in_flows+recorded_migration_losses "
                + "FROM npc_population_migration_conservation");
    }

    private static long scalar(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new SQLException("Expected scalar verification row.");
            return result.getLong(1);
        }
    }

    private static String text(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new SQLException("Expected text verification row.");
            return result.getString(1);
        }
    }

    private static long foreignKeys(Connection connection) throws SQLException {
        long count = 0;
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("PRAGMA foreign_key_check")) {
            while (result.next()) count++;
        }
        return count;
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Conserved founding completion and rollback contracts passed.");
    }
}
