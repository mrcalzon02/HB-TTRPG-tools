package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.compatibility.web.WebSuiteV22WorldDocument;
import io.github.mrcalzon02.barotrauma.compatibility.web.WebSuiteV22WorldDocument.LocationRecord;
import io.github.mrcalzon02.barotrauma.compatibility.web.WebSuiteV22WorldDocument.StationRecord;
import io.github.mrcalzon02.barotrauma.compatibility.web.WebSuiteV22WorldDocument.WorldDocument;
import io.github.mrcalzon02.barotrauma.domain.identity.IdentityContracts.Sha256Digest;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.ImportPlan;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.SourceKind;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldLock;
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
import java.sql.Types;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/** Atomically accepts one normalized version-22 master world without activating simulation. */
public final class WebWorldV22ImportTransaction {

    private WebWorldV22ImportTransaction() { }

    public static ImportedWorldSummary commit(WorldPaths paths, ImportRequest request)
            throws IOException, SQLException {
        Objects.requireNonNull(paths, "paths");
        Objects.requireNonNull(request, "request");
        requireDriver();
        validateDocument(request.document());

        try (WorldLock ignored = WorldStorageContracts.acquireExclusiveLock(paths);
             Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configure(connection);
            verifySchema(connection);
            UUID worldId = readWorldId(connection);
            return commit(connection, worldId, request);
        }
    }

    private static ImportedWorldSummary commit(Connection connection, UUID worldId, ImportRequest request)
            throws SQLException {
        boolean originalAutoCommit = connection.getAutoCommit();
        connection.setAutoCommit(false);
        try {
            ArtifactEvidence artifact = requirePendingWebArtifact(connection, request);
            requireWorldNotImported(connection, worldId);
            Instant importedAt = Instant.now();
            WorldDocument document = request.document();

            updateWorldMetadata(connection, worldId, document);
            UUID importId = UUID.randomUUID();
            insertWorldImport(connection, importId, worldId, request.artifactId(), document, importedAt);

            Map<String, UUID> locationIds = new HashMap<>();
            for (LocationRecord location : document.locations()) {
                UUID locationId = deterministicId("location", worldId, location.sourceId());
                locationIds.put(location.sourceId(), locationId);
                insertLocation(connection, worldId, locationId, location);
            }
            for (StationRecord station : document.stations()) {
                UUID locationId = locationIds.get(station.locationSourceId());
                if (locationId == null) {
                    throw new SQLException("Station " + station.sourceId()
                            + " references a location that was not normalized: " + station.locationSourceId());
                }
                insertStation(connection, worldId, deterministicId("station", worldId, station.sourceId()),
                        locationId, station);
            }
            insertComponentVersions(connection, worldId, document.inspection().componentVersions());
            insertStateFamilies(connection, worldId, document.inspection().topLevelStateFamilies());
            insertSimulationMetadata(connection, worldId, request.artifactId(), document, importedAt);
            markArtifactImported(connection, request.artifactId(), importedAt);
            insertAudit(connection, request.actor(), request.artifactId(), artifact.sourceName(), worldId,
                    document.locations().size(), document.stations().size());
            connection.commit();

            return new ImportedWorldSummary(importId, worldId, request.artifactId(), importedAt,
                    document.inspection().masterWorldId(), document.inspection().world().rings(),
                    document.locations().size(), document.stations().size(),
                    document.simulation().canonicalTime(), document.simulation().lastSimulatedAt(),
                    document.simulation().importedTickSequence(), false, "PAUSED");
        } catch (SQLException | RuntimeException exception) {
            try { connection.rollback(); } catch (SQLException rollbackFailure) { exception.addSuppressed(rollbackFailure); }
            throw exception;
        } finally {
            connection.setAutoCommit(originalAutoCommit);
        }
    }

