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
import java.util.List;
import java.util.UUID;

/** Applies the complete forward-only desktop world migration chain while the filesystem lock is held. */
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
            int version = initializeIfNeeded(connection);
            if (version > WorldStorageContracts.DATABASE_SCHEMA_VERSION) {
                throw new SQLException("World database schema " + version + " is newer than supported schema "
                        + WorldStorageContracts.DATABASE_SCHEMA_VERSION + ".");
            }
            while (version < WorldStorageContracts.DATABASE_SCHEMA_VERSION && version > 0) {
                int target = version + 1;
                applyMigration(connection, target, statementsFor(target), false);
                version = target;
            }
        } catch (SQLException exception) {
            throw new IOException("Desktop world database migration failed: " + exception.getMessage(), exception);
        }
    }

    private static int initializeIfNeeded(Connection connection) throws SQLException {
        if (tableExists(connection, "schema_migration")) return currentVersion(connection);
        try (Statement statement = connection.createStatement()) {
            statement.execute("CREATE TABLE schema_migration (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)");
        }
        applyMigration(connection, 1, WorldStorageContracts.initialSchemaStatements(), true);
        return 1;
    }

    private static List<String> statementsFor(int targetVersion) throws SQLException {
        return switch (targetVersion) {
            case 2 -> WorldStorageContracts.schema002Statements();
            case 3 -> WorldStorageContracts.schema003Statements();
            case 4 -> WorldStorageContracts.schema004Statements();
            case 5 -> WorldStorageContracts.schema005Statements();
            case 6 -> WorldStorageContracts.schema006Statements();
            case 7 -> WorldStorageContracts.schema007Statements();
            case 8 -> WorldStorageContracts.schema008Statements();
            case 9 -> WorldStorageContracts.schema009Statements();
            case 10 -> WorldStorageContracts.schema010Statements();
            case 11 -> WorldStorageContracts.schema011Statements();
            case 12 -> WorldStorageContracts.schema012Statements();
            case 13 -> WorldStorageContracts.schema013Statements();
            case 14 -> WorldStorageContracts.schema014Statements();
            case 15 -> WorldStorageContracts.schema015Statements();
            default -> throw new SQLException("No forward migration is defined for schema " + targetVersion + ".");
        };
    }

    private static void applyMigration(Connection connection, int targetVersion,
                                       List<String> statements, boolean initial) throws SQLException {
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
            try { connection.rollback(); }
            catch (SQLException rollbackFailure) { exception.addSuppressed(rollbackFailure); }
            throw exception;
        } finally {
            connection.setAutoCommit(originalAutoCommit);
        }
    }

    private static int currentVersion(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COALESCE(MAX(version),0) FROM schema_migration")) {
            return result.next() ? result.getInt(1) : 0;
        }
    }

    private static boolean objectExists(Connection connection, String type, String name) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT 1 FROM sqlite_master WHERE type=? AND name=?")) {
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

    private static void configure(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys=ON");
            statement.execute("PRAGMA busy_timeout=5000");
            statement.execute("PRAGMA journal_mode=WAL");
            statement.execute("PRAGMA synchronous=FULL");
        }
    }

    static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        Path root = Files.createTempDirectory("barotrauma-schema-upgrade-");
        try {
            verifyFreshWorld(root);
            verifyLegacyWorld(root);
        } finally {
            deleteTree(root);
        }
    }

    private static void verifyFreshWorld(Path root) throws Exception {
        UUID worldId = UUID.fromString("92000000-0000-0000-0000-000000000001");
        WorldPaths paths = WorldStorageContracts.createWorld(root, "Fresh Europa", worldId);
        try (WorldLock ignored = WorldStorageContracts.acquireExclusiveLock(paths)) { }
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configure(connection);
            require(currentVersion(connection) == 15, "Fresh world did not initialize at schema 015.");
            require(tableExists(connection, "world_location") && tableExists(connection, "simulation_command_receipt"),
                    "Fresh world is missing normalized-world or command-receipt state.");
            require(tableExists(connection, "station_simulation_state") && tableExists(connection, "station_inventory"),
                    "Fresh world is missing passive station or logistics state.");
            require(tableExists(connection, "station_civilization_state")
                            && objectExists(connection, "trigger", "frontier_expansion_mission"),
                    "Fresh world is missing civilization-frontier state.");
            require(tableExists(connection, "location_ecology_state")
                            && tableExists(connection, "resource_extraction_batch"),
                    "Fresh world is missing ecology or finite extraction state.");
            require(tableExists(connection, "fleet_response_transit_leg")
                            && objectExists(connection, "trigger", "fleet_response_responder_returns_home"),
                    "Fresh world is missing response transit or towing completion.");
            verifyObservationObjects(connection, "Fresh world");
            require(foreignKeyViolations(connection) == 0, "Fresh schema contains foreign-key violations.");
        }
    }

    private static void verifyLegacyWorld(Path root) throws Exception {
        UUID worldId = UUID.fromString("93000000-0000-0000-0000-000000000001");
        UUID artifactId = UUID.fromString("93000000-0000-0000-0000-000000000002");
        WorldPaths paths = WorldStorageContracts.createWorld(root, "Legacy Europa", worldId);
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configure(connection);
            try (Statement statement = connection.createStatement()) {
                for (String sql : WorldStorageContracts.initialSchemaStatements()) {
                    if (!sql.trim().toUpperCase().startsWith("PRAGMA ")) statement.execute(sql);
                }
            }
            try (PreparedStatement version = connection.prepareStatement(
                    "INSERT INTO schema_migration(version,applied_at) VALUES(1,?)")) {
                version.setString(1, "2026-07-01T00:00:00Z");
                version.executeUpdate();
            }
            try (PreparedStatement world = connection.prepareStatement(
                    "INSERT INTO world_metadata(world_id,display_name,created_at) VALUES(?,?,?)")) {
                world.setString(1, worldId.toString());
                world.setString(2, "Legacy Europa");
                world.setString(3, "2026-07-01T00:00:00Z");
                world.executeUpdate();
            }
            try (PreparedStatement artifact = connection.prepareStatement(
                    "INSERT INTO import_artifact(artifact_id,sha256,byte_length,source_name,source_kind,inspected_at) VALUES(?,?,7,'legacy.sub','official-submarine',?)")) {
                artifact.setString(1, artifactId.toString());
                artifact.setString(2, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
                artifact.setString(3, "2026-07-01T00:00:00Z");
                artifact.executeUpdate();
            }
        }
        try (WorldLock ignored = WorldStorageContracts.acquireExclusiveLock(paths)) { }
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configure(connection);
            require(currentVersion(connection) == 15, "Legacy world did not advance to schema 015.");
            require(columnExists(connection, "world_metadata", "source_suite_version"),
                    "Legacy world did not receive normalized-world metadata columns.");
            require(tableExists(connection, "station_civilization_state")
                            && tableExists(connection, "location_ecology_state")
                            && tableExists(connection, "fleet_response_transit_leg"),
                    "Legacy world did not retain the prior passive-world migration chain.");
            verifyObservationObjects(connection, "Legacy world");
            try (PreparedStatement statement = connection.prepareStatement(
                    "SELECT source_name FROM import_artifact WHERE artifact_id=?")) {
                statement.setString(1, artifactId.toString());
                try (ResultSet result = statement.executeQuery()) {
                    require(result.next() && "legacy.sub".equals(result.getString(1)),
                            "Legacy migration did not preserve schema-001 records.");
                }
            }
            require(count(connection, "observation_snapshot") == 1,
                    "Legacy world did not receive one root observation snapshot.");
            require(foreignKeyViolations(connection) == 0, "Legacy schema contains foreign-key violations.");
        }
    }

    private static void verifyObservationObjects(Connection connection, String prefix) throws SQLException {
        require(tableExists(connection, "npc_population_state")
                        && tableExists(connection, "creature_population_state")
                        && tableExists(connection, "creature_territory_state"),
                prefix + " is missing observation population or territory state.");
        require(tableExists(connection, "faction_location_presence")
                        && tableExists(connection, "population_flow")
                        && tableExists(connection, "world_observation_event"),
                prefix + " is missing influence, flow, or event evidence.");
        require(tableExists(connection, "observation_snapshot")
                        && tableExists(connection, "observation_metric_series")
                        && tableExists(connection, "observer_watch_rule"),
                prefix + " is missing snapshot, metric, or watch state.");
        require(objectExists(connection, "view", "npc_population_observation")
                        && objectExists(connection, "view", "creature_population_observation")
                        && objectExists(connection, "view", "observation_world_summary"),
                prefix + " is missing read-optimized observation views.");
        require(objectExists(connection, "trigger", "observation_npc_population_seed")
                        && objectExists(connection, "trigger", "observation_creature_population_seed")
                        && objectExists(connection, "trigger", "observation_creature_territory_seed"),
                prefix + " is missing observation seed triggers.");
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
