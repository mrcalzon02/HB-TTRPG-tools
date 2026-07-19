package io.github.mrcalzon02.barotrauma.persistence;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Comparator;
import java.util.UUID;

/** Milestone 2.1 contract for conserved per-tick NPC population accounting. */
public final class NpcPopulationAccountingVerification {
    private static final UUID WORLD_ID = UUID.fromString("16000000-0000-0000-0000-000000000001");
    private static final UUID STATION_ID = UUID.fromString("16000000-0000-0000-0000-000000000002");
    private static final UUID POPULATION_ID = UUID.fromString("16000000-0000-0000-0000-000000000003");

    private NpcPopulationAccountingVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        Path root = Files.createTempDirectory("barotrauma-population-accounting-");
        Path database = root.resolve("population.db");
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + database)) {
            configure(connection);
            createSchema015Fixture(connection);
            for (String sql : NpcPopulationAccountingSchema.statements()) {
                try (Statement statement = connection.createStatement()) { statement.execute(sql); }
            }

            require(tableExists(connection, "npc_population_reconciliation"),
                    "Schema 016 is missing population reconciliation state.");
            require(tableExists(connection, "npc_population_ledger"),
                    "Schema 016 is missing the population ledger.");
            require(viewExists(connection, "npc_population_accounting_observation"),
                    "Schema 016 is missing the accounting observation view.");
            require(triggerExists(connection, "npc_population_tick_accounting"),
                    "Schema 016 is missing passive population accounting.");
            require(longValue(connection, "SELECT COUNT(*) FROM npc_population_reconciliation") == 1,
                    "The existing population did not receive one reconciliation row.");
            require(longValue(connection, "SELECT last_detailed_population FROM npc_population_reconciliation") == 976,
                    "The reconciliation seed did not preserve the detailed population total.");

            advance(connection, 43, 71, "HOLDING", 90);
            assertLedger(connection, 43, 976, 990, 14, 0, "SUPPLY_RECOVERY",
                    "frontier-population-index-reconciliation");
            require(populationTotal(connection) == 990,
                    "A population-index gain did not reconcile the detailed cohorts.");
            require(eventMagnitude(connection, 43) == 14,
                    "Population growth did not create matching causal event evidence.");
            require(metricCount(connection, 43) == 2,
                    "Population growth did not create total and index metrics.");

            advance(connection, 44, 71, "HOLDING", 90);
            assertLedger(connection, 44, 990, 990, 0, 0, "OTHER",
                    "population-accounting-no-change");
            require(populationTotal(connection) == 990,
                    "A stable population tick changed the cohort total.");
            require(eventCount(connection, 44) == 0,
                    "A no-change population tick created a false event.");

            advance(connection, 45, 69, "CONTRACTING", 85);
            assertLedger(connection, 45, 990, 962, 0, 28, "SUPPLY_SHORTAGE",
                    "frontier-population-index-reconciliation");
            require(populationTotal(connection) == 962,
                    "A population-index decline did not reconcile the detailed cohorts.");

            advance(connection, 46, 0, "ABANDONED", 0);
            assertLedger(connection, 46, 962, 0, 0, 962, "ABANDONMENT",
                    "frontier-abandonment-reconciliation");
            require(populationTotal(connection) == 0,
                    "Abandonment did not reduce every detailed cohort to zero.");
            require("ABANDONED".equals(textValue(connection,
                            "SELECT reconciliation_status FROM npc_population_reconciliation")),
                    "Abandonment was not preserved in reconciliation state.");

            require(longValue(connection, "SELECT COUNT(*) FROM npc_population_ledger WHERE "
                            + "after_total<>before_total+births+immigration+other_gains-deaths-emigration-"
                            + "disaster_losses-other_losses") == 0,
                    "A committed population ledger row violates conservation.");
            require(longValue(connection, "SELECT COUNT(*) FROM npc_population_ledger") == 4,
                    "The fixture did not create exactly one ledger row per advanced tick.");
            require(longValue(connection, "SELECT COUNT(*) FROM world_observation_event") == 3,
                    "Only the three material population changes should create events.");
            require(longValue(connection, "SELECT COUNT(*) FROM observation_metric_series") == 8,
                    "Each population tick should create total and frontier-index metrics.");
            require(longValue(connection, "SELECT after_total FROM npc_population_accounting_observation "
                            + "ORDER BY tick_sequence DESC LIMIT 1") == populationTotal(connection),
                    "The read-optimized accounting view disagrees with detailed cohorts.");

            expectConstraintFailure(connection,
                    "INSERT INTO npc_population_ledger(ledger_id,world_id,population_id,station_id,tick_sequence,"
                            + "before_total,after_total,housing_capacity,life_support_capacity,employment_capacity,"
                            + "morale,population_index_before,population_index_after,primary_cause,evidence_key,summary) "
                            + "VALUES ('invalid-ledger','" + WORLD_ID + "','" + POPULATION_ID + "','" + STATION_ID
                            + "',99,10,11,10,10,10,50,1,1,'OTHER','invalid','invalid')",
                    "The population ledger accepted a nonconserved row.");
            require(foreignKeyViolations(connection) == 0,
                    "Schema 016 created foreign-key violations.");
        } finally {
            deleteTree(root);
        }
    }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Schema 016 conserved NPC population growth, stable ticks, contraction, abandonment, cohort reconciliation, event evidence, metrics, and constraints passed.");
    }

    private static void createSchema015Fixture(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("CREATE TABLE world_metadata(world_id TEXT PRIMARY KEY,display_name TEXT,created_at TEXT,canonical_time TEXT)");
            statement.execute("CREATE TABLE world_station(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,location_id TEXT,display_name TEXT)");
            statement.execute("CREATE TABLE station_simulation_state(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,supplies INTEGER,industry INTEGER,security INTEGER,integrity INTEGER,threat INTEGER,last_tick INTEGER)");
            statement.execute("CREATE TABLE station_civilization_state(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,population_index INTEGER,civilization_strength INTEGER,fauna_pressure INTEGER,shortage_ticks INTEGER,surplus_ticks INTEGER,frontier_position INTEGER,frontier_state TEXT,last_tick INTEGER)");
            statement.execute("CREATE TABLE npc_population_state(population_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,station_id TEXT NOT NULL UNIQUE,civilians INTEGER NOT NULL,industrial_workers INTEGER NOT NULL,logistics_workers INTEGER NOT NULL,security_personnel INTEGER NOT NULL,medical_personnel INTEGER NOT NULL,scientific_personnel INTEGER NOT NULL,temporary_residents INTEGER NOT NULL,refugees INTEGER NOT NULL,housing_capacity INTEGER NOT NULL,life_support_capacity INTEGER NOT NULL,employment_capacity INTEGER NOT NULL,morale INTEGER NOT NULL,seed_source TEXT,last_tick INTEGER NOT NULL,FOREIGN KEY(world_id) REFERENCES world_metadata(world_id),FOREIGN KEY(station_id) REFERENCES world_station(station_id))");
            statement.execute("CREATE TABLE world_observation_event(event_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,tick_sequence INTEGER NOT NULL,canonical_time TEXT NOT NULL,category TEXT NOT NULL,primary_entity_type TEXT NOT NULL,primary_entity_id TEXT NOT NULL,primary_cause TEXT NOT NULL,primary_evidence_key TEXT NOT NULL,contributing_factors TEXT NOT NULL,magnitude INTEGER NOT NULL,visibility TEXT NOT NULL,confidence INTEGER NOT NULL,summary TEXT NOT NULL)");
            statement.execute("CREATE TABLE observation_metric_series(metric_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,metric_key TEXT NOT NULL,tick_sequence INTEGER NOT NULL,numeric_value REAL NOT NULL,unit TEXT NOT NULL,snapshot_id TEXT)");
            statement.execute("CREATE TABLE simulation_command_receipt(command_id TEXT PRIMARY KEY,world_id TEXT,execution_sequence INTEGER,after_canonical_time TEXT)");
        }
        try (PreparedStatement statement = connection.prepareStatement("INSERT INTO world_metadata VALUES(?,?,?,?)")) {
            statement.setString(1, WORLD_ID.toString());
            statement.setString(2, "Accounting Europa");
            statement.setString(3, "2026-07-19T00:00:00Z");
            statement.setString(4, "2175-01-01T00:42:00Z");
            statement.executeUpdate();
        }
        try (PreparedStatement statement = connection.prepareStatement("INSERT INTO world_station VALUES(?,?,?,?)")) {
            statement.setString(1, STATION_ID.toString());
            statement.setString(2, WORLD_ID.toString());
            statement.setString(3, "accounting-location");
            statement.setString(4, "Nadir Station");
            statement.executeUpdate();
        }
        try (PreparedStatement statement = connection.prepareStatement("INSERT INTO station_simulation_state VALUES(?,?,?,?,?,?,?,?)")) {
            statement.setString(1, STATION_ID.toString());
            statement.setString(2, WORLD_ID.toString());
            statement.setInt(3, 70);
            statement.setInt(4, 60);
            statement.setInt(5, 65);
            statement.setInt(6, 90);
            statement.setInt(7, 25);
            statement.setLong(8, 42);
            statement.executeUpdate();
        }
        try (PreparedStatement statement = connection.prepareStatement("INSERT INTO station_civilization_state VALUES(?,?,?,?,?,?,?,?,?,?)")) {
            statement.setString(1, STATION_ID.toString());
            statement.setString(2, WORLD_ID.toString());
            statement.setInt(3, 70);
            statement.setInt(4, 75);
            statement.setInt(5, 20);
            statement.setInt(6, 1);
            statement.setInt(7, 4);
            statement.setInt(8, 60);
            statement.setString(9, "HOLDING");
            statement.setLong(10, 42);
            statement.executeUpdate();
        }
        try (PreparedStatement statement = connection.prepareStatement("INSERT INTO npc_population_state VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")) {
            statement.setString(1, POPULATION_ID.toString());
            statement.setString(2, WORLD_ID.toString());
            statement.setString(3, STATION_ID.toString());
            int[] cohorts = {500,168,140,151,7,5,4,1};
            for (int index = 0; index < cohorts.length; index++) statement.setInt(index + 4, cohorts[index]);
            statement.setInt(12, 1200);
            statement.setInt(13, 1300);
            statement.setInt(14, 1100);
            statement.setInt(15, 80);
            statement.setString(16, "SCHEMA_015_FIXTURE");
            statement.setLong(17, 42);
            statement.executeUpdate();
        }
    }

    private static void advance(Connection connection, long tick, int populationIndex,
                                String frontierState, int integrity) throws SQLException {
        try (PreparedStatement receipt = connection.prepareStatement("INSERT INTO simulation_command_receipt VALUES(?,?,?,?)")) {
            receipt.setString(1, "command-" + tick);
            receipt.setString(2, WORLD_ID.toString());
            receipt.setLong(3, tick - 42);
            receipt.setString(4, "2175-01-01T00:" + String.format("%02d", tick) + ":00Z");
            receipt.executeUpdate();
        }
        try (PreparedStatement station = connection.prepareStatement(
                "UPDATE station_simulation_state SET integrity=?,last_tick=? WHERE station_id=?")) {
            station.setInt(1, integrity);
            station.setLong(2, tick);
            station.setString(3, STATION_ID.toString());
            station.executeUpdate();
        }
        try (PreparedStatement civilization = connection.prepareStatement(
                "UPDATE station_civilization_state SET population_index=?,frontier_state=?,last_tick=? WHERE station_id=?")) {
            civilization.setInt(1, populationIndex);
            civilization.setString(2, frontierState);
            civilization.setLong(3, tick);
            civilization.setString(4, STATION_ID.toString());
            civilization.executeUpdate();
        }
    }

    private static void assertLedger(Connection connection, long tick, long before, long after,
                                     long gains, long losses, String cause, String evidence) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT before_total,other_gains,other_losses,after_total,primary_cause,evidence_key FROM npc_population_ledger WHERE tick_sequence=?")) {
            statement.setLong(1, tick);
            try (ResultSet result = statement.executeQuery()) {
                require(result.next(), "Population ledger row is missing for tick " + tick + ".");
                require(result.getLong(1) == before, "Population ledger before-total mismatch at tick " + tick + ".");
                require(result.getLong(2) == gains, "Population ledger gains mismatch at tick " + tick + ".");
                require(result.getLong(3) == losses, "Population ledger losses mismatch at tick " + tick + ".");
                require(result.getLong(4) == after, "Population ledger after-total mismatch at tick " + tick + ".");
                require(cause.equals(result.getString(5)), "Population ledger cause mismatch at tick " + tick + ".");
                require(evidence.equals(result.getString(6)), "Population ledger evidence mismatch at tick " + tick + ".");
            }
        }
    }

    private static long populationTotal(Connection connection) throws SQLException {
        return longValue(connection, "SELECT civilians+industrial_workers+logistics_workers+security_personnel+medical_personnel+scientific_personnel+temporary_residents+refugees FROM npc_population_state");
    }

    private static long eventMagnitude(Connection connection, long tick) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT magnitude FROM world_observation_event WHERE tick_sequence=?")) {
            statement.setLong(1, tick);
            try (ResultSet result = statement.executeQuery()) {
                return result.next() ? result.getLong(1) : -1;
            }
        }
    }

    private static long eventCount(Connection connection, long tick) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT COUNT(*) FROM world_observation_event WHERE tick_sequence=?")) {
            statement.setLong(1, tick);
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static long metricCount(Connection connection, long tick) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT COUNT(*) FROM observation_metric_series WHERE tick_sequence=?")) {
            statement.setLong(1, tick);
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static boolean tableExists(Connection connection, String name) throws SQLException { return objectExists(connection, "table", name); }
    private static boolean viewExists(Connection connection, String name) throws SQLException { return objectExists(connection, "view", name); }
    private static boolean triggerExists(Connection connection, String name) throws SQLException { return objectExists(connection, "trigger", name); }

    private static boolean objectExists(Connection connection, String type, String name) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("SELECT 1 FROM sqlite_master WHERE type=? AND name=?")) {
            statement.setString(1, type);
            statement.setString(2, name);
            try (ResultSet result = statement.executeQuery()) { return result.next(); }
        }
    }

    private static long longValue(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new SQLException("Query returned no rows: " + sql);
            return result.getLong(1);
        }
    }

    private static String textValue(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new SQLException("Query returned no rows: " + sql);
            return result.getString(1);
        }
    }

    private static void expectConstraintFailure(Connection connection, String sql, String message) throws SQLException {
        try (Statement statement = connection.createStatement()) { statement.executeUpdate(sql); }
        catch (SQLException expected) { return; }
        throw new IllegalStateException(message);
    }

    private static long foreignKeyViolations(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery("PRAGMA foreign_key_check")) {
            long count = 0;
            while (result.next()) count++;
            return count;
        }
    }

    private static void configure(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys=ON");
            statement.execute("PRAGMA journal_mode=WAL");
            statement.execute("PRAGMA synchronous=FULL");
        }
    }

    private static void deleteTree(Path root) throws Exception {
        if (!Files.exists(root)) return;
        try (var stream = Files.walk(root)) {
            for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }
}
