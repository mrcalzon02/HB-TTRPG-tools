package io.github.mrcalzon02.barotrauma.persistence;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;

/** Schema 018: one bounded causal story and typed consumption changes per station tick. */
public final class StationConsumptionCausalitySchema {
    private StationConsumptionCausalitySchema() { }

    public static List<String> statements() {
        return List.of(
                "INSERT OR IGNORE INTO station_change_reason(reason_code,display_name,reason_family) VALUES ('SUPPLY_SHORTAGE','Supply shortage','ECONOMY'),('SHORTAGE_RECOVERY','Shortage recovery','RECOVERY')",
                "CREATE TABLE station_causal_tick_baseline (station_id TEXT NOT NULL, world_id TEXT NOT NULL, tick_sequence INTEGER NOT NULL CHECK(tick_sequence >= 0), supplies_before INTEGER NOT NULL CHECK(supplies_before >= 0), ration_stock_before INTEGER NOT NULL CHECK(ration_stock_before >= 0), shortage_ticks_before INTEGER NOT NULL CHECK(shortage_ticks_before >= 0), surplus_ticks_before INTEGER NOT NULL CHECK(surplus_ticks_before >= 0), PRIMARY KEY(station_id,tick_sequence), FOREIGN KEY(station_id) REFERENCES world_station(station_id), FOREIGN KEY(world_id) REFERENCES world_metadata(world_id))",

                "CREATE TRIGGER station_causal_capture_before_tick BEFORE UPDATE OF last_tick ON station_simulation_state WHEN NEW.last_tick>OLD.last_tick AND EXISTS (SELECT 1 FROM station_civilization_state c WHERE c.station_id=NEW.station_id) BEGIN "
                        + "INSERT OR REPLACE INTO station_causal_tick_baseline(station_id,world_id,tick_sequence,supplies_before,ration_stock_before,shortage_ticks_before,surplus_ticks_before) SELECT OLD.station_id,OLD.world_id,NEW.last_tick,OLD.supplies,COALESCE((SELECT quantity FROM station_inventory WHERE station_id=OLD.station_id AND item_id='item-rations'),0),c.shortage_ticks,c.surplus_ticks FROM station_civilization_state c WHERE c.station_id=OLD.station_id; END",

                "CREATE TRIGGER station_consumption_causal_event AFTER UPDATE OF status ON station_simulation_state WHEN EXISTS (SELECT 1 FROM station_causal_tick_baseline b WHERE b.station_id=NEW.station_id AND b.tick_sequence=NEW.last_tick) AND EXISTS (SELECT 1 FROM station_consumption_log l WHERE l.station_id=NEW.station_id AND l.tick_sequence=NEW.last_tick) BEGIN "
                        + "INSERT OR IGNORE INTO station_event(event_id,world_id,station_id,tick_sequence,canonical_time,event_type,severity,headline,narrative,actor_type,actor_id,cause_type,cause_id,deterministic_key,visibility,correlation_id,policy_version,created_at) SELECT l.consumption_id||':event',l.world_id,l.station_id,l.tick_sequence,(SELECT canonical_time FROM world_simulation_metadata WHERE world_id=l.world_id),CASE WHEN l.shortage=1 THEN 'SHORTAGE' ELSE 'CONSUMPTION' END,CASE WHEN l.shortage=1 THEN MIN(5,1+c.shortage_ticks/4) ELSE 0 END,CASE WHEN l.shortage=1 THEN 'Station consumption exceeded available supply' ELSE 'Station residents consumed routine supplies' END,CASE WHEN l.shortage=1 THEN 'Residents required '||l.required_units||' ration units, consumed '||l.ration_units_consumed||', and drew '||ABS(l.abstract_supply_delta)||' abstract supply units while a shortage remained.' ELSE 'Residents consumed '||l.ration_units_consumed||' ration units and '||ABS(l.abstract_supply_delta)||' abstract supply units during the scheduled cycle.' END,'SYSTEM','passive-station-consumption','CONSUMPTION_LOG',l.consumption_id,'consumption:'||l.tick_sequence,'OBSERVED',l.world_id||':tick:'||l.tick_sequence,(SELECT policy_version FROM station_story_policy WHERE active=1),COALESCE((SELECT canonical_time FROM world_simulation_metadata WHERE world_id=l.world_id),'tick:'||l.tick_sequence) FROM station_consumption_log l JOIN station_civilization_state c ON c.station_id=l.station_id WHERE l.station_id=NEW.station_id AND l.tick_sequence=NEW.last_tick; "
                        + "INSERT OR IGNORE INTO station_change(change_id,event_id,statistic_key,value_type,previous_value,delta_value,resulting_value,unit,reason_code,affected_type,affected_id) SELECT l.consumption_id||':rations',l.consumption_id||':event','inventory.rations','INTEGER',b.ration_stock_before,l.ration_stock_after-b.ration_stock_before,l.ration_stock_after,'units','RESIDENT_CONSUMPTION','ITEM','item-rations' FROM station_consumption_log l JOIN station_causal_tick_baseline b ON b.station_id=l.station_id AND b.tick_sequence=l.tick_sequence WHERE l.station_id=NEW.station_id AND l.tick_sequence=NEW.last_tick AND l.ration_stock_after<>b.ration_stock_before; "
                        + "INSERT OR IGNORE INTO station_change(change_id,event_id,statistic_key,value_type,previous_value,delta_value,resulting_value,unit,reason_code,affected_type,affected_id) SELECT l.consumption_id||':supplies',l.consumption_id||':event','station.supplies','INTEGER',b.supplies_before,l.supplies_after-b.supplies_before,l.supplies_after,'units',CASE WHEN l.shortage=1 THEN 'SUPPLY_SHORTAGE' ELSE 'RESIDENT_CONSUMPTION' END,'STATION',l.station_id FROM station_consumption_log l JOIN station_causal_tick_baseline b ON b.station_id=l.station_id AND b.tick_sequence=l.tick_sequence WHERE l.station_id=NEW.station_id AND l.tick_sequence=NEW.last_tick AND l.supplies_after<>b.supplies_before; "
                        + "INSERT OR IGNORE INTO station_change(change_id,event_id,statistic_key,value_type,previous_value,delta_value,resulting_value,unit,reason_code,affected_type,affected_id) SELECT l.consumption_id||':shortage-ticks',l.consumption_id||':event','civilization.shortage_ticks','INTEGER',b.shortage_ticks_before,c.shortage_ticks-b.shortage_ticks_before,c.shortage_ticks,'ticks',CASE WHEN c.shortage_ticks>b.shortage_ticks_before THEN 'SUPPLY_SHORTAGE' ELSE 'SHORTAGE_RECOVERY' END,'STATION',l.station_id FROM station_consumption_log l JOIN station_causal_tick_baseline b ON b.station_id=l.station_id AND b.tick_sequence=l.tick_sequence JOIN station_civilization_state c ON c.station_id=l.station_id WHERE l.station_id=NEW.station_id AND l.tick_sequence=NEW.last_tick AND c.shortage_ticks<>b.shortage_ticks_before; "
                        + "INSERT OR IGNORE INTO station_change(change_id,event_id,statistic_key,value_type,previous_value,delta_value,resulting_value,unit,reason_code,affected_type,affected_id) SELECT l.consumption_id||':surplus-ticks',l.consumption_id||':event','civilization.surplus_ticks','INTEGER',b.surplus_ticks_before,c.surplus_ticks-b.surplus_ticks_before,c.surplus_ticks,'ticks',CASE WHEN c.surplus_ticks>b.surplus_ticks_before THEN 'RESIDENT_CONSUMPTION' ELSE 'SHORTAGE_RECOVERY' END,'STATION',l.station_id FROM station_consumption_log l JOIN station_causal_tick_baseline b ON b.station_id=l.station_id AND b.tick_sequence=l.tick_sequence JOIN station_civilization_state c ON c.station_id=l.station_id WHERE l.station_id=NEW.station_id AND l.tick_sequence=NEW.last_tick AND c.surplus_ticks<>b.surplus_ticks_before; "
                        + "DELETE FROM station_causal_tick_baseline WHERE station_id=NEW.station_id AND tick_sequence=NEW.last_tick; END",

                "CREATE VIEW station_consumption_story AS SELECT l.consumption_id,l.world_id,l.station_id,l.tick_sequence,l.required_units,l.ration_units_consumed,l.abstract_supply_delta,l.shortage,l.supplies_after,l.ration_stock_after,e.event_id,e.event_type,e.severity,e.headline,e.narrative,e.correlation_id FROM station_consumption_log l JOIN station_event e ON e.cause_type='CONSUMPTION_LOG' AND e.cause_id=l.consumption_id"
        );
    }

    public static void main(String[] args) {
        if (args.length != 1 || !args[0].equals("--base64")) {
            System.err.println("Usage: StationConsumptionCausalitySchema --base64");
            System.exit(2);
        }
        for (String statement : statements()) {
            System.out.println(Base64.getEncoder().encodeToString(statement.getBytes(StandardCharsets.UTF_8)));
        }
    }
}
