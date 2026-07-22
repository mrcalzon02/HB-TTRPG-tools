package io.github.mrcalzon02.barotrauma.persistence;

import java.io.Closeable;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.channels.FileLock;
import java.nio.channels.OverlappingFileLockException;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Pattern;

/** Dependency-free filesystem, locking, atomic-write, and database-schema contracts. */
public final class WorldStorageContracts {
    public static final int DATABASE_SCHEMA_VERSION = 32;
    private static final Pattern SAFE_SLUG = Pattern.compile("[a-z0-9]+(?:-[a-z0-9]+)*");

    static {
        RecursiveSqliteDriver.install();
    }

    private WorldStorageContracts() {}

    public static Path defaultWorldRoot() {
        String home = System.getProperty("user.home", ".");
        return Path.of(home, ".barotrauma-world-sim", "worlds").toAbsolutePath().normalize();
    }

    public static WorldPaths createWorld(Path root, String displayName, UUID worldId) throws IOException {
        Objects.requireNonNull(root, "root");
        Objects.requireNonNull(displayName, "displayName");
        Objects.requireNonNull(worldId, "worldId");
        String slug = slug(displayName);
        Path normalizedRoot = root.toAbsolutePath().normalize();
        Files.createDirectories(normalizedRoot);
        Path directory = normalizedRoot.resolve(slug + "-" + worldId).normalize();
        requireChild(normalizedRoot, directory);
        if (Files.exists(directory)) throw new IOException("Desktop world directory already exists: " + directory);

        WorldPaths paths = paths(directory);
        Files.createDirectories(paths.imports());
        Files.createDirectories(paths.attachments());
        Files.createDirectories(paths.backups());
        Files.createDirectories(paths.exports());
        Files.createDirectories(paths.logs());
        writeAtomic(paths.metadata(), metadata(displayName, worldId));
        return paths;
    }

    public static WorldPaths openWorld(Path directory) throws IOException {
        Objects.requireNonNull(directory, "directory");
        WorldPaths paths = paths(directory.toAbsolutePath().normalize());
        if (!Files.isDirectory(paths.root())) throw new IOException("Desktop world directory does not exist: " + paths.root());
        if (!Files.isRegularFile(paths.metadata())) throw new IOException("Desktop world metadata is missing: " + paths.metadata());
        for (Path required : List.of(paths.imports(), paths.attachments(), paths.backups(), paths.exports(), paths.logs())) {
            Files.createDirectories(required);
        }
        return paths;
    }

    public static WorldLock acquireExclusiveLock(WorldPaths paths) throws IOException {
        Objects.requireNonNull(paths, "paths");
        FileChannel channel = FileChannel.open(paths.lockFile(), StandardOpenOption.CREATE, StandardOpenOption.WRITE);
        try {
            FileLock lock = channel.tryLock();
            if (lock == null) {
                channel.close();
                throw new IOException("Desktop world is already open for writing: " + paths.root());
            }
            String owner = "pid=" + ProcessHandle.current().pid() + "\nopenedAt=" + Instant.now() + "\n";
            channel.truncate(0);
            channel.write(ByteBuffer.wrap(owner.getBytes(StandardCharsets.UTF_8)));
            channel.force(true);
            WorldLock result = new WorldLock(channel, lock, paths.lockFile());
            try {
                WorldDatabaseMigrations.migrateExistingDatabase(paths);
                return result;
            } catch (IOException | RuntimeException exception) {
                try { result.close(); } catch (IOException closeFailure) { exception.addSuppressed(closeFailure); }
                throw exception;
            }
        } catch (OverlappingFileLockException exception) {
            channel.close();
            throw new IOException("Desktop world is already locked in this process: " + paths.root(), exception);
        } catch (IOException | RuntimeException exception) {
            if (channel.isOpen()) channel.close();
            throw exception;
        }
    }

