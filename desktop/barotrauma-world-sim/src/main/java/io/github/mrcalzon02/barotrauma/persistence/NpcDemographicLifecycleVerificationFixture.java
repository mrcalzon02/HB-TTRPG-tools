package io.github.mrcalzon02.barotrauma.persistence;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Comparator;

/** Fixture construction and assertions for the schema-027 demographic verifier. */
final class NpcDemographicLifecycleVerificationFixture {
    static final String WORLD = "27000000-0000-0000-0000-000000000001";
    static final String STATION = "27000000-0000-0000-0000-000000000002";
    static final String POPULATION = "27000000-0000-0000-0000-000000000003";

    private NpcDemographicLifecycleVerificationFixture() { }

    static void createSchema026Fixture(Connection c) throws SQLException {
        execute(c,
                "CREATE TABLE world_metadata(world_id TEXT PRIMARY KEY,display_name TEXT,created_at TEXT,canonical_time TEXT)",
                "CREATE TABLE world_station(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,location_id TEXT,display_name TEXT)",
                "CREATE TABLE station_simulation_state(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,credits INTEGER,supplies INTEGER,ore INTEGER,industry INTEGER,security INTEGER,integrity INTEGER,threat INTEGER,research INTEGER,status TEXT,last_tick INTEGER)",
                "CREATE TABLE station_civilization_state(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,population_index INTEGER,civilization_strength INTEGER,fauna_pressure INTEGER,supply_consumption_base INTEGER,last_consumption INTEGER,shortage_ticks INTEGER,surplus_ticks INTEGER,frontier_position INTEGER,frontier_state TEXT,last_tick INTEGER)",
                "CREATE TABLE station_inventory(station_id TEXT,item_id TEXT,quantity INTEGER,last_tick INTEGER,PRIMARY KEY(station_id,item_id))",
                "CREATE TABLE station_consumption_log(consumption_id TEXT PRIMARY KEY,world_id TEXT,station_id TEXT,tick_sequence INTEGER,required_units INTEGER,ration_units_consumed INTEGER,abstract_supply_delta INTEGER,shortage INTEGER,supplies_after INTEGER,ration_stock_after INTEGER,UNIQUE(station_id,tick_sequence))",
                "CREATE TABLE civilization_frontier_event(event_id TEXT PRIMARY KEY,world_id TEXT,station_id TEXT,tick_sequence INTEGER,event_type TEXT,severity INTEGER,supplies_delta INTEGER DEFAULT 0,integrity_delta INTEGER DEFAULT 0,security_delta INTEGER DEFAULT 0,civilization_delta INTEGER DEFAULT 0,fauna_delta INTEGER DEFAULT 0,frontier_delta INTEGER DEFAULT 0,summary TEXT)",
                "CREATE TABLE npc_population_state(population_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,station_id TEXT NOT NULL UNIQUE,civilians INTEGER NOT NULL,industrial_workers INTEGER NOT NULL,logistics_workers INTEGER NOT NULL,security_personnel INTEGER NOT NULL,medical_personnel INTEGER NOT NULL,scientific_personnel INTEGER NOT NULL,temporary_residents INTEGER NOT NULL,refugees INTEGER NOT NULL,housing_capacity INTEGER NOT NULL,life_support_capacity INTEGER NOT NULL,employment_capacity INTEGER NOT NULL,morale INTEGER NOT NULL,seed_source TEXT,last_tick INTEGER NOT NULL)",
                "CREATE TABLE npc_population_reconciliation(population_id TEXT PRIMARY KEY,world_id TEXT,station_id TEXT UNIQUE,baseline_population_per_index REAL,last_population_index INTEGER,reconciliation_status TEXT,last_detailed_population INTEGER,last_tick INTEGER)",
                "CREATE TABLE npc_population_ledger(ledger_id TEXT PRIMARY KEY,world_id TEXT,population_id TEXT,station_id TEXT,tick_sequence INTEGER,before_total INTEGER,births INTEGER DEFAULT 0,deaths INTEGER DEFAULT 0,immigration INTEGER DEFAULT 0,emigration INTEGER DEFAULT 0,disaster_losses INTEGER DEFAULT 0,other_gains INTEGER DEFAULT 0,other_losses INTEGER DEFAULT 0,after_total INTEGER,housing_capacity INTEGER,life_support_capacity INTEGER,employment_capacity INTEGER,morale INTEGER,population_index_before INTEGER,population_index_after INTEGER,primary_cause TEXT,evidence_key TEXT,summary TEXT,UNIQUE(population_id,tick_sequence),CHECK(after_total=before_total+births+immigration+other_gains-deaths-emigration-disaster_losses-other_losses))",
                "CREATE INDEX npc_population_ledger_tick_index ON npc_population_ledger(world_id,tick_sequence DESC,primary_cause,population_id)",
                "CREATE VIEW npc_population_accounting_observation AS SELECT l.*,r.baseline_population_per_index,r.reconciliation_status FROM npc_population_ledger l JOIN npc_population_reconciliation r ON r.population_id=l.population_id",
                "CREATE TABLE station_population_state(station_id TEXT PRIMARY KEY,world_id TEXT,baseline_kind TEXT,baseline_tick INTEGER,baseline_resident_count INTEGER,resident_count INTEGER,baseline_workforce_count INTEGER,workforce_count INTEGER,last_tick INTEGER)",
                "CREATE TABLE station_population_tick_baseline(station_id TEXT,tick_sequence INTEGER,PRIMARY KEY(station_id,tick_sequence))",
                "CREATE TABLE station_event_type(event_type TEXT PRIMARY KEY,display_name TEXT NOT NULL,story_required INTEGER NOT NULL)",
                "CREATE TABLE station_change_reason(reason_code TEXT PRIMARY KEY,display_name TEXT NOT NULL,reason_family TEXT NOT NULL)",
                "CREATE TABLE station_story_policy(policy_version INTEGER PRIMARY KEY,active INTEGER)",
                "CREATE TABLE station_event(event_id TEXT PRIMARY KEY,world_id TEXT,station_id TEXT,tick_sequence INTEGER,canonical_time TEXT,event_type TEXT,severity INTEGER,headline TEXT,narrative TEXT,actor_type TEXT,actor_id TEXT,cause_type TEXT,cause_id TEXT,deterministic_key TEXT,visibility TEXT,correlation_id TEXT,policy_version INTEGER,created_at TEXT,UNIQUE(world_id,station_id,deterministic_key))",
                "CREATE TABLE station_population_event(population_event_id TEXT PRIMARY KEY,event_id TEXT UNIQUE,population_category TEXT,people_before INTEGER,people_delta INTEGER,people_after INTEGER,workforce_delta INTEGER)",
                "CREATE TABLE station_change(change_id TEXT PRIMARY KEY,event_id TEXT,statistic_key TEXT,value_type TEXT,previous_value REAL,delta_value REAL,resulting_value REAL,unit TEXT,reason_code TEXT,affected_type TEXT,affected_id TEXT)",
                "CREATE TABLE world_observation_event(event_id TEXT PRIMARY KEY,world_id TEXT,tick_sequence INTEGER,canonical_time TEXT,category TEXT,primary_entity_type TEXT,primary_entity_id TEXT,primary_cause TEXT,primary_evidence_key TEXT,contributing_factors TEXT,magnitude INTEGER,visibility TEXT,confidence INTEGER,summary TEXT)",
                "CREATE TABLE observation_metric_series(metric_id TEXT PRIMARY KEY,world_id TEXT,entity_type TEXT,entity_id TEXT,metric_key TEXT,tick_sequence INTEGER,numeric_value REAL,unit TEXT,snapshot_id TEXT,UNIQUE(world_id,entity_type,entity_id,metric_key,tick_sequence))",
                "CREATE TABLE simulation_transaction_context(world_id TEXT PRIMARY KEY,command_id TEXT NOT NULL DEFAULT 'fixture-command',current_tick INTEGER,current_canonical TEXT)",
                "CREATE TABLE station_mutation_coverage(command_id TEXT NOT NULL,station_id TEXT NOT NULL,tick_sequence INTEGER NOT NULL,statistic_key TEXT NOT NULL,previous_value REAL NOT NULL,delta_value REAL NOT NULL,resulting_value REAL NOT NULL,PRIMARY KEY(command_id,station_id,tick_sequence,statistic_key))",
                fixtureCoverageTrigger("residents", "resident_count", "population.residents"),
                fixtureCoverageTrigger("workforce", "workforce_count", "population.workforce"),
                "INSERT INTO station_event_type VALUES('POPULATION','Population change',1)",
                "INSERT INTO station_change_reason VALUES('BIRTHS','Births','POPULATION'),('DEATHS','Deaths','POPULATION'),('ATTACK_CASUALTIES','Attack casualties','POPULATION'),('EVACUATION','Evacuation','POPULATION'),('EMIGRATION','Emigration','POPULATION'),('IMMIGRATION','Immigration','POPULATION')",
                "INSERT INTO station_story_policy VALUES(1,1)",
                "INSERT INTO world_metadata VALUES('" + WORLD + "','Demographic Europa','2026-07-20T00:00:00Z','2175-01-01T00:42:00Z')",
                "INSERT INTO world_station VALUES('" + STATION + "','" + WORLD + "','location','Nadir Station')",
                "INSERT INTO station_simulation_state VALUES('" + STATION + "','" + WORLD + "',10000,100,50,70,90,100,5,0,'STABLE',42)",
                "INSERT INTO station_civilization_state VALUES('" + STATION + "','" + WORLD + "',70,90,10,1,0,0,10,60,'HOLDING',42)",
                "INSERT INTO station_inventory VALUES('" + STATION + "','item-rations',1000,42)",
                "INSERT INTO npc_population_state VALUES('" + POPULATION + "','" + WORLD + "','" + STATION + "',600,120,100,90,40,30,15,5,1200,1300,1100,80,'FIXTURE',42)",
                "INSERT INTO npc_population_reconciliation VALUES('" + POPULATION + "','" + WORLD + "','" + STATION + "'," + (1000.0 / 70.0) + ",70,'ALIGNED',1000,42)",
                "INSERT INTO station_population_state VALUES('" + STATION + "','" + WORLD + "','IMPORTED_ESTIMATE',42,7000,7000,3850,3850,42)");
    }

