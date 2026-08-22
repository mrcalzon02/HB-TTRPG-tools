package io.github.mrcalzon02.barotrauma.persistence;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

/** End-to-end database contract for schema-034 organization activity and political control. */
public final class OrganizationOperationsSchemaVerification {
    private OrganizationOperationsSchemaVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite::memory:")) {
            try (Statement statement = connection.createStatement()) {
                statement.execute("PRAGMA foreign_keys=ON");
                statement.execute("PRAGMA recursive_triggers=ON");
                createPrerequisites(statement);
                seedStation(statement, "location-1", "station-1", 0, "Coalition", "Coalition Alpha");
                seedStation(statement, "location-2", "station-2", 1, "Coalition", "Coalition Beta");
                seedStation(statement, "location-3", "station-3", 2, "Separatists", "Separatist Alpha");
                seedStation(statement, "location-4", "station-4", 3, "Independent", "Independent Alpha");
                for (String sql : OrganizationFactionSchema.statements()) statement.execute(sql);
                for (String sql : OrganizationOperationsSchema.statements()) statement.execute(sql);
                seedStationSimulation(statement);
            }

            require(scalar(connection, "SELECT COUNT(*) FROM world_organization WHERE aligned_major_organization_id IS NOT NULL") > 20,
                    "Schema 034 did not politically align the institutional ecology to sovereign HQ factions.");

            // Every passive station update can seed one local institutional operation.
            try (Statement statement = connection.createStatement()) {
                statement.executeUpdate("UPDATE station_simulation_state SET last_tick=1 WHERE station_id='station-2'");
            }
            require(scalar(connection, "SELECT COUNT(*) FROM organization_operation WHERE target_station_id='station-2'") == 1,
                    "Station passive progression did not create a local organization operation.");
            require(scalar(connection, "SELECT COUNT(*) FROM organization_news_event WHERE event_type='OPERATION_STARTED'") == 1,
                    "Local operation start was not visible in the institutional news stream.");

            // Force a successful construction contract to prove durable physical assets and station effects.
            String constructor = text(connection,
                    "SELECT organization_id FROM world_organization WHERE organization_type='CONSTRUCTION_FIRM' LIMIT 1");
            try (Statement statement = connection.createStatement()) {
                statement.execute("INSERT INTO organization_operation(operation_id,world_id,operation_type,sponsor_organization_id,"
                        + "target_station_id,status,influence_axis,influence_delta,aligned_major_influence,credits_delta,supplies_delta,"
                        + "ore_delta,industry_delta,security_delta,research_delta,threat_delta,asset_type,started_tick,due_tick,summary) "
                        + "VALUES('forced-construction','world-1','CONSTRUCTION_CONTRACT','" + constructor + "','station-2','ACTIVE',"
                        + "'ECONOMIC',10,4,500,5,0,4,0,0,0,'HABITATION',2,3,'A controlled construction verification contract.')");
                statement.executeUpdate("UPDATE organization_operation SET status='COMPLETE',completed_tick=3,outcome='SUCCESS' "
                        + "WHERE operation_id='forced-construction'");
            }
            require(scalar(connection, "SELECT COUNT(*) FROM organization_station_asset WHERE source_operation_id='forced-construction'") == 1,
                    "A completed construction contract did not create a durable station asset.");
            require(scalar(connection, "SELECT COUNT(*) FROM organization_news_event WHERE event_type='ASSET_COMPLETED'") == 1,
                    "Completed physical station work was not published to the news stream.");
            require(scalar(connection, "SELECT supplies FROM station_simulation_state WHERE station_id='station-2'") > 100,
                    "Completed habitation construction did not produce its station supply/capacity support effect.");

