package io.github.mrcalzon02.barotrauma.persistence;

import java.util.List;

/** Schema-027 migration alignment, direct evacuation, and passive-tick baseline capture. */
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
                    VALUES (NEW.station_id,NEW.world_id,
                            CASE WHEN NEW.seed_source='SCHEMA_014_CIVILIZATION'
                                 THEN 'IMPORTED_ESTIMATE' ELSE 'GENERATED_ALLOCATION' END,
                            NEW.last_tick,
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

        statements.add(directEvacuationTrigger(
                "npc_demographic_direct_frontier_evacuation",
                "station_civilization_state",
                "frontier_state",
                "OLD.frontier_state<>'ABANDONED' AND NEW.frontier_state='ABANDONED'",
                "frontier",
                "The station population evacuated after direct frontier abandonment",
                "the civilian frontier was explicitly changed from '||OLD.frontier_state||' to ABANDONED",
                "FRONTIER_TRANSITION",
                "NEW.station_id||':frontier-transition:'||NEW.last_tick||':'||OLD.frontier_state||':'||NEW.frontier_state"));
        statements.add(directEvacuationTrigger(
                "npc_demographic_direct_fallen_evacuation",
                "station_simulation_state",
                "status",
                "OLD.status<>'FALLEN' AND NEW.status='FALLEN'",
                "fallen",
                "The station population evacuated after the station fell",
                "the station status was explicitly changed from '||OLD.status||' to FALLEN",
                "STATION_STATUS_TRANSITION",
                "NEW.station_id||':status-transition:'||NEW.last_tick||':'||OLD.status||':'||NEW.status"));

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

    private static String directEvacuationTrigger(String triggerName, String tableName, String updatedColumn,
                                                   String transitionPredicate, String route,
                                                   String headline, String narrativeCause,
                                                   String causeType, String causeIdExpression) {
        String eventId = "NEW.station_id||':population:evacuation:direct-" + route + ":'||NEW.last_tick";
        return "CREATE TRIGGER " + triggerName + " AFTER UPDATE OF " + updatedColumn + " ON " + tableName
                + " WHEN " + transitionPredicate
                + " AND EXISTS (SELECT 1 FROM station_population_state p WHERE p.station_id=NEW.station_id"
                + " AND p.resident_count>0)"
                + " AND NOT EXISTS (SELECT 1 FROM npc_demographic_tick_baseline b"
                + " WHERE b.station_id=NEW.station_id AND b.tick_sequence=NEW.last_tick) BEGIN "
                + "INSERT OR IGNORE INTO station_event(event_id,world_id,station_id,tick_sequence,canonical_time,"
                + "event_type,severity,headline,narrative,actor_type,actor_id,cause_type,cause_id,"
                + "deterministic_key,visibility,correlation_id,policy_version,created_at) SELECT "
                + eventId + ",NEW.world_id,NEW.station_id,NEW.last_tick,NULL,'POPULATION',5,'"
                + headline + "',CAST(p.resident_count AS TEXT)||' residents and '"
                + "||CAST(p.workforce_count AS TEXT)||' workers evacuated because " + narrativeCause + ".',"
                + "'CIVIL_AUTHORITY',NEW.station_id||':population','" + causeType + "'," + causeIdExpression
                + ",'population:evacuation:direct-" + route + ":'||NEW.last_tick,'OBSERVED',"
                + "NEW.world_id||':tick:'||NEW.last_tick,"
                + "(SELECT policy_version FROM station_story_policy WHERE active=1),'tick:'||NEW.last_tick "
                + "FROM station_population_state p WHERE p.station_id=NEW.station_id; "
                + "INSERT OR IGNORE INTO station_population_event(population_event_id,event_id,"
                + "population_category,people_before,people_delta,people_after,workforce_delta) SELECT "
                + "NEW.station_id||':population-evidence:evacuation:direct-" + route + ":'||NEW.last_tick,"
                + eventId + ",'EVACUATION',p.resident_count,-p.resident_count,0,-p.workforce_count "
                + "FROM station_population_state p WHERE p.station_id=NEW.station_id; "
                + directEvacuationChange(eventId, route, "residents", "resident_count")
                + directEvacuationChange(eventId, route, "workforce", "workforce_count")
                + "UPDATE npc_population_state SET civilians=0,industrial_workers=0,logistics_workers=0,"
                + "security_personnel=0,medical_personnel=0,scientific_personnel=0,temporary_residents=0,"
                + "refugees=0,last_tick=MAX(last_tick,NEW.last_tick) WHERE station_id=NEW.station_id; "
                + "UPDATE npc_population_reconciliation SET last_population_index=0,"
                + "reconciliation_status='ABANDONED',last_detailed_population=0,"
                + "last_tick=MAX(last_tick,NEW.last_tick) WHERE station_id=NEW.station_id; "
                + "UPDATE npc_demographic_state SET surplus_support_ticks=0,shortage_pressure_ticks=0,"
                + "overcrowding_ticks=0,overcrowding_state='WITHIN_CAPACITY',last_support_score=0,"
                + "last_pressure_score=100,last_tick=MAX(last_tick,NEW.last_tick) WHERE station_id=NEW.station_id; "
                + "UPDATE station_population_state SET resident_count=0,workforce_count=0,"
                + "last_tick=MAX(last_tick,NEW.last_tick) WHERE station_id=NEW.station_id; "
                + "UPDATE station_civilization_state SET population_index=0,frontier_state='ABANDONED',"
                + "last_tick=MAX(last_tick,NEW.last_tick) WHERE station_id=NEW.station_id; END";
    }

    private static String directEvacuationChange(String eventId, String route, String suffix, String column) {
        return "INSERT OR IGNORE INTO station_change(change_id,event_id,statistic_key,value_type,previous_value,"
                + "delta_value,resulting_value,unit,reason_code,affected_type,affected_id) SELECT "
                + "NEW.station_id||':population:evacuation:direct-" + route + ":'||NEW.last_tick||':" + suffix
                + "'," + eventId + ",'population." + suffix + "','INTEGER',p." + column + ",-p." + column
                + ",0,'people','EVACUATION','STATION',NEW.station_id FROM station_population_state p "
                + "WHERE p.station_id=NEW.station_id AND p." + column + ">0; ";
    }
}
