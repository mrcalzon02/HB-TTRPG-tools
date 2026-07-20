package io.github.mrcalzon02.barotrauma.persistence;

import java.util.ArrayList;
import java.util.List;

/** Schema 028: explicit, conserved NPC migration and evacuation flows using the existing NPC transit layer. */
public final class NpcPopulationMigrationSchema {
    private NpcPopulationMigrationSchema() { }

    public static List<String> statements() {
        List<String> statements = new ArrayList<>();
        statements.add("DROP TRIGGER IF EXISTS npc_demographic_finalize_tick");
        statements.add("DROP VIEW IF EXISTS npc_population_accounting_observation");
        statements.add("DROP INDEX IF EXISTS npc_population_ledger_tick_index");
        statements.add("ALTER TABLE npc_population_ledger RENAME TO npc_population_ledger_schema027");
        statements.add("""
                CREATE TABLE npc_population_ledger (
                    ledger_id TEXT PRIMARY KEY,
                    world_id TEXT NOT NULL,
                    population_id TEXT NOT NULL,
                    station_id TEXT NOT NULL,
                    tick_sequence INTEGER NOT NULL CHECK(tick_sequence >= 0),
                    before_total INTEGER NOT NULL CHECK(before_total >= 0),
                    births INTEGER NOT NULL DEFAULT 0 CHECK(births >= 0),
                    deaths INTEGER NOT NULL DEFAULT 0 CHECK(deaths >= 0),
                    immigration INTEGER NOT NULL DEFAULT 0 CHECK(immigration >= 0),
                    emigration INTEGER NOT NULL DEFAULT 0 CHECK(emigration >= 0),
                    disaster_losses INTEGER NOT NULL DEFAULT 0 CHECK(disaster_losses >= 0),
                    other_gains INTEGER NOT NULL DEFAULT 0 CHECK(other_gains >= 0),
                    other_losses INTEGER NOT NULL DEFAULT 0 CHECK(other_losses >= 0),
                    after_total INTEGER NOT NULL CHECK(after_total >= 0),
                    housing_capacity INTEGER NOT NULL CHECK(housing_capacity >= 0),
                    life_support_capacity INTEGER NOT NULL CHECK(life_support_capacity >= 0),
                    employment_capacity INTEGER NOT NULL CHECK(employment_capacity >= 0),
                    morale INTEGER NOT NULL CHECK(morale BETWEEN 0 AND 100),
                    population_index_before INTEGER NOT NULL CHECK(population_index_before BETWEEN 0 AND 100),
                    population_index_after INTEGER NOT NULL CHECK(population_index_after BETWEEN 0 AND 100),
                    primary_cause TEXT NOT NULL CHECK(primary_cause IN (
                        'BIRTHS','DEATHS','DISASTER','SUPPLY_RECOVERY','SUPPLY_SHORTAGE','ABANDONMENT',
                        'IMMIGRATION','EMIGRATION','EVACUATION','MIGRATION','RETURN','OTHER')),
                    evidence_key TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    UNIQUE(population_id,tick_sequence),
                    CHECK(after_total=before_total+births+immigration+other_gains
                                      -deaths-emigration-disaster_losses-other_losses),
                    FOREIGN KEY(world_id) REFERENCES world_metadata(world_id),
                    FOREIGN KEY(population_id) REFERENCES npc_population_state(population_id),
                    FOREIGN KEY(station_id) REFERENCES world_station(station_id)
                )
                """);
        statements.add("""
                INSERT INTO npc_population_ledger(
                    ledger_id,world_id,population_id,station_id,tick_sequence,before_total,births,deaths,
                    immigration,emigration,disaster_losses,other_gains,other_losses,after_total,
                    housing_capacity,life_support_capacity,employment_capacity,morale,
                    population_index_before,population_index_after,primary_cause,evidence_key,summary)
                SELECT ledger_id,world_id,population_id,station_id,tick_sequence,before_total,births,deaths,
                       immigration,emigration,disaster_losses,other_gains,other_losses,after_total,
                       housing_capacity,life_support_capacity,employment_capacity,morale,
                       population_index_before,population_index_after,primary_cause,evidence_key,summary
                FROM npc_population_ledger_schema027
                """);
        statements.add("DROP TABLE npc_population_ledger_schema027");
        statements.add("CREATE INDEX npc_population_ledger_tick_index ON npc_population_ledger(world_id,tick_sequence DESC,primary_cause,population_id)");
        statements.add("""
                CREATE VIEW npc_population_accounting_observation AS
                SELECT l.ledger_id,l.world_id,l.population_id,l.station_id,ws.display_name AS station_name,
                       l.tick_sequence,l.before_total,l.births,l.deaths,l.immigration,l.emigration,
                       l.disaster_losses,l.other_gains,l.other_losses,l.after_total,l.housing_capacity,
                       l.life_support_capacity,l.employment_capacity,l.morale,l.population_index_before,
                       l.population_index_after,l.primary_cause,l.evidence_key,l.summary,
                       r.baseline_population_per_index,r.reconciliation_status,
                       d.effective_capacity,d.morale_after,d.support_score,d.pressure_score,
                       d.surplus_support_ticks,d.shortage_pressure_ticks,d.overcrowding_ticks,
                       d.overcrowding_state,d.attack_damage_points
                FROM npc_population_ledger l
                JOIN world_station ws ON ws.station_id=l.station_id
                JOIN npc_population_reconciliation r ON r.population_id=l.population_id
                LEFT JOIN npc_demographic_tick_result d
                  ON d.population_id=l.population_id AND d.tick_sequence=l.tick_sequence
                """);
        statements.add(NpcDemographicLifecycleFinalizer.trigger());

        statements.add("ALTER TABLE population_flow ADD COLUMN flow_kind TEXT NOT NULL DEFAULT 'ORDINARY_MIGRATION' CHECK(flow_kind IN ('ORDINARY_MIGRATION','WORKER_TRANSFER','REFUGEE_EVACUATION','EMERGENCY_RELOCATION'))");
        statements.add("ALTER TABLE population_flow ADD COLUMN destination_population_id TEXT REFERENCES npc_population_state(population_id)");
        statements.add("ALTER TABLE population_flow ADD COLUMN origin_station_id TEXT REFERENCES world_station(station_id)");
        statements.add("ALTER TABLE population_flow ADD COLUMN destination_station_id TEXT REFERENCES world_station(station_id)");
        statements.add("ALTER TABLE population_flow ADD COLUMN assigned_npc_vessel_id TEXT REFERENCES npc_vessel(npc_vessel_id)");
        statements.add("ALTER TABLE population_flow ADD COLUMN transit_leg_id TEXT REFERENCES npc_transit_leg(leg_id)");
        statements.add("ALTER TABLE population_flow ADD COLUMN transport_units_required INTEGER NOT NULL DEFAULT 1 CHECK(transport_units_required >= 1)");
        statements.add("ALTER TABLE population_flow ADD COLUMN transport_capacity INTEGER NOT NULL DEFAULT 0 CHECK(transport_capacity >= 0)");
        statements.add("ALTER TABLE population_flow ADD COLUMN reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK(reserved_quantity >= 0)");
        statements.add("ALTER TABLE population_flow ADD COLUMN embarked_quantity INTEGER NOT NULL DEFAULT 0 CHECK(embarked_quantity >= 0)");
        statements.add("ALTER TABLE population_flow ADD COLUMN arrived_quantity INTEGER NOT NULL DEFAULT 0 CHECK(arrived_quantity >= 0)");
        statements.add("ALTER TABLE population_flow ADD COLUMN returned_quantity INTEGER NOT NULL DEFAULT 0 CHECK(returned_quantity >= 0)");
        statements.add("ALTER TABLE population_flow ADD COLUMN stranded_quantity INTEGER NOT NULL DEFAULT 0 CHECK(stranded_quantity >= 0)");
        statements.add("ALTER TABLE population_flow ADD COLUMN preparation_started_tick INTEGER CHECK(preparation_started_tick >= 0)");
        statements.add("ALTER TABLE population_flow ADD COLUMN progress_ticks INTEGER NOT NULL DEFAULT 0 CHECK(progress_ticks >= 0)");
        statements.add("ALTER TABLE population_flow ADD COLUMN duration_ticks INTEGER CHECK(duration_ticks >= 1)");
        statements.add("ALTER TABLE population_flow ADD COLUMN return_tick INTEGER CHECK(return_tick >= 0)");
        statements.add("ALTER TABLE population_flow ADD COLUMN failure_reason TEXT");
        statements.add("ALTER TABLE population_flow ADD COLUMN origin_released INTEGER NOT NULL DEFAULT 0 CHECK(origin_released IN (0,1))");

        statements.add("""
                CREATE TABLE npc_population_flow_cohort (
                    flow_id TEXT NOT NULL,
                    cohort_key TEXT NOT NULL CHECK(cohort_key IN (
                        'CIVILIANS','INDUSTRIAL_WORKERS','LOGISTICS_WORKERS','SECURITY_PERSONNEL',
                        'MEDICAL_PERSONNEL','SCIENTIFIC_PERSONNEL','TEMPORARY_RESIDENTS','REFUGEES')),
                    planned_quantity INTEGER NOT NULL CHECK(planned_quantity >= 0),
                    embarked_quantity INTEGER NOT NULL DEFAULT 0 CHECK(embarked_quantity >= 0),
                    arrived_quantity INTEGER NOT NULL DEFAULT 0 CHECK(arrived_quantity >= 0),
                    returned_quantity INTEGER NOT NULL DEFAULT 0 CHECK(returned_quantity >= 0),
                    losses INTEGER NOT NULL DEFAULT 0 CHECK(losses >= 0),
                    stranded_quantity INTEGER NOT NULL DEFAULT 0 CHECK(stranded_quantity >= 0),
                    PRIMARY KEY(flow_id,cohort_key),
                    CHECK(embarked_quantity<=planned_quantity),
                    CHECK(arrived_quantity+returned_quantity+losses+stranded_quantity<=embarked_quantity),
                    FOREIGN KEY(flow_id) REFERENCES population_flow(flow_id) ON DELETE CASCADE
                )
                """);
        statements.add("""
                CREATE TABLE npc_population_flow_transition (
                    transition_id TEXT PRIMARY KEY,
                    flow_id TEXT NOT NULL,
                    world_id TEXT NOT NULL,
                    from_status TEXT NOT NULL,
                    to_status TEXT NOT NULL,
                    tick_sequence INTEGER NOT NULL CHECK(tick_sequence >= 0),
                    quantity INTEGER NOT NULL CHECK(quantity >= 0),
                    losses INTEGER NOT NULL DEFAULT 0 CHECK(losses >= 0),
                    stranded_quantity INTEGER NOT NULL DEFAULT 0 CHECK(stranded_quantity >= 0),
                    evidence_key TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    UNIQUE(flow_id,to_status,tick_sequence),
                    FOREIGN KEY(flow_id) REFERENCES population_flow(flow_id) ON DELETE CASCADE,
                    FOREIGN KEY(world_id) REFERENCES world_metadata(world_id)
                )
                """);
        statements.add("CREATE UNIQUE INDEX npc_population_one_active_origin_flow ON population_flow(population_id) WHERE entity_type='NPC_POPULATION' AND status IN ('PLANNED','PREPARING','IN_TRANSIT','RETURNING')");
        statements.add("CREATE INDEX npc_population_flow_destination_index ON population_flow(destination_population_id,status,updated_tick DESC)");
        statements.add("CREATE INDEX npc_population_flow_transport_index ON population_flow(assigned_npc_vessel_id,status,updated_tick DESC)");
        statements.add("CREATE INDEX npc_population_flow_transition_tick_index ON npc_population_flow_transition(world_id,tick_sequence DESC,flow_id)");
        statements.add("""
                CREATE TRIGGER npc_population_flow_status_guard
                BEFORE UPDATE OF status ON population_flow
                WHEN OLD.status<>NEW.status AND NOT (
                    (OLD.status='PLANNED' AND NEW.status IN ('PREPARING','CANCELLED')) OR
                    (OLD.status='PREPARING' AND NEW.status IN ('IN_TRANSIT','FAILED','CANCELLED')) OR
                    (OLD.status='IN_TRANSIT' AND NEW.status IN ('ARRIVED','RETURNING','FAILED')) OR
                    (OLD.status='RETURNING' AND NEW.status IN ('ARRIVED','FAILED','CANCELLED')))
                BEGIN
                    SELECT RAISE(ABORT,'Invalid population flow status transition.');
                END
                """);
        statements.add("""
                CREATE TRIGGER npc_population_flow_conservation_guard
                BEFORE UPDATE ON population_flow
                WHEN NEW.entity_type='NPC_POPULATION' AND (
                    NEW.reserved_quantity>NEW.quantity OR NEW.embarked_quantity>NEW.quantity OR
                    NEW.arrived_quantity>NEW.embarked_quantity OR NEW.returned_quantity>NEW.embarked_quantity OR
                    NEW.losses>NEW.embarked_quantity OR NEW.stranded_quantity>NEW.embarked_quantity OR
                    (NEW.status='ARRIVED' AND
                        NEW.arrived_quantity+NEW.returned_quantity+NEW.losses<>NEW.embarked_quantity) OR
                    (NEW.status='FAILED' AND NEW.origin_released=1 AND
                        NEW.losses+NEW.stranded_quantity<>NEW.embarked_quantity) OR
                    (NEW.status='FAILED' AND NEW.origin_released=0 AND
                        (NEW.losses<>0 OR NEW.stranded_quantity<>0)) OR
                    (NEW.status='CANCELLED' AND
                        (NEW.origin_released<>0 OR NEW.embarked_quantity<>0 OR NEW.arrived_quantity<>0 OR
                         NEW.returned_quantity<>0 OR NEW.losses<>0 OR NEW.stranded_quantity<>0)))
                BEGIN
                    SELECT RAISE(ABORT,'Population flow violates physical conservation.');
                END
                """);
        statements.add("""
                CREATE TRIGGER npc_population_flow_terminal_immutable
                BEFORE UPDATE ON population_flow
                WHEN OLD.status IN ('ARRIVED','FAILED','CANCELLED')
                BEGIN
                    SELECT RAISE(ABORT,'Terminal population flows are immutable.');
                END
                """);
        statements.add("""
                CREATE VIEW npc_population_flow_observation AS
                SELECT f.flow_id,f.world_id,f.entity_type,f.population_id,f.destination_population_id,
                       f.flow_kind,f.status,f.cause,f.quantity,f.reserved_quantity,f.embarked_quantity,
                       f.arrived_quantity,f.returned_quantity,f.losses,f.stranded_quantity,
                       f.transport_units_required,f.transport_capacity,f.assigned_npc_vessel_id,
                       COALESCE(v.display_name,'') transport_name,f.transit_leg_id,
                       f.origin_station_id,COALESCE(os.display_name,'') origin_station_name,
                       f.destination_station_id,COALESCE(ds.display_name,'') destination_station_name,
                       f.origin_location_id,ol.display_name origin_location_name,
                       f.destination_location_id,COALESCE(dl.display_name,'') destination_location_name,
                       f.preparation_started_tick,f.departure_tick,f.arrival_tick,f.return_tick,
                       f.progress_ticks,f.duration_ticks,f.created_tick,f.updated_tick,f.failure_reason,f.summary
                FROM population_flow f
                JOIN world_location ol ON ol.location_id=f.origin_location_id
                LEFT JOIN world_location dl ON dl.location_id=f.destination_location_id
                LEFT JOIN world_station os ON os.station_id=f.origin_station_id
                LEFT JOIN world_station ds ON ds.station_id=f.destination_station_id
                LEFT JOIN npc_vessel v ON v.npc_vessel_id=f.assigned_npc_vessel_id
                """);
        statements.add("""
                CREATE VIEW npc_population_migration_conservation AS
                SELECT w.world_id,
                       COALESCE((SELECT SUM(civilians+industrial_workers+logistics_workers+security_personnel+
                                                   medical_personnel+scientific_personnel+temporary_residents+refugees)
                                 FROM npc_population_state p WHERE p.world_id=w.world_id),0) station_population,
                       COALESCE((SELECT SUM(embarked_quantity-arrived_quantity-returned_quantity-losses)
                                 FROM population_flow f WHERE f.world_id=w.world_id
                                   AND f.entity_type='NPC_POPULATION' AND f.origin_released=1),0) population_in_flows,
                       COALESCE((SELECT SUM(losses) FROM population_flow f WHERE f.world_id=w.world_id
                                 AND f.entity_type='NPC_POPULATION'),0) recorded_migration_losses
                FROM world_metadata w
                """);
        statements.add("INSERT OR IGNORE INTO station_change_reason(reason_code,display_name,reason_family) VALUES "
                + "('MIGRATION_CASUALTIES','Migration casualties','POPULATION'),"
                + "('STRANDING','Stranded population','POPULATION'),"
                + "('RETURN','Returned population','POPULATION')");
        return List.copyOf(statements);
    }
}