    private static void validateDocument(WorldDocument document) throws SQLException {
        Objects.requireNonNull(document, "document");
        if (document.inspection().suiteVersion() != 22) {
            throw new SQLException("Normalized master-world import accepts suite version 22 only.");
        }
        if (document.inspection().masterWorldId().isBlank()) {
            throw new SQLException("A normalized master world requires a non-empty masterWorldId.");
        }
        if (document.inspection().world().rings() <= 0) {
            throw new SQLException("A normalized master world must declare at least one ring.");
        }
        if (document.locations().isEmpty()) {
            throw new SQLException("A normalized master world must contain at least one location.");
        }
        if (document.locations().size() != document.inspection().world().locations()) {
            throw new SQLException("Normalized location count does not match the inspected world summary.");
        }
        Set<String> locationIds = new HashSet<>();
        Set<Integer> ordinals = new HashSet<>();
        for (LocationRecord location : document.locations()) {
            if (!locationIds.add(location.sourceId())) throw new SQLException("Duplicate normalized location ID.");
            if (!ordinals.add(location.ordinal())) throw new SQLException("Duplicate normalized location ordinal.");
        }
        for (StationRecord station : document.stations()) {
            if (!locationIds.contains(station.locationSourceId())) {
                throw new SQLException("A normalized station references an unknown location.");
            }
        }
    }