    public static void writeAtomic(Path destination, String content) throws IOException {
        Objects.requireNonNull(destination, "destination");
        Objects.requireNonNull(content, "content");
        Path parent = destination.toAbsolutePath().normalize().getParent();
        if (parent == null) throw new IOException("Atomic destination has no parent directory.");
        Files.createDirectories(parent);
        Path temporary = Files.createTempFile(parent, destination.getFileName().toString(), ".tmp");
        try {
            Files.writeString(temporary, content, StandardCharsets.UTF_8,
                    StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
            try {
                Files.move(temporary, destination, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
            } catch (AtomicMoveNotSupportedException exception) {
                Files.move(temporary, destination, StandardCopyOption.REPLACE_EXISTING);
            }
        } finally {
            Files.deleteIfExists(temporary);
        }
    }

    /** Schema 001: the import ledger and duplicate-safe vessel identity model. */
    public static List<String> initialSchemaStatements() {
        return List.of(
                "PRAGMA foreign_keys = ON",
                "PRAGMA journal_mode = WAL",
                "CREATE TABLE schema_migration (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)",
                "CREATE TABLE world_metadata (world_id TEXT PRIMARY KEY, display_name TEXT NOT NULL, created_at TEXT NOT NULL, canonical_time TEXT, master_world_id TEXT)",
                "CREATE TABLE import_artifact (artifact_id TEXT PRIMARY KEY, sha256 TEXT NOT NULL UNIQUE, byte_length INTEGER NOT NULL CHECK(byte_length >= 0), source_name TEXT NOT NULL, source_kind TEXT NOT NULL, inspected_at TEXT NOT NULL, imported_at TEXT)",
                "CREATE TABLE submarine_definition (definition_id TEXT PRIMARY KEY, canonical_xml_sha256 TEXT NOT NULL UNIQUE, official_check_value INTEGER, display_name TEXT NOT NULL, game_version TEXT, submarine_type TEXT, submarine_class TEXT, tier INTEGER, source_artifact_id TEXT, FOREIGN KEY(source_artifact_id) REFERENCES import_artifact(artifact_id))",
                "CREATE TABLE vessel_instance (vessel_id TEXT PRIMARY KEY, world_id TEXT NOT NULL, definition_id TEXT NOT NULL, display_name TEXT NOT NULL, created_at TEXT NOT NULL, retired_at TEXT, UNIQUE(world_id, vessel_id), FOREIGN KEY(world_id) REFERENCES world_metadata(world_id), FOREIGN KEY(definition_id) REFERENCES submarine_definition(definition_id))",
                "CREATE TABLE vessel_snapshot (snapshot_id TEXT PRIMARY KEY, vessel_id TEXT NOT NULL, snapshot_sha256 TEXT NOT NULL, source_timestamp TEXT, imported_at TEXT NOT NULL, source_artifact_id TEXT NOT NULL, is_current INTEGER NOT NULL DEFAULT 0 CHECK(is_current IN (0,1)), UNIQUE(vessel_id, snapshot_sha256), FOREIGN KEY(vessel_id) REFERENCES vessel_instance(vessel_id), FOREIGN KEY(source_artifact_id) REFERENCES import_artifact(artifact_id))",
                "CREATE UNIQUE INDEX one_current_snapshot_per_vessel ON vessel_snapshot(vessel_id) WHERE is_current = 1",
                "CREATE TABLE import_warning (warning_id TEXT PRIMARY KEY, artifact_id TEXT NOT NULL, warning_code TEXT NOT NULL, warning_text TEXT NOT NULL, acknowledged_at TEXT, FOREIGN KEY(artifact_id) REFERENCES import_artifact(artifact_id))",
                "CREATE TABLE audit_entry (sequence INTEGER PRIMARY KEY AUTOINCREMENT, occurred_at TEXT NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL, entity_type TEXT, entity_id TEXT, details_json TEXT NOT NULL)"
        );
    }

    public static List<String> schema002Statements() {
        List<String> statements = new ArrayList<>();
        statements.add("ALTER TABLE world_metadata ADD COLUMN source_suite_version INTEGER");
        statements.add("ALTER TABLE world_metadata ADD COLUMN source_exported_at TEXT");
        statements.addAll(schema002CreateStatements());
        return List.copyOf(statements);
    }

    private static List<String> schema002CreateStatements() {
        return List.of(
                "CREATE TABLE world_import (import_id TEXT PRIMARY KEY, world_id TEXT NOT NULL UNIQUE, artifact_id TEXT NOT NULL UNIQUE, suite_version INTEGER NOT NULL, master_world_id TEXT NOT NULL, exported_at TEXT, imported_at TEXT NOT NULL, rings INTEGER NOT NULL CHECK(rings >= 0), location_count INTEGER NOT NULL CHECK(location_count >= 0), station_count INTEGER NOT NULL CHECK(station_count >= 0), shell_radius REAL, active_submarine_name TEXT, active_submarine_model TEXT, crew_records INTEGER NOT NULL DEFAULT 0 CHECK(crew_records >= 0), economy_vessels INTEGER NOT NULL DEFAULT 0 CHECK(economy_vessels >= 0), economy_stations INTEGER NOT NULL DEFAULT 0 CHECK(economy_stations >= 0), FOREIGN KEY(world_id) REFERENCES world_metadata(world_id), FOREIGN KEY(artifact_id) REFERENCES import_artifact(artifact_id))",
                "CREATE TABLE world_location (location_id TEXT PRIMARY KEY, world_id TEXT NOT NULL, source_location_id TEXT NOT NULL, source_ordinal INTEGER NOT NULL CHECK(source_ordinal >= 0), display_name TEXT NOT NULL, location_type TEXT, ring INTEGER NOT NULL DEFAULT 0 CHECK(ring >= 0), location_level INTEGER NOT NULL DEFAULT 0 CHECK(location_level >= 0), map_x REAL, map_y REAL, biome TEXT, faction TEXT, is_station INTEGER NOT NULL DEFAULT 0 CHECK(is_station IN (0,1)), UNIQUE(world_id, source_location_id), UNIQUE(world_id, source_ordinal), FOREIGN KEY(world_id) REFERENCES world_metadata(world_id))",
                "CREATE INDEX world_location_ring_index ON world_location(world_id, ring, source_ordinal)",
                "CREATE TABLE world_station (station_id TEXT PRIMARY KEY, world_id TEXT NOT NULL, location_id TEXT NOT NULL UNIQUE, source_station_id TEXT NOT NULL, display_name TEXT NOT NULL, station_type TEXT, faction TEXT, has_economy INTEGER NOT NULL DEFAULT 0 CHECK(has_economy IN (0,1)), UNIQUE(world_id, source_station_id), FOREIGN KEY(world_id) REFERENCES world_metadata(world_id), FOREIGN KEY(location_id) REFERENCES world_location(location_id))",
                "CREATE TABLE world_component_version (world_id TEXT NOT NULL, component_key TEXT NOT NULL, component_version TEXT NOT NULL, PRIMARY KEY(world_id, component_key), FOREIGN KEY(world_id) REFERENCES world_metadata(world_id))",
                "CREATE TABLE world_state_family (world_id TEXT NOT NULL, family_key TEXT NOT NULL, PRIMARY KEY(world_id, family_key), FOREIGN KEY(world_id) REFERENCES world_metadata(world_id))",
                "CREATE TABLE world_simulation_metadata (world_id TEXT PRIMARY KEY, canonical_time TEXT, real_epoch TEXT, last_simulated_at TEXT, imported_tick_sequence INTEGER NOT NULL DEFAULT 0 CHECK(imported_tick_sequence >= 0), imported_at TEXT NOT NULL, source_artifact_id TEXT NOT NULL, simulation_enabled INTEGER NOT NULL DEFAULT 0 CHECK(simulation_enabled IN (0,1)), scheduler_state TEXT NOT NULL DEFAULT 'PAUSED' CHECK(scheduler_state IN ('PAUSED','RUNNING','CATCHING_UP','FAULTED')), FOREIGN KEY(world_id) REFERENCES world_metadata(world_id), FOREIGN KEY(source_artifact_id) REFERENCES import_artifact(artifact_id))"
        );
    }

    public static List<String> schema003Statements() {
        return List.of(
                "ALTER TABLE world_simulation_metadata ADD COLUMN current_tick_sequence INTEGER CHECK(current_tick_sequence >= 0)",
                "ALTER TABLE world_simulation_metadata ADD COLUMN tick_size_seconds INTEGER CHECK(tick_size_seconds > 0)",
                "ALTER TABLE world_simulation_metadata ADD COLUMN tick_size_nanos INTEGER NOT NULL DEFAULT 0 CHECK(tick_size_nanos >= 0 AND tick_size_nanos < 1000000000)",
                "ALTER TABLE world_simulation_metadata ADD COLUMN last_command_id TEXT",
                "ALTER TABLE world_simulation_metadata ADD COLUMN last_checkpoint_id TEXT",
                "CREATE TABLE simulation_command_receipt (command_id TEXT PRIMARY KEY, world_id TEXT NOT NULL, execution_sequence INTEGER NOT NULL CHECK(execution_sequence > 0), actor TEXT NOT NULL, command TEXT NOT NULL, submitted_at TEXT NOT NULL, completed_at TEXT NOT NULL, writer_thread_id INTEGER NOT NULL, before_canonical_time TEXT NOT NULL, before_tick_sequence INTEGER NOT NULL CHECK(before_tick_sequence >= 0), before_simulation_enabled INTEGER NOT NULL CHECK(before_simulation_enabled IN (0,1)), before_scheduler_state TEXT NOT NULL CHECK(before_scheduler_state IN ('PAUSED','RUNNING','CATCHING_UP','FAULTED')), after_canonical_time TEXT NOT NULL, after_tick_sequence INTEGER NOT NULL CHECK(after_tick_sequence >= 0), after_simulation_enabled INTEGER NOT NULL CHECK(after_simulation_enabled IN (0,1)), after_scheduler_state TEXT NOT NULL CHECK(after_scheduler_state IN ('PAUSED','RUNNING','CATCHING_UP','FAULTED')), catch_up_applied_ticks INTEGER CHECK(catch_up_applied_ticks >= 0), catch_up_remaining_ticks INTEGER CHECK(catch_up_remaining_ticks >= 0), catch_up_complete INTEGER CHECK(catch_up_complete IN (0,1)), UNIQUE(world_id, execution_sequence), FOREIGN KEY(world_id) REFERENCES world_metadata(world_id))",
                "CREATE INDEX simulation_command_completed_index ON simulation_command_receipt(world_id, completed_at)",
                "CREATE TABLE simulation_checkpoint (checkpoint_id TEXT PRIMARY KEY, world_id TEXT NOT NULL, created_at TEXT NOT NULL, reason TEXT NOT NULL, source_command_id TEXT, canonical_time TEXT NOT NULL, real_epoch TEXT NOT NULL, tick_sequence INTEGER NOT NULL CHECK(tick_sequence >= 0), tick_size_seconds INTEGER NOT NULL CHECK(tick_size_seconds > 0), tick_size_nanos INTEGER NOT NULL DEFAULT 0 CHECK(tick_size_nanos >= 0 AND tick_size_nanos < 1000000000), simulation_enabled INTEGER NOT NULL CHECK(simulation_enabled IN (0,1)), scheduler_state TEXT NOT NULL CHECK(scheduler_state IN ('PAUSED','RUNNING','CATCHING_UP','FAULTED')), UNIQUE(world_id, source_command_id), FOREIGN KEY(world_id) REFERENCES world_metadata(world_id), FOREIGN KEY(source_command_id) REFERENCES simulation_command_receipt(command_id))",
                "CREATE INDEX simulation_checkpoint_created_index ON simulation_checkpoint(world_id, created_at)"
        );
    }

    public static List<String> schema004Statements() { return PassiveWorldSchema.statements(); }
    public static List<String> schema005Statements() { return PassiveWorldSchemaHardening.statements(); }
    public static List<String> schema006Statements() { return StationLogisticsSchema.statements(); }
    public static List<String> schema007Statements() { return StationLogisticsHardening.statements(); }
    public static List<String> schema008Statements() { return StationConsumptionAndFrontierSchema.statements(); }
    public static List<String> schema009Statements() { return StationFrontierHardening.statements(); }
    public static List<String> schema010Statements() { return FleetRecoveryAndNaturalWorldSchema.statements(); }
    public static List<String> schema011Statements() { return FleetRecoveryAndNaturalWorldHardening.statements(); }
    public static List<String> schema012Statements() { return NaturalWorldMissionHardening.statements(); }
    public static List<String> schema013Statements() { return NaturalResourceHarvestingSchema.statements(); }
    public static List<String> schema014Statements() { return FleetResponseTransitSchema.statements(); }
    public static List<String> schema015Statements() { return ObservationFoundationSchema.statements(); }
    public static List<String> schema016Statements() { return NpcPopulationAccountingSchema.statements(); }
    public static List<String> schema017Statements() { return StationCausalitySchema.statements(); }
    public static List<String> schema018Statements() { return StationConsumptionCausalitySchema.statements(); }
    public static List<String> schema019Statements() { return StationProductionCausalitySchema.statements(); }
    public static List<String> schema020Statements() { return StationDeliveryCausalitySchema.statements(); }
    public static List<String> schema021Statements() { return StationFrontierCausalitySchema.statements(); }
    public static List<String> schema022Statements() { return StationPopulationCausalitySchema.statements(); }
    public static List<String> schema023Statements() { return FactionPlanCausalitySchema.statements(); }
    public static List<String> schema024Statements() { return StationCommandCausalitySchema.statements(); }
    public static List<String> schema025Statements() { return StationMutationCoverageSchema.statements(); }
    public static List<String> schema026Statements() { return NpcTransitObserverSchema.statements(); }
    public static List<String> schema027Statements() { return NpcDemographicLifecycleSchema.statements(); }
    public static List<String> schema028Statements() { return NpcPopulationMigrationSchema.statements(); }
    public static List<String> schema029Statements() { return SettlementLifecycleSchema.statements(); }
    public static List<String> schema030Statements() { return SettlementFoundingMigrationSchema.statements(); }
    public static List<String> schema031Statements() { return SettlementContributionDispositionSchema.statements(); }
    public static List<String> schema032Statements() { return SettlementPhysicalSupportHardeningSchema.statements(); }

    public static String slug(String displayName) {
        String value = displayName.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        if (value.isBlank()) value = "world";
        if (value.length() > 48) value = value.substring(0, 48).replaceAll("-+$", "");
        if (!SAFE_SLUG.matcher(value).matches()) throw new IllegalArgumentException("Could not create a safe world slug.");
        return value;
    }

    private static WorldPaths paths(Path root) {
        return new WorldPaths(root, root.resolve("world.db"), root.resolve("world.properties"),
                root.resolve("world.lock"), root.resolve("imports"), root.resolve("attachments"),
                root.resolve("backups"), root.resolve("exports"), root.resolve("logs"));
    }

    private static void requireChild(Path root, Path child) throws IOException {
        if (!child.startsWith(root)) throw new IOException("Resolved world path escapes the configured root.");
    }

    private static String metadata(String displayName, UUID worldId) {
        return "schemaVersion=" + DATABASE_SCHEMA_VERSION + "\n"
                + "worldId=" + worldId + "\n"
                + "displayName=" + displayName.replace("\n", " ").replace("\r", " ") + "\n"
                + "createdAt=" + Instant.now() + "\n";
    }

    public record WorldPaths(Path root, Path database, Path metadata, Path lockFile, Path imports,
            Path attachments, Path backups, Path exports, Path logs) {
        public WorldPaths {
            root = root.toAbsolutePath().normalize();
            for (Path value : List.of(database, metadata, lockFile, imports, attachments, backups, exports, logs)) {
                if (!value.toAbsolutePath().normalize().startsWith(root)) {
                    throw new IllegalArgumentException("A world path escaped its root: " + value);
                }
            }
        }
    }

    public static final class WorldLock implements Closeable {
        private final FileChannel channel;
        private final FileLock lock;
        private final Path lockFile;
        private boolean closed;

        private WorldLock(FileChannel channel, FileLock lock, Path lockFile) {
            this.channel = channel;
            this.lock = lock;
            this.lockFile = lockFile;
        }

        @Override
        public synchronized void close() throws IOException {
            if (closed) return;
            closed = true;
            IOException failure = null;
            try { lock.release(); } catch (IOException exception) { failure = exception; }
            try { channel.close(); } catch (IOException exception) { if (failure == null) failure = exception; else failure.addSuppressed(exception); }
            try { Files.deleteIfExists(lockFile); } catch (IOException exception) { if (failure == null) failure = exception; else failure.addSuppressed(exception); }
            if (failure != null) throw failure;
        }
    }

    public static void verifyContract() throws Exception {
        WorldStorageContractsVerification.verifyContract();
    }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Barotrauma world storage contracts passed.");
    }
}
