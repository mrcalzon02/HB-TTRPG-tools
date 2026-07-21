package io.github.mrcalzon02.barotrauma.persistence;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Comparator;
import java.util.UUID;

import static io.github.mrcalzon02.barotrauma.persistence.NpcDemographicLifecycleVerificationFixture.*;

/** Deterministic planning and vessel/transit synchronization contract for the passive migration engine. */
public final class NpcPopulationMigrationEngineVerification {
    private static final String ORIGIN_LOCATION = "location";
    private static final String DESTINATION_LOCATION = "28000000-0000-0000-0000-000000000103";
    private static final String DESTINATION_STATION = "28000000-0000-0000-0000-000000000105";
    private static final String DESTINATION_POPULATION = "28000000-0000-0000-0000-000000000107";
    private static final String VESSEL = "28000000-0000-0000-0000-000000000108";

    private NpcPopulationMigrationEngineVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        Path root = Files.createTempDirectory("barotrauma-passive-migration-");
        try {
            String first = run(root.resolve("first.db"));
            String second = run(root.resolve("second.db"));
            require(first.equals(second), "Passive migration planning or settlement was not deterministic.");
        } finally {
            try (var stream = Files.walk(root)) {
                for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
            }
        }
    }

    private static String run(Path database) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + database)) {
            configure(connection);
            createFixture(connection);
            for (String sql : NpcDemographicLifecycleSchema.statements()) execute(connection, sql);
            for (String sql : NpcPopulationMigrationSchema.statements()) execute(connection, sql);

            var planned = NpcPopulationMigrationEngine.advanceAndPlan(connection, UUID.fromString(WORLD), 60);
            require(planned.plannedFlows() == 1 && planned.plannedFlowId() != null,
                    "A critically pressured station did not plan one deterministic relocation flow.");
            require("PREPARING".equals(text(connection, "SELECT status FROM population_flow WHERE flow_id='"
                            + planned.plannedFlowId() + "'")),
                    "Passive planning did not reserve transport and enter preparation.");
            require("EMERGENCY_RELOCATION".equals(text(connection,
                            "SELECT flow_kind FROM population_flow WHERE flow_id='" + planned.plannedFlowId() + "'")),
                    "Critical integrity and threat did not select emergency relocation.");
            require("PREPARING".equals(text(connection,
                            "SELECT status FROM npc_vessel WHERE npc_vessel_id='" + VESSEL + "'")),
                    "Planned migration did not reserve the selected vessel.");
            require(population(connection, POPULATION) == 1000,
                    "Planning or preparation removed people before physical departure.");

            departTransport(connection, planned.plannedFlowId(), 61);
            var departed = NpcPopulationMigrationEngine.advanceAndPlan(connection, UUID.fromString(WORLD), 61);
            require(departed.synchronizedFlows() == 1,
                    "An active transit leg did not release the prepared population.");
            require("IN_TRANSIT".equals(text(connection,
                            "SELECT status FROM population_flow WHERE flow_id='" + planned.plannedFlowId() + "'")),
                    "Prepared migration did not enter physical transit.");
            require(population(connection, POPULATION) == 900,
                    "Physical departure did not remove the exact planned population.");

            arriveTransport(connection, DESTINATION_LOCATION, "OUTBOUND", 65);
            var arrived = NpcPopulationMigrationEngine.advanceAndPlan(connection, UUID.fromString(WORLD), 65);
            require(arrived.synchronizedFlows() == 1,
                    "An arrived migration vessel did not settle its passengers.");
            require("ARRIVED".equals(text(connection,
                            "SELECT status FROM population_flow WHERE flow_id='" + planned.plannedFlowId() + "'")),
                    "Migration flow did not reach its terminal arrival state.");
            require(population(connection, DESTINATION_POPULATION) == 500,
                    "Destination did not receive the automatically transported population.");
            require(number(connection, "SELECT COUNT(*) FROM npc_population_flow_transition WHERE flow_id='"
                            + planned.plannedFlowId() + "'") == 4,
                    "Automatic planning, preparation, departure, and arrival transitions were not all recorded.");

            dockAtOrigin(connection);
            var returningPlan = NpcPopulationMigrationEngine.advanceAndPlan(connection, UUID.fromString(WORLD), 66);
            require(returningPlan.plannedFlows() == 1 && returningPlan.plannedFlowId() != null,
                    "The pressured origin did not plan a second deterministic relocation flow.");
            long returningQuantity = number(connection, "SELECT quantity FROM population_flow WHERE flow_id='"
                    + returningPlan.plannedFlowId() + "'");
            require(returningQuantity == 90,
                    "The second emergency relocation did not honor the bounded one-tenth population rule.");
            departTransport(connection, returningPlan.plannedFlowId(), 67);
            var returningDeparture = NpcPopulationMigrationEngine.advanceAndPlan(
                    connection, UUID.fromString(WORLD), 67);
            require(returningDeparture.synchronizedFlows() == 1 && population(connection, POPULATION) == 810,
                    "The capacity-return scenario did not physically depart its exact cohort.");

            execute(connection, "UPDATE npc_population_state SET housing_capacity=550,life_support_capacity=550 "
                    + "WHERE population_id='" + DESTINATION_POPULATION + "'");
            arriveTransport(connection, DESTINATION_LOCATION, "OUTBOUND", 71);
            var rejectedArrival = NpcPopulationMigrationEngine.advanceAndPlan(connection, UUID.fromString(WORLD), 71);
            require(rejectedArrival.synchronizedFlows() == 1,
                    "Destination capacity collapse did not synchronize the active flow.");
            require("RETURNING".equals(text(connection, "SELECT status FROM population_flow WHERE flow_id='"
                            + returningPlan.plannedFlowId() + "'")),
                    "Destination capacity collapse did not order a physical return.");
            require(population(connection, DESTINATION_POPULATION) == 500,
                    "Rejected passengers were added to a destination without capacity.");
            require(population(connection, POPULATION) == 810,
                    "Rejected passengers teleported back before the return leg arrived.");

            departReturnTransport(connection, returningPlan.plannedFlowId(), 72);
            NpcPopulationMigrationEngine.advanceAndPlan(connection, UUID.fromString(WORLD), 72);
            arriveTransport(connection, ORIGIN_LOCATION, "RETURN", 76);
            var completedReturn = NpcPopulationMigrationEngine.advanceAndPlan(
                    connection, UUID.fromString(WORLD), 76);
            require(completedReturn.synchronizedFlows() == 1,
                    "An arrived return leg did not restore its passengers to the origin.");
            require("ARRIVED".equals(text(connection, "SELECT status FROM population_flow WHERE flow_id='"
                            + returningPlan.plannedFlowId() + "'")),
                    "The returned flow did not reach its terminal arrival state.");
            require(number(connection, "SELECT returned_quantity FROM population_flow WHERE flow_id='"
                            + returningPlan.plannedFlowId() + "'") == returningQuantity,
                    "The full surviving cohort was not recorded as returned.");
            require(population(connection, POPULATION) == 900,
                    "Returned passengers were not restored to the origin population.");
            require(population(connection, DESTINATION_POPULATION) == 500,
                    "The rejected return path changed destination population.");
            require(number(connection, "SELECT COUNT(*) FROM npc_population_flow_transition WHERE flow_id='"
                            + returningPlan.plannedFlowId() + "'") == 5,
                    "Plan, preparation, departure, return order, and return completion were not all recorded.");
            require(number(connection, "SELECT COUNT(*) FROM npc_population_ledger WHERE primary_cause IN "
                            + "('EMIGRATION','IMMIGRATION','RETURN')") == 4,
                    "Automatic migration and return did not produce complete paired ledger terms.");
            require(number(connection, "SELECT COUNT(*) FROM pragma_foreign_key_check") == 0,
                    "Passive migration engine produced foreign-key violations.");

            return text(connection, "SELECT group_concat(flow_id||':'||flow_kind||':'||status||':'||quantity||':'||"
                    + "embarked_quantity||':'||arrived_quantity||':'||returned_quantity||':'||losses,'|') "
                    + "FROM (SELECT * FROM population_flow ORDER BY created_tick,flow_id)");
        }
    }

    private static void createFixture(Connection connection) throws SQLException {
        createSchema026Fixture(connection);
        execute(connection,
                "CREATE TABLE world_location(location_id TEXT PRIMARY KEY,world_id TEXT,display_name TEXT,ring INTEGER,location_level INTEGER)",
                "CREATE TABLE npc_vessel(npc_vessel_id TEXT PRIMARY KEY,world_id TEXT,display_name TEXT,role TEXT,home_station_id TEXT,current_location_id TEXT,destination_location_id TEXT,mission_id TEXT,status TEXT,hull INTEGER,supplies INTEGER,cargo INTEGER,crew_quality INTEGER,navigation INTEGER,engineering INTEGER,combat INTEGER,mining INTEGER,research INTEGER,route_progress INTEGER,route_ticks_required INTEGER,deterministic_seed INTEGER,last_tick INTEGER)",
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
                        + DESTINATION_STATION + "',250,50,40,25,15,10,5,5,1500,1500,1300,85,'FIXTURE',42)",
                "INSERT INTO npc_population_reconciliation VALUES('" + DESTINATION_POPULATION + "','" + WORLD
                        + "','" + DESTINATION_STATION + "',10,40,'ALIGNED',400,42)",
                "INSERT INTO station_population_state VALUES('" + DESTINATION_STATION + "','" + WORLD
                        + "','FIXTURE',42,400,400,140,140,42)",
                "UPDATE station_simulation_state SET integrity=20,threat=90,status='BESIEGED',supplies=25 WHERE station_id='"
                        + STATION + "'",
                "UPDATE npc_population_state SET morale=35 WHERE population_id='" + POPULATION + "'",
                "INSERT INTO npc_vessel VALUES('" + VESSEL + "','" + WORLD + "','Evacuation Tender','COURIER','"
                        + STATION + "','" + ORIGIN_LOCATION + "',NULL,NULL,'DOCKED',100,100,0,70,70,70,60,40,40,0,1,2801,42)");
    }

    private static void departTransport(Connection connection, String flowId, long tick) throws SQLException {
        execute(connection,
                "UPDATE npc_vessel SET status='IN_TRANSIT',destination_location_id='" + DESTINATION_LOCATION
                        + "',last_tick=" + tick + " WHERE npc_vessel_id='" + VESSEL + "'",
                "INSERT INTO npc_transit_leg VALUES('" + flowId + ":outbound','" + VESSEL + "','"
                        + DESTINATION_LOCATION + "','OUTBOUND','IN_TRANSIT'," + tick + ",4,0)");
    }

    private static void departReturnTransport(Connection connection, String flowId, long tick) throws SQLException {
        execute(connection,
                "UPDATE npc_transit_leg SET status='CANCELLED' WHERE npc_vessel_id='" + VESSEL
                        + "' AND status='ARRIVED'",
                "UPDATE npc_vessel SET status='IN_TRANSIT',destination_location_id='" + ORIGIN_LOCATION
                        + "',last_tick=" + tick + " WHERE npc_vessel_id='" + VESSEL + "'",
                "INSERT INTO npc_transit_leg VALUES('" + flowId + ":return','" + VESSEL + "','"
                        + ORIGIN_LOCATION + "','RETURN','IN_TRANSIT'," + tick + ",4,0)");
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
        execute(connection,
                "UPDATE npc_vessel SET status='DOCKED',current_location_id='" + ORIGIN_LOCATION
                        + "',destination_location_id=NULL,mission_id=NULL,route_progress=0,route_ticks_required=1 "
                        + "WHERE npc_vessel_id='" + VESSEL + "'");
    }

    private static long population(Connection connection, String populationId) throws SQLException {
        return number(connection, "SELECT civilians+industrial_workers+logistics_workers+security_personnel+"
                + "medical_personnel+scientific_personnel+temporary_residents+refugees FROM npc_population_state "
                + "WHERE population_id='" + populationId + "'");
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
        System.out.println("Passive migration pressure planning, vessel reservation, physical departure, arrival settlement, capacity rejection, return transit, origin restoration, conservation, and deterministic replay passed.");
    }
}
