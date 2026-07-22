package io.github.mrcalzon02.barotrauma.persistence;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;

/** Focused contract for the authoritative schema-032-hardened settlement project transaction. */
public final class SettlementProjectTransactionVerification {
    private SettlementProjectTransactionVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite::memory:")) {
            connection.createStatement().execute("PRAGMA foreign_keys=ON");
            createPrerequisites(connection);
            try (Statement statement = connection.createStatement()) {
                for (String sql : SettlementLifecycleSchema.statements()) statement.execute(sql);
                for (String sql : SettlementPhysicalSupportHardeningSchema.statements()) statement.execute(sql);
            }

            for (SettlementProjectTransaction.ContributionKind kind : List.of(
                    SettlementProjectTransaction.ContributionKind.MATERIALS,
                    SettlementProjectTransaction.ContributionKind.SUPPLIES,
                    SettlementProjectTransaction.ContributionKind.POPULATION,
                    SettlementProjectTransaction.ContributionKind.TRANSPORT,
                    SettlementProjectTransaction.ContributionKind.WORK)) {
                reject(() -> SettlementProjectTransaction.requirePublicContributionKind(kind),
                        "canonical authorities");
            }
            SettlementProjectTransaction.requirePublicContributionKind(
                    SettlementProjectTransaction.ContributionKind.SECURITY);

            var planned = SettlementProjectTransaction.plan(connection,
                    new SettlementProjectTransaction.PlanRequest(
                            "world-1", SettlementProjectTransaction.ProjectKind.FOUNDING, "Coalition",
                            "station-a", null, "location-b", "population-a", "vessel-a",
                            new SettlementProjectTransaction.Requirements(40, 30, 20, 1, 60, 8),
                            10, "Found a supported frontier settlement."));
            require(planned.status().equals("PLANNED"), "Settlement plan did not begin in PLANNED state.");
            insertFoundingFlow(connection, planned.projectId());

            SettlementProjectTransaction.prepare(connection, planned.projectId(), 11);
            reject(() -> SettlementProjectTransaction.activate(connection, planned.projectId(), 12),
                    "Settlement project lacks conserved committed support.");
            reject(() -> contribute(connection, planned.projectId(),
                    SettlementProjectTransaction.ContributionKind.WORK, 1, 12, "early-work"),
                    "only while the project is active");

            contribute(connection, planned.projectId(), SettlementProjectTransaction.ContributionKind.MATERIALS,
                    40, 12, "materials-1");
            reject(() -> contribute(connection, planned.projectId(),
                    SettlementProjectTransaction.ContributionKind.MATERIALS, 1, 12, "materials-over"),
                    "exceeds the remaining project requirement");
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
            var complete = SettlementProjectTransaction.advance(connection, planned.projectId(), 15, 20,
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
            } catch (SQLException | RuntimeException exception) {
                try { connection.rollback(); }
                catch (SQLException rollbackFailure) { exception.addSuppressed(rollbackFailure); }
                throw exception;
            } finally {
                connection.setAutoCommit(true);
            }
            require(count(connection, "settlement_project") == projectsBeforeRollback,
                    "Settlement project rollback retained project state.");
            require(foreignKeyViolations(connection) == 0,
                    "Settlement project transaction verification left foreign-key violations.");
        }
    }

    private static void insertFoundingFlow(Connection connection, String projectId) throws SQLException {
        try (var statement = connection.prepareStatement(
                "INSERT INTO population_flow(flow_id,world_id,entity_type,status,arrived_quantity,destination_mode,"
                        + "settlement_project_id,destination_location_id,destination_station_id) "
                        + "VALUES('flow-project','world-1','NPC_POPULATION','ARRIVED',20,'FOUNDING_SITE',?,"
                        + "'location-b',NULL)")) {
            statement.setString(1, projectId);
            statement.executeUpdate();
        }
    }

    private static void contribute(Connection connection, String projectId,
                                   SettlementProjectTransaction.ContributionKind kind,
                                   int quantity, long tick, String evidence) throws SQLException {
        String sourceStation = kind == SettlementProjectTransaction.ContributionKind.WORK ? null : "station-a";
        String sourcePopulation = kind == SettlementProjectTransaction.ContributionKind.POPULATION
                ? "population-a" : null;
        String sourceVessel = kind == SettlementProjectTransaction.ContributionKind.TRANSPORT
                ? "vessel-a" : null;
        String relatedFlow = kind == SettlementProjectTransaction.ContributionKind.POPULATION
                ? "flow-project" : null;
        SettlementProjectTransaction.contribute(connection,
                new SettlementProjectTransaction.ContributionRequest(projectId, kind, quantity,
                        sourceStation, sourcePopulation, sourceVessel, relatedFlow,
                        tick, evidence, "Verified " + kind + " contribution."));
    }

    private static void createPrerequisites(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("CREATE TABLE world_metadata(world_id TEXT PRIMARY KEY)");
            statement.execute("CREATE TABLE world_location(location_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,display_name TEXT NOT NULL,is_station INTEGER NOT NULL DEFAULT 0)");
            statement.execute("CREATE TABLE world_station(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,location_id TEXT NOT NULL,display_name TEXT NOT NULL)");
            statement.execute("CREATE TABLE npc_population_state(population_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,station_id TEXT NOT NULL)");
            statement.execute("CREATE TABLE npc_vessel(npc_vessel_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,display_name TEXT NOT NULL)");
            statement.execute("CREATE TABLE population_flow(flow_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,"
                    + "entity_type TEXT NOT NULL,status TEXT NOT NULL,arrived_quantity INTEGER NOT NULL,"
                    + "destination_mode TEXT NOT NULL,settlement_project_id TEXT,destination_location_id TEXT,"
                    + "destination_station_id TEXT)");
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
        System.out.println("Schema-032-hardened settlement project lifecycle and rollback contracts passed.");
    }
}
