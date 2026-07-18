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
import io.github.mrcalzon02.barotrauma.persistence.VesselSnapshotTransaction.NonNewerPolicy;
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
 * Atomically maps every submarine payload in one inspected campaign archive.
 *
 * <p>Each payload is explicitly assigned either to a new physical vessel or to one existing
 * vessel. Existing-vessel targets must have the same canonical definition and may appear only once
 * in a request. Any invalid row rolls back the complete archive import.</p>
 */
public final class CampaignArchiveImportTransaction {

    private CampaignArchiveImportTransaction() {
    }

    public static ArchiveCommitResult commit(WorldPaths paths, ArchiveImportRequest request)
            throws IOException, SQLException {
        Objects.requireNonNull(paths, "paths");
        Objects.requireNonNull(request, "request");
        requireDriver();
        try (WorldLock ignored = WorldStorageContracts.acquireExclusiveLock(paths);
             Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configure(connection);
            verifySchema(connection);
            UUID worldId = readWorldId(connection);
            return commit(connection, worldId, request);
        }
    }

    private static ArchiveCommitResult commit(Connection connection, UUID worldId, ArchiveImportRequest request)
            throws SQLException {
        boolean originalAutoCommit = connection.getAutoCommit();
        connection.setAutoCommit(false);
        try {
            ArtifactEvidence artifact = requirePendingCampaignArtifact(connection, request);
            Instant committedAt = Instant.now();
            List<MappingResult> results = new ArrayList<>();
            int definitionsCreated = 0;
            int definitionsReused = 0;
            int vesselsCreated = 0;
            int snapshotsPromoted = 0;
            int snapshotsHistorical = 0;
            int snapshotsSkipped = 0;

            for (CampaignMapping mapping : request.mappings().stream()
                    .sorted(Comparator.comparingInt(CampaignMapping::sourceOrdinal)).toList()) {
                if (mapping.mode() == MappingMode.CREATE_NEW_VESSEL) {
                    DefinitionResolution definition = resolveDefinition(connection, request.artifactId(), mapping);
                    if (definition.created()) definitionsCreated++; else definitionsReused++;
                    UUID vesselId = mapping.vesselId() == null ? UUID.randomUUID() : mapping.vesselId();
                    UUID snapshotId = mapping.snapshotId() == null ? UUID.randomUUID() : mapping.snapshotId();
                    String displayName = mapping.displayName().isBlank()
                            ? "Imported submarine " + vesselId.toString().substring(0, 8)
                            : mapping.displayName();
                    insertVessel(connection, vesselId, worldId, definition.definitionId(), displayName, committedAt);
                    insertSnapshot(connection, snapshotId, vesselId, mapping.snapshotDigest(),
                            mapping.sourceTimestamp(), committedAt, request.artifactId(), true);
                    vesselsCreated++;
                    snapshotsPromoted++;
                    results.add(new MappingResult(mapping.sourceOrdinal(), MappingAction.CREATED_NEW_VESSEL,
                            vesselId, snapshotId, definition.definitionId(), displayName, true));
                    continue;
                }

                VesselEvidence vessel = requireVessel(connection, mapping.targetVesselId());
                if (!vessel.canonicalDefinitionDigest().equals(mapping.canonicalDefinitionDigest())) {
                    throw new SQLException("Campaign payload " + mapping.sourceOrdinal()
                            + " does not match the canonical definition of vessel " + mapping.targetVesselId() + ".");
                }
                ExistingSnapshot duplicate = findSnapshot(connection, vessel.vesselId(), mapping.snapshotDigest());
                if (duplicate != null) {
                    snapshotsSkipped++;
                    results.add(new MappingResult(mapping.sourceOrdinal(), MappingAction.SKIPPED_EXACT_SNAPSHOT,
                            vessel.vesselId(), duplicate.snapshotId(), vessel.definitionId(), vessel.displayName(),
                            duplicate.current()));
                    continue;
                }

                ChronologyDecision decision = decideChronology(vessel.currentSnapshot(), mapping);
                UUID snapshotId = mapping.snapshotId() == null ? UUID.randomUUID() : mapping.snapshotId();
                boolean makeCurrent = decision != ChronologyDecision.INSERT_HISTORICAL;
                if (decision == ChronologyDecision.PROMOTE_TO_CURRENT) clearCurrentSnapshot(connection, vessel.vesselId());
                insertSnapshot(connection, snapshotId, vessel.vesselId(), mapping.snapshotDigest(),
                        mapping.sourceTimestamp(), committedAt, request.artifactId(), makeCurrent);
                if (makeCurrent) snapshotsPromoted++; else snapshotsHistorical++;
                results.add(new MappingResult(mapping.sourceOrdinal(),
                        makeCurrent ? MappingAction.PROMOTED_EXISTING_VESSEL : MappingAction.RETAINED_HISTORICAL,
                        vessel.vesselId(), snapshotId, vessel.definitionId(), vessel.displayName(), makeCurrent));
            }

            markArtifactImported(connection, request.artifactId(), committedAt);
            insertAudit(connection, request.actor(), request.artifactId(), artifact.sourceName(), results,
                    definitionsCreated, definitionsReused, vesselsCreated, snapshotsPromoted,
                    snapshotsHistorical, snapshotsSkipped);
            connection.commit();
            return new ArchiveCommitResult(request.artifactId(), committedAt, definitionsCreated,
                    definitionsReused, vesselsCreated, snapshotsPromoted, snapshotsHistorical,
                    snapshotsSkipped, List.copyOf(results));
        } catch (SQLException | RuntimeException exception) {
            try { connection.rollback(); } catch (SQLException rollbackFailure) { exception.addSuppressed(rollbackFailure); }
            throw exception;
        } finally {
            connection.setAutoCommit(originalAutoCommit);
        }
    }

