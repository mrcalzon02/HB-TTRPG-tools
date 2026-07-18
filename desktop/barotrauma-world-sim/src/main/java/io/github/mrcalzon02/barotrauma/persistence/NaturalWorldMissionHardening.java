package io.github.mrcalzon02.barotrauma.persistence;

import java.util.List;

/** Schema 012: protect active responders and convert natural activity into NPC mission opportunities. */
public final class NaturalWorldMissionHardening {
    private NaturalWorldMissionHardening() { }

    public static List<String> statements() {
        return List.of(
                "CREATE TRIGGER active_response_blocks_world_mission BEFORE UPDATE OF assigned_npc_vessel_id ON world_mission "
                        + "WHEN NEW.assigned_npc_vessel_id IS NOT NULL AND EXISTS (SELECT 1 FROM fleet_response_operation r "
                        + "WHERE r.assigned_npc_vessel_id=NEW.assigned_npc_vessel_id AND r.status='ACTIVE') "
                        + "BEGIN SELECT RAISE(IGNORE); END",
                "CREATE TRIGGER natural_resource_creates_mission AFTER INSERT ON natural_resource_site BEGIN "
                        + "INSERT OR IGNORE INTO world_mission(mission_id,world_id,mission_type,status,origin_station_id,"
                        + "target_location_id,deterministic_seed,difficulty,reward_credits,cargo_units,progress,created_tick,updated_tick) "
                        + "SELECT NEW.site_id,NEW.world_id,CASE NEW.resource_type WHEN 'ORE_VEIN' THEN 'MINING' "
                        + "WHEN 'RARE_MINERALS' THEN 'MINING' WHEN 'HYDROTHERMAL_DEPOSIT' THEN 'RESEARCH' "
                        + "WHEN 'BIOACTIVE_ACCUMULATOR' THEN 'RESEARCH' ELSE 'SALVAGE' END,'AVAILABLE',"
                        + "(SELECT ws.station_id FROM world_station ws JOIN world_location station_location ON station_location.location_id=ws.location_id "
                        + "JOIN world_location target_location ON target_location.location_id=NEW.location_id WHERE ws.world_id=NEW.world_id "
                        + "ORDER BY ABS(station_location.source_ordinal-target_location.source_ordinal),station_location.source_ordinal LIMIT 1),"
                        + "NEW.location_id,NEW.discovered_tick,MIN(100,20+NEW.richness/2+(100-NEW.accessibility)/3),"
                        + "1000+NEW.richness*80,CASE WHEN NEW.resource_type IN ('ORE_VEIN','RARE_MINERALS','HYDROTHERMAL_DEPOSIT') "
                        + "THEN MAX(5,NEW.richness/4) ELSE 0 END,0,NEW.discovered_tick,NEW.discovered_tick; END",
                "CREATE TRIGGER predator_expansion_creates_mission AFTER INSERT ON natural_world_event "
                        + "WHEN NEW.event_type='PREDATOR_EXPANSION' BEGIN INSERT OR IGNORE INTO world_mission(mission_id,world_id,"
                        + "mission_type,status,origin_station_id,target_location_id,deterministic_seed,difficulty,reward_credits,"
                        + "cargo_units,progress,created_tick,updated_tick) SELECT substr(NEW.location_id,1,24)||printf('%012x',"
                        + "(NEW.tick_sequence*8+5)%281474976710655),NEW.world_id,'FAUNA_CLEARING','AVAILABLE',"
                        + "(SELECT ws.station_id FROM world_station ws JOIN world_location station_location ON station_location.location_id=ws.location_id "
                        + "JOIN world_location target_location ON target_location.location_id=NEW.location_id WHERE ws.world_id=NEW.world_id "
                        + "ORDER BY ABS(station_location.source_ordinal-target_location.source_ordinal),station_location.source_ordinal LIMIT 1),"
                        + "NEW.location_id,NEW.tick_sequence,MIN(100,30+NEW.severity/2),1500+NEW.severity*100,0,0,"
                        + "NEW.tick_sequence,NEW.tick_sequence WHERE NOT EXISTS (SELECT 1 FROM world_mission WHERE world_id=NEW.world_id "
                        + "AND target_location_id=NEW.location_id AND mission_type='FAUNA_CLEARING' AND status IN ('AVAILABLE','ASSIGNED','ACTIVE')); END",
                "CREATE INDEX IF NOT EXISTS natural_mission_target_index ON world_mission(world_id,target_location_id,mission_type,status)"
        );
    }
}