    private static ArtifactEvidence requirePendingWebArtifact(Connection connection, ImportRequest request)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT sha256, source_name, source_kind, imported_at FROM import_artifact WHERE artifact_id = ?")) {
            statement.setString(1, request.artifactId().toString());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Master-world import references an unknown inspection artifact.");
                if (!result.getString("sha256").equals(request.artifactDigest().value())) {
                    throw new SQLException("Master-world source SHA-256 does not match its inspection record.");
                }
                if (!request.document().inspection().artifactIdentity().digest().equals(request.artifactDigest())) {
                    throw new SQLException("Normalized world document does not match the accepted source SHA-256.");
                }
                if (result.getString("imported_at") != null) {
                    throw new SQLException("The inspected version-22 source has already been imported.");
                }
                if (!result.getString("source_kind").equals(SourceKind.WEB_SUITE_V22.databaseValue())) {
                    throw new SQLException("Master-world import accepts version-22 web-suite sources only.");
                }
                return new ArtifactEvidence(result.getString("source_name"));
            }
        }
    }

    private static void requireWorldNotImported(Connection connection, UUID worldId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT artifact_id FROM world_import WHERE world_id = ?")) {
            statement.setString(1, worldId.toString());
            try (ResultSet result = statement.executeQuery()) {
                if (result.next()) {
                    throw new SQLException("This desktop world already contains an accepted master-world import. "
                            + "Create another desktop world rather than replacing normalized world state.");
                }
            }
        }
    }

    private static void updateWorldMetadata(Connection connection, UUID worldId, WorldDocument document)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "UPDATE world_metadata SET canonical_time = ?, master_world_id = ?, source_suite_version = ?, "
                        + "source_exported_at = ? WHERE world_id = ?")) {
            setInstant(statement, 1, document.simulation().canonicalTime());
            statement.setString(2, document.inspection().masterWorldId());
            statement.setInt(3, document.inspection().suiteVersion());
            setInstant(statement, 4, document.inspection().exportedAt());
            statement.setString(5, worldId.toString());
            if (statement.executeUpdate() != 1) throw new SQLException("Desktop world metadata row is missing.");
        }
    }

    private static void insertWorldImport(Connection connection, UUID importId, UUID worldId, UUID artifactId,
                                          WorldDocument document, Instant importedAt) throws SQLException {
        String sql = "INSERT INTO world_import(import_id, world_id, artifact_id, suite_version, master_world_id, "
                + "exported_at, imported_at, rings, location_count, station_count, shell_radius, "
                + "active_submarine_name, active_submarine_model, crew_records, economy_vessels, economy_stations) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, importId.toString());
            statement.setString(2, worldId.toString());
            statement.setString(3, artifactId.toString());
            statement.setInt(4, document.inspection().suiteVersion());
            statement.setString(5, document.inspection().masterWorldId());
            setInstant(statement, 6, document.inspection().exportedAt());
            statement.setString(7, importedAt.toString());
            statement.setInt(8, document.inspection().world().rings());
            statement.setInt(9, document.locations().size());
            statement.setInt(10, document.stations().size());
            setDouble(statement, 11, document.shellRadius());
            statement.setString(12, emptyToNull(document.inspection().activeSubmarineName()));
            statement.setString(13, emptyToNull(document.inspection().activeSubmarineModel()));
            statement.setInt(14, document.inspection().crewRecords());
            statement.setInt(15, document.simulation().economyVessels());
            statement.setInt(16, document.simulation().economyStations());
            statement.executeUpdate();
        }
    }

    private static void insertLocation(Connection connection, UUID worldId, UUID locationId,
                                       LocationRecord location) throws SQLException {
        String sql = "INSERT INTO world_location(location_id, world_id, source_location_id, source_ordinal, "
                + "display_name, location_type, ring, location_level, map_x, map_y, biome, faction, is_station) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, locationId.toString());
            statement.setString(2, worldId.toString());
            statement.setString(3, location.sourceId());
            statement.setInt(4, location.ordinal());
            statement.setString(5, location.displayName());
            statement.setString(6, emptyToNull(location.locationType()));
            statement.setInt(7, location.ring());
            statement.setInt(8, location.level());
            setDouble(statement, 9, location.mapX());
            setDouble(statement, 10, location.mapY());
            statement.setString(11, emptyToNull(location.biome()));
            statement.setString(12, emptyToNull(location.faction()));
            statement.setInt(13, location.station() ? 1 : 0);
            statement.executeUpdate();
        }
    }

    private static void insertStation(Connection connection, UUID worldId, UUID stationId, UUID locationId,
                                      StationRecord station) throws SQLException {
        String sql = "INSERT INTO world_station(station_id, world_id, location_id, source_station_id, "
                + "display_name, station_type, faction, has_economy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            statement.setString(2, worldId.toString());
            statement.setString(3, locationId.toString());
            statement.setString(4, station.sourceId());
            statement.setString(5, station.displayName());
            statement.setString(6, emptyToNull(station.stationType()));
            statement.setString(7, emptyToNull(station.faction()));
            statement.setInt(8, station.economyPresent() ? 1 : 0);
            statement.executeUpdate();
        }
    }

    private static void insertComponentVersions(Connection connection, UUID worldId, Map<String, String> versions)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO world_component_version(world_id, component_key, component_version) VALUES (?, ?, ?)")) {
            for (Map.Entry<String, String> entry : versions.entrySet().stream().sorted(Map.Entry.comparingByKey()).toList()) {
                statement.setString(1, worldId.toString());
                statement.setString(2, entry.getKey());
                statement.setString(3, entry.getValue());
                statement.addBatch();
            }
            statement.executeBatch();
        }
    }

    private static void insertStateFamilies(Connection connection, UUID worldId, List<String> families)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO world_state_family(world_id, family_key) VALUES (?, ?)")) {
            for (String family : families.stream().sorted().toList()) {
                statement.setString(1, worldId.toString());
                statement.setString(2, family);
                statement.addBatch();
            }
            statement.executeBatch();
        }
    }

    private static void insertSimulationMetadata(Connection connection, UUID worldId, UUID artifactId,
                                                 WorldDocument document, Instant importedAt) throws SQLException {
        String sql = "INSERT INTO world_simulation_metadata(world_id, canonical_time, real_epoch, "
                + "last_simulated_at, imported_tick_sequence, imported_at, source_artifact_id, "
                + "simulation_enabled, scheduler_state) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'PAUSED')";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, worldId.toString());
            setInstant(statement, 2, document.simulation().canonicalTime());
            setInstant(statement, 3, document.simulation().realEpoch());
            setInstant(statement, 4, document.simulation().lastSimulatedAt());
            statement.setLong(5, document.simulation().importedTickSequence());
            statement.setString(6, importedAt.toString());
            statement.setString(7, artifactId.toString());
            statement.executeUpdate();
        }
    }

    private static void markArtifactImported(Connection connection, UUID artifactId, Instant importedAt)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "UPDATE import_artifact SET imported_at = ? WHERE artifact_id = ? AND imported_at IS NULL")) {
            statement.setString(1, importedAt.toString());
            statement.setString(2, artifactId.toString());
            if (statement.executeUpdate() != 1) {
                throw new SQLException("The inspected source changed state before master-world import could commit.");
            }
        }
    }

    private static void insertAudit(Connection connection, String actor, UUID artifactId, String sourceName,
                                    UUID worldId, int locations, int stations) throws SQLException {
        String details = "{\"sourceName\":\"" + json(sourceName) + "\",\"locations\":" + locations
                + ",\"stations\":" + stations + ",\"simulationEnabled\":false}";
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO audit_entry(occurred_at, actor, action, entity_type, entity_id, details_json) "
                        + "VALUES (?, ?, ?, ?, ?, ?)")) {
            statement.setString(1, Instant.now().toString());
            statement.setString(2, actor);
            statement.setString(3, "web_world_v22_imported");
            statement.setString(4, "world_metadata");
            statement.setString(5, worldId.toString());
            statement.setString(6, details);
            statement.executeUpdate();
        }
    }

    private static UUID readWorldId(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT world_id FROM world_metadata LIMIT 1")) {
            if (!result.next()) throw new SQLException("Desktop world metadata row is missing.");
            return UUID.fromString(result.getString(1));
        }
    }

    private static UUID deterministicId(String namespace, UUID worldId, String sourceId) {
        return UUID.nameUUIDFromBytes((namespace + ":" + worldId + ":" + sourceId)
                .getBytes(StandardCharsets.UTF_8));
    }

    private static void setInstant(PreparedStatement statement, int index, Instant value) throws SQLException {
        if (value == null) statement.setNull(index, Types.VARCHAR);
        else statement.setString(index, value.toString());
    }

    private static void setDouble(PreparedStatement statement, int index, Double value) throws SQLException {
        if (value == null) statement.setNull(index, Types.REAL);
        else statement.setDouble(index, value);
    }

    private static String emptyToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String json(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t");
    }

    private static void configure(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys = ON");
            statement.execute("PRAGMA busy_timeout = 5000");
            statement.execute("PRAGMA journal_mode = WAL");
            statement.execute("PRAGMA synchronous = FULL");
        }
    }

    private static void verifySchema(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COALESCE(MAX(version), 0) FROM schema_migration")) {
            int version = result.next() ? result.getInt(1) : 0;
            if (version != WorldStorageContracts.DATABASE_SCHEMA_VERSION) {
                throw new SQLException("Master-world import requires database schema "
                        + WorldStorageContracts.DATABASE_SCHEMA_VERSION + "; found " + version + ".");
            }
        }
    }

    private static void requireDriver() throws SQLException {
        try { Class.forName("org.sqlite.JDBC"); }
        catch (ClassNotFoundException exception) { throw new SQLException("SQLite JDBC driver is unavailable.", exception); }
    }

    public record ImportRequest(UUID artifactId, Sha256Digest artifactDigest, String actor, WorldDocument document) {
        public ImportRequest {
            Objects.requireNonNull(artifactId, "artifactId");
            Objects.requireNonNull(artifactDigest, "artifactDigest");
            actor = actor == null || actor.isBlank() ? "desktop-user" : actor.trim();
            Objects.requireNonNull(document, "document");
        }
    }

    public record ImportedWorldSummary(
            UUID importId,
            UUID worldId,
            UUID artifactId,
            Instant importedAt,
            String masterWorldId,
            int rings,
            int locations,
            int stations,
            Instant canonicalTime,
            Instant sourceLastSimulatedAt,
            long importedTickSequence,
            boolean simulationEnabled,
            String schedulerState
    ) { }

    private record ArtifactEvidence(String sourceName) { }

    public static void verifyContract() throws Exception {
        Path root = Files.createTempDirectory("barotrauma-web-world-import-");
        try {
            UUID worldId = UUID.fromString("92000000-0000-0000-0000-000000000001");
            WorldPaths paths = WorldStorageContracts.createWorld(root, "Normalized Europa", worldId);
            String fixture = fixture("EUROPA-WORLD-A", "station-a", "route-a");
            WorldDocument document = WebSuiteV22WorldDocument.inspect(
                    fixture.getBytes(StandardCharsets.UTF_8), "world-a.json");
            ImportPlan plan;
            try (SqliteWorldStore store = SqliteWorldStore.open(paths)) {
                plan = store.inspectAndPlan(document.inspection());
            }
            ImportedWorldSummary imported = commit(paths, new ImportRequest(plan.artifactId(),
                    plan.artifact().artifactIdentity().digest(), "web-world-test", document));
            require(imported.locations() == 2 && imported.stations() == 1, "Normalized world counts failed.");
            require(!imported.simulationEnabled() && imported.schedulerState().equals("PAUSED"),
                    "Imported world unexpectedly activated simulation.");

            try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
                require(count(connection, "world_location") == 2, "Location persistence failed.");
                require(count(connection, "world_station") == 1, "Station persistence failed.");
                require(count(connection, "world_import") == 1, "World import ledger failed.");
                try (Statement statement = connection.createStatement();
                     ResultSet result = statement.executeQuery("SELECT master_world_id, canonical_time, source_suite_version FROM world_metadata")) {
                    require(result.next(), "World metadata row missing.");
                    require(result.getString(1).equals("EUROPA-WORLD-A"), "Master-world identity failed.");
                    require(result.getString(2).equals("2175-01-01T00:00:00Z"), "Canonical time persistence failed.");
                    require(result.getInt(3) == 22, "Suite-version persistence failed.");
                }
                try (Statement statement = connection.createStatement();
                     ResultSet result = statement.executeQuery("SELECT simulation_enabled, scheduler_state, imported_tick_sequence FROM world_simulation_metadata")) {
                    require(result.next() && result.getInt(1) == 0 && result.getString(2).equals("PAUSED")
                            && result.getLong(3) == 12L, "Paused simulation metadata failed.");
                }
            }

            String secondFixture = fixture("EUROPA-WORLD-B", "station-b", "route-b");
            WorldDocument second = WebSuiteV22WorldDocument.inspect(
                    secondFixture.getBytes(StandardCharsets.UTF_8), "world-b.json");
            ImportPlan secondPlan;
            try (SqliteWorldStore store = SqliteWorldStore.open(paths)) {
                secondPlan = store.inspectAndPlan(second.inspection());
            }
            try {
                commit(paths, new ImportRequest(secondPlan.artifactId(),
                        secondPlan.artifact().artifactIdentity().digest(), "web-world-test", second));
                throw new IllegalStateException("A second master world unexpectedly replaced the first.");
            } catch (SQLException expected) {
                require(expected.getMessage().contains("already contains"), "Unexpected replacement rejection.");
            }
            try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
                 PreparedStatement statement = connection.prepareStatement(
                         "SELECT imported_at FROM import_artifact WHERE artifact_id = ?")) {
                statement.setString(1, secondPlan.artifactId().toString());
                try (ResultSet result = statement.executeQuery()) {
                    require(result.next() && result.getString(1) == null,
                            "Rejected replacement source was incorrectly marked imported.");
                }
            }
        } finally {
            deleteTree(root);
        }
    }

    private static String fixture(String masterWorldId, String stationId, String routeId) {
        return """
                {"version":22,"exportedAt":"2026-07-17T20:00:00Z","masterWorldId":"%s",
                "worldEconomyVersion":"1.0.0","worldStateSchemaVersion":"2.2.0","state":{
                "world":{"canonicalTime":"2175-01-01T00:00:00Z","realEpoch":"2026-06-20T08:00:00Z",
                "map":{"rings":48,"shellRadius":7008,"nodes":[
                {"id":"%s","name":"Alpha Station","ring":48,"level":1,"type":"station","x":10,"y":20},
                {"id":"%s","name":"Route Node","ring":47,"level":2,"type":"location","x":30,"y":40}]}},
                "worldEconomy":{"vessels":{"player":{"kind":"player"}},"stationEconomies":{"%s":{}},
                "simulation":{"tickSequence":12,"lastSimulatedAt":"2175-01-02T00:00:00Z"}},
                "submarine":{"name":"Test Boat","model":"Barsuk","crewRoster":[]}}}
                """.formatted(masterWorldId, stationId, routeId, stationId);
    }

    private static int count(Connection connection, String table) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COUNT(*) FROM " + table)) {
            return result.next() ? result.getInt(1) : 0;
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
            CampaignArchiveImportTransaction.verifyContract();
            WebSuiteV22WorldDocument.verifyContract();
            verifyContract();
            System.out.println("Barotrauma vessel, campaign, and normalized world contracts passed.");
            return;
        }
        System.err.println("Usage: WebWorldV22ImportTransaction --verify");
        System.exit(2);
    }
}
