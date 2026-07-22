package io.github.mrcalzon02.barotrauma.persistence;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

/** Focused physical-return, terminal-guard, outcome-validation, and rollback contract under schema 032. */
public final class SettlementContributionDispositionTransactionVerification {
    private SettlementContributionDispositionTransactionVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite::memory:")) {
            try (Statement statement = connection.createStatement()) {
                statement.execute("PRAGMA foreign_keys=ON");
                prerequisites(statement);
                for (String sql : SettlementLifecycleSchema.statements()) statement.execute(sql);
                for (String sql : SettlementContributionDispositionSchema.statements()) statement.execute(sql);
                for (String sql : SettlementPhysicalSupportHardeningSchema.statements()) statement.execute(sql);
            }
            reject(() -> SettlementContributionDispositionTransaction.terminate(connection,
                            new SettlementContributionDispositionTransaction.TerminationRequest(
                                    "missing-project",
                                    SettlementContributionDispositionTransaction.TerminalStatus.CANCELLED,
                                    1, "Reject auto-commit disposition.", List.of())),
                    "active transaction");
            connection.setAutoCommit(false);
            try {
                var cancelled = SettlementProjectTransaction.plan(connection,
                        new SettlementProjectTransaction.PlanRequest("world-1",
                                SettlementProjectTransaction.ProjectKind.EXPANSION, "Coalition",
                                "station-a", "station-a", "location-a", "population-a", "vessel-a",
                                new SettlementProjectTransaction.Requirements(10, 5, 0, 1, 40, 3),
                                10, "Cancellation disposition project."));
                SettlementProjectTransaction.prepare(connection, cancelled.projectId(), 11);
                SettlementProjectContributionAuthority.commitInventory(connection, cancelled.projectId(),
                        SettlementProjectTransaction.ContributionKind.MATERIALS,
                        "station-a", "item-steel", 10, 12, "cancel-steel");
                SettlementProjectContributionAuthority.commitInventory(connection, cancelled.projectId(),
                        SettlementProjectTransaction.ContributionKind.SUPPLIES,
                        "station-a", "item-rations", 5, 12, "cancel-rations");
                SettlementProjectContributionAuthority.commitTransport(connection, cancelled.projectId(),
                        "vessel-a", 12, "cancel-transport");
                SettlementProjectTransaction.contribute(connection,
                        new SettlementProjectTransaction.ContributionRequest(cancelled.projectId(),
                                SettlementProjectTransaction.ContributionKind.SECURITY, 40,
                                "station-a", null, null, null, 12,
                                "cancel-security", "Security assigned to cancellation project."));
                SettlementProjectTransaction.activate(connection, cancelled.projectId(), 13);
                SettlementProjectTransaction.advance(connection, cancelled.projectId(), 14, 1,
                        "cancel-work", "One work unit was consumed before cancellation.");
                require(inventory(connection, "item-steel") == 10
                                && inventory(connection, "item-rations") == 15,
                        "Physical cancellation commitments were not deducted before disposition.");
                reject(() -> SettlementProjectTransaction.transition(connection, cancelled.projectId(), 15,
                                "CANCELLED", "bypass-disposition-authority", "Bypass disposition authority."),
                        "undisposed physical commitments");

                List<SettlementContributionDispositionTransaction.DispositionPlan> cancellationPlans = new ArrayList<>();
                cancellationPlans.add(plan(connection, cancelled.projectId(), "MATERIALS",
                        SettlementContributionDispositionTransaction.Disposition.RETURNED));
                cancellationPlans.add(plan(connection, cancelled.projectId(), "SUPPLIES",
                        SettlementContributionDispositionTransaction.Disposition.RETURNED));
                cancellationPlans.add(plan(connection, cancelled.projectId(), "TRANSPORT",
                        SettlementContributionDispositionTransaction.Disposition.RETURNED));
                cancellationPlans.add(plan(connection, cancelled.projectId(), "SECURITY",
                        SettlementContributionDispositionTransaction.Disposition.RETURNED));
                cancellationPlans.add(plan(connection, cancelled.projectId(), "WORK",
                        SettlementContributionDispositionTransaction.Disposition.CONSUMED));
                var cancelledResult = SettlementContributionDispositionTransaction.terminate(connection,
                        new SettlementContributionDispositionTransaction.TerminationRequest(
                                cancelled.projectId(),
                                SettlementContributionDispositionTransaction.TerminalStatus.CANCELLED,
                                15, "Project cancelled after all support was classified.", cancellationPlans));
                require(cancelledResult.status().equals("CANCELLED"),
                        "Disposition authority did not terminalize the cancelled project.");
                require(inventory(connection, "item-steel") == 20
                                && inventory(connection, "item-rations") == 20,
                        "Returned cancellation inventory was not restored exactly once.");
                require(count(connection, "settlement_project_contribution_disposition",
                                "project_id='" + cancelled.projectId() + "'") == 5,
                        "Cancellation did not classify every contribution exactly once.");
                require(number(connection, "SELECT pending_count FROM settlement_project_disposition_completeness "
                                + "WHERE project_id='" + cancelled.projectId() + "'") == 0,
                        "Cancelled project retained pending contribution dispositions.");

                var failed = SettlementProjectTransaction.plan(connection,
                        new SettlementProjectTransaction.PlanRequest("world-1",
                                SettlementProjectTransaction.ProjectKind.RECLAMATION, "Coalition",
                                "station-a", "station-b", "location-b", "population-b", "vessel-a",
                                new SettlementProjectTransaction.Requirements(2, 0, 4, 1, 0, 3),
                                20, "Failure disposition project."));
                SettlementProjectTransaction.prepare(connection, failed.projectId(), 21);
                SettlementProjectContributionAuthority.commitInventory(connection, failed.projectId(),
                        SettlementProjectTransaction.ContributionKind.MATERIALS,
                        "station-a", "item-steel", 2, 22, "failure-steel");
                SettlementProjectContributionAuthority.commitArrivedPopulation(connection, failed.projectId(),
                        "flow-b", 4, 22, "failure-population");
                SettlementProjectContributionAuthority.commitTransport(connection, failed.projectId(),
                        "vessel-a", 22, "failure-transport");
                SettlementProjectTransaction.activate(connection, failed.projectId(), 23);
                SettlementProjectTransaction.advance(connection, failed.projectId(), 24, 1,
                        "failure-work", "One work unit was consumed before failure.");
                try (Statement statement = connection.createStatement()) {
                    statement.executeUpdate("UPDATE population_flow SET stranded_quantity=4 WHERE flow_id='flow-b'");
                    statement.executeUpdate("UPDATE npc_vessel SET status='LOST' WHERE npc_vessel_id='vessel-a'");
                    statement.execute("CREATE TRIGGER settlement_disposition_rollback_probe "
                            + "BEFORE UPDATE OF status ON settlement_project "
                            + "WHEN NEW.project_id='" + failed.projectId() + "' AND NEW.status='FAILED' BEGIN "
                            + "SELECT RAISE(ABORT,'Settlement disposition rollback probe'); END");
                }
                List<SettlementContributionDispositionTransaction.DispositionPlan> failurePlans = new ArrayList<>();
                failurePlans.add(plan(connection, failed.projectId(), "MATERIALS",
                        SettlementContributionDispositionTransaction.Disposition.RETURNED));
                failurePlans.add(plan(connection, failed.projectId(), "POPULATION",
                        SettlementContributionDispositionTransaction.Disposition.STRANDED));
                failurePlans.add(plan(connection, failed.projectId(), "TRANSPORT",
                        SettlementContributionDispositionTransaction.Disposition.LOST));
                failurePlans.add(plan(connection, failed.projectId(), "WORK",
                        SettlementContributionDispositionTransaction.Disposition.CONSUMED));
                int steelBeforeFailure = inventory(connection, "item-steel");
                reject(() -> SettlementContributionDispositionTransaction.terminate(connection,
                                new SettlementContributionDispositionTransaction.TerminationRequest(
                                        failed.projectId(),
                                        SettlementContributionDispositionTransaction.TerminalStatus.FAILED,
                                        25, "Forced rollback before failure terminalization.", failurePlans)),
                        "Settlement disposition rollback probe");
                require(inventory(connection, "item-steel") == steelBeforeFailure,
                        "Failed terminalization retained a returned inventory mutation.");
                require(count(connection, "settlement_project_contribution_disposition",
                                "project_id='" + failed.projectId() + "'") == 0,
                        "Failed terminalization retained disposition evidence.");
                require(text(connection, "SELECT status FROM settlement_project WHERE project_id='"
                                + failed.projectId() + "'").equals("ACTIVE"),
                        "Failed terminalization retained its lifecycle transition.");
                try (Statement statement = connection.createStatement()) {
                    statement.execute("DROP TRIGGER settlement_disposition_rollback_probe");
                }

                var failedResult = SettlementContributionDispositionTransaction.terminate(connection,
                        new SettlementContributionDispositionTransaction.TerminationRequest(
                                failed.projectId(),
                                SettlementContributionDispositionTransaction.TerminalStatus.FAILED,
                                25, "Project failed with all support physically classified.", failurePlans));
                require(failedResult.status().equals("FAILED"),
                        "Disposition authority did not terminalize the failed project.");
                require(inventory(connection, "item-steel") == 20,
                        "Returned failure materials were not restored exactly once.");
                require(count(connection, "settlement_project_contribution_disposition",
                                "project_id='" + failed.projectId() + "'") == 4,
                        "Failure did not classify every contribution exactly once.");
                require(count(connection, "settlement_project_contribution_disposition",
                                "project_id='" + failed.projectId() + "' AND disposition='STRANDED'") == 1,
                        "Stranded population disposition was not recorded.");
                require(count(connection, "settlement_project_contribution_disposition",
                                "project_id='" + failed.projectId() + "' AND disposition='LOST'") == 1,
                        "Lost transport disposition was not recorded.");
                require(count(connection, "settlement_project_contribution_disposition",
                                "project_id='" + failed.projectId() + "' AND disposition='CONSUMED'") == 1,
                        "Consumed work disposition was not recorded.");
                require(foreignKeys(connection) == 0,
                        "Settlement disposition transaction verification left foreign-key violations.");
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

    private static void prerequisites(Statement statement) throws SQLException {
        statement.execute("CREATE TABLE world_metadata(world_id TEXT PRIMARY KEY)");
        statement.execute("CREATE TABLE world_location(location_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,"
                + "display_name TEXT NOT NULL,is_station INTEGER NOT NULL DEFAULT 0)");
        statement.execute("CREATE TABLE world_station(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,"
                + "location_id TEXT NOT NULL,display_name TEXT NOT NULL)");
        statement.execute("CREATE TABLE npc_population_state(population_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,"
                + "station_id TEXT NOT NULL)");
        statement.execute("CREATE TABLE npc_vessel(npc_vessel_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,"
                + "display_name TEXT NOT NULL,home_station_id TEXT,current_location_id TEXT,status TEXT,mission_id TEXT)");
        statement.execute("CREATE TABLE population_flow(flow_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,"
                + "entity_type TEXT NOT NULL,status TEXT,destination_mode TEXT,destination_station_id TEXT,"
                + "arrived_quantity INTEGER NOT NULL DEFAULT 0,returned_quantity INTEGER NOT NULL DEFAULT 0,"
                + "stranded_quantity INTEGER NOT NULL DEFAULT 0,losses INTEGER NOT NULL DEFAULT 0,"
                + "settlement_project_id TEXT,destination_location_id TEXT)");
        statement.execute("CREATE TABLE station_change_reason(reason_code TEXT PRIMARY KEY,display_name TEXT NOT NULL,"
                + "reason_family TEXT NOT NULL)");
        statement.execute("CREATE TABLE station_inventory(station_id TEXT NOT NULL,item_id TEXT NOT NULL,"
                + "quantity INTEGER NOT NULL,reserved INTEGER NOT NULL,last_tick INTEGER NOT NULL,"
                + "PRIMARY KEY(station_id,item_id))");
        statement.execute("INSERT INTO world_metadata VALUES('world-1')");
        statement.execute("INSERT INTO world_location VALUES('location-a','world-1','Alpha',1)");
        statement.execute("INSERT INTO world_location VALUES('location-b','world-1','Beta',1)");
        statement.execute("INSERT INTO world_station VALUES('station-a','world-1','location-a','Alpha Station')");
        statement.execute("INSERT INTO world_station VALUES('station-b','world-1','location-b','Beta Station')");
        statement.execute("INSERT INTO npc_population_state VALUES('population-a','world-1','station-a')");
        statement.execute("INSERT INTO npc_population_state VALUES('population-b','world-1','station-b')");
        statement.execute("INSERT INTO npc_vessel VALUES('vessel-a','world-1','Builder','station-a','location-a',"
                + "'DOCKED',NULL)");
        statement.execute("INSERT INTO population_flow VALUES('flow-b','world-1','NPC_POPULATION','ARRIVED',"
                + "'STATION_POPULATION','station-b',4,0,0,0,NULL,'location-b')");
        statement.execute("INSERT INTO station_inventory VALUES('station-a','item-steel',20,0,0)");
        statement.execute("INSERT INTO station_inventory VALUES('station-a','item-rations',20,0,0)");
    }

    private static SettlementContributionDispositionTransaction.DispositionPlan plan(
            Connection connection, String projectId, String kind,
            SettlementContributionDispositionTransaction.Disposition disposition) throws SQLException {
        try (var statement = connection.prepareStatement(
                "SELECT contribution_id FROM settlement_project_contribution "
                        + "WHERE project_id=? AND contribution_kind=?")) {
            statement.setString(1, projectId);
            statement.setString(2, kind);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Missing contribution kind " + kind + ".");
                return new SettlementContributionDispositionTransaction.DispositionPlan(
                        result.getString(1), disposition);
            }
        }
    }

    private static int inventory(Connection connection, String itemId) throws SQLException {
        try (var statement = connection.prepareStatement(
                "SELECT quantity FROM station_inventory WHERE station_id='station-a' AND item_id=?")) {
            statement.setString(1, itemId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Missing inventory row: " + itemId);
                return result.getInt(1);
            }
        }
    }

    private static long count(Connection connection, String table, String where) throws SQLException {
        return number(connection, "SELECT COUNT(*) FROM " + table + " WHERE " + where);
    }

    private static long number(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new SQLException("Expected disposition scalar row.");
            return result.getLong(1);
        }
    }

    private static String text(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new SQLException("Expected disposition text row.");
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

    private static void reject(SqlWork work, String expected) throws Exception {
        try {
            work.run();
            throw new IllegalStateException("Expected settlement disposition rejection containing: " + expected);
        } catch (SQLException exception) {
            require(exception.getMessage() != null && exception.getMessage().contains(expected),
                    "Unexpected settlement disposition rejection: " + exception.getMessage());
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    @FunctionalInterface
    private interface SqlWork { void run() throws Exception; }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Schema-032 physical settlement contribution disposition and rollback contracts passed.");
    }
}
