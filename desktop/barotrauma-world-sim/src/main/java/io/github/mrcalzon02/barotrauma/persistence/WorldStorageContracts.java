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
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Pattern;

/** Dependency-free filesystem, locking, atomic-write, and database-schema contracts. */
public final class WorldStorageContracts {
    public static final int DATABASE_SCHEMA_VERSION = 26;
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
                "CREATE TABLE simulation_checkpoint (checkpoint_id TEXT PRIMARY KEY, world_id TEXT NOT NULL, created_at TEXT NOT NULL, reason TEXT NOT NULL, source_command_id TEXT, canonical_time TEXT NOT NULL, real_epoch TEXT NOT NULL, tick_sequence INTEGER NOT NULL CHECK(tick_sequence >= 0), tick_size_seconds INTEGER NOT NULL CHECK(tick_size_seconds > 0), tick_size_nanos INTEGER NOT NULL CHECK(tick_size_nanos >= 0 AND tick_size_nanos < 1000000000), simulation_enabled INTEGER NOT NULL CHECK(simulation_enabled IN (0,1)), scheduler_state TEXT NOT NULL CHECK(scheduler_state IN ('PAUSED','RUNNING','CATCHING_UP','FAULTED')), UNIQUE(world_id, source_command_id), FOREIGN KEY(world_id) REFERENCES world_metadata(world_id), FOREIGN KEY(source_command_id) REFERENCES simulation_command_receipt(command_id))",
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
        Path temporaryRoot = Files.createTempDirectory("barotrauma-world-storage-");
        try {
            UUID worldId = UUID.fromString("11111111-2222-3333-4444-555555555555");
            WorldPaths paths = createWorld(temporaryRoot, "Europa Test World", worldId);
            require(paths.root().getFileName().toString().equals("europa-test-world-" + worldId), "World directory identity failed.");
            require(Files.isRegularFile(paths.metadata()), "World metadata was not created.");
            require(slug("../A Dangerous World").equals("a-dangerous-world"), "World slug safety failed.");
            require(initialSchemaStatements().stream().anyMatch(sql -> sql.contains("UNIQUE(vessel_id, snapshot_sha256)")), "Snapshot duplicate constraint is missing.");
            require(schema002Statements().stream().anyMatch(sql -> sql.contains("CREATE TABLE world_location")), "World-location migration schema is missing.");
            require(schema003Statements().stream().anyMatch(sql -> sql.contains("simulation_command_receipt")), "Command-receipt schema is missing.");
            require(schema004Statements().stream().anyMatch(sql -> sql.contains("station_simulation_state")), "Station workload schema is missing.");
            require(schema005Statements().stream().anyMatch(sql -> sql.contains("npc_return_arrival")), "NPC return hardening is missing.");
            require(schema006Statements().stream().anyMatch(sql -> sql.contains("station_inventory")), "Station inventory schema is missing.");
            require(schema006Statements().stream().anyMatch(sql -> sql.contains("player_vessel_state")), "Player route schema is missing.");
            require(schema007Statements().stream().anyMatch(sql -> sql.contains("passive_freight_offers")), "Passive freight-offer hardening is missing.");
            require(schema008Statements().stream().anyMatch(sql -> sql.contains("station_consumption_log")), "Station consumption history is missing.");
            require(schema008Statements().stream().anyMatch(sql -> sql.contains("station_passive_consumption")), "Passive station consumption trigger is missing.");
            require(schema008Statements().stream().anyMatch(sql -> sql.contains("civilization_frontier_event")), "Civilization frontier evidence is missing.");
            require(schema009Statements().stream().anyMatch(sql -> sql.contains("printf('%012x'")), "UUID-safe frontier mission generation is missing.");
            require(schema009Statements().stream().anyMatch(sql -> sql.contains("frontier_recovery_event")), "Frontier recovery evidence is missing.");
            require(schema009Statements().stream().anyMatch(sql -> sql.contains("frontier_expansion_mission")), "Frontier expansion missions are missing.");
            require(schema010Statements().stream().anyMatch(sql -> sql.contains("fleet_response_operation")), "Fleet recovery operations are missing.");
            require(schema010Statements().stream().anyMatch(sql -> sql.contains("location_ecology_state")), "Natural ecology state is missing.");
            require(schema010Statements().stream().anyMatch(sql -> sql.contains("location_geology_state")), "Natural geology state is missing.");
            require(schema010Statements().stream().anyMatch(sql -> sql.contains("natural_resource_site")), "Natural resource exposure is missing.");
            require(schema011Statements().stream().anyMatch(sql -> sql.contains("response_request_immediate_assignment")), "Immediate fleet response assignment is missing.");
            require(schema011Statements().stream().anyMatch(sql -> sql.contains("fleet_response_requires_supplies")), "Fleet response material gating is missing.");
            require(schema012Statements().stream().anyMatch(sql -> sql.contains("active_response_blocks_world_mission")), "Fleet response mission priority is missing.");
            require(schema012Statements().stream().anyMatch(sql -> sql.contains("natural_resource_creates_mission")), "Natural resource mission generation is missing.");
            require(schema012Statements().stream().anyMatch(sql -> sql.contains("predator_expansion_creates_mission")), "Predator-response mission generation is missing.");
            require(schema013Statements().stream().anyMatch(sql -> sql.contains("resource_extraction_batch")), "Natural resource extraction evidence is missing.");
            require(schema013Statements().stream().anyMatch(sql -> sql.contains("passive_resource_recovery")), "Renewable resource recovery is missing.");
            require(schema013Statements().stream().anyMatch(sql -> sql.contains("DROP TRIGGER IF EXISTS passive_station_logistics_cycle")), "Unbounded free ore production was not replaced.");
            require(schema014Statements().stream().anyMatch(sql -> sql.contains("fleet_response_transit_leg")), "Fleet response transit legs are missing.");
            require(schema014Statements().stream().anyMatch(sql -> sql.contains("fleet_response_requires_scene")), "Fleet response arrival gating is missing.");
            require(schema014Statements().stream().anyMatch(sql -> sql.contains("fleet_response_responder_returns_home")), "Fleet response return completion is missing.");
            require(schema015Statements().stream().anyMatch(sql -> sql.contains("npc_population_state")), "Observation NPC populations are missing.");
            require(schema015Statements().stream().anyMatch(sql -> sql.contains("creature_population_state")), "Observation creature populations are missing.");
            require(schema015Statements().stream().anyMatch(sql -> sql.contains("world_observation_event")), "Observation event evidence is missing.");
            require(schema015Statements().stream().anyMatch(sql -> sql.contains("observation_snapshot")), "Observation snapshots are missing.");
            require(schema016Statements().stream().anyMatch(sql -> sql.contains("npc_population_ledger")), "Conserved NPC population accounting is missing.");
            require(schema016Statements().stream().anyMatch(sql -> sql.contains("npc_population_tick_accounting")), "Passive NPC population reconciliation is missing.");
            require(schema016Statements().stream().anyMatch(sql -> sql.contains("after_total=before_total")), "Population conservation constraint is missing.");
            require(schema017Statements().stream().anyMatch(sql -> sql.contains("CREATE TABLE station_event ")), "Station causal events are missing.");
            require(schema017Statements().stream().anyMatch(sql -> sql.contains("CREATE TABLE station_change ")), "Typed station changes are missing.");
            require(schema017Statements().stream().anyMatch(sql -> sql.contains("CREATE TABLE station_population_event ")), "Population event evidence is missing.");
            require(schema017Statements().stream().anyMatch(sql -> sql.contains("CREATE TABLE faction_plan ")), "Faction planning state is missing.");
            require(schema018Statements().stream().anyMatch(sql -> sql.contains("station_causal_capture_before_tick")), "Consumption baseline capture is missing.");
            require(schema018Statements().stream().anyMatch(sql -> sql.contains("station_consumption_causal_event")), "Consumption causal collection is missing.");
            require(schema019Statements().stream().anyMatch(sql -> sql.contains("station_production_outcome")), "Production outcome evidence is missing.");
            require(schema019Statements().stream().anyMatch(sql -> sql.contains("station_production_outcome_gate")), "Production failure gating is missing.");
            require(schema019Statements().stream().anyMatch(sql -> sql.contains("station_production_story")), "Production story view is missing.");
            require(schema020Statements().stream().anyMatch(sql -> sql.contains("station_delivery_capture")), "Delivery baseline capture is missing.");
            require(schema020Statements().stream().anyMatch(sql -> sql.contains("station_delivery_causal_event")), "Delivery causal collection is missing.");
            require(schema020Statements().stream().anyMatch(sql -> sql.contains("station_delivery_story")), "Delivery story view is missing.");
            require(schema021Statements().stream().anyMatch(sql -> sql.contains("station_frontier_finalize_tick")), "Frontier causal collection is missing.");
            require(schema021Statements().stream().anyMatch(sql -> sql.contains("station_frontier_story")), "Frontier story view is missing.");
            require(schema022Statements().stream().anyMatch(sql -> sql.contains("station_population_finalize_tick")), "Population causal collection is missing.");
            require(schema022Statements().stream().anyMatch(sql -> sql.contains("station_population_coverage")), "Population mutation coverage is missing.");
            require(schema023Statements().stream().anyMatch(sql -> sql.contains("faction_plan_resource_allocation")), "Faction allocation backing is missing.");
            require(schema023Statements().stream().anyMatch(sql -> sql.contains("station_faction_resource_availability")), "Faction resource availability is missing.");
            require(schema024Statements().stream().anyMatch(sql -> sql.contains("station_event_links_active_command")), "Station command provenance is missing.");
            require(schema024Statements().stream().anyMatch(sql -> sql.contains("station_event_command_history")), "Station command history is missing.");
            require(schema025Statements().stream().anyMatch(sql -> sql.contains("station_mutation_explanation")), "Mutation explanation coverage is missing.");
            require(schema025Statements().stream().anyMatch(sql -> sql.contains("ENFORCE")), "Enforced station explanation policy is missing.");
            require(schema026Statements().stream().anyMatch(sql -> sql.contains("npc_transit_incident_schedule")), "NPC transit incident scheduling is missing.");
            require(schema026Statements().stream().anyMatch(sql -> sql.contains("npc_observable_transit")), "NPC observer transit projection is missing.");

            try (WorldLock ignored = acquireExclusiveLock(paths)) {
                try {
                    acquireExclusiveLock(paths);
                    throw new IllegalStateException("A second world writer lock was unexpectedly acquired.");
                } catch (IOException expected) {
                    require(expected.getMessage().contains("already"), "Unexpected lock failure message.");
                }
                writeAtomic(paths.logs().resolve("contract.log"), "verified\n");
                require(Files.readString(paths.logs().resolve("contract.log")).equals("verified\n"), "Atomic write failed.");
            }
            require(!Files.exists(paths.lockFile()), "World lock file was not removed after close.");
            openWorld(paths.root());
        } finally {
            deleteTree(temporaryRoot);
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
        verifyContract();
        System.out.println("Barotrauma world storage contracts passed.");
    }
}
