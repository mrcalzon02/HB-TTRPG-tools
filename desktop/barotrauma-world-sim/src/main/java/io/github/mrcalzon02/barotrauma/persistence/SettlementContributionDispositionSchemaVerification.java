package io.github.mrcalzon02.barotrauma.persistence;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

/** Focused schema-031 completeness, consistency, and immutability contract. */
public final class SettlementContributionDispositionSchemaVerification {
    private SettlementContributionDispositionSchemaVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite::memory:")) {
            try (Statement statement = connection.createStatement()) {
                statement.execute("PRAGMA foreign_keys=ON");
                prerequisites(statement);
                for (String sql : SettlementContributionDispositionSchema.statements()) statement.execute(sql);

                require(object(connection, "table", "settlement_project_contribution_disposition"),
                        "Schema 031 disposition table is missing.");
                require(object(connection, "view", "settlement_contribution_disposition_observation"),
                        "Schema 031 disposition observation view is missing.");
                require(object(connection, "view", "settlement_project_disposition_completeness"),
                        "Schema 031 completeness view is missing.");
                require(number(connection, "SELECT pending_count FROM settlement_project_disposition_completeness "
                                + "WHERE project_id='project-a'") == 2,
                        "Schema 031 did not expose both pending commitments.");

                reject(() -> statement.executeUpdate(
                                "UPDATE settlement_project SET status='CANCELLED' WHERE project_id='project-a'"),
                        "undisposed physical commitments");
                reject(() -> statement.execute("INSERT INTO settlement_project_contribution_disposition VALUES("
                                + "'bad','contribution-a','project-a','world-1','MATERIALS','RETURNED',9,5,"
                                + "'bad-evidence','Bad quantity')"),
                        "does not match an active commitment");

                statement.execute("INSERT INTO settlement_project_contribution_disposition VALUES("
                        + "'disposition-a','contribution-a','project-a','world-1','MATERIALS','RETURNED',10,5,"
                        + "'material-return','Materials returned')");
                statement.execute("INSERT INTO settlement_project_contribution_disposition VALUES("
                        + "'disposition-b','contribution-b','project-a','world-1','WORK','CONSUMED',2,5,"
                        + "'work-consumed','Work consumed')");
                require(number(connection, "SELECT pending_count FROM settlement_project_disposition_completeness "
                                + "WHERE project_id='project-a'") == 0,
                        "Schema 031 completeness view retained disposed commitments.");
                statement.executeUpdate("UPDATE settlement_project SET status='CANCELLED' WHERE project_id='project-a'");
                require(text(connection, "SELECT status FROM settlement_project WHERE project_id='project-a'")
                                .equals("CANCELLED"),
                        "Fully disposed project did not enter its terminal state.");
                reject(() -> statement.executeUpdate("UPDATE settlement_project_contribution_disposition "
                                + "SET summary='Changed' WHERE disposition_id='disposition-a'"),
                        "dispositions are immutable");
                reject(() -> statement.executeUpdate("DELETE FROM settlement_project_contribution_disposition "
                                + "WHERE disposition_id='disposition-a'"),
                        "dispositions are immutable");
                require(foreignKeys(connection) == 0,
                        "Schema 031 verification left foreign-key violations.");
            }
        }
    }

    private static void prerequisites(Statement statement) throws SQLException {
        statement.execute("CREATE TABLE world_metadata(world_id TEXT PRIMARY KEY)");
        statement.execute("CREATE TABLE world_station(station_id TEXT PRIMARY KEY,display_name TEXT NOT NULL)");
        statement.execute("CREATE TABLE npc_vessel(npc_vessel_id TEXT PRIMARY KEY,display_name TEXT NOT NULL)");
        statement.execute("CREATE TABLE settlement_project(project_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,"
                + "project_kind TEXT NOT NULL,status TEXT NOT NULL)");
        statement.execute("CREATE TABLE settlement_project_contribution(contribution_id TEXT PRIMARY KEY,"
                + "project_id TEXT NOT NULL,world_id TEXT NOT NULL,contribution_kind TEXT NOT NULL,quantity INTEGER NOT NULL,"
                + "source_station_id TEXT,source_population_id TEXT,source_npc_vessel_id TEXT,related_flow_id TEXT,"
                + "tick_sequence INTEGER NOT NULL,evidence_key TEXT NOT NULL,summary TEXT NOT NULL)");
        statement.execute("INSERT INTO world_metadata VALUES('world-1')");
        statement.execute("INSERT INTO world_station VALUES('station-a','Alpha')");
        statement.execute("INSERT INTO npc_vessel VALUES('vessel-a','Builder')");
        statement.execute("INSERT INTO settlement_project VALUES('project-a','world-1','EXPANSION','ACTIVE')");
        statement.execute("INSERT INTO settlement_project_contribution VALUES('contribution-a','project-a','world-1',"
                + "'MATERIALS',10,'station-a',NULL,NULL,NULL,2,'materials','Materials committed')");
        statement.execute("INSERT INTO settlement_project_contribution VALUES('contribution-b','project-a','world-1',"
                + "'WORK',2,NULL,NULL,NULL,NULL,3,'work','Work committed')");
    }

    private static boolean object(Connection connection, String type, String name) throws SQLException {
        try (var statement = connection.prepareStatement(
                "SELECT 1 FROM sqlite_master WHERE type=? AND name=?")) {
            statement.setString(1, type);
            statement.setString(2, name);
            try (ResultSet result = statement.executeQuery()) { return result.next(); }
        }
    }

    private static long number(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new SQLException("Expected schema-031 scalar row.");
            return result.getLong(1);
        }
    }

    private static String text(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new SQLException("Expected schema-031 text row.");
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
            throw new IllegalStateException("Expected schema-031 rejection containing: " + expected);
        } catch (SQLException exception) {
            require(exception.getMessage() != null && exception.getMessage().contains(expected),
                    "Unexpected schema-031 rejection: " + exception.getMessage());
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    @FunctionalInterface
    private interface SqlWork { void run() throws Exception; }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Schema-031 disposition completeness and immutability contracts passed.");
    }
}
