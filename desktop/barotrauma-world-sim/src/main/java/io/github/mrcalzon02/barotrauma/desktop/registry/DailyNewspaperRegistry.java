package io.github.mrcalzon02.barotrauma.desktop.registry;

import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/** Read-only access and presentation helpers for sealed daily newspaper editions. */
public final class DailyNewspaperRegistry {
    private static final DateTimeFormatter DISPLAY_DATE = DateTimeFormatter.ofPattern("MMMM d, uuuu");
    private static final int EDITION_LIMIT = 90;

    private DailyNewspaperRegistry() { }

    public static Snapshot load(WorldPaths world) throws Exception {
        Objects.requireNonNull(world, "world");
        Class.forName("org.sqlite.JDBC");
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + world.database())) {
            configureReadOnly(connection);
            if (!tableExists(connection, "daily_newspaper_edition")) return Snapshot.empty();
            List<Edition> editions = editions(connection);
            if (editions.isEmpty()) return new Snapshot(editions, null, List.of());
            Edition latest = editions.get(0);
            return new Snapshot(editions, latest, articles(connection, latest.editionId()));
        }
    }

    public static Snapshot loadEdition(WorldPaths world, String editionId) throws Exception {
        Objects.requireNonNull(world, "world");
        Objects.requireNonNull(editionId, "editionId");
        Class.forName("org.sqlite.JDBC");
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + world.database())) {
            configureReadOnly(connection);
            if (!tableExists(connection, "daily_newspaper_edition")) return Snapshot.empty();
            List<Edition> editions = editions(connection);
            Edition selected = editions.stream().filter(row -> editionId.equals(row.editionId())).findFirst().orElse(null);
            return new Snapshot(editions, selected,
                    selected == null ? List.of() : articles(connection, selected.editionId()));
        }
    }

    public static String renderArticle(Edition edition, Article article) {
        if (edition == null || article == null) return "No newspaper article selected.\n";
        return edition.masthead() + "\n"
                + DISPLAY_DATE.format(LocalDate.parse(edition.editionDate())) + "\n"
                + "────────────────────────────────────────────────────────────\n\n"
                + article.body() + "\n\n"
                + "FROZEN CONDITIONS SNAPSHOT\n"
                + article.conditionsSnapshot() + "\n\n"
                + "ARCHIVED EVIDENCE\n"
                + article.evidenceSummary() + "\n\n"
                + "Edition sealed at simulation tick " + edition.sealedTick() + " · " + edition.sealedTime() + "\n";
    }

    public static String renderEdition(Edition edition, List<Article> articles) {
        if (edition == null) {
            return "THE EUROPA DAILY OBSERVER\n\nNo completed simulation-day edition has been sealed yet.\n"
                    + "The first paper will close when canonical simulation time crosses midnight.\n";
        }
        StringBuilder out = new StringBuilder();
        out.append(edition.masthead()).append("\n")
                .append(DISPLAY_DATE.format(LocalDate.parse(edition.editionDate()))).append("\n")
                .append("Edition for events of the previous completed simulation day\n")
                .append("════════════════════════════════════════════════════════════\n\n")
                .append("LEAD STORY\n").append(edition.leadHeadline()).append("\n\n")
                .append("TODAY'S INDEX\n");
        for (int index = 0; index < articles.size(); index++) {
            Article article = articles.get(index);
            out.append(index + 1).append(". [").append(article.sourceCategory()).append("] ")
                    .append(article.headline()).append(" — ").append(article.stationName())
                    .append(" · sev ").append(article.severity()).append("\n");
        }
        out.append("\n════════════════════════════════════════════════════════════\n");
        for (Article article : articles) {
            out.append("\n").append(article.body()).append("\n\n")
                    .append("Frozen conditions:\n").append(article.conditionsSnapshot()).append("\n")
                    .append("────────────────────────────────────────────────────────────\n");
        }
        out.append("\nEND OF EDITION\n")
                .append("Sealed at tick ").append(edition.sealedTick()).append(" · ").append(edition.sealedTime()).append("\n")
                .append("Later events are excluded by design and belong to the next daily edition.\n");
        return out.toString();
    }

    private static List<Edition> editions(Connection connection) throws SQLException {
        List<Edition> rows = new ArrayList<>();
        try (Statement statement = connection.createStatement(); ResultSet r = statement.executeQuery(
                "SELECT edition_id,edition_date,period_start_time,period_end_time,start_tick,end_tick,sealed_tick,sealed_time,"
                        + "masthead,lead_headline,article_count,top_severity FROM daily_newspaper_edition "
                        + "ORDER BY edition_date DESC LIMIT " + EDITION_LIMIT)) {
            while (r.next()) rows.add(new Edition(r.getString(1),r.getString(2),r.getString(3),r.getString(4),
                    r.getLong(5),r.getLong(6),r.getLong(7),r.getString(8),r.getString(9),r.getString(10),
                    r.getInt(11),r.getInt(12)));
        }
        return List.copyOf(rows);
    }

    private static List<Article> articles(Connection connection, String editionId) throws SQLException {
        List<Article> rows = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT article_id,source_key,source_tick,source_category,severity,station_id,station_name,headline,dek,body,"
                        + "conditions_snapshot,evidence_summary,article_order FROM daily_newspaper_article WHERE edition_id=? "
                        + "ORDER BY severity DESC,source_tick DESC,source_key")) {
            statement.setString(1, editionId);
            try (ResultSet r = statement.executeQuery()) {
                while (r.next()) rows.add(new Article(r.getString(1),r.getString(2),r.getLong(3),r.getString(4),
                        r.getInt(5),r.getString(6),r.getString(7),r.getString(8),r.getString(9),r.getString(10),
                        r.getString(11),r.getString(12),r.getInt(13)));
            }
        }
        return List.copyOf(rows);
    }

    private static void configureReadOnly(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys=ON");
            statement.execute("PRAGMA busy_timeout=5000");
            statement.execute("PRAGMA query_only=ON");
        }
        try (Statement statement = connection.createStatement(); ResultSet r = statement.executeQuery("PRAGMA query_only")) {
            if (!r.next() || r.getInt(1) != 1) throw new SQLException("Daily newspaper observer connection is not query-only.");
        }
    }

    private static boolean tableExists(Connection connection, String table) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?")) {
            statement.setString(1, table);
            try (ResultSet r = statement.executeQuery()) { return r.next(); }
        }
    }

    public record Edition(String editionId, String editionDate, String periodStartTime, String periodEndTime,
                          long startTick, long endTick, long sealedTick, String sealedTime, String masthead,
                          String leadHeadline, int articleCount, int topSeverity) { }

    public record Article(String articleId, String sourceKey, long sourceTick, String sourceCategory, int severity,
                          String stationId, String stationName, String headline, String dek, String body,
                          String conditionsSnapshot, String evidenceSummary, int articleOrder) {
        @Override public String toString() {
            return "[" + sourceCategory + "] " + headline + " · " + stationName + " · sev " + severity;
        }
    }

    public record Snapshot(List<Edition> editions, Edition selectedEdition, List<Article> articles) {
        public Snapshot {
            editions = List.copyOf(editions);
            articles = List.copyOf(articles);
        }
        static Snapshot empty() { return new Snapshot(List.of(), null, List.of()); }
    }
}
