package io.github.mrcalzon02.barotrauma.persistence;

import java.util.List;

/** Schema 007: non-recursive NPC freight delivery and passive player-freight offers. */
public final class StationLogisticsHardening {
    private StationLogisticsHardening() { }

    public static List<String> statements() {
        return List.of(
                "DROP TRIGGER IF EXISTS freight_delivered_by_npc",
                "DROP TRIGGER IF EXISTS npc_return_arrival",
                "CREATE TRIGGER npc_return_arrival AFTER UPDATE OF status ON npc_vessel "
                        + "WHEN OLD.status='RETURNING' AND NEW.status='WORKING' BEGIN "
                        + "UPDATE freight_lot SET status='DELIVERED',updated_tick=NEW.last_tick,delivered_tick=NEW.last_tick,"
                        + "destination_station_id=NEW.home_station_id WHERE assigned_npc_vessel_id=NEW.npc_vessel_id "
                        + "AND status IN ('READY','LOADED','IN_TRANSIT'); "
                        + "UPDATE station_inventory SET quantity=quantity+COALESCE((SELECT SUM(quantity) FROM freight_lot f "
                        + "WHERE f.assigned_npc_vessel_id=NEW.npc_vessel_id AND f.status='DELIVERED' "
                        + "AND f.delivered_tick=NEW.last_tick AND f.item_id=station_inventory.item_id),0),last_tick=NEW.last_tick "
                        + "WHERE station_id=NEW.home_station_id; "
                        + "UPDATE station_simulation_state SET credits=credits+(NEW.cargo*25)+COALESCE((SELECT SUM(i.base_value*f.quantity) "
                        + "FROM freight_lot f JOIN item_catalogue i ON i.item_id=f.item_id "
                        + "WHERE f.assigned_npc_vessel_id=NEW.npc_vessel_id AND f.status='DELIVERED' "
                        + "AND f.delivered_tick=NEW.last_tick),0),supplies=supplies+NEW.cargo WHERE station_id=NEW.home_station_id; "
                        + "INSERT OR IGNORE INTO treasury_transaction(transaction_id,world_id,station_id,tick_sequence,category,"
                        + "credits_delta,counterparty_type,counterparty_id,memo) SELECT f.lot_id||':delivery',f.world_id,"
                        + "NEW.home_station_id,NEW.last_tick,'FREIGHT',i.base_value*f.quantity,'NPC_VESSEL',NEW.npc_vessel_id,"
                        + "'Delivered freight lot '||f.lot_id FROM freight_lot f JOIN item_catalogue i ON i.item_id=f.item_id "
                        + "WHERE f.assigned_npc_vessel_id=NEW.npc_vessel_id AND f.status='DELIVERED' AND f.delivered_tick=NEW.last_tick; "
                        + "UPDATE npc_vessel SET status='DOCKED',mission_id=NULL,destination_location_id=NULL,route_progress=0,"
                        + "cargo=0,supplies=MIN(100,supplies+10) WHERE npc_vessel_id=NEW.npc_vessel_id; END",
                "CREATE TRIGGER passive_freight_offers AFTER UPDATE OF last_cycle_tick ON passive_simulation_config "
                        + "WHEN NEW.last_cycle_tick IS NOT NULL AND (OLD.last_cycle_tick IS NULL OR NEW.last_cycle_tick>OLD.last_cycle_tick) BEGIN "
                        + "INSERT OR IGNORE INTO freight_lot(lot_id,world_id,source_station_id,destination_station_id,item_id,"
                        + "quantity,status,created_tick,updated_tick) SELECT dest.station_id||':'||dest.item_id||':'||NEW.last_cycle_tick,"
                        + "NEW.world_id,(SELECT src.station_id FROM station_inventory src JOIN station_simulation_state ss "
                        + "ON ss.station_id=src.station_id WHERE ss.world_id=NEW.world_id AND src.item_id=dest.item_id "
                        + "AND src.station_id<>dest.station_id AND src.quantity-src.reserved>src.reorder_point "
                        + "ORDER BY src.quantity-src.reserved DESC,src.station_id LIMIT 1),dest.station_id,dest.item_id,"
                        + "MIN(20,MAX(1,dest.reorder_point-dest.quantity)),'READY',NEW.last_cycle_tick,NEW.last_cycle_tick "
                        + "FROM station_inventory dest JOIN station_simulation_state ds ON ds.station_id=dest.station_id "
                        + "WHERE ds.world_id=NEW.world_id AND ds.status<>'FALLEN' AND dest.quantity<dest.reorder_point "
                        + "AND EXISTS (SELECT 1 FROM station_inventory src JOIN station_simulation_state ss ON ss.station_id=src.station_id "
                        + "WHERE ss.world_id=NEW.world_id AND src.item_id=dest.item_id AND src.station_id<>dest.station_id "
                        + "AND src.quantity-src.reserved>src.reorder_point); END",
                "CREATE INDEX IF NOT EXISTS freight_player_offer_index ON freight_lot(world_id,status,assigned_player_vessel_id,created_tick)"
        );
    }
}
