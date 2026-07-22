package io.github.mrcalzon02.barotrauma.persistence;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

/** Focused contract for physical settlement-project contribution reconciliation. */
public final class SettlementProjectContributionAuthorityVerification {
    private SettlementProjectContributionAuthorityVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite::memory:")) {
            connection.createStatement().execute("PRAGMA foreign_keys=ON");
            createPrerequisites(connection);
            try (Statement statement = connection.createStatement()) {
                for (String sql : SettlementLifecycleSchema.statements()) statement.execute(sql);
            }
            reject(() -> SettlementProjectContributionAuthority.commitInventory(connection, "missing-project",
                            SettlementProjectTransaction.ContributionKind.MATERIALS,
                            "station-a", "item-steel", 1, 1, "autocommit-inventory"),
                    "active transaction");
            reject(() -> SettlementProjectContributionAuthority.commitTransport(connection, "missing-project",
                            "vessel-a", 1, "autocommit-transport"),
                    "active transaction");
            reject(() -> SettlementProjectContributionAuthority.commitArrivedPopulation(connection,
                            "missing-project", "flow-a", 1, 1, "autocommit-population"),
                    "active transaction");
            connection.setAutoCommit(false);
            try {
                var project = SettlementProjectTransaction.plan(connection,
                        new SettlementProjectTransaction.PlanRequest("world-1",
                                SettlementProjectTransaction.ProjectKind.EXPANSION, "Coalition",
                                "station-a", "station-b", "location-b", "population-b", "vessel-a",
                                new SettlementProjectTransaction.Requirements(10, 8, 6, 1, 50, 5),
                                10, "Expand Beta Station with physical commitments."));
                SettlementProjectTransaction.prepare(connection, project.projectId(), 11);

                SettlementProjectContributionAuthority.commitInventory(connection, project.projectId(),
                        SettlementProjectTransaction.ContributionKind.MATERIALS,
                        "station-a", "item-steel", 10, 12, "steel-delivery");
                SettlementProjectContributionAuthority.commitInventory(connection, project.projectId(),
                        SettlementProjectTransaction.ContributionKind.SUPPLIES,
                        "station-a", "item-rations", 8, 12, "ration-delivery");
                SettlementProjectContributionAuthority.commitTransport(connection, project.projectId(),
                        "vessel-a", 12, "builder-vessel");
                SettlementProjectContributionAuthority.commitArrivedPopulation(connection, project.projectId(),
                        "flow-a", 6, 12, "arrived-workers");

                require(quantity(connection, "item-steel") == 10 && quantity(connection, "item-rations") == 12,
                        "Physical inventory contributions were not deducted exactly once.");
                reject(() -> SettlementProjectContributionAuthority.commitInventory(connection, project.projectId(),
                        SettlementProjectTransaction.ContributionKind.MATERIALS,
                        "station-a", "item-steel", 1, 12, "steel-delivery"),
                        "exceeds the remaining project requirement");
                require(quantity(connection, "item-steel") == 10,
                        "Rejected duplicate contribution incorrectly deducted inventory.");

                var founding = SettlementProjectTransaction.plan(connection,
                        new SettlementProjectTransaction.PlanRequest("world-1",
                                SettlementProjectTransaction.ProjectKind.FOUNDING, "Coalition",
                                "station-a", null, "location-c", "population-a", "vessel-a",
                                new SettlementProjectTransaction.Requirements(0, 0, 4, 0, 0, 3),
                                15, "Found Gamma with a staged cohort."));
                SettlementProjectTransaction.prepare(connection, founding.projectId(), 16);
                try (var insert = connection.prepareStatement(
                        "INSERT INTO population_flow(flow_id,world_id,entity_type,status,destination_station_id,"
                                + "destination_location_id,arrived_quantity,destination_mode,settlement_project_id) "
                                + "VALUES('flow-founding','world-1','NPC_POPULATION','ARRIVED',NULL,'location-c',4,"
                                + "'FOUNDING_SITE',?)")) {
                    insert.setString(1, founding.projectId());
                    insert.executeUpdate();
                }
                var foundedCommitment = SettlementProjectContributionAuthority.commitArrivedPopulation(connection,
                        founding.projectId(), "flow-founding", 4, 17, "staged-founders");
                require(foundedCommitment.committedPopulation() == 4,
                        "Staged founding arrival did not become the project population commitment.");
                reject(() -> SettlementProjectContributionAuthority.commitArrivedPopulation(connection,
                        founding.projectId(), "flow-a", 1, 17, "wrong-founding-flow"),
                        "staged founding arrival linked to the project");

                SettlementProjectTransaction.transition(connection, project.projectId(), 18,
                        "CANCELLED", "fixture-cancelled",
                        "Contribution fixture completed and released its target location.");
                connection.createStatement().executeUpdate(
                        "UPDATE npc_vessel SET status='IN_TRANSIT' WHERE npc_vessel_id='vessel-a'");
                var second = SettlementProjectTransaction.plan(connection,
                        new SettlementProjectTransaction.PlanRequest("world-1",
                                SettlementProjectTransaction.ProjectKind.RECLAMATION, "Coalition",
                                "station-a", "station-b", "location-b", "population-b", "vessel-a",
                                new SettlementProjectTransaction.Requirements(0, 0, 0, 1, 20, 2),
                                20, "Transport rejection project."));
                SettlementProjectTransaction.prepare(connection, second.projectId(), 21);
                reject(() -> SettlementProjectContributionAuthority.commitTransport(connection, second.projectId(),
                        "vessel-a", 21, "busy-vessel"), "not idle at the origin");
                connection.commit();

                int steelBeforeRollback = quantity(connection, "item-steel");
                try {
                    var rollback = SettlementProjectTransaction.plan(connection,
                            new SettlementProjectTransaction.PlanRequest("world-1",
                                    SettlementProjectTransaction.ProjectKind.ABANDONMENT, "Coalition",
                                    "station-a", "station-a", "location-a", "population-a", null,
                                    new SettlementProjectTransaction.Requirements(2, 0, 0, 0, 0, 2),
                                    30, "Rollback contribution project."));
                    SettlementProjectTransaction.prepare(connection, rollback.projectId(), 31);
                    SettlementProjectContributionAuthority.commitInventory(connection, rollback.projectId(),
                            SettlementProjectTransaction.ContributionKind.MATERIALS,
                            "station-a", "item-steel", 2, 31, "rollback-steel");
                    connection.rollback();
                } catch (SQLException | RuntimeException exception) {
                    try { connection.rollback(); }
                    catch (SQLException rollbackFailure) { exception.addSuppressed(rollbackFailure); }
                    throw exception;
                }
                require(quantity(connection, "item-steel") == steelBeforeRollback,
                        "Contribution rollback did not restore physical inventory.");
                require(foreignKeyViolations(connection) == 0,
                        "Physical contribution verification left foreign-key violations.");
                connection.commit();
            } catch (SQLException | RuntimeException exception) {
                try { connection.rollback(); }
                catch (SQLException rollbackFailure) { exception.addSuppressed(rollbackFailure); }
                throw exception;
            } finally {
                if (!connection.getAutoCommit()) connection.setAutoCommit(true);
            }
        }
    }

    private static void createPrerequisites(Connection connection) throws SQLException {
        try (Statement s = connection.createStatement()) {
            s.execute("CREATE TABLE world_metadata(world_id TEXT PRIMARY KEY)");
            s.execute("CREATE TABLE world_location(location_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,display_name TEXT NOT NULL,is_station INTEGER NOT NULL DEFAULT 0)");
            s.execute("CREATE TABLE world_station(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,location_id TEXT NOT NULL,display_name TEXT NOT NULL)");
            s.execute("CREATE TABLE npc_population_state(population_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,station_id TEXT NOT NULL)");
            s.execute("CREATE TABLE npc_vessel(npc_vessel_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,display_name TEXT NOT NULL,home_station_id TEXT,current_location_id TEXT,status TEXT,mission_id TEXT)");
            s.execute("CREATE TABLE population_flow(flow_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,entity_type TEXT,status TEXT,"
                    + "destination_station_id TEXT,destination_location_id TEXT,arrived_quantity INTEGER,"
                    + "destination_mode TEXT NOT NULL DEFAULT 'STATION_POPULATION',settlement_project_id TEXT)");
            s.execute("CREATE TABLE station_change_reason(reason_code TEXT PRIMARY KEY,display_name TEXT NOT NULL,reason_family TEXT NOT NULL)");
            s.execute("CREATE TABLE item_catalogue(item_id TEXT PRIMARY KEY)");
            s.execute("CREATE TABLE station_inventory(station_id TEXT,item_id TEXT,quantity INTEGER,reserved INTEGER,last_tick INTEGER,PRIMARY KEY(station_id,item_id))");
            s.execute("INSERT INTO world_metadata VALUES('world-1')");
            s.execute("INSERT INTO world_location VALUES('location-a','world-1','Alpha',1),"
                    + "('location-b','world-1','Beta',1),('location-c','world-1','Gamma',0)");
            s.execute("INSERT INTO world_station VALUES('station-a','world-1','location-a','Alpha'),('station-b','world-1','location-b','Beta')");
            s.execute("INSERT INTO npc_population_state VALUES('population-a','world-1','station-a'),('population-b','world-1','station-b')");
            s.execute("INSERT INTO npc_vessel VALUES('vessel-a','world-1','Builder','station-a','location-a','DOCKED',NULL)");
            s.execute("INSERT INTO population_flow(flow_id,world_id,entity_type,status,destination_station_id,"
                    + "destination_location_id,arrived_quantity,destination_mode) VALUES('flow-a','world-1',"
                    + "'NPC_POPULATION','ARRIVED','station-b','location-b',6,'STATION_POPULATION')");
            s.execute("INSERT INTO item_catalogue VALUES('item-steel'),('item-rations')");
            s.execute("INSERT INTO station_inventory VALUES('station-a','item-steel',20,0,0),('station-a','item-rations',20,0,0)");
        }
    }

    private static int quantity(Connection connection, String itemId) throws SQLException {
        try (var statement = connection.prepareStatement(
                "SELECT quantity FROM station_inventory WHERE station_id='station-a' AND item_id=?")) {
            statement.setString(1, itemId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Missing inventory row.");
                return result.getInt(1);
            }
        }
    }

    private static long foreignKeyViolations(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("PRAGMA foreign_key_check")) {
            long count = 0; while (result.next()) count++; return count;
        }
    }

    private static void reject(SqlWork work, String expected) throws Exception {
        try { work.run(); throw new IllegalStateException("Expected rejection containing: " + expected); }
        catch (SQLException exception) {
            require(exception.getMessage() != null && exception.getMessage().contains(expected),
                    "Unexpected rejection: " + exception.getMessage());
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    @FunctionalInterface private interface SqlWork { void run() throws Exception; }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Physical settlement contribution and rollback contracts passed.");
    }
}
