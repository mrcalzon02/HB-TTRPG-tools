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

/** Idempotently populates organization records after imported stations exist. */
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
            throw new SQLException("Organization bootstrap requires schema 033 or newer.");
        }
        try (Statement statement = connection.createStatement()) {
            replayDataStatements(statement, OrganizationFactionSchema.statements());
            if (tableExists(connection, "organization_operation")) {
                for (String sql : OrganizationOperationsSchema.statements()) {
                    String normalized = sql.stripLeading().toUpperCase(Locale.ROOT);
                    if (normalized.startsWith("UPDATE WORLD_ORGANIZATION")) statement.execute(sql);
                }
            }
            if (tableExists(connection, "organization_finance_state")) {
                replayDataStatements(statement, InstitutionalEconomySchema.statements());
            }
        }
        validateMajorFactionHeadquarters(connection);
        validateInstitutionAlignment(connection);
        validateStationScaledInstitutions(connection);
    }

    private static void replayDataStatements(Statement statement, Iterable<String> statements) throws SQLException {
        for (String sql : statements) {
            String normalized = sql.stripLeading().toUpperCase(Locale.ROOT);
            if (normalized.startsWith("INSERT ")
                    || normalized.startsWith("INSERT OR ")
                    || normalized.startsWith("WITH ")
                    || normalized.startsWith("UPDATE STATION_CONTROL_STATE")) {
                statement.execute(sql);
            }
        }
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

    private static void validateInstitutionAlignment(Connection connection) throws SQLException {
        if (!tableExists(connection, "organization_operation")) return;
        long unaligned = scalar(connection, "SELECT COUNT(*) FROM world_organization "
                + "WHERE organization_type NOT IN ('MAJOR_FACTION','SUBFACTION') "
                + "AND home_station_id IS NOT NULL AND aligned_major_organization_id IS NULL");
        if (unaligned != 0) {
            throw new SQLException("Every headquartered non-sovereign organization must inherit its HQ sovereign alignment; missing="
                    + unaligned);
        }
    }

    private static void validateStationScaledInstitutions(Connection connection) throws SQLException {
        if (!tableExists(connection, "organization_finance_state")) return;
        long stations = scalar(connection, "SELECT COUNT(*) FROM world_station");
        long localInstitutions = scalar(connection,
                "SELECT COUNT(*) FROM world_organization WHERE organization_key LIKE 'local-institution:%'");
        if (localInstitutions != stations * 8L) {
            throw new SQLException("Institutional density bootstrap expected eight local institutions per station; stations="
                    + stations + ", localInstitutions=" + localInstitutions);
        }
        long missingFinance = scalar(connection, "SELECT COUNT(*) FROM world_organization o WHERE NOT EXISTS ("
                + "SELECT 1 FROM organization_finance_state f WHERE f.organization_id=o.organization_id)");
        long missingMembership = scalar(connection, "SELECT COUNT(*) FROM world_organization o WHERE NOT EXISTS ("
                + "SELECT 1 FROM organization_membership_state m WHERE m.organization_id=o.organization_id)");
        if (missingFinance != 0 || missingMembership != 0) {
            throw new SQLException("Every organization must receive finance and membership state; missingFinance="
                    + missingFinance + ", missingMembership=" + missingMembership);
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
                throw new SQLException("Organization bootstrap requires the current schema at version 33 or newer; found "
                        + version + ".");
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
