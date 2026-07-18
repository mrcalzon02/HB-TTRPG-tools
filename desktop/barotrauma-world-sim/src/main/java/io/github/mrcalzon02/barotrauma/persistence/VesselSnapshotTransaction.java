package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.domain.identity.IdentityContracts;
import io.github.mrcalzon02.barotrauma.domain.identity.IdentityContracts.Sha256Digest;
import io.github.mrcalzon02.barotrauma.domain.identity.IdentityContracts.SourceArtifactIdentity;
import io.github.mrcalzon02.barotrauma.persistence.AcceptedImportTransaction.AcceptedImportRequest;
import io.github.mrcalzon02.barotrauma.persistence.AcceptedImportTransaction.AcceptedVesselCandidate;
import io.github.mrcalzon02.barotrauma.persistence.AcceptedImportTransaction.CommitResult;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.DefinitionCandidate;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.ImportPlan;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.InspectionCandidate;
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
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Appends explicitly associated source snapshots to existing physical vessels.
 *
 * <p>Canonical definition equality is mandatory. Newer source states may become current. Older,
 * equal-time, or unknown-time states are never promoted automatically and require an explicit
 * historical-retention policy. The complete multi-vessel operation is transactional.</p>
 */
public final class VesselSnapshotTransaction {

    private VesselSnapshotTransaction() {
    }

    public static SnapshotCommitResult commit(WorldPaths paths, SnapshotImportRequest request)
            throws IOException, SQLException {
        Objects.requireNonNull(paths, "paths");
        Objects.requireNonNull(request, "request");
        requireDriver();

        try (WorldLock ignored = WorldStorageContracts.acquireExclusiveLock(paths);
             Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configure(connection);
            verifySchema(connection);
            return commit(connection, request);
        }
    }

