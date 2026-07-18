package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.compatibility.web.WebSuiteV22WorldDocument;
import io.github.mrcalzon02.barotrauma.compatibility.web.WebSuiteV22WorldDocument.WorldDocument;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.ImportPlan;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;
import io.github.mrcalzon02.barotrauma.simulation.DeterministicSimulationClock;
import io.github.mrcalzon02.barotrauma.simulation.PassiveWorldSimulationService;
import io.github.mrcalzon02.barotrauma.simulation.SimulationCommandExecutor;
import io.github.mrcalzon02.barotrauma.simulation.TransitResolutionEngine;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.Duration;
import java.util.Comparator;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/** End-to-end contract for passive station, mission, NPC-vessel, research, and encounter workloads. */
public final class PassiveWorldSimulationVerification {
    private PassiveWorldSimulationVerification() { }

    public static void verifyContract() throws Exception {
        TransitResolutionEngine.verifyContract();
        Class.forName("org.sqlite.JDBC");
        Path root = Files.createTempDirectory("barotrauma-passive-world-");
        try {
            WorldPaths paths = WorldStorageContracts.createWorld(root, "Passive Europa",
                    UUID.fromString("98000000-0000-0000-0000-000000000001"));
            String fixture = """
                    {"version":22,"exportedAt":"2026-07-17T20:00:00Z","masterWorldId":"PASSIVE-WORLD",
                    "worldEconomyVersion":"1.0.0","worldStateSchemaVersion":"2.2.0","state":{
                    "world":{"canonicalTime":"2175-01-01T00:00:00Z","realEpoch":"2026-06-20T08:00:00Z",
                    "map":{"rings":48,"shellRadius":7008,"nodes":[
                    {"id":"station-a","name":"Alpha Station","ring":48,"level":1,"type":"station","x":10,"y":20},
                    {"id":"station-b","name":"Beta Station","ring":42,"level":3,"type":"station","x":80,"y":40},
                    {"id":"station-c","name":"Gamma Station","ring":34,"level":5,"type":"station","x":150,"y":90},
                    {"id":"station-d","name":"Delta Station","ring":26,"level":7,"type":"station","x":220,"y":120},
                    {"id":"route-a","name":"Abyssal Route","ring":18,"level":8,"type":"location","x":300,"y":180}]}},
                    "worldEconomy":{"vessels":{},"stationEconomies":{"station-a":{},"station-b":{},
                    "station-c":{},"station-d":{}},"simulation":{"tickSequence":12,
                    "lastSimulatedAt":"2175-01-01T00:00:00Z"}},
                    "submarine":{"name":"Observer","model":"Barsuk","crewRoster":[]}}}
                    """;
            WorldDocument document = WebSuiteV22WorldDocument.inspect(
                    fixture.getBytes(StandardCharsets.UTF_8), "passive-world.json");
            ImportPlan plan;
            try (SqliteWorldStore store = SqliteWorldStore.open(paths)) {
                plan = store.inspectAndPlan(document.inspection());
            }
            WebWorldV22ImportTransaction.commit(paths, new WebWorldV22ImportTransaction.ImportRequest(
                    plan.artifactId(), plan.artifact().artifactIdentity().digest(), "passive-test", document));

            SimulationCheckpointStore.RecoveryState recovery = SimulationCheckpointStore.load(
                    paths, Duration.ofMinutes(1));
            try (SimulationCommandExecutor executor = new SimulationCommandExecutor(
                    DeterministicSimulationClock.restore(recovery.snapshot()),
                    "passive-contract-writer", recovery.lastExecutionSequence())) {
                var enabled = executor.submit(new SimulationCommandExecutor.Enable(), "passive-test").join();
                SimulationCheckpointStore.persist(paths, enabled, "Enable passive contract world");
                var first = executor.submit(new SimulationCommandExecutor.Step(1), "passive-test").join();
                PassiveWorldTickTransaction.TickResult firstResult = PassiveWorldTickTransaction.commit(paths, first);
                require(firstResult.stationUpdates() == 4, "Passive station economy did not process every station.");
                require(firstResult.missionsCreated() > 0 && firstResult.missionsAssigned() > 0,
                        "Passive mission creation or assignment failed.");
                require(count(paths, "station_simulation_state") == 4,
                        "Passive station state initialization failed.");
                require(count(paths, "npc_vessel") >= 4, "Passive NPC vessel initialization failed.");
                require(count(paths, "npc_voyage_log") > 0, "Passive voyage assignment/departure logs are missing.");

                var second = executor.submit(new SimulationCommandExecutor.Step(1), "passive-test").join();
                PassiveWorldTickTransaction.TickResult secondResult = PassiveWorldTickTransaction.commit(paths, second);
                require(secondResult.encountersResolved() > 0,
                        "Second passive cycle did not resolve NPC transit hazards.");
                require(count(paths, "world_encounter") == secondResult.encountersResolved(),
                        "Persisted encounter count does not match the passive result.");
                require(count(paths, "world_mission") > 0 && count(paths, "station_research_project") == 4,
                        "Mission or research workload persistence failed.");
                require(schemaVersion(paths) == 5, "Passive fixture was not stored under schema 005.");
            }

            long tickBeforeScheduler = SimulationCheckpointStore.load(paths, Duration.ofMinutes(1))
                    .snapshot().tickSequence();
            CountDownLatch automaticCycle = new CountDownLatch(1);
            PassiveWorldSimulationService service = PassiveWorldSimulationService.enable(
                    paths, Duration.ofSeconds(1), 1);
            try (AutoCloseable ignored = service.addListener(status -> {
                if (status.lastResult() != null && status.lastResult().tickSequence() > tickBeforeScheduler) {
                    automaticCycle.countDown();
                }
            }, true)) {
                require(automaticCycle.await(10, TimeUnit.SECONDS),
                        "Automatic passive scheduler did not commit a timed world cycle.");
                require(service.status().fault() == null && service.status().lastResult() != null,
                        "Automatic passive scheduler faulted during its contract cycle.");
            } finally {
                PassiveWorldSimulationService.disable(paths);
            }
            require(!PassiveWorldSimulationService.configuration(paths).enabled(),
                    "Disabling Passive Mode did not persist the disabled configuration.");
            require(SimulationCheckpointStore.load(paths, Duration.ofMinutes(1)).snapshot().tickSequence()
                            > tickBeforeScheduler,
                    "Automatic passive cycle did not advance the durable world clock.");
        } finally {
            try (var stream = Files.walk(root)) {
                for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
            }
        }
    }

    private static long count(WorldPaths paths, String table) throws Exception {
        if (!java.util.Set.of("station_simulation_state", "npc_vessel", "npc_voyage_log",
                "world_encounter", "world_mission", "station_research_project").contains(table)) {
            throw new IllegalArgumentException("Unsupported passive verification table.");
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

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Barotrauma passive world simulation and automatic scheduler contracts passed.");
    }
}
