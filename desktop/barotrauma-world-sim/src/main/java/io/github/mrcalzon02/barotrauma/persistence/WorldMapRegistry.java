package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.compatibility.web.WebSuiteV22WorldDocument;
import io.github.mrcalzon02.barotrauma.compatibility.web.WebSuiteV22WorldDocument.WorldDocument;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.ImportPlan;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/** Read-only query model for normalized master-world, location, station, and scheduler evidence. */
public final class WorldMapRegistry {

    private WorldMapRegistry() { }

    public static RegistrySnapshot load(WorldPaths paths) throws SQLException {
        Objects.requireNonNull(paths, "paths");
        if (!Files.isRegularFile(paths.database())) {
            throw new SQLException("The selected desktop world has not initialized its database yet.");
        }
        requireDriver();
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configureReadOnly(connection);
            verifySchema(connection);
            WorldSummary summary = readSummary(connection);
            return new RegistrySnapshot(summary, readLocations(connection), readStations(connection),
                    readComponentVersions(connection), readStateFamilies(connection));
        }
    }

    private static WorldSummary readSummary(Connection connection) throws SQLException {
        String sql = "SELECT wm.world_id, wm.display_name, wm.master_world_id, wm.canonical_time, "
                + "wm.source_suite_version, wm.source_exported_at, wi.import_id, wi.imported_at, wi.rings, "
                + "wi.location_count, wi.station_count, wi.shell_radius, wi.active_submarine_name, "
                + "wi.active_submarine_model, wi.crew_records, wi.economy_vessels, wi.economy_stations, "
                + "sm.real_epoch, sm.last_simulated_at, sm.imported_tick_sequence, sm.simulation_enabled, "
                + "sm.scheduler_state FROM world_metadata wm "
                + "LEFT JOIN world_import wi ON wi.world_id = wm.world_id "
                + "LEFT JOIN world_simulation_metadata sm ON sm.world_id = wm.world_id LIMIT 1";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new SQLException("Desktop world metadata row is missing.");
            String importId = result.getString("import_id");
            return new WorldSummary(
                    UUID.fromString(result.getString("world_id")),
                    result.getString("display_name"),
                    importId != null,
                    importId == null ? null : UUID.fromString(importId),
                    result.getString("master_world_id"),
                    nullableInteger(result, "source_suite_version"),
                    instant(result.getString("source_exported_at")),
                    instant(result.getString("imported_at")),
                    nullableInteger(result, "rings"),
                    nullableInteger(result, "location_count"),
                    nullableInteger(result, "station_count"),
                    nullableDouble(result, "shell_radius"),
                    result.getString("active_submarine_name"),
                    result.getString("active_submarine_model"),
                    nullableInteger(result, "crew_records"),
                    nullableInteger(result, "economy_vessels"),
                    nullableInteger(result, "economy_stations"),
                    instant(result.getString("canonical_time")),
                    instant(result.getString("real_epoch")),
                    instant(result.getString("last_simulated_at")),
                    nullableLong(result, "imported_tick_sequence"),
                    result.getObject("simulation_enabled") != null && result.getInt("simulation_enabled") == 1,
                    result.getString("scheduler_state")
            );
        }
    }

    private static List<LocationRow> readLocations(Connection connection) throws SQLException {
        List<LocationRow> rows = new ArrayList<>();
        String sql = "SELECT location_id, source_location_id, source_ordinal, display_name, location_type, "
                + "ring, location_level, map_x, map_y, biome, faction, is_station "
                + "FROM world_location ORDER BY ring DESC, source_ordinal ASC";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) {
                rows.add(new LocationRow(
                        UUID.fromString(result.getString("location_id")),
                        result.getString("source_location_id"),
                        result.getInt("source_ordinal"),
                        result.getString("display_name"),
                        result.getString("location_type"),
                        result.getInt("ring"),
                        result.getInt("location_level"),
                        nullableDouble(result, "map_x"),
                        nullableDouble(result, "map_y"),
                        result.getString("biome"),
                        result.getString("faction"),
                        result.getInt("is_station") == 1
                ));
            }
        }
        return List.copyOf(rows);
    }

    private static List<StationRow> readStations(Connection connection) throws SQLException {
        List<StationRow> rows = new ArrayList<>();
        String sql = "SELECT ws.station_id, ws.source_station_id, ws.display_name, ws.station_type, "
                + "ws.faction, ws.has_economy, wl.location_id, wl.source_location_id, wl.ring, "
                + "wl.location_level FROM world_station ws "
                + "JOIN world_location wl ON wl.location_id = ws.location_id "
                + "ORDER BY wl.ring DESC, ws.display_name ASC";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) {
                rows.add(new StationRow(
                        UUID.fromString(result.getString("station_id")),
                        result.getString("source_station_id"),
                        UUID.fromString(result.getString("location_id")),
                        result.getString("source_location_id"),
                        result.getString("display_name"),
                        result.getString("station_type"),
                        result.getString("faction"),
                        result.getInt("ring"),
                        result.getInt("location_level"),
                        result.getInt("has_economy") == 1
                ));
            }
        }
        return List.copyOf(rows);
    }

    private static List<ComponentVersionRow> readComponentVersions(Connection connection) throws SQLException {
        List<ComponentVersionRow> rows = new ArrayList<>();
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery(
                     "SELECT component_key, component_version FROM world_component_version ORDER BY component_key")) {
            while (result.next()) rows.add(new ComponentVersionRow(result.getString(1), result.getString(2)));
        }
        return List.copyOf(rows);
    }

    private static List<String> readStateFamilies(Connection connection) throws SQLException {
        List<String> rows = new ArrayList<>();
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery(
                     "SELECT family_key FROM world_state_family ORDER BY family_key")) {
            while (result.next()) rows.add(result.getString(1));
        }
        return List.copyOf(rows);
    }

    private static void configureReadOnly(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys = ON");
            statement.execute("PRAGMA busy_timeout = 5000");
            statement.execute("PRAGMA query_only = ON");
        }
    }

    private static void verifySchema(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COALESCE(MAX(version), 0) FROM schema_migration")) {
            int version = result.next() ? result.getInt(1) : 0;
            if (version != WorldStorageContracts.DATABASE_SCHEMA_VERSION) {
                throw new SQLException("World registry requires database schema "
                        + WorldStorageContracts.DATABASE_SCHEMA_VERSION + "; found " + version + ".");
            }
        }
    }

    private static Integer nullableInteger(ResultSet result, String column) throws SQLException {
        Object value = result.getObject(column);
        return value == null ? null : result.getInt(column);
    }

    private static Long nullableLong(ResultSet result, String column) throws SQLException {
        Object value = result.getObject(column);
        return value == null ? null : result.getLong(column);
    }

    private static Double nullableDouble(ResultSet result, String column) throws SQLException {
        Object value = result.getObject(column);
        return value == null ? null : result.getDouble(column);
    }

    private static Instant instant(String value) throws SQLException {
        if (value == null || value.isBlank()) return null;
        try { return Instant.parse(value); }
        catch (RuntimeException exception) { throw new SQLException("Stored timestamp is invalid: " + value, exception); }
    }

    private static void requireDriver() throws SQLException {
        try { Class.forName("org.sqlite.JDBC"); }
        catch (ClassNotFoundException exception) { throw new SQLException("SQLite JDBC driver is unavailable.", exception); }
    }

    public record RegistrySnapshot(
            WorldSummary summary,
            List<LocationRow> locations,
            List<StationRow> stations,
            List<ComponentVersionRow> componentVersions,
            List<String> stateFamilies
    ) {
        public RegistrySnapshot {
            Objects.requireNonNull(summary, "summary");
            locations = List.copyOf(locations);
            stations = List.copyOf(stations);
            componentVersions = List.copyOf(componentVersions);
            stateFamilies = List.copyOf(stateFamilies);
        }
    }

    public record WorldSummary(
            UUID worldId,
            String displayName,
            boolean imported,
            UUID importId,
            String masterWorldId,
            Integer suiteVersion,
            Instant sourceExportedAt,
            Instant importedAt,
            Integer rings,
            Integer declaredLocations,
            Integer declaredStations,
            Double shellRadius,
            String activeSubmarineName,
            String activeSubmarineModel,
            Integer crewRecords,
            Integer economyVessels,
            Integer economyStations,
            Instant canonicalTime,
            Instant realEpoch,
            Instant lastSimulatedAt,
            Long importedTickSequence,
            boolean simulationEnabled,
            String schedulerState
    ) { }

    public record LocationRow(
            UUID locationId,
            String sourceLocationId,
            int sourceOrdinal,
            String displayName,
            String locationType,
            int ring,
            int locationLevel,
            Double mapX,
            Double mapY,
            String biome,
            String faction,
            boolean station
    ) { }

    public record StationRow(
            UUID stationId,
            String sourceStationId,
            UUID locationId,
            String sourceLocationId,
            String displayName,
            String stationType,
            String faction,
            int ring,
            int locationLevel,
            boolean economyPresent
    ) { }

    public record ComponentVersionRow(String componentKey, String componentVersion) { }

    public static void verifyContract() throws Exception {
        WorldDatabaseMigrations.verifyContract();
        CampaignArchiveImportTransaction.verifyContract();
        WebSuiteV22WorldDocument.verifyContract();
        WebWorldV22ImportTransaction.verifyContract();

        Path root = Files.createTempDirectory("barotrauma-world-map-registry-");
        try {
            WorldPaths paths = WorldStorageContracts.createWorld(root, "Registry Europa",
                    UUID.fromString("94000000-0000-0000-0000-000000000001"));
            String fixture = """
                    {"version":22,"exportedAt":"2026-07-17T20:00:00Z","masterWorldId":"REGISTRY-WORLD",
                    "worldEconomyVersion":"1.0.0","worldStateSchemaVersion":"2.2.0","state":{
                    "world":{"canonicalTime":"2175-01-01T00:00:00Z","realEpoch":"2026-06-20T08:00:00Z",
                    "map":{"rings":48,"shellRadius":7008,"nodes":[
                    {"id":"station-a","name":"Alpha Station","ring":48,"level":1,"type":"station","x":10,"y":20},
                    {"id":"route-a","name":"Route Node","ring":47,"level":2,"type":"location","x":30,"y":40}]}},
                    "worldEconomy":{"vessels":{"player":{"kind":"player"}},"stationEconomies":{"station-a":{}},
                    "simulation":{"tickSequence":12,"lastSimulatedAt":"2175-01-02T00:00:00Z"}},
                    "submarine":{"name":"Test Boat","model":"Barsuk","crewRoster":[]}}}
                    """;
            WorldDocument document = WebSuiteV22WorldDocument.inspect(
                    fixture.getBytes(StandardCharsets.UTF_8), "registry-world.json");
            ImportPlan plan;
            try (SqliteWorldStore store = SqliteWorldStore.open(paths)) {
                plan = store.inspectAndPlan(document.inspection());
            }
            WebWorldV22ImportTransaction.commit(paths, new WebWorldV22ImportTransaction.ImportRequest(
                    plan.artifactId(), plan.artifact().artifactIdentity().digest(), "registry-test", document));
            RegistrySnapshot registry = load(paths);
            require(registry.summary().imported(), "Registry did not expose the imported master world.");
            require(registry.summary().masterWorldId().equals("REGISTRY-WORLD"), "Registry world identity failed.");
            require(registry.locations().size() == 2 && registry.stations().size() == 1,
                    "Registry location or station queries failed.");
            require(!registry.summary().simulationEnabled()
                            && "PAUSED".equals(registry.summary().schedulerState()),
                    "Registry reported an active imported scheduler.");
            require(registry.componentVersions().stream()
                            .anyMatch(row -> row.componentKey().equals("worldEconomyVersion")),
                    "Registry component-version query failed.");
            require(registry.stateFamilies().contains("worldEconomy"),
                    "Registry state-family query failed.");
        } finally {
            deleteTree(root);
        }
    }

    private static void deleteTree(Path root) throws IOException {
        if (!Files.exists(root)) return;
        try (var stream = Files.walk(root)) {
            for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    public static void main(String[] args) throws Exception {
        if (args.length == 1 && args[0].equals("--verify")) {
            verifyContract();
            System.out.println("Barotrauma migration, vessel, campaign, normalized world, and registry contracts passed.");
            return;
        }
        System.err.println("Usage: WorldMapRegistry --verify");
        System.exit(2);
    }
}
