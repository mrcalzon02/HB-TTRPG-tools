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
import java.util.Objects;
import java.util.UUID;

/** Creates a fresh schema-current Europa world through canonical import and passive writer authorities. */
public final class DefaultWorldGenerator {
    public static final String TEMPLATE_ID = "europa-operations-default-033";
    public static final int EXPECTED_LOCATIONS = 24;
    public static final int EXPECTED_STATIONS = 12;

    private DefaultWorldGenerator() { }

    public static GeneratedWorld create(Path worldRoot, String displayName) throws Exception {
        Objects.requireNonNull(worldRoot, "worldRoot");
        String name = requireName(displayName);
        UUID worldId = UUID.randomUUID();
        WorldPaths paths = WorldStorageContracts.createWorld(worldRoot, name, worldId);
        boolean complete = false;
        try {
            byte[] source = DefaultWorldTemplate.document(name).getBytes(StandardCharsets.UTF_8);
            WorldDocument document = WebSuiteV22WorldDocument.inspect(source, TEMPLATE_ID + ".json");
            ImportPlan plan;
            try (SqliteWorldStore store = SqliteWorldStore.open(paths)) {
                plan = store.inspectAndPlan(document.inspection());
            }
            var imported = WebWorldV22ImportTransaction.commit(paths,
                    new WebWorldV22ImportTransaction.ImportRequest(
                            plan.artifactId(), plan.artifact().artifactIdentity().digest(),
                            "default-world-generator", document));
            OrganizationFactionBootstrap.seed(paths);
            initializeCurrentSystems(paths);
            GeneratedWorld result = inspect(paths, imported.worldId());
            complete = true;
            return result;
        } finally {
            if (!complete) deleteTree(paths.root());
        }
    }

    private static void initializeCurrentSystems(WorldPaths paths) throws Exception {
        SimulationCheckpointStore.RecoveryState recovery =
                SimulationCheckpointStore.load(paths, Duration.ofMinutes(1));
        try (SimulationCommandExecutor executor = new SimulationCommandExecutor(
                DeterministicSimulationClock.restore(recovery.snapshot()),
                "default-world-generator", recovery.lastExecutionSequence())) {
            var enabled = executor.submit(new SimulationCommandExecutor.Enable(),
                    "default-world-generator").join();
            SimulationCheckpointStore.persist(paths, enabled,
                    "Enable generated world for current-system initialization");

            var stepped = executor.submit(new SimulationCommandExecutor.Step(1),
                    "default-world-generator").join();
            PassiveWorldTickTransaction.commit(paths, stepped);

            var disabled = executor.submit(new SimulationCommandExecutor.Disable(),
                    "default-world-generator").join();
            SimulationCheckpointStore.persist(paths, disabled,
                    "Pause generated world after current-system initialization");
        }
    }

    private static GeneratedWorld inspect(WorldPaths paths, UUID worldId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement()) {
            int schema = scalar(statement, "SELECT COALESCE(MAX(version),0) FROM schema_migration");
            int locations = scalar(statement, "SELECT COUNT(*) FROM world_location");
            int stations = scalar(statement, "SELECT COUNT(*) FROM world_station");
            int stationStates = scalar(statement, "SELECT COUNT(*) FROM station_simulation_state");
            int populations = scalar(statement, "SELECT COUNT(*) FROM npc_population_state");
            int aggregatePopulations = scalar(statement, "SELECT COUNT(*) FROM station_population_state");
            int ecology = scalar(statement, "SELECT COUNT(*) FROM location_ecology_state");
            int geology = scalar(statement, "SELECT COUNT(*) FROM location_geology_state");
            int organizations = scalar(statement, "SELECT COUNT(*) FROM world_organization");
            int sovereignFactions = scalar(statement,
                    "SELECT COUNT(*) FROM world_organization WHERE organization_type='MAJOR_FACTION'");
            int lockedHeadquarters = scalar(statement,
                    "SELECT COUNT(*) FROM organization_headquarters WHERE sovereignty_locked=1");
            long tick = longScalar(statement, "SELECT COALESCE(current_tick_sequence,imported_tick_sequence,0) "
                    + "FROM world_simulation_metadata LIMIT 1");
            int enabled = scalar(statement,
                    "SELECT simulation_enabled FROM world_simulation_metadata LIMIT 1");
            String scheduler = text(statement,
                    "SELECT scheduler_state FROM world_simulation_metadata LIMIT 1");

            if (schema != WorldStorageContracts.DATABASE_SCHEMA_VERSION
                    || locations != EXPECTED_LOCATIONS
                    || stations != EXPECTED_STATIONS
                    || stationStates != stations
                    || populations != stations
                    || aggregatePopulations != stations
                    || ecology != locations
                    || geology != locations
                    || organizations < 50
                    || sovereignFactions < 2
                    || lockedHeadquarters != sovereignFactions
                    || tick < 1
                    || enabled != 0
                    || !"PAUSED".equals(scheduler)) {
                throw new IllegalStateException(
                        "Generated default world did not reach the current paused-system and organization baseline.");
            }
            return new GeneratedWorld(paths, worldId, schema, locations, stations, stationStates,
                    populations, aggregatePopulations, ecology, geology, organizations, sovereignFactions,
                    lockedHeadquarters, tick, scheduler);
        }
    }

    private static int scalar(Statement statement, String sql) throws Exception {
        try (ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new IllegalStateException("Expected generated-world scalar row.");
            return result.getInt(1);
        }
    }

    private static long longScalar(Statement statement, String sql) throws Exception {
        try (ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new IllegalStateException("Expected generated-world long scalar row.");
            return result.getLong(1);
        }
    }

    private static String text(Statement statement, String sql) throws Exception {
        try (ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new IllegalStateException("Expected generated-world text row.");
            return result.getString(1);
        }
    }

    private static String requireName(String value) {
        Objects.requireNonNull(value, "displayName");
        String trimmed = value.trim();
        if (trimmed.isEmpty() || trimmed.length() > 120) {
            throw new IllegalArgumentException("World display name is blank or too long.");
        }
        return trimmed;
    }

    private static void deleteTree(Path root) throws Exception {
        if (!Files.exists(root)) return;
        try (var stream = Files.walk(root)) {
            for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) {
                Files.deleteIfExists(path);
            }
        }
    }

    public record GeneratedWorld(
            WorldPaths paths,
            UUID worldId,
            int schemaVersion,
            int locationCount,
            int stationCount,
            int stationStateCount,
            int detailedPopulationCount,
            int aggregatePopulationCount,
            int ecologyLocationCount,
            int geologyLocationCount,
            int organizationCount,
            int sovereignFactionCount,
            int lockedHeadquartersCount,
            long initializedTick,
            String schedulerState) { }
}
