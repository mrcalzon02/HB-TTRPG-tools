package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.compatibility.official.BarotraumaSaveInspector.SubmarineInspection;
import io.github.mrcalzon02.barotrauma.domain.identity.IdentityContracts;
import io.github.mrcalzon02.barotrauma.domain.identity.IdentityContracts.Sha256Digest;
import io.github.mrcalzon02.barotrauma.domain.identity.IdentityContracts.SourceArtifactIdentity;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.DefinitionCandidate;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.ImportPlan;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.InspectionCandidate;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.SourceKind;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldLock;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import java.io.IOException;
import java.io.InputStream;
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
import java.util.Properties;
import java.util.UUID;

/**
 * Commits an explicitly accepted official-vessel import as one SQLite transaction.
 *
 * <p>The source artifact must already have been recorded by {@link SqliteWorldStore}. Definitions
 * are reused by canonical XML digest, while every accepted physical vessel receives its own world
 * identity and immutable source snapshot. Any failure rolls back the complete accepted import.</p>
 */
public final class AcceptedImportTransaction {

    private AcceptedImportTransaction() {
    }

    public static CommitResult commit(WorldPaths paths, AcceptedImportRequest request)
            throws IOException, SQLException {
        Objects.requireNonNull(paths, "paths");
        Objects.requireNonNull(request, "request");
        requireDriver();

        try (WorldLock ignored = WorldStorageContracts.acquireExclusiveLock(paths);
             Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configure(connection);
            verifySchema(connection);
            UUID worldId = readWorldId(paths);
            return commit(connection, worldId, request);
        }
    }

    private static CommitResult commit(Connection connection, UUID worldId, AcceptedImportRequest request)
            throws SQLException {
        boolean originalAutoCommit = connection.getAutoCommit();
        connection.setAutoCommit(false);
        try {
            ArtifactEvidence artifact = requirePendingArtifact(connection, request);
            Instant importedAt = Instant.now();
            List<VesselCommit> vessels = new ArrayList<>();
            int definitionsCreated = 0;
            int definitionsReused = 0;

            for (AcceptedVesselCandidate candidate : request.vessels()) {
                DefinitionResolution definition = resolveDefinition(connection, request.artifactId(), candidate);
                if (definition.created()) definitionsCreated++; else definitionsReused++;

                UUID vesselId = candidate.vesselId() == null ? UUID.randomUUID() : candidate.vesselId();
                UUID snapshotId = candidate.snapshotId() == null ? UUID.randomUUID() : candidate.snapshotId();
                String displayName = candidate.displayName().isBlank()
                        ? "Imported submarine " + vesselId.toString().substring(0, 8)
                        : candidate.displayName();

                try (PreparedStatement statement = connection.prepareStatement(
                        "INSERT INTO vessel_instance(vessel_id, world_id, definition_id, display_name, created_at) "
                                + "VALUES (?, ?, ?, ?, ?)")) {
                    statement.setString(1, vesselId.toString());
                    statement.setString(2, worldId.toString());
                    statement.setString(3, definition.definitionId().toString());
                    statement.setString(4, displayName);
                    statement.setString(5, importedAt.toString());
                    statement.executeUpdate();
                }

                try (PreparedStatement statement = connection.prepareStatement(
                        "INSERT INTO vessel_snapshot(snapshot_id, vessel_id, snapshot_sha256, source_timestamp, "
                                + "imported_at, source_artifact_id, is_current) VALUES (?, ?, ?, ?, ?, ?, 1)")) {
                    statement.setString(1, snapshotId.toString());
                    statement.setString(2, vesselId.toString());
                    statement.setString(3, candidate.snapshotDigest().value());
                    statement.setString(4, candidate.sourceTimestamp() == null ? null : candidate.sourceTimestamp().toString());
                    statement.setString(5, importedAt.toString());
                    statement.setString(6, request.artifactId().toString());
                    statement.executeUpdate();
                }

                vessels.add(new VesselCommit(
                        vesselId,
                        snapshotId,
                        definition.definitionId(),
                        definition.created(),
                        displayName,
                        candidate.snapshotDigest()
                ));
            }

            try (PreparedStatement statement = connection.prepareStatement(
                    "UPDATE import_artifact SET imported_at = ? WHERE artifact_id = ? AND imported_at IS NULL")) {
                statement.setString(1, importedAt.toString());
                statement.setString(2, request.artifactId().toString());
                if (statement.executeUpdate() != 1) {
                    throw new SQLException("The inspected source changed state before the accepted import could commit.");
                }
            }

            insertAudit(connection, request.actor(), "accepted_import_committed", "import_artifact",
                    request.artifactId().toString(),
                    "{\"sourceName\":\"" + json(artifact.sourceName())
                            + "\",\"vessels\":" + vessels.size()
                            + ",\"definitionsCreated\":" + definitionsCreated
                            + ",\"definitionsReused\":" + definitionsReused + "}");

            connection.commit();
            return new CommitResult(
                    request.artifactId(),
                    importedAt,
                    definitionsCreated,
                    definitionsReused,
                    List.copyOf(vessels)
            );
        } catch (SQLException | RuntimeException exception) {
            try {
                connection.rollback();
            } catch (SQLException rollbackFailure) {
                exception.addSuppressed(rollbackFailure);
            }
            throw exception;
        } finally {
            connection.setAutoCommit(originalAutoCommit);
        }
    }

