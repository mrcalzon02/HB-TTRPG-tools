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
import java.util.List;

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
            version = bridgePreRenumberLocalSchema(connection, version);
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

    static List<String> statementsFor(int targetVersion) throws SQLException {
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
            case 16 -> WorldStorageContracts.schema016Statements();
            case 17 -> WorldStorageContracts.schema017Statements();
            case 18 -> WorldStorageContracts.schema018Statements();
            case 19 -> WorldStorageContracts.schema019Statements();
            case 20 -> WorldStorageContracts.schema020Statements();
            case 21 -> WorldStorageContracts.schema021Statements();
            case 22 -> WorldStorageContracts.schema022Statements();
            case 23 -> WorldStorageContracts.schema023Statements();
            case 24 -> WorldStorageContracts.schema024Statements();
            case 25 -> WorldStorageContracts.schema025Statements();
            case 26 -> WorldStorageContracts.schema026Statements();
            case 27 -> WorldStorageContracts.schema027Statements();
            case 28 -> WorldStorageContracts.schema028Statements();
            case 29 -> WorldStorageContracts.schema029Statements();
            case 30 -> WorldStorageContracts.schema030Statements();
            case 31 -> WorldStorageContracts.schema031Statements();
            case 32 -> WorldStorageContracts.schema032Statements();
            case 33 -> WorldStorageContracts.schema033Statements();
            case 34 -> WorldStorageContracts.schema034Statements();
            case 35 -> WorldStorageContracts.schema035Statements();
            case 36 -> WorldStorageContracts.schema036Statements();
            default -> throw new SQLException("No forward migration is defined for schema " + targetVersion + ".");
        };
    }

    private static int bridgePreRenumberLocalSchema(Connection connection, int version) throws SQLException {
        if (version < 15 || version > 24
                || !tableExists(connection, "station_event")
                || tableExists(connection, "npc_population_state")) {
            return version;
        }

        int remappedVersion = version + 2;
        boolean originalAutoCommit = connection.getAutoCommit();
        connection.setAutoCommit(false);
        try (Statement statement = connection.createStatement()) {
            executeStatements(statement, WorldStorageContracts.schema015Statements());
            executeStatements(statement, WorldStorageContracts.schema016Statements());
            statement.executeUpdate("DELETE FROM schema_migration WHERE version >= 15");
            try (PreparedStatement insert = connection.prepareStatement(
                    "INSERT INTO schema_migration(version,applied_at) VALUES(?,?)")) {
                String appliedAt = Instant.now().toString();
                for (int migratedVersion = 15; migratedVersion <= remappedVersion; migratedVersion++) {
                    insert.setInt(1, migratedVersion);
                    insert.setString(2, appliedAt);
                    insert.addBatch();
                }
                insert.executeBatch();
            }
            connection.commit();
            return remappedVersion;
        } catch (SQLException exception) {
            try { connection.rollback(); }
            catch (SQLException rollbackFailure) { exception.addSuppressed(rollbackFailure); }
            throw exception;
        } finally {
            connection.setAutoCommit(originalAutoCommit);
        }
    }

    private static void executeStatements(Statement statement, List<String> statements) throws SQLException {
        for (String sql : statements) {
            if (!sql.trim().toUpperCase().startsWith("PRAGMA ")) statement.execute(sql);
        }
    }

    static List<String> preRenumberLocalStatements(int oldVersion) throws SQLException {
        return switch (oldVersion) {
            case 15 -> StationCausalitySchema.statements();
            case 16 -> StationConsumptionCausalitySchema.statements();
            case 17 -> StationProductionCausalitySchema.statements();
            case 18 -> StationDeliveryCausalitySchema.statements();
            case 19 -> StationFrontierCausalitySchema.statements();
            case 20 -> StationPopulationCausalitySchema.statements();
            case 21 -> FactionPlanCausalitySchema.statements();
            case 22 -> StationCommandCausalitySchema.statements();
            case 23 -> StationMutationCoverageSchema.statements();
            case 24 -> NpcTransitObserverSchema.statements();
            default -> throw new SQLException("No pre-renumber local migration is defined for schema " + oldVersion + ".");
        };
    }

    static void applyMigration(Connection connection, int targetVersion,
                               List<String> statements, boolean initial) throws SQLException {
        boolean originalAutoCommit = connection.getAutoCommit();
        connection.setAutoCommit(false);
        try (Statement statement = connection.createStatement()) {
            for (int index = 0; index < statements.size(); index++) {
                String sql = statements.get(index);
                String normalized = sql.trim().toUpperCase();
                if (normalized.startsWith("PRAGMA ")) continue;
                if (initial && normalized.startsWith("CREATE TABLE SCHEMA_MIGRATION")) continue;
                try {
                    statement.execute(sql);
                } catch (SQLException exception) {
                    String reason = "Schema " + targetVersion + " statement " + (index + 1) + "/"
                            + statements.size() + " failed: " + exception.getMessage()
                            + "; SQL: " + summarizeSql(sql);
                    throw new SQLException(reason, exception.getSQLState(), exception.getErrorCode(), exception);
                }
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

    private static String summarizeSql(String sql) {
        String summary = sql.trim().replaceAll("\\s+", " ");
        return summary.length() <= 320 ? summary : summary.substring(0, 317) + "...";
    }

    static int currentVersion(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COALESCE(MAX(version),0) FROM schema_migration")) {
            return result.next() ? result.getInt(1) : 0;
        }
    }

    static boolean objectExists(Connection connection, String type, String name) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT 1 FROM sqlite_master WHERE type=? AND name=?")) {
            statement.setString(1, type);
            statement.setString(2, name);
            try (ResultSet result = statement.executeQuery()) { return result.next(); }
        }
    }

    static boolean tableExists(Connection connection, String table) throws SQLException {
        return objectExists(connection, "table", table);
    }

    static boolean columnExists(Connection connection, String table, String column) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("PRAGMA table_info(" + table + ")")) {
            while (result.next()) if (column.equals(result.getString("name"))) return true;
            return false;
        }
    }

    static long count(Connection connection, String table) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COUNT(*) FROM " + table)) {
            return result.next() ? result.getLong(1) : 0;
        }
    }

    static long foreignKeyViolations(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("PRAGMA foreign_key_check")) {
            long count = 0;
            while (result.next()) count++;
            return count;
        }
    }

    static void configure(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys=ON");
            statement.execute("PRAGMA busy_timeout=5000");
            statement.execute("PRAGMA journal_mode=WAL");
            statement.execute("PRAGMA synchronous=FULL");
        }
    }

    static void verifyContract() throws Exception {
        WorldDatabaseMigrationsVerification.verifyContract();
    }
}
