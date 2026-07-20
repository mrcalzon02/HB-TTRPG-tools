package io.github.mrcalzon02.barotrauma.persistence;

import java.util.List;
import java.util.Base64;
import java.nio.charset.StandardCharsets;

/** Schema 017: durable causal stories, typed changes, population events, and resource-backed faction plans. */
public final class StationCausalitySchema {
    private StationCausalitySchema() { }

    public static List<String> statements() {
        return List.of(
                "CREATE TABLE station_event_type (event_type TEXT PRIMARY KEY, display_name TEXT NOT NULL, story_required INTEGER NOT NULL CHECK(story_required IN (0,1)))",
                "INSERT INTO station_event_type(event_type,display_name,story_required) VALUES "
                        + "('IMPORTED_BASELINE','Imported baseline',0),('CONSUMPTION','Consumption',0),('PRODUCTION','Production',0),"
                        + "('SHORTAGE','Shortage',1),('DELIVERY','Delivery',0),('INVENTORY_LOSS','Inventory loss',1),"
                        + "('SABOTAGE','Sabotage',1),('POPULATION','Population change',1),('FACTION_PLAN','Faction plan',1),"
                        + "('ATTACK','Attack',1),('ACCIDENT','Accident',1),('RESEARCH','Research',0),"
                        + "('RECOVERY','Recovery',0),('FRONTIER_CHANGE','Frontier change',1)",

                "CREATE TABLE station_change_reason (reason_code TEXT PRIMARY KEY, display_name TEXT NOT NULL, reason_family TEXT NOT NULL CHECK(reason_family IN ('BASELINE','ECONOMY','LOGISTICS','POPULATION','FACTION','SECURITY','ENVIRONMENT','RESEARCH','RECOVERY')))",
                "INSERT INTO station_change_reason(reason_code,display_name,reason_family) VALUES "
                        + "('IMPORTED_VALUE','Imported value','BASELINE'),('RESIDENT_CONSUMPTION','Resident consumption','ECONOMY'),"
                        + "('INDUSTRIAL_CONSUMPTION','Industrial consumption','ECONOMY'),('PRODUCTION_INPUT','Production input','ECONOMY'),"
                        + "('PRODUCTION_OUTPUT','Production output','ECONOMY'),('PRODUCTION_SHORTFALL','Production shortfall','ECONOMY'),"
                        + "('FREIGHT_DELIVERY','Freight delivery','LOGISTICS'),('TRADE_SETTLEMENT','Trade settlement','LOGISTICS'),"
                        + "('SPOILAGE','Spoilage','LOGISTICS'),('THEFT','Theft','SECURITY'),('SABOTAGE_DAMAGE','Sabotage damage','SECURITY'),"
                        + "('ATTACK_DAMAGE','Attack damage','SECURITY'),('ACCIDENT_DAMAGE','Accident damage','SECURITY'),"
                        + "('BIRTHS','Births','POPULATION'),('DEATHS','Deaths','POPULATION'),('IMMIGRATION','Immigration','POPULATION'),"
                        + "('EMIGRATION','Emigration','POPULATION'),('EVACUATION','Evacuation','POPULATION'),"
                        + "('FACTION_RESERVATION','Faction reservation','FACTION'),('FACTION_EXPENDITURE','Faction expenditure','FACTION'),"
                        + "('FAUNA_PRESSURE','Fauna pressure','ENVIRONMENT'),('RESOURCE_EXTRACTION','Resource extraction','ENVIRONMENT'),"
                        + "('RESEARCH_PROGRESS','Research progress','RESEARCH'),('REINFORCEMENT','Reinforcement','RECOVERY'),"
                        + "('REPAIR','Repair','RECOVERY'),('RELIEF_DELIVERY','Relief delivery','RECOVERY')",

                "CREATE TABLE station_story_policy (policy_version INTEGER PRIMARY KEY CHECK(policy_version > 0), active INTEGER NOT NULL DEFAULT 0 CHECK(active IN (0,1)), absolute_change_threshold REAL NOT NULL CHECK(absolute_change_threshold >= 0), percentage_change_threshold REAL NOT NULL CHECK(percentage_change_threshold >= 0), routine_event_limit_per_station_tick INTEGER NOT NULL CHECK(routine_event_limit_per_station_tick > 0), created_at TEXT NOT NULL)",
                "CREATE UNIQUE INDEX one_active_station_story_policy ON station_story_policy(active) WHERE active=1",
                "INSERT INTO station_story_policy(policy_version,active,absolute_change_threshold,percentage_change_threshold,routine_event_limit_per_station_tick,created_at) VALUES (1,1,5,10,8,'2026-07-19T00:00:00Z')",

                "CREATE TABLE station_event (event_id TEXT PRIMARY KEY, world_id TEXT NOT NULL, station_id TEXT NOT NULL, tick_sequence INTEGER NOT NULL CHECK(tick_sequence >= 0), canonical_time TEXT, event_type TEXT NOT NULL, severity INTEGER NOT NULL CHECK(severity BETWEEN 0 AND 5), headline TEXT NOT NULL CHECK(length(trim(headline)) > 0), narrative TEXT NOT NULL CHECK(length(trim(narrative)) > 0), actor_type TEXT, actor_id TEXT, cause_type TEXT NOT NULL, cause_id TEXT, deterministic_key TEXT NOT NULL, visibility TEXT NOT NULL DEFAULT 'OBSERVED' CHECK(visibility IN ('OBSERVED','INFERRED','HIDDEN','DISCOVERED')), correlation_id TEXT NOT NULL, policy_version INTEGER NOT NULL, created_at TEXT NOT NULL, UNIQUE(world_id,station_id,deterministic_key), FOREIGN KEY(world_id) REFERENCES world_metadata(world_id), FOREIGN KEY(station_id) REFERENCES world_station(station_id), FOREIGN KEY(event_type) REFERENCES station_event_type(event_type), FOREIGN KEY(policy_version) REFERENCES station_story_policy(policy_version))",
                "CREATE INDEX station_event_history_index ON station_event(station_id,tick_sequence DESC,severity DESC)",
                "CREATE INDEX station_event_world_type_index ON station_event(world_id,event_type,tick_sequence DESC)",
                "CREATE INDEX station_event_correlation_index ON station_event(world_id,correlation_id)",

                "CREATE TABLE station_change (change_id TEXT PRIMARY KEY, event_id TEXT NOT NULL, statistic_key TEXT NOT NULL CHECK(length(trim(statistic_key)) > 0), value_type TEXT NOT NULL CHECK(value_type IN ('INTEGER','DECIMAL')), previous_value REAL NOT NULL, delta_value REAL NOT NULL, resulting_value REAL NOT NULL, unit TEXT NOT NULL, reason_code TEXT NOT NULL, affected_type TEXT, affected_id TEXT, CHECK(abs((previous_value+delta_value)-resulting_value) < 0.000001), FOREIGN KEY(event_id) REFERENCES station_event(event_id) ON DELETE CASCADE, FOREIGN KEY(reason_code) REFERENCES station_change_reason(reason_code))",
                "CREATE INDEX station_change_event_index ON station_change(event_id,statistic_key)",
                "CREATE INDEX station_change_reason_index ON station_change(reason_code)",

                "CREATE TABLE station_population_event (population_event_id TEXT PRIMARY KEY, event_id TEXT NOT NULL UNIQUE, population_category TEXT NOT NULL CHECK(population_category IN ('BIRTHS','ORDINARY_DEATHS','ACCIDENT_CASUALTIES','ATTACK_CASUALTIES','DISEASE','RECOVERY','IMMIGRATION','REFUGEES','EMIGRATION','EVACUATION','RECRUITMENT','CONSCRIPTION','DESERTION','REASSIGNMENT','MISSING','RESCUE_RETURN')), people_before INTEGER NOT NULL CHECK(people_before >= 0), people_delta INTEGER NOT NULL CHECK(people_delta <> 0), people_after INTEGER NOT NULL CHECK(people_after >= 0), workforce_delta INTEGER NOT NULL DEFAULT 0, CHECK(people_before+people_delta=people_after), FOREIGN KEY(event_id) REFERENCES station_event(event_id) ON DELETE CASCADE)",

                "CREATE TABLE faction_plan (plan_id TEXT PRIMARY KEY, world_id TEXT NOT NULL, sponsor_faction TEXT NOT NULL, target_station_id TEXT, target_faction TEXT, objective TEXT NOT NULL CHECK(length(trim(objective)) > 0), phase TEXT NOT NULL CHECK(phase IN ('PREPARATION','EXECUTION','DISCOVERY','CONSEQUENCE','COMPLETE','FAILED','CANCELLED')), status TEXT NOT NULL CHECK(status IN ('PLANNED','ACTIVE','COMPROMISED','SUCCEEDED','FAILED','CANCELLED')), created_tick INTEGER NOT NULL CHECK(created_tick >= 0), updated_tick INTEGER NOT NULL CHECK(updated_tick >= created_tick), due_tick INTEGER CHECK(due_tick >= created_tick), credits_required INTEGER NOT NULL DEFAULT 0 CHECK(credits_required >= 0), credits_reserved INTEGER NOT NULL DEFAULT 0 CHECK(credits_reserved >= 0 AND credits_reserved <= credits_required), credits_spent INTEGER NOT NULL DEFAULT 0 CHECK(credits_spent >= 0 AND credits_spent <= credits_reserved), personnel_required INTEGER NOT NULL DEFAULT 0 CHECK(personnel_required >= 0), personnel_reserved INTEGER NOT NULL DEFAULT 0 CHECK(personnel_reserved >= 0 AND personnel_reserved <= personnel_required), equipment_required INTEGER NOT NULL DEFAULT 0 CHECK(equipment_required >= 0), equipment_reserved INTEGER NOT NULL DEFAULT 0 CHECK(equipment_reserved >= 0 AND equipment_reserved <= equipment_required), UNIQUE(world_id,sponsor_faction,objective,created_tick), FOREIGN KEY(world_id) REFERENCES world_metadata(world_id), FOREIGN KEY(target_station_id) REFERENCES world_station(station_id))",
                "CREATE INDEX faction_plan_phase_index ON faction_plan(world_id,status,phase,updated_tick DESC)",

                "CREATE TABLE faction_plan_event (plan_id TEXT NOT NULL, event_id TEXT NOT NULL UNIQUE, plan_phase TEXT NOT NULL, credits_delta INTEGER NOT NULL DEFAULT 0, personnel_delta INTEGER NOT NULL DEFAULT 0, equipment_delta INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(plan_id,event_id), FOREIGN KEY(plan_id) REFERENCES faction_plan(plan_id) ON DELETE CASCADE, FOREIGN KEY(event_id) REFERENCES station_event(event_id) ON DELETE CASCADE)",

                "CREATE VIEW station_change_history AS SELECT e.world_id,e.station_id,e.tick_sequence,e.canonical_time,e.event_id,e.event_type,e.severity,e.headline,e.narrative,e.actor_type,e.actor_id,e.cause_type,e.cause_id,e.visibility,e.correlation_id,c.change_id,c.statistic_key,c.value_type,c.previous_value,c.delta_value,c.resulting_value,c.unit,c.reason_code,c.affected_type,c.affected_id FROM station_event e LEFT JOIN station_change c ON c.event_id=e.event_id"
        );
    }

    /** Emits the migration statements in a transport-safe form for dependency-free SQL validation. */
    public static void main(String[] args) {
        if (args.length != 1 || !args[0].equals("--base64")) {
            System.err.println("Usage: StationCausalitySchema --base64");
            System.exit(2);
        }
        for (String statement : statements()) {
            System.out.println(Base64.getEncoder().encodeToString(statement.getBytes(StandardCharsets.UTF_8)));
        }
    }
}
