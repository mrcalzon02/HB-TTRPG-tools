package io.github.mrcalzon02.barotrauma.persistence;

/** The single deterministic schema-027 demographic plan. */
final class NpcDemographicLifecyclePlan {
    private NpcDemographicLifecyclePlan() { }

    static String view() {
        return """
                CREATE VIEW npc_demographic_tick_plan AS
                WITH base AS (
                    SELECT b.station_id,b.world_id,b.population_id,b.tick_sequence,b.station_status_before,
                           b.frontier_state_before,b.population_index_before,b.before_total,b.workforce_before,
                           b.morale_before,b.housing_capacity,b.life_support_capacity,b.employment_capacity,
                           p.civilians,p.industrial_workers,p.logistics_workers,p.security_personnel,
                           p.medical_personnel,p.scientific_personnel,p.temporary_residents,p.refugees,
                           s.supplies,s.security,s.integrity,s.threat,s.status,
                           c.civilization_strength,c.fauna_pressure,c.shortage_ticks,c.surplus_ticks,
                           c.frontier_state,c.population_index,
                           d.surplus_support_ticks previous_surplus_support_ticks,
                           d.shortage_pressure_ticks previous_shortage_pressure_ticks,
                           d.overcrowding_ticks previous_overcrowding_ticks,
                           d.last_birth_tick,d.last_mortality_tick,
                           MIN(b.housing_capacity,b.life_support_capacity,b.employment_capacity) effective_capacity,
                           MIN(100,(p.medical_personnel*10000)/MAX(1,b.before_total)) medical_coverage,
                           COALESCE((SELECT SUM(MAX(0,-f.integrity_delta)+MAX(0,-f.security_delta))
                                     FROM civilization_frontier_event f
                                     WHERE f.station_id=b.station_id AND f.tick_sequence=b.tick_sequence
                                       AND f.event_type='MONSTER_ATTACK'),0) attack_damage_points,
                           r.baseline_population_per_index
                    FROM npc_demographic_tick_baseline b
                    JOIN npc_population_state p ON p.population_id=b.population_id
                    JOIN npc_demographic_state d ON d.population_id=b.population_id
                    JOIN npc_population_reconciliation r ON r.population_id=b.population_id
                    JOIN station_simulation_state s ON s.station_id=b.station_id
                    JOIN station_civilization_state c ON c.station_id=b.station_id
                    WHERE b.ready=1
                ), scored AS (
                    SELECT base.*,
                           MIN(100,MAX(0,(supplies+integrity+security+(100-threat)+(100-fauna_pressure)+
                               morale_before+medical_coverage+
                               CASE WHEN effective_capacity<=0 THEN 0
                                    WHEN before_total*100<=effective_capacity*90 THEN 100
                                    WHEN before_total<=effective_capacity THEN 60 ELSE 0 END)/8)) support_score,
                           MIN(100,
                               MAX(0,40-supplies)+MAX(0,55-integrity)+MAX(0,threat-security)+
                               MAX(0,fauna_pressure-civilization_strength)+MAX(0,50-morale_before)+
                               MAX(0,40-medical_coverage)+
                               CASE WHEN effective_capacity<=0 AND before_total>0 THEN 50
                                    WHEN before_total>effective_capacity
                                    THEN MIN(50,10+((before_total-effective_capacity)*100)/MAX(1,effective_capacity))
                                    ELSE 0 END) pressure_score
                    FROM base
                ), streaks AS (
                    SELECT scored.*,
                           CASE WHEN status<>'FALLEN' AND frontier_state<>'ABANDONED'
                                      AND effective_capacity>0
                                      AND before_total*100<effective_capacity*95
                                      AND support_score>=70 AND pressure_score<35
                                THEN MIN(30,previous_surplus_support_ticks+1)
                                ELSE MAX(0,previous_surplus_support_ticks-1) END next_surplus_support_ticks,
                           CASE WHEN pressure_score>=45 OR shortage_ticks>=3
                                THEN MIN(30,previous_shortage_pressure_ticks+1)
                                ELSE MAX(0,previous_shortage_pressure_ticks-1) END next_shortage_pressure_ticks,
                           CASE WHEN before_total>effective_capacity
                                THEN MIN(30,previous_overcrowding_ticks+1)
                                ELSE MAX(0,previous_overcrowding_ticks-1) END next_overcrowding_ticks,
                           CASE WHEN before_total<=effective_capacity THEN 'WITHIN_CAPACITY'
                                WHEN effective_capacity<=0 OR before_total*100>effective_capacity*115 THEN 'CRITICAL'
                                WHEN before_total*100>effective_capacity*105 THEN 'STRAINED'
                                ELSE 'SUPPRESSED' END next_overcrowding_state
                    FROM scored
                ), candidates AS (
                    SELECT streaks.*,
                           CASE WHEN status='FALLEN' OR frontier_state='ABANDONED'
                                THEN before_total ELSE 0 END candidate_other_losses,
                           CASE WHEN status<>'FALLEN' AND frontier_state<>'ABANDONED'
                                      AND attack_damage_points>0
                                THEN MIN(before_total,MAX(1,attack_damage_points*2)) ELSE 0 END candidate_disaster_losses,
                           CASE WHEN status<>'FALLEN' AND frontier_state<>'ABANDONED'
                                      AND population_index<population_index_before
                                THEN MIN(before_total,MAX(1,CAST(ROUND(
                                     (population_index_before-population_index)*baseline_population_per_index)
                                     AS INTEGER))) ELSE 0 END candidate_emigration,
                           CASE WHEN status<>'FALLEN' AND frontier_state<>'ABANDONED'
                                      AND population_index>population_index_before AND effective_capacity>before_total
                                THEN MIN(effective_capacity-before_total,MAX(1,CAST(ROUND(
                                     (population_index-population_index_before)*baseline_population_per_index)
                                     AS INTEGER))) ELSE 0 END candidate_immigration,
                           CASE WHEN status<>'FALLEN' AND frontier_state<>'ABANDONED'
                                      AND attack_damage_points=0 AND before_total>0
                                THEN CASE
                                    WHEN integrity<=0 OR life_support_capacity<=0
                                        THEN MIN(before_total,MAX(1,before_total/20))
                                    WHEN before_total>effective_capacity AND next_overcrowding_ticks>=3
                                        THEN MIN(before_total,MAX(1,(before_total-effective_capacity+9)/10))
                                    WHEN next_shortage_pressure_ticks>=3
                                         AND (supplies<20 OR integrity<50 OR medical_coverage<35 OR pressure_score>=70)
                                        THEN MIN(before_total,MAX(1,before_total/300))
                                    WHEN support_score>=45 AND pressure_score<45
                                         AND ((tick_sequence+ABS(unicode(substr(population_id,1,1))))%24)=0
                                        THEN MIN(before_total,MAX(1,before_total/2500))
                                    ELSE 0 END
                                ELSE 0 END candidate_deaths,
                           CASE WHEN status<>'FALLEN' AND frontier_state<>'ABANDONED'
                                      AND attack_damage_points=0 AND before_total>0
                                      AND effective_capacity>0
                                      AND before_total*100<effective_capacity*95
                                      AND support_score>=70 AND pressure_score<35
                                      AND next_surplus_support_ticks>=6
                                      AND tick_sequence-COALESCE(last_birth_tick,-1000000)>=6
                                THEN MIN(effective_capacity-before_total,MAX(1,before_total/500))
                                ELSE 0 END candidate_births
                    FROM streaks
                ), terms AS (
                    SELECT candidates.*,
                           candidate_other_losses other_losses,
                           CASE WHEN candidate_other_losses>0 THEN 0 ELSE candidate_disaster_losses END disaster_losses,
                           CASE WHEN candidate_other_losses>0 OR candidate_disaster_losses>0
                                THEN 0 ELSE candidate_emigration END emigration,
                           CASE WHEN candidate_other_losses>0 OR candidate_disaster_losses>0
                                      OR candidate_emigration>0
                                THEN 0 ELSE candidate_immigration END immigration,
                           CASE WHEN candidate_other_losses>0 OR candidate_disaster_losses>0
                                      OR candidate_emigration>0 OR candidate_immigration>0
                                THEN 0 ELSE candidate_deaths END deaths,
                           CASE WHEN candidate_other_losses>0 OR candidate_disaster_losses>0
                                      OR candidate_emigration>0 OR candidate_immigration>0 OR candidate_deaths>0
                                THEN 0 ELSE candidate_births END births
                    FROM candidates
                ), totals AS (
                    SELECT terms.*,
                           before_total-deaths-emigration-disaster_losses-other_losses surviving_total,
                           before_total+births+immigration-deaths-emigration-disaster_losses-other_losses after_total,
                           CASE WHEN other_losses>0 THEN 0
                                WHEN pressure_score>=70 THEN MAX(0,morale_before-2)
                                WHEN pressure_score>=45 THEN MAX(0,morale_before-1)
                                WHEN support_score>=70 AND next_overcrowding_state='WITHIN_CAPACITY'
                                    THEN MIN(100,morale_before+1)
                                ELSE morale_before END morale_after
                    FROM terms
                ), projected AS (
                    SELECT totals.*,
                           CASE WHEN after_total=0 THEN 0
                                WHEN immigration>0 OR emigration>0 THEN population_index
                                WHEN next_shortage_pressure_ticks>0 OR pressure_score>=45 OR shortage_ticks>=3
                                THEN MIN(population_index_before,
                                         MAX(1,MIN(100,CAST(ROUND(after_total/baseline_population_per_index) AS INTEGER))))
                                ELSE MAX(1,MIN(100,CAST(ROUND(after_total/baseline_population_per_index) AS INTEGER)))
                                END projected_population_index,
                           CASE WHEN before_total<=0 THEN 0
                                ELSE industrial_workers*surviving_total/before_total END after_industrial_workers,
                           CASE WHEN before_total<=0 THEN 0
                                ELSE logistics_workers*surviving_total/before_total END after_logistics_workers,
                           CASE WHEN before_total<=0 THEN 0
                                ELSE security_personnel*surviving_total/before_total END after_security_personnel,
                           CASE WHEN before_total<=0 THEN 0
                                ELSE medical_personnel*surviving_total/before_total END after_medical_personnel,
                           CASE WHEN before_total<=0 THEN 0
                                ELSE scientific_personnel*surviving_total/before_total END after_scientific_personnel,
                           CASE WHEN before_total<=0 THEN 0
                                ELSE temporary_residents*surviving_total/before_total END after_temporary_residents,
                           CASE WHEN before_total<=0 THEN 0
                                ELSE refugees*surviving_total/before_total END after_refugees
                    FROM totals
                )
                SELECT population_id||':demographic:'||tick_sequence result_id,world_id,population_id,station_id,
                       tick_sequence,before_total,births,deaths,immigration,emigration,disaster_losses,other_losses,
                       after_total,workforce_before,
                       after_industrial_workers+after_logistics_workers+after_security_personnel+
                           after_medical_personnel+after_scientific_personnel workforce_after,
                       housing_capacity,life_support_capacity,employment_capacity,effective_capacity,
                       morale_before,morale_after,support_score,pressure_score,
                       CASE WHEN other_losses>0 THEN 0 ELSE next_surplus_support_ticks END surplus_support_ticks,
                       CASE WHEN other_losses>0 THEN 0 ELSE next_shortage_pressure_ticks END shortage_pressure_ticks,
                       CASE WHEN other_losses>0 THEN 0 ELSE next_overcrowding_ticks END overcrowding_ticks,
                       CASE WHEN other_losses>0 THEN 'WITHIN_CAPACITY' ELSE next_overcrowding_state END overcrowding_state,
                       population_index_before,projected_population_index population_index_after,
                       CASE WHEN other_losses>0 THEN 'ABANDONMENT'
                            WHEN disaster_losses>0 THEN 'DISASTER'
                            WHEN emigration>0 THEN 'EMIGRATION'
                            WHEN immigration>0 THEN 'IMMIGRATION'
                            WHEN deaths>0 THEN 'DEATHS'
                            WHEN births>0 THEN 'BIRTHS' ELSE 'OTHER' END primary_cause,
                       CASE WHEN other_losses>0 THEN 'frontier-abandonment-demographic-closure'
                            WHEN disaster_losses>0 THEN 'measured-fauna-attack-casualties'
                            WHEN emigration>0 THEN 'frontier-population-index-emigration'
                            WHEN immigration>0 THEN 'frontier-population-index-immigration'
                            WHEN deaths>0 AND before_total>effective_capacity AND next_overcrowding_ticks>=3
                                THEN 'overcrowding-excess-mortality'
                            WHEN deaths>0 AND pressure_score>=45 THEN 'support-failure-excess-mortality'
                            WHEN deaths>0 THEN 'natural-mortality-cycle'
                            WHEN births>0 THEN 'sustained-capacity-births'
                            WHEN before_total>effective_capacity THEN 'overcrowding-birth-suppression'
                            ELSE 'demographic-evaluation-no-change' END evidence_key,
                       'Demographic evaluation committed support='||support_score||', pressure='||pressure_score
                           ||', capacity='||effective_capacity||', overcrowding='||
                           CASE WHEN other_losses>0 THEN 'WITHIN_CAPACITY' ELSE next_overcrowding_state END
                           ||CASE WHEN births>0 THEN '; births='||births
                                 WHEN deaths>0 THEN '; deaths='||deaths
                                 WHEN immigration>0 THEN '; immigration='||immigration
                                 WHEN emigration>0 THEN '; emigration='||emigration
                                 WHEN disaster_losses>0 THEN '; disaster losses='||disaster_losses
                                 WHEN other_losses>0 THEN '; abandonment losses='||other_losses
                                 ELSE '; population held' END||'.' summary,
                       after_total-(after_industrial_workers+after_logistics_workers+after_security_personnel+
                           after_medical_personnel+after_scientific_personnel+after_temporary_residents+
                           after_refugees) after_civilians,
                       after_industrial_workers,after_logistics_workers,after_security_personnel,
                       after_medical_personnel,after_scientific_personnel,after_temporary_residents,
                       after_refugees,attack_damage_points
                FROM projected
                """;
    }
}
