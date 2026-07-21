package io.github.mrcalzon02.barotrauma.observation;

import io.github.mrcalzon02.barotrauma.persistence.SettlementFoundingMigrationSchema;
import io.github.mrcalzon02.barotrauma.persistence.SettlementLifecycleSchema;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Comparator;
import java.util.UUID;

/** Query-only contract for schema-030 staged and completed founding migration evidence. */
public final class SettlementFoundingObservationRegistryVerification {
    private SettlementFoundingObservationRegistryVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        Path root = Files.createTempDirectory("barotrauma-founding-observation-");
        try {
            WorldPaths paths = WorldStorageContracts.createWorld(root, "Founding Observation",
                    UUID.fromString("99100000-0000-0000-0000-000000000001"));
            createFixture(paths);
            String before = fingerprint(paths);

            var all = ObservationRegistry.settlementFoundingMigrations(paths, -1, 10);
            require(all.size() == 2, "Founding observation did not return staged and completed flows.");
            var completed = all.get(0);
            require(completed.flowId().equals("flow-complete")
                            && completed.projectId().equals("project-complete")
                            && completed.projectStatus().equals("COMPLETE")
                            && completed.flowStatus().equals("ARRIVED")
                            && completed.updatedTick() == 30,
                    "Founding observation ordering or lifecycle fields are incorrect.");
            require(completed.quantity() == 20 && completed.embarked() == 20
                            && completed.arrived() == 20 && completed.losses() == 0
                            && completed.stranded() == 0,
                    "Founding observation transport quantities are incorrect.");
            require("station-founded".equals(completed.foundedStationId())
                            && "population-founded".equals(completed.foundedPopulationId())
                            && completed.settledQuantity() == 20
                            && completed.handoffTick() == 31
                            && "handoff-complete".equals(completed.evidenceKey()),
                    "Founding observation handoff fields are incorrect.");

            var staged = all.get(1);
            require(staged.flowId().equals("flow-staged")
                            && staged.projectStatus().equals("PREPARING")
                            && staged.flowStatus().equals("ARRIVED")
                            && staged.updatedTick() == 20,
                    "Staged founding observation lifecycle fields are incorrect.");
            require(staged.foundedStationId() == null && staged.foundedPopulationId() == null
                            && staged.settledQuantity() == null && staged.handoffTick() == null
                            && staged.evidenceKey() == null && staged.summary() == null,
                    "Staged founding observation did not preserve nullable pre-handoff fields.");

            var changed = ObservationRegistry.settlementFoundingMigrations(paths, 20, 10);
            require(changed.size() == 1 && changed.get(0).flowId().equals("flow-complete"),
                    "Founding changed-since filtering is incorrect.");
            var limited = ObservationRegistry.settlementFoundingMigrations(paths, -1, 1);
            require(limited.size() == 1 && limited.get(0).flowId().equals("flow-complete"),
                    "Founding observation result limit is incorrect.");
            reject(() -> ObservationRegistry.settlementFoundingMigrations(paths, -2, 10),
                    IllegalArgumentException.class, "changedSinceTick");
            reject(() -> ObservationRegistry.settlementFoundingMigrations(paths, -1, 0),
                    IllegalArgumentException.class, "limit");
            require(before.equals(fingerprint(paths)),
                    "Query-only founding observation mutated durable migration or handoff state.");

            try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
                 Statement statement = connection.createStatement()) {
                statement.executeUpdate("DELETE FROM schema_migration WHERE version=30");
            }
            reject(() -> ObservationRegistry.settlementFoundingMigrations(paths, -1, 10),
                    SQLException.class, "requires schema 030");
        } finally {
            try (var stream = Files.walk(root)) {
                for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
            }
        }
    }

    private static void createFixture(WorldPaths paths) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys=ON");
            statement.execute("CREATE TABLE schema_migration(version INTEGER PRIMARY KEY,applied_at TEXT NOT NULL)");
            statement.execute("INSERT INTO schema_migration VALUES(16,'2026-07-21T00:00:00Z')");
            statement.execute("INSERT INTO schema_migration VALUES(29,'2026-07-21T00:01:00Z')");
            statement.execute("INSERT INTO schema_migration VALUES(30,'2026-07-21T00:02:00Z')");
            statement.execute("CREATE TABLE world_metadata(world_id TEXT PRIMARY KEY,display_name TEXT,canonical_time TEXT)");
            statement.execute("CREATE TABLE world_simulation_metadata(world_id TEXT PRIMARY KEY,current_tick_sequence INTEGER,imported_tick_sequence INTEGER)");
            statement.execute("CREATE TABLE world_location(location_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,source_ordinal INTEGER NOT NULL,display_name TEXT NOT NULL,is_station INTEGER NOT NULL DEFAULT 0)");
            statement.execute("CREATE TABLE world_station(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,location_id TEXT NOT NULL UNIQUE,display_name TEXT NOT NULL)");
            statement.execute("CREATE TABLE npc_population_state(population_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,station_id TEXT NOT NULL UNIQUE,civilians INTEGER NOT NULL,industrial_workers INTEGER NOT NULL,logistics_workers INTEGER NOT NULL,security_personnel INTEGER NOT NULL,medical_personnel INTEGER NOT NULL,scientific_personnel INTEGER NOT NULL,temporary_residents INTEGER NOT NULL,refugees INTEGER NOT NULL,housing_capacity INTEGER NOT NULL,life_support_capacity INTEGER NOT NULL,employment_capacity INTEGER NOT NULL,morale INTEGER NOT NULL,seed_source TEXT NOT NULL,last_tick INTEGER NOT NULL)");
            statement.execute("CREATE TABLE npc_vessel(npc_vessel_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,display_name TEXT NOT NULL)");
            statement.execute("CREATE TABLE population_flow(flow_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,entity_type TEXT NOT NULL,population_id TEXT NOT NULL,origin_location_id TEXT NOT NULL,destination_location_id TEXT,quantity INTEGER NOT NULL,cause TEXT NOT NULL,status TEXT NOT NULL,departure_tick INTEGER,arrival_tick INTEGER,losses INTEGER NOT NULL DEFAULT 0,created_tick INTEGER NOT NULL,updated_tick INTEGER NOT NULL,summary TEXT NOT NULL,flow_kind TEXT NOT NULL,destination_population_id TEXT,origin_station_id TEXT,destination_station_id TEXT,assigned_npc_vessel_id TEXT,transit_leg_id TEXT,transport_units_required INTEGER NOT NULL DEFAULT 1,transport_capacity INTEGER NOT NULL DEFAULT 0,reserved_quantity INTEGER NOT NULL DEFAULT 0,embarked_quantity INTEGER NOT NULL DEFAULT 0,arrived_quantity INTEGER NOT NULL DEFAULT 0,returned_quantity INTEGER NOT NULL DEFAULT 0,stranded_quantity INTEGER NOT NULL DEFAULT 0,preparation_started_tick INTEGER,progress_ticks INTEGER NOT NULL DEFAULT 0,duration_ticks INTEGER,return_tick INTEGER,failure_reason TEXT,origin_released INTEGER NOT NULL DEFAULT 0)");
            statement.execute("CREATE TABLE station_change_reason(reason_code TEXT PRIMARY KEY,display_name TEXT NOT NULL,reason_family TEXT NOT NULL)");
            statement.execute("CREATE TABLE station_simulation_state(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,credits INTEGER NOT NULL,supplies INTEGER NOT NULL,ore INTEGER NOT NULL,industry INTEGER NOT NULL,security INTEGER NOT NULL,integrity INTEGER NOT NULL,threat INTEGER NOT NULL,research INTEGER NOT NULL,status TEXT NOT NULL,last_tick INTEGER NOT NULL)");
            statement.execute("CREATE TABLE station_civilization_state(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,population_index INTEGER NOT NULL,civilization_strength INTEGER NOT NULL,fauna_pressure INTEGER NOT NULL,supply_consumption_base INTEGER NOT NULL,last_consumption INTEGER NOT NULL,shortage_ticks INTEGER NOT NULL,surplus_ticks INTEGER NOT NULL,frontier_position INTEGER NOT NULL,frontier_state TEXT NOT NULL,last_tick INTEGER NOT NULL)");
            statement.execute("CREATE TABLE station_population_state(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,baseline_kind TEXT NOT NULL,baseline_tick INTEGER NOT NULL,baseline_resident_count INTEGER NOT NULL,resident_count INTEGER NOT NULL,baseline_workforce_count INTEGER NOT NULL,workforce_count INTEGER NOT NULL,last_tick INTEGER NOT NULL)");
            statement.execute("CREATE TABLE npc_population_ledger(ledger_id TEXT PRIMARY KEY,world_id TEXT NOT NULL)");
            statement.execute("CREATE VIEW observation_world_summary AS SELECT 'world-1' world_id,'Founding World' display_name,0 npc_populations,0 npc_population_total,0 creature_populations,0 creature_estimated_total,0 faction_presences,0 observation_events");
            statement.execute("CREATE VIEW npc_population_observation AS SELECT '' population_id,'' station_id,'' station_name,0 civilians,0 industrial_workers,0 logistics_workers,0 security_personnel,0 medical_personnel,0 scientific_personnel,0 temporary_residents,0 refugees,0 total_population,0 housing_capacity,0 life_support_capacity,0 employment_capacity,0 morale,0 last_tick WHERE 0");
            statement.execute("CREATE VIEW npc_population_accounting_observation AS SELECT '' ledger_id,'' population_id,'' station_id,'' station_name,0 tick_sequence,0 before_total,0 births,0 deaths,0 immigration,0 emigration,0 disaster_losses,0 other_gains,0 other_losses,0 after_total,0 housing_capacity,0 life_support_capacity,0 employment_capacity,0 morale,0 population_index_before,0 population_index_after,'' primary_cause,'' evidence_key,'' summary,0.0 baseline_population_per_index,'' reconciliation_status WHERE 0");
            statement.execute("CREATE VIEW creature_population_observation AS SELECT '' population_id,'' location_id,'' location_name,'' species_key,'' population_class,0 estimated_count,0 biomass,0 health,0 food_stress,0 habitat_support,0 migration_pressure,0 observation_confidence,'' territory_status,0 territory_pressure,0 nest_strength,0 last_tick WHERE 0");
            for (String sql : SettlementLifecycleSchema.statements()) statement.execute(sql);
            for (String sql : SettlementFoundingMigrationSchema.statements()) statement.execute(sql);

            statement.execute("INSERT INTO world_metadata VALUES('world-1','Founding World','2175-01-01T00:00:00Z')");
            statement.execute("INSERT INTO world_simulation_metadata VALUES('world-1',40,0)");
            statement.execute("INSERT INTO world_location VALUES('location-origin','world-1',1,'Origin',1)");
            statement.execute("INSERT INTO world_location VALUES('location-staged','world-1',2,'Staged Site',0)");
            statement.execute("INSERT INTO world_location VALUES('location-founded','world-1',3,'Founded Site',1)");
            statement.execute("INSERT INTO world_station VALUES('station-origin','world-1','location-origin','Origin Station')");
            statement.execute("INSERT INTO world_station VALUES('station-founded','world-1','location-founded','Founded Station')");
            statement.execute("INSERT INTO npc_population_state VALUES('population-origin','world-1','station-origin',80,20,10,5,3,2,0,0,300,300,300,70,'origin',0)");
            statement.execute("INSERT INTO npc_population_state VALUES('population-founded','world-1','station-founded',10,3,2,1,1,0,2,1,40,40,40,65,'founding',31)");
            statement.execute("INSERT INTO npc_vessel VALUES('vessel-a','world-1','Builder One')");
            statement.execute("INSERT INTO settlement_project(project_id,world_id,project_kind,status,origin_station_id,target_location_id,related_population_id,assigned_npc_vessel_id,required_material_units,committed_material_units,required_supply_units,committed_supply_units,required_population,committed_population,required_transport_units,committed_transport_units,required_security,current_security,progress_units,target_progress_units,created_tick,preparation_started_tick,updated_tick,summary) VALUES('project-staged','world-1','FOUNDING','PREPARING','station-origin','location-staged','population-origin','vessel-a',20,20,20,20,20,0,1,1,50,70,0,10,10,11,20,'Staged founding project')");
            statement.execute("INSERT INTO settlement_project(project_id,world_id,project_kind,status,origin_station_id,target_location_id,related_population_id,assigned_npc_vessel_id,required_material_units,committed_material_units,required_supply_units,committed_supply_units,required_population,committed_population,required_transport_units,committed_transport_units,required_security,current_security,progress_units,target_progress_units,created_tick,preparation_started_tick,activated_tick,completed_tick,updated_tick,summary) VALUES('project-complete','world-1','FOUNDING','COMPLETE','station-origin','location-founded','population-origin','vessel-a',20,20,20,20,20,20,1,1,50,70,10,10,10,11,21,31,31,'Completed founding project')");
            statement.execute("INSERT INTO population_flow(flow_id,world_id,entity_type,population_id,origin_location_id,destination_location_id,quantity,cause,status,losses,created_tick,updated_tick,summary,flow_kind,origin_station_id,assigned_npc_vessel_id,embarked_quantity,arrived_quantity,origin_released,destination_mode,settlement_project_id) VALUES('flow-staged','world-1','NPC_POPULATION','population-origin','location-origin','location-staged',20,'MIGRATION','ARRIVED',0,12,20,'Staged founders','ORDINARY_MIGRATION','station-origin','vessel-a',20,20,1,'FOUNDING_SITE','project-staged')");
            statement.execute("INSERT INTO population_flow(flow_id,world_id,entity_type,population_id,origin_location_id,destination_location_id,quantity,cause,status,losses,created_tick,updated_tick,summary,flow_kind,origin_station_id,assigned_npc_vessel_id,embarked_quantity,arrived_quantity,origin_released,destination_mode,settlement_project_id) VALUES('flow-complete','world-1','NPC_POPULATION','population-origin','location-origin','location-founded',20,'MIGRATION','ARRIVED',0,22,30,'Completed founders','ORDINARY_MIGRATION','station-origin','vessel-a',20,20,1,'FOUNDING_SITE','project-complete')");
            statement.execute("INSERT INTO settlement_founding_handoff(project_id,flow_id,world_id,station_id,population_id,settled_quantity,handoff_tick,evidence_key,summary) VALUES('project-complete','flow-complete','world-1','station-founded','population-founded',20,31,'handoff-complete','Founders settled')");
        }
    }

    private static String fingerprint(WorldPaths paths) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery(
                     "SELECT (SELECT COUNT(*) FROM population_flow)||':'||"
                             + "(SELECT SUM(updated_tick+arrived_quantity+losses+stranded_quantity) FROM population_flow)||':'||"
                             + "(SELECT COUNT(*) FROM settlement_founding_handoff)||':'||"
                             + "(SELECT SUM(settled_quantity+handoff_tick) FROM settlement_founding_handoff)||':'||"
                             + "(SELECT COUNT(*) FROM station_population_state)")) {
            if (!result.next()) throw new IllegalStateException("Founding observation fingerprint is empty.");
            return result.getString(1);
        }
    }

    private static void reject(ThrowingWork work, Class<? extends Throwable> type, String expected) throws Exception {
        try {
            work.run();
            throw new IllegalStateException("Expected founding observation rejection containing: " + expected);
        } catch (Throwable failure) {
            if (failure instanceof IllegalStateException && failure.getMessage().startsWith("Expected founding")) {
                throw (IllegalStateException) failure;
            }
            require(type.isInstance(failure), "Unexpected founding observation rejection type: " + failure);
            require(failure.getMessage() != null && failure.getMessage().contains(expected),
                    "Unexpected founding observation rejection: " + failure.getMessage());
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    @FunctionalInterface
    private interface ThrowingWork { void run() throws Exception; }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Query-only staged and completed founding migration observation contracts passed.");
    }
}
