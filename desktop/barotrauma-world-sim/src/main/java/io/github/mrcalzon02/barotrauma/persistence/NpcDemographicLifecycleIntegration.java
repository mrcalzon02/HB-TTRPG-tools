package io.github.mrcalzon02.barotrauma.persistence;

import java.util.List;

/** Schema-027 migration alignment and passive-tick baseline capture. */
final class NpcDemographicLifecycleIntegration {
    private NpcDemographicLifecycleIntegration() { }

    static void appendTo(List<String> statements) {
        statements.add("""
                INSERT OR IGNORE INTO npc_demographic_state(
                    population_id,world_id,station_id,surplus_support_ticks,shortage_pressure_ticks,
                    overcrowding_ticks,overcrowding_state,last_support_score,last_pressure_score,last_tick)
                SELECT population_id,world_id,station_id,0,0,0,
                       CASE WHEN (civilians+industrial_workers+logistics_workers+security_personnel+
                                       medical_personnel+scientific_personnel+temporary_residents+refugees)
                                      > MIN(housing_capacity,life_support_capacity,employment_capacity)
                            THEN 'SUPPRESSED' ELSE 'WITHIN_CAPACITY' END,
                       50,0,last_tick
                FROM npc_population_state
                """);
        statements.add("DELETE FROM station_population_tick_baseline");
        statements.add("""
                UPDATE station_population_state
                SET baseline_tick=(SELECT p.last_tick FROM npc_population_state p
                                   WHERE p.station_id=station_population_state.station_id),
                    baseline_resident_count=(SELECT p.civilians+p.industrial_workers+p.logistics_workers+
                                                    p.security_personnel+p.medical_personnel+p.scientific_personnel+
                                                    p.temporary_residents+p.refugees
                                             FROM npc_population_state p
                                             WHERE p.station_id=station_population_state.station_id),
                    resident_count=(SELECT p.civilians+p.industrial_workers+p.logistics_workers+
                                           p.security_personnel+p.medical_personnel+p.scientific_personnel+
                                           p.temporary_residents+p.refugees
                                    FROM npc_population_state p
                                    WHERE p.station_id=station_population_state.station_id),
                    baseline_workforce_count=(SELECT p.industrial_workers+p.logistics_workers+
                                                     p.security_personnel+p.medical_personnel+p.scientific_personnel
                                              FROM npc_population_state p
                                              WHERE p.station_id=station_population_state.station_id),
                    workforce_count=(SELECT p.industrial_workers+p.logistics_workers+
                                            p.security_personnel+p.medical_personnel+p.scientific_personnel
                                     FROM npc_population_state p
                                     WHERE p.station_id=station_population_state.station_id),
                    last_tick=(SELECT p.last_tick FROM npc_population_state p
                               WHERE p.station_id=station_population_state.station_id)
                WHERE EXISTS (SELECT 1 FROM npc_population_state p
                              WHERE p.station_id=station_population_state.station_id)
                """);
        statements.add("""
                CREATE TRIGGER npc_demographic_state_seed AFTER INSERT ON npc_population_state BEGIN
                    INSERT OR IGNORE INTO npc_demographic_state(
                        population_id,world_id,station_id,surplus_support_ticks,shortage_pressure_ticks,
                        overcrowding_ticks,overcrowding_state,last_support_score,last_pressure_score,last_tick)
                    VALUES (NEW.population_id,NEW.world_id,NEW.station_id,0,0,0,
                            CASE WHEN NEW.civilians+NEW.industrial_workers+NEW.logistics_workers+
                                           NEW.security_personnel+NEW.medical_personnel+NEW.scientific_personnel+
                                           NEW.temporary_residents+NEW.refugees
                                           > MIN(NEW.housing_capacity,NEW.life_support_capacity,NEW.employment_capacity)
                                 THEN 'SUPPRESSED' ELSE 'WITHIN_CAPACITY' END,
                            50,0,NEW.last_tick);
                    INSERT OR IGNORE INTO station_population_state(
                        station_id,world_id,baseline_kind,baseline_tick,baseline_resident_count,resident_count,
                        baseline_workforce_count,workforce_count,last_tick)
                    VALUES (NEW.station_id,NEW.world_id,'GENERATED_ALLOCATION',NEW.last_tick,
                            NEW.civilians+NEW.industrial_workers+NEW.logistics_workers+NEW.security_personnel+
                                NEW.medical_personnel+NEW.scientific_personnel+NEW.temporary_residents+NEW.refugees,
                            NEW.civilians+NEW.industrial_workers+NEW.logistics_workers+NEW.security_personnel+
                                NEW.medical_personnel+NEW.scientific_personnel+NEW.temporary_residents+NEW.refugees,
                            NEW.industrial_workers+NEW.logistics_workers+NEW.security_personnel+
                                NEW.medical_personnel+NEW.scientific_personnel,
                            NEW.industrial_workers+NEW.logistics_workers+NEW.security_personnel+
                                NEW.medical_personnel+NEW.scientific_personnel,
                            NEW.last_tick);
                END
                """);
        statements.add("""
                CREATE TRIGGER station_population_baseline_is_immutable
                BEFORE UPDATE OF baseline_kind,baseline_tick,baseline_resident_count,baseline_workforce_count
                ON station_population_state BEGIN
                    SELECT RAISE(ABORT,'Station population baselines are immutable.');
                END
                """);

        statements.add("""
                CREATE TRIGGER npc_demographic_capture_before_tick
                BEFORE UPDATE OF last_tick ON station_simulation_state
                WHEN NEW.last_tick>OLD.last_tick
                  AND EXISTS (SELECT 1 FROM npc_population_state WHERE station_id=NEW.station_id)
                BEGIN
                    INSERT OR REPLACE INTO npc_demographic_tick_baseline(
                        station_id,world_id,population_id,tick_sequence,station_status_before,
                        frontier_state_before,population_index_before,before_total,workforce_before,
                        morale_before,housing_capacity,life_support_capacity,employment_capacity,ready)
                    SELECT NEW.station_id,NEW.world_id,p.population_id,NEW.last_tick,OLD.status,
                           c.frontier_state,c.population_index,
                           p.civilians+p.industrial_workers+p.logistics_workers+p.security_personnel+
                               p.medical_personnel+p.scientific_personnel+p.temporary_residents+p.refugees,
                           p.industrial_workers+p.logistics_workers+p.security_personnel+
                               p.medical_personnel+p.scientific_personnel,
                           p.morale,p.housing_capacity,p.life_support_capacity,p.employment_capacity,0
                    FROM npc_population_state p JOIN station_civilization_state c ON c.station_id=p.station_id
                    WHERE p.station_id=NEW.station_id;
                END
                """);
    }
}
