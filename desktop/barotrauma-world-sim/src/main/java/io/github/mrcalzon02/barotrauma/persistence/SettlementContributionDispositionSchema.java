package io.github.mrcalzon02.barotrauma.persistence;

import java.util.List;

/** Schema 031: exact terminal disposition of every committed settlement-project contribution. */
public final class SettlementContributionDispositionSchema {
    private SettlementContributionDispositionSchema() { }

    public static List<String> statements() {
        return List.of(
                """
                CREATE TABLE settlement_project_contribution_disposition (
                    disposition_id TEXT PRIMARY KEY,
                    contribution_id TEXT NOT NULL UNIQUE,
                    project_id TEXT NOT NULL,
                    world_id TEXT NOT NULL,
                    contribution_kind TEXT NOT NULL CHECK(contribution_kind IN (
                        'MATERIALS','SUPPLIES','POPULATION','TRANSPORT','SECURITY','WORK')),
                    disposition TEXT NOT NULL CHECK(disposition IN (
                        'RETURNED','STRANDED','CONSUMED','LOST')),
                    quantity INTEGER NOT NULL CHECK(quantity > 0),
                    tick_sequence INTEGER NOT NULL CHECK(tick_sequence >= 0),
                    evidence_key TEXT NOT NULL UNIQUE,
                    summary TEXT NOT NULL,
                    FOREIGN KEY(contribution_id) REFERENCES settlement_project_contribution(contribution_id),
                    FOREIGN KEY(project_id) REFERENCES settlement_project(project_id),
                    FOREIGN KEY(world_id) REFERENCES world_metadata(world_id)
                )
                """,
                "CREATE INDEX settlement_contribution_disposition_tick_index ON "
                        + "settlement_project_contribution_disposition(world_id,tick_sequence DESC,project_id)",
                """
                CREATE TRIGGER settlement_contribution_disposition_insert_guard
                BEFORE INSERT ON settlement_project_contribution_disposition
                WHEN NOT EXISTS (
                    SELECT 1
                    FROM settlement_project_contribution c
                    JOIN settlement_project p ON p.project_id=c.project_id
                    WHERE c.contribution_id=NEW.contribution_id
                      AND c.project_id=NEW.project_id
                      AND c.world_id=NEW.world_id
                      AND c.contribution_kind=NEW.contribution_kind
                      AND c.quantity=NEW.quantity
                      AND p.status IN ('PLANNED','PREPARING','ACTIVE','BLOCKED'))
                BEGIN
                    SELECT RAISE(ABORT,'Settlement contribution disposition does not match an active commitment.');
                END
                """,
                """
                CREATE TRIGGER settlement_project_terminal_disposition_guard
                BEFORE UPDATE OF status ON settlement_project
                WHEN OLD.status<>NEW.status AND NEW.status IN ('FAILED','CANCELLED')
                  AND EXISTS (
                    SELECT 1
                    FROM settlement_project_contribution c
                    LEFT JOIN settlement_project_contribution_disposition d
                      ON d.contribution_id=c.contribution_id
                    WHERE c.project_id=NEW.project_id AND d.contribution_id IS NULL)
                BEGIN
                    SELECT RAISE(ABORT,'Settlement project retains undisposed physical commitments.');
                END
                """,
                """
                CREATE TRIGGER settlement_contribution_disposition_immutable_update
                BEFORE UPDATE ON settlement_project_contribution_disposition
                BEGIN
                    SELECT RAISE(ABORT,'Settlement contribution dispositions are immutable.');
                END
                """,
                """
                CREATE TRIGGER settlement_contribution_disposition_immutable_delete
                BEFORE DELETE ON settlement_project_contribution_disposition
                BEGIN
                    SELECT RAISE(ABORT,'Settlement contribution dispositions are immutable.');
                END
                """,
                """
                CREATE VIEW settlement_contribution_disposition_observation AS
                SELECT d.disposition_id,d.contribution_id,d.project_id,d.world_id,p.project_kind,p.status project_status,
                       d.contribution_kind,d.disposition,d.quantity,c.source_station_id,
                       COALESCE(s.display_name,'') source_station_name,c.source_population_id,
                       c.source_npc_vessel_id,COALESCE(v.display_name,'') source_vessel_name,c.related_flow_id,
                       d.tick_sequence,d.evidence_key,d.summary
                FROM settlement_project_contribution_disposition d
                JOIN settlement_project_contribution c ON c.contribution_id=d.contribution_id
                JOIN settlement_project p ON p.project_id=d.project_id
                LEFT JOIN world_station s ON s.station_id=c.source_station_id
                LEFT JOIN npc_vessel v ON v.npc_vessel_id=c.source_npc_vessel_id
                """,
                """
                CREATE VIEW settlement_project_disposition_completeness AS
                SELECT p.project_id,p.world_id,p.project_kind,p.status,
                       COUNT(c.contribution_id) contribution_count,
                       COUNT(d.contribution_id) disposed_count,
                       COUNT(c.contribution_id)-COUNT(d.contribution_id) pending_count
                FROM settlement_project p
                LEFT JOIN settlement_project_contribution c ON c.project_id=p.project_id
                LEFT JOIN settlement_project_contribution_disposition d ON d.contribution_id=c.contribution_id
                GROUP BY p.project_id,p.world_id,p.project_kind,p.status
                """
        );
    }
}
