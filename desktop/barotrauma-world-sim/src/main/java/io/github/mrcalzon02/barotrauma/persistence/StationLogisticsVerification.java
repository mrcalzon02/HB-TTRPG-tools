package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.compatibility.web.WebSuiteV22WorldDocument;
import io.github.mrcalzon02.barotrauma.compatibility.web.WebSuiteV22WorldDocument.WorldDocument;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.ImportPlan;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;
import io.github.mrcalzon02.barotrauma.simulation.DeterministicSimulationClock;
import io.github.mrcalzon02.barotrauma.simulation.SimulationCommandExecutor;
import io.github.mrcalzon02.barotrauma.simulation.TransitResolutionEngine.MissionType;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.UUID;

/** End-to-end contract for item logistics, freight, and imported player-vessel transit. */
public final class StationLogisticsVerification {
    private StationLogisticsVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        Path root = Files.createTempDirectory("barotrauma-station-logistics-");
        try {
            UUID worldId = UUID.fromString("99000000-0000-0000-0000-000000000001");
            WorldPaths paths = WorldStorageContracts.createWorld(root, "Logistics Europa", worldId);
            WorldDocument document = WebSuiteV22WorldDocument.inspect(
                    fixture().getBytes(StandardCharsets.UTF_8), "logistics-world.json");
            ImportPlan plan;
            try (SqliteWorldStore store = SqliteWorldStore.open(paths)) {
                plan = store.inspectAndPlan(document.inspection());
            }
            WebWorldV22ImportTransaction.commit(paths, new WebWorldV22ImportTransaction.ImportRequest(
                    plan.artifactId(), plan.artifact().artifactIdentity().digest(), "logistics-test", document));

            SimulationCheckpointStore.RecoveryState recovery = SimulationCheckpointStore.load(paths, Duration.ofMinutes(1));
            try (SimulationCommandExecutor executor = new SimulationCommandExecutor(
                    DeterministicSimulationClock.restore(recovery.snapshot()),
                    "logistics-contract-writer", recovery.lastExecutionSequence())) {
                var enabled = executor.submit(new SimulationCommandExecutor.Enable(), "logistics-test").join();
                SimulationCheckpointStore.persist(paths, enabled, "Enable logistics contract world");
                step(paths, executor);
                long catalogueItems = count(paths, "item_catalogue");
                require(catalogueItems >= 8, "Item catalogue seed failed.");
                require(count(paths, "production_recipe") == 4, "Production recipe seed failed.");
                require(count(paths, "station_inventory") == catalogueItems * 3,
                        "Station inventory seed failed.");
                require(count(paths, "station_vendor_offer") == catalogueItems * 3,
                        "Vendor offer seed failed.");
                require(count(paths, "station_production_run") > 0, "Passive production did not run.");
                require(count(paths, "treasury_transaction") > 0, "Production treasury entries are missing.");
                forceFreightShortage(paths);
                step(paths, executor);
            }

            String lotId = readyFreightLot(paths);
            require(lotId != null, "Passive shortage did not create a READY freight opportunity.");
            UUID vesselId = UUID.fromString("99000000-0000-0000-0000-000000000010");
            installPlayerVessel(paths, worldId,
                    UUID.fromString("99000000-0000-0000-0000-000000000011"), vesselId);
            UUID start = location(paths, "station-a");
            UUID destination = location(paths, "station-b");
            require(PlayerVesselTransitTransaction.enroll(paths, vesselId, start, "logistics-test")
                    .status().equals("DOCKED"), "Player vessel enrollment failed.");

            int destinationBefore = inventory(paths, "station-b", "item-rations");
            long treasuryBefore = count(paths, "treasury_transaction");
            var loaded = PlayerFreightTransaction.load(paths, vesselId, lotId, "logistics-test");
            require(loaded.status().equals("IN_TRANSIT") && loaded.vesselCargo() == loaded.quantity(),
                    "Player freight loading failed.");
            require(PlayerVesselTransitTransaction.planRoute(paths, vesselId, destination,
                    MissionType.TRADE, "logistics-test").status().equals("IN_TRANSIT"),
                    "Player freight route planning failed.");

            PlayerVesselTransitTransaction.TransitResult last = null;
            for (int attempt = 0; attempt < 50; attempt++) {
                last = PlayerVesselTransitTransaction.resolveNextChallenge(paths, vesselId, "logistics-test");
                if (!last.state().status().equals("IN_TRANSIT")) break;
            }
            require(last != null && last.state().status().equals("ARRIVED"),
                    "High-skill player freight vessel did not reach its destination.");
            PlayerVesselTransitTransaction.dock(paths, vesselId, "logistics-test");
            var delivered = PlayerFreightTransaction.deliver(paths, vesselId, lotId, "logistics-test");
            require(delivered.status().equals("DELIVERED") && delivered.vesselCargo() == 0,
                    "Player freight delivery failed.");
            require(inventory(paths, "station-b", "item-rations") == destinationBefore + delivered.quantity(),
                    "Delivered freight was not added to destination inventory.");
            require(count(paths, "treasury_transaction") >= treasuryBefore + 2,
                    "Player freight treasury entries are missing.");
            require(count(paths, "player_transit_encounter") > 0,
                    "Player encounter persistence failed.");
            require(count(paths, "player_voyage_log") >= 6,
                    "Player voyage and freight history is incomplete.");
            require(freightStatus(paths, lotId).equals("DELIVERED"),
                    "Freight lot did not retain delivered state.");
            requireDeliveryCausality(paths, lotId, "PLAYER_VESSEL", delivered.quantity());
            verifyProductionCausality(paths);
            require(schemaVersion(paths) == WorldStorageContracts.DATABASE_SCHEMA_VERSION,
                    "Logistics fixture was not stored under the current database schema.");
        } finally {
            try (var stream = Files.walk(root)) {
                for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
            }
        }
    }

    private static void step(WorldPaths paths, SimulationCommandExecutor executor) throws Exception {
        var receipt = executor.submit(new SimulationCommandExecutor.Step(1), "logistics-test").join();
        PassiveWorldTickTransaction.commit(paths, receipt);
    }

    private static void forceFreightShortage(WorldPaths paths) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            UUID source = station(connection, "station-a");
            UUID destination = station(connection, "station-b");
            try (PreparedStatement statement = connection.prepareStatement(
                    "UPDATE station_inventory SET quantity=? WHERE station_id=? AND item_id='item-rations'")) {
                statement.setInt(1, 140);
                statement.setString(2, source.toString());
                statement.executeUpdate();
                statement.setInt(1, 0);
                statement.setString(2, destination.toString());
                statement.executeUpdate();
            }
        }
    }

    private static String readyFreightLot(WorldPaths paths) throws Exception {
        String sql = "SELECT f.lot_id FROM freight_lot f JOIN world_station src ON src.station_id=f.source_station_id "
                + "JOIN world_station dst ON dst.station_id=f.destination_station_id "
                + "WHERE f.status='READY' AND f.item_id='item-rations' "
                + "AND src.source_station_id='station-a' AND dst.source_station_id='station-b' "
                + "ORDER BY f.created_tick DESC LIMIT 1";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            return result.next() ? result.getString(1) : null;
        }
    }

    private static int inventory(WorldPaths paths, String stationSourceId, String itemId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT inv.quantity FROM station_inventory inv JOIN world_station ws ON ws.station_id=inv.station_id "
                             + "WHERE ws.source_station_id=? AND inv.item_id=?")) {
            statement.setString(1, stationSourceId);
            statement.setString(2, itemId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Fixture inventory row is missing.");
                return result.getInt(1);
            }
        }
    }

    private static String freightStatus(WorldPaths paths, String lotId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement("SELECT status FROM freight_lot WHERE lot_id=?")) {
            statement.setString(1, lotId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Freight lot disappeared.");
                return result.getString(1);
            }
        }
    }

    private static void requireDeliveryCausality(WorldPaths paths, String lotId, String carrierType,
                                                  int expectedInventoryDelta) throws Exception {
        String sql = "SELECT e.actor_type,c.reason_code,c.delta_value FROM station_event e "
                + "JOIN station_change c ON c.event_id=e.event_id WHERE e.cause_type='FREIGHT_LOT' "
                + "AND e.cause_id=? AND c.change_id=?";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, lotId);
            statement.setString(2, lotId + ":delivery-inventory");
            try (ResultSet result = statement.executeQuery()) {
                require(result.next() && carrierType.equals(result.getString("actor_type"))
                                && "FREIGHT_DELIVERY".equals(result.getString("reason_code"))
                                && result.getInt("delta_value") == expectedInventoryDelta,
                        "Player freight delivery did not retain carrier-attributed inventory causality.");
            }
            try (PreparedStatement count = connection.prepareStatement(
                    "SELECT (SELECT COUNT(*) FROM station_event WHERE cause_type='FREIGHT_LOT' AND cause_id=?),"
                            + "(SELECT COUNT(*) FROM station_change c JOIN station_event e ON e.event_id=c.event_id "
                            + "WHERE e.cause_type='FREIGHT_LOT' AND e.cause_id=? AND "
                            + "ABS((c.previous_value+c.delta_value)-c.resulting_value)>=0.000001),"
                            + "(SELECT COUNT(*) FROM station_delivery_baseline WHERE lot_id=?)")) {
                count.setString(1, lotId);
                count.setString(2, lotId);
                count.setString(3, lotId);
                try (ResultSet result = count.executeQuery()) {
                    require(result.next() && result.getInt(1) == 1 && result.getInt(2) == 0
                                    && result.getInt(3) == 0,
                            "Delivery story volume, arithmetic, or baseline cleanup failed.");
                }
            }
        }
    }

    private static void verifyProductionCausality(WorldPaths paths) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            UUID stationId = station(connection, "station-c");
            execute(connection, "UPDATE station_simulation_state SET credits=5000,integrity=90 WHERE station_id=?",
                    stationId);
            execute(connection, "UPDATE station_inventory SET quantity=100,reserved=0 WHERE station_id=? "
                    + "AND item_id IN ('item-ore','item-steel','item-rations','item-research')", stationId);

            long identityOffset = stationId.toString().charAt(0);
            long successTick = tickAvoiding(identityOffset, 2100, 17, 29);
            int oreBefore = inventory(paths, "station-c", "item-ore");
            int steelBefore = inventory(paths, "station-c", "item-steel");
            int creditsBefore = stationValue(connection, stationId, "credits");
            insertProductionRun(connection, stationId, successTick, "COMPLETE");
            require(outcome(connection, stationId, successTick).equals("SUCCESS"),
                    "Affordable production did not retain a success outcome.");
            require(inventory(paths, "station-c", "item-ore") == oreBefore - 3
                            && inventory(paths, "station-c", "item-steel") == steelBefore + 2,
                    "Successful production did not apply its declared input and output quantities.");
            require(stationValue(connection, stationId, "credits") == creditsBefore - 120,
                    "Successful production did not apply its declared credit cost.");

            execute(connection, "UPDATE station_inventory SET quantity=0,reserved=0 WHERE station_id=? "
                    + "AND item_id='item-ore'", stationId);
            long inputTick = successTick + 1;
            int inputCreditsBefore = stationValue(connection, stationId, "credits");
            insertProductionRun(connection, stationId, inputTick, "FAILED");
            require(outcome(connection, stationId, inputTick).equals("INPUT_SHORTFALL"),
                    "Missing materials did not retain an input-shortfall outcome.");
            require(stationValue(connection, stationId, "credits") == inputCreditsBefore,
                    "An input shortfall incorrectly spent production credits.");

            execute(connection, "UPDATE station_inventory SET quantity=100,reserved=0 WHERE station_id=? "
                    + "AND item_id='item-ore'", stationId);
            execute(connection, "UPDATE station_simulation_state SET credits=0 WHERE station_id=?", stationId);
            long creditTick = tickAvoiding(identityOffset, inputTick + 1, 17, 29);
            int creditOreBefore = inventory(paths, "station-c", "item-ore");
            insertProductionRun(connection, stationId, creditTick, "COMPLETE");
            require(outcome(connection, stationId, creditTick).equals("CREDIT_SHORTFALL"),
                    "Insufficient funds did not retain a credit-shortfall outcome.");
            require(inventory(paths, "station-c", "item-ore") == creditOreBefore,
                    "A credit shortfall incorrectly consumed production inputs.");

            execute(connection, "UPDATE station_simulation_state SET credits=5000,integrity=90 WHERE station_id=?",
                    stationId);
            long failureTick = tickMatching(identityOffset, creditTick + 1, 17, 29);
            insertProductionRun(connection, stationId, failureTick, "COMPLETE");
            require(outcome(connection, stationId, failureTick).equals("EQUIPMENT_FAILURE")
                            && stationValue(connection, stationId, "integrity") == 89,
                    "Equipment failure did not retain its outcome and one-point integrity loss.");

            long sabotageTick = tickMatching(identityOffset, failureTick + 1, 29, 0);
            insertProductionRun(connection, stationId, sabotageTick, "COMPLETE");
            require(outcome(connection, stationId, sabotageTick).equals("SABOTAGE")
                            && stationValue(connection, stationId, "integrity") == 87,
                    "Sabotage did not retain its inferred story and two-point integrity loss.");

            require(countProduction(connection, stationId, successTick, sabotageTick,
                            "station_production_outcome") == 5,
                    "A production attempt disappeared from the outcome ledger.");
            require(countProduction(connection, stationId, successTick, sabotageTick,
                            "station_event") == 5,
                    "Production did not retain exactly one bounded story per attempt.");
            require(inconsistentProductionChanges(connection, stationId, successTick, sabotageTick) == 0,
                    "A production change does not reconcile before + delta with its result.");
            require(changeReasonCount(connection, stationId, successTick, "PRODUCTION_INPUT") > 0
                            && changeReasonCount(connection, stationId, successTick, "PRODUCTION_OUTPUT") > 0
                            && changeReasonCount(connection, stationId, sabotageTick, "SABOTAGE_DAMAGE") == 1,
                    "Production stories lost their typed input, output, or sabotage changes.");
        }
    }

    private static void execute(Connection connection, String sql, UUID stationId) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            statement.executeUpdate();
        }
    }

    private static void insertProductionRun(Connection connection, UUID stationId, long tick, String status)
            throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT OR IGNORE INTO station_production_run(run_id,station_id,recipe_id,tick_sequence,cycles,status) "
                        + "VALUES (?,?, 'recipe-steel',?,1,?)")) {
            statement.setString(1, stationId + ":causal-production:" + tick);
            statement.setString(2, stationId.toString());
            statement.setLong(3, tick);
            statement.setString(4, status);
            statement.executeUpdate();
        }
    }

    private static long tickAvoiding(long offset, long start, int first, int second) {
        long tick = start;
        while ((tick + offset) % first == 0 || (tick + offset) % second == 0) tick++;
        return tick;
    }

    private static long tickMatching(long offset, long start, int divisor, int avoidDivisor) {
        long tick = start;
        while ((tick + offset) % divisor != 0
                || (avoidDivisor > 0 && (tick + offset) % avoidDivisor == 0)) tick++;
        return tick;
    }

    private static String outcome(Connection connection, UUID stationId, long tick) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT o.outcome_type FROM station_production_outcome o JOIN station_production_run p "
                        + "ON p.run_id=o.run_id WHERE p.station_id=? AND p.tick_sequence=?")) {
            statement.setString(1, stationId.toString());
            statement.setLong(2, tick);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Production outcome is missing at tick " + tick);
                return result.getString(1);
            }
        }
    }

    private static int stationValue(Connection connection, UUID stationId, String column) throws Exception {
        if (!java.util.Set.of("credits", "integrity").contains(column)) {
            throw new IllegalArgumentException("Unsupported station value.");
        }
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT " + column + " FROM station_simulation_state WHERE station_id=?")) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Station simulation state is missing.");
                return result.getInt(1);
            }
        }
    }

    private static long countProduction(Connection connection, UUID stationId, long fromTick, long toTick,
                                        String table) throws Exception {
        String sql;
        if (table.equals("station_production_outcome")) {
            sql = "SELECT COUNT(*) FROM station_production_outcome o JOIN station_production_run p ON p.run_id=o.run_id ";
        } else if (table.equals("station_event")) {
            sql = "SELECT COUNT(*) FROM station_event e JOIN station_production_run p ON p.run_id=e.cause_id "
                    + "WHERE e.cause_type='PRODUCTION_RUN' AND ";
        } else throw new IllegalArgumentException("Unsupported production evidence table.");
        if (table.equals("station_production_outcome")) sql += "WHERE ";
        sql += "p.station_id=? AND p.tick_sequence BETWEEN ? AND ?";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            statement.setLong(2, fromTick);
            statement.setLong(3, toTick);
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static long inconsistentProductionChanges(Connection connection, UUID stationId,
                                                      long fromTick, long toTick) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT COUNT(*) FROM station_change c JOIN station_event e ON e.event_id=c.event_id "
                        + "WHERE e.station_id=? AND e.cause_type='PRODUCTION_RUN' AND e.tick_sequence BETWEEN ? AND ? "
                        + "AND ABS((c.previous_value+c.delta_value)-c.resulting_value)>=0.000001")) {
            statement.setString(1, stationId.toString());
            statement.setLong(2, fromTick);
            statement.setLong(3, toTick);
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static long changeReasonCount(Connection connection, UUID stationId, long tick, String reason)
            throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT COUNT(*) FROM station_change c JOIN station_event e ON e.event_id=c.event_id "
                        + "WHERE e.station_id=? AND e.tick_sequence=? AND e.cause_type='PRODUCTION_RUN' "
                        + "AND c.reason_code=?")) {
            statement.setString(1, stationId.toString());
            statement.setLong(2, tick);
            statement.setString(3, reason);
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static void installPlayerVessel(WorldPaths paths, UUID worldId, UUID definitionId, UUID vesselId)
            throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            try (PreparedStatement definition = connection.prepareStatement(
                    "INSERT INTO submarine_definition(definition_id,canonical_xml_sha256,official_check_value,"
                            + "display_name,game_version,submarine_type,submarine_class,tier) VALUES (?,?,?,?,?,?,?,?)")) {
                definition.setString(1, definitionId.toString());
                definition.setString(2, "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc");
                definition.setInt(3, 77);
                definition.setString(4, "Logistics Scout");
                definition.setString(5, "1.0.0");
                definition.setString(6, "Player");
                definition.setString(7, "Scout");
                definition.setInt(8, 10);
                definition.executeUpdate();
            }
            try (PreparedStatement vessel = connection.prepareStatement(
                    "INSERT INTO vessel_instance(vessel_id,world_id,definition_id,display_name,created_at) "
                            + "VALUES (?,?,?,?,?)")) {
                vessel.setString(1, vesselId.toString());
                vessel.setString(2, worldId.toString());
                vessel.setString(3, definitionId.toString());
                vessel.setString(4, "Logistics Scout One");
                vessel.setString(5, Instant.parse("2026-07-18T08:00:00Z").toString());
                vessel.executeUpdate();
            }
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

    private static UUID location(WorldPaths paths, String sourceId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT location_id FROM world_location WHERE source_location_id=?")) {
            statement.setString(1, sourceId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Fixture location is missing: " + sourceId);
                return UUID.fromString(result.getString(1));
            }
        }
    }

    private static long count(WorldPaths paths, String table) throws Exception {
        if (!java.util.Set.of("item_catalogue", "production_recipe", "station_inventory",
                "station_vendor_offer", "station_production_run", "treasury_transaction",
                "player_transit_encounter", "player_voyage_log", "freight_lot").contains(table)) {
            throw new IllegalArgumentException("Unsupported logistics verification table.");
        }
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COUNT(*) FROM " + table)) {
            return result.next() ? result.getLong(1) : 0;
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
                {"version":22,"exportedAt":"2026-07-18T08:00:00Z","masterWorldId":"LOGISTICS-WORLD",
                "worldEconomyVersion":"1.0.0","worldStateSchemaVersion":"2.2.0","state":{
                "world":{"canonicalTime":"2175-01-01T00:00:00Z","realEpoch":"2026-06-20T08:00:00Z",
                "map":{"rings":48,"shellRadius":7008,"nodes":[
                {"id":"station-a","name":"Alpha Station","ring":48,"level":1,"type":"station","x":10,"y":20},
                {"id":"station-b","name":"Beta Station","ring":40,"level":3,"type":"station","x":90,"y":40},
                {"id":"station-c","name":"Gamma Station","ring":32,"level":5,"type":"station","x":170,"y":90},
                {"id":"route-a","name":"Abyssal Route","ring":18,"level":8,"type":"location","x":300,"y":180}]}},
                "worldEconomy":{"vessels":{},"stationEconomies":{"station-a":{},"station-b":{},"station-c":{}},
                "simulation":{"tickSequence":20,"lastSimulatedAt":"2175-01-01T00:00:00Z"}},
                "submarine":{"name":"Observer","model":"Barsuk","crewRoster":[]}}}
                """;
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Barotrauma station logistics, freight, and player transit contracts passed.");
    }
}
