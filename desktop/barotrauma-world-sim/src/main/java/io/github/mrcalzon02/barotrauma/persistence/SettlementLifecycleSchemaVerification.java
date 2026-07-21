package io.github.mrcalzon02.barotrauma.persistence;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

/** Focused schema-029 contract for durable and guarded settlement lifecycle projects. */
public final class SettlementLifecycleSchemaVerification {
    private SettlementLifecycleSchemaVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite::memory:")) {
            try (Statement statement = connection.createStatement()) {
                statement.execute("PRAGMA foreign_keys=ON");
                createPrerequisites(statement);
                for (String sql : SettlementLifecycleSchema.statements()) statement.execute(sql);

                require(objectExists(statement, "table", "settlement_project"),
                        "Schema 029 did not create settlement_project.");
                require(objectExists(statement, "table", "settlement_project_contribution"),
                        "Schema 029 did not create settlement_project_contribution.");
                require(objectExists(statement, "table", "settlement_project_transition"),
                        "Schema 029 did not create settlement_project_transition.");
                require(objectExists(statement, "view", "settlement_project_observation"),
                        "Schema 029 did not create settlement_project_observation.");

                seedAuthorities(statement);
                insertProject(statement, "project-supported", "location-a");
                statement.executeUpdate("UPDATE settlement_project SET status='PREPARING',"
                        + "committed_material_units=100,committed_supply_units=80,committed_population=20,"
                        + "committed_transport_units=1,current_security=70,preparation_started_tick=11,updated_tick=11 "
                        + "WHERE project_id='project-supported'");
                statement.executeUpdate("UPDATE settlement_project SET status='ACTIVE',activated_tick=12,updated_tick=12 "
                        + "WHERE project_id='project-supported'");
                statement.executeUpdate("UPDATE settlement_project SET progress_units=100,status='COMPLETE',"
                        + "completed_tick=20,updated_tick=20 WHERE project_id='project-supported'");
                require(queryLong(statement, "SELECT progress_percent FROM settlement_project_observation "
                        + "WHERE project_id='project-supported'") == 100,
                        "Settlement observation did not expose completed progress.");

                insertProject(statement, "project-unsupported", "location-b");
                statement.executeUpdate("UPDATE settlement_project SET status='PREPARING',updated_tick=11 "
                        + "WHERE project_id='project-unsupported'");
                expectFailure(statement,
                        "UPDATE settlement_project SET status='ACTIVE',updated_tick=12 "
                                + "WHERE project_id='project-unsupported'",
                        "Settlement project lacks conserved committed support.");
                expectFailure(statement,
                        "UPDATE settlement_project SET status='COMPLETE',progress_units=100,updated_tick=13 "
                                + "WHERE project_id='project-unsupported'",
                        "Invalid settlement project status transition.");
                expectFailure(statement,
                        "UPDATE settlement_project SET summary='mutated' WHERE project_id='project-supported'",
                        "Terminal settlement projects are immutable.");
                expectFailure(statement,
                        projectInsert("project-duplicate", "location-b"),
                        "UNIQUE constraint failed");
                require(queryLong(statement, "SELECT COUNT(*) FROM pragma_foreign_key_check") == 0,
                        "Schema 029 introduced foreign-key violations.");
            }
        }
    }

    private static void createPrerequisites(Statement statement) throws SQLException {
        statement.execute("CREATE TABLE world_metadata(world_id TEXT PRIMARY KEY)");
        statement.execute("CREATE TABLE world_location(location_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,display_name TEXT NOT NULL)");
        statement.execute("CREATE TABLE world_station(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,location_id TEXT NOT NULL,display_name TEXT NOT NULL)");
        statement.execute("CREATE TABLE npc_population_state(population_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,station_id TEXT NOT NULL)");
        statement.execute("CREATE TABLE npc_vessel(npc_vessel_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,display_name TEXT NOT NULL)");
        statement.execute("CREATE TABLE population_flow(flow_id TEXT PRIMARY KEY,world_id TEXT NOT NULL)");
        statement.execute("CREATE TABLE station_change_reason(reason_code TEXT PRIMARY KEY,display_name TEXT NOT NULL,reason_family TEXT NOT NULL)");
    }

    private static void seedAuthorities(Statement statement) throws SQLException {
        statement.executeUpdate("INSERT INTO world_metadata VALUES('world-a')");
        statement.executeUpdate("INSERT INTO world_location VALUES('location-a','world-a','Founding Site')");
        statement.executeUpdate("INSERT INTO world_location VALUES('location-b','world-a','Expansion Site')");
        statement.executeUpdate("INSERT INTO world_station VALUES('station-a','world-a','location-a','Origin Station')");
        statement.executeUpdate("INSERT INTO npc_population_state VALUES('population-a','world-a','station-a')");
        statement.executeUpdate("INSERT INTO npc_vessel VALUES('vessel-a','world-a','Construction Transport')");
        statement.executeUpdate("INSERT INTO population_flow VALUES('flow-a','world-a')");
    }

    private static void insertProject(Statement statement, String projectId, String locationId) throws SQLException {
        statement.executeUpdate(projectInsert(projectId, locationId));
    }

    private static String projectInsert(String projectId, String locationId) {
        return "INSERT INTO settlement_project(project_id,world_id,project_kind,status,sponsor_faction,"
                + "origin_station_id,target_location_id,related_population_id,assigned_npc_vessel_id,"
                + "required_material_units,required_supply_units,required_population,required_transport_units,"
                + "required_security,target_progress_units,created_tick,updated_tick,summary) VALUES('"
                + projectId + "','world-a','FOUNDING','PLANNED','Coalition','station-a','" + locationId
                + "','population-a','vessel-a',100,80,20,1,60,100,10,10,'Found a supported settlement')";
    }

    private static boolean objectExists(Statement statement, String type, String name) throws SQLException {
        try (ResultSet result = statement.executeQuery("SELECT COUNT(*) FROM sqlite_master WHERE type='"
                + type + "' AND name='" + name + "'")) {
            return result.next() && result.getLong(1) == 1;
        }
    }

    private static long queryLong(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new SQLException("No verification row returned.");
            return result.getLong(1);
        }
    }

    private static void expectFailure(Statement statement, String sql, String messageFragment) throws SQLException {
        try {
            statement.executeUpdate(sql);
            throw new IllegalStateException("Expected schema-029 rejection: " + messageFragment);
        } catch (SQLException expected) {
            require(expected.getMessage() != null && expected.getMessage().contains(messageFragment),
                    "Unexpected schema-029 rejection: " + expected.getMessage());
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Schema 029 settlement lifecycle foundation contract passed.");
    }
}
