package io.github.mrcalzon02.barotrauma.persistence;

import java.util.List;

/** Schema 029: durable settlement founding, expansion, abandonment, and reclamation projects. */
public final class SettlementLifecycleSchema {
    private SettlementLifecycleSchema() { }

    public static List<String> statements() {
        return List.of(
                """
                CREATE TABLE settlement_project (
                    project_id TEXT PRIMARY KEY,
                    world_id TEXT NOT NULL,
                    project_kind TEXT NOT NULL CHECK(project_kind IN (
                        'FOUNDING','EXPANSION','ABANDONMENT','RECLAMATION')),
                    status TEXT NOT NULL CHECK(status IN (
                        'PLANNED','PREPARING','ACTIVE','BLOCKED','COMPLETE','FAILED','CANCELLED')),
                    sponsor_faction TEXT,
                    origin_station_id TEXT REFERENCES world_station(station_id),
                    target_station_id TEXT REFERENCES world_station(station_id),
                    target_location_id TEXT NOT NULL REFERENCES world_location(location_id),
                    related_population_id TEXT REFERENCES npc_population_state(population_id),
                    assigned_npc_vessel_id TEXT REFERENCES npc_vessel(npc_vessel_id),
                    required_material_units INTEGER NOT NULL CHECK(required_material_units >= 0),
                    committed_material_units INTEGER NOT NULL DEFAULT 0 CHECK(committed_material_units >= 0),
                    required_supply_units INTEGER NOT NULL CHECK(required_supply_units >= 0),
                    committed_supply_units INTEGER NOT NULL DEFAULT 0 CHECK(committed_supply_units >= 0),
                    required_population INTEGER NOT NULL CHECK(required_population >= 0),
                    committed_population INTEGER NOT NULL DEFAULT 0 CHECK(committed_population >= 0),
                    required_transport_units INTEGER NOT NULL DEFAULT 1 CHECK(required_transport_units >= 0),
                    committed_transport_units INTEGER NOT NULL DEFAULT 0 CHECK(committed_transport_units >= 0),
                    required_security INTEGER NOT NULL CHECK(required_security BETWEEN 0 AND 100),
                    current_security INTEGER NOT NULL DEFAULT 0 CHECK(current_security BETWEEN 0 AND 100),
                    progress_units INTEGER NOT NULL DEFAULT 0 CHECK(progress_units >= 0),
                    target_progress_units INTEGER NOT NULL CHECK(target_progress_units >= 1),
                    created_tick INTEGER NOT NULL CHECK(created_tick >= 0),
                    preparation_started_tick INTEGER CHECK(preparation_started_tick >= 0),
                    activated_tick INTEGER CHECK(activated_tick >= 0),
                    completed_tick INTEGER CHECK(completed_tick >= 0),
                    updated_tick INTEGER NOT NULL CHECK(updated_tick >= 0),
                    failure_reason TEXT,
                    summary TEXT NOT NULL,
                    CHECK(committed_material_units <= required_material_units),
                    CHECK(committed_supply_units <= required_supply_units),
                    CHECK(committed_population <= required_population),
                    CHECK(committed_transport_units <= required_transport_units),
                    CHECK(progress_units <= target_progress_units),
                    CHECK((status='COMPLETE' AND progress_units=target_progress_units) OR status<>'COMPLETE'),
                    FOREIGN KEY(world_id) REFERENCES world_metadata(world_id)
                )
                """,
                "CREATE INDEX settlement_project_world_tick_index ON settlement_project(world_id,updated_tick DESC,project_kind,status)",
                "CREATE INDEX settlement_project_location_index ON settlement_project(target_location_id,status,updated_tick DESC)",
                "CREATE UNIQUE INDEX settlement_one_active_location_project ON settlement_project(target_location_id) WHERE status IN ('PLANNED','PREPARING','ACTIVE','BLOCKED')",
                """
                CREATE TABLE settlement_project_contribution (
                    contribution_id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    world_id TEXT NOT NULL,
                    contribution_kind TEXT NOT NULL CHECK(contribution_kind IN (
                        'MATERIALS','SUPPLIES','POPULATION','TRANSPORT','SECURITY','WORK')),
                    quantity INTEGER NOT NULL CHECK(quantity > 0),
                    source_station_id TEXT REFERENCES world_station(station_id),
                    source_population_id TEXT REFERENCES npc_population_state(population_id),
                    source_npc_vessel_id TEXT REFERENCES npc_vessel(npc_vessel_id),
                    related_flow_id TEXT REFERENCES population_flow(flow_id),
                    tick_sequence INTEGER NOT NULL CHECK(tick_sequence >= 0),
                    evidence_key TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    UNIQUE(project_id,evidence_key),
                    FOREIGN KEY(project_id) REFERENCES settlement_project(project_id) ON DELETE CASCADE,
                    FOREIGN KEY(world_id) REFERENCES world_metadata(world_id)
                )
                """,
                "CREATE INDEX settlement_project_contribution_tick_index ON settlement_project_contribution(world_id,tick_sequence DESC,project_id)",
                """
                CREATE TABLE settlement_project_transition (
                    transition_id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    world_id TEXT NOT NULL,
                    from_status TEXT NOT NULL,
                    to_status TEXT NOT NULL,
                    tick_sequence INTEGER NOT NULL CHECK(tick_sequence >= 0),
                    progress_units INTEGER NOT NULL CHECK(progress_units >= 0),
                    evidence_key TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    UNIQUE(project_id,to_status,tick_sequence),
                    FOREIGN KEY(project_id) REFERENCES settlement_project(project_id) ON DELETE CASCADE,
                    FOREIGN KEY(world_id) REFERENCES world_metadata(world_id)
                )
                """,
                "CREATE INDEX settlement_project_transition_tick_index ON settlement_project_transition(world_id,tick_sequence DESC,project_id)",
                """
                CREATE TRIGGER settlement_project_status_guard
                BEFORE UPDATE OF status ON settlement_project
                WHEN OLD.status<>NEW.status AND NOT (
                    (OLD.status='PLANNED' AND NEW.status IN ('PREPARING','CANCELLED')) OR
                    (OLD.status='PREPARING' AND NEW.status IN ('ACTIVE','BLOCKED','FAILED','CANCELLED')) OR
                    (OLD.status='ACTIVE' AND NEW.status IN ('BLOCKED','COMPLETE','FAILED','CANCELLED')) OR
                    (OLD.status='BLOCKED' AND NEW.status IN ('ACTIVE','FAILED','CANCELLED')))
                BEGIN
                    SELECT RAISE(ABORT,'Invalid settlement project status transition.');
                END
                """,
                """
                CREATE TRIGGER settlement_project_terminal_immutable
                BEFORE UPDATE ON settlement_project
                WHEN OLD.status IN ('COMPLETE','FAILED','CANCELLED')
                BEGIN
                    SELECT RAISE(ABORT,'Terminal settlement projects are immutable.');
                END
                """,
                """
                CREATE TRIGGER settlement_project_commitment_guard
                BEFORE UPDATE ON settlement_project
                WHEN NEW.committed_material_units>NEW.required_material_units
                  OR NEW.committed_supply_units>NEW.required_supply_units
                  OR NEW.committed_population>NEW.required_population
                  OR NEW.committed_transport_units>NEW.required_transport_units
                  OR NEW.progress_units>NEW.target_progress_units
                  OR (NEW.status='ACTIVE' AND (
                        NEW.committed_material_units<NEW.required_material_units OR
                        NEW.committed_supply_units<NEW.required_supply_units OR
                        NEW.committed_population<NEW.required_population OR
                        NEW.committed_transport_units<NEW.required_transport_units OR
                        NEW.current_security<NEW.required_security))
                BEGIN
                    SELECT RAISE(ABORT,'Settlement project lacks conserved committed support.');
                END
                """,
                """
                CREATE VIEW settlement_project_observation AS
                SELECT p.project_id,p.world_id,p.project_kind,p.status,p.sponsor_faction,
                       p.origin_station_id,COALESCE(os.display_name,'') origin_station_name,
                       p.target_station_id,COALESCE(ts.display_name,'') target_station_name,
                       p.target_location_id,tl.display_name target_location_name,
                       p.related_population_id,p.assigned_npc_vessel_id,
                       COALESCE(v.display_name,'') assigned_transport_name,
                       p.required_material_units,p.committed_material_units,
                       p.required_supply_units,p.committed_supply_units,
                       p.required_population,p.committed_population,
                       p.required_transport_units,p.committed_transport_units,
                       p.required_security,p.current_security,p.progress_units,p.target_progress_units,
                       p.created_tick,p.preparation_started_tick,p.activated_tick,p.completed_tick,
                       p.updated_tick,p.failure_reason,p.summary,
                       CASE WHEN p.target_progress_units=0 THEN 0
                            ELSE CAST((100*p.progress_units)/p.target_progress_units AS INTEGER) END progress_percent
                FROM settlement_project p
                JOIN world_location tl ON tl.location_id=p.target_location_id
                LEFT JOIN world_station os ON os.station_id=p.origin_station_id
                LEFT JOIN world_station ts ON ts.station_id=p.target_station_id
                LEFT JOIN npc_vessel v ON v.npc_vessel_id=p.assigned_npc_vessel_id
                """,
                "INSERT OR IGNORE INTO station_change_reason(reason_code,display_name,reason_family) VALUES "
                        + "('SETTLEMENT_FOUNDING','Settlement founding','FRONTIER'),"
                        + "('SETTLEMENT_EXPANSION','Settlement expansion','FRONTIER'),"
                        + "('SETTLEMENT_ABANDONMENT','Settlement abandonment','FRONTIER'),"
                        + "('SETTLEMENT_RECLAMATION','Settlement reclamation','FRONTIER')"
        );
    }
}
