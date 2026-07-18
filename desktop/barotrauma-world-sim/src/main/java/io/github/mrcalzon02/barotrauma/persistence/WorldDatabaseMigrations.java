package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import java.io.IOException;
import java.nio.file.Files;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Instant;

/** Applies forward-only migrations to an existing world database while its filesystem lock is held. */
final class WorldDatabaseMigrations {

    private WorldDatabaseMigrations() { }

    static void migrateExistingDatabase(WorldPaths paths) throws IOException {
        if (!Files.isRegularFile(paths.database())) return;
        try {
            if (Files.size(paths.database()) == 0L) return;
            Class.forName("org.sqlite.JDBC");
        } catch (ClassNotFoundException exception) {
            throw new IOException("The SQLite JDBC driver is required to migrate this desktop world.", exception);
        }

        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configure(connection);
            if (!tableExists(connection, "schema_migration")) return;
            int version = currentVersion(connection);
            if (version > WorldStorageContracts.DATABASE_SCHEMA_VERSION) {
                throw new SQLException("World database schema " + version + " is newer than supported schema "
                        + WorldStorageContracts.DATABASE_SCHEMA_VERSION + ".");
            }
            while (version < WorldStorageContracts.DATABASE_SCHEMA_VERSION && version > 0) {
                if (version == 1) {
                    applyMigration(connection, 2, WorldStorageContracts.schema002Statements());
                    version = 2;
                } else {
                    throw new SQLException("No forward migration is defined from schema " + version + ".");
                }
            }
        } catch (SQLException exception) {
            throw new IOException("Desktop world database migration failed: " + exception.getMessage(), exception);
        }
    }

    private static void applyMigration(Connection connection, int targetVersion, java.util.List<String> statements)
            throws SQLException {
        boolean originalAutoCommit = connection.getAutoCommit();
        connection.setAutoCommit(false);
        try (Statement statement = connection.createStatement()) {
            for (String sql : statements) statement.execute(sql);
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
        } finally {
            connection.setAutoCommit(originalAutoCommit);
        }
    }

    private static int currentVersion(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COALESCE(MAX(version), 0) FROM schema_migration")) {
            return result.next() ? result.getInt(1) : 0;
        }
    }

    private static boolean tableExists(Connection connection, String table) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")) {
            statement.setString(1, table);
            try (ResultSet result = statement.executeQuery()) {
                return result.next();
            }
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
}
