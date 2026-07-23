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
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.Duration;
import java.util.Comparator;
import java.util.UUID;

/** Focused contract for imported station civilization and aggregate population seed ordering. */
public final class StationPopulationSeedVerification {
    private StationPopulationSeedVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        Path root = Files.createTempDirectory("barotrauma-station-population-seed-");
        try {
            WorldPaths paths = WorldStorageContracts.createWorld(root, "Population Seed Europa",
                    UUID.fromString("9b000000-0000-0000-0000-000000000001"));
            WorldDocument document = WebSuiteV22WorldDocument.inspect(
                    fixture().getBytes(StandardCharsets.UTF_8), "population-seed-world.json");
            ImportPlan plan;
            try (SqliteWorldStore store = SqliteWorldStore.open(paths)) {
                plan = store.inspectAndPlan(document.inspection());
            }
            WebWorldV22ImportTransaction.commit(paths, new WebWorldV22ImportTransaction.ImportRequest(
                    plan.artifactId(), plan.artifact().artifactIdentity().digest(), "population-seed-test", document));

            SimulationCheckpointStore.RecoveryState recovery = SimulationCheckpointStore.load(
                    paths, Duration.ofMinutes(1));
            try (SimulationCommandExecutor executor = new SimulationCommandExecutor(
                    DeterministicSimulationClock.restore(recovery.snapshot()),
                    "population-seed-writer", recovery.lastExecutionSequence())) {
                var enabled = executor.submit(new SimulationCommandExecutor.Enable(), "population-seed-test").join();
                SimulationCheckpointStore.persist(paths, enabled, "Enable population seed contract world");
                var receipt = executor.submit(new SimulationCommandExecutor.Step(1), "population-seed-test").join();
                PassiveWorldTickTransaction.commit(paths, receipt);
            }

            try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
                 Statement statement = connection.createStatement();
                 ResultSet result = statement.executeQuery(
                         "SELECT ws.source_station_id,p.baseline_kind,p.baseline_resident_count,p.resident_count,"
                                 + "p.baseline_workforce_count,p.workforce_count,c.population_index,c.frontier_state,"
                                 + "s.status,s.integrity,s.threat FROM world_station ws "
                                 + "JOIN station_population_state p ON p.station_id=ws.station_id "
                                 + "JOIN station_civilization_state c ON c.station_id=ws.station_id "
                                 + "JOIN station_simulation_state s ON s.station_id=ws.station_id "
                                 + "WHERE ws.source_station_id='station-a'")) {
                if (!result.next()) throw new IllegalStateException(
                        "Imported station population seed row is missing after the first passive tick.");
                String state = "source=" + result.getString("source_station_id")
                        + ", baselineKind=" + result.getString("baseline_kind")
                        + ", baselineResidents=" + result.getInt("baseline_resident_count")
                        + ", residents=" + result.getInt("resident_count")
                        + ", baselineWorkforce=" + result.getInt("baseline_workforce_count")
                        + ", workforce=" + result.getInt("workforce_count")
                        + ", populationIndex=" + result.getInt("population_index")
                        + ", frontier=" + result.getString("frontier_state")
                        + ", stationStatus=" + result.getString("status")
                        + ", integrity=" + result.getInt("integrity")
                        + ", threat=" + result.getInt("threat");
                require(result.getString("baseline_kind").equals("IMPORTED_ESTIMATE")
                                && result.getInt("baseline_resident_count") > 0
                                && result.getInt("resident_count") > 0
                                && result.getInt("baseline_workforce_count") > 0
                                && result.getInt("workforce_count") > 0
                                && result.getInt("workforce_count") <= result.getInt("resident_count"),
                        "Imported station population seed is invalid: " + state);
            }
        } finally {
            try (var stream = Files.walk(root)) {
                for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
            }
        }
    }

    private static String fixture() {
        return """
                {"version":22,"exportedAt":"2026-07-18T12:00:00Z","masterWorldId":"POPULATION-SEED-WORLD",
                "worldEconomyVersion":"1.0.0","worldStateSchemaVersion":"2.2.0","state":{
                "world":{"canonicalTime":"2175-01-01T00:00:00Z","realEpoch":"2026-06-20T08:00:00Z",
                "map":{"rings":48,"shellRadius":7008,"nodes":[
                {"id":"station-a","name":"Frontier Station","ring":42,"level":4,"type":"station","x":20,"y":30},
                {"id":"station-b","name":"Supply Station","ring":47,"level":1,"type":"station","x":80,"y":40},
                {"id":"station-c","name":"Generated Station","ring":45,"level":2,"type":"station","x":140,"y":55},
                {"id":"deep-a","name":"Fauna Trench","ring":18,"level":9,"type":"location","x":260,"y":180}]}},
                "worldEconomy":{"vessels":{},"stationEconomies":{"station-a":{},"station-b":{},"station-c":{}},
                "simulation":{"tickSequence":30,"lastSimulatedAt":"2175-01-01T00:00:00Z"}},
                "submarine":{"name":"Observer","model":"Barsuk","crewRoster":[]}}}
                """;
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Imported station population seed contract passed.");
    }
}
