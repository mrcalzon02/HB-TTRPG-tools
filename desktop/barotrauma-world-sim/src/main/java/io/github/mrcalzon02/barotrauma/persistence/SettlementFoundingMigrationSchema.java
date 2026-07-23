package io.github.mrcalzon02.barotrauma.persistence;

import java.util.List;

/** Schema 030: staged founding-site migration and one-to-one conserved station handoff. */
public final class SettlementFoundingMigrationSchema {
    private SettlementFoundingMigrationSchema() { }

    public static List<String> statements() {
        return List.of(
                "ALTER TABLE population_flow ADD COLUMN destination_mode TEXT NOT NULL DEFAULT 'STATION_POPULATION' "
                        + "CHECK(destination_mode IN ('STATION_POPULATION','FOUNDING_SITE'))",
                "ALTER TABLE population_flow ADD COLUMN settlement_project_id TEXT REFERENCES settlement_project(project_id)",
                "CREATE INDEX population_flow_founding_project_index ON population_flow(settlement_project_id,status,updated_tick DESC)",
                """
                CREATE TABLE settlement_founding_handoff (
                    project_id TEXT PRIMARY KEY,
                    flow_id TEXT NOT NULL UNIQUE,
                    world_id TEXT NOT NULL,
                    station_id TEXT NOT NULL UNIQUE,
                    population_id TEXT NOT NULL UNIQUE,
                    settled_quantity INTEGER NOT NULL CHECK(settled_quantity > 0),
                    handoff_tick INTEGER NOT NULL CHECK(handoff_tick >= 0),
                    evidence_key TEXT NOT NULL UNIQUE,
                    summary TEXT NOT NULL,
                    FOREIGN KEY(project_id) REFERENCES settlement_project(project_id),
                    FOREIGN KEY(flow_id) REFERENCES population_flow(flow_id),
                    FOREIGN KEY(world_id) REFERENCES world_metadata(world_id),
                    FOREIGN KEY(station_id) REFERENCES world_station(station_id),
                    FOREIGN KEY(population_id) REFERENCES npc_population_state(population_id)
                )
                """,
                """
                CREATE TABLE settlement_founding_handoff_cohort (
                    project_id TEXT NOT NULL,
                    cohort_key TEXT NOT NULL CHECK(cohort_key IN (
                        'CIVILIANS','INDUSTRIAL_WORKERS','LOGISTICS_WORKERS','SECURITY_PERSONNEL',
                        'MEDICAL_PERSONNEL','SCIENTIFIC_PERSONNEL','TEMPORARY_RESIDENTS','REFUGEES')),
                    quantity INTEGER NOT NULL CHECK(quantity >= 0),
                    PRIMARY KEY(project_id,cohort_key),
                    FOREIGN KEY(project_id) REFERENCES settlement_founding_handoff(project_id) ON DELETE CASCADE
                )
                """,
                """
                CREATE TRIGGER settlement_founding_population_seed_after_station
                AFTER INSERT ON station_simulation_state
                WHEN EXISTS (SELECT 1 FROM station_civilization_state c WHERE c.station_id=NEW.station_id)
                  AND NOT EXISTS (SELECT 1 FROM npc_population_state p WHERE p.station_id=NEW.station_id)
                BEGIN
                    INSERT OR IGNORE INTO npc_population_state(
                        population_id,world_id,station_id,civilians,industrial_workers,logistics_workers,
                        security_personnel,medical_personnel,scientific_personnel,temporary_residents,refugees,
                        housing_capacity,life_support_capacity,employment_capacity,morale,seed_source,last_tick)
                    SELECT substr(NEW.world_id,1,24)||printf('%012x',(wl.source_ordinal*16+1)%281474976710655),
                           NEW.world_id,NEW.station_id,
                           CASE WHEN c.frontier_state='ABANDONED' THEN 0 ELSE c.population_index*5 END,
                           CASE WHEN c.frontier_state='ABANDONED' THEN 0 ELSE c.population_index*NEW.industry/25 END,
                           CASE WHEN c.frontier_state='ABANDONED' THEN 0 ELSE c.population_index*2 END,
                           CASE WHEN c.frontier_state='ABANDONED' THEN 0 ELSE c.population_index*NEW.security/30 END,
                           CASE WHEN c.frontier_state='ABANDONED' THEN 0 ELSE c.population_index/10 END,
                           CASE WHEN c.frontier_state='ABANDONED' THEN 0 ELSE c.population_index/12 END,
                           CASE WHEN c.frontier_state='ABANDONED' THEN 0 ELSE c.surplus_ticks END,
                           CASE WHEN c.frontier_state='ABANDONED' THEN 0 ELSE c.shortage_ticks END,
                           CASE WHEN c.frontier_state='ABANDONED' THEN 0 ELSE c.population_index*12+NEW.industry*5 END,
                           CASE WHEN c.frontier_state='ABANDONED' THEN 0 ELSE c.population_index*14+NEW.supplies*2 END,
                           CASE WHEN c.frontier_state='ABANDONED' THEN 0 ELSE c.population_index*8+NEW.industry*8 END,
                           MAX(0,MIN(100,c.civilization_strength+NEW.supplies/4-NEW.threat/4)),
                           'SCHEMA_030_FOUNDING_ZERO_SEED',MAX(c.last_tick,NEW.last_tick)
                    FROM station_civilization_state c
                    JOIN world_station ws ON ws.station_id=NEW.station_id
                    JOIN world_location wl ON wl.location_id=ws.location_id
                    WHERE c.station_id=NEW.station_id;
                END
                """,
                """
                CREATE TRIGGER population_flow_destination_mode_insert_guard
                BEFORE INSERT ON population_flow
                WHEN NEW.entity_type='NPC_POPULATION' AND (
                    (COALESCE(NEW.destination_mode,'STATION_POPULATION')='STATION_POPULATION' AND
                        (NEW.destination_population_id IS NULL OR NEW.destination_station_id IS NULL OR
                         NEW.settlement_project_id IS NOT NULL)) OR
                    (COALESCE(NEW.destination_mode,'STATION_POPULATION')='FOUNDING_SITE' AND
                        (NEW.destination_population_id IS NOT NULL OR NEW.destination_station_id IS NOT NULL OR
                         NEW.settlement_project_id IS NULL OR NEW.flow_kind<>'ORDINARY_MIGRATION' OR
                         NOT EXISTS (
                             SELECT 1 FROM settlement_project p
                             WHERE p.project_id=NEW.settlement_project_id AND p.world_id=NEW.world_id
                               AND p.project_kind='FOUNDING' AND p.target_location_id=NEW.destination_location_id)))
                )
                BEGIN
                    SELECT RAISE(ABORT,'Population flow destination mode is inconsistent.');
                END
                """,
                """
                CREATE TRIGGER population_flow_destination_mode_update_guard
                BEFORE UPDATE OF destination_mode,destination_population_id,destination_station_id,
                                 settlement_project_id,destination_location_id,flow_kind
                ON population_flow
                WHEN NEW.entity_type='NPC_POPULATION' AND (
                    (NEW.destination_mode='STATION_POPULATION' AND
                        (NEW.destination_population_id IS NULL OR NEW.destination_station_id IS NULL OR
                         NEW.settlement_project_id IS NOT NULL)) OR
                    (NEW.destination_mode='FOUNDING_SITE' AND
                        (NEW.destination_population_id IS NOT NULL OR NEW.destination_station_id IS NOT NULL OR
                         NEW.settlement_project_id IS NULL OR NEW.flow_kind<>'ORDINARY_MIGRATION' OR
                         NOT EXISTS (
                             SELECT 1 FROM settlement_project p
                             WHERE p.project_id=NEW.settlement_project_id AND p.world_id=NEW.world_id
                               AND p.project_kind='FOUNDING' AND p.target_location_id=NEW.destination_location_id)))
                )
                BEGIN
                    SELECT RAISE(ABORT,'Population flow destination mode is inconsistent.');
                END
                """,
                """
                CREATE TRIGGER settlement_founding_handoff_guard
                BEFORE INSERT ON settlement_founding_handoff
                WHEN NOT EXISTS (
                    SELECT 1
                    FROM settlement_project p
                    JOIN population_flow f ON f.flow_id=NEW.flow_id
                    JOIN world_station s ON s.station_id=NEW.station_id
                    JOIN npc_population_state n ON n.population_id=NEW.population_id
                    WHERE p.project_id=NEW.project_id AND p.world_id=NEW.world_id
                      AND p.project_kind='FOUNDING' AND p.status='COMPLETE'
                      AND f.world_id=NEW.world_id AND f.settlement_project_id=p.project_id
                      AND f.destination_mode='FOUNDING_SITE' AND f.status='ARRIVED'
                      AND f.origin_released=1
                      AND f.destination_location_id=p.target_location_id
                      AND f.arrived_quantity=NEW.settled_quantity
                      AND s.world_id=NEW.world_id AND s.location_id=p.target_location_id
                      AND n.world_id=NEW.world_id AND n.station_id=s.station_id
                      AND (n.civilians+n.industrial_workers+n.logistics_workers+n.security_personnel+
                           n.medical_personnel+n.scientific_personnel+n.temporary_residents+n.refugees)
                          =NEW.settled_quantity
                )
                BEGIN
                    SELECT RAISE(ABORT,'Founding handoff is not fully conserved.');
                END
                """,
                """
                CREATE TRIGGER settlement_founding_handoff_population_baseline
                AFTER INSERT ON settlement_founding_handoff
                BEGIN
                    DELETE FROM station_population_state WHERE station_id=NEW.station_id;
                    INSERT INTO station_population_state(
                        station_id,world_id,baseline_kind,baseline_tick,baseline_resident_count,resident_count,
                        baseline_workforce_count,workforce_count,last_tick)
                    SELECT NEW.station_id,NEW.world_id,'GENERATED_ALLOCATION',NEW.handoff_tick,NEW.settled_quantity,
                           NEW.settled_quantity,
                           n.industrial_workers+n.logistics_workers+n.security_personnel+
                           n.medical_personnel+n.scientific_personnel,
                           n.industrial_workers+n.logistics_workers+n.security_personnel+
                           n.medical_personnel+n.scientific_personnel,NEW.handoff_tick
                    FROM npc_population_state n WHERE n.population_id=NEW.population_id;
                END
                """,
                "DROP VIEW IF EXISTS npc_population_migration_conservation",
                """
                CREATE VIEW npc_population_migration_conservation AS
                SELECT w.world_id,
                       COALESCE((SELECT SUM(civilians+industrial_workers+logistics_workers+security_personnel+
                                                   medical_personnel+scientific_personnel+temporary_residents+refugees)
                                 FROM npc_population_state p WHERE p.world_id=w.world_id),0) station_population,
                       COALESCE((SELECT SUM(CASE
                                   WHEN f.destination_mode='FOUNDING_SITE'
                                   THEN f.embarked_quantity-f.returned_quantity-f.losses-
                                        COALESCE(h.settled_quantity,0)
                                   ELSE f.embarked_quantity-f.arrived_quantity-f.returned_quantity-f.losses
                               END)
                                 FROM population_flow f
                                 LEFT JOIN settlement_founding_handoff h ON h.flow_id=f.flow_id
                                 WHERE f.world_id=w.world_id AND f.entity_type='NPC_POPULATION'
                                   AND f.origin_released=1),0) population_in_flows,
                       COALESCE((SELECT SUM(losses) FROM population_flow f WHERE f.world_id=w.world_id
                                 AND f.entity_type='NPC_POPULATION'),0) recorded_migration_losses
                FROM world_metadata w
                """,
                """
                CREATE VIEW settlement_founding_migration_observation AS
                SELECT f.flow_id,f.world_id,f.settlement_project_id project_id,p.status project_status,
                       f.status flow_status,f.updated_tick,f.population_id origin_population_id,f.origin_station_id,
                       f.origin_location_id,f.destination_location_id,f.assigned_npc_vessel_id,
                       f.quantity,f.embarked_quantity,f.arrived_quantity,f.losses,f.stranded_quantity,
                       h.station_id,h.population_id founded_population_id,h.settled_quantity,h.handoff_tick,
                       h.evidence_key,h.summary
                FROM population_flow f
                JOIN settlement_project p ON p.project_id=f.settlement_project_id
                LEFT JOIN settlement_founding_handoff h ON h.flow_id=f.flow_id
                WHERE f.entity_type='NPC_POPULATION' AND f.destination_mode='FOUNDING_SITE'
                """
        );
    }
}
