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

/** End-to-end schema-011 contract for fleet recovery and natural world activity. */
public final class FleetRecoveryAndNaturalWorldVerification {
    private FleetRecoveryAndNaturalWorldVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        Path root = Files.createTempDirectory("barotrauma-natural-world-");
        try {
            UUID worldId = UUID.fromString("9a000000-0000-0000-0000-000000000001");
            WorldPaths paths = WorldStorageContracts.createWorld(root, "Natural Europa", worldId);
            WorldDocument document = WebSuiteV22WorldDocument.inspect(
                    fixture().getBytes(StandardCharsets.UTF_8), "natural-world.json");
            ImportPlan plan;
            try (SqliteWorldStore store = SqliteWorldStore.open(paths)) {
                plan = store.inspectAndPlan(document.inspection());
            }
            WebWorldV22ImportTransaction.commit(paths, new WebWorldV22ImportTransaction.ImportRequest(
                    plan.artifactId(), plan.artifact().artifactIdentity().digest(), "natural-world-test", document));

            SimulationCheckpointStore.RecoveryState recovery = SimulationCheckpointStore.load(paths, Duration.ofMinutes(1));
            try (SimulationCommandExecutor executor = new SimulationCommandExecutor(
                    DeterministicSimulationClock.restore(recovery.snapshot()),
                    "natural-world-contract-writer", recovery.lastExecutionSequence())) {
                var enabled = executor.submit(new SimulationCommandExecutor.Enable(), "natural-world-test").join();
                SimulationCheckpointStore.persist(paths, enabled, "Enable natural-world contract");
                step(paths, executor);

                require(count(paths, "location_ecology_state") == 6,
                        "Natural ecology state did not initialize for every location.");
                require(count(paths, "location_geology_state") == 6,
                        "Natural geology state did not initialize for every location.");

                UUID locationId = location(paths, "wild-bloom");
                primeNaturalActivity(paths, locationId);
                prepareResponder(paths);
                UUID distressed = disableVessel(paths);
                require(count(paths, "fleet_response_operation") == 1,
                        "A disabled NPC vessel did not create a fleet response operation.");
                require("ACTIVE".equals(operationStatus(paths)) && operationResponder(paths) != null,
                        "A qualified docked patrol was not immediately assigned to the distress request.");

                raiseMaterialRequirementAndStarve(paths);
                int stalledProgress = operationProgress(paths);
                step(paths, executor);
                require(operationProgress(paths) == stalledProgress,
                        "Fleet recovery advanced without the required station materials.");

                replenishRecoveryMaterials(paths);
                for (int cycle = 0; cycle < 30 && !"COMPLETE".equals(operationStatus(paths)); cycle++) {
                    step(paths, executor);
                }
                require("COMPLETE".equals(operationStatus(paths)),
                        "The passive fleet response did not complete after resupply.");
                require("DOCKED".equals(vesselStatus(paths, distressed)) && vesselHull(paths, distressed) >= 35,
                        "The disabled vessel was not recovered to a docked, serviceable state.");
                require(count(paths, "fleet_response_log") >= 3,
                        "Fleet response request, assignment, progress, or completion evidence is incomplete.");

                primeNaturalActivity(paths, locationId);
                int ecologyBefore = ecologyValue(paths, locationId, "primary_producers");
                int geologyBefore = geologyValue(paths, locationId, "mineral_exposure");
                for (int cycle = 0; cycle < 35; cycle++) step(paths, executor);

                require(ecologyValue(paths, locationId, "primary_producers") != ecologyBefore
                                || count(paths, "natural_world_event") > 0,
                        "Natural ecology did not advance with Passive Mode.");
                require(geologyValue(paths, locationId, "mineral_exposure") >= geologyBefore,
                        "Geological activity unexpectedly erased exposed resources.");
                require(count(paths, "natural_resource_site") > 0,
                        "Geological or biological activity did not expose any resource sites.");
                require(eventTypeCount(paths, "ALGAL_BLOOM") > 0,
                        "A primed algal bloom did not produce ecological evidence.");
                require(eventTypeCount(paths, "PREDATOR_EXPANSION") > 0,
                        "Predators did not expand their feeding grounds behind biological growth.");
                require(eventTypeCount(paths, "VENT_ERUPTION") + eventTypeCount(paths, "ROCKFALL") > 0,
                        "Primed geological activity did not produce an environmental event.");
                require(resourceTypeCount(paths, "BIOACTIVE_ACCUMULATOR") > 0,
                        "Natural bioactivity did not produce a renewable accumulator site.");
                require(schemaVersion(paths) == WorldStorageContracts.DATABASE_SCHEMA_VERSION,
                        "Natural-world fixture did not use the current schema.");
            }
        } finally {
            try (var stream = Files.walk(root)) {
                for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
            }
        }
    }

    private static void step(WorldPaths paths, SimulationCommandExecutor executor) throws Exception {
        var receipt = executor.submit(new SimulationCommandExecutor.Step(1), "natural-world-test").join();
        PassiveWorldTickTransaction.commit(paths, receipt);
    }

    private static void prepareResponder(WorldPaths paths) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("UPDATE world_mission SET status='CANCELLED',assigned_npc_vessel_id=NULL "
                    + "WHERE assigned_npc_vessel_id=(SELECT npc_vessel_id FROM npc_vessel WHERE role='PATROL' LIMIT 1) "
                    + "AND status IN ('ASSIGNED','ACTIVE')");
            statement.executeUpdate("UPDATE npc_vessel SET status='DOCKED',mission_id=NULL,destination_location_id=NULL,"
                    + "route_progress=0,route_ticks_required=1 WHERE role='PATROL'");
        }
    }

    private static UUID disableVessel(WorldPaths paths) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            String vesselId;
            try (Statement statement = connection.createStatement();
                 ResultSet result = statement.executeQuery(
                         "SELECT npc_vessel_id FROM npc_vessel WHERE role<>'PATROL' ORDER BY npc_vessel_id LIMIT 1")) {
                if (!result.next()) throw new IllegalStateException("Fixture has no NPC vessel available to disable.");
                vesselId = result.getString(1);
            }
            try (PreparedStatement update = connection.prepareStatement(
                    "UPDATE npc_vessel SET hull=15,supplies=10,status='DISABLED',last_tick=last_tick+1 WHERE npc_vessel_id=?")) {
                update.setString(1, vesselId);
                update.executeUpdate();
            }
            return UUID.fromString(vesselId);
        }
    }

    private static void raiseMaterialRequirementAndStarve(WorldPaths paths) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("UPDATE fleet_response_operation SET spare_parts_required=50,fuel_required=50,"
                    + "ammunition_required=50,medical_required=50");
            statement.executeUpdate("UPDATE station_inventory SET quantity=0 WHERE station_id="
                    + "(SELECT origin_station_id FROM fleet_response_operation LIMIT 1) "
                    + "AND item_id IN ('item-steel','item-fuel','item-ammunition','item-medical')");
        }
    }

    private static void replenishRecoveryMaterials(WorldPaths paths) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("UPDATE station_inventory SET quantity=200 WHERE station_id="
                    + "(SELECT origin_station_id FROM fleet_response_operation LIMIT 1) "
                    + "AND item_id IN ('item-steel','item-fuel','item-ammunition','item-medical')");
        }
    }

    private static void primeNaturalActivity(WorldPaths paths, UUID locationId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            try (PreparedStatement ecology = connection.prepareStatement(
                    "UPDATE location_ecology_state SET primary_producers=85,algal_bloom=70,herbivore_biomass=70,"
                            + "predator_biomass=60,scavenger_biomass=50,bioaccumulator_mass=70,nutrient_load=85,"
                            + "habitat_integrity=80,migration_pressure=55 WHERE location_id=?")) {
                ecology.setString(1, locationId.toString());
                ecology.executeUpdate();
            }
            try (PreparedStatement geology = connection.prepareStatement(
                    "UPDATE location_geology_state SET tectonic_stress=85,hydrothermal_activity=75,"
                            + "mineral_exposure=65,cave_instability=75,sediment_flux=70 WHERE location_id=?")) {
                geology.setString(1, locationId.toString());
                geology.executeUpdate();
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

    private static String operationStatus(WorldPaths paths) throws Exception {
        return text(paths, "SELECT status FROM fleet_response_operation ORDER BY created_tick LIMIT 1");
    }

    private static int operationProgress(WorldPaths paths) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery(
                     "SELECT progress FROM fleet_response_operation ORDER BY created_tick LIMIT 1")) {
            if (!result.next()) throw new IllegalStateException("Fleet response operation disappeared.");
            return result.getInt(1);
        }
    }

    private static String operationResponder(WorldPaths paths) throws Exception {
        return text(paths, "SELECT assigned_npc_vessel_id FROM fleet_response_operation ORDER BY created_tick LIMIT 1");
    }

    private static String vesselStatus(WorldPaths paths, UUID vesselId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT status FROM npc_vessel WHERE npc_vessel_id=?")) {
            statement.setString(1, vesselId.toString());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Recovered vessel disappeared.");
                return result.getString(1);
            }
        }
    }

    private static int vesselHull(WorldPaths paths, UUID vesselId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT hull FROM npc_vessel WHERE npc_vessel_id=?")) {
            statement.setString(1, vesselId.toString());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Recovered vessel disappeared.");
                return result.getInt(1);
            }
        }
    }

    private static int ecologyValue(WorldPaths paths, UUID locationId, String column) throws Exception {
        if (!java.util.Set.of("primary_producers", "algal_bloom", "herbivore_biomass", "predator_biomass",
                "bioaccumulator_mass").contains(column)) throw new IllegalArgumentException("Unsupported ecology column.");
        return keyedInt(paths, "SELECT " + column + " FROM location_ecology_state WHERE location_id=?", locationId);
    }

    private static int geologyValue(WorldPaths paths, UUID locationId, String column) throws Exception {
        if (!java.util.Set.of("tectonic_stress", "hydrothermal_activity", "mineral_exposure",
                "cave_instability").contains(column)) throw new IllegalArgumentException("Unsupported geology column.");
        return keyedInt(paths, "SELECT " + column + " FROM location_geology_state WHERE location_id=?", locationId);
    }

    private static int keyedInt(WorldPaths paths, String sql, UUID key) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, key.toString());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Natural-world state row is missing.");
                return result.getInt(1);
            }
        }
    }

    private static long eventTypeCount(WorldPaths paths, String type) throws Exception {
        return keyedCount(paths, "SELECT COUNT(*) FROM natural_world_event WHERE event_type=?", type);
    }

    private static long resourceTypeCount(WorldPaths paths, String type) throws Exception {
        return keyedCount(paths, "SELECT COUNT(*) FROM natural_resource_site WHERE resource_type=?", type);
    }

    private static long keyedCount(WorldPaths paths, String sql, String key) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, key);
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static long count(WorldPaths paths, String table) throws Exception {
        if (!java.util.Set.of("location_ecology_state", "location_geology_state", "natural_resource_site",
                "natural_world_event", "fleet_response_operation", "fleet_response_log").contains(table)) {
            throw new IllegalArgumentException("Unsupported natural-world verification table.");
        }
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COUNT(*) FROM " + table)) {
            return result.next() ? result.getLong(1) : 0;
        }
    }

    private static String text(WorldPaths paths, String sql) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            return result.next() ? result.getString(1) : null;
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
                {"version":22,"exportedAt":"2026-07-18T12:00:00Z","masterWorldId":"NATURAL-WORLD",
                "worldEconomyVersion":"1.0.0","worldStateSchemaVersion":"2.2.0","state":{
                "world":{"canonicalTime":"2175-01-01T00:00:00Z","realEpoch":"2026-06-20T08:00:00Z",
                "map":{"rings":48,"shellRadius":7008,"nodes":[
                {"id":"station-a","name":"Alpha Station","ring":48,"level":1,"type":"station","x":10,"y":20},
                {"id":"station-b","name":"Beta Station","ring":42,"level":3,"type":"station","x":80,"y":40},
                {"id":"station-c","name":"Gamma Station","ring":34,"level":5,"type":"station","x":150,"y":90},
                {"id":"station-d","name":"Delta Station","ring":26,"level":7,"type":"station","x":220,"y":120},
                {"id":"wild-bloom","name":"Blooming Chasm","ring":20,"level":8,"type":"location","x":280,"y":170},
                {"id":"vent-field","name":"Fractured Vent Field","ring":12,"level":9,"type":"location","x":340,"y":230}]}},
                "worldEconomy":{"vessels":{},"stationEconomies":{"station-a":{},"station-b":{},
                "station-c":{},"station-d":{}},"simulation":{"tickSequence":30,
                "lastSimulatedAt":"2175-01-01T00:00:00Z"}},
                "submarine":{"name":"Observer","model":"Barsuk","crewRoster":[]}}}
                """;
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Barotrauma fleet recovery and natural-world contracts passed.");
    }
}
