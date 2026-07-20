package io.github.mrcalzon02.barotrauma.persistence;

import java.util.List;

/** Schema 023: allocation-backed faction plans with auditable resource availability. */
public final class FactionPlanCausalitySchema {
    private FactionPlanCausalitySchema() { }

    public static List<String> statements() {
        return List.of(
                "INSERT OR IGNORE INTO station_change_reason(reason_code,display_name,reason_family) "
                        + "VALUES ('FACTION_RELEASE','Faction release','FACTION')",

                """
                CREATE TABLE faction_plan_resource_allocation (
                    plan_id TEXT NOT NULL,
                    source_station_id TEXT NOT NULL,
                    resource_type TEXT NOT NULL CHECK(resource_type IN ('CREDITS','PERSONNEL','EQUIPMENT')),
                    resource_id TEXT NOT NULL,
                    reserved_units INTEGER NOT NULL CHECK(reserved_units > 0),
                    consumed_units INTEGER NOT NULL DEFAULT 0 CHECK(consumed_units >= 0),
                    released_units INTEGER NOT NULL DEFAULT 0 CHECK(released_units >= 0),
                    created_tick INTEGER NOT NULL CHECK(created_tick >= 0),
                    updated_tick INTEGER NOT NULL CHECK(updated_tick >= created_tick),
                    PRIMARY KEY(plan_id,resource_type,resource_id),
                    CHECK(consumed_units+released_units<=reserved_units),
                    CHECK((resource_type='CREDITS' AND resource_id='station-credits')
                       OR (resource_type='PERSONNEL' AND resource_id='station-workforce')
                       OR (resource_type='EQUIPMENT' AND resource_id='item-ammunition')),
                    FOREIGN KEY(plan_id) REFERENCES faction_plan(plan_id) ON DELETE CASCADE,
                    FOREIGN KEY(source_station_id) REFERENCES world_station(station_id)
                )
                """,
                "CREATE INDEX faction_allocation_station_index ON faction_plan_resource_allocation(source_station_id,resource_type,updated_tick)",

                """
                CREATE TRIGGER faction_allocation_identity_is_immutable
                BEFORE UPDATE OF plan_id,source_station_id,resource_type,resource_id,reserved_units,created_tick
                ON faction_plan_resource_allocation BEGIN
                    SELECT RAISE(ABORT,'Faction allocation identity and reserved amount are immutable.');
                END
                """,
                """
                CREATE TRIGGER faction_allocation_settlement_is_monotonic
                BEFORE UPDATE OF consumed_units,released_units ON faction_plan_resource_allocation
                WHEN NEW.consumed_units<OLD.consumed_units OR NEW.released_units<OLD.released_units BEGIN
                    SELECT RAISE(ABORT,'Faction allocation settlement cannot move backwards.');
                END
                """,
                """
                CREATE TRIGGER faction_allocation_history_is_durable
                BEFORE DELETE ON faction_plan_resource_allocation BEGIN
                    SELECT RAISE(ABORT,'Faction allocation history cannot be deleted.');
                END
                """,
                """
                CREATE TRIGGER faction_legacy_plan_cannot_advance
                BEFORE UPDATE OF phase,status ON faction_plan
                WHEN (NEW.phase<>OLD.phase OR NEW.status<>OLD.status)
                  AND OLD.status IN ('PLANNED','ACTIVE','COMPROMISED')
                  AND NEW.status NOT IN ('FAILED','CANCELLED')
                  AND NOT EXISTS (SELECT 1 FROM faction_plan_resource_allocation a WHERE a.plan_id=OLD.plan_id)
                BEGIN
                    SELECT RAISE(ABORT,'A legacy faction plan cannot advance without resource allocations.');
                END
                """,
                """
                CREATE TRIGGER faction_terminal_plan_requires_settled_allocations
                BEFORE UPDATE OF phase,status ON faction_plan
                WHEN NEW.status IN ('SUCCEEDED','FAILED','CANCELLED')
                  AND EXISTS (
                      SELECT 1 FROM faction_plan_resource_allocation a
                      WHERE a.plan_id=OLD.plan_id
                        AND a.consumed_units+a.released_units<a.reserved_units
                  )
                BEGIN
                    SELECT RAISE(ABORT,'A terminal faction plan cannot retain outstanding allocations.');
                END
                """,

                """
                CREATE VIEW faction_plan_resource_balance AS
                SELECT p.plan_id,p.world_id,p.sponsor_faction,p.target_station_id,p.target_faction,
                       p.objective,p.phase,p.status,p.created_tick,p.updated_tick,p.due_tick,
                       p.credits_required,p.credits_reserved,p.credits_spent,
                       p.personnel_required,p.personnel_reserved,p.equipment_required,p.equipment_reserved,
                       COALESCE(SUM(CASE WHEN a.resource_type='CREDITS' THEN a.reserved_units ELSE 0 END),0)
                           allocated_credits,
                       COALESCE(SUM(CASE WHEN a.resource_type='CREDITS'
                            THEN a.reserved_units-a.consumed_units-a.released_units ELSE 0 END),0)
                           outstanding_credits,
                       COALESCE(SUM(CASE WHEN a.resource_type='PERSONNEL' THEN a.reserved_units ELSE 0 END),0)
                           allocated_personnel,
                       COALESCE(SUM(CASE WHEN a.resource_type='PERSONNEL'
                            THEN a.reserved_units-a.consumed_units-a.released_units ELSE 0 END),0)
                           outstanding_personnel,
                       COALESCE(SUM(CASE WHEN a.resource_type='EQUIPMENT' THEN a.reserved_units ELSE 0 END),0)
                           allocated_equipment,
                       COALESCE(SUM(CASE WHEN a.resource_type='EQUIPMENT'
                            THEN a.reserved_units-a.consumed_units-a.released_units ELSE 0 END),0)
                           outstanding_equipment,
                       CASE
                         WHEN COUNT(a.plan_id)=0 AND p.status IN ('FAILED','CANCELLED') THEN 'UNFUNDED'
                         WHEN COUNT(a.plan_id)=0 THEN 'LEGACY_UNBACKED'
                         WHEN COALESCE(SUM(CASE WHEN a.resource_type='CREDITS' THEN a.reserved_units ELSE 0 END),0)<>p.credits_required
                           OR COALESCE(SUM(CASE WHEN a.resource_type='PERSONNEL' THEN a.reserved_units ELSE 0 END),0)<>p.personnel_required
                           OR COALESCE(SUM(CASE WHEN a.resource_type='EQUIPMENT' THEN a.reserved_units ELSE 0 END),0)<>p.equipment_required
                           OR COALESCE(SUM(CASE WHEN a.resource_type='CREDITS' THEN a.reserved_units ELSE 0 END),0)<>p.credits_reserved
                           OR COALESCE(SUM(CASE WHEN a.resource_type='PERSONNEL' THEN a.reserved_units ELSE 0 END),0)<>p.personnel_reserved
                           OR COALESCE(SUM(CASE WHEN a.resource_type='EQUIPMENT' THEN a.reserved_units ELSE 0 END),0)<>p.equipment_reserved
                           THEN 'PARTIALLY_BACKED'
                         WHEN p.status IN ('SUCCEEDED','FAILED','CANCELLED')
                          AND COALESCE(SUM(a.reserved_units-a.consumed_units-a.released_units),0)=0 THEN 'SETTLED'
                         ELSE 'FULLY_BACKED' END backing_status
                FROM faction_plan p LEFT JOIN faction_plan_resource_allocation a ON a.plan_id=p.plan_id
                GROUP BY p.plan_id
                """,

                """
                CREATE VIEW station_faction_resource_availability AS
                SELECT p.station_id,p.world_id,s.credits available_credits,p.resident_count,p.workforce_count,
                       MAX(0,p.workforce_count-COALESCE((
                           SELECT SUM(a.reserved_units-a.consumed_units-a.released_units)
                           FROM faction_plan_resource_allocation a
                           WHERE a.source_station_id=p.station_id AND a.resource_type='PERSONNEL'),0))
                           available_workforce,
                       COALESCE(i.quantity,0) ammunition_quantity,COALESCE(i.reserved,0) ammunition_reserved,
                       MAX(0,COALESCE(i.quantity,0)-COALESCE(i.reserved,0)) available_ammunition
                FROM station_population_state p
                JOIN station_simulation_state s ON s.station_id=p.station_id
                LEFT JOIN station_inventory i ON i.station_id=p.station_id AND i.item_id='item-ammunition'
                """,

                """
                CREATE VIEW faction_plan_story AS
                SELECT p.plan_id,p.world_id,p.sponsor_faction,p.target_station_id,p.objective,p.phase,p.status,
                       p.created_tick,p.updated_tick,p.due_tick,b.backing_status,b.outstanding_credits,
                       b.outstanding_personnel,b.outstanding_equipment,e.event_id,e.tick_sequence,e.severity,
                       e.headline,e.narrative,pe.plan_phase,pe.credits_delta,pe.personnel_delta,pe.equipment_delta
                FROM faction_plan p JOIN faction_plan_resource_balance b ON b.plan_id=p.plan_id
                LEFT JOIN faction_plan_event pe ON pe.plan_id=p.plan_id
                LEFT JOIN station_event e ON e.event_id=pe.event_id
                """
        );
    }
}
