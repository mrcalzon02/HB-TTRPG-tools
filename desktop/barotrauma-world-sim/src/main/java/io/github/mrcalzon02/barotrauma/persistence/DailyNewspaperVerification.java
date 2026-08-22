package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Comparator;
import java.util.Locale;

/** Acceptance contract for prior-day newspaper sealing, frozen conditions, and archive immutability. */
public final class DailyNewspaperVerification {
    private DailyNewspaperVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        Path root = Files.createTempDirectory("barotrauma-daily-news-");
        WorldPaths world = null;
        try {
            world = DefaultWorldGenerator.create(root.resolve("world"), "Daily Newspaper Verification").paths();
            DailyNewspaperInstaller.install(world);

            try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + world.database())) {
                configure(connection);
                String worldId = text(connection, "SELECT world_id FROM world_metadata LIMIT 1");
                String stationId = text(connection, "SELECT station_id FROM world_station ORDER BY station_id LIMIT 1");
                String stationName = text(connection,
                        "SELECT display_name FROM world_station WHERE station_id='" + sql(stationId) + "'");

                try (Statement statement = connection.createStatement()) {
                    // Move backward to a deterministic test minute; the rollover trigger only seals forward date changes.
                    statement.executeUpdate("UPDATE world_simulation_metadata SET canonical_time='2175-01-01T23:59:00Z',"
                            + "current_tick_sequence=1439,tick_size_seconds=60,tick_size_nanos=0 WHERE world_id='"
                            + sql(worldId) + "'");
                    statement.executeUpdate("UPDATE station_simulation_state SET credits=43210,supplies=321,ore=77,"
                            + "industry=68,security=73,integrity=91,threat=24,research=19 WHERE station_id='"
                            + sql(stationId) + "'");
                }

                try (PreparedStatement event = connection.prepareStatement(
                        "INSERT INTO station_event(event_id,world_id,station_id,tick_sequence,canonical_time,event_type,"
                                + "severity,headline,narrative,cause_type,deterministic_key,visibility,correlation_id,"
                                + "policy_version,created_at) VALUES(?,?,?,?,?,'ACCIDENT',5,?,?,?,?, 'OBSERVED',?,1,?)")) {
                    event.setString(1, "daily-news-verification-event");
                    event.setString(2, worldId);
                    event.setString(3, stationId);
                    event.setLong(4, 1439L);
                    event.setString(5, "2175-01-01T23:59:00Z");
                    event.setString(6, "Pressure incident closes station concourse");
                    event.setString(7, "A late-watch pressure incident forced emergency isolation and repair activity.");
                    event.setString(8, "DAILY_NEWS_VERIFICATION");
                    event.setString(9, "daily-news-verification:2175-01-01");
                    event.setString(10, "daily-news-verification:2175-01-01");
                    event.setString(11, "2175-01-01T23:59:00Z");
                    event.executeUpdate();
                }

                try (Statement statement = connection.createStatement()) {
                    statement.executeUpdate("UPDATE world_simulation_metadata SET canonical_time='2175-01-02T00:00:00Z',"
                            + "current_tick_sequence=1440 WHERE world_id='" + sql(worldId) + "'");
                }

                require(scalar(connection, "SELECT COUNT(*) FROM daily_newspaper_edition WHERE world_id='"
                        + sql(worldId) + "' AND edition_date='2175-01-01'") == 1,
                        "Midnight did not seal exactly one prior-day edition.");
                require(scalar(connection, "SELECT COUNT(*) FROM daily_newspaper_edition WHERE world_id='"
                        + sql(worldId) + "' AND edition_date='2175-01-02'") == 0,
                        "The in-progress simulation day was incorrectly published.");
                require(scalar(connection, "SELECT article_count FROM daily_newspaper_edition WHERE world_id='"
                        + sql(worldId) + "' AND edition_date='2175-01-01'") >= 1,
                        "Sealed edition contains no article.");

                String articleId = text(connection, "SELECT article_id FROM daily_newspaper_article WHERE source_key="
                        + "'station:daily-news-verification-event' LIMIT 1");
                String originalBody = text(connection,
                        "SELECT body FROM daily_newspaper_article WHERE article_id='" + sql(articleId) + "'");
                String originalConditions = text(connection,
                        "SELECT conditions_snapshot FROM daily_newspaper_article WHERE article_id='" + sql(articleId) + "'");
                require(originalBody.contains("Pressure incident closes station concourse")
                                && originalBody.contains(stationName.toUpperCase(Locale.ROOT)),
                        "Synthesized article did not preserve its committed event and station of origin.");
                require(originalConditions.contains("Credits: 43210")
                                && originalConditions.contains("Supplies: 321")
                                && originalConditions.contains("Security: 73")
                                && originalConditions.contains("Integrity: 91"),
                        "Article did not freeze the expected end-of-day station conditions.");

                try (Statement statement = connection.createStatement()) {
                    statement.executeUpdate("UPDATE station_simulation_state SET credits=1,supplies=1,security=1,integrity=1 "
                            + "WHERE station_id='" + sql(stationId) + "'");
                    statement.executeUpdate("UPDATE world_simulation_metadata SET canonical_time='2175-01-02T00:01:00Z',"
                            + "current_tick_sequence=1441 WHERE world_id='" + sql(worldId) + "'");
                }
                require(originalBody.equals(text(connection,
                                "SELECT body FROM daily_newspaper_article WHERE article_id='" + sql(articleId) + "'"))
                                && originalConditions.equals(text(connection,
                                "SELECT conditions_snapshot FROM daily_newspaper_article WHERE article_id='" + sql(articleId) + "'")),
                        "Later world state rewrote a sealed newspaper article.");
                require(scalar(connection, "SELECT COUNT(*) FROM daily_newspaper_edition WHERE world_id='"
                        + sql(worldId) + "' AND edition_date='2175-01-01'") == 1,
                        "Non-midnight progression duplicated a sealed edition.");

                requireRejected(connection,
                        "UPDATE daily_newspaper_article SET headline='Rewritten' WHERE article_id='" + sql(articleId) + "'",
                        "Sealed newspaper articles are immutable.");
                requireRejected(connection,
                        "DELETE FROM daily_newspaper_article WHERE article_id='" + sql(articleId) + "'",
                        "Sealed newspaper articles are immutable.");
                String editionId = text(connection, "SELECT edition_id FROM daily_newspaper_edition WHERE world_id='"
                        + sql(worldId) + "' AND edition_date='2175-01-01'");
                requireRejected(connection,
                        "UPDATE daily_newspaper_edition SET lead_headline='Rewritten' WHERE edition_id='" + sql(editionId) + "'",
                        "Finalized newspaper editions are immutable.");
                requireRejected(connection,
                        "DELETE FROM daily_newspaper_edition WHERE edition_id='" + sql(editionId) + "'",
                        "Sealed newspaper editions are immutable.");
            }
        } finally {
            deleteTree(root);
        }
    }

    private static void requireRejected(Connection connection, String sql, String expected) throws Exception {
        try (Statement statement = connection.createStatement()) {
            statement.executeUpdate(sql);
            throw new IllegalStateException("Archive mutation unexpectedly succeeded: " + sql);
        } catch (SQLException exception) {
            if (exception.getMessage() == null || !exception.getMessage().contains(expected)) throw exception;
        }
    }

    private static long scalar(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new SQLException("Daily newspaper verification scalar returned no row.");
            return result.getLong(1);
        }
    }

    private static String text(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new SQLException("Daily newspaper verification query returned no row: " + sql);
            return result.getString(1);
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

    private static String sql(String value) { return value.replace("'", "''"); }

    private static void deleteTree(Path root) throws Exception {
        if (!Files.exists(root)) return;
        try (var stream = Files.walk(root)) {
            for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) {
                try { Files.deleteIfExists(path); } catch (Exception ignored) { }
            }
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Daily newspaper midnight snapshot and immutability verification passed.");
    }
}
