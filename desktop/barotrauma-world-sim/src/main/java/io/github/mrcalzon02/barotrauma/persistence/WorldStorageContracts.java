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
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Pattern;

/** Dependency-free filesystem, locking, atomic-write, and initial database-schema contracts. */
public final class WorldStorageContracts {
    public static final int DATABASE_SCHEMA_VERSION = 1;
    private static final Pattern SAFE_SLUG = Pattern.compile("[a-z0-9]+(?:-[a-z0-9]+)*");

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
            return new WorldLock(channel, lock, paths.lockFile());
        } catch (OverlappingFileLockException exception) {
            channel.close();
            throw new IOException("Desktop world is already locked in this process: " + paths.root(), exception);
        } catch (IOException | RuntimeException exception) {
            channel.close();
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
            require(initialSchemaStatements().stream().anyMatch(sql -> sql.contains("one_current_snapshot_per_vessel")), "Current-snapshot constraint is missing.");

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