    private static String fixtureCoverageTrigger(String suffix, String column, String statisticKey) {
        return "CREATE TRIGGER fixture_station_population_" + suffix + "_coverage AFTER UPDATE OF " + column
                + " ON station_population_state WHEN NEW." + column + "<>OLD." + column
                + " AND EXISTS(SELECT 1 FROM simulation_transaction_context c WHERE c.world_id=NEW.world_id) BEGIN "
                + "INSERT INTO station_mutation_coverage(command_id,station_id,tick_sequence,statistic_key,"
                + "previous_value,delta_value,resulting_value) SELECT c.command_id,NEW.station_id,"
                + "COALESCE(c.current_tick,NEW.last_tick),'" + statisticKey + "',OLD." + column + ",NEW." + column
                + "-OLD." + column + ",NEW." + column + " FROM simulation_transaction_context c "
                + "WHERE c.world_id=NEW.world_id ON CONFLICT(command_id,station_id,tick_sequence,statistic_key) "
                + "DO UPDATE SET delta_value=station_mutation_coverage.delta_value+excluded.delta_value,"
                + "resulting_value=excluded.resulting_value; END";
    }

    static void advance(Connection c, long tick) throws SQLException {
        execute(c,
                "INSERT OR REPLACE INTO simulation_transaction_context(world_id,command_id,current_tick,current_canonical) VALUES('"
                        + WORLD + "','fixture-command-" + tick + "'," + tick + ",'2175-01-01T00:"
                        + String.format("%02d", tick) + ":00Z')",
                "UPDATE station_simulation_state SET last_tick=" + tick + " WHERE station_id='" + STATION + "'",
                "DELETE FROM simulation_transaction_context WHERE world_id='" + WORLD + "'");
    }

