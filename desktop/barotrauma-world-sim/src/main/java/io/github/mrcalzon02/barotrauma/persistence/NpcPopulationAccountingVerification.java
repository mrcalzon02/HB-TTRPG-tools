package io.github.mrcalzon02.barotrauma.persistence;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Comparator;

/** Milestone 2.1 contract for conserved per-tick NPC population accounting. */
public final class NpcPopulationAccountingVerification {
    private static final String WORLD = "16000000-0000-0000-0000-000000000001";
    private static final String STATION = "16000000-0000-0000-0000-000000000002";
    private static final String POPULATION = "16000000-0000-0000-0000-000000000003";

    private NpcPopulationAccountingVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        Path root = Files.createTempDirectory("barotrauma-population-accounting-");
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + root.resolve("population.db"))) {
            execute(connection, "PRAGMA foreign_keys=ON", "PRAGMA journal_mode=WAL", "PRAGMA synchronous=FULL");
            createFixture(connection);
            for (String sql : NpcPopulationAccountingSchema.statements()) execute(connection, sql);

            require(object(connection, "table", "npc_population_reconciliation"), "Reconciliation state is missing.");
            require(object(connection, "table", "npc_population_ledger"), "Population ledger is missing.");
            require(object(connection, "view", "npc_population_accounting_observation"), "Accounting view is missing.");
            require(object(connection, "trigger", "npc_population_tick_accounting"), "Population tick trigger is missing.");
            require(number(connection, "SELECT last_detailed_population FROM npc_population_reconciliation") == 976,
                    "Reconciliation did not preserve the seeded total.");

            advance(connection, 43, 71, "HOLDING", 90);
            ledger(connection, 43, 976, 990, 14, 0, "SUPPLY_RECOVERY", "frontier-population-index-reconciliation");
            require(total(connection) == 990, "Growth did not reconcile detailed cohorts.");
            require(number(connection, "SELECT magnitude FROM world_observation_event WHERE tick_sequence=43") == 14,
                    "Growth event magnitude is incorrect.");
            require("2175-01-01T00:43:00.000Z".equals(text(connection,
                            "SELECT canonical_time FROM world_observation_event WHERE tick_sequence=43")),
                    "Growth event did not preserve per-tick canonical time.");
            require(number(connection, "SELECT COUNT(*) FROM observation_metric_series WHERE tick_sequence=43") == 2,
                    "Growth tick did not create total and index metrics.");

            advance(connection, 44, 71, "HOLDING", 90);
            ledger(connection, 44, 990, 990, 0, 0, "OTHER", "population-accounting-no-change");
            require(total(connection) == 990, "Stable tick changed population.");
            require(number(connection, "SELECT COUNT(*) FROM world_observation_event WHERE tick_sequence=44") == 0,
                    "Stable tick created a false event.");

            advance(connection, 45, 69, "CONTRACTING", 85);
            ledger(connection, 45, 990, 962, 0, 28, "SUPPLY_SHORTAGE", "frontier-population-index-reconciliation");
            require(total(connection) == 962, "Contraction did not reconcile detailed cohorts.");

            advance(connection, 46, 0, "ABANDONED", 0);
            ledger(connection, 46, 962, 0, 0, 962, "ABANDONMENT", "frontier-abandonment-reconciliation");
            require(total(connection) == 0, "Abandonment did not empty every cohort.");
            require("ABANDONED".equals(text(connection,
                    "SELECT reconciliation_status FROM npc_population_reconciliation")),
                    "Abandonment state was not preserved.");

            require(number(connection, "SELECT COUNT(*) FROM npc_population_ledger WHERE after_total<>"
                    + "before_total+births+immigration+other_gains-deaths-emigration-disaster_losses-other_losses") == 0,
                    "A ledger row violates population conservation.");
            require(number(connection, "SELECT COUNT(*) FROM npc_population_ledger") == 4,
                    "Expected one ledger row per advanced tick.");
            require(number(connection, "SELECT COUNT(*) FROM world_observation_event") == 3,
                    "Only material changes should create population events.");
            require(number(connection, "SELECT COUNT(*) FROM observation_metric_series") == 8,
                    "Each tick should create two metrics.");
            require(number(connection, "SELECT after_total FROM npc_population_accounting_observation "
                    + "ORDER BY tick_sequence DESC LIMIT 1") == total(connection),
                    "Accounting view disagrees with detailed cohorts.");
            reject(connection, "INSERT INTO npc_population_ledger(ledger_id,world_id,population_id,station_id,"
                    + "tick_sequence,before_total,after_total,housing_capacity,life_support_capacity,employment_capacity,"
                    + "morale,population_index_before,population_index_after,primary_cause,evidence_key,summary) VALUES "
                    + "('invalid','" + WORLD + "','" + POPULATION + "','" + STATION
                    + "',99,10,11,10,10,10,50,1,1,'OTHER','invalid','invalid')",
                    "Nonconserved ledger row was accepted.");
            require(number(connection, "SELECT COUNT(*) FROM pragma_foreign_key_check") == 0,
                    "Schema 016 created foreign-key violations.");
        } finally {
            try (var paths = Files.walk(root)) {
                for (Path path : paths.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
            }
        }
    }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Schema 016 conserved NPC population growth, stable ticks, contraction, abandonment, per-tick event time, cohort reconciliation, metrics, and constraints passed.");
    }

    private static void createFixture(Connection c) throws SQLException {
        execute(c,
                "CREATE TABLE world_metadata(world_id TEXT PRIMARY KEY,display_name TEXT,created_at TEXT,canonical_time TEXT)",
                "CREATE TABLE world_simulation_metadata(world_id TEXT PRIMARY KEY,canonical_time TEXT,imported_tick_sequence INTEGER,current_tick_sequence INTEGER,tick_size_seconds INTEGER,tick_size_nanos INTEGER)",
                "CREATE TABLE world_station(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,location_id TEXT,display_name TEXT)",
                "CREATE TABLE station_simulation_state(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,supplies INTEGER,industry INTEGER,security INTEGER,integrity INTEGER,threat INTEGER,last_tick INTEGER)",
                "CREATE TABLE station_civilization_state(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,population_index INTEGER,civilization_strength INTEGER,fauna_pressure INTEGER,shortage_ticks INTEGER,surplus_ticks INTEGER,frontier_position INTEGER,frontier_state TEXT,last_tick INTEGER)",
                "CREATE TABLE npc_population_state(population_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,station_id TEXT NOT NULL UNIQUE,civilians INTEGER NOT NULL,industrial_workers INTEGER NOT NULL,logistics_workers INTEGER NOT NULL,security_personnel INTEGER NOT NULL,medical_personnel INTEGER NOT NULL,scientific_personnel INTEGER NOT NULL,temporary_residents INTEGER NOT NULL,refugees INTEGER NOT NULL,housing_capacity INTEGER NOT NULL,life_support_capacity INTEGER NOT NULL,employment_capacity INTEGER NOT NULL,morale INTEGER NOT NULL,seed_source TEXT,last_tick INTEGER NOT NULL,FOREIGN KEY(world_id) REFERENCES world_metadata(world_id),FOREIGN KEY(station_id) REFERENCES world_station(station_id))",
                "CREATE TABLE world_observation_event(event_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,tick_sequence INTEGER NOT NULL,canonical_time TEXT NOT NULL,category TEXT NOT NULL,primary_entity_type TEXT NOT NULL,primary_entity_id TEXT NOT NULL,primary_cause TEXT NOT NULL,primary_evidence_key TEXT NOT NULL,contributing_factors TEXT NOT NULL,magnitude INTEGER NOT NULL,visibility TEXT NOT NULL,confidence INTEGER NOT NULL,summary TEXT NOT NULL)",
                "CREATE TABLE observation_metric_series(metric_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,metric_key TEXT NOT NULL,tick_sequence INTEGER NOT NULL,numeric_value REAL NOT NULL,unit TEXT NOT NULL,snapshot_id TEXT)",
                "CREATE TABLE simulation_command_receipt(command_id TEXT PRIMARY KEY,world_id TEXT,execution_sequence INTEGER,after_canonical_time TEXT)",
                "INSERT INTO world_metadata VALUES('" + WORLD + "','Accounting Europa','2026-07-19T00:00:00Z','2175-01-01T00:42:00Z')",
                "INSERT INTO world_simulation_metadata VALUES('" + WORLD + "','2175-01-01T00:42:00Z',42,42,60,0)",
                "INSERT INTO world_station VALUES('" + STATION + "','" + WORLD + "','location','Nadir Station')",
                "INSERT INTO station_simulation_state VALUES('" + STATION + "','" + WORLD + "',70,60,65,90,25,42)",
                "INSERT INTO station_civilization_state VALUES('" + STATION + "','" + WORLD + "',70,75,20,1,4,60,'HOLDING',42)",
                "INSERT INTO npc_population_state VALUES('" + POPULATION + "','" + WORLD + "','" + STATION
                        + "',500,168,140,151,7,5,4,1,1200,1300,1100,80,'SCHEMA_015_FIXTURE',42)");
    }

    private static void advance(Connection c, long tick, int index, String state, int integrity) throws SQLException {
        execute(c,
                "INSERT INTO simulation_command_receipt VALUES('command-" + tick + "','" + WORLD + "',"
                        + (tick - 42) + ",'2175-01-01T00:" + String.format("%02d", tick) + ":00Z')",
                "UPDATE station_simulation_state SET integrity=" + integrity + ",last_tick=" + tick
                        + " WHERE station_id='" + STATION + "'",
                "UPDATE station_civilization_state SET population_index=" + index + ",frontier_state='" + state
                        + "',last_tick=" + tick + " WHERE station_id='" + STATION + "'");
    }

    private static void ledger(Connection c, long tick, long before, long after, long gain, long loss,
                               String cause, String evidence) throws SQLException {
        try (Statement s = c.createStatement(); ResultSet r = s.executeQuery("SELECT before_total,other_gains,"
                + "other_losses,after_total,primary_cause,evidence_key FROM npc_population_ledger WHERE tick_sequence=" + tick)) {
            require(r.next(), "Missing ledger row at tick " + tick + ".");
            require(r.getLong(1) == before && r.getLong(2) == gain && r.getLong(3) == loss
                            && r.getLong(4) == after && cause.equals(r.getString(5)) && evidence.equals(r.getString(6)),
                    "Ledger mismatch at tick " + tick + ".");
        }
    }

    private static long total(Connection c) throws SQLException {
        return number(c, "SELECT civilians+industrial_workers+logistics_workers+security_personnel+medical_personnel+"
                + "scientific_personnel+temporary_residents+refugees FROM npc_population_state");
    }

    private static void execute(Connection c, String... sql) throws SQLException {
        try (Statement s = c.createStatement()) { for (String statement : sql) s.execute(statement); }
    }

    private static boolean object(Connection c, String type, String name) throws SQLException {
        return number(c, "SELECT COUNT(*) FROM sqlite_master WHERE type='" + type + "' AND name='" + name + "'") == 1;
    }

    private static long number(Connection c, String sql) throws SQLException {
        try (Statement s = c.createStatement(); ResultSet r = s.executeQuery(sql)) {
            if (!r.next()) throw new SQLException("No row returned: " + sql);
            return r.getLong(1);
        }
    }

    private static String text(Connection c, String sql) throws SQLException {
        try (Statement s = c.createStatement(); ResultSet r = s.executeQuery(sql)) {
            if (!r.next()) throw new SQLException("No row returned: " + sql);
            return r.getString(1);
        }
    }

    private static void reject(Connection c, String sql, String message) throws SQLException {
        try { execute(c, sql); } catch (SQLException expected) { return; }
        throw new IllegalStateException(message);
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }
}
