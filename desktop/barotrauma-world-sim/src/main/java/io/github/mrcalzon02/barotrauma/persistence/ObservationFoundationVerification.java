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

/** Milestone 1.2 contract for schema-015 observation seeding and preservation. */
public final class ObservationFoundationVerification {
    private static final UUID WORLD_ID = UUID.fromString("15000000-0000-0000-0000-000000000001");
    private static final UUID STATION_LOCATION = UUID.fromString("15000000-0000-0000-0000-000000000010");
    private static final UUID WILD_LOCATION = UUID.fromString("15000000-0000-0000-0000-000000000020");
    private static final UUID STATION_ID = UUID.fromString("15000000-0000-0000-0000-000000000030");

    private ObservationFoundationVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        Path root = Files.createTempDirectory("barotrauma-observation-foundation-");
        Path database = root.resolve("observation.db");
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + database)) {
            configure(connection);
            createSchema014Fixture(connection);
            String civilizationBefore = stationCivilizationFingerprint(connection);
            String ecologyBefore = ecologyFingerprint(connection);

            boolean originalAutoCommit = connection.getAutoCommit();
            connection.setAutoCommit(false);
            try (Statement statement = connection.createStatement()) {
                for (String sql : ObservationFoundationSchema.statements()) statement.execute(sql);
                connection.commit();
            } catch (SQLException exception) {
                connection.rollback();
                throw exception;
            } finally {
                connection.setAutoCommit(originalAutoCommit);
            }

            require(tableExists(connection, "npc_population_state"), "Schema 015 is missing NPC populations.");
            require(tableExists(connection, "creature_population_state"), "Schema 015 is missing creature populations.");
            require(tableExists(connection, "creature_territory_state"), "Schema 015 is missing creature territories.");
            require(tableExists(connection, "faction_location_presence"), "Schema 015 is missing faction presence.");
            require(tableExists(connection, "population_flow"), "Schema 015 is missing population flows.");
            require(tableExists(connection, "world_observation_event"), "Schema 015 is missing observation events.");
            require(tableExists(connection, "observation_snapshot"), "Schema 015 is missing snapshots.");
            require(tableExists(connection, "observation_metric_series"), "Schema 015 is missing metric history.");
            require(tableExists(connection, "observer_watch_rule"), "Schema 015 is missing watch rules.");
            require(viewExists(connection, "npc_population_observation")
                            && viewExists(connection, "creature_population_observation")
                            && viewExists(connection, "observation_world_summary"),
                    "Schema 015 is missing read-optimized observation views.");

            require(count(connection, "npc_population_state") == 1,
                    "Station civilization did not seed exactly one NPC population.");
            require(count(connection, "creature_population_state") == 8,
                    "Two ecological locations did not seed four creature guilds each.");
            require(count(connection, "creature_territory_state") == 8,
                    "Creature populations did not seed one territory each.");
            require(count(connection, "faction_location_presence") == 2,
                    "Location and station factions did not seed duplicate-safe presence rows.");
            require(count(connection, "world_observation_event") == 9,
                    "Population initialization did not create complete observation evidence.");
            require(count(connection, "observation_metric_series") == 9,
                    "Population initialization did not create complete metric evidence.");
            require(count(connection, "observation_snapshot") == 1,
                    "The migrated world did not receive one root observation snapshot.");
            require(longValue(connection, "SELECT tick_sequence FROM observation_snapshot") == 42,
                    "The root observation snapshot did not preserve the current canonical tick.");

            String expectedNpcId = uuidForOrdinal(0, 1);
            require(expectedNpcId.equals(textValue(connection,
                            "SELECT population_id FROM npc_population_state WHERE station_id='" + STATION_ID + "'")),
                    "NPC population identity was not derived deterministically from the station location ordinal.");
            require(longValue(connection, "SELECT total_population FROM npc_population_observation") == 826,
                    "NPC population cohorts did not produce the expected total.");
            require(longValue(connection, "SELECT npc_population_total FROM observation_world_summary") == 826,
                    "Observation world summary did not reproduce the NPC population total.");
            require(longValue(connection, "SELECT creature_populations FROM observation_world_summary") == 8,
                    "Observation world summary did not reproduce the creature population count.");
            require(longValue(connection, "SELECT COUNT(*) FROM creature_territory_state WHERE status='NESTING'") >= 1,
                    "Predator biomass did not produce an initial nesting territory where expected.");

            require(civilizationBefore.equals(stationCivilizationFingerprint(connection)),
                    "Schema 015 mutated schema-014 station civilization source state.");
            require(ecologyBefore.equals(ecologyFingerprint(connection)),
                    "Schema 015 mutated schema-014 ecological source state.");
            require(foreignKeyViolations(connection) == 0,
                    "Schema 015 created foreign-key violations.");

            Counts before = counts(connection);
            try (Statement statement = connection.createStatement()) {
                for (String sql : ObservationFoundationSchema.statements()) {
                    if (sql.trim().startsWith("INSERT OR IGNORE")) statement.execute(sql);
                }
            }
            require(before.equals(counts(connection)),
                    "Schema 015 seed statements are not duplicate-safe.");

            UUID newLocation = UUID.fromString("15000000-0000-0000-0000-000000000040");
            insertLocation(connection, newLocation, 2, false, "Coalition");
            insertEcology(connection, newLocation, 43, 50, 40, 30, 20, 10, 70, 25);
            require(countWhere(connection, "creature_population_state", "location_id", newLocation.toString()) == 4,
                    "A later ecology insert did not seed four creature populations.");
            require(countWhere(connection, "creature_territory_state", "location_id", newLocation.toString()) == 4,
                    "A later ecology insert did not seed four creature territories.");
            require(countWhere(connection, "faction_location_presence", "location_id", newLocation.toString()) == 1,
                    "A later world location did not seed faction presence.");

            expectConstraintFailure(connection,
                    "INSERT INTO population_flow(flow_id,world_id,entity_type,population_id,origin_location_id,quantity,cause,status,created_tick,updated_tick,summary) "
                            + "VALUES ('bad-flow','" + WORLD_ID + "','NPC_POPULATION','missing','" + STATION_LOCATION
                            + "',-1,'MIGRATION','PLANNED',0,0,'invalid')",
                    "Population flows accepted a negative quantity.");
            expectConstraintFailure(connection,
                    "INSERT INTO observation_snapshot(snapshot_id,world_id,tick_sequence,parent_snapshot_id,rules_version,created_at,status,source) "
                            + "VALUES ('self-parent','" + WORLD_ID + "',43,'self-parent','desktop-observation-rules-1','2175-01-01T00:43:00Z','COMPLETE','MANUAL')",
                    "Observation snapshots accepted self-parentage.");
            require(foreignKeyViolations(connection) == 0,
                    "Trigger seeding created foreign-key violations.");
        } finally {
            deleteTree(root);
        }
    }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Schema 015 observation populations, territories, faction presence, flows, events, snapshots, metrics, trigger seeding, preservation, and constraints passed.");
    }

    private static void createSchema014Fixture(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("CREATE TABLE world_metadata(world_id TEXT PRIMARY KEY,display_name TEXT NOT NULL,created_at TEXT NOT NULL,canonical_time TEXT,master_world_id TEXT)");
            statement.execute("CREATE TABLE world_simulation_metadata(world_id TEXT PRIMARY KEY,canonical_time TEXT,real_epoch TEXT,last_simulated_at TEXT,imported_tick_sequence INTEGER NOT NULL DEFAULT 0,imported_at TEXT NOT NULL,source_artifact_id TEXT NOT NULL,simulation_enabled INTEGER NOT NULL DEFAULT 0,scheduler_state TEXT NOT NULL DEFAULT 'PAUSED',current_tick_sequence INTEGER,tick_size_seconds INTEGER,tick_size_nanos INTEGER DEFAULT 0,last_command_id TEXT,last_checkpoint_id TEXT)");
            statement.execute("CREATE TABLE world_location(location_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,source_location_id TEXT NOT NULL,source_ordinal INTEGER NOT NULL,display_name TEXT NOT NULL,location_type TEXT,ring INTEGER NOT NULL DEFAULT 0,location_level INTEGER NOT NULL DEFAULT 0,map_x REAL,map_y REAL,biome TEXT,faction TEXT,is_station INTEGER NOT NULL DEFAULT 0,FOREIGN KEY(world_id) REFERENCES world_metadata(world_id))");
            statement.execute("CREATE TABLE world_station(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,location_id TEXT NOT NULL UNIQUE,source_station_id TEXT NOT NULL,display_name TEXT NOT NULL,station_type TEXT,faction TEXT,has_economy INTEGER NOT NULL DEFAULT 0,FOREIGN KEY(world_id) REFERENCES world_metadata(world_id),FOREIGN KEY(location_id) REFERENCES world_location(location_id))");
            statement.execute("CREATE TABLE station_simulation_state(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,credits INTEGER,supplies INTEGER,ore INTEGER,industry INTEGER,security INTEGER,integrity INTEGER,threat INTEGER,research INTEGER,status TEXT,last_tick INTEGER)");
            statement.execute("CREATE TABLE station_civilization_state(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,population_index INTEGER,civilization_strength INTEGER,fauna_pressure INTEGER,supply_consumption_base INTEGER,last_consumption INTEGER,shortage_ticks INTEGER,surplus_ticks INTEGER,frontier_position INTEGER,frontier_state TEXT,last_tick INTEGER)");
            statement.execute("CREATE TABLE location_ecology_state(location_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,primary_producers INTEGER,algal_bloom INTEGER,herbivore_biomass INTEGER,predator_biomass INTEGER,scavenger_biomass INTEGER,bioaccumulator_mass INTEGER,nutrient_load INTEGER,habitat_integrity INTEGER,migration_pressure INTEGER,last_tick INTEGER)");
        }
        try (PreparedStatement world = connection.prepareStatement("INSERT INTO world_metadata VALUES(?,?,?,?,?)")) {
            world.setString(1, WORLD_ID.toString());
            world.setString(2, "Observation Europa");
            world.setString(3, "2026-07-19T00:00:00Z");
            world.setString(4, "2175-01-01T00:42:00Z");
            world.setString(5, null);
            world.executeUpdate();
        }
        try (PreparedStatement simulation = connection.prepareStatement(
                "INSERT INTO world_simulation_metadata(world_id,canonical_time,imported_tick_sequence,imported_at,source_artifact_id,current_tick_sequence) VALUES(?,?,?,?,?,?)")) {
            simulation.setString(1, WORLD_ID.toString());
            simulation.setString(2, "2175-01-01T00:42:00Z");
            simulation.setLong(3, 40);
            simulation.setString(4, "2026-07-19T00:00:00Z");
            simulation.setString(5, "fixture-artifact");
            simulation.setLong(6, 42);
            simulation.executeUpdate();
        }
        insertLocation(connection, STATION_LOCATION, 0, true, "Coalition");
        insertLocation(connection, WILD_LOCATION, 1, false, "Separatists");
        try (PreparedStatement station = connection.prepareStatement("INSERT INTO world_station VALUES(?,?,?,?,?,?,?,?)")) {
            station.setString(1, STATION_ID.toString());
            station.setString(2, WORLD_ID.toString());
            station.setString(3, STATION_LOCATION.toString());
            station.setString(4, "station-1");
            station.setString(5, "Nadir Station");
            station.setString(6, "military");
            station.setString(7, "Coalition");
            station.setInt(8, 1);
            station.executeUpdate();
        }
        try (PreparedStatement stationState = connection.prepareStatement("INSERT INTO station_simulation_state VALUES(?,?,?,?,?,?,?,?,?,?,?,?)")) {
            stationState.setString(1, STATION_ID.toString());
            stationState.setString(2, WORLD_ID.toString());
            stationState.setInt(3, 10_000);
            stationState.setInt(4, 70);
            stationState.setInt(5, 20);
            stationState.setInt(6, 60);
            stationState.setInt(7, 65);
            stationState.setInt(8, 90);
            stationState.setInt(9, 25);
            stationState.setInt(10, 0);
            stationState.setString(11, "STABLE");
            stationState.setLong(12, 42);
            stationState.executeUpdate();
        }
        try (PreparedStatement civilization = connection.prepareStatement("INSERT INTO station_civilization_state VALUES(?,?,?,?,?,?,?,?,?,?,?,?)")) {
            civilization.setString(1, STATION_ID.toString());
            civilization.setString(2, WORLD_ID.toString());
            civilization.setInt(3, 70);
            civilization.setInt(4, 75);
            civilization.setInt(5, 20);
            civilization.setInt(6, 2);
            civilization.setInt(7, 2);
            civilization.setInt(8, 1);
            civilization.setInt(9, 4);
            civilization.setInt(10, 60);
            civilization.setString(11, "HOLDING");
            civilization.setLong(12, 42);
            civilization.executeUpdate();
        }
        insertEcology(connection, STATION_LOCATION, 42, 60, 55, 45, 25, 15, 80, 35);
        insertEcology(connection, WILD_LOCATION, 42, 65, 60, 40, 25, 15, 80, 35);
    }

    private static void insertLocation(Connection connection, UUID locationId, int ordinal,
                                       boolean station, String faction) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("INSERT INTO world_location VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)")) {
            statement.setString(1, locationId.toString());
            statement.setString(2, WORLD_ID.toString());
            statement.setString(3, "location-" + ordinal);
            statement.setInt(4, ordinal);
            statement.setString(5, ordinal == 0 ? "Nadir" : "Wild Location " + ordinal);
            statement.setString(6, station ? "outpost" : "cave");
            statement.setInt(7, ordinal + 1);
            statement.setInt(8, Math.min(10, ordinal + 1));
            statement.setDouble(9, ordinal);
            statement.setDouble(10, ordinal);
            statement.setString(11, "cold");
            statement.setString(12, faction);
            statement.setInt(13, station ? 1 : 0);
            statement.executeUpdate();
        }
    }

    private static void insertEcology(Connection connection, UUID locationId, long tick,
                                      int producers, int herbivore, int predator, int scavenger,
                                      int bioaccumulator, int habitat, int migration) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("INSERT INTO location_ecology_state VALUES(?,?,?,?,?,?,?,?,?,?,?,?)")) {
            statement.setString(1, locationId.toString());
            statement.setString(2, WORLD_ID.toString());
            statement.setInt(3, producers);
            statement.setInt(4, 10);
            statement.setInt(5, herbivore);
            statement.setInt(6, predator);
            statement.setInt(7, scavenger);
            statement.setInt(8, bioaccumulator);
            statement.setInt(9, 50);
            statement.setInt(10, habitat);
            statement.setInt(11, migration);
            statement.setLong(12, tick);
            statement.executeUpdate();
        }
    }

    private static String stationCivilizationFingerprint(Connection connection) throws SQLException {
        return textValue(connection, "SELECT station_id||'|'||population_index||'|'||civilization_strength||'|'||fauna_pressure||'|'||frontier_state||'|'||last_tick FROM station_civilization_state");
    }

    private static String ecologyFingerprint(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT location_id,primary_producers,herbivore_biomass,predator_biomass,scavenger_biomass,bioaccumulator_mass,habitat_integrity,migration_pressure,last_tick FROM location_ecology_state ORDER BY location_id")) {
            StringBuilder fingerprint = new StringBuilder();
            while (result.next()) {
                for (int column = 1; column <= 9; column++) fingerprint.append(result.getString(column)).append('|');
            }
            return fingerprint.toString();
        }
    }

    private static Counts counts(Connection connection) throws SQLException {
        return new Counts(count(connection, "npc_population_state"), count(connection, "creature_population_state"),
                count(connection, "creature_territory_state"), count(connection, "faction_location_presence"),
                count(connection, "world_observation_event"), count(connection, "observation_snapshot"),
                count(connection, "observation_metric_series"));
    }

    private static long count(Connection connection, String table) throws SQLException {
        return longValue(connection, "SELECT COUNT(*) FROM " + table);
    }

    private static long countWhere(Connection connection, String table, String column, String value) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("SELECT COUNT(*) FROM " + table + " WHERE " + column + "=?")) {
            statement.setString(1, value);
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
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

    private static boolean tableExists(Connection connection, String name) throws SQLException { return objectExists(connection, "table", name); }
    private static boolean viewExists(Connection connection, String name) throws SQLException { return objectExists(connection, "view", name); }

    private static boolean objectExists(Connection connection, String type, String name) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("SELECT 1 FROM sqlite_master WHERE type=? AND name=?")) {
            statement.setString(1, type);
            statement.setString(2, name);
            try (ResultSet result = statement.executeQuery()) { return result.next(); }
        }
    }

    private static long foreignKeyViolations(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery("PRAGMA foreign_key_check")) {
            long count = 0;
            while (result.next()) count++;
            return count;
        }
    }

    private static void expectConstraintFailure(Connection connection, String sql, String message) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.executeUpdate(sql);
        } catch (SQLException expected) {
            return;
        }
        throw new IllegalStateException(message);
    }

    private static String uuidForOrdinal(int sourceOrdinal, int code) {
        return WORLD_ID.toString().substring(0, 24) + String.format("%012x", sourceOrdinal * 16L + code);
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

    private record Counts(long npcPopulations, long creaturePopulations, long territories,
                          long factionPresences, long events, long snapshots, long metrics) { }
}
