package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldLock;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Instant;
import java.util.Comparator;
import java.util.UUID;

/** Applies forward-only migrations to a world database while its filesystem lock is held. */
final class WorldDatabaseMigrations {
    private WorldDatabaseMigrations() { }

    static void migrateExistingDatabase(WorldPaths paths) throws IOException {
        try { Class.forName("org.sqlite.JDBC"); }
        catch (ClassNotFoundException exception) {
            if (!Files.exists(paths.database())) return;
            throw new IOException("The SQLite JDBC driver is required to migrate this desktop world.", exception);
        }
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configure(connection);
            int version;
            if (!tableExists(connection, "schema_migration")) {
                try (Statement statement = connection.createStatement()) {
                    statement.execute("CREATE TABLE schema_migration (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)");
                }
                applyMigration(connection, 1, WorldStorageContracts.initialSchemaStatements(), true);
                version = 1;
            } else version = currentVersion(connection);
            if (version > WorldStorageContracts.DATABASE_SCHEMA_VERSION) {
                throw new SQLException("World database schema " + version + " is newer than supported schema "
                        + WorldStorageContracts.DATABASE_SCHEMA_VERSION + ".");
            }
            while (version < WorldStorageContracts.DATABASE_SCHEMA_VERSION && version > 0) {
                if (version == 1) { applyMigration(connection, 2, WorldStorageContracts.schema002Statements(), false); version = 2; }
                else if (version == 2) { applyMigration(connection, 3, WorldStorageContracts.schema003Statements(), false); version = 3; }
                else if (version == 3) { applyMigration(connection, 4, WorldStorageContracts.schema004Statements(), false); version = 4; }
                else if (version == 4) { applyMigration(connection, 5, WorldStorageContracts.schema005Statements(), false); version = 5; }
                else if (version == 5) { applyMigration(connection, 6, WorldStorageContracts.schema006Statements(), false); version = 6; }
                else if (version == 6) { applyMigration(connection, 7, WorldStorageContracts.schema007Statements(), false); version = 7; }
                else if (version == 7) { applyMigration(connection, 8, WorldStorageContracts.schema008Statements(), false); version = 8; }
                else if (version == 8) { applyMigration(connection, 9, WorldStorageContracts.schema009Statements(), false); version = 9; }
                else if (version == 9) { applyMigration(connection, 10, WorldStorageContracts.schema010Statements(), false); version = 10; }
                else throw new SQLException("No forward migration is defined from schema " + version + ".");
            }
        } catch (SQLException exception) {
            throw new IOException("Desktop world database migration failed: " + exception.getMessage(), exception);
        }
    }

    private static void applyMigration(Connection connection, int targetVersion,
                                       java.util.List<String> statements, boolean initial) throws SQLException {
        boolean originalAutoCommit = connection.getAutoCommit();
        connection.setAutoCommit(false);
        try (Statement statement = connection.createStatement()) {
            for (String sql : statements) {
                String normalized = sql.trim().toUpperCase();
                if (normalized.startsWith("PRAGMA ")) continue;
                if (initial && normalized.startsWith("CREATE TABLE SCHEMA_MIGRATION")) continue;
                statement.execute(sql);
            }
            try (PreparedStatement insert = connection.prepareStatement(
                    "INSERT INTO schema_migration(version, applied_at) VALUES (?, ?)")) {
                insert.setInt(1, targetVersion);
                insert.setString(2, Instant.now().toString());
                insert.executeUpdate();
            }
            connection.commit();
        } catch (SQLException exception) {
            try { connection.rollback(); } catch (SQLException rollbackFailure) { exception.addSuppressed(rollbackFailure); }
            throw exception;
        } finally { connection.setAutoCommit(originalAutoCommit); }
    }

    private static int currentVersion(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COALESCE(MAX(version), 0) FROM schema_migration")) {
            return result.next() ? result.getInt(1) : 0;
        }
    }

    private static boolean objectExists(Connection connection, String type, String name) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT 1 FROM sqlite_master WHERE type = ? AND name = ?")) {
            statement.setString(1, type);
            statement.setString(2, name);
            try (ResultSet result = statement.executeQuery()) { return result.next(); }
        }
    }

    private static boolean tableExists(Connection connection, String table) throws SQLException {
        return objectExists(connection, "table", table);
    }

    private static boolean columnExists(Connection connection, String table, String column) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("PRAGMA table_info(" + table + ")")) {
            while (result.next()) if (column.equals(result.getString("name"))) return true;
            return false;
        }
    }

    private static void configure(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys = ON");
            statement.execute("PRAGMA busy_timeout = 5000");
            statement.execute("PRAGMA journal_mode = WAL");
            statement.execute("PRAGMA synchronous = FULL");
        }
    }

    static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        Path root = Files.createTempDirectory("barotrauma-schema-upgrade-");
        try {
            UUID freshId = UUID.fromString("92000000-0000-0000-0000-000000000001");
            WorldPaths fresh = WorldStorageContracts.createWorld(root, "Fresh Europa", freshId);
            try (WorldLock ignored = WorldStorageContracts.acquireExclusiveLock(fresh)) { }
            try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + fresh.database())) {
                require(currentVersion(connection) == 10, "Fresh world did not initialize at schema 010.");
                require(tableExists(connection, "passive_simulation_config"), "Fresh world is missing passive simulation schema.");
                require(objectExists(connection, "index", "station_research_topic_unique"), "Fresh world is missing passive research uniqueness.");
                require(tableExists(connection, "item_catalogue") && tableExists(connection, "station_inventory"), "Fresh world is missing catalogue or inventory tables.");
                require(tableExists(connection, "player_vessel_state") && tableExists(connection, "player_transit_encounter"), "Fresh world is missing player transit tables.");
                require(objectExists(connection, "trigger", "passive_freight_offers"), "Fresh world is missing passive freight offers.");
                require(objectExists(connection, "trigger", "npc_return_arrival"), "Fresh world is missing integrated NPC return handling.");
                require(tableExists(connection, "station_civilization_state")
                                && tableExists(connection, "station_consumption_log"),
                        "Fresh world is missing station consumption or civilization state.");
                require(tableExists(connection, "civilization_frontier_event"),
                        "Fresh world is missing civilization frontier events.");
                require(objectExists(connection, "trigger", "station_passive_consumption")
                                && objectExists(connection, "trigger", "delivered_freight_supports_station"),
                        "Fresh world is missing consumption or delivery-support triggers.");
                require(objectExists(connection, "trigger", "frontier_response_mission")
                                && objectExists(connection, "trigger", "frontier_expansion_mission")
                                && objectExists(connection, "trigger", "frontier_recovery_event"),
                        "Fresh world is missing hardened frontier responses.");
                require(tableExists(connection, "fleet_response_operation")
                                && tableExists(connection, "fleet_response_log"),
                        "Fresh world is missing fleet recovery operations.");
                require(tableExists(connection, "location_ecology_state")
                                && tableExists(connection, "location_geology_state")
                                && tableExists(connection, "natural_resource_site"),
                        "Fresh world is missing natural world state.");
                require(objectExists(connection, "trigger", "passive_natural_and_recovery_cycle")
                                && objectExists(connection, "trigger", "fleet_response_complete"),
                        "Fresh world is missing passive ecology or fleet completion triggers.");
            }

            UUID worldId = UUID.fromString("93000000-0000-0000-0000-000000000001");
            WorldPaths paths = WorldStorageContracts.createWorld(root, "Legacy Europa", worldId);
            UUID artifactId = UUID.fromString("93000000-0000-0000-0000-000000000002");
            try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
                configure(connection);
                try (Statement statement = connection.createStatement()) {
                    for (String sql : WorldStorageContracts.initialSchemaStatements()) {
                        if (!sql.trim().toUpperCase().startsWith("PRAGMA ")) statement.execute(sql);
                    }
                }
                try (PreparedStatement version = connection.prepareStatement(
                        "INSERT INTO schema_migration(version, applied_at) VALUES (1, ?)")) {
                    version.setString(1, Instant.parse("2026-07-01T00:00:00Z").toString());
                    version.executeUpdate();
                }
                try (PreparedStatement world = connection.prepareStatement(
                        "INSERT INTO world_metadata(world_id, display_name, created_at) VALUES (?, ?, ?)")) {
                    world.setString(1, worldId.toString());
                    world.setString(2, "Legacy Europa");
                    world.setString(3, Instant.parse("2026-07-01T00:00:00Z").toString());
                    world.executeUpdate();
                }
                try (PreparedStatement artifact = connection.prepareStatement(
                        "INSERT INTO import_artifact(artifact_id, sha256, byte_length, source_name, source_kind, inspected_at) "
                                + "VALUES (?, ?, 7, 'legacy.sub', 'official-submarine', ?)")) {
                    artifact.setString(1, artifactId.toString());
                    artifact.setString(2, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
                    artifact.setString(3, Instant.parse("2026-07-01T00:00:00Z").toString());
                    artifact.executeUpdate();
                }
            }
            try (WorldLock ignored = WorldStorageContracts.acquireExclusiveLock(paths)) { }
            try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
                require(currentVersion(connection) == 10, "Legacy world did not advance to schema 010.");
                require(tableExists(connection, "world_location"), "Schema-002 world tables are missing.");
                require(tableExists(connection, "simulation_command_receipt"), "Schema-003 command receipt table is missing.");
                require(tableExists(connection, "station_simulation_state"), "Schema-004 station workload table is missing.");
                require(objectExists(connection, "index", "station_research_topic_unique"), "Schema-005 research uniqueness is missing.");
                require(tableExists(connection, "station_inventory") && tableExists(connection, "station_vendor_offer"), "Schema-006 logistics tables are missing.");
                require(tableExists(connection, "player_vessel_state") && tableExists(connection, "player_voyage_log"), "Schema-006 player route tables are missing.");
                require(objectExists(connection, "trigger", "passive_freight_offers"), "Schema-007 freight offer trigger is missing.");
                require(tableExists(connection, "station_civilization_state")
                                && tableExists(connection, "station_consumption_log"),
                        "Schema-008 consumption state is missing.");
                require(objectExists(connection, "trigger", "frontier_response_mission")
                                && objectExists(connection, "trigger", "frontier_expansion_mission"),
                        "Schema-009 frontier mission hardening is missing.");
                require(tableExists(connection, "fleet_response_operation")
                                && tableExists(connection, "location_ecology_state")
                                && tableExists(connection, "location_geology_state"),
                        "Schema-010 fleet recovery or natural world state is missing.");
                require(columnExists(connection, "world_metadata", "source_suite_version"), "Schema-002 world metadata columns are missing.");
                try (PreparedStatement statement = connection.prepareStatement(
                        "SELECT source_name FROM import_artifact WHERE artifact_id = ?")) {
                    statement.setString(1, artifactId.toString());
                    try (ResultSet result = statement.executeQuery()) {
                        require(result.next() && result.getString(1).equals("legacy.sub"), "Migration did not preserve schema-001 records.");
                    }
                }
            }
        } finally { deleteTree(root); }
    }

    private static void deleteTree(Path root) throws IOException {
        if (!Files.exists(root)) return;
        try (var stream = Files.walk(root)) {
            for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }
}
