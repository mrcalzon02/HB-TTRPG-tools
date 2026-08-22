package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldLock;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;
import java.util.Objects;

/** Installs the idempotent daily-newspaper archive objects before Passive Mode resumes. */
public final class DailyNewspaperInstaller {
    private static final List<String> REQUIRED_TRIGGERS = List.of(
            "daily_newspaper_midnight_rollover",
            "daily_newspaper_article_immutable_update",
            "daily_newspaper_article_immutable_delete",
            "daily_newspaper_edition_immutable_delete",
            "daily_newspaper_edition_immutable_update"
    );

    private DailyNewspaperInstaller() { }

    public static void install(WorldPaths world) throws Exception {
        Objects.requireNonNull(world, "world");
        Class.forName("org.sqlite.JDBC");
        try (WorldLock ignored = WorldStorageContracts.acquireExclusiveLock(world);
             Connection connection = DriverManager.getConnection("jdbc:sqlite:" + world.database())) {
            configure(connection);
            DailyNewspaperArchive.ensureSchema(connection);
            try (Statement statement = connection.createStatement()) {
                for (String sql : DailyNewspaperHardening.statements()) statement.execute(sql);
            }
            for (String trigger : REQUIRED_TRIGGERS) requireTrigger(connection, trigger);
        }
    }

    static void install(Connection connection) throws SQLException {
        Objects.requireNonNull(connection, "connection");
        configure(connection);
        DailyNewspaperArchive.ensureSchema(connection);
        try (Statement statement = connection.createStatement()) {
            for (String sql : DailyNewspaperHardening.statements()) statement.execute(sql);
        }
        for (String trigger : REQUIRED_TRIGGERS) requireTrigger(connection, trigger);
    }

    private static void requireTrigger(Connection connection, String trigger) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT 1 FROM sqlite_master WHERE type='trigger' AND name=?")) {
            statement.setString(1, trigger);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Daily newspaper trigger was not installed: " + trigger);
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
}