            // A legacy transport mission becomes an institutionally sponsored operation without altering mission compatibility.
            String bank = text(connection,
                    "SELECT organization_id FROM world_organization WHERE organization_type='BANK' LIMIT 1");
            try (Statement statement = connection.createStatement()) {
                statement.execute("INSERT OR IGNORE INTO organization_station_presence(organization_id,station_id,world_id,"
                        + "political_influence,economic_influence,labor_influence,security_influence,presence_state,last_tick) "
                        + "VALUES('" + bank + "','station-2','world-1',15,60,10,5,'ACTIVE',3)");
                statement.execute("INSERT INTO world_mission(mission_id,world_id,mission_type,status,origin_station_id,target_location_id,"
                        + "difficulty,created_tick,updated_tick) VALUES('trade-mission','world-1','TRADE','AVAILABLE','station-2',"
                        + "'location-2',35,4,4)");
            }
            require(scalar(connection, "SELECT COUNT(*) FROM organization_operation WHERE transport_mission_id='trade-mission'") == 1,
                    "A transport mission did not receive an institutional operation sponsor.");
            try (Statement statement = connection.createStatement()) {
                statement.executeUpdate("UPDATE world_mission SET status='COMPLETE',completed_tick=6,updated_tick=6 "
                        + "WHERE mission_id='trade-mission'");
            }
            require("COMPLETE".equals(text(connection,
                            "SELECT status FROM organization_operation WHERE transport_mission_id='trade-mission'")),
                    "Completed transport did not complete its higher-level organization operation.");

            String separatists = text(connection,
                    "SELECT organization_id FROM world_organization WHERE organization_type='MAJOR_FACTION' AND display_name='Separatists'");
            // Coalition Beta is not the Coalition HQ. Four sustained challenger pressure updates must transfer it.
            try (Statement statement = connection.createStatement()) {
                statement.execute("INSERT OR IGNORE INTO organization_station_presence(organization_id,station_id,world_id,"
                        + "political_influence,economic_influence,labor_influence,security_influence,presence_state,last_tick) "
                        + "VALUES('" + separatists + "','station-2','world-1',80,30,20,30,'ACTIVE',10)");
                for (int tick = 11; tick <= 14; tick++) {
                    statement.executeUpdate("UPDATE organization_station_presence SET political_influence=80,last_tick=" + tick
                            + " WHERE organization_id='" + separatists + "' AND station_id='station-2'");
                }
            }
            require("Separatists".equals(text(connection, "SELECT faction FROM world_station WHERE station_id='station-2'")),
                    "Sustained political pressure did not transfer a normal station.");
            require(scalar(connection, "SELECT COUNT(*) FROM station_control_history WHERE station_id='station-2' "
                            + "AND cause_type='SUSTAINED_ORGANIZATION_INFLUENCE'") == 1,
                    "Station takeover did not preserve a durable control-history event.");
            require(scalar(connection, "SELECT COUNT(*) FROM regional_conflict_zone WHERE center_location_id='location-2'") == 1,
                    "Sustained station contest did not form a regional conflict zone.");
            require("CEASEFIRE".equals(text(connection,
                            "SELECT status FROM regional_conflict_zone WHERE center_location_id='location-2' LIMIT 1")),
                    "A resolved control transfer did not move its conflict zone into ceasefire state.");

