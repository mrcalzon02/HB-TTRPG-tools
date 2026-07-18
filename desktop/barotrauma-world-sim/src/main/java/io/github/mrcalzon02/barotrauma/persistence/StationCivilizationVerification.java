package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.compatibility.web.WebSuiteV22WorldDocument;
import io.github.mrcalzon02.barotrauma.compatibility.web.WebSuiteV22WorldDocument.WorldDocument;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.ImportPlan;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;
import io.github.mrcalzon02.barotrauma.simulation.DeterministicSimulationClock;
import io.github.mrcalzon02.barotrauma.simulation.SimulationCommandExecutor;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.Duration;
import java.util.Comparator;
import java.util.UUID;

/** Behavioral contract for variable consumption and civilization/fauna frontier movement. */
public final class StationCivilizationVerification {
    private StationCivilizationVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        Path root = Files.createTempDirectory("barotrauma-civilization-frontier-");
        try {
            UUID worldId = UUID.fromString("9a000000-0000-0000-0000-000000000001");
            WorldPaths paths = WorldStorageContracts.createWorld(root, "Frontier Europa", worldId);
            WorldDocument document = WebSuiteV22WorldDocument.inspect(
                    fixture().getBytes(StandardCharsets.UTF_8), "frontier-world.json");
            ImportPlan plan;
            try (SqliteWorldStore store = SqliteWorldStore.open(paths)) {
                plan = store.inspectAndPlan(document.inspection());
            }
            WebWorldV22ImportTransaction.commit(paths, new WebWorldV22ImportTransaction.ImportRequest(
                    plan.artifactId(), plan.artifact().artifactIdentity().digest(), "frontier-test", document));

            SimulationCheckpointStore.RecoveryState recovery = SimulationCheckpointStore.load(paths, Duration.ofMinutes(1));
            try (SimulationCommandExecutor executor = new SimulationCommandExecutor(
                    DeterministicSimulationClock.restore(recovery.snapshot()),
                    "frontier-contract-writer", recovery.lastExecutionSequence())) {
                var enabled = executor.submit(new SimulationCommandExecutor.Enable(), "frontier-test").join();
                SimulationCheckpointStore.persist(paths, enabled, "Enable frontier contract world");
                step(paths, executor, 1);

                UUID stationId = station(paths, "station-a");
                long consumptionBefore = stationCount(paths, "station_consumption_log", stationId);
                forceShortage(paths, stationId);
                FrontierState shortageBaseline = frontier(paths, stationId);
                step(paths, executor, 12);

                FrontierState contracted = frontier(paths, stationId);
                require(stationCount(paths, "station_consumption_log", stationId) == consumptionBefore + 12,
                        "Every passive tick did not write station consumption evidence.");
                require(distinctConsumption(paths, stationId) >= 2,
                        "Station consumption did not vary over time.");
                require(contracted.shortageTicks() >= 8,
                        "Sustained undersupply did not accumulate a shortage streak.");
                require(contracted.frontierPosition() < shortageBaseline.frontierPosition(),
                        "Sustained undersupply did not contract the civilian frontier.");
                require(contracted.populationIndex() <= shortageBaseline.populationIndex(),
                        "Sustained undersupply unexpectedly increased population capacity.");
                require(contracted.frontierState().equals("CONTRACTING")
                                || contracted.frontierState().equals("CONTESTED")
                                || contracted.frontierState().equals("ABANDONED"),
                        "Sustained undersupply did not produce a contraction state.");
                require(eventCount(paths, stationId, "SHORTAGE") > 0
                                && eventCount(paths, stationId, "CONTRACTION") > 0,
                        "Shortage and contraction evidence were not retained.");

                int suppliesBeforeDelivery = stationSupplies(paths, stationId);
                deliverRations(paths, stationId, 60);
                FrontierState delivered = frontier(paths, stationId);
                require(stationSupplies(paths, stationId) >= suppliesBeforeDelivery + 100,
                        "A major ration delivery did not materially restore station supply capacity.");
                require(delivered.shortageTicks() < contracted.shortageTicks(),
                        "A major ration delivery did not reduce accumulated shortage pressure.");
                require(eventCount(paths, stationId, "DELIVERY") > 0,
                        "Delivery support was not recorded in frontier history.");

                prepareExpansion(paths, stationId);
                require(eventCount(paths, stationId, "RECOVERY") > 0,
                        "A contracting station did not record recovery after resupply and stabilization.");
                int frontierBeforeRecovery = frontier(paths, stationId).frontierPosition();
                step(paths, executor, 10);
                FrontierState recovered = frontier(paths, stationId);
                require(recovered.frontierPosition() > frontierBeforeRecovery,
                        "Stable supply and security did not permit slow frontier expansion.");
                require(recovered.civilizationStrength() >= 80,
                        "Stable supply and security did not preserve civilization strength.");
                require(eventCount(paths, stationId, "EXPANSION") > 0,
                        "Civilization expansion was not recorded.");
                require(openExpansionMission(paths, stationId),
                        "Civilization expansion did not create outward NPC work.");

                prepareMonsterAttack(paths, stationId);
                long currentTick = currentTick(paths);
                int codePoint = stationId.toString().charAt(2);
                int ticksToAttack = 1;
                while (Math.floorMod(currentTick + ticksToAttack + codePoint, 13) != 0) ticksToAttack++;
                long attackTick = currentTick + ticksToAttack;
                step(paths, executor, ticksToAttack);
                FrontierState attacked = frontier(paths, stationId);
                require(eventAtTick(paths, stationId, "MONSTER_ATTACK", attackTick),
                        "Deterministic fauna pressure did not produce a monster attack.");
                require(attacked.frontierPosition() < 55,
                        "A successful monster attack did not force the civilian perimeter inward.");
                require(openDefenseMission(paths, stationId),
                        "Frontier contraction did not create an NPC defense or fauna-clearing response.");
                require(frontierMissionIdsAreUuids(paths, stationId),
                        "A frontier-generated NPC mission did not retain UUID-compatible identity.");
                require(schemaVersion(paths) == WorldStorageContracts.DATABASE_SCHEMA_VERSION,
                        "Frontier fixture was not stored under the current database schema.");
            }
        } finally {
            try (var stream = Files.walk(root)) {
                for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
            }
        }
    }

    private static void step(WorldPaths paths, SimulationCommandExecutor executor, int ticks) throws Exception {
        var receipt = executor.submit(new SimulationCommandExecutor.Step(ticks), "frontier-test").join();
        PassiveWorldTickTransaction.commit(paths, receipt);
    }

    private static void forceShortage(WorldPaths paths, UUID stationId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            execute(connection, "UPDATE station_simulation_state SET supplies=18,industry=20,security=25,"
                    + "integrity=95,threat=45 WHERE station_id=?", stationId);
            execute(connection, "UPDATE station_inventory SET quantity=0,reserved=0 WHERE station_id=? "
                    + "AND item_id='item-rations'", stationId);
            execute(connection, "UPDATE station_civilization_state SET population_index=70,"
                    + "civilization_strength=55,fauna_pressure=40,shortage_ticks=0,surplus_ticks=0,"
                    + "frontier_position=60,frontier_state='HOLDING' WHERE station_id=?", stationId);
        }
    }

    private static void deliverRations(WorldPaths paths, UUID destinationStationId, int quantity) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            UUID sourceStationId = station(connection, "station-b");
            String worldId = worldId(connection);
            long tick = currentTick(connection);
            try (PreparedStatement stock = connection.prepareStatement(
                    "UPDATE station_inventory SET quantity=quantity+?,last_tick=? WHERE station_id=? "
                            + "AND item_id='item-rations'")) {
                stock.setInt(1, quantity);
                stock.setLong(2, tick);
                stock.setString(3, destinationStationId.toString());
                stock.executeUpdate();
            }
            String lotId = destinationStationId + ":recovery-delivery:" + tick;
            try (PreparedStatement lot = connection.prepareStatement(
                    "INSERT INTO freight_lot(lot_id,world_id,source_station_id,destination_station_id,item_id,quantity,"
                            + "status,created_tick,updated_tick) VALUES (?,?,?,?, 'item-rations',?,'IN_TRANSIT',?,?)")) {
                lot.setString(1, lotId);
                lot.setString(2, worldId);
                lot.setString(3, sourceStationId.toString());
                lot.setString(4, destinationStationId.toString());
                lot.setInt(5, quantity);
                lot.setLong(6, tick);
                lot.setLong(7, tick);
                lot.executeUpdate();
            }
            try (PreparedStatement delivered = connection.prepareStatement(
                    "UPDATE freight_lot SET status='DELIVERED',delivered_tick=?,updated_tick=? WHERE lot_id=?")) {
                delivered.setLong(1, tick);
                delivered.setLong(2, tick);
                delivered.setString(3, lotId);
                delivered.executeUpdate();
            }
        }
    }

    private static void prepareExpansion(WorldPaths paths, UUID stationId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            execute(connection, "UPDATE station_simulation_state SET supplies=180,industry=80,security=90,"
                    + "integrity=95,threat=5 WHERE station_id=?", stationId);
            execute(connection, "UPDATE station_inventory SET quantity=120,reserved=0 WHERE station_id=? "
                    + "AND item_id='item-rations'", stationId);
            execute(connection, "UPDATE station_civilization_state SET civilization_strength=80,"
                    + "fauna_pressure=5,shortage_ticks=0,surplus_ticks=0,frontier_state='HOLDING' "
                    + "WHERE station_id=?", stationId);
        }
    }

    private static void prepareMonsterAttack(WorldPaths paths, UUID stationId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            execute(connection, "UPDATE station_simulation_state SET supplies=150,industry=55,security=0,"
                    + "integrity=90,threat=80 WHERE station_id=?", stationId);
            execute(connection, "UPDATE station_inventory SET quantity=100,reserved=0 WHERE station_id=? "
                    + "AND item_id='item-rations'", stationId);
            execute(connection, "UPDATE station_civilization_state SET population_index=70,"
                    + "civilization_strength=20,fauna_pressure=95,shortage_ticks=0,surplus_ticks=0,"
                    + "frontier_position=55,frontier_state='HOLDING' WHERE station_id=?", stationId);
        }
    }

    private static void execute(Connection connection, String sql, UUID stationId) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            statement.executeUpdate();
        }
    }

    private static FrontierState frontier(WorldPaths paths, UUID stationId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT population_index,civilization_strength,fauna_pressure,last_consumption,shortage_ticks,"
                             + "surplus_ticks,frontier_position,frontier_state,last_tick "
                             + "FROM station_civilization_state WHERE station_id=?")) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Station civilization state is missing.");
                return new FrontierState(result.getInt("population_index"),
                        result.getInt("civilization_strength"), result.getInt("fauna_pressure"),
                        result.getInt("last_consumption"), result.getInt("shortage_ticks"),
                        result.getInt("surplus_ticks"), result.getInt("frontier_position"),
                        result.getString("frontier_state"), result.getLong("last_tick"));
            }
        }
    }

    private static UUID station(WorldPaths paths, String sourceId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            return station(connection, sourceId);
        }
    }

    private static UUID station(Connection connection, String sourceId) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT station_id FROM world_station WHERE source_station_id=?")) {
            statement.setString(1, sourceId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Fixture station is missing: " + sourceId);
                return UUID.fromString(result.getString(1));
            }
        }
    }

    private static long stationCount(WorldPaths paths, String table, UUID stationId) throws Exception {
        if (!java.util.Set.of("station_consumption_log", "civilization_frontier_event").contains(table)) {
            throw new IllegalArgumentException("Unsupported station history table.");
        }
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT COUNT(*) FROM " + table + " WHERE station_id=?")) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static int distinctConsumption(WorldPaths paths, UUID stationId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT COUNT(DISTINCT required_units) FROM station_consumption_log WHERE station_id=?")) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getInt(1) : 0; }
        }
    }

    private static long eventCount(WorldPaths paths, UUID stationId, String eventType) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT COUNT(*) FROM civilization_frontier_event WHERE station_id=? AND event_type=?")) {
            statement.setString(1, stationId.toString());
            statement.setString(2, eventType);
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static boolean eventAtTick(WorldPaths paths, UUID stationId, String eventType, long tick)
            throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT 1 FROM civilization_frontier_event WHERE station_id=? AND event_type=? "
                             + "AND tick_sequence=?")) {
            statement.setString(1, stationId.toString());
            statement.setString(2, eventType);
            statement.setLong(3, tick);
            try (ResultSet result = statement.executeQuery()) { return result.next(); }
        }
    }

    private static boolean openDefenseMission(WorldPaths paths, UUID stationId) throws Exception {
        return openMission(paths, stationId, "'FAUNA_CLEARING','DEFENSE'");
    }

    private static boolean openExpansionMission(WorldPaths paths, UUID stationId) throws Exception {
        return openMission(paths, stationId, "'TRANSIT','RESEARCH'");
    }

    private static boolean openMission(WorldPaths paths, UUID stationId, String types) throws Exception {
        String sql = "SELECT 1 FROM world_mission WHERE origin_station_id=? AND mission_type IN (" + types + ") "
                + "AND status IN ('AVAILABLE','ASSIGNED','ACTIVE') LIMIT 1";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) { return result.next(); }
        }
    }

    private static boolean frontierMissionIdsAreUuids(WorldPaths paths, UUID stationId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT mission_id FROM world_mission WHERE origin_station_id=? "
                             + "AND mission_type IN ('FAUNA_CLEARING','DEFENSE','TRANSIT','RESEARCH')")) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) {
                boolean found = false;
                while (result.next()) {
                    UUID.fromString(result.getString(1));
                    found = true;
                }
                return found;
            }
        } catch (IllegalArgumentException invalidUuid) {
            return false;
        }
    }

    private static int stationSupplies(WorldPaths paths, UUID stationId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT supplies FROM station_simulation_state WHERE station_id=?")) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Station simulation state is missing.");
                return result.getInt(1);
            }
        }
    }

    private static long currentTick(WorldPaths paths) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            return currentTick(connection);
        }
    }

    private static long currentTick(Connection connection) throws Exception {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(
                "SELECT COALESCE(current_tick_sequence,imported_tick_sequence) "
                        + "FROM world_simulation_metadata LIMIT 1")) {
            if (!result.next()) throw new IllegalStateException("World clock is missing.");
            return result.getLong(1);
        }
    }

    private static String worldId(Connection connection) throws Exception {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT world_id FROM world_metadata LIMIT 1")) {
            if (!result.next()) throw new IllegalStateException("World metadata is missing.");
            return result.getString(1);
        }
    }

    private static int schemaVersion(WorldPaths paths) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT MAX(version) FROM schema_migration")) {
            return result.next() ? result.getInt(1) : 0;
        }
    }

    private static String fixture() {
        return """
                {"version":22,"exportedAt":"2026-07-18T12:00:00Z","masterWorldId":"FRONTIER-WORLD",
                "worldEconomyVersion":"1.0.0","worldStateSchemaVersion":"2.2.0","state":{
                "world":{"canonicalTime":"2175-01-01T00:00:00Z","realEpoch":"2026-06-20T08:00:00Z",
                "map":{"rings":48,"shellRadius":7008,"nodes":[
                {"id":"station-a","name":"Frontier Station","ring":42,"level":4,"type":"station","x":20,"y":30},
                {"id":"station-b","name":"Supply Station","ring":47,"level":1,"type":"station","x":80,"y":40},
                {"id":"deep-a","name":"Fauna Trench","ring":18,"level":9,"type":"location","x":260,"y":180}]}},
                "worldEconomy":{"vessels":{},"stationEconomies":{"station-a":{},"station-b":{}},
                "simulation":{"tickSequence":30,"lastSimulatedAt":"2175-01-01T00:00:00Z"}},
                "submarine":{"name":"Observer","model":"Barsuk","crewRoster":[]}}}
                """;
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    private record FrontierState(int populationIndex, int civilizationStrength, int faunaPressure,
                                 int lastConsumption, int shortageTicks, int surplusTicks,
                                 int frontierPosition, String frontierState, long lastTick) { }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Barotrauma station consumption and civilization frontier contracts passed.");
    }
}