    private static ArtifactEvidence requirePendingCampaignArtifact(Connection connection, ArchiveImportRequest request)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT sha256, source_name, source_kind, imported_at FROM import_artifact WHERE artifact_id = ?")) {
            statement.setString(1, request.artifactId().toString());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Campaign mapping references an unknown inspection artifact.");
                if (!result.getString("sha256").equals(request.artifactDigest().value())) {
                    throw new SQLException("Campaign source SHA-256 does not match its inspection record.");
                }
                if (result.getString("imported_at") != null) {
                    throw new SQLException("The inspected campaign source has already been imported.");
                }
                if (!result.getString("source_kind").equals(SourceKind.OFFICIAL_CAMPAIGN_SAVE.databaseValue())) {
                    throw new SQLException("Campaign mapping accepts official .save archives only.");
                }
                return new ArtifactEvidence(result.getString("source_name"));
            }
        }
    }

    private static DefinitionResolution resolveDefinition(Connection connection, UUID artifactId, CampaignMapping mapping)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT definition_id FROM submarine_definition WHERE canonical_xml_sha256 = ?")) {
            statement.setString(1, mapping.canonicalDefinitionDigest().value());
            try (ResultSet result = statement.executeQuery()) {
                if (result.next()) return new DefinitionResolution(UUID.fromString(result.getString(1)), false);
            }
        }
        UUID definitionId = mapping.definitionId() == null ? UUID.randomUUID() : mapping.definitionId();
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO submarine_definition(definition_id, canonical_xml_sha256, official_check_value, "
                        + "display_name, game_version, submarine_type, submarine_class, tier, source_artifact_id) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")) {
            statement.setString(1, definitionId.toString());
            statement.setString(2, mapping.canonicalDefinitionDigest().value());
            if (mapping.officialCheckValue() == null) statement.setNull(3, Types.INTEGER);
            else statement.setInt(3, mapping.officialCheckValue());
            statement.setString(4, mapping.displayName());
            statement.setString(5, emptyToNull(mapping.gameVersion()));
            statement.setString(6, emptyToNull(mapping.submarineType()));
            statement.setString(7, emptyToNull(mapping.submarineClass()));
            if (mapping.tier() == null) statement.setNull(8, Types.INTEGER); else statement.setInt(8, mapping.tier());
            statement.setString(9, artifactId.toString());
            statement.executeUpdate();
        }
        return new DefinitionResolution(definitionId, true);
    }

    private static VesselEvidence requireVessel(Connection connection, UUID vesselId) throws SQLException {
        String sql = "SELECT v.vessel_id, v.definition_id, v.display_name, d.canonical_xml_sha256, "
                + "s.snapshot_id, s.snapshot_sha256, s.source_timestamp, s.imported_at "
                + "FROM vessel_instance v JOIN submarine_definition d ON d.definition_id = v.definition_id "
                + "LEFT JOIN vessel_snapshot s ON s.vessel_id = v.vessel_id AND s.is_current = 1 "
                + "WHERE v.vessel_id = ?";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, vesselId.toString());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Mapped existing vessel does not exist: " + vesselId);
                String currentId = result.getString("snapshot_id");
                CurrentSnapshot current = currentId == null ? null : new CurrentSnapshot(
                        UUID.fromString(currentId), new Sha256Digest(result.getString("snapshot_sha256")),
                        parseInstant(result.getString("source_timestamp")), parseInstant(result.getString("imported_at")));
                return new VesselEvidence(UUID.fromString(result.getString("vessel_id")),
                        UUID.fromString(result.getString("definition_id")), result.getString("display_name"),
                        new Sha256Digest(result.getString("canonical_xml_sha256")), current);
            }
        }
    }

    private static ChronologyDecision decideChronology(CurrentSnapshot current, CampaignMapping mapping)
            throws SQLException {
        if (current == null) return ChronologyDecision.INSERT_AS_FIRST_CURRENT;
        Instant incoming = mapping.sourceTimestamp();
        Instant existing = current.sourceTimestamp();
        if (incoming != null && existing != null && incoming.isAfter(existing)) {
            return ChronologyDecision.PROMOTE_TO_CURRENT;
        }
        if (mapping.nonNewerPolicy() == NonNewerPolicy.RETAIN_HISTORICAL) {
            return ChronologyDecision.INSERT_HISTORICAL;
        }
        String reason = incoming == null || existing == null
                ? "chronology is unknown because one source timestamp is absent"
                : incoming.equals(existing) ? "the source timestamp equals the current snapshot timestamp"
                : "the source is older than the current snapshot";
        throw new SQLException("Campaign payload " + mapping.sourceOrdinal() + " was not attached because "
                + reason + ". Select RETAIN_HISTORICAL after review.");
    }

    private static ExistingSnapshot findSnapshot(Connection connection, UUID vesselId, Sha256Digest digest)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT snapshot_id, is_current FROM vessel_snapshot WHERE vessel_id = ? AND snapshot_sha256 = ?")) {
            statement.setString(1, vesselId.toString());
            statement.setString(2, digest.value());
            try (ResultSet result = statement.executeQuery()) {
                return result.next() ? new ExistingSnapshot(UUID.fromString(result.getString(1)), result.getInt(2) == 1) : null;
            }
        }
    }

    private static void insertVessel(Connection connection, UUID vesselId, UUID worldId, UUID definitionId,
                                     String displayName, Instant createdAt) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO vessel_instance(vessel_id, world_id, definition_id, display_name, created_at) VALUES (?, ?, ?, ?, ?)")) {
            statement.setString(1, vesselId.toString());
            statement.setString(2, worldId.toString());
            statement.setString(3, definitionId.toString());
            statement.setString(4, displayName);
            statement.setString(5, createdAt.toString());
            statement.executeUpdate();
        }
    }

    private static void insertSnapshot(Connection connection, UUID snapshotId, UUID vesselId, Sha256Digest digest,
                                       Instant sourceTime, Instant importedAt, UUID artifactId, boolean current)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO vessel_snapshot(snapshot_id, vessel_id, snapshot_sha256, source_timestamp, imported_at, "
                        + "source_artifact_id, is_current) VALUES (?, ?, ?, ?, ?, ?, ?)")) {
            statement.setString(1, snapshotId.toString());
            statement.setString(2, vesselId.toString());
            statement.setString(3, digest.value());
            if (sourceTime == null) statement.setNull(4, Types.VARCHAR); else statement.setString(4, sourceTime.toString());
            statement.setString(5, importedAt.toString());
            statement.setString(6, artifactId.toString());
            statement.setInt(7, current ? 1 : 0);
            statement.executeUpdate();
        }
    }

    private static void clearCurrentSnapshot(Connection connection, UUID vesselId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "UPDATE vessel_snapshot SET is_current = 0 WHERE vessel_id = ? AND is_current = 1")) {
            statement.setString(1, vesselId.toString());
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
                throw new SQLException("The campaign source changed state before archive mapping could commit.");
            }
        }
    }

    private static void insertAudit(Connection connection, String actor, UUID artifactId, String sourceName,
                                    List<MappingResult> results, int definitionsCreated, int definitionsReused,
                                    int vesselsCreated, int promoted, int historical, int skipped) throws SQLException {
        String details = "{\"sourceName\":\"" + json(sourceName) + "\",\"rows\":" + results.size()
                + ",\"definitionsCreated\":" + definitionsCreated + ",\"definitionsReused\":" + definitionsReused
                + ",\"vesselsCreated\":" + vesselsCreated + ",\"promoted\":" + promoted
                + ",\"historical\":" + historical + ",\"skipped\":" + skipped + "}";
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO audit_entry(occurred_at, actor, action, entity_type, entity_id, details_json) VALUES (?, ?, ?, ?, ?, ?)")) {
            statement.setString(1, Instant.now().toString());
            statement.setString(2, actor);
            statement.setString(3, "campaign_archive_mapped");
            statement.setString(4, "import_artifact");
            statement.setString(5, artifactId.toString());
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
                throw new SQLException("Campaign mapping requires database schema "
                        + WorldStorageContracts.DATABASE_SCHEMA_VERSION + "; found " + version + ".");
            }
        }
    }

    private static Instant parseInstant(String value) throws SQLException {
        if (value == null || value.isBlank()) return null;
        try { return Instant.parse(value); }
        catch (RuntimeException exception) { throw new SQLException("Invalid stored timestamp: " + value, exception); }
    }

    private static void requireDriver() throws SQLException {
        try { Class.forName("org.sqlite.JDBC"); }
        catch (ClassNotFoundException exception) { throw new SQLException("SQLite JDBC driver is unavailable.", exception); }
    }

    private static String emptyToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private static String json(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t");
    }

    public enum MappingMode { CREATE_NEW_VESSEL, ATTACH_EXISTING_VESSEL }
    public enum MappingAction { CREATED_NEW_VESSEL, PROMOTED_EXISTING_VESSEL, RETAINED_HISTORICAL, SKIPPED_EXACT_SNAPSHOT }
    private enum ChronologyDecision { INSERT_AS_FIRST_CURRENT, PROMOTE_TO_CURRENT, INSERT_HISTORICAL }

    public record ArchiveImportRequest(UUID artifactId, Sha256Digest artifactDigest, String actor,
                                       List<CampaignMapping> mappings) {
        public ArchiveImportRequest {
            Objects.requireNonNull(artifactId, "artifactId");
            Objects.requireNonNull(artifactDigest, "artifactDigest");
            actor = actor == null || actor.isBlank() ? "desktop-user" : actor.trim();
            mappings = List.copyOf(mappings);
            if (mappings.isEmpty()) throw new IllegalArgumentException("Campaign import requires at least one mapping.");
            Set<Integer> ordinals = new HashSet<>();
            Set<UUID> targets = new HashSet<>();
            Set<UUID> specifiedVessels = new HashSet<>();
            Set<UUID> specifiedSnapshots = new HashSet<>();
            for (CampaignMapping mapping : mappings) {
                if (!ordinals.add(mapping.sourceOrdinal())) throw new IllegalArgumentException("Duplicate source ordinal.");
                if (mapping.mode() == MappingMode.ATTACH_EXISTING_VESSEL && !targets.add(mapping.targetVesselId())) {
                    throw new IllegalArgumentException("An existing vessel may be targeted only once per campaign archive.");
                }
                if (mapping.vesselId() != null && !specifiedVessels.add(mapping.vesselId())) {
                    throw new IllegalArgumentException("Duplicate requested vessel ID.");
                }
                if (mapping.snapshotId() != null && !specifiedSnapshots.add(mapping.snapshotId())) {
                    throw new IllegalArgumentException("Duplicate requested snapshot ID.");
                }
            }
        }
    }

    public record CampaignMapping(int sourceOrdinal, MappingMode mode, UUID targetVesselId,
                                  UUID definitionId, UUID vesselId, UUID snapshotId,
                                  Sha256Digest canonicalDefinitionDigest, Sha256Digest snapshotDigest,
                                  Integer officialCheckValue, String displayName, String gameVersion,
                                  String submarineType, String submarineClass, Integer tier,
                                  Instant sourceTimestamp, NonNewerPolicy nonNewerPolicy) {
        public CampaignMapping {
            if (sourceOrdinal < 0) throw new IllegalArgumentException("Source ordinal must be non-negative.");
            Objects.requireNonNull(mode, "mode");
            Objects.requireNonNull(canonicalDefinitionDigest, "canonicalDefinitionDigest");
            Objects.requireNonNull(snapshotDigest, "snapshotDigest");
            displayName = displayName == null ? "" : displayName.trim();
            gameVersion = gameVersion == null ? "" : gameVersion.trim();
            submarineType = submarineType == null ? "" : submarineType.trim();
            submarineClass = submarineClass == null ? "" : submarineClass.trim();
            nonNewerPolicy = nonNewerPolicy == null ? NonNewerPolicy.REJECT : nonNewerPolicy;
            if (mode == MappingMode.ATTACH_EXISTING_VESSEL && targetVesselId == null) {
                throw new IllegalArgumentException("Existing-vessel mapping requires a target vessel.");
            }
            if (mode == MappingMode.CREATE_NEW_VESSEL && targetVesselId != null) {
                throw new IllegalArgumentException("New-vessel mapping cannot specify an existing target.");
            }
        }
    }

    public record MappingResult(int sourceOrdinal, MappingAction action, UUID vesselId, UUID snapshotId,
                                UUID definitionId, String displayName, boolean current) { }

    public record ArchiveCommitResult(UUID artifactId, Instant committedAt, int definitionsCreated,
                                      int definitionsReused, int vesselsCreated, int snapshotsPromoted,
                                      int snapshotsHistorical, int snapshotsSkipped,
                                      List<MappingResult> mappings) {
        public ArchiveCommitResult { mappings = List.copyOf(mappings); }
    }

    private record ArtifactEvidence(String sourceName) { }
    private record DefinitionResolution(UUID definitionId, boolean created) { }
    private record CurrentSnapshot(UUID snapshotId, Sha256Digest digest, Instant sourceTimestamp, Instant importedAt) { }
    private record VesselEvidence(UUID vesselId, UUID definitionId, String displayName,
                                  Sha256Digest canonicalDefinitionDigest, CurrentSnapshot currentSnapshot) { }
    private record ExistingSnapshot(UUID snapshotId, boolean current) { }

    public static void verifyContract() throws Exception {
        Path root = Files.createTempDirectory("barotrauma-campaign-map-");
        try {
            UUID worldId = UUID.fromString("81000000-0000-0000-0000-000000000001");
            WorldPaths paths = WorldStorageContracts.createWorld(root, "Campaign Mapping World", worldId);
            Sha256Digest existingDefinition = IdentityContracts.sha256("existing-def".getBytes(StandardCharsets.UTF_8));
            byte[] seedBytes = "seed-sub".getBytes(StandardCharsets.UTF_8);
            ImportPlan seedPlan;
            try (SqliteWorldStore store = SqliteWorldStore.open(paths)) {
                seedPlan = store.recordAndPlan(candidate(seedBytes, "seed.sub", SourceKind.OFFICIAL_SUBMARINE,
                        existingDefinition, "Existing Boat", Instant.parse("2026-07-01T00:00:00Z")));
            }
            UUID existingVesselId = UUID.fromString("81000000-0000-0000-0000-000000000010");
            AcceptedImportTransaction.commit(paths, new AcceptedImportRequest(seedPlan.artifactId(),
                    seedPlan.artifact().artifactIdentity().digest(), "campaign-test", List.of(new AcceptedVesselCandidate(
                    null, existingVesselId, null, existingDefinition,
                    IdentityContracts.sha256("old-state".getBytes(StandardCharsets.UTF_8)), 11,
                    "Existing Boat", "1.0", "Player", "Scout", 1,
                    Instant.parse("2026-07-01T00:00:00Z")))));

            Sha256Digest newDefinition = IdentityContracts.sha256("new-def".getBytes(StandardCharsets.UTF_8));
            byte[] campaignBytes = "campaign-one".getBytes(StandardCharsets.UTF_8);
            ImportPlan campaignPlan;
            try (SqliteWorldStore store = SqliteWorldStore.open(paths)) {
                campaignPlan = store.recordAndPlan(candidate(campaignBytes, "campaign.save",
                        SourceKind.OFFICIAL_CAMPAIGN_SAVE, newDefinition, "New Boat",
                        Instant.parse("2026-07-10T00:00:00Z")));
            }
            ArchiveCommitResult result = commit(paths, new ArchiveImportRequest(campaignPlan.artifactId(),
                    campaignPlan.artifact().artifactIdentity().digest(), "campaign-test", List.of(
                    mapping(0, MappingMode.CREATE_NEW_VESSEL, null, newDefinition, "New Boat",
                            "new-state-a", Instant.parse("2026-07-10T00:00:00Z"), NonNewerPolicy.REJECT),
                    mapping(1, MappingMode.CREATE_NEW_VESSEL, null, newDefinition, "New Boat Two",
                            "new-state-b", Instant.parse("2026-07-10T00:00:00Z"), NonNewerPolicy.REJECT),
                    mapping(2, MappingMode.ATTACH_EXISTING_VESSEL, existingVesselId, existingDefinition,
                            "Existing Boat", "existing-new", Instant.parse("2026-07-10T00:00:00Z"),
                            NonNewerPolicy.REJECT)
            )));
            require(result.vesselsCreated() == 2, "Campaign new-vessel count failed.");
            require(result.definitionsCreated() == 1 && result.definitionsReused() == 1,
                    "Campaign canonical-definition reuse failed.");
            require(result.snapshotsPromoted() == 3, "Campaign snapshot promotion count failed.");
            WorldVesselRegistry.RegistrySnapshot registry = WorldVesselRegistry.load(paths);
            require(registry.summary().definitions() == 2 && registry.summary().vessels() == 3,
                    "Campaign registry counts failed.");
            require(registry.summary().snapshots() == 4 && registry.summary().currentSnapshots() == 3,
                    "Campaign chronology counts failed.");

            byte[] rollbackBytes = "campaign-rollback".getBytes(StandardCharsets.UTF_8);
            ImportPlan rollbackPlan;
            try (SqliteWorldStore store = SqliteWorldStore.open(paths)) {
                rollbackPlan = store.recordAndPlan(candidate(rollbackBytes, "rollback.save",
                        SourceKind.OFFICIAL_CAMPAIGN_SAVE, newDefinition, "Rollback Boat",
                        Instant.parse("2026-07-11T00:00:00Z")));
            }
            int beforeVessels = WorldVesselRegistry.load(paths).summary().vessels();
            try {
                commit(paths, new ArchiveImportRequest(rollbackPlan.artifactId(),
                        rollbackPlan.artifact().artifactIdentity().digest(), "campaign-test", List.of(
                        mapping(0, MappingMode.CREATE_NEW_VESSEL, null, newDefinition, "Temporary Boat",
                                "temporary-state", Instant.parse("2026-07-11T00:00:00Z"), NonNewerPolicy.REJECT),
                        mapping(1, MappingMode.ATTACH_EXISTING_VESSEL, existingVesselId,
                                IdentityContracts.sha256("wrong-def".getBytes(StandardCharsets.UTF_8)),
                                "Mismatch", "mismatch-state", Instant.parse("2026-07-11T00:00:00Z"),
                                NonNewerPolicy.REJECT)
                )));
                throw new IllegalStateException("Mismatched campaign mapping unexpectedly committed.");
            } catch (SQLException expected) {
                require(expected.getMessage().contains("does not match"), "Unexpected rollback failure.");
            }
            require(WorldVesselRegistry.load(paths).summary().vessels() == beforeVessels,
                    "Campaign rollback left a partial vessel.");
            try (java.sql.Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
                 PreparedStatement statement = connection.prepareStatement(
                         "SELECT imported_at FROM import_artifact WHERE artifact_id = ?")) {
                statement.setString(1, rollbackPlan.artifactId().toString());
                try (ResultSet row = statement.executeQuery()) {
                    require(row.next() && row.getString(1) == null, "Rollback source was incorrectly marked imported.");
                }
            }
        } finally {
            deleteTree(root);
        }
    }

    private static InspectionCandidate candidate(byte[] bytes, String name, SourceKind kind,
                                                  Sha256Digest definition, String displayName, Instant inspectedAt) {
        return new InspectionCandidate(new SourceArtifactIdentity(IdentityContracts.sha256(bytes), bytes.length),
                name, kind, inspectedAt, List.of(new DefinitionCandidate(definition, 11, displayName,
                "1.0", "Player", "Scout", 1)), List.of());
    }

    private static CampaignMapping mapping(int ordinal, MappingMode mode, UUID target,
                                           Sha256Digest definition, String name, String snapshot,
                                           Instant sourceTime, NonNewerPolicy policy) {
        return new CampaignMapping(ordinal, mode, target, null, null, null, definition,
                IdentityContracts.sha256(snapshot.getBytes(StandardCharsets.UTF_8)), 11,
                name, "1.0", "Player", "Scout", 1, sourceTime, policy);
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
            VesselSnapshotTransaction.verifyContract();
            verifyContract();
            System.out.println("Barotrauma planning, vessel, chronology, and campaign mapping contracts passed.");
            return;
        }
        System.err.println("Usage: CampaignArchiveImportTransaction --verify");
        System.exit(2);
    }
}
