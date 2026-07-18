package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.compatibility.official.BarotraumaSaveInspector;
import io.github.mrcalzon02.barotrauma.compatibility.official.BarotraumaSaveInspector.CampaignInspection;
import io.github.mrcalzon02.barotrauma.compatibility.official.BarotraumaSaveInspector.StandaloneSubmarineInspection;
import io.github.mrcalzon02.barotrauma.compatibility.official.BarotraumaSaveInspector.SubmarineInspection;
import io.github.mrcalzon02.barotrauma.compatibility.web.WebSuiteV22Inspector.InspectionReport;
import io.github.mrcalzon02.barotrauma.domain.identity.IdentityContracts;
import io.github.mrcalzon02.barotrauma.domain.identity.IdentityContracts.Sha256Digest;
import io.github.mrcalzon02.barotrauma.domain.identity.IdentityContracts.SourceArtifactIdentity;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Properties;
import java.util.UUID;

/** Single-writer SQLite store for desktop-world metadata and import planning. */
public final class SqliteWorldStore implements AutoCloseable {
    private final WorldPaths paths;
    private final WorldLock worldLock;
    private final Connection connection;
    private boolean closed;

    private SqliteWorldStore(WorldPaths paths, WorldLock worldLock, Connection connection) {
        this.paths = paths;
        this.worldLock = worldLock;
        this.connection = connection;
    }

    public static SqliteWorldStore open(WorldPaths paths) throws IOException, SQLException {
        Objects.requireNonNull(paths, "paths");
        WorldLock lock = WorldStorageContracts.acquireExclusiveLock(paths);
        Connection database = null;
        try {
            requireDriver();
            database = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
            SqliteWorldStore store = new SqliteWorldStore(paths, lock, database);
            store.configureConnection();
            store.applyMigrations();
            store.ensureWorldMetadata();
            return store;
        } catch (IOException | SQLException | RuntimeException exception) {
            if (database != null) {
                try { database.close(); } catch (SQLException closeFailure) { exception.addSuppressed(closeFailure); }
            }
            try { lock.close(); } catch (IOException closeFailure) { exception.addSuppressed(closeFailure); }
            throw exception;
        }
    }

    public WorldPaths paths() {
        return paths;
    }

    public synchronized ImportPlan inspectAndPlan(InspectionReport report) throws SQLException {
        Objects.requireNonNull(report, "report");
        return recordAndPlan(new InspectionCandidate(
                report.artifactIdentity(), report.sourceName(), SourceKind.WEB_SUITE_V22,
                report.exportedAt(), List.of(), report.warnings()));
    }

    public synchronized ImportPlan inspectAndPlan(BarotraumaSaveInspector.Inspection inspection) throws SQLException {
        Objects.requireNonNull(inspection, "inspection");
        if (inspection instanceof CampaignInspection campaign) {
            return recordAndPlan(new InspectionCandidate(
                    campaign.artifactIdentity(), campaign.sourceName(), SourceKind.OFFICIAL_CAMPAIGN_SAVE,
                    campaign.saveTime(), campaign.submarines().stream().map(SqliteWorldStore::definition).toList(),
                    campaign.warnings()));
        }
        StandaloneSubmarineInspection standalone = (StandaloneSubmarineInspection) inspection;
        return recordAndPlan(new InspectionCandidate(
                standalone.artifactIdentity(), standalone.sourceName(), SourceKind.OFFICIAL_SUBMARINE,
                null, List.of(definition(standalone.submarine())), List.of()));
    }

