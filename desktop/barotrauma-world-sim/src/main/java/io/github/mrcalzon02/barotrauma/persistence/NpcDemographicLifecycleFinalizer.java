package io.github.mrcalzon02.barotrauma.persistence;

/** Projects one immutable demographic result into cohorts, ledgers, observations, and station causality. */
final class NpcDemographicLifecycleFinalizer {
    private NpcDemographicLifecycleFinalizer() { }

    static String trigger() {
        return """
                CREATE TRIGGER npc_demographic_finalize_tick
                AFTER UPDATE OF ready ON npc_demographic_tick_baseline
                WHEN NEW.ready=1 AND OLD.ready=0
                BEGIN
                    INSERT OR IGNORE INTO npc_demographic_tick_result(
                        result_id,world_id,population_id,station_id,tick_sequence,before_total,births,deaths,
                        disaster_losses,other_losses,after_total,workforce_before,workforce_after,
                        housing_capacity,life_support_capacity,employment_capacity,effective_capacity,
                        morale_before,morale_after,support_score,pressure_score,surplus_support_ticks,
                        shortage_pressure_ticks,overcrowding_ticks,overcrowding_state,
                        population_index_before,population_index_after,primary_cause,evidence_key,summary,
                        after_civilians,after_industrial_workers,after_logistics_workers,after_security_personnel,
                        after_medical_personnel,after_scientific_personnel,after_temporary_residents,
                        after_refugees,attack_damage_points)
                    SELECT * FROM npc_demographic_tick_plan WHERE station_id=NEW.station_id;

                    INSERT OR IGNORE INTO npc_population_ledger(
                        ledger_id,world_id,population_id,station_id,tick_sequence,before_total,births,deaths,
                        immigration,emigration,disaster_losses,other_gains,other_losses,after_total,
                        housing_capacity,life_support_capacity,employment_capacity,morale,
                        population_index_before,population_index_after,primary_cause,evidence_key,summary)
                    SELECT population_id||':ledger:'||tick_sequence,world_id,population_id,station_id,tick_sequence,
                           before_total,births,deaths,0,0,disaster_losses,0,other_losses,after_total,
                           housing_capacity,life_support_capacity,employment_capacity,morale_before,
                           population_index_before,population_index_after,primary_cause,evidence_key,summary
                    FROM npc_demographic_tick_result
                    WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence;

                    UPDATE npc_population_state
                    SET civilians=(SELECT after_civilians FROM npc_demographic_tick_result
                                   WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence),
                        industrial_workers=(SELECT after_industrial_workers FROM npc_demographic_tick_result
                                   WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence),
                        logistics_workers=(SELECT after_logistics_workers FROM npc_demographic_tick_result
                                   WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence),
                        security_personnel=(SELECT after_security_personnel FROM npc_demographic_tick_result
                                   WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence),
                        medical_personnel=(SELECT after_medical_personnel FROM npc_demographic_tick_result
                                   WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence),
                        scientific_personnel=(SELECT after_scientific_personnel FROM npc_demographic_tick_result
                                   WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence),
                        temporary_residents=(SELECT after_temporary_residents FROM npc_demographic_tick_result
                                   WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence),
                        refugees=(SELECT after_refugees FROM npc_demographic_tick_result
                                   WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence),
                        morale=(SELECT morale_after FROM npc_demographic_tick_result
                                   WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence),
                        last_tick=NEW.tick_sequence
                    WHERE station_id=NEW.station_id;

                    UPDATE npc_demographic_state
                    SET surplus_support_ticks=(SELECT surplus_support_ticks FROM npc_demographic_tick_result
                                               WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence),
                        shortage_pressure_ticks=(SELECT shortage_pressure_ticks FROM npc_demographic_tick_result
                                               WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence),
                        overcrowding_ticks=(SELECT overcrowding_ticks FROM npc_demographic_tick_result
                                               WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence),
                        overcrowding_state=(SELECT overcrowding_state FROM npc_demographic_tick_result
                                               WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence),
                        last_support_score=(SELECT support_score FROM npc_demographic_tick_result
                                               WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence),
                        last_pressure_score=(SELECT pressure_score FROM npc_demographic_tick_result
                                               WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence),
                        last_birth_tick=CASE WHEN (SELECT births FROM npc_demographic_tick_result
                                               WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence)>0
                                             THEN NEW.tick_sequence ELSE last_birth_tick END,
                        last_mortality_tick=CASE WHEN (SELECT deaths+disaster_losses+other_losses
                                               FROM npc_demographic_tick_result
                                               WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence)>0
                                             THEN NEW.tick_sequence ELSE last_mortality_tick END,
                        last_tick=NEW.tick_sequence
                    WHERE station_id=NEW.station_id;

                    UPDATE npc_population_reconciliation
                    SET last_population_index=(SELECT population_index_after FROM npc_demographic_tick_result
                                               WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence),
                        reconciliation_status=CASE
                            WHEN (SELECT after_total FROM npc_demographic_tick_result
                                  WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence)=0
                                THEN 'ABANDONED'
                            WHEN (SELECT population_index_after FROM npc_demographic_tick_result
                                  WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence)>last_population_index
                                THEN 'INDEX_GAIN'
                            WHEN (SELECT population_index_after FROM npc_demographic_tick_result
                                  WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence)<last_population_index
                                THEN 'INDEX_LOSS' ELSE 'ALIGNED' END,
                        last_detailed_population=(SELECT after_total FROM npc_demographic_tick_result
                                               WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence),
                        last_tick=NEW.tick_sequence
                    WHERE station_id=NEW.station_id;

                    UPDATE station_civilization_state
                    SET population_index=(SELECT population_index_after FROM npc_demographic_tick_result
                                          WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence)
                    WHERE station_id=NEW.station_id;

                    UPDATE station_population_state
                    SET resident_count=(SELECT after_total FROM npc_demographic_tick_result
                                        WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence),
                        workforce_count=(SELECT workforce_after FROM npc_demographic_tick_result
                                        WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence),
                        last_tick=NEW.tick_sequence
                    WHERE station_id=NEW.station_id;

                    INSERT OR IGNORE INTO world_observation_event(
                        event_id,world_id,tick_sequence,canonical_time,category,primary_entity_type,
                        primary_entity_id,primary_cause,primary_evidence_key,contributing_factors,
                        magnitude,visibility,confidence,summary)
                    SELECT population_id||':demographic-event:'||tick_sequence,world_id,tick_sequence,
                           COALESCE((SELECT current_canonical FROM simulation_transaction_context
                                     WHERE world_id=r.world_id),
                                    (SELECT canonical_time FROM world_metadata WHERE world_id=r.world_id),
                                    (SELECT created_at FROM world_metadata WHERE world_id=r.world_id)),
                           'POPULATION','NPC_POPULATION',population_id,primary_cause,evidence_key,
                           'support='||support_score||';pressure='||pressure_score||';capacity='||effective_capacity,
                           ABS(after_total-before_total),'OMNISCIENT',100,summary
                    FROM npc_demographic_tick_result r
                    WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence
                      AND after_total<>before_total;

                    INSERT OR IGNORE INTO observation_metric_series(
                        metric_id,world_id,entity_type,entity_id,metric_key,tick_sequence,numeric_value,unit,snapshot_id)
                    SELECT population_id||':accounted-total:'||tick_sequence,world_id,'NPC_POPULATION',population_id,
                           'accounted-total-population',tick_sequence,after_total,'persons',NULL
                    FROM npc_demographic_tick_result
                    WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence;
                    INSERT OR IGNORE INTO observation_metric_series(
                        metric_id,world_id,entity_type,entity_id,metric_key,tick_sequence,numeric_value,unit,snapshot_id)
                    SELECT population_id||':frontier-index:'||tick_sequence,world_id,'NPC_POPULATION',population_id,
                           'frontier-population-index',tick_sequence,population_index_after,'index',NULL
                    FROM npc_demographic_tick_result
                    WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence;
                    INSERT OR IGNORE INTO observation_metric_series(
                        metric_id,world_id,entity_type,entity_id,metric_key,tick_sequence,numeric_value,unit,snapshot_id)
                    SELECT population_id||':demographic-support:'||tick_sequence,world_id,'NPC_POPULATION',population_id,
                           'demographic-support-score',tick_sequence,support_score,'index',NULL
                    FROM npc_demographic_tick_result
                    WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence;
                    INSERT OR IGNORE INTO observation_metric_series(
                        metric_id,world_id,entity_type,entity_id,metric_key,tick_sequence,numeric_value,unit,snapshot_id)
                    SELECT population_id||':demographic-pressure:'||tick_sequence,world_id,'NPC_POPULATION',population_id,
                           'demographic-pressure-score',tick_sequence,pressure_score,'index',NULL
                    FROM npc_demographic_tick_result
                    WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence;
                    INSERT OR IGNORE INTO observation_metric_series(
                        metric_id,world_id,entity_type,entity_id,metric_key,tick_sequence,numeric_value,unit,snapshot_id)
                    SELECT population_id||':morale:'||tick_sequence,world_id,'NPC_POPULATION',population_id,
                           'population-morale',tick_sequence,morale_after,'index',NULL
                    FROM npc_demographic_tick_result
                    WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence;
                    INSERT OR IGNORE INTO observation_metric_series(
                        metric_id,world_id,entity_type,entity_id,metric_key,tick_sequence,numeric_value,unit,snapshot_id)
                    SELECT population_id||':effective-capacity:'||tick_sequence,world_id,'NPC_POPULATION',population_id,
                           'effective-population-capacity',tick_sequence,effective_capacity,'persons',NULL
                    FROM npc_demographic_tick_result
                    WHERE station_id=NEW.station_id AND tick_sequence=NEW.tick_sequence;

                    INSERT OR IGNORE INTO station_event(
                        event_id,world_id,station_id,tick_sequence,canonical_time,event_type,severity,
                        headline,narrative,actor_type,actor_id,cause_type,cause_id,deterministic_key,
                        visibility,correlation_id,policy_version,created_at)
                    SELECT r.station_id||':demographic:'||lower(r.primary_cause)||':'||r.tick_sequence,
                           r.world_id,r.station_id,r.tick_sequence,ctx.current_canonical,
                           'POPULATION',CASE r.primary_cause WHEN 'ABANDONMENT' THEN 5 WHEN 'DISASTER' THEN 4
                               WHEN 'DEATHS' THEN 3 ELSE 2 END,
                           CASE r.primary_cause
                               WHEN 'BIRTHS' THEN 'Sustained support produced population growth'
                               WHEN 'DEATHS' THEN 'Population pressure caused mortality'
                               WHEN 'DISASTER' THEN 'A measured fauna attack caused casualties'
                               WHEN 'ABANDONMENT' THEN 'The station population was evacuated'
                               ELSE CASE WHEN residents.delta_value<0
                                   THEN 'Aggregate station population reconciled downward'
                                   ELSE 'Aggregate station population reconciled upward' END END,
                           CASE r.primary_cause WHEN 'OTHER' THEN
                               CAST(ABS(CAST(residents.delta_value AS INTEGER)) AS TEXT)
                               ||' residents were reconciled to the authoritative detailed population total.'
                               ELSE r.summary END,
                           CASE r.primary_cause WHEN 'DISASTER' THEN 'FAUNA'
                               WHEN 'ABANDONMENT' THEN 'CIVIL_AUTHORITY' ELSE 'CIVILIANS' END,
                           CASE r.primary_cause WHEN 'DISASTER' THEN 'europan-fauna-pressure'
                               ELSE r.station_id||':population' END,
                           CASE r.primary_cause WHEN 'BIRTHS' THEN 'DEMOGRAPHIC_SUPPORT'
                               WHEN 'DEATHS' THEN 'DEMOGRAPHIC_PRESSURE'
                               WHEN 'DISASTER' THEN 'MONSTER_ATTACK'
                               WHEN 'ABANDONMENT' THEN 'FRONTIER_TRANSITION'
                               ELSE 'DEMOGRAPHIC_RECONCILIATION' END,
                           r.evidence_key,'demographic:'||lower(r.primary_cause)||':'||r.tick_sequence,'OBSERVED',
                           r.world_id||':tick:'||r.tick_sequence,
                           (SELECT policy_version FROM station_story_policy WHERE active=1),ctx.current_canonical
                    FROM npc_demographic_tick_result r
                    JOIN simulation_transaction_context ctx ON ctx.world_id=r.world_id
                    JOIN station_mutation_coverage residents
                      ON residents.command_id=ctx.command_id AND residents.station_id=r.station_id
                     AND residents.tick_sequence=r.tick_sequence
                     AND residents.statistic_key='population.residents'
                    WHERE r.station_id=NEW.station_id AND r.tick_sequence=NEW.tick_sequence
                      AND residents.delta_value<>0;

                    INSERT OR IGNORE INTO station_population_event(
                        population_event_id,event_id,population_category,people_before,people_delta,
                        people_after,workforce_delta)
                    SELECT r.station_id||':demographic-evidence:'||lower(r.primary_cause)||':'||r.tick_sequence,
                           r.station_id||':demographic:'||lower(r.primary_cause)||':'||r.tick_sequence,
                           CASE r.primary_cause WHEN 'BIRTHS' THEN 'BIRTHS'
                               WHEN 'DEATHS' THEN 'ORDINARY_DEATHS'
                               WHEN 'DISASTER' THEN 'ATTACK_CASUALTIES'
                               WHEN 'ABANDONMENT' THEN 'EVACUATION'
                               ELSE CASE WHEN residents.delta_value<0 THEN 'EMIGRATION' ELSE 'IMMIGRATION' END END,
                           CAST(residents.previous_value AS INTEGER),CAST(residents.delta_value AS INTEGER),
                           CAST(residents.resulting_value AS INTEGER),
                           CAST(COALESCE(workforce.delta_value,r.workforce_after-r.workforce_before) AS INTEGER)
                    FROM npc_demographic_tick_result r
                    JOIN simulation_transaction_context ctx ON ctx.world_id=r.world_id
                    JOIN station_mutation_coverage residents
                      ON residents.command_id=ctx.command_id AND residents.station_id=r.station_id
                     AND residents.tick_sequence=r.tick_sequence
                     AND residents.statistic_key='population.residents'
                    LEFT JOIN station_mutation_coverage workforce
                      ON workforce.command_id=ctx.command_id AND workforce.station_id=r.station_id
                     AND workforce.tick_sequence=r.tick_sequence
                     AND workforce.statistic_key='population.workforce'
                    WHERE r.station_id=NEW.station_id AND r.tick_sequence=NEW.tick_sequence
                      AND residents.delta_value<>0;

                    INSERT OR IGNORE INTO station_change(
                        change_id,event_id,statistic_key,value_type,previous_value,delta_value,resulting_value,
                        unit,reason_code,affected_type,affected_id)
                    SELECT r.station_id||':demographic:'||lower(r.primary_cause)||':'||r.tick_sequence||':residents',
                           r.station_id||':demographic:'||lower(r.primary_cause)||':'||r.tick_sequence,
                           'population.residents','INTEGER',residents.previous_value,residents.delta_value,
                           residents.resulting_value,'people',
                           CASE r.primary_cause WHEN 'BIRTHS' THEN 'BIRTHS' WHEN 'DEATHS' THEN 'DEATHS'
                               WHEN 'DISASTER' THEN 'ATTACK_CASUALTIES' WHEN 'ABANDONMENT' THEN 'EVACUATION'
                               ELSE CASE WHEN residents.delta_value<0 THEN 'EMIGRATION' ELSE 'IMMIGRATION' END END,
                           'STATION',r.station_id
                    FROM npc_demographic_tick_result r
                    JOIN simulation_transaction_context ctx ON ctx.world_id=r.world_id
                    JOIN station_mutation_coverage residents
                      ON residents.command_id=ctx.command_id AND residents.station_id=r.station_id
                     AND residents.tick_sequence=r.tick_sequence
                     AND residents.statistic_key='population.residents'
                    WHERE r.station_id=NEW.station_id AND r.tick_sequence=NEW.tick_sequence
                      AND residents.delta_value<>0;

                    INSERT OR IGNORE INTO station_change(
                        change_id,event_id,statistic_key,value_type,previous_value,delta_value,resulting_value,
                        unit,reason_code,affected_type,affected_id)
                    SELECT r.station_id||':demographic:'||lower(r.primary_cause)||':'||r.tick_sequence||':workforce',
                           r.station_id||':demographic:'||lower(r.primary_cause)||':'||r.tick_sequence,
                           'population.workforce','INTEGER',workforce.previous_value,workforce.delta_value,
                           workforce.resulting_value,'people',
                           CASE r.primary_cause WHEN 'BIRTHS' THEN 'BIRTHS' WHEN 'DEATHS' THEN 'DEATHS'
                               WHEN 'DISASTER' THEN 'ATTACK_CASUALTIES' WHEN 'ABANDONMENT' THEN 'EVACUATION'
                               ELSE CASE WHEN workforce.delta_value<0 THEN 'EMIGRATION' ELSE 'IMMIGRATION' END END,
                           'STATION',r.station_id
                    FROM npc_demographic_tick_result r
                    JOIN simulation_transaction_context ctx ON ctx.world_id=r.world_id
                    JOIN station_mutation_coverage workforce
                      ON workforce.command_id=ctx.command_id AND workforce.station_id=r.station_id
                     AND workforce.tick_sequence=r.tick_sequence
                     AND workforce.statistic_key='population.workforce'
                    WHERE r.station_id=NEW.station_id AND r.tick_sequence=NEW.tick_sequence
                      AND workforce.delta_value<>0
                      AND EXISTS (SELECT 1 FROM station_event e
                                  WHERE e.event_id=r.station_id||':demographic:'||lower(r.primary_cause)||':'||r.tick_sequence);

                    DELETE FROM npc_demographic_tick_baseline WHERE station_id=NEW.station_id;
                END
                """;
    }
}