            // Coalition Alpha is the permanent Coalition HQ. Even overwhelming pressure must not create a challenge.
            try (Statement statement = connection.createStatement()) {
                statement.execute("INSERT OR IGNORE INTO organization_station_presence(organization_id,station_id,world_id,"
                        + "political_influence,economic_influence,labor_influence,security_influence,presence_state,last_tick) "
                        + "VALUES('" + separatists + "','station-1','world-1',95,80,70,80,'DOMINANT',20)");
                for (int tick = 21; tick <= 27; tick++) {
                    statement.executeUpdate("UPDATE organization_station_presence SET political_influence=100,last_tick=" + tick
                            + " WHERE organization_id='" + separatists + "' AND station_id='station-1'");
                }
            }
            require("Coalition".equals(text(connection, "SELECT faction FROM world_station WHERE station_id='station-1'")),
                    "A sovereign headquarters changed ownership under political pressure.");
            require(scalar(connection, "SELECT COUNT(*) FROM station_control_challenge WHERE station_id='station-1'") == 0,
                    "A permanent sovereign HQ incorrectly accumulated takeover pressure.");
            require(scalar(connection, "SELECT COUNT(*) FROM pragma_foreign_key_check") == 0,
                    "Organization operations introduced foreign-key violations.");
        }
    }

    private static void createPrerequisites(Statement statement) throws SQLException {
        statement.execute("CREATE TABLE world_metadata(world_id TEXT PRIMARY KEY,display_name TEXT NOT NULL)");
        statement.execute("CREATE TABLE world_location(location_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,source_ordinal INTEGER NOT NULL,"
                + "display_name TEXT NOT NULL,faction TEXT,is_station INTEGER NOT NULL DEFAULT 0,ring INTEGER NOT NULL DEFAULT 0,"
                + "FOREIGN KEY(world_id) REFERENCES world_metadata(world_id))");
        statement.execute("CREATE TABLE world_station(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,location_id TEXT NOT NULL UNIQUE,"
                + "source_station_id TEXT NOT NULL,display_name TEXT NOT NULL,faction TEXT,has_economy INTEGER NOT NULL DEFAULT 1,"
                + "FOREIGN KEY(world_id) REFERENCES world_metadata(world_id),FOREIGN KEY(location_id) REFERENCES world_location(location_id))");
        statement.execute("CREATE TABLE world_mission(mission_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,mission_type TEXT NOT NULL,status TEXT NOT NULL,"
                + "origin_station_id TEXT,target_location_id TEXT NOT NULL,difficulty INTEGER NOT NULL DEFAULT 30,created_tick INTEGER NOT NULL DEFAULT 0,"
                + "updated_tick INTEGER NOT NULL DEFAULT 0,completed_tick INTEGER,FOREIGN KEY(world_id) REFERENCES world_metadata(world_id),"
                + "FOREIGN KEY(origin_station_id) REFERENCES world_station(station_id),FOREIGN KEY(target_location_id) REFERENCES world_location(location_id))");
        statement.execute("CREATE TABLE station_simulation_state(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,credits INTEGER NOT NULL DEFAULT 10000,"
                + "supplies INTEGER NOT NULL DEFAULT 100,ore INTEGER NOT NULL DEFAULT 25,industry INTEGER NOT NULL DEFAULT 50,"
                + "security INTEGER NOT NULL DEFAULT 50,integrity INTEGER NOT NULL DEFAULT 100,threat INTEGER NOT NULL DEFAULT 10,"
                + "research INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'STABLE',last_tick INTEGER NOT NULL DEFAULT 0,"
                + "FOREIGN KEY(station_id) REFERENCES world_station(station_id),FOREIGN KEY(world_id) REFERENCES world_metadata(world_id))");
        statement.execute("INSERT INTO world_metadata(world_id,display_name) VALUES('world-1','Organization Operations Europa')");
    }

    private static void seedStation(Statement statement, String locationId, String stationId,
                                    int ordinal, String faction, String name) throws SQLException {
        statement.execute("INSERT INTO world_location(location_id,world_id,source_ordinal,display_name,faction,is_station,ring) "
                + "VALUES('" + locationId + "','world-1'," + ordinal + ",'" + name + "','" + faction + "',1," + ordinal + ")");
        statement.execute("INSERT INTO world_station(station_id,world_id,location_id,source_station_id,display_name,faction,has_economy) "
                + "VALUES('" + stationId + "','world-1','" + locationId + "','source-" + stationId + "','"
                + name + "','" + faction + "',1)");
    }

    private static void seedStationSimulation(Statement statement) throws SQLException {
        for (int index = 1; index <= 4; index++) {
            statement.execute("INSERT INTO station_simulation_state(station_id,world_id,credits,supplies,ore,industry,security,integrity,threat,research,status,last_tick) "
                    + "VALUES('station-" + index + "','world-1',10000,100,40,55,60,100,25,20,'STABLE',0)");
        }
    }

    private static long scalar(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new SQLException("Verification scalar returned no row.");
            return result.getLong(1);
        }
    }

    private static String text(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new SQLException("Verification text query returned no row.");
            return result.getString(1);
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Barotrauma organization operations and station-control contracts passed.");
    }
}
