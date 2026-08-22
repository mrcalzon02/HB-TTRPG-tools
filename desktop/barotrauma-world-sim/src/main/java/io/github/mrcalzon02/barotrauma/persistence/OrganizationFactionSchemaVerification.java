package io.github.mrcalzon02.barotrauma.persistence;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

/** Contract verification for schema-033 organization ecology and sovereign-HQ invariants. */
public final class OrganizationFactionSchemaVerification {
    private OrganizationFactionSchemaVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite::memory:")) {
            try (Statement statement = connection.createStatement()) {
                statement.execute("PRAGMA foreign_keys=ON");
                statement.execute("CREATE TABLE world_metadata(world_id TEXT PRIMARY KEY,display_name TEXT NOT NULL)");
                statement.execute("CREATE TABLE world_location(location_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,"
                        + "source_ordinal INTEGER NOT NULL,display_name TEXT NOT NULL,faction TEXT,is_station INTEGER NOT NULL DEFAULT 0,"
                        + "ring INTEGER NOT NULL DEFAULT 0,FOREIGN KEY(world_id) REFERENCES world_metadata(world_id))");
                statement.execute("CREATE TABLE world_station(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,"
                        + "location_id TEXT NOT NULL UNIQUE,source_station_id TEXT NOT NULL,display_name TEXT NOT NULL,"
                        + "faction TEXT,has_economy INTEGER NOT NULL DEFAULT 1,"
                        + "FOREIGN KEY(world_id) REFERENCES world_metadata(world_id),"
                        + "FOREIGN KEY(location_id) REFERENCES world_location(location_id))");
                statement.execute("CREATE TABLE world_mission(mission_id TEXT PRIMARY KEY)");
                statement.execute("INSERT INTO world_metadata(world_id,display_name) VALUES('world-1','Organization Test Europa')");
                seedStation(statement, "location-1", "station-1", 0, "Coalition", "Coalition Alpha");
                seedStation(statement, "location-2", "station-2", 1, "Coalition", "Coalition Beta");
                seedStation(statement, "location-3", "station-3", 2, "Separatists", "Separatist Alpha");
                seedStation(statement, "location-4", "station-4", 3, "Independent", "Independent Alpha");
                for (String sql : OrganizationFactionSchema.statements()) statement.execute(sql);
            }

            require(scalar(connection, "SELECT COUNT(*) FROM world_organization WHERE organization_type='MAJOR_FACTION'") == 3,
                    "Imported station factions were not promoted to sovereign organization records.");
            require(scalar(connection, "SELECT COUNT(*) FROM world_organization WHERE organization_type='SUBFACTION'") == 18,
                    "Every major faction must receive six internal doctrinal blocs.");
            require(scalar(connection, "SELECT COUNT(*) FROM world_organization WHERE organization_type NOT IN "
                            + "('MAJOR_FACTION','SUBFACTION','LOCAL_ASSOCIATION')") >= 39,
                    "The institutional ecology did not seed construction, finance, trade, labor, research, and service organizations.");
            require(scalar(connection, "SELECT COUNT(*) FROM world_organization WHERE organization_type='LOCAL_ASSOCIATION'") == 4,
                    "Every station must receive a local civic organization.");
            require(scalar(connection, "SELECT COUNT(*) FROM world_organization")
                            == scalar(connection, "SELECT COUNT(*) FROM organization_headquarters"),
                    "Every seeded organization must have a headquarters or home office.");
            require(scalar(connection, "SELECT COUNT(*) FROM organization_headquarters WHERE sovereignty_locked=1") == 3,
                    "Every major faction must have exactly one permanent sovereign headquarters.");
            require(scalar(connection, "SELECT COUNT(*) FROM organization_doctrine")
                            == scalar(connection, "SELECT COUNT(*) FROM world_organization"),
                    "Every organization must have a doctrine/priority profile.");
            require(scalar(connection, "SELECT COUNT(*) FROM station_control_state") == 4,
                    "Every faction-aligned station must receive independent control state.");
            require(scalar(connection, "SELECT COUNT(*) FROM regional_conflict_zone") == 0,
                    "Conflict zones must emerge from simulation pressure, not be fabricated at migration time.");
            require(scalar(connection, "SELECT COUNT(*) FROM pragma_foreign_key_check") == 0,
                    "Organization faction schema created foreign-key violations.");

            boolean locked = false;
            try (Statement statement = connection.createStatement()) {
                statement.executeUpdate("UPDATE world_station SET faction='Other' WHERE station_id='station-1'");
            } catch (SQLException expected) {
                locked = expected.getMessage() != null
                        && expected.getMessage().contains("headquarters cannot change major-faction ownership");
            }
            require(locked, "Sovereign headquarters ownership lock was not enforced.");

            try (Statement statement = connection.createStatement()) {
                statement.executeUpdate("UPDATE world_station SET faction='Other' WHERE station_id='station-2'");
            }
            require("Other".equals(text(connection,
                            "SELECT faction FROM world_station WHERE station_id='station-2'")),
                    "Non-HQ station ownership must remain mutable for later mission-driven control transfer.");
        }
    }

    private static void seedStation(Statement statement, String locationId, String stationId,
                                    int ordinal, String faction, String name) throws SQLException {
        statement.execute("INSERT INTO world_location(location_id,world_id,source_ordinal,display_name,faction,is_station,ring) "
                + "VALUES('" + locationId + "','world-1'," + ordinal + ",'" + name + "','" + faction + "',1," + ordinal + ")");
        statement.execute("INSERT INTO world_station(station_id,world_id,location_id,source_station_id,display_name,faction,has_economy) "
                + "VALUES('" + stationId + "','world-1','" + locationId + "','source-" + stationId + "','"
                + name + "','" + faction + "',1)");
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
        System.out.println("Barotrauma organization faction ecology contracts passed.");
    }
}
