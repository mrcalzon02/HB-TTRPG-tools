package io.github.mrcalzon02.barotrauma.observation;

import io.github.mrcalzon02.barotrauma.persistence.NpcPopulationAccountingSchema;
import io.github.mrcalzon02.barotrauma.persistence.ObservationFoundationSchema;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.Comparator;
import java.util.UUID;

/** Query-only schema-016 observation reconstruction, including conserved population ledgers. */
public final class ObservationRegistryVerification {
    private ObservationRegistryVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        Path root = Files.createTempDirectory("barotrauma-observation-registry-");
        try {
            UUID worldId = UUID.fromString("15100000-0000-0000-0000-000000000001");
            UUID locationId = UUID.fromString("15100000-0000-0000-0000-000000000010");
            UUID stationId = UUID.fromString("15100000-0000-0000-0000-000000000020");
            WorldPaths paths = WorldStorageContracts.createWorld(root, "Registry Europa", worldId);
            createFixture(paths, worldId, locationId, stationId);

            ObservationRegistry.Snapshot snapshot = ObservationRegistry.load(paths);
            require(snapshot.summary().worldId().equals(worldId.toString()), "Observation summary lost world identity.");
            require(snapshot.summary().currentTick() == 43, "Observation summary lost the current tick.");
            require(snapshot.summary().populationLedgerRows() == 1, "Observation summary lost ledger count.");
            require(snapshot.npcPopulations().size() == 1, "Registry did not return the seeded NPC population.");
            require(snapshot.populationLedgers().size() == 1, "Registry did not return the population ledger.");
            require(snapshot.creaturePopulations().size() == 4, "Registry did not return four creature guilds.");
            require(snapshot.factionPresence().size() == 1, "Registry did not return faction presence.");
            require(snapshot.events().size() == 6, "Registry did not return initialization plus growth events.");
            require(snapshot.snapshots().size() == 1, "Registry did not return the root snapshot.");
            require(snapshot.metrics().size() == 7, "Registry did not return initialization plus accounting metrics.");
            require(snapshot.populationLedgers().get(0).beforeTotal() < snapshot.populationLedgers().get(0).afterTotal(),
                    "Registry lost the conserved population gain.");
            require("SUPPLY_RECOVERY".equals(snapshot.populationLedgers().get(0).primaryCause()),
                    "Registry lost the population ledger cause.");
            require(snapshot.creaturePopulations().stream().anyMatch(row -> "NESTING".equals(row.territoryStatus())),
                    "Registry lost creature-territory state.");

            ObservationRegistry.Snapshot changed = ObservationRegistry.loadChangedSince(paths, 42);
            require(changed.npcPopulations().size() == 1 && changed.populationLedgers().size() == 1,
                    "Changed-since query did not return the updated population and ledger.");
            require(changed.creaturePopulations().isEmpty() && changed.factionPresence().isEmpty()
                            && changed.events().size() == 1 && changed.metrics().size() == 2,
                    "Changed-since query returned stale rows or omitted new evidence.");

            String populationId = snapshot.npcPopulations().get(0).populationId();
            require(ObservationRegistry.eventsForEntity(paths, "NPC_POPULATION", populationId, 10).size() == 2,
                    "Selected-entity history did not return initialization and growth events.");
            expectFailure(() -> ObservationRegistry.eventsForEntity(paths, "NPC_POPULATION", populationId, 0),
                    "Registry accepted an invalid event limit.");

            try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
                 Statement statement = connection.createStatement()) {
                statement.executeUpdate("INSERT INTO schema_migration(version,applied_at) VALUES(29,'2026-07-20T00:00:00Z')");
            }
            expectFailure(() -> ObservationRegistry.load(paths),
                    "Registry accepted a newer unsupported schema.");
        } finally {
            deleteTree(root);
        }
    }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Read-only Observation Registry summary, conserved population ledger, changed-since-tick, entity history, and schema-rejection contracts passed.");
    }

    private static void createFixture(WorldPaths paths, UUID worldId, UUID locationId, UUID stationId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            try (Statement statement = connection.createStatement()) {
                statement.execute("PRAGMA foreign_keys=ON");
                statement.execute("CREATE TABLE schema_migration(version INTEGER PRIMARY KEY,applied_at TEXT NOT NULL)");
                statement.execute("CREATE TABLE world_metadata(world_id TEXT PRIMARY KEY,display_name TEXT NOT NULL,created_at TEXT NOT NULL,canonical_time TEXT,master_world_id TEXT)");
                statement.execute("CREATE TABLE world_simulation_metadata(world_id TEXT PRIMARY KEY,canonical_time TEXT,real_epoch TEXT,last_simulated_at TEXT,imported_tick_sequence INTEGER NOT NULL DEFAULT 0,imported_at TEXT NOT NULL,source_artifact_id TEXT NOT NULL,simulation_enabled INTEGER NOT NULL DEFAULT 0,scheduler_state TEXT NOT NULL DEFAULT 'PAUSED',current_tick_sequence INTEGER,tick_size_seconds INTEGER,tick_size_nanos INTEGER DEFAULT 0,last_command_id TEXT,last_checkpoint_id TEXT)");
                statement.execute("CREATE TABLE simulation_command_receipt(command_id TEXT PRIMARY KEY,world_id TEXT,execution_sequence INTEGER,after_canonical_time TEXT)");
                statement.execute("CREATE TABLE world_location(location_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,source_location_id TEXT NOT NULL,source_ordinal INTEGER NOT NULL,display_name TEXT NOT NULL,location_type TEXT,ring INTEGER NOT NULL DEFAULT 0,location_level INTEGER NOT NULL DEFAULT 0,map_x REAL,map_y REAL,biome TEXT,faction TEXT,is_station INTEGER NOT NULL DEFAULT 0,FOREIGN KEY(world_id) REFERENCES world_metadata(world_id))");
                statement.execute("CREATE TABLE world_station(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,location_id TEXT NOT NULL UNIQUE,source_station_id TEXT NOT NULL,display_name TEXT NOT NULL,station_type TEXT,faction TEXT,has_economy INTEGER NOT NULL DEFAULT 0,FOREIGN KEY(world_id) REFERENCES world_metadata(world_id),FOREIGN KEY(location_id) REFERENCES world_location(location_id))");
                statement.execute("CREATE TABLE station_simulation_state(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,credits INTEGER,supplies INTEGER,ore INTEGER,industry INTEGER,security INTEGER,integrity INTEGER,threat INTEGER,research INTEGER,status TEXT,last_tick INTEGER)");
                statement.execute("CREATE TABLE station_civilization_state(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,population_index INTEGER,civilization_strength INTEGER,fauna_pressure INTEGER,supply_consumption_base INTEGER,last_consumption INTEGER,shortage_ticks INTEGER,surplus_ticks INTEGER,frontier_position INTEGER,frontier_state TEXT,last_tick INTEGER)");
                statement.execute("CREATE TABLE location_ecology_state(location_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,primary_producers INTEGER,algal_bloom INTEGER,herbivore_biomass INTEGER,predator_biomass INTEGER,scavenger_biomass INTEGER,bioaccumulator_mass INTEGER,nutrient_load INTEGER,habitat_integrity INTEGER,migration_pressure INTEGER,last_tick INTEGER)");
                statement.execute("INSERT INTO schema_migration VALUES(15,'2026-07-19T00:00:00Z')");
            }
            try (PreparedStatement statement = connection.prepareStatement("INSERT INTO world_metadata VALUES(?,?,?,?,NULL)")) {
                statement.setString(1, worldId.toString()); statement.setString(2, "Registry Europa");
                statement.setString(3, "2026-07-19T00:00:00Z"); statement.setString(4, "2175-01-01T00:42:00Z");
                statement.executeUpdate();
            }
            try (PreparedStatement statement = connection.prepareStatement("INSERT INTO world_simulation_metadata(world_id,canonical_time,imported_tick_sequence,imported_at,source_artifact_id,current_tick_sequence,tick_size_seconds,tick_size_nanos) VALUES(?,?,?,?,?,42,60,0)")) {
                statement.setString(1, worldId.toString()); statement.setString(2, "2175-01-01T00:42:00Z");
                statement.setLong(3, 42); statement.setString(4, "2026-07-19T00:00:00Z"); statement.setString(5, "fixture");
                statement.executeUpdate();
            }
            try (PreparedStatement statement = connection.prepareStatement("INSERT INTO world_location VALUES(?,?,?,?,?,?,?,?,?,?,?,?,1)")) {
                statement.setString(1, locationId.toString()); statement.setString(2, worldId.toString());
                statement.setString(3, "registry-location"); statement.setInt(4, 0); statement.setString(5, "Registry Nadir");
                statement.setString(6, "outpost"); statement.setInt(7, 1); statement.setInt(8, 1);
                statement.setDouble(9, 0); statement.setDouble(10, 0); statement.setString(11, "cold");
                statement.setString(12, "Coalition"); statement.executeUpdate();
            }
            try (PreparedStatement statement = connection.prepareStatement("INSERT INTO world_station VALUES(?,?,?,?,?,?,?,1)")) {
                statement.setString(1, stationId.toString()); statement.setString(2, worldId.toString());
                statement.setString(3, locationId.toString()); statement.setString(4, "station-registry");
                statement.setString(5, "Registry Nadir"); statement.setString(6, "outpost");
                statement.setString(7, "Coalition"); statement.executeUpdate();
            }
            try (PreparedStatement statement = connection.prepareStatement("INSERT INTO station_simulation_state VALUES(?,?,?,?,?,?,?,?,?,?,?,?)")) {
                statement.setString(1, stationId.toString()); statement.setString(2, worldId.toString());
                int[] values = {10000,70,20,60,65,90,25,0};
                for (int index = 0; index < values.length; index++) statement.setInt(index + 3, values[index]);
                statement.setString(11, "STABLE"); statement.setLong(12, 42); statement.executeUpdate();
            }
            try (PreparedStatement statement = connection.prepareStatement("INSERT INTO station_civilization_state VALUES(?,?,?,?,?,?,?,?,?,?,?,?)")) {
                statement.setString(1, stationId.toString()); statement.setString(2, worldId.toString());
                int[] values = {70,75,20,2,2,1,4,60};
                for (int index = 0; index < values.length; index++) statement.setInt(index + 3, values[index]);
                statement.setString(11, "HOLDING"); statement.setLong(12, 42); statement.executeUpdate();
            }
            try (PreparedStatement statement = connection.prepareStatement("INSERT INTO location_ecology_state VALUES(?,?,?,?,?,?,?,?,?,?,?,?)")) {
                statement.setString(1, locationId.toString()); statement.setString(2, worldId.toString());
                int[] values = {60,10,55,45,25,15,50,80,35};
                for (int index = 0; index < values.length; index++) statement.setInt(index + 3, values[index]);
                statement.setLong(12, 42); statement.executeUpdate();
            }
            try (Statement statement = connection.createStatement()) {
                for (String sql : ObservationFoundationSchema.statements()) statement.execute(sql);
                for (String sql : NpcPopulationAccountingSchema.statements()) statement.execute(sql);
                statement.execute("INSERT INTO schema_migration VALUES(16,'2026-07-19T00:01:00Z')");
                statement.execute("INSERT INTO simulation_command_receipt VALUES('registry-command','" + worldId + "',1,'2175-01-01T00:43:00Z')");
                statement.execute("UPDATE station_civilization_state SET population_index=71,last_tick=43 WHERE station_id='" + stationId + "'");
                statement.execute("UPDATE world_simulation_metadata SET current_tick_sequence=43,canonical_time='2175-01-01T00:43:00Z' WHERE world_id='" + worldId + "'");
                statement.execute("UPDATE world_metadata SET canonical_time='2175-01-01T00:43:00Z' WHERE world_id='" + worldId + "'");
            }
        }
    }

    private static void expectFailure(ThrowingRunnable action, String message) throws Exception {
        try { action.run(); }
        catch (IllegalArgumentException | java.sql.SQLException expected) { return; }
        throw new IllegalStateException(message);
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

    @FunctionalInterface
    private interface ThrowingRunnable { void run() throws Exception; }
}
