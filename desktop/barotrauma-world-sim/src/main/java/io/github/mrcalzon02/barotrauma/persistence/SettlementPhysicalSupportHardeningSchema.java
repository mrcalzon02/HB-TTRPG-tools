package io.github.mrcalzon02.barotrauma.persistence;

import java.util.List;

/** Schema 032: hardens physical settlement-support source ownership and reuse constraints. */
public final class SettlementPhysicalSupportHardeningSchema {
    private SettlementPhysicalSupportHardeningSchema() { }

    public static List<String> statements() {
        return List.of(
                "CREATE UNIQUE INDEX settlement_one_nonterminal_vessel_project ON "
                        + "settlement_project(assigned_npc_vessel_id) WHERE assigned_npc_vessel_id IS NOT NULL "
                        + "AND status IN ('PLANNED','PREPARING','ACTIVE','BLOCKED')",
                "CREATE INDEX settlement_contribution_vessel_source_index ON "
                        + "settlement_project_contribution(source_npc_vessel_id,contribution_kind,project_id)",
                "CREATE INDEX settlement_contribution_flow_source_index ON "
                        + "settlement_project_contribution(related_flow_id,contribution_kind,project_id)",
                """
                CREATE TRIGGER settlement_contribution_source_shape_guard
                BEFORE INSERT ON settlement_project_contribution
                WHEN NOT (
                    (NEW.contribution_kind IN ('MATERIALS','SUPPLIES','SECURITY')
                        AND NEW.source_station_id IS NOT NULL
                        AND NEW.source_population_id IS NULL
                        AND NEW.source_npc_vessel_id IS NULL
                        AND NEW.related_flow_id IS NULL)
                    OR (NEW.contribution_kind='POPULATION'
                        AND NEW.source_station_id IS NOT NULL
                        AND NEW.source_population_id IS NOT NULL
                        AND NEW.source_npc_vessel_id IS NULL
                        AND NEW.related_flow_id IS NOT NULL)
                    OR (NEW.contribution_kind='TRANSPORT'
                        AND NEW.source_station_id IS NOT NULL
                        AND NEW.source_population_id IS NULL
                        AND NEW.source_npc_vessel_id IS NOT NULL
                        AND NEW.related_flow_id IS NULL)
                    OR (NEW.contribution_kind='WORK'
                        AND NEW.source_station_id IS NULL
                        AND NEW.source_population_id IS NULL
                        AND NEW.source_npc_vessel_id IS NULL
                        AND NEW.related_flow_id IS NULL))
                BEGIN
                    SELECT RAISE(ABORT,'Settlement contribution source shape is inconsistent with its kind.');
                END
                """,
                """
                CREATE TRIGGER settlement_contribution_project_authority_guard
                BEFORE INSERT ON settlement_project_contribution
                WHEN NOT EXISTS (
                    SELECT 1
                    FROM settlement_project p
                    WHERE p.project_id=NEW.project_id AND p.world_id=NEW.world_id
                      AND (
                        (NEW.contribution_kind IN ('MATERIALS','SUPPLIES')
                            AND NEW.source_station_id=p.origin_station_id)
                        OR (NEW.contribution_kind='SECURITY'
                            AND NEW.source_station_id=COALESCE(p.target_station_id,p.origin_station_id))
                        OR (NEW.contribution_kind='TRANSPORT'
                            AND NEW.source_station_id=p.origin_station_id
                            AND NEW.source_npc_vessel_id=p.assigned_npc_vessel_id)
                        OR (NEW.contribution_kind='WORK' AND p.status='ACTIVE')
                        OR (NEW.contribution_kind='POPULATION'
                            AND NEW.source_station_id=p.origin_station_id
                            AND NEW.source_population_id=p.related_population_id
                            AND EXISTS (
                                SELECT 1 FROM population_flow f
                                WHERE f.flow_id=NEW.related_flow_id AND f.world_id=NEW.world_id
                                  AND f.entity_type='NPC_POPULATION' AND f.status='ARRIVED'
                                  AND f.arrived_quantity>=NEW.quantity
                                  AND ((p.project_kind='FOUNDING'
                                        AND f.destination_mode='FOUNDING_SITE'
                                        AND f.settlement_project_id=p.project_id
                                        AND f.destination_location_id=p.target_location_id)
                                    OR (p.project_kind<>'FOUNDING'
                                        AND f.destination_mode='STATION_POPULATION'
                                        AND f.destination_station_id=p.target_station_id))))))
                BEGIN
                    SELECT RAISE(ABORT,'Settlement contribution is not authorized by its project and physical source.');
                END
                """,
                """
                CREATE TRIGGER settlement_contribution_population_flow_single_use
                BEFORE INSERT ON settlement_project_contribution
                WHEN NEW.contribution_kind='POPULATION'
                  AND EXISTS (
                      SELECT 1 FROM settlement_project_contribution c
                      WHERE c.contribution_kind='POPULATION'
                        AND c.related_flow_id=NEW.related_flow_id
                        AND c.project_id<>NEW.project_id)
                BEGIN
                    SELECT RAISE(ABORT,'Population flow already supports another settlement project.');
                END
                """
        );
    }
}
