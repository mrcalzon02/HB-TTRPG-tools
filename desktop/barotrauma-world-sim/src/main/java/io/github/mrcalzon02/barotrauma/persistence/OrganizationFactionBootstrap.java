package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldLock;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import java.io.IOException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Locale;
import java.util.Objects;

/** Idempotently populates schema-033 organization records after stations exist. */
public final class OrganizationFactionBootstrap {
    private OrganizationFactionBootstrap() { }

    public static void seed(WorldPaths world) throws IOException, SQLException {
        Objects.requireNonNull(world, "world");
        requireDriver();
        try (WorldLock ignored = WorldStorageContracts.acquireExclusiveLock(world);
             Connection connection = DriverManager.getConnection("jdbc:sqlite:" + world.database())) {
            configure(connection);
            verifySchema(connection);
            boolean originalAutoCommit = connection.getAutoCommit();
            connection.setAutoCommit(false);
            try {
                seed(connection);
                connection.commit();
            } catch (SQLException | RuntimeException exception) {
                try { connection.rollback(); }
                catch (SQLException rollbackFailure) { exception.addSuppressed(rollbackFailure); }
                throw exception;
            } finally {
                connection.setAutoCommit(originalAutoCommit);
            }
        }
    }

    static void seed(Connection connection) throws SQLException {
        Objects.requireNonNull(connection, "connection");
        if (!tableExists(connection, "world_organization")) {
            throw new SQLException("Organization bootstrap requires schema 033.");
        }
        try (Statement statement = connection.createStatement()) {
            for (String sql : OrganizationFactionSchema.statements()) {
                String normalized = sql.stripLeading().toUpperCase(Locale.ROOT);
                if (normalized.startsWith("INSERT ")
                        || normalized.startsWith("INSERT OR ")
                        || normalized.startsWith("WITH ")
                        || normalized.startsWith("UPDATE STATION_CONTROL_STATE")) {
                    statement.execute(sql);
                }
            }
        }
        validateMajorFactionHeadquarters(connection);
    }

    private static void validateMajorFactionHeadquarters(Connection connection) throws SQLException {
        long missing = scalar(connection, "SELECT COUNT(*) FROM world_organization o "
                + "WHERE o.organization_type='MAJOR_FACTION' AND NOT EXISTS ("
                + "SELECT 1 FROM organization_headquarters h WHERE h.organization_id=o.organization_id "
                + "AND h.sovereignty_locked=1)");
        if (missing != 0) {
            throw new SQLException("Every sovereign faction requires one permanent headquarters; missing=" + missing);
        }
    }

    private static long scalar(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new SQLException("Organization bootstrap scalar returned no row.");
            return result.getLong(1);
        }
    }

    private static boolean tableExists(Connection connection, String table) throws SQLException {
        try (var statement = connection.prepareStatement(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?")) {
            statement.setString(1, table);
            try (ResultSet result = statement.executeQuery()) { return result.next(); }
        }
    }

    private static void verifySchema(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COALESCE(MAX(version),0) FROM schema_migration")) {
            int version = result.next() ? result.getInt(1) : 0;
            if (version != WorldStorageContracts.DATABASE_SCHEMA_VERSION || version < 33) {
                throw new SQLException("Organization bootstrap requires current schema 033; found " + version + ".");
            }
        }
    }

    private static void configure(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys=ON");
            statement.execute("PRAGMA recursive_triggers=ON");
            statement.execute("PRAGMA busy_timeout=5000");
            statement.execute("PRAGMA journal_mode=WAL");
            statement.execute("PRAGMA synchronous=FULL");
        }
    }

    private static void requireDriver() throws SQLException {
        try { Class.forName("org.sqlite.JDBC"); }
        catch (ClassNotFoundException exception) {
            throw new SQLException("SQLite JDBC driver is unavailable.", exception);
        }
    }
}
