package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldLock;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Objects;

/** Installs the idempotent daily-newspaper archive objects before Passive Mode resumes. */
public final class DailyNewspaperInstaller {
    private DailyNewspaperInstaller() { }

    public static void install(WorldPaths world) throws Exception {
        Objects.requireNonNull(world, "world");
        Class.forName("org.sqlite.JDBC");
        try (WorldLock ignored = WorldStorageContracts.acquireExclusiveLock(world);
             Connection connection = DriverManager.getConnection("jdbc:sqlite:" + world.database())) {
            try (Statement statement = connection.createStatement()) {
                statement.execute("PRAGMA foreign_keys=ON");
                statement.execute("PRAGMA busy_timeout=5000");
                statement.execute("PRAGMA journal_mode=WAL");
                statement.execute("PRAGMA synchronous=FULL");
            }
            DailyNewspaperArchive.ensureSchema(connection);
            try (Statement statement = connection.createStatement();
                 ResultSet result = statement.executeQuery(
                         "SELECT 1 FROM sqlite_master WHERE type='trigger' AND name='daily_newspaper_midnight_rollover'")) {
                if (!result.next()) throw new SQLException("Daily newspaper rollover trigger was not installed.");
            }
        }
    }
}
