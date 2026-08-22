package io.github.mrcalzon02.barotrauma.persistence;

import java.util.List;

/** Schema 037: immutable one-edition-per-simulation-day newspaper archive and frozen ticker articles. */
public final class DailyNewspaperSchema {
    private DailyNewspaperSchema() { }

    public static List<String> statements() {
        return List.of(
                "CREATE TABLE IF NOT EXISTS daily_newspaper_edition ("
                        + "edition_id TEXT PRIMARY KEY, world_id TEXT NOT NULL, edition_date TEXT NOT NULL, "
                        + "period_start_time TEXT NOT NULL, period_end_time TEXT NOT NULL, "
                        + "start_tick INTEGER NOT NULL CHECK(start_tick>=0), end_tick INTEGER NOT NULL CHECK(end_tick>=start_tick), "
                        + "sealed_tick INTEGER NOT NULL CHECK(sealed_tick>end_tick), sealed_time TEXT NOT NULL, "
                        + "masthead TEXT NOT NULL, lead_headline TEXT NOT NULL, article_count INTEGER NOT NULL DEFAULT 0 CHECK(article_count>=0), "
                        + "top_severity INTEGER NOT NULL DEFAULT 0 CHECK(top_severity BETWEEN 0 AND 100), "
                        + "UNIQUE(world_id,edition_date), FOREIGN KEY(world_id) REFERENCES world_metadata(world_id))",
                "CREATE INDEX IF NOT EXISTS daily_newspaper_edition_date_index ON daily_newspaper_edition(world_id,edition_date DESC)",
                "CREATE TABLE IF NOT EXISTS daily_newspaper_article ("
                        + "article_id TEXT PRIMARY KEY, edition_id TEXT NOT NULL, world_id TEXT NOT NULL, source_key TEXT NOT NULL, "
                        + "source_tick INTEGER NOT NULL CHECK(source_tick>=0), source_category TEXT NOT NULL, severity INTEGER NOT NULL CHECK(severity BETWEEN 0 AND 100), "
                        + "station_id TEXT, station_name TEXT NOT NULL, headline TEXT NOT NULL, dek TEXT NOT NULL, body TEXT NOT NULL, "
                        + "conditions_snapshot TEXT NOT NULL, evidence_summary TEXT NOT NULL, article_order INTEGER NOT NULL CHECK(article_order>=0), "
                        + "UNIQUE(edition_id,source_key), FOREIGN KEY(edition_id) REFERENCES daily_newspaper_edition(edition_id) ON DELETE CASCADE, "
                        + "FOREIGN KEY(world_id) REFERENCES world_metadata(world_id), FOREIGN KEY(station_id) REFERENCES world_station(station_id))",
                "CREATE INDEX IF NOT EXISTS daily_newspaper_article_edition_index ON daily_newspaper_article(edition_id,article_order,severity DESC,source_tick DESC)",
                "CREATE VIEW IF NOT EXISTS daily_newspaper_observation AS "
                        + "SELECT e.edition_id,e.world_id,e.edition_date,e.period_start_time,e.period_end_time,e.start_tick,e.end_tick,"
                        + "e.sealed_tick,e.sealed_time,e.masthead,e.lead_headline,e.article_count,e.top_severity,"
                        + "a.article_id,a.source_key,a.source_tick,a.source_category,a.severity,a.station_id,a.station_name,"
                        + "a.headline,a.dek,a.body,a.conditions_snapshot,a.evidence_summary,a.article_order "
                        + "FROM daily_newspaper_edition e LEFT JOIN daily_newspaper_article a ON a.edition_id=e.edition_id"
        );
    }
}
