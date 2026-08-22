package io.github.mrcalzon02.barotrauma.persistence;

import java.util.List;

/** Database guards that make completed Daily Observer editions genuinely immutable. */
public final class DailyNewspaperHardening {
    private DailyNewspaperHardening() { }

    public static List<String> statements() {
        return List.of(
                """
                CREATE TRIGGER IF NOT EXISTS daily_newspaper_article_immutable_update
                BEFORE UPDATE ON daily_newspaper_article
                BEGIN
                    SELECT RAISE(ABORT,'Sealed newspaper articles are immutable.');
                END
                """,
                """
                CREATE TRIGGER IF NOT EXISTS daily_newspaper_article_immutable_delete
                BEFORE DELETE ON daily_newspaper_article
                BEGIN
                    SELECT RAISE(ABORT,'Sealed newspaper articles are immutable.');
                END
                """,
                """
                CREATE TRIGGER IF NOT EXISTS daily_newspaper_edition_immutable_delete
                BEFORE DELETE ON daily_newspaper_edition
                BEGIN
                    SELECT RAISE(ABORT,'Sealed newspaper editions are immutable.');
                END
                """,
                """
                CREATE TRIGGER IF NOT EXISTS daily_newspaper_edition_immutable_update
                BEFORE UPDATE ON daily_newspaper_edition
                WHEN OLD.article_count > 0
                BEGIN
                    SELECT RAISE(ABORT,'Finalized newspaper editions are immutable.');
                END
                """
        );
    }
}
