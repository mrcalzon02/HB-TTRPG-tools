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

import static io.github.mrcalzon02.barotrauma.persistence.NpcDemographicLifecycleVerificationFixture.*;

/** Milestone 2.3 foundation contract for conserved, transport-backed population movement. */
public final class NpcPopulationMigrationVerification {
    private static final String ORIGIN_LOCATION = "location";
    private static final String DESTINATION_LOCATION = "28000000-0000-0000-0000-000000000003";
    private static final String DESTINATION_STATION = "28000000-0000-0000-0000-000000000005";
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
            deleteTree(root);
        }
    }

    private static String runScenario(Path database) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + database)) {
            configure(connection);
            createFixture(connection);
            for (String sql : NpcDemographicLifecycleSchema.statements()) execute(connection, sql);
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
            ordinaryMigration(connection);
            cancelledWorkerTransfer(connection);
            returnedEvacuation(connection);
            failedEmergencyRelocation(connection);
            failedPreparationReleasesTransport(connection);

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
                    "Station residents, transported survivors, and migration losses do not conserve the initial population.");
            require(number(connection, "SELECT COUNT(*) FROM world_observation_event WHERE category='MIGRATION'") >= 4,
                    "Migration outcomes are missing observation evidence.");
            require(number(connection, "SELECT COUNT(*) FROM pragma_foreign_key_check") == 0,
                    "Schema 028 created foreign-key violations.");

            dockAtOrigin(connection);
            long flows = number(connection, "SELECT COUNT(*) FROM population_flow");
            connection.setAutoCommit(false);
            NpcPopulationMigrationTransaction.plan(connection,
                    new PlanRequest(FlowKind.ORDINARY_MIGRATION, POPULATION, DESTINATION_POPULATION,
                            VESSEL, 5, 90, "This flow must roll back."));
            connection.rollback();
            connection.setAutoCommit(true);
            require(number(connection, "SELECT COUNT(*) FROM population_flow") == flows,
                    "A rolled-back migration plan survived transaction rollback.");

            return text(connection, "SELECT group_concat(flow_kind||':'||status||':'||quantity||':'||"
                    + "embarked_quantity||':'||arrived_quantity||':'||returned_quantity||':'||losses||':'||"
                    + "stranded_quantity,'|') FROM (SELECT * FROM population_flow ORDER BY created_tick,flow_id)");
        }
    }

    private static void ordinaryMigration(Connection connection) throws Exception {
        var flow = NpcPopulationMigrationTransaction.plan(connection,
                new PlanRequest(FlowKind.ORDINARY_MIGRATION, POPULATION, DESTINATION_POPULATION,
                        VESSEL, 100, 60, "One hundred residents seek ordinary relocation."));
        NpcPopulationMigrationTransaction.prepare(connection, flow.flowId(), 61);
        departTransport(connection, flow.flowId(), DESTINATION_LOCATION, "OUTBOUND", 62);
        NpcPopulationMigrationTransaction.depart(connection, flow.flowId(), 62);
        require(populationTotal(connection, POPULATION) == 900,
                "Ordinary migration did not remove exact cohorts at physical departure.");
        arriveTransport(connection, DESTINATION_LOCATION, "OUTBOUND", 66);
        var arrived = NpcPopulationMigrationTransaction.arrive(connection, flow.flowId(), 66, 5);
        require(arrived.arrived() == 95 && arrived.losses() == 5,
                "Ordinary migration did not distinguish arrivals from casualties.");
        require(populationTotal(connection, DESTINATION_POPULATION) == 495,
                "Destination did not receive surviving ordinary migrants.");
    }

    private static void cancelledWorkerTransfer(Connection connection) throws Exception {
        dockAtOrigin(connection);
        var flow = NpcPopulationMigrationTransaction.plan(connection,
                new PlanRequest(FlowKind.WORKER_TRANSFER, POPULATION, DESTINATION_POPULATION,
                        VESSEL, 40, 67, "A logistics and industrial workforce transfer was approved."));
        NpcPopulationMigrationTransaction.prepare(connection, flow.flowId(), 68);
        NpcPopulationMigrationTransaction.cancel(connection, flow.flowId(), 69,
                "Destination contract was withdrawn.");
        require(populationTotal(connection, POPULATION) == 900,
                "Cancelling a pre-departure worker transfer changed the population.");
    }

    private static void returnedEvacuation(Connection connection) throws Exception {
        dockAtOrigin(connection);
        var flow = NpcPopulationMigrationTransaction.plan(connection,
                new PlanRequest(FlowKind.REFUGEE_EVACUATION, POPULATION, DESTINATION_POPULATION,
                        VESSEL, 50, 70, "Refugees were assigned protected evacuation transport."));
        NpcPopulationMigrationTransaction.prepare(connection, flow.flowId(), 71);
        departTransport(connection, flow.flowId(), DESTINATION_LOCATION, "OUTBOUND", 72);
        NpcPopulationMigrationTransaction.depart(connection, flow.flowId(), 72);
        NpcPopulationMigrationTransaction.beginReturn(connection, flow.flowId(), 73,
                "The destination berth failed its life-support inspection.");
        execute(connection, "UPDATE npc_transit_leg SET status='CANCELLED' WHERE npc_vessel_id='" + VESSEL
                + "' AND status='IN_TRANSIT'");
        departTransport(connection, flow.flowId() + ":return", ORIGIN_LOCATION, "RETURN", 74);
        arriveTransport(connection, ORIGIN_LOCATION, "RETURN", 77);
        var returned = NpcPopulationMigrationTransaction.completeReturn(connection, flow.flowId(), 77, 2);
        require(returned.returned() == 48 && returned.losses() == 2,
                "Returning evacuation did not reconcile survivors and casualties.");
    }

    private static void failedEmergencyRelocation(Connection connection) throws Exception {
        dockAtOrigin(connection);
        var flow = NpcPopulationMigrationTransaction.plan(connection,
                new PlanRequest(FlowKind.EMERGENCY_RELOCATION, POPULATION, DESTINATION_POPULATION,
                        VESSEL, 40, 78, "Emergency relocation followed structural failure."));
        NpcPopulationMigrationTransaction.prepare(connection, flow.flowId(), 79);
        departTransport(connection, flow.flowId(), DESTINATION_LOCATION, "OUTBOUND", 80);
        NpcPopulationMigrationTransaction.depart(connection, flow.flowId(), 80);
        boolean rejected = false;
        try {
            execute(connection, "UPDATE population_flow SET embarked_quantity=quantity+1 WHERE flow_id='"
                    + flow.flowId() + "'");
        } catch (SQLException expected) {
            rejected = true;
        }
        require(rejected, "An impossible embarked quantity bypassed physical conservation guards.");
        var failed = NpcPopulationMigrationTransaction.fail(connection, flow.flowId(), 81, 10, 30,
                "Lead transport was disabled and surviving evacuees became stranded.");
        require(failed.losses() == 10 && failed.stranded() == 30,
                "Failed emergency relocation did not account for casualties and stranded survivors.");
    }

    private static void failedPreparationReleasesTransport(Connection connection) throws Exception {
        dockAtOrigin(connection);
        long before = populationTotal(connection, POPULATION);
        var flow = NpcPopulationMigrationTransaction.plan(connection,
                new PlanRequest(FlowKind.ORDINARY_MIGRATION, POPULATION, DESTINATION_POPULATION,
                        VESSEL, 25, 82, "Preparation was interrupted before physical departure."));
        NpcPopulationMigrationTransaction.prepare(connection, flow.flowId(), 83);
        var failed = NpcPopulationMigrationTransaction.fail(connection, flow.flowId(), 84, 0, 0,
                "Transport preparation failed before departure.");
        require(failed.status().equals("FAILED") && failed.reserved() == 0 && failed.embarked() == 0,
                "Pre-departure failure did not clear the reserved migration state.");
        require(populationTotal(connection, POPULATION) == before,
                "Pre-departure failure changed population before physical release.");
        require(text(connection, "SELECT status FROM npc_vessel WHERE npc_vessel_id='" + VESSEL + "'")
                        .equals("DOCKED"),
                "Pre-departure failure left its assigned vessel outside the docked pool.");
        require(text(connection, "SELECT current_location_id FROM npc_vessel WHERE npc_vessel_id='" + VESSEL + "'")
                        .equals(ORIGIN_LOCATION),
                "Pre-departure failure did not restore its vessel to the origin.");
        require(number(connection, "SELECT COUNT(*) FROM npc_vessel WHERE npc_vessel_id='" + VESSEL
                        + "' AND destination_location_id IS NULL AND mission_id IS NULL") == 1,
                "Pre-departure failure retained destination or mission assignment on its vessel.");
    }

    private static void createFixture(Connection connection) throws SQLException {
        createSchema026Fixture(connection);
        execute(connection,
                "CREATE TABLE world_location(location_id TEXT PRIMARY KEY,world_id TEXT,display_name TEXT,ring INTEGER,location_level INTEGER)",
                "CREATE TABLE npc_vessel(npc_vessel_id TEXT PRIMARY KEY,world_id TEXT,display_name TEXT,current_location_id TEXT,destination_location_id TEXT,mission_id TEXT,status TEXT,route_progress INTEGER,route_ticks_required INTEGER,last_tick INTEGER)",
                "CREATE TABLE npc_transit_leg(leg_id TEXT PRIMARY KEY,npc_vessel_id TEXT,destination_location_id TEXT,leg_type TEXT,status TEXT,started_tick INTEGER,base_duration_ticks INTEGER,elapsed_ticks INTEGER)",
                "CREATE TABLE population_flow(flow_id TEXT PRIMARY KEY,world_id TEXT,entity_type TEXT,population_id TEXT,origin_location_id TEXT,destination_location_id TEXT,quantity INTEGER,cause TEXT,status TEXT,departure_tick INTEGER,arrival_tick INTEGER,losses INTEGER DEFAULT 0,created_tick INTEGER,updated_tick INTEGER,summary TEXT)",
                "INSERT INTO world_location VALUES('" + ORIGIN_LOCATION + "','" + WORLD + "','Origin Shelf',48,1)",
                "INSERT INTO world_location VALUES('" + DESTINATION_LOCATION + "','" + WORLD + "','Destination Shelf',36,3)",
                "INSERT INTO world_station VALUES('" + DESTINATION_STATION + "','" + WORLD + "','"
                        + DESTINATION_LOCATION + "','Destination Station')",
                "INSERT INTO station_simulation_state VALUES('" + DESTINATION_STATION + "','" + WORLD
                        + "',10000,100,50,70,90,100,5,0,'STABLE',42)",
                "INSERT INTO station_civilization_state VALUES('" + DESTINATION_STATION + "','" + WORLD
                        + "',40,90,10,1,0,0,10,60,'HOLDING',42)",
                "INSERT INTO station_inventory VALUES('" + DESTINATION_STATION + "','item-rations',1000,42)",
                "INSERT INTO npc_population_state VALUES('" + DESTINATION_POPULATION + "','" + WORLD + "','"
                        + DESTINATION_STATION + "',250,50,40,25,15,10,5,5,1500,1500,1300,80,'FIXTURE',42)",
                "INSERT INTO npc_population_reconciliation VALUES('" + DESTINATION_POPULATION + "','" + WORLD
                        + "','" + DESTINATION_STATION + "',10,40,'ALIGNED',400,42)",
                "INSERT INTO station_population_state VALUES('" + DESTINATION_STATION + "','" + WORLD
                        + "','FIXTURE',42,400,400,140,140,42)",
                "INSERT INTO npc_vessel VALUES('" + VESSEL + "','" + WORLD + "','Evacuation Tender','"
                        + ORIGIN_LOCATION + "',NULL,NULL,'DOCKED',0,1,42)");
    }

    private static void departTransport(Connection connection, String seed, String destination,
                                        String legType, long tick) throws SQLException {
        execute(connection,
                "UPDATE npc_vessel SET status='IN_TRANSIT',destination_location_id='" + destination
                        + "',last_tick=" + tick + " WHERE npc_vessel_id='" + VESSEL + "'",
                "INSERT INTO npc_transit_leg VALUES('" + seed + ":" + legType.toLowerCase() + ":leg','"
                        + VESSEL + "','" + destination + "','" + legType + "','IN_TRANSIT'," + tick + ",4,0)");
    }

    private static void arriveTransport(Connection connection, String location, String legType, long tick)
            throws SQLException {
        execute(connection,
                "UPDATE npc_vessel SET status='WORKING',current_location_id='" + location
                        + "',destination_location_id='" + location + "',last_tick=" + tick
                        + " WHERE npc_vessel_id='" + VESSEL + "'",
                "UPDATE npc_transit_leg SET status='ARRIVED',elapsed_ticks=base_duration_ticks WHERE npc_vessel_id='"
                        + VESSEL + "' AND leg_type='" + legType + "' AND status='IN_TRANSIT'");
    }

    private static void dockAtOrigin(Connection connection) throws SQLException {
        execute(connection, "UPDATE npc_vessel SET status='DOCKED',current_location_id='" + ORIGIN_LOCATION
                + "',destination_location_id=NULL,mission_id=NULL,route_progress=0,route_ticks_required=1 WHERE npc_vessel_id='"
                + VESSEL + "'");
    }

    private static long stationTotal(Connection connection) throws SQLException {
        return number(connection, "SELECT SUM(civilians+industrial_workers+logistics_workers+security_personnel+"
                + "medical_personnel+scientific_personnel+temporary_residents+refugees) FROM npc_population_state");
    }

    private static long populationTotal(Connection connection, String populationId) throws SQLException {
        return number(connection, "SELECT civilians+industrial_workers+logistics_workers+security_personnel+"
                + "medical_personnel+scientific_personnel+temporary_residents+refugees FROM npc_population_state "
                + "WHERE population_id='" + populationId + "'");
    }

    private static boolean object(Connection connection, String type, String name) throws SQLException {
        return number(connection, "SELECT COUNT(*) FROM sqlite_master WHERE type='" + type + "' AND name='" + name + "'") == 1;
    }

    private static void execute(Connection connection, String... statements) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            for (String sql : statements) statement.execute(sql);
        }
    }

    private static long number(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new SQLException("No row returned: " + sql);
            return result.getLong(1);
        }
    }

    private static String text(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new SQLException("No row returned: " + sql);
            return result.getString(1);
        }
    }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Schema 028 migration planning, transport preparation, physical departure, arrival, return, cancellation, pre-departure failure release, casualties, stranding, conservation, deterministic replay, and rollback passed.");
    }
}
