package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.domain.identity.IdentityContracts;
import io.github.mrcalzon02.barotrauma.domain.identity.IdentityContracts.Sha256Digest;
import io.github.mrcalzon02.barotrauma.domain.identity.IdentityContracts.SourceArtifactIdentity;
import io.github.mrcalzon02.barotrauma.persistence.AcceptedImportTransaction.AcceptedImportRequest;
import io.github.mrcalzon02.barotrauma.persistence.AcceptedImportTransaction.AcceptedVesselCandidate;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.DefinitionCandidate;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.ImportPlan;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.InspectionCandidate;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.SourceKind;
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

/** Read-only definition, vessel-instance, and snapshot registry for one desktop world. */
public final class WorldVesselRegistry {

    private WorldVesselRegistry() {
    }

    public static RegistrySnapshot load(WorldPaths paths) throws IOException, SQLException {
        Objects.requireNonNull(paths, "paths");
        if (!Files.isRegularFile(paths.database())) {
            throw new IOException("Desktop world database does not exist: " + paths.database());
        }
        requireDriver();

        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            try (Statement statement = connection.createStatement()) {
                statement.execute("PRAGMA query_only = ON");
                statement.execute("PRAGMA foreign_keys = ON");
                statement.execute("PRAGMA busy_timeout = 5000");
            }
            verifySchema(connection);
            return new RegistrySnapshot(
                    summary(connection),
                    definitions(connection),
                    vessels(connection),
                    snapshots(connection)
            );
        }
    }

    private static RegistrySummary summary(Connection connection) throws SQLException {
        return new RegistrySummary(
                count(connection, "submarine_definition"),
                count(connection, "vessel_instance"),
                count(connection, "vessel_snapshot"),
                scalarCount(connection, "SELECT COUNT(*) FROM vessel_snapshot WHERE is_current = 1"),
                count(connection, "import_artifact"),
                scalarCount(connection, "SELECT COUNT(*) FROM import_artifact WHERE imported_at IS NOT NULL")
        );
    }

    private static List<DefinitionRow> definitions(Connection connection) throws SQLException {
        List<DefinitionRow> rows = new ArrayList<>();
        String sql = "SELECT d.definition_id, d.canonical_xml_sha256, d.official_check_value, d.display_name, "
                + "d.game_version, d.submarine_type, d.submarine_class, d.tier, d.source_artifact_id, "
                + "COUNT(v.vessel_id) AS vessel_count "
                + "FROM submarine_definition d LEFT JOIN vessel_instance v ON v.definition_id = d.definition_id "
                + "GROUP BY d.definition_id ORDER BY LOWER(d.display_name), d.definition_id";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) {
                rows.add(new DefinitionRow(
                        UUID.fromString(result.getString("definition_id")),
                        new Sha256Digest(result.getString("canonical_xml_sha256")),
                        nullableInteger(result, "official_check_value"),
                        result.getString("display_name"),
                        result.getString("game_version"),
                        result.getString("submarine_type"),
                        result.getString("submarine_class"),
                        nullableInteger(result, "tier"),
                        nullableUuid(result.getString("source_artifact_id")),
                        result.getInt("vessel_count")
                ));
            }
        }
        return List.copyOf(rows);
    }

    private static List<VesselRow> vessels(Connection connection) throws SQLException {
        List<VesselRow> rows = new ArrayList<>();
        String sql = "SELECT v.vessel_id, v.world_id, v.definition_id, v.display_name, v.created_at, v.retired_at, "
                + "d.canonical_xml_sha256, d.submarine_class, d.tier, "
                + "s.snapshot_id, s.snapshot_sha256, s.source_timestamp, s.imported_at AS snapshot_imported_at "
                + "FROM vessel_instance v "
                + "JOIN submarine_definition d ON d.definition_id = v.definition_id "
                + "LEFT JOIN vessel_snapshot s ON s.vessel_id = v.vessel_id AND s.is_current = 1 "
                + "ORDER BY LOWER(v.display_name), v.vessel_id";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) {
                String snapshotDigest = result.getString("snapshot_sha256");
                rows.add(new VesselRow(
                        UUID.fromString(result.getString("vessel_id")),
                        UUID.fromString(result.getString("world_id")),
                        UUID.fromString(result.getString("definition_id")),
                        result.getString("display_name"),
                        parseInstant(result.getString("created_at")),
                        parseInstant(result.getString("retired_at")),
                        new Sha256Digest(result.getString("canonical_xml_sha256")),
                        result.getString("submarine_class"),
                        nullableInteger(result, "tier"),
                        nullableUuid(result.getString("snapshot_id")),
                        snapshotDigest == null ? null : new Sha256Digest(snapshotDigest),
                        parseInstant(result.getString("source_timestamp")),
                        parseInstant(result.getString("snapshot_imported_at"))
                ));
            }
        }
        return List.copyOf(rows);
    }

    private static List<SnapshotRow> snapshots(Connection connection) throws SQLException {
        List<SnapshotRow> rows = new ArrayList<>();
        String sql = "SELECT s.snapshot_id, s.vessel_id, v.display_name, s.snapshot_sha256, s.source_timestamp, "
                + "s.imported_at, s.source_artifact_id, s.is_current "
                + "FROM vessel_snapshot s JOIN vessel_instance v ON v.vessel_id = s.vessel_id "
                + "ORDER BY v.display_name COLLATE NOCASE, "
                + "COALESCE(s.source_timestamp, s.imported_at) DESC, s.snapshot_id";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) {
                rows.add(new SnapshotRow(
                        UUID.fromString(result.getString("snapshot_id")),
                        UUID.fromString(result.getString("vessel_id")),
                        result.getString("display_name"),
                        new Sha256Digest(result.getString("snapshot_sha256")),
                        parseInstant(result.getString("source_timestamp")),
                        parseInstant(result.getString("imported_at")),
                        UUID.fromString(result.getString("source_artifact_id")),
                        result.getInt("is_current") == 1
                ));
            }
        }
        return List.copyOf(rows);
    }

    private static int count(Connection connection, String table) throws SQLException {
        if (!List.of("submarine_definition", "vessel_instance", "vessel_snapshot", "import_artifact").contains(table)) {
            throw new IllegalArgumentException("Unsupported registry table " + table);
        }
        return scalarCount(connection, "SELECT COUNT(*) FROM " + table);
    }

    private static int scalarCount(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            return result.next() ? result.getInt(1) : 0;
        }
    }

    private static Integer nullableInteger(ResultSet result, String column) throws SQLException {
        Object value = result.getObject(column);
        return value == null ? null : result.getInt(column);
    }

    private static UUID nullableUuid(String value) {
        return value == null || value.isBlank() ? null : UUID.fromString(value);
    }

    private static Instant parseInstant(String value) throws SQLException {
        if (value == null || value.isBlank()) return null;
        try {
            return Instant.parse(value);
        } catch (RuntimeException exception) {
            throw new SQLException("Stored timestamp is not a valid ISO-8601 instant: " + value, exception);
        }
    }

    private static void verifySchema(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COALESCE(MAX(version), 0) FROM schema_migration")) {
            int version = result.next() ? result.getInt(1) : 0;
            if (version != WorldStorageContracts.DATABASE_SCHEMA_VERSION) {
                throw new SQLException("Vessel registry requires database schema "
                        + WorldStorageContracts.DATABASE_SCHEMA_VERSION + "; found " + version + ".");
            }
        }
    }

    private static void requireDriver() throws SQLException {
        try {
            Class.forName("org.sqlite.JDBC");
        } catch (ClassNotFoundException exception) {
            throw new SQLException("The Xerial SQLite JDBC driver is not available on the runtime classpath.", exception);
        }
    }

    public record RegistrySnapshot(
            RegistrySummary summary,
            List<DefinitionRow> definitions,
            List<VesselRow> vessels,
            List<SnapshotRow> snapshots
    ) {
        public RegistrySnapshot {
            Objects.requireNonNull(summary, "summary");
            definitions = List.copyOf(definitions);
            vessels = List.copyOf(vessels);
            snapshots = List.copyOf(snapshots);
        }
    }

    public record RegistrySummary(
            int definitions,
            int vessels,
            int snapshots,
            int currentSnapshots,
            int inspectedArtifacts,
            int importedArtifacts
    ) {
    }

    public record DefinitionRow(
            UUID definitionId,
            Sha256Digest canonicalXmlDigest,
            Integer officialCheckValue,
            String displayName,
            String gameVersion,
            String submarineType,
            String submarineClass,
            Integer tier,
            UUID sourceArtifactId,
            int vesselCount
    ) {
    }

    public record VesselRow(
            UUID vesselId,
            UUID worldId,
            UUID definitionId,
            String displayName,
            Instant createdAt,
            Instant retiredAt,
            Sha256Digest canonicalDefinitionDigest,
            String submarineClass,
            Integer tier,
            UUID currentSnapshotId,
            Sha256Digest currentSnapshotDigest,
            Instant currentSnapshotSourceTimestamp,
            Instant currentSnapshotImportedAt
    ) {
    }

    public record SnapshotRow(
            UUID snapshotId,
            UUID vesselId,
            String vesselDisplayName,
            Sha256Digest snapshotDigest,
            Instant sourceTimestamp,
            Instant importedAt,
            UUID sourceArtifactId,
            boolean current
    ) {
    }

    public static void verifyContract() throws Exception {
        Path root = Files.createTempDirectory("barotrauma-vessel-registry-");
        try {
            UUID worldId = UUID.fromString("44444444-5555-6666-7777-888888888888");
            WorldPaths paths = WorldStorageContracts.createWorld(root, "Registry Contract World", worldId);
            Sha256Digest definitionDigest = IdentityContracts.sha256(
                    "registry-definition".getBytes(StandardCharsets.UTF_8));
            byte[] artifactBytes = "registry-artifact".getBytes(StandardCharsets.UTF_8);

            ImportPlan plan;
            try (SqliteWorldStore store = SqliteWorldStore.open(paths)) {
                plan = store.recordAndPlan(new InspectionCandidate(
                        new SourceArtifactIdentity(IdentityContracts.sha256(artifactBytes), artifactBytes.length),
                        "registry.sub",
                        SourceKind.OFFICIAL_SUBMARINE,
                        Instant.parse("2026-07-17T00:00:00Z"),
                        List.of(new DefinitionCandidate(
                                definitionDigest,
                                9,
                                "Registry Boat",
                                "1.0.0",
                                "Player",
                                "Scout",
                                1
                        )),
                        List.of()
                ));
            }

            AcceptedVesselCandidate vessel = new AcceptedVesselCandidate(
                    null,
                    UUID.fromString("99999999-aaaa-bbbb-cccc-dddddddddddd"),
                    UUID.fromString("aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb"),
                    definitionDigest,
                    IdentityContracts.sha256("registry-snapshot".getBytes(StandardCharsets.UTF_8)),
                    9,
                    "Registry Boat",
                    "1.0.0",
                    "Player",
                    "Scout",
                    1,
                    Instant.parse("2026-07-17T00:00:00Z")
            );
            AcceptedImportTransaction.commit(paths, new AcceptedImportRequest(
                    plan.artifactId(),
                    plan.artifact().artifactIdentity().digest(),
                    "registry-contract",
                    List.of(vessel)
            ));

            RegistrySnapshot registry = load(paths);
            require(registry.summary().definitions() == 1, "Registry definition count failed.");
            require(registry.summary().vessels() == 1, "Registry vessel count failed.");
            require(registry.summary().snapshots() == 1 && registry.summary().currentSnapshots() == 1,
                    "Registry snapshot counts failed.");
            require(registry.summary().inspectedArtifacts() == 1 && registry.summary().importedArtifacts() == 1,
                    "Registry artifact counts failed.");
            require(registry.definitions().get(0).vesselCount() == 1,
                    "Definition vessel aggregation failed.");
            require(registry.vessels().get(0).currentSnapshotId().equals(vessel.snapshotId()),
                    "Current snapshot join failed.");
            require(registry.snapshots().get(0).current(), "Snapshot chronology did not expose current state.");
        } finally {
            deleteTree(root);
        }
    }

    private static void deleteTree(Path root) throws IOException {
        if (!Files.exists(root)) return;
        try (var stream = Files.walk(root)) {
            for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) {
                Files.deleteIfExists(path);
            }
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    public static void main(String[] args) throws Exception {
        if (args.length == 1 && args[0].equals("--verify")) {
            SqliteWorldStore.verifyContract();
            AcceptedImportTransaction.verifyContract();
            verifyContract();
            System.out.println("Barotrauma SQLite planning, accepted-import, and vessel-registry contracts passed.");
            return;
        }
        System.err.println("Usage: WorldVesselRegistry --verify");
        System.exit(2);
    }
}
