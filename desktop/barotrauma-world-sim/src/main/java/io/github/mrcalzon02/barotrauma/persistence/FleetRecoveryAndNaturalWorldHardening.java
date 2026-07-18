package io.github.mrcalzon02.barotrauma.persistence;

import java.util.List;

/** Schema 011: fleet-response priority, reassignment, and material sufficiency. */
public final class FleetRecoveryAndNaturalWorldHardening {
    private FleetRecoveryAndNaturalWorldHardening() { }

    public static List<String> statements() {
        return List.of(
                "CREATE TRIGGER response_request_immediate_assignment AFTER INSERT ON fleet_response_operation "
                        + "WHEN NEW.status='AVAILABLE' BEGIN UPDATE fleet_response_operation SET assigned_npc_vessel_id="
                        + "(SELECT v.npc_vessel_id FROM npc_vessel v WHERE v.world_id=NEW.world_id AND v.status='DOCKED' "
                        + "AND v.mission_id IS NULL AND v.role IN ('SALVAGE','PATROL','COURIER') AND v.npc_vessel_id<>COALESCE(NEW.distressed_npc_vessel_id,'') "
                        + "AND NOT EXISTS (SELECT 1 FROM fleet_response_operation busy WHERE busy.assigned_npc_vessel_id=v.npc_vessel_id "
                        + "AND busy.status='ACTIVE') ORDER BY CASE v.role WHEN 'SALVAGE' THEN 0 WHEN 'PATROL' THEN 1 ELSE 2 END,"
                        + "v.engineering DESC,v.npc_vessel_id LIMIT 1),status=CASE WHEN EXISTS (SELECT 1 FROM npc_vessel v "
                        + "WHERE v.world_id=NEW.world_id AND v.status='DOCKED' AND v.mission_id IS NULL "
                        + "AND v.role IN ('SALVAGE','PATROL','COURIER') AND v.npc_vessel_id<>COALESCE(NEW.distressed_npc_vessel_id,'') "
                        + "AND NOT EXISTS (SELECT 1 FROM fleet_response_operation busy WHERE busy.assigned_npc_vessel_id=v.npc_vessel_id "
                        + "AND busy.status='ACTIVE')) THEN 'ACTIVE' ELSE 'AVAILABLE' END WHERE operation_id=NEW.operation_id; END",
                "CREATE TRIGGER docked_vessel_accepts_response AFTER UPDATE OF status ON npc_vessel "
                        + "WHEN NEW.status='DOCKED' AND OLD.status<>'DOCKED' AND NEW.mission_id IS NULL "
                        + "AND NEW.role IN ('SALVAGE','PATROL','COURIER') BEGIN UPDATE fleet_response_operation "
                        + "SET assigned_npc_vessel_id=NEW.npc_vessel_id,status='ACTIVE',updated_tick=NEW.last_tick "
                        + "WHERE operation_id=(SELECT operation_id FROM fleet_response_operation WHERE world_id=NEW.world_id "
                        + "AND status='AVAILABLE' AND distressed_npc_vessel_id<>NEW.npc_vessel_id ORDER BY difficulty,created_tick LIMIT 1) "
                        + "AND NOT EXISTS (SELECT 1 FROM fleet_response_operation busy WHERE busy.assigned_npc_vessel_id=NEW.npc_vessel_id "
                        + "AND busy.status='ACTIVE'); END",
                "CREATE TRIGGER fleet_response_requires_supplies BEFORE UPDATE OF progress ON fleet_response_operation "
                        + "WHEN NEW.progress>OLD.progress AND NEW.status='ACTIVE' AND NEW.origin_station_id IS NOT NULL "
                        + "AND (COALESCE((SELECT quantity FROM station_inventory WHERE station_id=NEW.origin_station_id AND item_id='item-steel'),0)<NEW.spare_parts_required "
                        + "OR COALESCE((SELECT quantity FROM station_inventory WHERE station_id=NEW.origin_station_id AND item_id='item-fuel'),0)<NEW.fuel_required "
                        + "OR COALESCE((SELECT quantity FROM station_inventory WHERE station_id=NEW.origin_station_id AND item_id='item-ammunition'),0)<NEW.ammunition_required "
                        + "OR COALESCE((SELECT quantity FROM station_inventory WHERE station_id=NEW.origin_station_id AND item_id='item-medical'),0)<NEW.medical_required) "
                        + "BEGIN SELECT RAISE(IGNORE); END",
                "CREATE INDEX IF NOT EXISTS fleet_response_target_index ON fleet_response_operation(world_id,target_location_id,status,updated_tick)"
        );
    }
}