    public synchronized ImportPlan recordAndPlan(InspectionCandidate candidate) throws SQLException {
        ensureOpen();
        Objects.requireNonNull(candidate, "candidate");
        ArtifactRecord existingArtifact = findArtifact(candidate.artifactIdentity().digest());
        if (existingArtifact != null) {
            return new ImportPlan(existingArtifact.artifactId(), ArtifactAction.SKIP_EXACT_ARTIFACT,
                    existingArtifact, List.of(), List.copyOf(candidate.warnings()));
        }

        boolean originalAutoCommit = connection.getAutoCommit();
        connection.setAutoCommit(false);
        try {
            Instant inspectedAt = Instant.now();
            UUID artifactId = UUID.randomUUID();
            insertArtifact(artifactId, candidate, inspectedAt);
            insertWarnings(artifactId, candidate.warnings());

            Map<String, DefinitionCandidate> uniqueDefinitions = new LinkedHashMap<>();
            for (DefinitionCandidate definition : candidate.definitions()) {
                uniqueDefinitions.putIfAbsent(definition.canonicalXmlDigest().value(), definition);
            }

            List<DefinitionPlan> definitionPlans = new ArrayList<>();
            for (DefinitionCandidate definition : uniqueDefinitions.values()) {
                ExistingDefinition existing = findDefinition(definition.canonicalXmlDigest());
                if (existing == null) {
                    definitionPlans.add(new DefinitionPlan(definition,
                            DefinitionAction.CREATE_NEW_DEFINITION_AFTER_APPROVAL, null,
                            "No matching canonical submarine definition exists in this desktop world."));
                } else {
                    definitionPlans.add(new DefinitionPlan(definition,
                            DefinitionAction.REUSE_EXISTING_DEFINITION_AFTER_APPROVAL, existing,
                            "Canonical submarine XML already exists; filename and display name do not create another definition."));
                }
            }

            insertAudit("desktop-import-inspector", "inspection_recorded", "import_artifact", artifactId.toString(),
                    "{\"sourceKind\":\"" + json(candidate.sourceKind().databaseValue())
                            + "\",\"definitionCandidates\":" + definitionPlans.size()
                            + ",\"warnings\":" + candidate.warnings().size() + "}");
            connection.commit();
            ArtifactRecord record = new ArtifactRecord(artifactId, candidate.artifactIdentity(), candidate.sourceName(),
                    candidate.sourceKind(), inspectedAt, null);
            return new ImportPlan(artifactId, ArtifactAction.RECORDED_INSPECTION_ONLY,
                    record, List.copyOf(definitionPlans), List.copyOf(candidate.warnings()));
        } catch (SQLException | RuntimeException exception) {
            try { connection.rollback(); } catch (SQLException rollbackFailure) { exception.addSuppressed(rollbackFailure); }
            throw exception;
        } finally {
            connection.setAutoCommit(originalAutoCommit);
        }
    }