    static long term(Connection c, long tick, String column) throws SQLException {
        if (!column.equals("births") && !column.equals("deaths") && !column.equals("disaster_losses")) {
            throw new IllegalArgumentException("Unsupported demographic term: " + column);
        }
        return number(c, "SELECT " + column + " FROM npc_demographic_tick_result WHERE tick_sequence=" + tick);
    }

    static long populationTotal(Connection c) throws SQLException {
        return number(c, "SELECT civilians+industrial_workers+logistics_workers+security_personnel+"
                + "medical_personnel+scientific_personnel+temporary_residents+refugees FROM npc_population_state");
    }

    static void configure(Connection c) throws SQLException {
        execute(c, "PRAGMA foreign_keys=ON", "PRAGMA recursive_triggers=ON", "PRAGMA journal_mode=WAL",
                "PRAGMA synchronous=FULL");
    }

    static void execute(Connection c, String... statements) throws SQLException {
        try (Statement statement = c.createStatement()) {
            for (String sql : statements) statement.execute(sql);
        }
    }

    static boolean object(Connection c, String type, String name) throws SQLException {
        return number(c, "SELECT COUNT(*) FROM sqlite_master WHERE type='" + type + "' AND name='" + name + "'") == 1;
    }

    static long number(Connection c, String sql) throws SQLException {
        try (Statement statement = c.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new SQLException("No row returned: " + sql);
            return result.getLong(1);
        }
    }

    static String text(Connection c, String sql) throws SQLException {
        try (Statement statement = c.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new SQLException("No row returned: " + sql);
            return result.getString(1);
        }
    }

    static void deleteTree(Path root) throws Exception {
        if (!Files.exists(root)) return;
        try (var stream = Files.walk(root)) {
            for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
        }
    }

    static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }
}
