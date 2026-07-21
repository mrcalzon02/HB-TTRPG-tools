package io.github.mrcalzon02.barotrauma.persistence;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

/** Focused schema-030 destination-mode, handoff, and conservation contract. */
public final class SettlementFoundingMigrationSchemaVerification {
    private SettlementFoundingMigrationSchemaVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite::memory:")) {
            try (Statement statement = connection.createStatement()) {
                statement.execute("PRAGMA foreign_keys=ON");
                prerequisites(statement);
                for (String sql : SettlementFoundingMigrationSchema.statements()) statement.execute(sql);

                require(column(connection, "population_flow", "destination_mode"),
                        "Schema 030 did not add destination_mode.");
                require(column(connection, "population_flow", "settlement_project_id"),
                        "Schema 030 did not add settlement_project_id.");
                require(object(connection, "table", "settlement_founding_handoff"),
                        "Schema 030 founding handoff table is missing.");
                require(object(connection, "view", "settlement_founding_migration_observation"),
                        "Schema 030 founding observation view is missing.");

                statement.execute("INSERT INTO world_station(station_id,world_id,location_id,display_name) "
                        + "VALUES('station-zero','world-1','location-c','Zero Seed')");
                statement.execute("INSERT INTO station_civilization_state VALUES('station-zero','world-1',0,0,20,2,"
                        + "0,0,0,0,'ABANDONED',3)");
                statement.execute("INSERT INTO station_simulation_state VALUES('station-zero','world-1',5000,20,0,20,"
                        + "40,60,20,0,'FALLEN',3)");
                require(countWhere(connection, "npc_population_state", "station_id='station-zero'") == 1,
                        "Founding zero-seed bridge did not create one detailed population authority.");
                require(longValue(connection, "SELECT civilians+industrial_workers+logistics_workers+security_personnel+"
                                + "medical_personnel+scientific_personnel+temporary_residents+refugees "
                                + "FROM npc_population_state WHERE station_id='station-zero'") == 0,
                        "Founding zero-seed bridge created residents before migration handoff.");

                statement.execute("INSERT INTO population_flow(flow_id,world_id,entity_type,population_id,"
                        + "destination_population_id,origin_location_id,destination_location_id,quantity,cause,status,"
                        + "losses,created_tick,updated_tick,summary,flow_kind,origin_station_id,destination_station_id,"
                        + "assigned_npc_vessel_id,embarked_quantity,arrived_quantity,returned_quantity,origin_released) "
                        + "VALUES('ordinary','world-1','NPC_POPULATION','origin-pop','origin-pop','location-a',"
                        + "'location-a',1,'MIGRATION','ARRIVED',0,1,1,'ordinary','ORDINARY_MIGRATION','station-a',"
                        + "'station-a','vessel-a',1,1,0,1)");
                require(text(connection, "SELECT destination_mode FROM population_flow WHERE flow_id='ordinary'")
                                .equals("STATION_POPULATION"),
                        "Existing migration insert did not retain station-population mode by default.");

                statement.execute("INSERT INTO population_flow(flow_id,world_id,entity_type,population_id,"
                        + "origin_location_id,destination_location_id,quantity,cause,status,losses,created_tick,updated_tick,"
                        + "summary,flow_kind,origin_station_id,assigned_npc_vessel_id,embarked_quantity,arrived_quantity,"
                        + "returned_quantity,origin_released,destination_mode,settlement_project_id) "
                        + "VALUES('founding-flow','world-1','NPC_POPULATION','origin-pop','location-a','location-b',20,"
                        + "'MIGRATION','ARRIVED',0,2,4,'founding','ORDINARY_MIGRATION','station-a','vessel-a',20,20,0,1,"
                        + "'FOUNDING_SITE','project-1')");
                require(accounted(connection) == 120,
                        "Staged founders were not conserved before station handoff.");
                require(flowPopulation(connection) == 20,
                        "Staged founders were not retained in the flow conservation term.");

                reject(() -> statement.execute("INSERT INTO population_flow(flow_id,world_id,entity_type,population_id,"
                                + "destination_population_id,origin_location_id,destination_location_id,quantity,cause,status,"
                                + "losses,created_tick,updated_tick,summary,flow_kind,origin_station_id,destination_station_id,"
                                + "assigned_npc_vessel_id,destination_mode,settlement_project_id) VALUES('bad-flow','world-1',"
                                + "'NPC_POPULATION','origin-pop','origin-pop','location-a','location-b',1,'MIGRATION','PLANNED',"
                                + "0,2,2,'bad','ORDINARY_MIGRATION','station-a','station-a','vessel-a','FOUNDING_SITE','project-1')"),
                        "Population flow destination mode is inconsistent.");

                statement.execute("UPDATE world_location SET is_station=1 WHERE location_id='location-b'");
                statement.execute("INSERT INTO world_station(station_id,world_id,location_id,display_name) "
                        + "VALUES('station-b','world-1','location-b','Beta Station')");
                statement.execute("INSERT INTO npc_population_state(population_id,world_id,station_id,civilians,"
                        + "industrial_workers,logistics_workers,security_personnel,medical_personnel,scientific_personnel,"
                        + "temporary_residents,refugees,housing_capacity,life_support_capacity,employment_capacity,morale,"
                        + "seed_source,last_tick) VALUES('founded-pop','world-1','station-b',8,3,2,2,1,1,2,1,40,40,40,65,"
                        + "'founding-test',5)");
                statement.execute("INSERT INTO settlement_founding_handoff(project_id,flow_id,world_id,station_id,"
                        + "population_id,settled_quantity,handoff_tick,evidence_key,summary) VALUES('project-1',"
                        + "'founding-flow','world-1','station-b','founded-pop',20,5,'founding-handoff','Founders settled.')");
                for (String cohort : new String[]{"CIVILIANS","INDUSTRIAL_WORKERS","LOGISTICS_WORKERS",
                        "SECURITY_PERSONNEL","MEDICAL_PERSONNEL","SCIENTIFIC_PERSONNEL",
                        "TEMPORARY_RESIDENTS","REFUGEES"}) {
                    statement.execute("INSERT INTO settlement_founding_handoff_cohort(project_id,cohort_key,quantity) "
                            + "SELECT 'project-1','" + cohort + "',arrived_quantity FROM npc_population_flow_cohort "
                            + "WHERE flow_id='founding-flow' AND cohort_key='" + cohort + "'");
                }
                require(accounted(connection) == 120,
                        "Founding handoff changed the conserved world population.");
                require(flowPopulation(connection) == 0,
                        "Settled founders remained double-counted in the flow conservation term.");
                require(count(connection, "settlement_founding_handoff") == 1,
                        "Founding handoff was not recorded exactly once.");
                require(foreignKeys(connection) == 0,
                        "Schema 030 verification left foreign-key violations.");
            }
        }
    }

    private static void prerequisites(Statement statement) throws SQLException {
        statement.execute("CREATE TABLE world_metadata(world_id TEXT PRIMARY KEY)");
        statement.execute("CREATE TABLE world_location(location_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,"
                + "source_ordinal INTEGER NOT NULL,display_name TEXT NOT NULL,is_station INTEGER NOT NULL DEFAULT 0)");
        statement.execute("CREATE TABLE world_station(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,"
                + "location_id TEXT NOT NULL UNIQUE,display_name TEXT NOT NULL)");
        statement.execute("CREATE TABLE station_civilization_state(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,"
                + "population_index INTEGER NOT NULL,civilization_strength INTEGER NOT NULL,fauna_pressure INTEGER NOT NULL,"
                + "supply_consumption_base INTEGER NOT NULL,last_consumption INTEGER NOT NULL,shortage_ticks INTEGER NOT NULL,"
                + "surplus_ticks INTEGER NOT NULL,frontier_position INTEGER NOT NULL,frontier_state TEXT NOT NULL,"
                + "last_tick INTEGER NOT NULL)");
        statement.execute("CREATE TABLE station_simulation_state(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,"
                + "credits INTEGER NOT NULL,supplies INTEGER NOT NULL,ore INTEGER NOT NULL,industry INTEGER NOT NULL,"
                + "security INTEGER NOT NULL,integrity INTEGER NOT NULL,threat INTEGER NOT NULL,research INTEGER NOT NULL,"
                + "status TEXT NOT NULL,last_tick INTEGER NOT NULL)");
        statement.execute("CREATE TABLE npc_population_state(population_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,"
                + "station_id TEXT NOT NULL UNIQUE,civilians INTEGER NOT NULL,industrial_workers INTEGER NOT NULL,"
                + "logistics_workers INTEGER NOT NULL,security_personnel INTEGER NOT NULL,medical_personnel INTEGER NOT NULL,"
                + "scientific_personnel INTEGER NOT NULL,temporary_residents INTEGER NOT NULL,refugees INTEGER NOT NULL,"
                + "housing_capacity INTEGER NOT NULL,life_support_capacity INTEGER NOT NULL,employment_capacity INTEGER NOT NULL,"
                + "morale INTEGER NOT NULL,seed_source TEXT NOT NULL,last_tick INTEGER NOT NULL)");
        statement.execute("CREATE TABLE settlement_project(project_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,"
                + "project_kind TEXT NOT NULL,status TEXT NOT NULL,target_location_id TEXT NOT NULL)");
        statement.execute("CREATE TABLE population_flow(flow_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,entity_type TEXT NOT NULL,"
                + "population_id TEXT NOT NULL,destination_population_id TEXT,origin_location_id TEXT NOT NULL,"
                + "destination_location_id TEXT,quantity INTEGER NOT NULL,cause TEXT NOT NULL,status TEXT NOT NULL,"
                + "departure_tick INTEGER,arrival_tick INTEGER,losses INTEGER NOT NULL DEFAULT 0,created_tick INTEGER NOT NULL,"
                + "updated_tick INTEGER NOT NULL,summary TEXT NOT NULL,flow_kind TEXT,origin_station_id TEXT,"
                + "destination_station_id TEXT,assigned_npc_vessel_id TEXT,embarked_quantity INTEGER NOT NULL DEFAULT 0,"
                + "arrived_quantity INTEGER NOT NULL DEFAULT 0,returned_quantity INTEGER NOT NULL DEFAULT 0,"
                + "stranded_quantity INTEGER NOT NULL DEFAULT 0,origin_released INTEGER NOT NULL DEFAULT 0)");
        statement.execute("CREATE TABLE npc_population_flow_cohort(flow_id TEXT NOT NULL,cohort_key TEXT NOT NULL,"
                + "arrived_quantity INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(flow_id,cohort_key))");
        statement.execute("INSERT INTO world_metadata VALUES('world-1')");
        statement.execute("INSERT INTO world_location VALUES('location-a','world-1',1,'Alpha',1)");
        statement.execute("INSERT INTO world_location VALUES('location-b','world-1',2,'Beta',0)");
        statement.execute("INSERT INTO world_location VALUES('location-c','world-1',3,'Gamma',0)");
        statement.execute("INSERT INTO world_station VALUES('station-a','world-1','location-a','Alpha Station')");
        statement.execute("INSERT INTO npc_population_state(population_id,world_id,station_id,civilians,industrial_workers,"
                + "logistics_workers,security_personnel,medical_personnel,scientific_personnel,temporary_residents,refugees,"
                + "housing_capacity,life_support_capacity,employment_capacity,morale,seed_source,last_tick) "
                + "VALUES('origin-pop','world-1','station-a',50,15,10,8,5,4,5,3,200,200,200,70,'origin',0)");
        statement.execute("INSERT INTO settlement_project VALUES('project-1','world-1','FOUNDING','COMPLETE','location-b')");
        for (String row : new String[]{"CIVILIANS:8","INDUSTRIAL_WORKERS:3","LOGISTICS_WORKERS:2",
                "SECURITY_PERSONNEL:2","MEDICAL_PERSONNEL:1","SCIENTIFIC_PERSONNEL:1",
                "TEMPORARY_RESIDENTS:2","REFUGEES:1"}) {
            String[] parts = row.split(":");
            statement.execute("INSERT INTO npc_population_flow_cohort VALUES('founding-flow','" + parts[0]
                    + "'," + parts[1] + ")");
        }
    }

    private static boolean column(Connection connection, String table, String column) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("PRAGMA table_info(" + table + ")")) {
            while (result.next()) if (column.equals(result.getString("name"))) return true;
            return false;
        }
    }

    private static boolean object(Connection connection, String type, String name) throws SQLException {
        try (var statement = connection.prepareStatement(
                "SELECT 1 FROM sqlite_master WHERE type=? AND name=?")) {
            statement.setString(1, type);
            statement.setString(2, name);
            try (ResultSet result = statement.executeQuery()) { return result.next(); }
        }
    }

    private static long accounted(Connection connection) throws SQLException {
        return longValue(connection, "SELECT station_population+population_in_flows+recorded_migration_losses "
                + "FROM npc_population_migration_conservation");
    }

    private static long flowPopulation(Connection connection) throws SQLException {
        return longValue(connection, "SELECT population_in_flows FROM npc_population_migration_conservation");
    }

    private static long longValue(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            return result.next() ? result.getLong(1) : -1;
        }
    }

    private static String text(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            return result.next() ? result.getString(1) : "";
        }
    }

    private static long count(Connection connection, String table) throws SQLException {
        return countWhere(connection, table, "1=1");
    }

    private static long countWhere(Connection connection, String table, String where) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COUNT(*) FROM " + table + " WHERE " + where)) {
            return result.next() ? result.getLong(1) : 0;
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
            throw new IllegalStateException("Expected rejection containing: " + expected);
        } catch (SQLException exception) {
            require(exception.getMessage() != null && exception.getMessage().contains(expected),
                    "Unexpected schema-030 rejection: " + exception.getMessage());
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    @FunctionalInterface
    private interface SqlWork { void run() throws Exception; }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Schema-030 staged founding migration and conservation contracts passed.");
    }
}