    private void configureConnection() throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys = ON");
            statement.execute("PRAGMA busy_timeout = 5000");
            statement.execute("PRAGMA journal_mode = WAL");
            statement.execute("PRAGMA synchronous = FULL");
        }
    }

    private void applyMigrations() throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("CREATE TABLE IF NOT EXISTS schema_migration "
                    + "(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)");
        }
        int currentVersion = schemaVersion();
        if (currentVersion > WorldStorageContracts.DATABASE_SCHEMA_VERSION) {
            throw new SQLException("World database schema " + currentVersion
                    + " is newer than supported schema " + WorldStorageContracts.DATABASE_SCHEMA_VERSION + ".");
        }
        if (currentVersion < 1) {
            applyMigration(1, WorldStorageContracts.initialSchemaStatements(), true);
            currentVersion = 1;
        }
        if (currentVersion < 2) {
            applyMigration(2, WorldStorageContracts.schema002Statements(), false);
            currentVersion = 2;
        }
        if (currentVersion < 3) {
            applyMigration(3, WorldStorageContracts.schema003Statements(), false);
            currentVersion = 3;
        }
        if (currentVersion != WorldStorageContracts.DATABASE_SCHEMA_VERSION) {
            throw new SQLException("No migration path is defined from schema " + currentVersion + ".");
        }
    }

    private void applyMigration(int version, List<String> statements, boolean initial) throws SQLException {
        boolean originalAutoCommit = connection.getAutoCommit();
        connection.setAutoCommit(false);
        try (Statement statement = connection.createStatement()) {
            for (String sql : statements) {
                String normalized = sql.trim().toUpperCase();
                if (normalized.startsWith("PRAGMA ")) continue;
                if (initial && normalized.startsWith("CREATE TABLE SCHEMA_MIGRATION")) continue;
                statement.execute(sql);
            }
            try (PreparedStatement insert = connection.prepareStatement(
                    "INSERT INTO schema_migration(version, applied_at) VALUES (?, ?)")) {
                insert.setInt(1, version);
                insert.setString(2, Instant.now().toString());
                insert.executeUpdate();
            }
            connection.commit();
        } catch (SQLException exception) {
            try { connection.rollback(); } catch (SQLException rollbackFailure) { exception.addSuppressed(rollbackFailure); }
            throw exception;
        } finally {
            connection.setAutoCommit(originalAutoCommit);
        }
    }

    private void ensureWorldMetadata() throws IOException, SQLException {
        Properties metadata = new Properties();
        try (InputStream input = Files.newInputStream(paths.metadata())) {
            metadata.load(input);
        }
        String worldId = required(metadata, "worldId");
        String displayName = required(metadata, "displayName");
        String createdAt = required(metadata, "createdAt");
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT OR IGNORE INTO world_metadata(world_id, display_name, created_at) VALUES (?, ?, ?)")) {
            statement.setString(1, worldId);
            statement.setString(2, displayName);
            statement.setString(3, createdAt);
            statement.executeUpdate();
        }
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT display_name FROM world_metadata WHERE world_id = ?")) {
            statement.setString(1, worldId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("World metadata row could not be established.");
                if (!displayName.equals(result.getString(1))) {
                    throw new SQLException("World directory metadata does not match the database identity.");
                }
            }
        }
    }

    private ArtifactRecord findArtifact(Sha256Digest digest) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT artifact_id, byte_length, source_name, source_kind, inspected_at, imported_at "
                        + "FROM import_artifact WHERE sha256 = ?")) {
            statement.setString(1, digest.value());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) return null;
                SourceArtifactIdentity identity = new SourceArtifactIdentity(digest, result.getLong("byte_length"));
                String importedAt = result.getString("imported_at");
                return new ArtifactRecord(UUID.fromString(result.getString("artifact_id")), identity,
                        result.getString("source_name"),
                        SourceKind.fromDatabaseValue(result.getString("source_kind")),
                        Instant.parse(result.getString("inspected_at")),
                        importedAt == null ? null : Instant.parse(importedAt));
            }
        }
    }

    private ExistingDefinition findDefinition(Sha256Digest digest) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT definition_id, display_name, official_check_value FROM submarine_definition "
                        + "WHERE canonical_xml_sha256 = ?")) {
            statement.setString(1, digest.value());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) return null;
                Integer checkValue = result.getObject("official_check_value") == null
                        ? null : result.getInt("official_check_value");
                return new ExistingDefinition(UUID.fromString(result.getString("definition_id")),
                        result.getString("display_name"), checkValue);
            }
        }
    }

    private void insertArtifact(UUID artifactId, InspectionCandidate candidate, Instant inspectedAt) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO import_artifact(artifact_id, sha256, byte_length, source_name, source_kind, inspected_at) "
                        + "VALUES (?, ?, ?, ?, ?, ?)")) {
            statement.setString(1, artifactId.toString());
            statement.setString(2, candidate.artifactIdentity().digest().value());
            statement.setLong(3, candidate.artifactIdentity().byteLength());
            statement.setString(4, candidate.sourceName());
            statement.setString(5, candidate.sourceKind().databaseValue());
            statement.setString(6, inspectedAt.toString());
            statement.executeUpdate();
        }
    }

    private void insertWarnings(UUID artifactId, List<String> warnings) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO import_warning(warning_id, artifact_id, warning_code, warning_text) VALUES (?, ?, ?, ?)")) {
            for (String warning : warnings) {
                statement.setString(1, UUID.randomUUID().toString());
                statement.setString(2, artifactId.toString());
                statement.setString(3, "INSPECTION_WARNING");
                statement.setString(4, warning);
                statement.addBatch();
            }
            statement.executeBatch();
        }
    }

    private void insertAudit(String actor, String action, String entityType, String entityId, String detailsJson)
            throws SQLException {
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

    private static DefinitionCandidate definition(SubmarineInspection submarine) {
        return new DefinitionCandidate(submarine.definitionIdentity().canonicalXmlDigest(),
                submarine.equalityCheckValue(), submarine.name(), submarine.gameVersion(), submarine.type(),
                submarine.submarineClass(), submarine.tier());
    }

    private static void requireDriver() throws SQLException {
        try { Class.forName("org.sqlite.JDBC"); }
        catch (ClassNotFoundException exception) {
            throw new SQLException("The Xerial SQLite JDBC driver is not available on the runtime classpath.", exception);
        }
    }

    private void ensureOpen() throws SQLException {
        if (closed || connection.isClosed()) throw new SQLException("The desktop world store is closed.");
    }

    private static String required(Properties properties, String key) throws IOException {
        String value = properties.getProperty(key, "").trim();
        if (value.isEmpty()) throw new IOException("World metadata is missing required property " + key + ".");
        return value;
    }

    private static String json(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t");
    }

    @Override
    public synchronized void close() throws Exception {
        if (closed) return;
        closed = true;
        Exception failure = null;
        try { connection.close(); } catch (SQLException exception) { failure = exception; }
        try { worldLock.close(); } catch (IOException exception) {
            if (failure == null) failure = exception; else failure.addSuppressed(exception);
        }
        if (failure != null) throw failure;
    }

    public enum SourceKind {
        WEB_SUITE_V22("web-suite-v22"),
        OFFICIAL_CAMPAIGN_SAVE("official-campaign-save"),
        OFFICIAL_SUBMARINE("official-submarine");
        private final String databaseValue;
        SourceKind(String databaseValue) { this.databaseValue = databaseValue; }
        public String databaseValue() { return databaseValue; }
        static SourceKind fromDatabaseValue(String value) throws SQLException {
            for (SourceKind kind : values()) if (kind.databaseValue.equals(value)) return kind;
            throw new SQLException("Unknown stored import source kind: " + value);
        }
    }

    public enum ArtifactAction { RECORDED_INSPECTION_ONLY, SKIP_EXACT_ARTIFACT }
    public enum DefinitionAction { CREATE_NEW_DEFINITION_AFTER_APPROVAL, REUSE_EXISTING_DEFINITION_AFTER_APPROVAL }

    public record InspectionCandidate(SourceArtifactIdentity artifactIdentity, String sourceName,
                                      SourceKind sourceKind, Instant sourceTimestamp,
                                      List<DefinitionCandidate> definitions, List<String> warnings) {
        public InspectionCandidate {
            Objects.requireNonNull(artifactIdentity, "artifactIdentity");
            sourceName = Objects.requireNonNull(sourceName, "sourceName").trim();
            Objects.requireNonNull(sourceKind, "sourceKind");
            definitions = List.copyOf(definitions);
            warnings = List.copyOf(warnings);
            if (sourceName.isEmpty()) throw new IllegalArgumentException("Source name cannot be empty.");
        }
    }

    public record DefinitionCandidate(Sha256Digest canonicalXmlDigest, Integer officialCheckValue,
                                      String displayName, String gameVersion, String submarineType,
                                      String submarineClass, Integer tier) {
        public DefinitionCandidate {
            Objects.requireNonNull(canonicalXmlDigest, "canonicalXmlDigest");
            displayName = displayName == null ? "" : displayName.trim();
            gameVersion = gameVersion == null ? "" : gameVersion.trim();
            submarineType = submarineType == null ? "" : submarineType.trim();
            submarineClass = submarineClass == null ? "" : submarineClass.trim();
        }
    }

    public record ExistingDefinition(UUID definitionId, String displayName, Integer officialCheckValue) {}
    public record DefinitionPlan(DefinitionCandidate candidate, DefinitionAction action,
                                 ExistingDefinition existingDefinition, String explanation) {}
    public record ArtifactRecord(UUID artifactId, SourceArtifactIdentity artifactIdentity, String sourceName,
                                 SourceKind sourceKind, Instant inspectedAt, Instant importedAt) {}
    public record ImportPlan(UUID artifactId, ArtifactAction artifactAction, ArtifactRecord artifact,
                             List<DefinitionPlan> definitions, List<String> warnings) {
        public ImportPlan {
            definitions = List.copyOf(definitions);
            warnings = List.copyOf(warnings);
        }
        public boolean changesSimulationState() { return false; }
    }

    public static void verifyContract() throws Exception {
        requireDriver();
        Path root = Files.createTempDirectory("barotrauma-sqlite-world-");
        try {
            UUID worldId = UUID.fromString("22222222-3333-4444-5555-666666666666");
            WorldPaths paths = WorldStorageContracts.createWorld(root, "SQLite Contract World", worldId);
            try (SqliteWorldStore store = SqliteWorldStore.open(paths)) {
                Sha256Digest definitionDigest = IdentityContracts.sha256(
                        "canonical-submarine".getBytes(StandardCharsets.UTF_8));
                DefinitionCandidate definition = new DefinitionCandidate(
                        definitionDigest, 42, "Contract Boat", "1.0.0", "Player", "Scout", 1);
                InspectionCandidate first = new InspectionCandidate(
                        new SourceArtifactIdentity(IdentityContracts.sha256(
                                "artifact-one".getBytes(StandardCharsets.UTF_8)), 12),
                        "contract-one.sub", SourceKind.OFFICIAL_SUBMARINE,
                        Instant.parse("2026-07-17T00:00:00Z"), List.of(definition), List.of("fixture warning"));
                ImportPlan firstPlan = store.recordAndPlan(first);
                require(firstPlan.artifactAction() == ArtifactAction.RECORDED_INSPECTION_ONLY,
                        "First artifact was not recorded.");
                require(firstPlan.definitions().size() == 1
                                && firstPlan.definitions().get(0).action()
                                == DefinitionAction.CREATE_NEW_DEFINITION_AFTER_APPROVAL,
                        "Unknown definition did not produce a create recommendation.");
                ImportPlan duplicatePlan = store.recordAndPlan(first);
                require(duplicatePlan.artifactAction() == ArtifactAction.SKIP_EXACT_ARTIFACT,
                        "Exact artifact was not skipped.");
                store.seedDefinitionForVerification(firstPlan.artifactId(), definition);
                InspectionCandidate second = new InspectionCandidate(
                        new SourceArtifactIdentity(IdentityContracts.sha256(
                                "artifact-two".getBytes(StandardCharsets.UTF_8)), 12),
                        "renamed-contract-boat.sub", SourceKind.OFFICIAL_SUBMARINE,
                        null, List.of(definition), List.of());
                ImportPlan secondPlan = store.recordAndPlan(second);
                require(secondPlan.definitions().get(0).action()
                                == DefinitionAction.REUSE_EXISTING_DEFINITION_AFTER_APPROVAL,
                        "Renamed structural duplicate did not reuse the existing definition.");
                require(store.count("import_artifact") == 2, "Distinct artifacts were not recorded.");
                require(store.count("submarine_definition") == 1, "Unexpected definition count.");
                require(store.count("vessel_instance") == 0 && store.count("vessel_snapshot") == 0,
                        "Inspection planning created vessel state.");
                require(store.count("world_location") == 0 && store.count("world_station") == 0,
                        "Schema migration created normalized world data without an import.");
                require(store.count("simulation_command_receipt") == 0
                                && store.count("simulation_checkpoint") == 0,
                        "Schema migration created simulation evidence without commands.");
                require(store.schemaVersion() == 3, "Schema 003 migration was not recorded.");
            }
        } finally {
            deleteTree(root);
        }
    }

    private void seedDefinitionForVerification(UUID sourceArtifactId, DefinitionCandidate definition)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO submarine_definition(definition_id, canonical_xml_sha256, official_check_value, "
                        + "display_name, game_version, submarine_type, submarine_class, tier, source_artifact_id) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")) {
            statement.setString(1, UUID.randomUUID().toString());
            statement.setString(2, definition.canonicalXmlDigest().value());
            if (definition.officialCheckValue() == null) statement.setObject(3, null);
            else statement.setInt(3, definition.officialCheckValue());
            statement.setString(4, definition.displayName());
            statement.setString(5, definition.gameVersion());
            statement.setString(6, definition.submarineType());
            statement.setString(7, definition.submarineClass());
            if (definition.tier() == null) statement.setObject(8, null);
            else statement.setInt(8, definition.tier());
            statement.setString(9, sourceArtifactId.toString());
            statement.executeUpdate();
        }
    }

    private long count(String table) throws SQLException {
        if (!List.of("import_artifact", "submarine_definition", "vessel_instance", "vessel_snapshot",
                "import_warning", "world_location", "world_station", "world_import",
                "simulation_command_receipt", "simulation_checkpoint")
                .contains(table)) throw new IllegalArgumentException("Unsupported verification table.");
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COUNT(*) FROM " + table)) {
            return result.next() ? result.getLong(1) : 0;
        }
    }

    private int schemaVersion() throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COALESCE(MAX(version), 0) FROM schema_migration")) {
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
        if (args.length == 1 && "--verify".equals(args[0])) {
            verifyContract();
            System.out.println("Barotrauma SQLite world store contracts passed.");
            return;
        }
        System.err.println("Usage: SqliteWorldStore --verify");
        System.exit(2);
    }
}
