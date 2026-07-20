package io.github.mrcalzon02.barotrauma.persistence;

import java.util.List;

/** Schema-027 table replacement and durable demographic state. */
final class NpcDemographicLifecycleStructure {
    private NpcDemographicLifecycleStructure() { }

    static void appendTo(List<String> statements) {
        statements.add("DROP TRIGGER IF EXISTS station_passive_consumption");
        statements.add("DROP TRIGGER IF EXISTS npc_population_tick_accounting");
        statements.add("DROP TRIGGER IF EXISTS station_population_capture_before_tick");
        statements.add("DROP TRIGGER IF EXISTS station_population_finalize_tick");
        statements.add("DROP TRIGGER IF EXISTS station_population_attack_casualties");
        statements.add("DROP TRIGGER IF EXISTS station_population_direct_frontier_evacuation");
        statements.add("DROP TRIGGER IF EXISTS station_population_direct_fallen_evacuation");
        statements.add("DROP TRIGGER IF EXISTS station_population_seed");
        statements.add("DROP TRIGGER IF EXISTS station_population_baseline_is_immutable");
        statements.add("DROP VIEW IF EXISTS station_population_tick_plan");
        statements.add("DROP VIEW IF EXISTS station_population_attack_plan");
        statements.add("DROP VIEW IF EXISTS station_population_coverage");
        statements.add("DROP VIEW IF EXISTS npc_population_accounting_observation");
        statements.add("DROP INDEX IF EXISTS npc_population_ledger_tick_index");
        statements.add("ALTER TABLE npc_population_ledger RENAME TO npc_population_ledger_schema016");
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
                    primary_cause TEXT NOT NULL
                        CHECK(primary_cause IN ('BIRTHS','DEATHS','DISASTER','SUPPLY_RECOVERY',
                                                'SUPPLY_SHORTAGE','ABANDONMENT','OTHER')),
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
                FROM npc_population_ledger_schema016
                """);
        statements.add("DROP TABLE npc_population_ledger_schema016");
        statements.add("CREATE INDEX npc_population_ledger_tick_index ON npc_population_ledger(world_id,tick_sequence DESC,primary_cause,population_id)");

        statements.add("""
                CREATE TABLE npc_demographic_state (
                    population_id TEXT PRIMARY KEY,
                    world_id TEXT NOT NULL,
                    station_id TEXT NOT NULL UNIQUE,
                    surplus_support_ticks INTEGER NOT NULL DEFAULT 0 CHECK(surplus_support_ticks BETWEEN 0 AND 30),
                    shortage_pressure_ticks INTEGER NOT NULL DEFAULT 0 CHECK(shortage_pressure_ticks BETWEEN 0 AND 30),
                    overcrowding_ticks INTEGER NOT NULL DEFAULT 0 CHECK(overcrowding_ticks BETWEEN 0 AND 30),
                    overcrowding_state TEXT NOT NULL DEFAULT 'WITHIN_CAPACITY'
                        CHECK(overcrowding_state IN ('WITHIN_CAPACITY','SUPPRESSED','STRAINED','CRITICAL')),
                    last_support_score INTEGER NOT NULL DEFAULT 50 CHECK(last_support_score BETWEEN 0 AND 100),
                    last_pressure_score INTEGER NOT NULL DEFAULT 0 CHECK(last_pressure_score BETWEEN 0 AND 100),
                    last_birth_tick INTEGER CHECK(last_birth_tick >= 0),
                    last_mortality_tick INTEGER CHECK(last_mortality_tick >= 0),
                    last_tick INTEGER NOT NULL CHECK(last_tick >= 0),
                    FOREIGN KEY(population_id) REFERENCES npc_population_state(population_id),
                    FOREIGN KEY(world_id) REFERENCES world_metadata(world_id),
                    FOREIGN KEY(station_id) REFERENCES world_station(station_id)
                )
                """);
        statements.add("CREATE INDEX npc_demographic_pressure_index ON npc_demographic_state(world_id,overcrowding_state,shortage_pressure_ticks DESC,last_tick DESC)");
        statements.add("""
                CREATE TABLE npc_demographic_tick_baseline (
                    station_id TEXT PRIMARY KEY,
                    world_id TEXT NOT NULL,
                    population_id TEXT NOT NULL,
                    tick_sequence INTEGER NOT NULL CHECK(tick_sequence >= 0),
                    station_status_before TEXT NOT NULL,
                    frontier_state_before TEXT NOT NULL,
                    population_index_before INTEGER NOT NULL CHECK(population_index_before BETWEEN 0 AND 100),
                    before_total INTEGER NOT NULL CHECK(before_total >= 0),
                    workforce_before INTEGER NOT NULL CHECK(workforce_before >= 0),
                    morale_before INTEGER NOT NULL CHECK(morale_before BETWEEN 0 AND 100),
                    housing_capacity INTEGER NOT NULL CHECK(housing_capacity >= 0),
                    life_support_capacity INTEGER NOT NULL CHECK(life_support_capacity >= 0),
                    employment_capacity INTEGER NOT NULL CHECK(employment_capacity >= 0),
                    ready INTEGER NOT NULL DEFAULT 0 CHECK(ready IN (0,1)),
                    FOREIGN KEY(station_id) REFERENCES world_station(station_id),
                    FOREIGN KEY(world_id) REFERENCES world_metadata(world_id),
                    FOREIGN KEY(population_id) REFERENCES npc_population_state(population_id)
                )
                """);
        statements.add("""
                CREATE TABLE npc_demographic_tick_result (
                    result_id TEXT PRIMARY KEY,
                    world_id TEXT NOT NULL,
                    population_id TEXT NOT NULL,
                    station_id TEXT NOT NULL,
                    tick_sequence INTEGER NOT NULL CHECK(tick_sequence >= 0),
                    before_total INTEGER NOT NULL CHECK(before_total >= 0),
                    births INTEGER NOT NULL CHECK(births >= 0),
                    deaths INTEGER NOT NULL CHECK(deaths >= 0),
                    disaster_losses INTEGER NOT NULL CHECK(disaster_losses >= 0),
                    other_losses INTEGER NOT NULL CHECK(other_losses >= 0),
                    after_total INTEGER NOT NULL CHECK(after_total >= 0),
                    workforce_before INTEGER NOT NULL CHECK(workforce_before >= 0),
                    workforce_after INTEGER NOT NULL CHECK(workforce_after >= 0 AND workforce_after <= after_total),
                    housing_capacity INTEGER NOT NULL CHECK(housing_capacity >= 0),
                    life_support_capacity INTEGER NOT NULL CHECK(life_support_capacity >= 0),
                    employment_capacity INTEGER NOT NULL CHECK(employment_capacity >= 0),
                    effective_capacity INTEGER NOT NULL CHECK(effective_capacity >= 0),
                    morale_before INTEGER NOT NULL CHECK(morale_before BETWEEN 0 AND 100),
                    morale_after INTEGER NOT NULL CHECK(morale_after BETWEEN 0 AND 100),
                    support_score INTEGER NOT NULL CHECK(support_score BETWEEN 0 AND 100),
                    pressure_score INTEGER NOT NULL CHECK(pressure_score BETWEEN 0 AND 100),
                    surplus_support_ticks INTEGER NOT NULL CHECK(surplus_support_ticks BETWEEN 0 AND 30),
                    shortage_pressure_ticks INTEGER NOT NULL CHECK(shortage_pressure_ticks BETWEEN 0 AND 30),
                    overcrowding_ticks INTEGER NOT NULL CHECK(overcrowding_ticks BETWEEN 0 AND 30),
                    overcrowding_state TEXT NOT NULL
                        CHECK(overcrowding_state IN ('WITHIN_CAPACITY','SUPPRESSED','STRAINED','CRITICAL')),
                    population_index_before INTEGER NOT NULL CHECK(population_index_before BETWEEN 0 AND 100),
                    population_index_after INTEGER NOT NULL CHECK(population_index_after BETWEEN 0 AND 100),
                    primary_cause TEXT NOT NULL CHECK(primary_cause IN ('BIRTHS','DEATHS','DISASTER','ABANDONMENT','OTHER')),
                    evidence_key TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    after_civilians INTEGER NOT NULL CHECK(after_civilians >= 0),
                    after_industrial_workers INTEGER NOT NULL CHECK(after_industrial_workers >= 0),
                    after_logistics_workers INTEGER NOT NULL CHECK(after_logistics_workers >= 0),
                    after_security_personnel INTEGER NOT NULL CHECK(after_security_personnel >= 0),
                    after_medical_personnel INTEGER NOT NULL CHECK(after_medical_personnel >= 0),
                    after_scientific_personnel INTEGER NOT NULL CHECK(after_scientific_personnel >= 0),
                    after_temporary_residents INTEGER NOT NULL CHECK(after_temporary_residents >= 0),
                    after_refugees INTEGER NOT NULL CHECK(after_refugees >= 0),
                    attack_damage_points INTEGER NOT NULL CHECK(attack_damage_points >= 0),
                    UNIQUE(population_id,tick_sequence),
                    CHECK(after_total=before_total+births-deaths-disaster_losses-other_losses),
                    CHECK(after_total=after_civilians+after_industrial_workers+after_logistics_workers
                                      +after_security_personnel+after_medical_personnel+after_scientific_personnel
                                      +after_temporary_residents+after_refugees),
                    FOREIGN KEY(world_id) REFERENCES world_metadata(world_id),
                    FOREIGN KEY(population_id) REFERENCES npc_population_state(population_id),
                    FOREIGN KEY(station_id) REFERENCES world_station(station_id)
                )
                """);
        statements.add("CREATE INDEX npc_demographic_result_tick_index ON npc_demographic_tick_result(world_id,tick_sequence DESC,primary_cause,pressure_score DESC)");
    }
}