    private static ArtifactEvidence requirePendingArtifact(Connection connection, AcceptedImportRequest request)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT sha256, source_name, source_kind, imported_at FROM import_artifact WHERE artifact_id = ?")) {
            statement.setString(1, request.artifactId().toString());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) {
                    throw new SQLException("The accepted import references an inspection artifact that does not exist.");
                }
                String storedDigest = result.getString("sha256");
                if (!storedDigest.equals(request.artifactDigest().value())) {
                    throw new SQLException("The accepted source SHA-256 does not match its inspection record.");
                }
                if (result.getString("imported_at") != null) {
                    throw new SQLException("The inspected source has already been imported.");
                }
                String kind = result.getString("source_kind");
                if (!kind.equals(SourceKind.OFFICIAL_CAMPAIGN_SAVE.databaseValue())
                        && !kind.equals(SourceKind.OFFICIAL_SUBMARINE.databaseValue())) {
                    throw new SQLException("This phase accepts official .save and .sub vessel sources only.");
                }
                return new ArtifactEvidence(result.getString("source_name"), kind);
            }
        }
    }

    private static DefinitionResolution resolveDefinition(
            Connection connection,
            UUID artifactId,
            AcceptedVesselCandidate candidate
    ) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT definition_id FROM submarine_definition WHERE canonical_xml_sha256 = ?")) {
            statement.setString(1, candidate.canonicalDefinitionDigest().value());
            try (ResultSet result = statement.executeQuery()) {
                if (result.next()) {
                    return new DefinitionResolution(UUID.fromString(result.getString(1)), false);
                }
            }
        }

        UUID definitionId = candidate.definitionId() == null ? UUID.randomUUID() : candidate.definitionId();
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO submarine_definition(definition_id, canonical_xml_sha256, official_check_value, "
                        + "display_name, game_version, submarine_type, submarine_class, tier, source_artifact_id) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")) {
            statement.setString(1, definitionId.toString());
            statement.setString(2, candidate.canonicalDefinitionDigest().value());
            if (candidate.officialCheckValue() == null) statement.setNull(3, java.sql.Types.INTEGER);
            else statement.setInt(3, candidate.officialCheckValue());
            statement.setString(4, candidate.displayName());
            statement.setString(5, emptyToNull(candidate.gameVersion()));
            statement.setString(6, emptyToNull(candidate.submarineType()));
            statement.setString(7, emptyToNull(candidate.submarineClass()));
            if (candidate.tier() == null) statement.setNull(8, java.sql.Types.INTEGER);
            else statement.setInt(8, candidate.tier());
            statement.setString(9, artifactId.toString());
            statement.executeUpdate();
        }
        return new DefinitionResolution(definitionId, true);
    }

    private static void insertAudit(
            Connection connection,
            String actor,
            String action,
            String entityType,
            String entityId,
            String detailsJson
    ) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO audit_entry(occurred_at, actor, action, entity_type, entity_id, details_json) "
                        + "VALUES (?, ?, ?, ?, ?, ?)")) {
            statement.setString(1, Instant.now().toString());
            statement.setString(2, actor);
            statement.setString(3, action);
            statement.setString(4, entityType);
            statement.setString(5, entityId);
            statement.setString(6, detailsJson);
            statement.executeUpdate();
        }
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
                throw new SQLException("Accepted import requires database schema "
                        + WorldStorageContracts.DATABASE_SCHEMA_VERSION + "; found " + version + ".");
            }
        }
    }

    private static UUID readWorldId(WorldPaths paths) throws IOException {
        Properties metadata = new Properties();
        try (InputStream input = Files.newInputStream(paths.metadata())) {
            metadata.load(input);
        }
        String value = metadata.getProperty("worldId", "").trim();
        if (value.isEmpty()) throw new IOException("World metadata is missing worldId.");
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException exception) {
            throw new IOException("World metadata contains an invalid worldId.", exception);
        }
    }

    private static void requireDriver() throws SQLException {
        try {
            Class.forName("org.sqlite.JDBC");
        } catch (ClassNotFoundException exception) {
            throw new SQLException("The Xerial SQLite JDBC driver is not available on the runtime classpath.", exception);
        }
    }

    private static String emptyToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String json(String value) {
        return value.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    public static AcceptedVesselCandidate from(SubmarineInspection submarine, Instant sourceTimestamp) {
        Objects.requireNonNull(submarine, "submarine");
        return new AcceptedVesselCandidate(
                null,
                null,
                null,
                submarine.definitionIdentity().canonicalXmlDigest(),
                submarine.payloadIdentity().digest(),
                submarine.equalityCheckValue(),
                submarine.name(),
                submarine.gameVersion(),
                submarine.type(),
                submarine.submarineClass(),
                submarine.tier(),
                sourceTimestamp
        );
    }

    public record AcceptedImportRequest(
            UUID artifactId,
            Sha256Digest artifactDigest,
            String actor,
            List<AcceptedVesselCandidate> vessels
    ) {
        public AcceptedImportRequest {
            Objects.requireNonNull(artifactId, "artifactId");
            Objects.requireNonNull(artifactDigest, "artifactDigest");
            actor = actor == null || actor.isBlank() ? "desktop-user" : actor.trim();
            vessels = List.copyOf(vessels);
            if (vessels.isEmpty()) {
                throw new IllegalArgumentException("An accepted official import must contain at least one vessel.");
            }
        }
    }

    public record AcceptedVesselCandidate(
            UUID definitionId,
            UUID vesselId,
            UUID snapshotId,
            Sha256Digest canonicalDefinitionDigest,
            Sha256Digest snapshotDigest,
            Integer officialCheckValue,
            String displayName,
            String gameVersion,
            String submarineType,
            String submarineClass,
            Integer tier,
            Instant sourceTimestamp
    ) {
        public AcceptedVesselCandidate {
            Objects.requireNonNull(canonicalDefinitionDigest, "canonicalDefinitionDigest");
            Objects.requireNonNull(snapshotDigest, "snapshotDigest");
            displayName = displayName == null ? "" : displayName.trim();
            gameVersion = gameVersion == null ? "" : gameVersion.trim();
            submarineType = submarineType == null ? "" : submarineType.trim();
            submarineClass = submarineClass == null ? "" : submarineClass.trim();
        }
    }

    public record VesselCommit(
            UUID vesselId,
            UUID snapshotId,
            UUID definitionId,
            boolean definitionCreated,
            String displayName,
            Sha256Digest snapshotDigest
    ) {
    }

    public record CommitResult(
            UUID artifactId,
            Instant importedAt,
            int definitionsCreated,
            int definitionsReused,
            List<VesselCommit> vessels
    ) {
        public CommitResult {
            vessels = List.copyOf(vessels);
        }
    }

    private record DefinitionResolution(UUID definitionId, boolean created) {
    }

    private record ArtifactEvidence(String sourceName, String sourceKind) {
    }

    public static void verifyContract() throws Exception {
        Path root = Files.createTempDirectory("barotrauma-accepted-import-");
        try {
            UUID worldId = UUID.fromString("33333333-4444-5555-6666-777777777777");
            WorldPaths paths = WorldStorageContracts.createWorld(root, "Accepted Import World", worldId);
            Sha256Digest definitionDigest = IdentityContracts.sha256(
                    "canonical-contract-submarine".getBytes(StandardCharsets.UTF_8));

            ImportPlan firstPlan;
            try (SqliteWorldStore store = SqliteWorldStore.open(paths)) {
                firstPlan = store.recordAndPlan(candidate(
                        "first-source",
                        "first.sub",
                        definitionDigest,
                        "Contract Boat"
                ));
            }

            CommitResult first = commit(paths, request(
                    firstPlan,
                    definitionDigest,
                    "first-snapshot",
                    "Contract Boat",
                    null,
                    null,
                    null
            ));
            require(first.definitionsCreated() == 1 && first.definitionsReused() == 0,
                    "First accepted import did not create exactly one definition.");
            require(first.vessels().size() == 1, "First accepted import did not create one vessel.");
            require(count(paths, "submarine_definition") == 1, "Definition row count is incorrect.");
            require(count(paths, "vessel_instance") == 1, "Vessel row count is incorrect.");
            require(count(paths, "vessel_snapshot") == 1, "Snapshot row count is incorrect.");
            require(imported(paths, firstPlan.artifactId()), "Accepted source was not marked imported.");

            ImportPlan secondPlan;
            try (SqliteWorldStore store = SqliteWorldStore.open(paths)) {
                secondPlan = store.recordAndPlan(candidate(
                        "second-source",
                        "renamed-contract-boat.sub",
                        definitionDigest,
                        "Renamed Contract Boat"
                ));
            }
            CommitResult second = commit(paths, request(
                    secondPlan,
                    definitionDigest,
                    "second-snapshot",
                    "Renamed Contract Boat",
                    null,
                    null,
                    null
            ));
            require(second.definitionsCreated() == 0 && second.definitionsReused() == 1,
                    "Canonical duplicate did not reuse its definition.");
            require(count(paths, "submarine_definition") == 1,
                    "Renamed structural duplicate created another definition.");
            require(count(paths, "vessel_instance") == 2 && count(paths, "vessel_snapshot") == 2,
                    "Second accepted source did not create a separate physical vessel and snapshot.");

            ImportPlan rollbackPlan;
            try (SqliteWorldStore store = SqliteWorldStore.open(paths)) {
                rollbackPlan = store.recordAndPlan(candidate(
                        "rollback-source",
                        "rollback.sub",
                        IdentityContracts.sha256("rollback-definition".getBytes(StandardCharsets.UTF_8)),
                        "Rollback Boat"
                ));
            }
            UUID repeatedVesselId = UUID.fromString("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
            AcceptedVesselCandidate duplicateOne = vessel(
                    IdentityContracts.sha256("rollback-definition".getBytes(StandardCharsets.UTF_8)),
                    IdentityContracts.sha256("rollback-snapshot-one".getBytes(StandardCharsets.UTF_8)),
                    "Rollback Boat One",
                    null,
                    repeatedVesselId,
                    null
            );
            AcceptedVesselCandidate duplicateTwo = vessel(
                    IdentityContracts.sha256("rollback-definition-two".getBytes(StandardCharsets.UTF_8)),
                    IdentityContracts.sha256("rollback-snapshot-two".getBytes(StandardCharsets.UTF_8)),
                    "Rollback Boat Two",
                    null,
                    repeatedVesselId,
                    null
            );
            try {
                commit(paths, new AcceptedImportRequest(
                        rollbackPlan.artifactId(),
                        rollbackPlan.artifact().artifactIdentity().digest(),
                        "contract-test",
                        List.of(duplicateOne, duplicateTwo)
                ));
                throw new IllegalStateException("The rollback fixture unexpectedly committed.");
            } catch (SQLException expected) {
                require(count(paths, "submarine_definition") == 1,
                        "Failed import left a partially created definition.");
                require(count(paths, "vessel_instance") == 2,
                        "Failed import left a partially created vessel.");
                require(count(paths, "vessel_snapshot") == 2,
                        "Failed import left a partially created snapshot.");
                require(!imported(paths, rollbackPlan.artifactId()),
                        "Failed import incorrectly marked its artifact imported.");
            }

            try {
                commit(paths, request(
                        firstPlan,
                        definitionDigest,
                        "repeat-snapshot",
                        "Contract Boat",
                        null,
                        null,
                        null
                ));
                throw new IllegalStateException("An already imported artifact was imported twice.");
            } catch (SQLException expected) {
                require(expected.getMessage().contains("already been imported"),
                        "Unexpected repeated-import rejection: " + expected.getMessage());
            }
        } finally {
            deleteTree(root);
        }
    }

    private static InspectionCandidate candidate(
            String artifactText,
            String sourceName,
            Sha256Digest definitionDigest,
            String displayName
    ) {
        byte[] artifactBytes = artifactText.getBytes(StandardCharsets.UTF_8);
        return new InspectionCandidate(
                new SourceArtifactIdentity(IdentityContracts.sha256(artifactBytes), artifactBytes.length),
                sourceName,
                SourceKind.OFFICIAL_SUBMARINE,
                Instant.parse("2026-07-17T00:00:00Z"),
                List.of(new DefinitionCandidate(
                        definitionDigest,
                        42,
                        displayName,
                        "1.0.0",
                        "Player",
                        "Scout",
                        1
                )),
                List.of()
        );
    }

    private static AcceptedImportRequest request(
            ImportPlan plan,
            Sha256Digest definitionDigest,
            String snapshotText,
            String displayName,
            UUID definitionId,
            UUID vesselId,
            UUID snapshotId
    ) {
        return new AcceptedImportRequest(
                plan.artifactId(),
                plan.artifact().artifactIdentity().digest(),
                "contract-test",
                List.of(vessel(
                        definitionDigest,
                        IdentityContracts.sha256(snapshotText.getBytes(StandardCharsets.UTF_8)),
                        displayName,
                        definitionId,
                        vesselId,
                        snapshotId
                ))
        );
    }

    private static AcceptedVesselCandidate vessel(
            Sha256Digest definitionDigest,
            Sha256Digest snapshotDigest,
            String displayName,
            UUID definitionId,
            UUID vesselId,
            UUID snapshotId
    ) {
        return new AcceptedVesselCandidate(
                definitionId,
                vesselId,
                snapshotId,
                definitionDigest,
                snapshotDigest,
                42,
                displayName,
                "1.0.0",
                "Player",
                "Scout",
                1,
                Instant.parse("2026-07-17T00:00:00Z")
        );
    }

    private static int count(WorldPaths paths, String table) throws Exception {
        requireDriver();
        if (!List.of("submarine_definition", "vessel_instance", "vessel_snapshot").contains(table)) {
            throw new IllegalArgumentException("Unsupported contract table " + table);
        }
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COUNT(*) FROM " + table)) {
            return result.next() ? result.getInt(1) : 0;
        }
    }

    private static boolean imported(WorldPaths paths, UUID artifactId) throws Exception {
        requireDriver();
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT imported_at FROM import_artifact WHERE artifact_id = ?")) {
            statement.setString(1, artifactId.toString());
            try (ResultSet result = statement.executeQuery()) {
                return result.next() && result.getString(1) != null;
            }
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
            verifyContract();
            System.out.println("Barotrauma SQLite planning and accepted-import contracts passed.");
            return;
        }
        System.err.println("Usage: AcceptedImportTransaction --verify");
        System.exit(2);
    }
}
