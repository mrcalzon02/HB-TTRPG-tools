package io.github.mrcalzon02.barotrauma.persistence;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

/** Focused contract for the authoritative schema-029 settlement project transaction. */
public final class SettlementProjectTransactionVerification {
    private SettlementProjectTransactionVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite::memory:")) {
            connection.createStatement().execute("PRAGMA foreign_keys=ON");
            createPrerequisites(connection);
            try (Statement statement = connection.createStatement()) {
                for (String sql : SettlementLifecycleSchema.statements()) statement.execute(sql);
            }

            var planned = SettlementProjectTransaction.plan(connection,
                    new SettlementProjectTransaction.PlanRequest(
                            "world-1", SettlementProjectTransaction.ProjectKind.FOUNDING, "Coalition",
                            "station-a", null, "location-b", "population-a", "vessel-a",
                            new SettlementProjectTransaction.Requirements(40, 30, 20, 1, 60, 8),
                            10, "Found a supported frontier settlement."));
            require(planned.status().equals("PLANNED"), "Settlement plan did not begin in PLANNED state.");

            SettlementProjectTransaction.prepare(connection, planned.projectId(), 11);
            reject(() -> SettlementProjectTransaction.activate(connection, planned.projectId(), 12),
                    "Settlement project lacks conserved committed support.");

            contribute(connection, planned.projectId(), SettlementProjectTransaction.ContributionKind.MATERIALS,
                    40, 12, "materials-1");
            contribute(connection, planned.projectId(), SettlementProjectTransaction.ContributionKind.SUPPLIES,
                    30, 12, "supplies-1");
            contribute(connection, planned.projectId(), SettlementProjectTransaction.ContributionKind.POPULATION,
                    20, 12, "population-1");
            contribute(connection, planned.projectId(), SettlementProjectTransaction.ContributionKind.TRANSPORT,
                    1, 12, "transport-1");
            contribute(connection, planned.projectId(), SettlementProjectTransaction.ContributionKind.SECURITY,
                    60, 12, "security-1");
            reject(() -> contribute(connection, planned.projectId(),
                    SettlementProjectTransaction.ContributionKind.SECURITY, 1, 12, "security-1"),
                    "UNIQUE constraint failed");

            var active = SettlementProjectTransaction.activate(connection, planned.projectId(), 13);
            require(active.status().equals("ACTIVE"), "Fully supported settlement project did not activate.");
            var partial = SettlementProjectTransaction.advance(connection, planned.projectId(), 14, 3,
                    "work-1", "Initial construction work completed.");
            require(partial.status().equals("ACTIVE") && partial.progressUnits() == 3,
                    "Settlement project work did not advance deterministically.");
            var complete = SettlementProjectTransaction.advance(connection, planned.projectId(), 15, 5,
                    "work-2", "Founding construction completed.");
            require(complete.status().equals("COMPLETE") && complete.progressUnits() == 8,
                    "Settlement project did not complete at its exact target progress.");
            reject(() -> SettlementProjectTransaction.cancel(connection, planned.projectId(), 16, "Too late."),
                    "Terminal settlement projects are immutable.");
            require(count(connection, "settlement_project_contribution") == 7,
                    "Settlement project contribution evidence count is incorrect.");
            require(count(connection, "settlement_project_transition") == 4,
                    "Settlement project transition evidence count is incorrect.");

            connection.setAutoCommit(false);
            long projectsBeforeRollback = count(connection, "settlement_project");
            try {
                var rollback = SettlementProjectTransaction.plan(connection,
                        new SettlementProjectTransaction.PlanRequest(
                                "world-1", SettlementProjectTransaction.ProjectKind.EXPANSION, "Coalition",
                                "station-a", "station-a", "location-a", "population-a", "vessel-a",
                                new SettlementProjectTransaction.Requirements(5, 5, 0, 0, 10, 2),
                                20, "Rollback expansion project."));
                SettlementProjectTransaction.prepare(connection, rollback.projectId(), 21);
                contribute(connection, rollback.projectId(), SettlementProjectTransaction.ContributionKind.MATERIALS,
                        5, 21, "rollback-materials");
                connection.rollback();
            } finally {
                connection.setAutoCommit(true);
            }
            require(count(connection, "settlement_project") == projectsBeforeRollback,
                    "Settlement project rollback retained project state.");
            require(foreignKeyViolations(connection) == 0,
                    "Settlement project transaction verification left foreign-key violations.");
        }
    }

    private static void contribute(Connection connection, String projectId,
                                   SettlementProjectTransaction.ContributionKind kind,
                                   int quantity, long tick, String evidence) throws SQLException {
        SettlementProjectTransaction.contribute(connection,
                new SettlementProjectTransaction.ContributionRequest(projectId, kind, quantity,
                        "station-a", kind == SettlementProjectTransaction.ContributionKind.POPULATION
                                ? "population-a" : null,
                        kind == SettlementProjectTransaction.ContributionKind.TRANSPORT ? "vessel-a" : null,
                        null, tick, evidence, "Verified " + kind + " contribution."));
    }

    private static void createPrerequisites(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("CREATE TABLE world_metadata(world_id TEXT PRIMARY KEY)");
            statement.execute("CREATE TABLE world_location(location_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,display_name TEXT NOT NULL,is_station INTEGER NOT NULL DEFAULT 0)");
            statement.execute("CREATE TABLE world_station(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,location_id TEXT NOT NULL,display_name TEXT NOT NULL)");
            statement.execute("CREATE TABLE npc_population_state(population_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,station_id TEXT NOT NULL)");
            statement.execute("CREATE TABLE npc_vessel(npc_vessel_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,display_name TEXT NOT NULL)");
            statement.execute("CREATE TABLE population_flow(flow_id TEXT PRIMARY KEY,world_id TEXT NOT NULL)");
            statement.execute("CREATE TABLE station_change_reason(reason_code TEXT PRIMARY KEY,display_name TEXT NOT NULL,reason_family TEXT NOT NULL)");
            statement.execute("INSERT INTO world_metadata VALUES('world-1')");
            statement.execute("INSERT INTO world_location VALUES('location-a','world-1','Alpha',1)");
            statement.execute("INSERT INTO world_location VALUES('location-b','world-1','Beta',0)");
            statement.execute("INSERT INTO world_station VALUES('station-a','world-1','location-a','Alpha Station')");
            statement.execute("INSERT INTO npc_population_state VALUES('population-a','world-1','station-a')");
            statement.execute("INSERT INTO npc_vessel VALUES('vessel-a','world-1','Builder One')");
        }
    }

    private static long count(Connection connection, String table) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COUNT(*) FROM " + table)) {
            return result.next() ? result.getLong(1) : 0;
        }
    }

    private static long foreignKeyViolations(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("PRAGMA foreign_key_check")) {
            long count = 0;
            while (result.next()) count++;
            return count;
        }
    }

    private static void reject(SqlWork work, String expected) throws Exception {
        try {
            work.run();
            throw new IllegalStateException("Expected settlement transaction rejection containing: " + expected);
        } catch (SQLException exception) {
            require(exception.getMessage() != null && exception.getMessage().contains(expected),
                    "Unexpected settlement transaction rejection: " + exception.getMessage());
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    @FunctionalInterface
    private interface SqlWork { void run() throws Exception; }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Settlement project transaction lifecycle and rollback contracts passed.");
    }
}
