package io.github.mrcalzon02.barotrauma.persistence;

import java.util.List;

/** Schema 022: authoritative station headcounts and event-driven population causality. */
public final class StationPopulationCausalitySchema {
    private StationPopulationCausalitySchema() { }

    public static List<String> statements() {
        return List.of(
                "INSERT OR IGNORE INTO station_change_reason(reason_code,display_name,reason_family) "
                        + "VALUES ('ATTACK_CASUALTIES','Attack casualties','POPULATION')",

                """
                CREATE TABLE station_population_state (
                    station_id TEXT PRIMARY KEY,
                    world_id TEXT NOT NULL,
                    baseline_kind TEXT NOT NULL DEFAULT 'IMPORTED_ESTIMATE'
                        CHECK(baseline_kind IN ('IMPORTED_ESTIMATE','GENERATED_ALLOCATION')),
                    baseline_tick INTEGER NOT NULL CHECK(baseline_tick >= 0),
                    baseline_resident_count INTEGER NOT NULL CHECK(baseline_resident_count >= 0),
                    resident_count INTEGER NOT NULL CHECK(resident_count >= 0),
                    baseline_workforce_count INTEGER NOT NULL CHECK(baseline_workforce_count >= 0),
                    workforce_count INTEGER NOT NULL CHECK(workforce_count >= 0 AND workforce_count <= resident_count),
                    last_tick INTEGER NOT NULL CHECK(last_tick >= baseline_tick),
                    FOREIGN KEY(station_id) REFERENCES world_station(station_id),
                    FOREIGN KEY(world_id) REFERENCES world_metadata(world_id)
                )
                """,
                "CREATE INDEX station_population_world_index ON station_population_state(world_id,resident_count DESC)",

                """
                CREATE TABLE station_population_tick_baseline (
                    station_id TEXT NOT NULL,
                    world_id TEXT NOT NULL,
                    tick_sequence INTEGER NOT NULL,
                    station_status_before TEXT NOT NULL,
                    population_index_before INTEGER NOT NULL,
                    frontier_state_before TEXT NOT NULL,
                    PRIMARY KEY(station_id,tick_sequence),
                    FOREIGN KEY(station_id) REFERENCES world_station(station_id),
                    FOREIGN KEY(world_id) REFERENCES world_metadata(world_id)
                )
                """,

                """
                INSERT OR IGNORE INTO station_population_state(
                    station_id,world_id,baseline_kind,baseline_tick,baseline_resident_count,resident_count,
                    baseline_workforce_count,workforce_count,last_tick)
                SELECT station_id,world_id,'IMPORTED_ESTIMATE',last_tick,population_index*100,population_index*100,
                       population_index*55,population_index*55,last_tick
                FROM station_civilization_state
                """,

                """
                CREATE TRIGGER station_population_seed AFTER INSERT ON station_civilization_state BEGIN
                    INSERT OR IGNORE INTO station_population_state(
                        station_id,world_id,baseline_kind,baseline_tick,baseline_resident_count,resident_count,
                        baseline_workforce_count,workforce_count,last_tick)
                    VALUES (NEW.station_id,NEW.world_id,'IMPORTED_ESTIMATE',NEW.last_tick,NEW.population_index*100,
                            NEW.population_index*100,NEW.population_index*55,
                            NEW.population_index*55,NEW.last_tick);
                END
                """,

                """
                CREATE TRIGGER station_population_baseline_is_immutable
                BEFORE UPDATE OF baseline_kind,baseline_tick,baseline_resident_count,baseline_workforce_count
                ON station_population_state BEGIN
                    SELECT RAISE(ABORT,'Station population baselines are immutable.');
                END
                """,

                directEvacuationTrigger(
                        "station_population_direct_frontier_evacuation",
                        "station_civilization_state",
                        "frontier_state",
                        "OLD.frontier_state<>'ABANDONED' AND NEW.frontier_state='ABANDONED'",
                        "frontier",
                        "The station population evacuated after direct frontier abandonment",
                        "the civilian frontier was explicitly changed from "
                                + "'||OLD.frontier_state||' to ABANDONED",
                        "FRONTIER_TRANSITION",
                        "NEW.station_id||':frontier-transition:'||NEW.last_tick||':'"
                                + "||OLD.frontier_state||':'||NEW.frontier_state"),

                directEvacuationTrigger(
                        "station_population_direct_fallen_evacuation",
                        "station_simulation_state",
                        "status",
                        "OLD.status<>'FALLEN' AND NEW.status='FALLEN'",
                        "fallen",
                        "The station population evacuated after the station fell",
                        "the station status was explicitly changed from '||OLD.status||' to FALLEN",
                        "STATION_STATUS_TRANSITION",
                        "NEW.station_id||':status-transition:'||NEW.last_tick||':'"
                                + "||OLD.status||':'||NEW.status"),

                """
                CREATE TRIGGER station_population_capture_before_tick
                BEFORE UPDATE OF last_tick ON station_simulation_state
                WHEN NEW.last_tick>OLD.last_tick
                  AND EXISTS (SELECT 1 FROM station_population_state WHERE station_id=NEW.station_id)
                BEGIN
                    INSERT OR REPLACE INTO station_population_tick_baseline(
                        station_id,world_id,tick_sequence,station_status_before,
                        population_index_before,frontier_state_before)
                    SELECT NEW.station_id,NEW.world_id,NEW.last_tick,NEW.status,
                           c.population_index,c.frontier_state
                    FROM station_civilization_state c WHERE c.station_id=NEW.station_id;
                END
                """,

                """
                CREATE VIEW station_population_tick_plan AS
                WITH raw AS (
                    SELECT b.station_id,b.world_id,b.tick_sequence,p.resident_count,p.workforce_count,
                           b.station_status_before,b.population_index_before,b.frontier_state_before,
                           s.status,c.population_index,c.frontier_state,
                           CASE WHEN (b.frontier_state_before<>'ABANDONED' AND c.frontier_state='ABANDONED')
                                  OR (b.station_status_before<>'FALLEN' AND s.status='FALLEN') THEN 1 ELSE 0 END abandoning,
                           CASE WHEN c.population_index>b.population_index_before
                                THEN MAX(1,p.resident_count/125)
                                WHEN c.population_index<b.population_index_before
                                THEN -MIN(p.resident_count,MAX(1,p.resident_count/100))
                                ELSE 0 END demographic_people_delta
                    FROM station_population_tick_baseline b
                    JOIN station_population_state p ON p.station_id=b.station_id
                    JOIN station_simulation_state s ON s.station_id=b.station_id
                    JOIN station_civilization_state c ON c.station_id=b.station_id
                ), planned AS (
                    SELECT raw.*,
                           CASE WHEN demographic_people_delta>0 THEN (demographic_people_delta*55)/100
                                WHEN demographic_people_delta<0 AND resident_count>0
                                THEN -MIN(workforce_count,
                                          ((-demographic_people_delta)*workforce_count)/resident_count)
                                ELSE 0 END demographic_workforce_delta
                    FROM raw
                )
                SELECT station_id,world_id,tick_sequence,1 sequence_ordinal,'EVACUATION' population_category,
                       resident_count people_before,-resident_count people_delta,0 people_after,
                       workforce_count workforce_before,-workforce_count workforce_delta,0 workforce_after
                FROM planned WHERE abandoning=1 AND resident_count>0
                UNION ALL
                SELECT station_id,world_id,tick_sequence,1,
                       CASE WHEN demographic_people_delta>0 THEN 'IMMIGRATION' ELSE 'EMIGRATION' END,
                       resident_count,demographic_people_delta,resident_count+demographic_people_delta,
                       workforce_count,demographic_workforce_delta,
                       workforce_count+demographic_workforce_delta
                FROM planned WHERE abandoning=0 AND demographic_people_delta<>0
                """,

                """
                CREATE TRIGGER station_population_finalize_tick
                AFTER UPDATE OF status ON station_simulation_state
                WHEN NEW.last_tick=OLD.last_tick
                  AND EXISTS (SELECT 1 FROM station_population_tick_baseline
                              WHERE station_id=NEW.station_id AND tick_sequence=NEW.last_tick)
                BEGIN
                    INSERT OR IGNORE INTO station_event(
                        event_id,world_id,station_id,tick_sequence,canonical_time,event_type,severity,
                        headline,narrative,actor_type,actor_id,cause_type,cause_id,deterministic_key,
                        visibility,correlation_id,policy_version,created_at)
                    SELECT station_id||':population:'||lower(population_category)||':'||tick_sequence,
                           world_id,station_id,tick_sequence,NULL,'POPULATION',
                           CASE population_category WHEN 'EVACUATION' THEN 5 WHEN 'ATTACK_CASUALTIES' THEN 4
                                WHEN 'EMIGRATION' THEN 3 ELSE 2 END,
                           CASE population_category
                                WHEN 'EVACUATION' THEN 'The station population evacuated'
                                WHEN 'ATTACK_CASUALTIES' THEN 'A fauna attack caused casualties'
                                WHEN 'EMIGRATION' THEN 'Residents departed under sustained pressure'
                                ELSE 'New residents arrived during recovery' END,
                           CASE population_category
                                WHEN 'EVACUATION' THEN CAST(-people_delta AS TEXT)||' residents evacuated as the station fell or its frontier was abandoned.'
                                WHEN 'ATTACK_CASUALTIES' THEN CAST(-people_delta AS TEXT)||' residents were lost to measured fauna attack damage.'
                                WHEN 'EMIGRATION' THEN CAST(-people_delta AS TEXT)||' residents emigrated after sustained shortage reduced civilian capacity.'
                                ELSE CAST(people_delta AS TEXT)||' residents immigrated after sustained surplus increased civilian capacity.' END,
                           CASE population_category WHEN 'ATTACK_CASUALTIES' THEN 'FAUNA'
                                WHEN 'EVACUATION' THEN 'CIVIL_AUTHORITY' ELSE 'CIVILIANS' END,
                           CASE population_category WHEN 'ATTACK_CASUALTIES' THEN 'europan-fauna-pressure'
                                ELSE station_id||':population' END,
                           CASE population_category WHEN 'ATTACK_CASUALTIES' THEN 'POPULATION_ATTACK'
                                WHEN 'EVACUATION' THEN 'POPULATION_EVACUATION' ELSE 'CONSUMPTION_LOG' END,
                           CASE population_category WHEN 'ATTACK_CASUALTIES' THEN station_id||':frontier-causal:'||tick_sequence
                                WHEN 'EVACUATION' THEN station_id||':frontier-causal:'||tick_sequence
                                ELSE station_id||':consumption:'||tick_sequence END,
                           'population:'||lower(population_category)||':'||tick_sequence,'OBSERVED',
                           world_id||':tick:'||tick_sequence,
                           (SELECT policy_version FROM station_story_policy WHERE active=1),'tick:'||tick_sequence
                    FROM station_population_tick_plan WHERE station_id=NEW.station_id
                    ORDER BY sequence_ordinal;

                    INSERT OR IGNORE INTO station_population_event(
                        population_event_id,event_id,population_category,people_before,people_delta,
                        people_after,workforce_delta)
                    SELECT station_id||':population-evidence:'||lower(population_category)||':'||tick_sequence,
                           station_id||':population:'||lower(population_category)||':'||tick_sequence,
                           population_category,people_before,people_delta,people_after,workforce_delta
                    FROM station_population_tick_plan WHERE station_id=NEW.station_id
                    ORDER BY sequence_ordinal;

                    INSERT OR IGNORE INTO station_change(
                        change_id,event_id,statistic_key,value_type,previous_value,delta_value,resulting_value,
                        unit,reason_code,affected_type,affected_id)
                    SELECT station_id||':population:'||lower(population_category)||':'||tick_sequence||':residents',
                           station_id||':population:'||lower(population_category)||':'||tick_sequence,
                           'population.residents','INTEGER',people_before,people_delta,people_after,'people',
                           CASE population_category WHEN 'ATTACK_CASUALTIES' THEN 'ATTACK_CASUALTIES'
                                WHEN 'EVACUATION' THEN 'EVACUATION' WHEN 'EMIGRATION' THEN 'EMIGRATION'
                                ELSE 'IMMIGRATION' END,'STATION',station_id
                    FROM station_population_tick_plan WHERE station_id=NEW.station_id;

                    INSERT OR IGNORE INTO station_change(
                        change_id,event_id,statistic_key,value_type,previous_value,delta_value,resulting_value,
                        unit,reason_code,affected_type,affected_id)
                    SELECT station_id||':population:'||lower(population_category)||':'||tick_sequence||':workforce',
                           station_id||':population:'||lower(population_category)||':'||tick_sequence,
                           'population.workforce','INTEGER',workforce_before,workforce_delta,workforce_after,'people',
                           CASE population_category WHEN 'ATTACK_CASUALTIES' THEN 'ATTACK_CASUALTIES'
                                WHEN 'EVACUATION' THEN 'EVACUATION' WHEN 'EMIGRATION' THEN 'EMIGRATION'
                                ELSE 'IMMIGRATION' END,'STATION',station_id
                    FROM station_population_tick_plan
                    WHERE station_id=NEW.station_id AND workforce_delta<>0;

                    UPDATE station_population_state
                    SET resident_count=resident_count+COALESCE((
                            SELECT SUM(people_delta) FROM station_population_tick_plan
                            WHERE station_id=NEW.station_id),0),
                        workforce_count=workforce_count+COALESCE((
                            SELECT SUM(workforce_delta) FROM station_population_tick_plan
                            WHERE station_id=NEW.station_id),0),
                        last_tick=NEW.last_tick
                    WHERE station_id=NEW.station_id;

                    DELETE FROM station_population_tick_baseline
                    WHERE station_id=NEW.station_id AND tick_sequence=NEW.last_tick;
                END
                """,

                """
                CREATE VIEW station_population_attack_plan AS
                WITH measured AS (
                    SELECT f.event_id source_event_id,f.world_id,f.station_id,f.tick_sequence,
                           CAST(COALESCE(SUM(CASE
                               WHEN c.statistic_key IN ('station.integrity','station.security')
                                AND c.delta_value<0 THEN -c.delta_value ELSE 0 END),0) AS INTEGER) damage_points
                    FROM civilization_frontier_event f
                    LEFT JOIN station_change c
                      ON c.event_id=f.station_id||':frontier-causal:'||f.tick_sequence
                    WHERE f.event_type='MONSTER_ATTACK'
                    GROUP BY f.event_id,f.world_id,f.station_id,f.tick_sequence
                ), impact AS (
                    SELECT measured.*,p.resident_count,p.workforce_count,
                           MIN(p.resident_count,damage_points*2) casualty_count
                    FROM measured JOIN station_population_state p ON p.station_id=measured.station_id
                    WHERE damage_points>0 AND p.resident_count>0
                )
                SELECT source_event_id,world_id,station_id,tick_sequence,
                       resident_count people_before,-casualty_count people_delta,
                       resident_count-casualty_count people_after,workforce_count workforce_before,
                       -MIN(workforce_count,(casualty_count*workforce_count)/resident_count) workforce_delta,
                       workforce_count-MIN(workforce_count,(casualty_count*workforce_count)/resident_count)
                           workforce_after,damage_points
                FROM impact
                """,

                """
                CREATE TRIGGER station_population_attack_casualties
                AFTER INSERT ON civilization_frontier_event
                WHEN NEW.event_type='MONSTER_ATTACK'
                  AND EXISTS (SELECT 1 FROM station_population_attack_plan WHERE source_event_id=NEW.event_id)
                BEGIN
                    INSERT OR IGNORE INTO station_event(
                        event_id,world_id,station_id,tick_sequence,canonical_time,event_type,severity,
                        headline,narrative,actor_type,actor_id,cause_type,cause_id,deterministic_key,
                        visibility,correlation_id,policy_version,created_at)
                    SELECT station_id||':population:attack_casualties:'||tick_sequence,
                           world_id,station_id,tick_sequence,NULL,'POPULATION',4,
                           'A fauna attack caused casualties',
                           CAST(-people_delta AS TEXT)||' residents were lost after the attack caused '
                               ||CAST(damage_points AS TEXT)||' measured integrity and security damage points.',
                           'FAUNA','europan-fauna-pressure','MONSTER_ATTACK',source_event_id,
                           'population:attack_casualties:'||tick_sequence,'OBSERVED',
                           world_id||':tick:'||tick_sequence,
                           (SELECT policy_version FROM station_story_policy WHERE active=1),'tick:'||tick_sequence
                    FROM station_population_attack_plan WHERE source_event_id=NEW.event_id;

                    INSERT OR IGNORE INTO station_population_event(
                        population_event_id,event_id,population_category,people_before,people_delta,
                        people_after,workforce_delta)
                    SELECT station_id||':population-evidence:attack_casualties:'||tick_sequence,
                           station_id||':population:attack_casualties:'||tick_sequence,
                           'ATTACK_CASUALTIES',people_before,people_delta,people_after,workforce_delta
                    FROM station_population_attack_plan WHERE source_event_id=NEW.event_id;

                    INSERT OR IGNORE INTO station_change(
                        change_id,event_id,statistic_key,value_type,previous_value,delta_value,resulting_value,
                        unit,reason_code,affected_type,affected_id)
                    SELECT station_id||':population:attack_casualties:'||tick_sequence||':residents',
                           station_id||':population:attack_casualties:'||tick_sequence,
                           'population.residents','INTEGER',people_before,people_delta,people_after,'people',
                           'ATTACK_CASUALTIES','STATION',station_id
                    FROM station_population_attack_plan WHERE source_event_id=NEW.event_id;

                    INSERT OR IGNORE INTO station_change(
                        change_id,event_id,statistic_key,value_type,previous_value,delta_value,resulting_value,
                        unit,reason_code,affected_type,affected_id)
                    SELECT station_id||':population:attack_casualties:'||tick_sequence||':workforce',
                           station_id||':population:attack_casualties:'||tick_sequence,
                           'population.workforce','INTEGER',workforce_before,workforce_delta,workforce_after,
                           'people','ATTACK_CASUALTIES','STATION',station_id
                    FROM station_population_attack_plan
                    WHERE source_event_id=NEW.event_id AND workforce_delta<>0;

                    UPDATE station_population_state
                    SET resident_count=resident_count+(SELECT people_delta
                            FROM station_population_attack_plan WHERE source_event_id=NEW.event_id),
                        workforce_count=workforce_count+(SELECT workforce_delta
                            FROM station_population_attack_plan WHERE source_event_id=NEW.event_id),
                        last_tick=NEW.tick_sequence
                    WHERE station_id=NEW.station_id;
                END
                """,

                """
                CREATE VIEW station_population_story AS
                SELECT e.event_id,e.world_id,e.station_id,e.tick_sequence,e.severity,e.headline,e.narrative,
                       e.actor_type,e.actor_id,e.cause_type,e.cause_id,e.correlation_id,
                       p.population_event_id,p.population_category,p.people_before,p.people_delta,
                       p.people_after,p.workforce_delta
                FROM station_event e JOIN station_population_event p ON p.event_id=e.event_id
                WHERE e.event_type='POPULATION'
                """,

                """
                CREATE VIEW station_population_coverage AS
                SELECT p.station_id,p.world_id,p.baseline_kind,p.baseline_tick,p.baseline_resident_count,p.resident_count,
                       p.baseline_workforce_count,p.workforce_count,p.last_tick,
                       COALESCE((SELECT SUM(pe.people_delta)
                                 FROM station_population_event pe JOIN station_event e ON e.event_id=pe.event_id
                                 WHERE e.station_id=p.station_id AND e.tick_sequence>=p.baseline_tick),0)
                           recorded_resident_delta,
                       COALESCE((SELECT SUM(pe.workforce_delta)
                                 FROM station_population_event pe JOIN station_event e ON e.event_id=pe.event_id
                                 WHERE e.station_id=p.station_id AND e.tick_sequence>=p.baseline_tick),0)
                           recorded_workforce_delta,
                       p.resident_count-p.baseline_resident_count-COALESCE((
                           SELECT SUM(pe.people_delta)
                           FROM station_population_event pe JOIN station_event e ON e.event_id=pe.event_id
                           WHERE e.station_id=p.station_id AND e.tick_sequence>=p.baseline_tick),0)
                           unexplained_resident_delta,
                       p.workforce_count-p.baseline_workforce_count-COALESCE((
                           SELECT SUM(pe.workforce_delta)
                           FROM station_population_event pe JOIN station_event e ON e.event_id=pe.event_id
                           WHERE e.station_id=p.station_id AND e.tick_sequence>=p.baseline_tick),0)
                           unexplained_workforce_delta
                FROM station_population_state p
                """
        );
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
                + " AND NOT EXISTS (SELECT 1 FROM station_population_tick_baseline b"
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
                + "UPDATE station_population_state SET resident_count=0,workforce_count=0,"
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
