package io.github.mrcalzon02.barotrauma.persistence;

import java.util.List;

/** Schema 009: UUID-safe frontier missions plus recovery and expansion responses. */
public final class StationFrontierHardening {
    private StationFrontierHardening() { }

    public static List<String> statements() {
        return List.of(
                "DROP TRIGGER IF EXISTS frontier_response_mission",
                "CREATE TRIGGER frontier_response_mission AFTER UPDATE OF frontier_state ON station_civilization_state "
                        + "WHEN NEW.frontier_state IN ('CONTESTED','CONTRACTING') AND OLD.frontier_state<>NEW.frontier_state BEGIN "
                        + "INSERT OR IGNORE INTO world_mission(mission_id,world_id,mission_type,status,origin_station_id,"
                        + "target_location_id,deterministic_seed,difficulty,reward_credits,cargo_units,progress,created_tick,updated_tick) "
                        + "SELECT substr(NEW.station_id,1,24)||printf('%012x',(NEW.last_tick*2)%281474976710655),NEW.world_id,"
                        + "CASE WHEN NEW.fauna_pressure>NEW.civilization_strength THEN 'FAUNA_CLEARING' ELSE 'DEFENSE' END,"
                        + "'AVAILABLE',NEW.station_id,(SELECT location_id FROM world_location WHERE world_id=NEW.world_id "
                        + "ORDER BY location_level DESC,ring ASC,source_ordinal LIMIT 1),NEW.last_tick,"
                        + "MIN(100,35+NEW.fauna_pressure/2),2000+NEW.fauna_pressure*100,0,0,NEW.last_tick,NEW.last_tick "
                        + "WHERE NOT EXISTS (SELECT 1 FROM world_mission WHERE world_id=NEW.world_id "
                        + "AND origin_station_id=NEW.station_id AND mission_type IN ('FAUNA_CLEARING','DEFENSE') "
                        + "AND status IN ('AVAILABLE','ASSIGNED','ACTIVE')); END",
                "CREATE TRIGGER frontier_recovery_event AFTER UPDATE OF frontier_state ON station_civilization_state "
                        + "WHEN OLD.frontier_state IN ('CONTESTED','CONTRACTING') "
                        + "AND NEW.frontier_state IN ('HOLDING','EXPANDING') BEGIN "
                        + "INSERT OR IGNORE INTO civilization_frontier_event(event_id,world_id,station_id,tick_sequence,"
                        + "event_type,severity,supplies_delta,integrity_delta,security_delta,civilization_delta,fauna_delta,"
                        + "frontier_delta,summary) VALUES (NEW.station_id||':recovery:'||NEW.last_tick,NEW.world_id,"
                        + "NEW.station_id,NEW.last_tick,'RECOVERY',15,0,0,0,1,-1,"
                        + "CASE WHEN NEW.frontier_state='EXPANDING' THEN 1 ELSE 0 END,"
                        + "'Regular deliveries and defensive pressure stabilized the civilian perimeter.'); END",
                "CREATE TRIGGER frontier_expansion_mission AFTER UPDATE OF frontier_state ON station_civilization_state "
                        + "WHEN NEW.frontier_state='EXPANDING' AND OLD.frontier_state<>'EXPANDING' BEGIN "
                        + "INSERT OR IGNORE INTO world_mission(mission_id,world_id,mission_type,status,origin_station_id,"
                        + "target_location_id,deterministic_seed,difficulty,reward_credits,cargo_units,progress,created_tick,updated_tick) "
                        + "SELECT substr(NEW.station_id,1,24)||printf('%012x',(NEW.last_tick*2+1)%281474976710655),"
                        + "NEW.world_id,CASE WHEN NEW.civilization_strength>=80 THEN 'RESEARCH' ELSE 'TRANSIT' END,"
                        + "'AVAILABLE',NEW.station_id,(SELECT location_id FROM world_location WHERE world_id=NEW.world_id "
                        + "AND location_id<>(SELECT location_id FROM world_station WHERE station_id=NEW.station_id) "
                        + "ORDER BY location_level DESC,ring ASC,source_ordinal LIMIT 1),NEW.last_tick,"
                        + "MIN(100,20+NEW.frontier_position/2),1500+NEW.frontier_position*60,0,0,NEW.last_tick,NEW.last_tick "
                        + "WHERE NOT EXISTS (SELECT 1 FROM world_mission WHERE world_id=NEW.world_id "
                        + "AND origin_station_id=NEW.station_id AND mission_type IN ('TRANSIT','RESEARCH') "
                        + "AND status IN ('AVAILABLE','ASSIGNED','ACTIVE')); END"
        );
    }
}
