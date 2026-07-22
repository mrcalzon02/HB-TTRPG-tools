package io.github.mrcalzon02.barotrauma.persistence;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

/** Focused schema-032 contract for physical support ownership, source shape, and resource reuse. */
public final class SettlementPhysicalSupportHardeningSchemaVerification {
    private SettlementPhysicalSupportHardeningSchemaVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite::memory:")) {
            try (Statement statement = connection.createStatement()) {
                statement.execute("PRAGMA foreign_keys=ON");
                prerequisites(statement);
                for (String sql : SettlementPhysicalSupportHardeningSchema.statements()) statement.execute(sql);

                require(object(connection, "index", "settlement_contribution_vessel_source_index"),
                        "Schema 032 vessel-source index is missing.");
                require(object(connection, "index", "settlement_contribution_flow_source_index"),
                        "Schema 032 flow-source index is missing.");
                require(object(connection, "trigger", "settlement_contribution_source_shape_guard"),
                        "Schema 032 source-shape guard is missing.");
                require(object(connection, "trigger", "settlement_contribution_project_authority_guard"),
                        "Schema 032 project-authority guard is missing.");
                require(object(connection, "trigger", "settlement_contribution_population_flow_single_use"),
                        "Schema 032 single-use population-flow guard is missing.");
                require(object(connection, "trigger", "settlement_contribution_active_vessel_guard"),
                        "Schema 032 active-vessel contribution guard is missing.");

                statement.execute("INSERT INTO settlement_project VALUES(" 
                        + "'project-a','world-1','EXPANSION','PREPARING','station-origin','station-target',"
                        + "'location-target','population-origin','vessel-a')");
                reject(() -> statement.execute("INSERT INTO settlement_project VALUES(" 
                                + "'project-duplicate-vessel','world-1','RECLAMATION','PLANNED','station-origin',"
                                + "'station-target','location-target','population-origin','vessel-a')"),
                        "already supports a nonterminal settlement project");
                statement.execute("INSERT INTO settlement_project VALUES(" 
                        + "'project-b','world-1','RECLAMATION','PREPARING','station-origin','station-target',"
                        + "'location-target','population-origin','vessel-b')");

                statement.execute("INSERT INTO settlement_project_contribution VALUES(" 
                        + "'materials-a','project-a','world-1','MATERIALS',5,'station-origin',NULL,NULL,NULL,1,"
                        + "'materials-a','Valid materials')");
                statement.execute("INSERT INTO settlement_project_contribution VALUES(" 
                        + "'security-a','project-a','world-1','SECURITY',40,'station-target',NULL,NULL,NULL,1,"
                        + "'security-a','Valid security')");
                reject(() -> statement.execute("INSERT INTO settlement_project_contribution VALUES(" 
                                + "'bad-shape','project-a','world-1','MATERIALS',1,NULL,NULL,NULL,NULL,1,"
                                + "'bad-shape','Missing source')"),
                        "Settlement contribution");
                reject(() -> statement.execute("INSERT INTO settlement_project_contribution VALUES(" 
                                + "'wrong-origin','project-a','world-1','SUPPLIES',1,'station-target',NULL,NULL,NULL,1,"
                                + "'wrong-origin','Wrong source station')"),
                        "not authorized by its project and physical source");

                statement.execute("INSERT INTO settlement_project_contribution VALUES(" 
                        + "'transport-a','project-a','world-1','TRANSPORT',1,'station-origin',NULL,'vessel-a',NULL,1,"
                        + "'transport-a','Valid transport')");
                statement.execute("UPDATE settlement_project SET status='COMPLETE' WHERE project_id='project-a'");
                statement.execute("INSERT INTO settlement_project VALUES(" 
                        + "'project-reuse','world-1','EXPANSION','PREPARING','station-origin','station-target',"
                        + "'location-target','population-origin','vessel-a')");
                statement.execute("INSERT INTO settlement_project_contribution VALUES(" 
                        + "'transport-reuse','project-reuse','world-1','TRANSPORT',1,'station-origin',NULL,'vessel-a',"
                        + "NULL,2,'transport-reuse','Terminal vessel reuse')");

                statement.execute("INSERT INTO settlement_project VALUES(" 
                        + "'project-population-a','world-1','EXPANSION','PREPARING','station-origin','station-target',"
                        + "'location-target','population-origin',NULL)");
                statement.execute("INSERT INTO settlement_project VALUES(" 
                        + "'project-population-b','world-1','EXPANSION','PREPARING','station-origin','station-target',"
                        + "'location-target','population-origin',NULL)");
                statement.execute("INSERT INTO settlement_project_contribution VALUES(" 
                        + "'population-a','project-population-a','world-1','POPULATION',5,'station-origin',"
                        + "'population-origin',NULL,'flow-arrived',3,'population-a','Valid arrived population')");
                reject(() -> statement.execute("INSERT INTO settlement_project_contribution VALUES(" 
                                + "'population-reuse','project-population-b','world-1','POPULATION',5,'station-origin',"
                                + "'population-origin',NULL,'flow-arrived',4,'population-reuse','Reused flow')"),
                        "Population flow already supports another settlement project");
                reject(() -> statement.execute("INSERT INTO settlement_project_contribution VALUES(" 
                                + "'population-wrong-target','project-population-b','world-1','POPULATION',5,"
                                + "'station-origin','population-origin',NULL,'flow-wrong-target',4,"
                                + "'population-wrong-target','Wrong destination')"),
                        "not authorized by its project and physical source");

                statement.execute("INSERT INTO settlement_project VALUES(" 
                        + "'project-founding','world-1','FOUNDING','PREPARING','station-origin',NULL,"
                        + "'location-frontier','population-origin',NULL)");
                statement.execute("INSERT INTO settlement_project_contribution VALUES(" 
                        + "'population-founding','project-founding','world-1','POPULATION',4,'station-origin',"
                        + "'population-origin',NULL,'flow-founding',5,'population-founding','Valid founders')");
                require(foreignKeys(connection) == 0,
                        "Schema 032 verification left foreign-key violations.");
            }
        }
    }

    private static void prerequisites(Statement statement) throws SQLException {
        statement.execute("CREATE TABLE world_metadata(world_id TEXT PRIMARY KEY)");
        statement.execute("CREATE TABLE world_location(location_id TEXT PRIMARY KEY,world_id TEXT NOT NULL)");
        statement.execute("CREATE TABLE world_station(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,"
                + "location_id TEXT NOT NULL)");
        statement.execute("CREATE TABLE npc_population_state(population_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,"
                + "station_id TEXT NOT NULL)");
        statement.execute("CREATE TABLE npc_vessel(npc_vessel_id TEXT PRIMARY KEY,world_id TEXT NOT NULL)");
        statement.execute("CREATE TABLE population_flow(flow_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,"
                + "entity_type TEXT NOT NULL,status TEXT NOT NULL,arrived_quantity INTEGER NOT NULL,"
                + "destination_mode TEXT NOT NULL,settlement_project_id TEXT,destination_location_id TEXT,"
                + "destination_station_id TEXT)");
        statement.execute("CREATE TABLE settlement_project(project_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,"
                + "project_kind TEXT NOT NULL,status TEXT NOT NULL,origin_station_id TEXT,target_station_id TEXT,"
                + "target_location_id TEXT NOT NULL,related_population_id TEXT,assigned_npc_vessel_id TEXT)");
        statement.execute("CREATE TABLE settlement_project_contribution(contribution_id TEXT PRIMARY KEY,"
                + "project_id TEXT NOT NULL,world_id TEXT NOT NULL,contribution_kind TEXT NOT NULL,quantity INTEGER NOT NULL,"
                + "source_station_id TEXT,source_population_id TEXT,source_npc_vessel_id TEXT,related_flow_id TEXT,"
                + "tick_sequence INTEGER NOT NULL,evidence_key TEXT NOT NULL,summary TEXT NOT NULL)");

        statement.execute("INSERT INTO world_metadata VALUES('world-1')");
        statement.execute("INSERT INTO world_location VALUES('location-origin','world-1')");
        statement.execute("INSERT INTO world_location VALUES('location-target','world-1')");
        statement.execute("INSERT INTO world_location VALUES('location-frontier','world-1')");
        statement.execute("INSERT INTO world_station VALUES('station-origin','world-1','location-origin')");
        statement.execute("INSERT INTO world_station VALUES('station-target','world-1','location-target')");
        statement.execute("INSERT INTO npc_population_state VALUES(" 
                + "'population-origin','world-1','station-origin')");
        statement.execute("INSERT INTO npc_vessel VALUES('vessel-a','world-1')");
        statement.execute("INSERT INTO npc_vessel VALUES('vessel-b','world-1')");
        statement.execute("INSERT INTO population_flow VALUES(" 
                + "'flow-arrived','world-1','NPC_POPULATION','ARRIVED',5,'STATION_POPULATION',NULL,"
                + "'location-target','station-target')");
        statement.execute("INSERT INTO population_flow VALUES(" 
                + "'flow-wrong-target','world-1','NPC_POPULATION','ARRIVED',5,'STATION_POPULATION',NULL,"
                + "'location-frontier','station-origin')");
        statement.execute("INSERT INTO population_flow VALUES(" 
                + "'flow-founding','world-1','NPC_POPULATION','ARRIVED',4,'FOUNDING_SITE','project-founding',"
                + "'location-frontier',NULL)");
    }

    private static boolean object(Connection connection, String type, String name) throws SQLException {
        try (var statement = connection.prepareStatement(
                "SELECT 1 FROM sqlite_master WHERE type=? AND name=?")) {
            statement.setString(1, type);
            statement.setString(2, name);
            try (ResultSet result = statement.executeQuery()) { return result.next(); }
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
            throw new IllegalStateException("Expected schema-032 rejection containing: " + expected);
        } catch (SQLException exception) {
            require(exception.getMessage() != null && exception.getMessage().contains(expected),
                    "Unexpected schema-032 rejection: " + exception.getMessage());
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    @FunctionalInterface
    private interface SqlWork { void run() throws Exception; }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Schema-032 physical support ownership and reuse contracts passed.");
    }
}