    private static SnapshotCommitResult commit(Connection connection, SnapshotImportRequest request)
            throws SQLException {
        boolean originalAutoCommit = connection.getAutoCommit();
        connection.setAutoCommit(false);
        try {
            ArtifactEvidence artifact = requirePendingOfficialArtifact(connection, request);
            Instant committedAt = Instant.now();
            List<SnapshotAttachmentResult> results = new ArrayList<>();
            int promoted = 0;
            int historical = 0;
            int skipped = 0;

            for (SnapshotAttachment attachment : request.attachments()) {
                VesselEvidence vessel = requireVessel(connection, attachment.vesselId());
                if (!vessel.canonicalDefinitionDigest().equals(attachment.canonicalDefinitionDigest())) {
                    throw new SQLException("Source definition does not match vessel " + attachment.vesselId()
                            + "; explicit association cannot override structural identity.");
                }

                ExistingSnapshot duplicate = findSnapshot(connection, attachment.vesselId(), attachment.snapshotDigest());
                if (duplicate != null) {
                    skipped++;
                    results.add(new SnapshotAttachmentResult(
                            attachment.vesselId(),
                            duplicate.snapshotId(),
                            SnapshotAction.SKIPPED_EXACT_SNAPSHOT,
                            duplicate.current(),
                            vessel.displayName(),
                            attachment.snapshotDigest(),
                            attachment.sourceTimestamp()
                    ));
                    continue;
                }

                ChronologyDecision decision = decideChronology(vessel.currentSnapshot(), attachment);
                UUID snapshotId = attachment.snapshotId() == null ? UUID.randomUUID() : attachment.snapshotId();
                boolean current;

                if (decision == ChronologyDecision.PROMOTE_TO_CURRENT) {
                    clearCurrentSnapshot(connection, attachment.vesselId());
                    current = true;
                    promoted++;
                } else if (decision == ChronologyDecision.INSERT_AS_FIRST_CURRENT) {
                    current = true;
                    promoted++;
                } else {
                    current = false;
                    historical++;
                }

                insertSnapshot(connection, snapshotId, request.artifactId(), attachment, committedAt, current);
                results.add(new SnapshotAttachmentResult(
                        attachment.vesselId(),
                        snapshotId,
                        current ? SnapshotAction.PROMOTED_CURRENT : SnapshotAction.RETAINED_HISTORICAL,
                        current,
                        vessel.displayName(),
                        attachment.snapshotDigest(),
                        attachment.sourceTimestamp()
                ));
            }

            markArtifactImported(connection, request.artifactId(), committedAt);
            insertAudit(connection, request.actor(), request.artifactId(), artifact.sourceName(), promoted, historical, skipped);
            connection.commit();
            return new SnapshotCommitResult(
                    request.artifactId(),
                    committedAt,
                    promoted,
                    historical,
                    skipped,
                    List.copyOf(results)
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

    private static ChronologyDecision decideChronology(
            CurrentSnapshot current,
            SnapshotAttachment attachment
    ) throws SQLException {
        if (current == null) return ChronologyDecision.INSERT_AS_FIRST_CURRENT;

        Instant incomingTime = attachment.sourceTimestamp();
        Instant currentTime = current.sourceTimestamp();
        if (incomingTime != null && currentTime != null && incomingTime.isAfter(currentTime)) {
            return ChronologyDecision.PROMOTE_TO_CURRENT;
        }

        if (attachment.nonNewerPolicy() == NonNewerPolicy.RETAIN_HISTORICAL) {
            return ChronologyDecision.INSERT_HISTORICAL;
        }

        String relation;
        if (incomingTime == null || currentTime == null) {
            relation = "chronology is unknown because one source timestamp is absent";
        } else if (incomingTime.equals(currentTime)) {
            relation = "the source timestamp equals the current snapshot timestamp";
        } else {
            relation = "the source is older than the current snapshot";
        }
        throw new SQLException("Snapshot was not attached because " + relation
                + ". Choose RETAIN_HISTORICAL after reviewing the source.");
    }

    private static ArtifactEvidence requirePendingOfficialArtifact(
            Connection connection,
            SnapshotImportRequest request
    ) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT sha256, source_name, source_kind, imported_at FROM import_artifact WHERE artifact_id = ?")) {
            statement.setString(1, request.artifactId().toString());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) {
                    throw new SQLException("Snapshot import references an inspection artifact that does not exist.");
                }
                if (!result.getString("sha256").equals(request.artifactDigest().value())) {
                    throw new SQLException("Snapshot source SHA-256 does not match its inspection record.");
                }
                if (result.getString("imported_at") != null) {
                    throw new SQLException("The inspected source has already been imported.");
                }
                String kind = result.getString("source_kind");
                if (!kind.equals(SourceKind.OFFICIAL_CAMPAIGN_SAVE.databaseValue())
                        && !kind.equals(SourceKind.OFFICIAL_SUBMARINE.databaseValue())) {
                    throw new SQLException("Snapshot attachment accepts official .save and .sub sources only.");
                }
                return new ArtifactEvidence(result.getString("source_name"));
            }
        }
    }

    private static VesselEvidence requireVessel(Connection connection, UUID vesselId) throws SQLException {
        String sql = "SELECT v.display_name, d.canonical_xml_sha256, "
                + "s.snapshot_id, s.snapshot_sha256, s.source_timestamp, s.imported_at "
                + "FROM vessel_instance v "
                + "JOIN submarine_definition d ON d.definition_id = v.definition_id "
                + "LEFT JOIN vessel_snapshot s ON s.vessel_id = v.vessel_id AND s.is_current = 1 "
                + "WHERE v.vessel_id = ?";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, vesselId.toString());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Target vessel does not exist: " + vesselId);
                String snapshotId = result.getString("snapshot_id");
                CurrentSnapshot current = snapshotId == null ? null : new CurrentSnapshot(
                        UUID.fromString(snapshotId),
                        new Sha256Digest(result.getString("snapshot_sha256")),
                        parseInstant(result.getString("source_timestamp")),
                        parseInstant(result.getString("imported_at"))
                );
                return new VesselEvidence(
                        vesselId,
                        result.getString("display_name"),
                        new Sha256Digest(result.getString("canonical_xml_sha256")),
                        current
                );
            }
        }
    }

    private static ExistingSnapshot findSnapshot(
            Connection connection,
            UUID vesselId,
            Sha256Digest digest
    ) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT snapshot_id, is_current FROM vessel_snapshot WHERE vessel_id = ? AND snapshot_sha256 = ?")) {
            statement.setString(1, vesselId.toString());
            statement.setString(2, digest.value());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) return null;
                return new ExistingSnapshot(
                        UUID.fromString(result.getString("snapshot_id")),
                        result.getInt("is_current") == 1
                );
            }
        }
    }

    private static void clearCurrentSnapshot(Connection connection, UUID vesselId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "UPDATE vessel_snapshot SET is_current = 0 WHERE vessel_id = ? AND is_current = 1")) {
            statement.setString(1, vesselId.toString());
            statement.executeUpdate();
        }
    }

    private static void insertSnapshot(
            Connection connection,
            UUID snapshotId,
            UUID artifactId,
            SnapshotAttachment attachment,
            Instant committedAt,
            boolean current
    ) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO vessel_snapshot(snapshot_id, vessel_id, snapshot_sha256, source_timestamp, "
                        + "imported_at, source_artifact_id, is_current) VALUES (?, ?, ?, ?, ?, ?, ?)")) {
            statement.setString(1, snapshotId.toString());
            statement.setString(2, attachment.vesselId().toString());
            statement.setString(3, attachment.snapshotDigest().value());
            if (attachment.sourceTimestamp() == null) statement.setNull(4, Types.VARCHAR);
            else statement.setString(4, attachment.sourceTimestamp().toString());
            statement.setString(5, committedAt.toString());
            statement.setString(6, artifactId.toString());
            statement.setInt(7, current ? 1 : 0);
            statement.executeUpdate();
        }
    }

    private static void markArtifactImported(Connection connection, UUID artifactId, Instant committedAt)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "UPDATE import_artifact SET imported_at = ? WHERE artifact_id = ? AND imported_at IS NULL")) {
            statement.setString(1, committedAt.toString());
            statement.setString(2, artifactId.toString());
            if (statement.executeUpdate() != 1) {
                throw new SQLException("The inspected source changed state before snapshot attachment could commit.");
            }
        }
    }

    private static void insertAudit(
            Connection connection,
            String actor,
            UUID artifactId,
            String sourceName,
            int promoted,
            int historical,
            int skipped
    ) throws SQLException {
        String details = "{\"sourceName\":\"" + json(sourceName)
                + "\",\"promoted\":" + promoted
                + ",\"historical\":" + historical
                + ",\"skippedExact\":" + skipped + "}";
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO audit_entry(occurred_at, actor, action, entity_type, entity_id, details_json) "
                        + "VALUES (?, ?, ?, ?, ?, ?)")) {
            statement.setString(1, Instant.now().toString());
            statement.setString(2, actor);
            statement.setString(3, "vessel_snapshots_attached");
            statement.setString(4, "import_artifact");
            statement.setString(5, artifactId.toString());
            statement.setString(6, details);
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
                throw new SQLException("Snapshot attachment requires database schema "
                        + WorldStorageContracts.DATABASE_SCHEMA_VERSION + "; found " + version + ".");
            }
        }
    }

    private static Instant parseInstant(String value) throws SQLException {
        if (value == null || value.isBlank()) return null;
        try {
            return Instant.parse(value);
        } catch (RuntimeException exception) {
            throw new SQLException("Stored timestamp is not a valid ISO-8601 instant: " + value, exception);
        }
    }

    private static void requireDriver() throws SQLException {
        try {
            Class.forName("org.sqlite.JDBC");
        } catch (ClassNotFoundException exception) {
            throw new SQLException("The Xerial SQLite JDBC driver is not available on the runtime classpath.", exception);
        }
    }

    private static String json(String value) {
        return value.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    public enum NonNewerPolicy {
        REJECT,
        RETAIN_HISTORICAL
    }

    public enum SnapshotAction {
        PROMOTED_CURRENT,
        RETAINED_HISTORICAL,
        SKIPPED_EXACT_SNAPSHOT
    }

    private enum ChronologyDecision {
        INSERT_AS_FIRST_CURRENT,
        PROMOTE_TO_CURRENT,
        INSERT_HISTORICAL
    }

    public record SnapshotImportRequest(
            UUID artifactId,
            Sha256Digest artifactDigest,
            String actor,
            List<SnapshotAttachment> attachments
    ) {
        public SnapshotImportRequest {
            Objects.requireNonNull(artifactId, "artifactId");
            Objects.requireNonNull(artifactDigest, "artifactDigest");
            actor = actor == null || actor.isBlank() ? "desktop-user" : actor.trim();
            attachments = List.copyOf(attachments);
            if (attachments.isEmpty()) {
                throw new IllegalArgumentException("Snapshot import requires at least one vessel attachment.");
            }
            Set<String> unique = new HashSet<>();
            for (SnapshotAttachment attachment : attachments) {
                String key = attachment.vesselId() + ":" + attachment.snapshotDigest().value();
                if (!unique.add(key)) {
                    throw new IllegalArgumentException("Snapshot import repeats the same vessel and snapshot identity.");
                }
            }
        }
    }

    public record SnapshotAttachment(
            UUID vesselId,
            UUID snapshotId,
            Sha256Digest canonicalDefinitionDigest,
            Sha256Digest snapshotDigest,
            Instant sourceTimestamp,
            NonNewerPolicy nonNewerPolicy
    ) {
        public SnapshotAttachment {
            Objects.requireNonNull(vesselId, "vesselId");
            Objects.requireNonNull(canonicalDefinitionDigest, "canonicalDefinitionDigest");
            Objects.requireNonNull(snapshotDigest, "snapshotDigest");
            Objects.requireNonNull(nonNewerPolicy, "nonNewerPolicy");
        }
    }

    public record SnapshotAttachmentResult(
            UUID vesselId,
            UUID snapshotId,
            SnapshotAction action,
            boolean current,
            String vesselDisplayName,
            Sha256Digest snapshotDigest,
            Instant sourceTimestamp
    ) {
    }

    public record SnapshotCommitResult(
            UUID artifactId,
            Instant committedAt,
            int promotedCurrent,
            int retainedHistorical,
            int skippedExact,
            List<SnapshotAttachmentResult> attachments
    ) {
        public SnapshotCommitResult {
            attachments = List.copyOf(attachments);
        }
    }

    private record ArtifactEvidence(String sourceName) {
    }

    private record VesselEvidence(
            UUID vesselId,
            String displayName,
            Sha256Digest canonicalDefinitionDigest,
            CurrentSnapshot currentSnapshot
    ) {
    }

    private record CurrentSnapshot(
            UUID snapshotId,
            Sha256Digest snapshotDigest,
            Instant sourceTimestamp,
            Instant importedAt
    ) {
    }

    private record ExistingSnapshot(UUID snapshotId, boolean current) {
    }

    public static void verifyContract() throws Exception {
        WorldVesselRegistry.verifyContract();
        Path root = Files.createTempDirectory("barotrauma-snapshot-transaction-");
        try {
            UUID worldId = UUID.fromString("77777777-8888-9999-aaaa-bbbbbbbbbbbb");
            WorldPaths paths = WorldStorageContracts.createWorld(root, "Snapshot Contract World", worldId);
            Sha256Digest definitionDigest = IdentityContracts.sha256("snapshot-definition".getBytes(StandardCharsets.UTF_8));

            ImportPlan initialPlan = recordSource(
                    paths,
                    "initial.sub",
                    "initial-artifact",
                    definitionDigest,
                    "Initial Boat"
            );
            Sha256Digest initialSnapshot = IdentityContracts.sha256("snapshot-1".getBytes(StandardCharsets.UTF_8));
            CommitResult initialCommit = AcceptedImportTransaction.commit(paths, new AcceptedImportRequest(
                    initialPlan.artifactId(),
                    initialPlan.artifact().artifactIdentity().digest(),
                    "contract",
                    List.of(new AcceptedVesselCandidate(
                            null,
                            UUID.fromString("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
                            null,
                            definitionDigest,
                            initialSnapshot,
                            10,
                            "Chronology Boat",
                            "1.0.0",
                            "Player",
                            "Scout",
                            1,
                            Instant.parse("2026-01-01T00:00:00Z")
                    ))
            ));
            UUID vesselId = initialCommit.vessels().get(0).vesselId();

            ImportPlan newerPlan = recordSource(paths, "newer.save", "newer-artifact", definitionDigest, "Chronology Boat");
            Sha256Digest newerDigest = IdentityContracts.sha256("snapshot-2".getBytes(StandardCharsets.UTF_8));
            SnapshotCommitResult newer = commit(paths, new SnapshotImportRequest(
                    newerPlan.artifactId(),
                    newerPlan.artifact().artifactIdentity().digest(),
                    "contract",
                    List.of(new SnapshotAttachment(
                            vesselId,
                            null,
                            definitionDigest,
                            newerDigest,
                            Instant.parse("2026-02-01T00:00:00Z"),
                            NonNewerPolicy.REJECT
                    ))
            ));
            require(newer.promotedCurrent() == 1 && newer.retainedHistorical() == 0,
                    "Newer source was not promoted to current.");

            ImportPlan olderPlan = recordSource(paths, "older.save", "older-artifact", definitionDigest, "Chronology Boat");
            Sha256Digest olderDigest = IdentityContracts.sha256("snapshot-older".getBytes(StandardCharsets.UTF_8));
            SnapshotCommitResult older = commit(paths, new SnapshotImportRequest(
                    olderPlan.artifactId(),
                    olderPlan.artifact().artifactIdentity().digest(),
                    "contract",
                    List.of(new SnapshotAttachment(
                            vesselId,
                            null,
                            definitionDigest,
                            olderDigest,
                            Instant.parse("2025-12-01T00:00:00Z"),
                            NonNewerPolicy.RETAIN_HISTORICAL
                    ))
            ));
            require(older.retainedHistorical() == 1 && older.promotedCurrent() == 0,
                    "Older source was not retained as historical.");

            RegistrySnapshotState state = registryState(paths, vesselId);
            require(state.snapshotCount() == 3, "Snapshot chronology did not retain all states.");
            require(state.currentDigest().equals(newerDigest), "Newer snapshot is not current.");

            ImportPlan rejectedPlan = recordSource(paths, "rejected.save", "rejected-artifact", definitionDigest, "Chronology Boat");
            try {
                commit(paths, new SnapshotImportRequest(
                        rejectedPlan.artifactId(),
                        rejectedPlan.artifact().artifactIdentity().digest(),
                        "contract",
                        List.of(new SnapshotAttachment(
                                vesselId,
                                null,
                                definitionDigest,
                                IdentityContracts.sha256("rejected-snapshot".getBytes(StandardCharsets.UTF_8)),
                                Instant.parse("2025-11-01T00:00:00Z"),
                                NonNewerPolicy.REJECT
                        ))
                ));
                throw new IllegalStateException("Older snapshot unexpectedly bypassed review policy.");
            } catch (SQLException expected) {
                require(expected.getMessage().contains("RETAIN_HISTORICAL"),
                        "Unexpected older-snapshot rejection message.");
            }
            require(!artifactImported(paths, rejectedPlan.artifactId()),
                    "Rejected snapshot source was incorrectly marked imported.");
            require(registryState(paths, vesselId).snapshotCount() == 3,
                    "Rejected snapshot changed chronology despite rollback.");

            ImportPlan mismatchPlan = recordSource(
                    paths,
                    "mismatch.sub",
                    "mismatch-artifact",
                    IdentityContracts.sha256("different-definition".getBytes(StandardCharsets.UTF_8)),
                    "Different Boat"
            );
            try {
                commit(paths, new SnapshotImportRequest(
                        mismatchPlan.artifactId(),
                        mismatchPlan.artifact().artifactIdentity().digest(),
                        "contract",
                        List.of(new SnapshotAttachment(
                                vesselId,
                                null,
                                IdentityContracts.sha256("different-definition".getBytes(StandardCharsets.UTF_8)),
                                IdentityContracts.sha256("mismatch-snapshot".getBytes(StandardCharsets.UTF_8)),
                                Instant.parse("2026-03-01T00:00:00Z"),
                                NonNewerPolicy.REJECT
                        ))
                ));
                throw new IllegalStateException("Mismatched definition unexpectedly attached to vessel.");
            } catch (SQLException expected) {
                require(expected.getMessage().contains("structural identity"),
                        "Unexpected structural-mismatch failure message.");
            }
        } finally {
            deleteTree(root);
        }
    }

    private static ImportPlan recordSource(
            WorldPaths paths,
            String sourceName,
            String artifactSeed,
            Sha256Digest definitionDigest,
            String displayName
    ) throws Exception {
        SourceArtifactIdentity artifact = new SourceArtifactIdentity(
                IdentityContracts.sha256(artifactSeed.getBytes(StandardCharsets.UTF_8)),
                artifactSeed.getBytes(StandardCharsets.UTF_8).length
        );
        try (SqliteWorldStore store = SqliteWorldStore.open(paths)) {
            return store.recordAndPlan(new InspectionCandidate(
                    artifact,
                    sourceName,
                    sourceName.endsWith(".sub") ? SourceKind.OFFICIAL_SUBMARINE : SourceKind.OFFICIAL_CAMPAIGN_SAVE,
                    Instant.parse("2026-01-01T00:00:00Z"),
                    List.of(new DefinitionCandidate(
                            definitionDigest,
                            10,
                            displayName,
                            "1.0.0",
                            "Player",
                            "Scout",
                            1
                    )),
                    List.of()
            ));
        }
    }

    private static RegistrySnapshotState registryState(WorldPaths paths, UUID vesselId) throws Exception {
        WorldVesselRegistry.RegistrySnapshot registry = WorldVesselRegistry.load(paths);
        List<WorldVesselRegistry.SnapshotRow> rows = registry.snapshots().stream()
                .filter(row -> row.vesselId().equals(vesselId))
                .toList();
        WorldVesselRegistry.SnapshotRow current = rows.stream()
                .filter(WorldVesselRegistry.SnapshotRow::current)
                .findFirst()
                .orElseThrow();
        return new RegistrySnapshotState(rows.size(), current.snapshotDigest());
    }

    private static boolean artifactImported(WorldPaths paths, UUID artifactId) throws Exception {
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
            for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    private record RegistrySnapshotState(int snapshotCount, Sha256Digest currentDigest) {
    }

    public static void main(String[] args) throws Exception {
        if (args.length == 1 && args[0].equals("--verify")) {
            verifyContract();
            System.out.println("Barotrauma vessel snapshot chronology contracts passed.");
            return;
        }
        System.err.println("Usage: VesselSnapshotTransaction --verify");
        System.exit(2);
    }
}
