package io.github.mrcalzon02.barotrauma.persistence;

import java.util.List;

/** Schema 019: durable production attempts, outcomes, stories, and typed material effects. */
public final class StationProductionCausalitySchema {
    private StationProductionCausalitySchema() { }

    public static List<String> statements() {
        return List.of(
                "INSERT OR IGNORE INTO station_event_type(event_type,display_name,story_required) VALUES "
                        + "('PRODUCTION_SHORTFALL','Production shortfall',1),"
                        + "('PRODUCTION_FAILURE','Production failure',1)",
                "CREATE TABLE station_production_outcome (run_id TEXT PRIMARY KEY, outcome_type TEXT NOT NULL "
                        + "CHECK(outcome_type IN ('SUCCESS','INPUT_SHORTFALL','CREDIT_SHORTFALL','EQUIPMENT_FAILURE','SABOTAGE')), "
                        + "shortfall_item_id TEXT, required_units INTEGER NOT NULL DEFAULT 0 CHECK(required_units>=0), "
                        + "available_units INTEGER NOT NULL DEFAULT 0 CHECK(available_units>=0), "
                        + "credits_required INTEGER NOT NULL DEFAULT 0 CHECK(credits_required>=0), "
                        + "credits_available INTEGER NOT NULL DEFAULT 0 CHECK(credits_available>=0), "
                        + "suspected_actor_type TEXT, suspected_actor_id TEXT, "
                        + "CHECK(outcome_type<>'INPUT_SHORTFALL' OR shortfall_item_id IS NOT NULL), "
                        + "FOREIGN KEY(run_id) REFERENCES station_production_run(run_id) ON DELETE CASCADE, "
                        + "FOREIGN KEY(shortfall_item_id) REFERENCES item_catalogue(item_id))",
                "CREATE INDEX station_production_outcome_type_index ON station_production_outcome(outcome_type,run_id)",

                "CREATE TRIGGER station_production_shortfall_attempt BEFORE UPDATE OF last_cycle_tick ON passive_simulation_config "
                        + "WHEN NEW.last_cycle_tick IS NOT NULL AND (OLD.last_cycle_tick IS NULL OR NEW.last_cycle_tick>OLD.last_cycle_tick) BEGIN "
                        + "INSERT OR IGNORE INTO station_production_run(run_id,station_id,recipe_id,tick_sequence,cycles,status) "
                        + "SELECT s.station_id||':'||r.recipe_id||':'||NEW.last_cycle_tick,s.station_id,r.recipe_id,NEW.last_cycle_tick,1,'FAILED' "
                        + "FROM station_simulation_state s CROSS JOIN production_recipe r WHERE s.world_id=NEW.world_id AND s.status<>'FALLEN' "
                        + "AND r.recipe_id=(SELECT r2.recipe_id FROM production_recipe r2 WHERE NEW.last_cycle_tick%r2.cycle_ticks=0 ORDER BY r2.recipe_id LIMIT 1) "
                        + "AND EXISTS (SELECT 1 FROM production_recipe_input ri LEFT JOIN station_inventory inv ON inv.station_id=s.station_id AND inv.item_id=ri.item_id "
                        + "WHERE ri.recipe_id=r.recipe_id AND COALESCE(inv.quantity-inv.reserved,0)<ri.quantity); END",

                "CREATE TRIGGER station_production_outcome_gate BEFORE INSERT ON station_production_run WHEN NEW.status='COMPLETE' AND ("
                        + "COALESCE((SELECT credits FROM station_simulation_state WHERE station_id=NEW.station_id),0)<"
                        + "(SELECT credit_cost*NEW.cycles FROM production_recipe WHERE recipe_id=NEW.recipe_id) "
                        + "OR ((NEW.tick_sequence+unicode(substr(NEW.station_id,1,1)))%29)=0 "
                        + "OR ((NEW.tick_sequence+unicode(substr(NEW.station_id,1,1)))%17)=0) BEGIN "
                        + "INSERT OR IGNORE INTO station_production_run(run_id,station_id,recipe_id,tick_sequence,cycles,status) "
                        + "VALUES (NEW.run_id,NEW.station_id,NEW.recipe_id,NEW.tick_sequence,NEW.cycles,'FAILED'); SELECT RAISE(IGNORE); END",

                "DROP TRIGGER IF EXISTS station_production_apply",
                "CREATE TRIGGER station_production_apply AFTER INSERT ON station_production_run BEGIN "
                        + "INSERT OR IGNORE INTO station_production_outcome(run_id,outcome_type,shortfall_item_id,required_units,available_units,credits_required,credits_available,suspected_actor_type,suspected_actor_id) "
                        + "SELECT NEW.run_id,CASE WHEN NEW.status='COMPLETE' THEN 'SUCCESS' "
                        + "WHEN EXISTS (SELECT 1 FROM production_recipe_input ri LEFT JOIN station_inventory inv ON inv.station_id=NEW.station_id AND inv.item_id=ri.item_id WHERE ri.recipe_id=NEW.recipe_id AND COALESCE(inv.quantity-inv.reserved,0)<ri.quantity*NEW.cycles) THEN 'INPUT_SHORTFALL' "
                        + "WHEN s.credits<r.credit_cost*NEW.cycles THEN 'CREDIT_SHORTFALL' "
                        + "WHEN ((NEW.tick_sequence+unicode(substr(NEW.station_id,1,1)))%29)=0 THEN 'SABOTAGE' ELSE 'EQUIPMENT_FAILURE' END,"
                        + "(SELECT ri.item_id FROM production_recipe_input ri LEFT JOIN station_inventory inv ON inv.station_id=NEW.station_id AND inv.item_id=ri.item_id WHERE ri.recipe_id=NEW.recipe_id AND COALESCE(inv.quantity-inv.reserved,0)<ri.quantity*NEW.cycles ORDER BY ri.item_id LIMIT 1),"
                        + "COALESCE((SELECT ri.quantity*NEW.cycles FROM production_recipe_input ri LEFT JOIN station_inventory inv ON inv.station_id=NEW.station_id AND inv.item_id=ri.item_id WHERE ri.recipe_id=NEW.recipe_id AND COALESCE(inv.quantity-inv.reserved,0)<ri.quantity*NEW.cycles ORDER BY ri.item_id LIMIT 1),0),"
                        + "COALESCE((SELECT MAX(0,inv.quantity-inv.reserved) FROM production_recipe_input ri LEFT JOIN station_inventory inv ON inv.station_id=NEW.station_id AND inv.item_id=ri.item_id WHERE ri.recipe_id=NEW.recipe_id AND COALESCE(inv.quantity-inv.reserved,0)<ri.quantity*NEW.cycles ORDER BY ri.item_id LIMIT 1),0),"
                        + "r.credit_cost*NEW.cycles,s.credits,CASE WHEN NEW.status='FAILED' AND ((NEW.tick_sequence+unicode(substr(NEW.station_id,1,1)))%29)=0 THEN 'UNKNOWN' END,"
                        + "CASE WHEN NEW.status='FAILED' AND ((NEW.tick_sequence+unicode(substr(NEW.station_id,1,1)))%29)=0 THEN 'unidentified-saboteur' END "
                        + "FROM station_simulation_state s JOIN production_recipe r ON r.recipe_id=NEW.recipe_id WHERE s.station_id=NEW.station_id; "

                        + "INSERT OR IGNORE INTO station_event(event_id,world_id,station_id,tick_sequence,canonical_time,event_type,severity,headline,narrative,actor_type,actor_id,cause_type,cause_id,deterministic_key,visibility,correlation_id,policy_version,created_at) "
                        + "SELECT NEW.run_id||':event',s.world_id,NEW.station_id,NEW.tick_sequence,m.canonical_time,"
                        + "CASE o.outcome_type WHEN 'SUCCESS' THEN 'PRODUCTION' WHEN 'SABOTAGE' THEN 'SABOTAGE' WHEN 'EQUIPMENT_FAILURE' THEN 'PRODUCTION_FAILURE' ELSE 'PRODUCTION_SHORTFALL' END,"
                        + "CASE o.outcome_type WHEN 'SUCCESS' THEN 0 WHEN 'INPUT_SHORTFALL' THEN 2 WHEN 'CREDIT_SHORTFALL' THEN 2 WHEN 'EQUIPMENT_FAILURE' THEN 3 ELSE 4 END,"
                        + "CASE o.outcome_type WHEN 'SUCCESS' THEN r.display_name||' completed' WHEN 'INPUT_SHORTFALL' THEN r.display_name||' halted by missing inputs' WHEN 'CREDIT_SHORTFALL' THEN r.display_name||' halted by insufficient credits' WHEN 'EQUIPMENT_FAILURE' THEN r.display_name||' failed after an equipment breakdown' ELSE r.display_name||' was sabotaged' END,"
                        + "CASE o.outcome_type WHEN 'SUCCESS' THEN 'The station consumed declared inputs, paid '||o.credits_required||' credits, and produced the declared output.' "
                        + "WHEN 'INPUT_SHORTFALL' THEN 'Production required '||o.required_units||' units of '||COALESCE(i.display_name,o.shortfall_item_id)||' but only '||o.available_units||' unreserved units were available.' "
                        + "WHEN 'CREDIT_SHORTFALL' THEN 'Production required '||o.credits_required||' credits but the station had only '||o.credits_available||'.' "
                        + "WHEN 'EQUIPMENT_FAILURE' THEN 'A deterministic equipment failure stopped the run before materials or credits were committed.' "
                        + "ELSE 'Deliberate interference stopped the run and damaged station integrity before investigators could identify the actor.' END,"
                        + "CASE WHEN o.outcome_type='SABOTAGE' THEN o.suspected_actor_type ELSE 'SYSTEM' END,"
                        + "CASE WHEN o.outcome_type='SABOTAGE' THEN o.suspected_actor_id ELSE 'station-production' END,'PRODUCTION_RUN',NEW.run_id,'production:'||NEW.recipe_id||':'||NEW.tick_sequence,"
                        + "CASE WHEN o.outcome_type='SABOTAGE' THEN 'INFERRED' ELSE 'OBSERVED' END,s.world_id||':tick:'||NEW.tick_sequence,(SELECT policy_version FROM station_story_policy WHERE active=1),COALESCE(m.canonical_time,'tick:'||NEW.tick_sequence) "
                        + "FROM station_production_outcome o JOIN production_recipe r ON r.recipe_id=NEW.recipe_id JOIN station_simulation_state s ON s.station_id=NEW.station_id "
                        + "LEFT JOIN item_catalogue i ON i.item_id=o.shortfall_item_id LEFT JOIN world_simulation_metadata m ON m.world_id=s.world_id WHERE o.run_id=NEW.run_id; "

                        + "INSERT OR IGNORE INTO station_change(change_id,event_id,statistic_key,value_type,previous_value,delta_value,resulting_value,unit,reason_code,affected_type,affected_id) "
                        + "SELECT NEW.run_id||':input:'||ri.item_id,NEW.run_id||':event','inventory.'||i.item_key,'INTEGER',inv.quantity,-ri.quantity*NEW.cycles,inv.quantity-ri.quantity*NEW.cycles,'units','PRODUCTION_INPUT','ITEM',ri.item_id "
                        + "FROM production_recipe_input ri JOIN station_inventory inv ON inv.station_id=NEW.station_id AND inv.item_id=ri.item_id JOIN item_catalogue i ON i.item_id=ri.item_id WHERE ri.recipe_id=NEW.recipe_id AND NEW.status='COMPLETE'; "
                        + "INSERT OR IGNORE INTO station_change(change_id,event_id,statistic_key,value_type,previous_value,delta_value,resulting_value,unit,reason_code,affected_type,affected_id) "
                        + "SELECT NEW.run_id||':output:'||ro.item_id,NEW.run_id||':event','inventory.'||i.item_key,'INTEGER',inv.quantity,ro.quantity*NEW.cycles,inv.quantity+ro.quantity*NEW.cycles,'units','PRODUCTION_OUTPUT','ITEM',ro.item_id "
                        + "FROM production_recipe_output ro JOIN station_inventory inv ON inv.station_id=NEW.station_id AND inv.item_id=ro.item_id JOIN item_catalogue i ON i.item_id=ro.item_id WHERE ro.recipe_id=NEW.recipe_id AND NEW.status='COMPLETE'; "
                        + "INSERT OR IGNORE INTO station_change(change_id,event_id,statistic_key,value_type,previous_value,delta_value,resulting_value,unit,reason_code,affected_type,affected_id) "
                        + "SELECT NEW.run_id||':credits',NEW.run_id||':event','station.credits','INTEGER',s.credits,-r.credit_cost*NEW.cycles,s.credits-r.credit_cost*NEW.cycles,'credits','INDUSTRIAL_CONSUMPTION','STATION',NEW.station_id "
                        + "FROM station_simulation_state s JOIN production_recipe r ON r.recipe_id=NEW.recipe_id WHERE s.station_id=NEW.station_id AND NEW.status='COMPLETE' AND r.credit_cost>0; "
                        + "INSERT OR IGNORE INTO station_change(change_id,event_id,statistic_key,value_type,previous_value,delta_value,resulting_value,unit,reason_code,affected_type,affected_id) "
                        + "SELECT NEW.run_id||':integrity',NEW.run_id||':event','station.integrity','INTEGER',s.integrity,-MIN(s.integrity,CASE o.outcome_type WHEN 'SABOTAGE' THEN 2 ELSE 1 END),MAX(0,s.integrity-CASE o.outcome_type WHEN 'SABOTAGE' THEN 2 ELSE 1 END),'points',CASE o.outcome_type WHEN 'SABOTAGE' THEN 'SABOTAGE_DAMAGE' ELSE 'ACCIDENT_DAMAGE' END,'STATION',NEW.station_id "
                        + "FROM station_simulation_state s JOIN station_production_outcome o ON o.run_id=NEW.run_id WHERE s.station_id=NEW.station_id AND o.outcome_type IN ('SABOTAGE','EQUIPMENT_FAILURE') AND s.integrity>0; "

                        + "UPDATE station_inventory SET quantity=quantity-(SELECT quantity*NEW.cycles FROM production_recipe_input ri WHERE ri.recipe_id=NEW.recipe_id AND ri.item_id=station_inventory.item_id),last_tick=NEW.tick_sequence WHERE NEW.status='COMPLETE' AND station_id=NEW.station_id AND item_id IN (SELECT item_id FROM production_recipe_input WHERE recipe_id=NEW.recipe_id); "
                        + "UPDATE station_inventory SET quantity=quantity+(SELECT quantity*NEW.cycles FROM production_recipe_output ro WHERE ro.recipe_id=NEW.recipe_id AND ro.item_id=station_inventory.item_id),last_tick=NEW.tick_sequence WHERE NEW.status='COMPLETE' AND station_id=NEW.station_id AND item_id IN (SELECT item_id FROM production_recipe_output WHERE recipe_id=NEW.recipe_id); "
                        + "UPDATE station_simulation_state SET credits=credits-(SELECT credit_cost*NEW.cycles FROM production_recipe WHERE recipe_id=NEW.recipe_id) WHERE NEW.status='COMPLETE' AND station_id=NEW.station_id; "
                        + "UPDATE station_simulation_state SET integrity=MAX(0,integrity-CASE (SELECT outcome_type FROM station_production_outcome WHERE run_id=NEW.run_id) WHEN 'SABOTAGE' THEN 2 ELSE 1 END) WHERE station_id=NEW.station_id AND (SELECT outcome_type FROM station_production_outcome WHERE run_id=NEW.run_id) IN ('SABOTAGE','EQUIPMENT_FAILURE'); "
                        + "INSERT OR IGNORE INTO treasury_transaction(transaction_id,world_id,station_id,tick_sequence,category,credits_delta,counterparty_type,counterparty_id,memo) SELECT NEW.run_id||':treasury',s.world_id,NEW.station_id,NEW.tick_sequence,'PRODUCTION',-r.credit_cost*NEW.cycles,'RECIPE',NEW.recipe_id,'Production run: '||r.display_name FROM station_simulation_state s JOIN production_recipe r ON r.recipe_id=NEW.recipe_id WHERE s.station_id=NEW.station_id AND NEW.status='COMPLETE'; END",

                "CREATE VIEW station_production_story AS SELECT p.run_id,p.station_id,p.recipe_id,p.tick_sequence,p.cycles,p.status,o.outcome_type,o.shortfall_item_id,o.required_units,o.available_units,o.credits_required,o.credits_available,e.event_id,e.event_type,e.severity,e.headline,e.narrative,e.visibility,e.correlation_id FROM station_production_run p JOIN station_production_outcome o ON o.run_id=p.run_id JOIN station_event e ON e.cause_type='PRODUCTION_RUN' AND e.cause_id=p.run_id"
        );
    }
}
