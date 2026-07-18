package io.github.mrcalzon02.barotrauma.persistence;

import java.util.List;

/** Schema 005: backfills passive-world constraints for worlds created during schema-004 development. */
public final class PassiveWorldSchemaHardening {
    private PassiveWorldSchemaHardening() { }

    public static List<String> statements() {
        return List.of(
                "DELETE FROM station_research_project WHERE rowid NOT IN (SELECT MIN(rowid) FROM station_research_project GROUP BY world_id, station_id, topic)",
                "CREATE UNIQUE INDEX IF NOT EXISTS station_research_topic_unique ON station_research_project(world_id, station_id, topic)",
                "DROP TRIGGER IF EXISTS npc_return_arrival",
                "CREATE TRIGGER npc_return_arrival AFTER UPDATE OF status ON npc_vessel WHEN OLD.status='RETURNING' AND NEW.status='WORKING' BEGIN UPDATE station_simulation_state SET credits=credits+(NEW.cargo*25), supplies=supplies+NEW.cargo WHERE station_id=NEW.home_station_id; UPDATE npc_vessel SET status='DOCKED', mission_id=NULL, destination_location_id=NULL, route_progress=0, cargo=0, supplies=MIN(100,supplies+10) WHERE npc_vessel_id=NEW.npc_vessel_id; END"
        );
    }
}
