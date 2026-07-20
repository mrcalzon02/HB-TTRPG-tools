package io.github.mrcalzon02.barotrauma.persistence;

import java.util.List;

/** Schema 026: time-gated NPC voyage legs with persisted player-equivalent incident schedules. */
public final class NpcTransitObserverSchema {
    private NpcTransitObserverSchema() { }

    public static List<String> statements() {
        return List.of(
                "CREATE TABLE npc_transit_leg (leg_id TEXT PRIMARY KEY, world_id TEXT NOT NULL, "
                        + "npc_vessel_id TEXT NOT NULL, mission_id TEXT, leg_type TEXT NOT NULL "
                        + "CHECK(leg_type IN ('OUTBOUND','RETURN')), origin_location_id TEXT NOT NULL, "
                        + "destination_location_id TEXT NOT NULL, route_id TEXT NOT NULL, fleet_response_leg_id TEXT, "
                        + "status TEXT NOT NULL "
                        + "CHECK(status IN ('IN_TRANSIT','ARRIVED','DISABLED','LOST','CANCELLED')), "
                        + "started_tick INTEGER NOT NULL CHECK(started_tick >= 0), "
                        + "elapsed_ticks INTEGER NOT NULL DEFAULT 0 CHECK(elapsed_ticks >= 0), "
                        + "base_duration_ticks INTEGER NOT NULL CHECK(base_duration_ticks >= 1), "
                        + "scheduled_arrival_tick INTEGER NOT NULL, "
                        + "actual_arrival_tick INTEGER CHECK(actual_arrival_tick >= started_tick), "
                        + "player_equivalent_incident_count INTEGER NOT NULL "
                        + "CHECK(player_equivalent_incident_count BETWEEN 1 AND 24), incidents_resolved INTEGER NOT NULL DEFAULT 0 "
                        + "CHECK(incidents_resolved >= 0 AND incidents_resolved <= player_equivalent_incident_count), "
                        + "cumulative_delay_ticks INTEGER NOT NULL DEFAULT 0 CHECK(cumulative_delay_ticks >= 0), "
                        + "last_report_band INTEGER NOT NULL DEFAULT 0 CHECK(last_report_band BETWEEN 0 AND 4), "
                        + "schedule_policy_version TEXT NOT NULL, last_progress_tick INTEGER NOT NULL "
                        + "CHECK(last_progress_tick >= started_tick), "
                        + "CHECK(scheduled_arrival_tick=started_tick+base_duration_ticks+cumulative_delay_ticks), "
                        + "FOREIGN KEY(world_id) REFERENCES world_metadata(world_id), "
                        + "FOREIGN KEY(npc_vessel_id) REFERENCES npc_vessel(npc_vessel_id), "
                        + "FOREIGN KEY(mission_id) REFERENCES world_mission(mission_id), "
                        + "FOREIGN KEY(origin_location_id) REFERENCES world_location(location_id), "
                        + "FOREIGN KEY(destination_location_id) REFERENCES world_location(location_id), "
                        + "FOREIGN KEY(fleet_response_leg_id) REFERENCES fleet_response_transit_leg(leg_id))",
                "CREATE UNIQUE INDEX npc_one_active_transit_leg ON npc_transit_leg(npc_vessel_id) "
                        + "WHERE status='IN_TRANSIT'",
                "CREATE INDEX npc_transit_leg_history ON npc_transit_leg(world_id,npc_vessel_id,started_tick DESC)",
                "CREATE TABLE npc_transit_incident_schedule (leg_id TEXT NOT NULL, incident_ordinal INTEGER NOT NULL "
                        + "CHECK(incident_ordinal >= 1), scheduled_offset_ticks INTEGER NOT NULL "
                        + "CHECK(scheduled_offset_ticks >= 1), due_tick INTEGER NOT NULL CHECK(due_tick >= 0), "
                        + "deterministic_sequence INTEGER NOT NULL "
                        + "CHECK(deterministic_sequence >= 0), status TEXT NOT NULL DEFAULT 'PENDING' "
                        + "CHECK(status IN ('PENDING','RESOLVED','CANCELLED')), resolved_tick INTEGER CHECK(resolved_tick >= 0), "
                        + "added_delay_ticks INTEGER NOT NULL DEFAULT 0 CHECK(added_delay_ticks >= 0), "
                        + "encounter_id TEXT, voyage_log_id TEXT, PRIMARY KEY(leg_id,incident_ordinal), "
                        + "UNIQUE(leg_id,scheduled_offset_ticks), UNIQUE(encounter_id), UNIQUE(voyage_log_id), "
                        + "FOREIGN KEY(leg_id) REFERENCES npc_transit_leg(leg_id) ON DELETE CASCADE, "
                        + "FOREIGN KEY(encounter_id) REFERENCES world_encounter(encounter_id), "
                        + "FOREIGN KEY(voyage_log_id) REFERENCES npc_voyage_log(log_id))",
                "CREATE INDEX npc_transit_incident_due ON npc_transit_incident_schedule(leg_id,status,due_tick)",
                "CREATE VIEW npc_observable_transit AS SELECT l.leg_id,l.world_id,l.npc_vessel_id,v.display_name,"
                        + "l.leg_type,l.status,l.origin_location_id,origin.display_name origin_name,"
                        + "l.destination_location_id,destination.display_name destination_name,l.started_tick,"
                        + "l.elapsed_ticks route_progress,l.base_duration_ticks,"
                        + "l.base_duration_ticks+l.cumulative_delay_ticks route_ticks_required,"
                        + "l.started_tick+l.base_duration_ticks base_arrival_tick,l.scheduled_arrival_tick,"
                        + "MAX(0,l.base_duration_ticks+l.cumulative_delay_ticks-l.elapsed_ticks) remaining_ticks,"
                        + "l.player_equivalent_incident_count,l.incidents_resolved,"
                        + "l.player_equivalent_incident_count-l.incidents_resolved incidents_remaining,"
                        + "l.cumulative_delay_ticks,l.schedule_policy_version,l.last_progress_tick,v.hull,v.supplies,"
                        + "(SELECT MIN(s.due_tick) FROM npc_transit_incident_schedule s "
                        + "WHERE s.leg_id=l.leg_id AND s.status='PENDING') next_incident_tick "
                        + "FROM npc_transit_leg l JOIN npc_vessel v ON v.npc_vessel_id=l.npc_vessel_id "
                        + "JOIN world_location origin ON origin.location_id=l.origin_location_id "
                        + "JOIN world_location destination ON destination.location_id=l.destination_location_id "
                        + "WHERE l.leg_id=(SELECT candidate.leg_id FROM npc_transit_leg candidate "
                        + "WHERE candidate.npc_vessel_id=l.npc_vessel_id "
                        + "ORDER BY CASE WHEN candidate.status='IN_TRANSIT' THEN 0 ELSE 1 END,"
                        + "candidate.started_tick DESC LIMIT 1)"
        );
    }
}
