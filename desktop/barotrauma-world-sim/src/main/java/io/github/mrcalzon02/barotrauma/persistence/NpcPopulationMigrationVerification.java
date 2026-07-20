package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.persistence.NpcPopulationMigrationTransaction.FlowKind;
import io.github.mrcalzon02.barotrauma.persistence.NpcPopulationMigrationTransaction.PlanRequest;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Comparator;

/** Milestone 2.3 foundation contract for conserved, transport-backed population movement. */
public final class NpcPopulationMigrationVerification {
    private static final String WORLD = "28000000-0000-0000-0000-000000000001";
    private static final String ORIGIN_LOCATION = "28000000-0000-0000-0000-000000000002";
    private static final String DESTINATION_LOCATION = "28000000-0000-0000-0000-000000000003";
    private static final String ORIGIN_STATION = "28000000-0000-0000-0000-000000000004";
    private static final String DESTINATION_STATION = "28000000-0000-0000-0000-000000000005";
    private static final String ORIGIN_POPULATION = "28000000-0000-0000-0000-000000000006";
    private static final String DESTINATION_POPULATION = "28000000-0000-0000-0000-000000000007";
    private static final String VESSEL = "28000000-0000-0000-0000-000000000008";

    private NpcPopulationMigrationVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        Path root = Files.createTempDirectory("barotrauma-population-migration-");
        try {
            String first = runScenario(root.resolve("first.db"));
            String second = runScenario(root.resolve("second.db"));
            require(first.equals(second), "Identical migration inputs produced different committed results.");
        } finally {
            try (var stream = Files.walk(root)) {
                for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
            }
        }
    }

    private static String runScenario(Path database) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + database)) {
            configure(connection);
            createFixture(connection);
            for (String sql : NpcPopulationMigrationSchema.statements()) execute(connection, sql);

            require(object(connection, "table", "npc_population_flow_cohort"),
                    "Schema 028 is missing exact migration cohort state.");
            require(object(connection, "table", "npc_population_flow_transition"),
                    "Schema 028 is missing durable transition evidence.");
            require(object(connection, "view", "npc_population_flow_observation"),
                    "Schema 028 is missing its read-optimized flow projection.");
            require(object(connection, "view", "npc_population_migration_conservation"),
                    "Schema 028 is missing its conservation projection.");

            long initialTotal = stationTotal(connection);

            var ordinary = NpcPopulationMigrationTransaction.plan(connection,
                    new PlanRequest(FlowKind.ORDINARY_MIGRATION, ORIGIN_POPULATION, DESTINATION_POPULATION,
                            VESSEL, 100, 60, "One hundred residents seek ordinary relocation."));
            NpcPopulationMigrationTransaction.prepare(connection, ordinary.flowId(), 61);
            simulateDeparture(connection, ordinary.flowId(), "OUTBOUND", 62);
            NpcPopulationMigrationTransaction.depart(connection, ordinary.flowId(), 62);
            require(populationTotal(connection, ORIGIN_POPULATION) == 900,
                    "Ordinary migration did not remove exact cohorts at physical departure.");
            require(number(connection, "SELECT emigration FROM npc_population_ledger WHERE population_id='"
                            + ORIGIN_POPULATION + "' AND tick_sequence=62") == 100,
                    "Origin ledger did not record physical emigration.");
            simulateArrival(connection, ordinary.flowId(), DESTINATION_LOCATION, "OUTBOUND", 66);
            var ordinaryArrival = NpcPopulationMigrationTransaction.arrive(connection, ordinary.flowId(), 66, 5);
            require(ordinaryArrival.arrived() == 95 && ordinaryArrival.losses() == 5,
                    "Ordinary migration did not distinguish arrivals from casualties.");
            require(populationTotal(connection, DESTINATION_POPULATION) == 495,
                    "Destination did not receive surviving ordinary migrants.");

            dockAtOrigin(connection);
            var worker = NpcPopulationMigrationTransaction.plan(connection,
                    new PlanRequest(FlowKind.WORKER_TRANSFER, ORIGIN_POPULATION, DESTINATION_POPULATION,
                            VESSEL, 40, 67, "A logistics and industrial workforce transfer was approved."));
            NpcPopulationMigrationTransaction.prepare(connection, worker.flowId(), 68);
            NpcPopulationMigrationTransaction.cancel(connection, worker.flowId(), 69,
                    "Destination contract was withdrawn.");
            require(populationTotal(connection, ORIGIN_POPULATION) == 900,
                    "Cancelling a pre-departure worker transfer changed the population.");

            dockAtOrigin(connection);
            var refugees = NpcPopulationMigrationTransaction.plan(connection,
                    new PlanRequest(FlowKind.REFUGEE_EVACUATION, ORIGIN_POPULATION, DESTINATION_POPULATION,
                            VESSEL, 50, 70, "Refugees were assigned protected evacuation transport."));
            NpcPopulationMigrationTransaction.prepare(connection, refugees.flowId(), 71);
            simulateDeparture(connection, refugees.flowId(), "OUTBOUND", 72);
            NpcPopulationMigrationTransaction.depart(connection, refugees.flowId(), 72);
            NpcPopulationMigrationTransaction.beginReturn(connection, refugees.flowId(), 73,
                    "The destination berth failed its life-support inspection.");
            simulateReturnDeparture(connection, refugees.flowId(), 74);
            simulateArrival(connection, refugees.flowId(), ORIGIN_LOCATION, "RETURN", 77);
            var returned = NpcPopulationMigrationTransaction.completeReturn(connection, refugees.flowId(), 77, 2);
            require(returned.returned() == 48 && returned.losses() == 2
                            && returned.returnTransitLegId() != null,
                    "Returning evacuation did not reconcile survivors, casualties, and return transit evidence.");

            dockAtOrigin(connection);
            var emergency = NpcPopulationMigrationTransaction.plan(connection,
                    new PlanRequest(FlowKind.EMERGENCY_RELOCATION, ORIGIN_POPULATION, DESTINATION_POPULATION,
                            VESSEL, 40, 78, "Emergency relocation convoy was ordered after structural failure."));
            NpcPopulationMigrationTransaction.prepare(connection, emergency.flowId(), 79);
            simulateDeparture(connection, emergency.flowId(), "OUTBOUND", 80);
            NpcPopulationMigrationTransaction.depart(connection, emergency.flowId(), 80);
            boolean conservationRejected = false;
            try {
                execute(connection, "UPDATE population_flow SET embarked_quantity=quantity+1 WHERE flow_id='"
                        + emergency.flowId() + "'");
            } catch (SQLException expected) {
                conservationRejected = true;
            }
            require(conservationRejected,
                    "An impossible migration quantity bypassed schema-028 physical conservation guards.");
            var failed = NpcPopulationMigrationTransaction.fail(connection, emergency.flowId(), 81,
                    10, 30, "Lead transport was disabled and the surviving convoy became stranded.");
            require(failed.losses() == 10 && failed.stranded() == 30,
                    "Failed emergency relocation did not account for casualties and stranded survivors.");

            require(number(connection, "SELECT COUNT(*) FROM npc_population_flow_cohort WHERE "
                            + "arrived_quantity+returned_quantity+losses+stranded_quantity>embarked_quantity") == 0,
                    "A migration cohort outcome exceeds the physically embarked cohort.");
            require(number(connection, "SELECT COUNT(*) FROM npc_population_ledger WHERE after_total<>"
                            + "before_total+births+immigration+other_gains-deaths-emigration-disaster_losses-other_losses") == 0,
                    "A migration-adjusted population ledger violates conservation.");
            require(stationTotal(connection)
                            + number(connection, "SELECT population_in_flows FROM npc_population_migration_conservation")
                            + number(connection, "SELECT recorded_migration_losses FROM npc_population_migration_conservation")
                            == initialTotal,
                    "Station population, transported survivors, and migration losses do not conserve the initial population.");
            require(number(connection, "SELECT COUNT(*) FROM npc_population_flow_transition") >= 15,
                    "Migration lifecycle transitions were not durably recorded.");
            require(number(connection, "SELECT COUNT(*) FROM world_observation_event WHERE category='MIGRATION'") >= 4,
                    "Migration and evacuation outcomes are missing observation evidence.");

            boolean rejected = false;
            try {
                execute(connection, "UPDATE population_flow SET status='ARRIVED' WHERE flow_id='" + worker.flowId() + "'");
            } catch (SQLException expected) {
                rejected = true;
            }
            require(rejected, "An invalid terminal flow mutation bypassed schema-028 transition guards.");

            dockAtOrigin(connection);
            long flowCount = number(connection, "SELECT COUNT(*) FROM population_flow");
            connection.setAutoCommit(false);
            NpcPopulationMigrationTransaction.plan(connection,
                    new PlanRequest(FlowKind.ORDINARY_MIGRATION, ORIGIN_POPULATION, DESTINATION_POPULATION,
                            VESSEL, 5, 90, "This planned flow must roll back."));
            connection.rollback();
            connection.setAutoCommit(true);
            require(number(connection, "SELECT COUNT(*) FROM population_flow") == flowCount,
                    "A rolled-back migration plan survived transaction rollback.");
            require(number(connection, "SELECT COUNT(*) FROM pragma_foreign_key_check") == 0,
                    "Schema 028 created foreign-key violations.");

            return text(connection, "SELECT group_concat(flow_kind||':'||status||':'||quantity||':'||"
                    + "embarked_quantity||':'||arrived_quantity||':'||returned_quantity||':'||losses||':'||"
                    + "stranded_quantity,'|') FROM (SELECT * FROM population_flow ORDER BY created_tick,flow_id)");
        }
    }

    private static void createFixture(Connection c) throws SQLException {
        execute(c,
                "CREATE TABLE world_metadata(world_id TEXT PRIMARY KEY,display_name TEXT,created_at TEXT,canonical_time TEXT)",
                "CREATE TABLE schema_migration(version INTEGER PRIMARY KEY,applied_at TEXT)",
                "INSERT INTO schema_migration VALUES(27,'2026-07-20T00:00:00Z')",
                "CREATE TABLE world_location(location_id TEXT PRIMARY KEY,world_id TEXT,display_name TEXT,ring INTEGER,location_level INTEGER)",
                "CREATE TABLE world_station(station_id TEXT PRIMARY KEY,world_id TEXT,location_id TEXT,display_name TEXT)",
                "CREATE TABLE npc_population_state(population_id TEXT PRIMARY KEY,world_id TEXT,station_id TEXT UNIQUE,civilians INTEGER,industrial_workers INTEGER,logistics_workers INTEGER,security_personnel INTEGER,medical_personnel INTEGER,scientific_personnel INTEGER,temporary_residents INTEGER,refugees INTEGER,housing_capacity INTEGER,life_support_capacity INTEGER,employment_capacity INTEGER,morale INTEGER,last_tick INTEGER)",
                "CREATE TABLE npc_population_reconciliation(population_id TEXT PRIMARY KEY,world_id TEXT,station_id TEXT UNIQUE,baseline_population_per_index REAL,last_population_index INTEGER,reconciliation_status TEXT,last_detailed_population INTEGER,last_tick INTEGER)",
                "CREATE TABLE npc_demographic_tick_result(population_id TEXT,tick_sequence INTEGER,effective_capacity INTEGER,morale_after INTEGER,support_score INTEGER,pressure_score INTEGER,surplus_support_ticks INTEGER,shortage_pressure_ticks INTEGER,overcrowding_ticks INTEGER,overcrowding_state TEXT,attack_damage_points INTEGER)",
                "CREATE TABLE npc_demographic_tick_baseline(station_id TEXT PRIMARY KEY,tick_sequence INTEGER,ready INTEGER)",
                "CREATE TABLE station_civilization_state(station_id TEXT PRIMARY KEY,world_id TEXT,population_index INTEGER)",
                "CREATE TABLE station_population_state(station_id TEXT PRIMARY KEY,world_id TEXT,baseline_kind TEXT,baseline_tick INTEGER,baseline_resident_count INTEGER,resident_count INTEGER,baseline_workforce_count INTEGER,workforce_count INTEGER,last_tick INTEGER)",
                "CREATE TABLE npc_vessel(npc_vessel_id TEXT PRIMARY KEY,world_id TEXT,display_name TEXT,current_location_id TEXT,destination_location_id TEXT,mission_id TEXT,status TEXT,route_progress INTEGER,route_ticks_required INTEGER,last_tick INTEGER)",
                "CREATE TABLE npc_transit_leg(leg_id TEXT PRIMARY KEY,npc_vessel_id TEXT,destination_location_id TEXT,leg_type TEXT,status TEXT,started_tick INTEGER,base_duration_ticks INTEGER,elapsed_ticks INTEGER)",
                "CREATE TABLE population_flow(flow_id TEXT PRIMARY KEY,world_id TEXT,entity_type TEXT,population_id TEXT,origin_location_id TEXT,destination_location_id TEXT,quantity INTEGER,cause TEXT,status TEXT,departure_tick INTEGER,arrival_tick INTEGER,losses INTEGER DEFAULT 0,created_tick INTEGER,updated_tick INTEGER,summary TEXT)",
                "CREATE TABLE npc_population_ledger(ledger_id TEXT PRIMARY KEY,world_id TEXT,population_id TEXT,station_id TEXT,tick_sequence INTEGER,before_total INTEGER,births INTEGER DEFAULT 0,deaths INTEGER DEFAULT 0,immigration INTEGER DEFAULT 0,emigration INTEGER DEFAULT 0,disaster_losses INTEGER DEFAULT 0,other_gains INTEGER DEFAULT 0,other_losses INTEGER DEFAULT 0,after_total INTEGER,housing_capacity INTEGER,life_support_capacity INTEGER,employment_capacity INTEGER,morale INTEGER,population_index_before INTEGER,population_index_after INTEGER,primary_cause TEXT,evidence_key TEXT,summary TEXT,UNIQUE(population_id,tick_sequence),CHECK(after_total=before_total+births+immigration+other_gains-deaths-emigration-disaster_losses-other_losses))",
                "CREATE INDEX npc_population_ledger_tick_index ON npc_population_ledger(world_id,tick_sequence DESC,primary_cause,population_id)",
                "CREATE VIEW npc_population_accounting_observation AS SELECT l.*,r.baseline_population_per_index,r.reconciliation_status FROM npc_population_ledger l JOIN npc_population_reconciliation r ON r.population_id=l.population_id",
                "CREATE TABLE station_event_type(event_type TEXT PRIMARY KEY,display_name TEXT,story_required INTEGER)",
                "CREATE TABLE station_change_reason(reason_code TEXT PRIMARY KEY,display_name TEXT,reason_family TEXT)",
                "CREATE TABLE station_story_policy(policy_version INTEGER PRIMARY KEY,active INTEGER)",
                "CREATE TABLE station_event(event_id TEXT PRIMARY KEY,world_id TEXT,station_id TEXT,tick_sequence INTEGER,canonical_time TEXT,event_type TEXT,severity INTEGER,headline TEXT,narrative TEXT,actor_type TEXT,actor_id TEXT,cause_type TEXT,cause_id TEXT,deterministic_key TEXT,visibility TEXT,correlation_id TEXT,policy_version INTEGER,created_at TEXT,UNIQUE(world_id,station_id,deterministic_key))",
                "CREATE TABLE station_population_event(population_event_id TEXT PRIMARY KEY,event_id TEXT UNIQUE,population_category TEXT,people_before INTEGER,people_delta INTEGER,people_after INTEGER,workforce_delta INTEGER)",
                "CREATE TABLE station_change(change_id TEXT PRIMARY KEY,event_id TEXT,statistic_key TEXT,value_type TEXT,previous_value REAL,delta_value REAL,resulting_value REAL,unit TEXT,reason_code TEXT,affected_type TEXT,affected_id TEXT)",
                "CREATE TABLE world_observation_event(event_id TEXT PRIMARY KEY,world_id TEXT,tick_sequence INTEGER,canonical_time TEXT,category TEXT,primary_entity_type TEXT,primary_entity_id TEXT,primary_cause TEXT,primary_evidence_key TEXT,contributing_factors TEXT,magnitude INTEGER,visibility TEXT,confidence INTEGER,summary TEXT)",
                "CREATE TABLE simulation_transaction_context(world_id TEXT PRIMARY KEY,current_canonical TEXT)",
                "INSERT INTO station_event_type VALUES('POPULATION','Population change',1)",
                "INSERT INTO station_change_reason VALUES('IMMIGRATION','Immigration','POPULATION'),('EMIGRATION','Emigration','POPULATION'),('EVACUATION','Evacuation','POPULATION')",
                "INSERT INTO station_story_policy VALUES(1,1)",
                "INSERT INTO world_metadata VALUES('" + WORLD + "','Migration Europa','2026-07-20T00:00:00Z','2175-01-01T00:00:00Z')",
                "INSERT INTO world_location VALUES('" + ORIGIN_LOCATION + "','" + WORLD + "','Origin Shelf',48,1)",
                "INSERT INTO world_location VALUES('" + DESTINATION_LOCATION + "','" + WORLD + "','Destination Shelf',36,3)",
                "INSERT INTO world_station VALUES('" + ORIGIN_STATION + "','" + WORLD + "','" + ORIGIN_LOCATION + "','Origin Station')",
                "INSERT INTO world_station VALUES('" + DESTINATION_STATION + "','" + WORLD + "','" + DESTINATION_LOCATION + "','Destination Station')",
                "INSERT INTO npc_population_state VALUES('" + ORIGIN_POPULATION + "','" + WORLD + "','" + ORIGIN_STATION + "',600,120,100,80,40,30,20,10,1300,1400,1200,65,59)",
                "INSERT INTO npc_population_state VALUES('" + DESTINATION_POPULATION + "','" + WORLD + "','" + DESTINATION_STATION + "',250,50,40,25,15,10,5,5,1500,1500,1300,80,59)",
                "INSERT INTO npc_population_reconciliation VALUES('" + ORIGIN_POPULATION + "','" + WORLD + "','" + ORIGIN_STATION + "',10,100,'ALIGNED',1000,59)",
                "INSERT INTO npc_population_reconciliation VALUES('" + DESTINATION_POPULATION + "','" + WORLD + "','" + DESTINATION_STATION + "',10,40,'ALIGNED',400,59)",
                "INSERT INTO station_civilization_state VALUES('" + ORIGIN_STATION + "','" + WORLD + "',100)",
                "INSERT INTO station_civilization_state VALUES('" + DESTINATION_STATION + "','" + WORLD + "',40)",
                "INSERT INTO station_population_state VALUES('" + ORIGIN_STATION + "','" + WORLD + "','FIXTURE',59,1000,1000,370,370,59)",
                "INSERT INTO station_population_state VALUES('" + DESTINATION_STATION + "','" + WORLD + "','FIXTURE',59,400,400,140,140,59)",
                "INSERT INTO npc_vessel VALUES('" + VESSEL + "','" + WORLD + "','Evacuation Tender','" + ORIGIN_LOCATION + "',NULL,NULL,'DOCKED',0,1,59)");
    }

    private static void simulateDeparture(Connection c, String flowId, String legType, long tick) throws SQLException {
        String destination = text(c, "SELECT destination_location_id FROM population_flow WHERE flow_id='" + flowId + "'");
        String legId = flowId + ":" + legType.toLowerCase() + ":leg";
        execute(c,
                "UPDATE npc_vessel SET status='IN_TRANSIT',destination_location_id='" + destination + "',last_tick=" + tick + " WHERE npc_vessel_id='" + VESSEL + "'",
                "INSERT INTO npc_transit_leg VALUES('" + legId + "','" + VESSEL + "','" + destination + "','" + legType + "','IN_TRANSIT'," + tick + ",4,0)");
    }

    private static void simulateReturnDeparture(Connection c, String flowId, long tick) throws SQLException {
        String legId = flowId + ":return:leg";
        execute(c,
                "UPDATE npc_transit_leg SET status='CANCELLED' WHERE npc_vessel_id='" + VESSEL
                        + "' AND status='IN_TRANSIT'",
                "UPDATE npc_vessel SET status='IN_TRANSIT',destination_location_id='" + ORIGIN_LOCATION
                        + "',last_tick=" + tick + " WHERE npc_vessel_id='" + VESSEL + "'",
                "INSERT INTO npc_transit_leg VALUES('" + legId + "','" + VESSEL + "','" + ORIGIN_LOCATION
                        + "','RETURN','IN_TRANSIT'," + tick + ",4,0)");
    }

    private static void simulateArrival(Connection c, String flowId, String location, String legType, long tick)
            throws SQLException {
        execute(c,
                "UPDATE npc_vessel SET status='WORKING',current_location_id='" + location + "',destination_location_id='" + location + "',last_tick=" + tick + " WHERE npc_vessel_id='" + VESSEL + "'",
                "UPDATE npc_transit_leg SET status='ARRIVED',elapsed_ticks=base_duration_ticks WHERE npc_vessel_id='" + VESSEL + "' AND leg_type='" + legType + "' AND status='IN_TRANSIT'");
    }

    private static void dockAtOrigin(Connection c) throws SQLException {
        execute(c, "UPDATE npc_vessel SET status='DOCKED',current_location_id='" + ORIGIN_LOCATION
                + "',destination_location_id=NULL,mission_id=NULL,route_progress=0,route_ticks_required=1 WHERE npc_vessel_id='" + VESSEL + "'");
    }

    private static long stationTotal(Connection c) throws SQLException {
        return number(c, "SELECT SUM(civilians+industrial_workers+logistics_workers+security_personnel+"
                + "medical_personnel+scientific_personnel+temporary_residents+refugees) FROM npc_population_state");
    }

    private static long populationTotal(Connection c, String populationId) throws SQLException {
        return number(c, "SELECT civilians+industrial_workers+logistics_workers+security_personnel+"
                + "medical_personnel+scientific_personnel+temporary_residents+refugees FROM npc_population_state "
                + "WHERE population_id='" + populationId + "'");
    }

    private static void configure(Connection c) throws SQLException {
        execute(c, "PRAGMA foreign_keys=ON", "PRAGMA recursive_triggers=ON", "PRAGMA journal_mode=WAL", "PRAGMA synchronous=FULL");
    }

    private static void execute(Connection c, String... sql) throws SQLException {
        try (Statement statement = c.createStatement()) {
            for (String value : sql) statement.execute(value);
        }
    }

    private static boolean object(Connection c, String type, String name) throws SQLException {
        return number(c, "SELECT COUNT(*) FROM sqlite_master WHERE type='" + type + "' AND name='" + name + "'") == 1;
    }

    private static long number(Connection c, String sql) throws SQLException {
        try (Statement statement = c.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new SQLException("No row returned: " + sql);
            return result.getLong(1);
        }
    }

    private static String text(Connection c, String sql) throws SQLException {
        try (Statement statement = c.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new SQLException("No row returned: " + sql);
            return result.getString(1);
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Schema 028 migration planning, transport preparation, physical departure, arrival, return, cancellation, casualties, stranding, conservation, deterministic replay, and rollback passed.");
    }
}
