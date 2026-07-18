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

/** End-to-end schema-006 contract for item logistics and imported player-vessel transit. */
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

            SimulationCheckpointStore.RecoveryState recovery = SimulationCheckpointStore.load(
                    paths, Duration.ofMinutes(1));
            try (SimulationCommandExecutor executor = new SimulationCommandExecutor(
                    DeterministicSimulationClock.restore(recovery.snapshot()),
                    "logistics-contract-writer", recovery.lastExecutionSequence())) {
                var enabled = executor.submit(new SimulationCommandExecutor.Enable(), "logistics-test").join();
                SimulationCheckpointStore.persist(paths, enabled, "Enable logistics contract world");
                var step = executor.submit(new SimulationCommandExecutor.Step(1), "logistics-test").join();
                PassiveWorldTickTransaction.commit(paths, step);
            }

            require(count(paths, "item_catalogue") == 8, "Item catalogue seed failed.");
            require(count(paths, "production_recipe") == 4, "Production recipe seed failed.");
            require(count(paths, "station_inventory") == 24, "Station inventory seed failed.");
            require(count(paths, "station_vendor_offer") == 24, "Vendor offer seed failed.");
            require(count(paths, "station_production_run") > 0, "Passive production did not run.");
            require(count(paths, "treasury_transaction") > 0, "Production treasury entries are missing.");

            UUID vesselId = UUID.fromString("99000000-0000-0000-0000-000000000010");
            UUID definitionId = UUID.fromString("99000000-0000-0000-0000-000000000011");
            UUID start = location(paths, "station-a");
            UUID destination = location(paths, "route-a");
            installPlayerVessel(paths, worldId, definitionId, vesselId);
            var enrolled = PlayerVesselTransitTransaction.enroll(paths, vesselId, start, "logistics-test");
            require(enrolled.status().equals("DOCKED"), "Player vessel enrollment failed.");
            var planned = PlayerVesselTransitTransaction.planRoute(
                    paths, vesselId, destination, MissionType.FAUNA_CLEARING, "logistics-test");
            require(planned.status().equals("IN_TRANSIT") && planned.destinationLocationId().equals(destination),
                    "Player route planning failed.");

            PlayerVesselTransitTransaction.TransitResult last = null;
            for (int attempt = 0; attempt < 40; attempt++) {
                last = PlayerVesselTransitTransaction.resolveNextChallenge(paths, vesselId, "logistics-test");
                if (last.state().status().equals("ARRIVED") || last.state().status().equals("DISABLED")
                        || last.state().status().equals("LOST")) break;
            }
            require(last != null, "Player transit did not resolve any challenge.");
            require(count(paths, "player_transit_encounter") > 0, "Player encounter persistence failed.");
            require(count(paths, "player_voyage_log") >= 3, "Player voyage history is incomplete.");
            require(schemaVersion(paths) == 6, "Logistics fixture was not stored under schema 006.");
        } finally {
            try (var stream = Files.walk(root)) {
                for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
            }
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
                definition.setInt(8, 3);
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
                "player_transit_encounter", "player_voyage_log").contains(table)) {
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
        System.out.println("Barotrauma station logistics and player transit contracts passed.");
    }
}
