package io.github.mrcalzon02.barotrauma.persistence;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

/** Focused deterministic contract for passive schema-029 project progression. */
public final class SettlementProjectEngineVerification {
    private SettlementProjectEngineVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite::memory:")) {
            try (Statement statement = connection.createStatement()) {
                statement.execute("PRAGMA foreign_keys=ON");
                createPrerequisites(statement);
                for (String sql : SettlementLifecycleSchema.statements()) statement.execute(sql);
            }

            var project = SettlementProjectTransaction.plan(connection,
                    new SettlementProjectTransaction.PlanRequest(
                            "world-1", SettlementProjectTransaction.ProjectKind.EXPANSION, "Coalition",
                            "station-a", "station-a", "location-a", "population-a", "vessel-a",
                            new SettlementProjectTransaction.Requirements(20, 20, 20, 1, 60, 25),
                            10, "Expand Alpha Station through committed work."));
            SettlementProjectTransaction.prepare(connection, project.projectId(), 11);
            contribute(connection, project.projectId(), SettlementProjectTransaction.ContributionKind.MATERIALS, 20, "m");
            contribute(connection, project.projectId(), SettlementProjectTransaction.ContributionKind.SUPPLIES, 20, "s");
            contribute(connection, project.projectId(), SettlementProjectTransaction.ContributionKind.POPULATION, 20, "p");
            contribute(connection, project.projectId(), SettlementProjectTransaction.ContributionKind.TRANSPORT, 1, "t");
            contribute(connection, project.projectId(), SettlementProjectTransaction.ContributionKind.SECURITY, 60, "g");
            SettlementProjectTransaction.activate(connection, project.projectId(), 12);

            var first = SettlementProjectEngine.advance(connection, "world-1", 13);
            require(first.advancedProjects() == 1 && first.completedProjects() == 0,
                    "Supported settlement project did not advance exactly once.");
            require(progress(connection, project.projectId()) == 6,
                    "Deterministic settlement work quantity changed unexpectedly.");

            connection.createStatement().executeUpdate(
                    "UPDATE station_simulation_state SET security=40 WHERE station_id='station-a'");
            var blocked = SettlementProjectEngine.advance(connection, "world-1", 14);
            require(blocked.blockedProjects() == 1 && status(connection, project.projectId()).equals("BLOCKED"),
                    "Settlement project did not block when security support failed.");
            require(progress(connection, project.projectId()) == 6,
                    "Blocked settlement project incorrectly accumulated work.");

            connection.createStatement().executeUpdate(
                    "UPDATE station_simulation_state SET security=80 WHERE station_id='station-a'");
            var resumed = SettlementProjectEngine.advance(connection, "world-1", 15);
            require(resumed.resumedProjects() == 1 && resumed.advancedProjects() == 1,
                    "Settlement project did not resume and advance after security recovery.");
            require(status(connection, project.projectId()).equals("ACTIVE"),
                    "Resumed settlement project entered an unexpected status.");

            SettlementProjectEngine.advance(connection, "world-1", 16);
            var complete = SettlementProjectEngine.advance(connection, "world-1", 17);
            require(complete.completedProjects() == 1 && status(connection, project.projectId()).equals("COMPLETE"),
                    "Settlement project did not complete within its deterministic bounded work window.");
            require(progress(connection, project.projectId()) == 25,
                    "Completed settlement project did not stop at exact target progress.");
            require(count(connection, "settlement_project_contribution", "contribution_kind='WORK'") == 4,
                    "Passive settlement work evidence count is incorrect.");
            require(count(connection, "settlement_project_transition", "to_status='BLOCKED'") == 1
                            && count(connection, "settlement_project_transition", "to_status='ACTIVE'") == 2,
                    "Settlement security transition evidence is incomplete.");
        }
    }

    private static void contribute(Connection connection, String projectId,
                                   SettlementProjectTransaction.ContributionKind kind,
                                   int quantity, String evidence) throws Exception {
        SettlementProjectTransaction.contribute(connection,
                new SettlementProjectTransaction.ContributionRequest(projectId, kind, quantity,
                        "station-a", kind == SettlementProjectTransaction.ContributionKind.POPULATION
                                ? "population-a" : null,
                        kind == SettlementProjectTransaction.ContributionKind.TRANSPORT ? "vessel-a" : null,
                        null, 12, evidence, "Committed " + kind + "."));
    }

    private static void createPrerequisites(Statement statement) throws Exception {
        statement.execute("CREATE TABLE world_metadata(world_id TEXT PRIMARY KEY)");
        statement.execute("CREATE TABLE world_location(location_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,display_name TEXT NOT NULL,is_station INTEGER NOT NULL DEFAULT 0)");
        statement.execute("CREATE TABLE world_station(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,location_id TEXT NOT NULL,display_name TEXT NOT NULL)");
        statement.execute("CREATE TABLE npc_population_state(population_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,station_id TEXT NOT NULL)");
        statement.execute("CREATE TABLE npc_vessel(npc_vessel_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,display_name TEXT NOT NULL)");
        statement.execute("CREATE TABLE population_flow(flow_id TEXT PRIMARY KEY,world_id TEXT NOT NULL)");
        statement.execute("CREATE TABLE station_change_reason(reason_code TEXT PRIMARY KEY,display_name TEXT NOT NULL,reason_family TEXT NOT NULL)");
        statement.execute("CREATE TABLE station_simulation_state(station_id TEXT PRIMARY KEY,security INTEGER NOT NULL)");
        statement.execute("INSERT INTO world_metadata VALUES('world-1')");
        statement.execute("INSERT INTO world_location VALUES('location-a','world-1','Alpha',1)");
        statement.execute("INSERT INTO world_station VALUES('station-a','world-1','location-a','Alpha Station')");
        statement.execute("INSERT INTO npc_population_state VALUES('population-a','world-1','station-a')");
        statement.execute("INSERT INTO npc_vessel VALUES('vessel-a','world-1','Builder One')");
        statement.execute("INSERT INTO station_simulation_state VALUES('station-a',80)");
    }

    private static String status(Connection connection, String projectId) throws Exception {
        try (var statement = connection.prepareStatement("SELECT status FROM settlement_project WHERE project_id=?")) {
            statement.setString(1, projectId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Settlement project missing.");
                return result.getString(1);
            }
        }
    }

    private static int progress(Connection connection, String projectId) throws Exception {
        try (var statement = connection.prepareStatement(
                "SELECT progress_units FROM settlement_project WHERE project_id=?")) {
            statement.setString(1, projectId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Settlement project missing.");
                return result.getInt(1);
            }
        }
    }

    private static long count(Connection connection, String table, String where) throws Exception {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COUNT(*) FROM " + table + " WHERE " + where)) {
            return result.next() ? result.getLong(1) : 0;
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Deterministic settlement project progression, blocking, resumption, and completion contracts passed.");
    }
}
