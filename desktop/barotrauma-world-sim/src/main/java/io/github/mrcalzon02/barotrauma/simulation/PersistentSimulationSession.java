package io.github.mrcalzon02.barotrauma.simulation;

import io.github.mrcalzon02.barotrauma.persistence.SimulationCheckpointStore;
import io.github.mrcalzon02.barotrauma.persistence.SimulationCheckpointStore.PersistResult;
import io.github.mrcalzon02.barotrauma.persistence.SimulationCheckpointStore.RecoveryState;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;
import io.github.mrcalzon02.barotrauma.simulation.DeterministicSimulationClock.ClockSnapshot;
import io.github.mrcalzon02.barotrauma.simulation.SimulationCommandExecutor.CommandReceipt;
import io.github.mrcalzon02.barotrauma.simulation.SimulationCommandExecutor.SimulationCommand;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Fault-contained session that serializes command execution and durable receipt persistence.
 *
 * <p>No automatic timer is started. Each submitted command is executed by the single-writer clock
 * executor and committed to SQLite before the next command begins. A persistence failure permanently
 * faults this session so in-memory state can never continue drifting away from durable state.</p>
 */
public final class PersistentSimulationSession implements AutoCloseable {
    private final WorldPaths world;
    private final Duration tickSize;
    private final SimulationCommandExecutor writer;
    private final ExecutorService coordinator;
    private final AtomicBoolean closed = new AtomicBoolean();
    private volatile Throwable persistenceFault;

    private PersistentSimulationSession(WorldPaths world, Duration tickSize,
                                        SimulationCommandExecutor writer,
                                        ExecutorService coordinator) {
        this.world = world;
        this.tickSize = tickSize;
        this.writer = writer;
        this.coordinator = coordinator;
    }

    public static PersistentSimulationSession open(WorldPaths world, Duration defaultTickSize)
            throws IOException, SQLException {
        Objects.requireNonNull(world, "world");
        Objects.requireNonNull(defaultTickSize, "defaultTickSize");
        RecoveryState recovery = SimulationCheckpointStore.load(world, defaultTickSize);
        DeterministicSimulationClock clock = DeterministicSimulationClock.restore(recovery.snapshot());
        SimulationCommandExecutor writer = new SimulationCommandExecutor(clock,
                "barotrauma-world-writer-" + recovery.worldId(), recovery.lastExecutionSequence());
        ThreadFactory coordinatorFactory = runnable -> {
            Thread thread = new Thread(runnable, "barotrauma-durable-command-coordinator-" + recovery.worldId());
            thread.setDaemon(true);
            return thread;
        };
        return new PersistentSimulationSession(world, recovery.snapshot().tickSize(), writer,
                Executors.newSingleThreadExecutor(coordinatorFactory));
    }

    public CompletableFuture<DurableCommandResult> submit(SimulationCommand command, String actor,
                                                           String checkpointReason) {
        Objects.requireNonNull(command, "command");
        Throwable fault = persistenceFault;
        if (fault != null) return CompletableFuture.failedFuture(
                new IllegalStateException("Simulation session is persistence-faulted and must be reopened.", fault));
        if (closed.get()) return CompletableFuture.failedFuture(
                new IllegalStateException("Simulation session is closed."));

        return CompletableFuture.supplyAsync(() -> {
            requireHealthy();
            CommandReceipt receipt;
            try {
                receipt = writer.submit(command, actor).join();
            } catch (CompletionException exception) {
                throw exception;
            }
            try {
                PersistResult persisted = SimulationCheckpointStore.persist(world, receipt, checkpointReason);
                return new DurableCommandResult(receipt, persisted);
            } catch (IOException | SQLException | RuntimeException exception) {
                persistenceFault = exception;
                throw new CompletionException(exception);
            }
        }, coordinator);
    }

    public CompletableFuture<ClockSnapshot> snapshot() {
        if (closed.get()) return CompletableFuture.failedFuture(
                new IllegalStateException("Simulation session is closed."));
        return CompletableFuture.supplyAsync(() -> {
            requireHealthy();
            return writer.snapshot().join();
        }, coordinator);
    }

    public boolean persistenceFaulted() {
        return persistenceFault != null;
    }

    public Throwable persistenceFault() {
        return persistenceFault;
    }

    public WorldPaths world() {
        return world;
    }

    public Duration tickSize() {
        return tickSize;
    }

    private void requireHealthy() {
        Throwable fault = persistenceFault;
        if (fault != null) {
            throw new CompletionException(new IllegalStateException(
                    "Simulation session is persistence-faulted and must be reopened.", fault));
        }
        if (closed.get()) throw new CompletionException(new IllegalStateException("Simulation session is closed."));
    }

    @Override
    public void close() {
        if (!closed.compareAndSet(false, true)) return;
        coordinator.shutdown();
        try {
            if (!coordinator.awaitTermination(5, TimeUnit.SECONDS)) coordinator.shutdownNow();
        } catch (InterruptedException exception) {
            coordinator.shutdownNow();
            Thread.currentThread().interrupt();
        } finally {
            writer.close();
        }
    }

    public record DurableCommandResult(CommandReceipt receipt, PersistResult persistence) {
        public DurableCommandResult {
            Objects.requireNonNull(receipt, "receipt");
            Objects.requireNonNull(persistence, "persistence");
            if (!receipt.commandId().equals(persistence.commandId())) {
                throw new IllegalArgumentException("Receipt and durable command identities differ.");
            }
        }
    }

    public static void verifyContract() throws Exception {
        Path root = Files.createTempDirectory("barotrauma-persistent-simulation-");
        try {
            UUID worldId = UUID.fromString("96000000-0000-0000-0000-000000000001");
            WorldPaths paths = WorldStorageContracts.createWorld(root, "Persistent Europa", worldId);
            UUID artifactId = UUID.fromString("96000000-0000-0000-0000-000000000002");
            try (SqliteWorldStore ignored = SqliteWorldStore.open(paths)) {
                // Establish schema 003 and world metadata.
            }
            installSimulationFixture(paths, worldId, artifactId);

            Duration tick = Duration.ofMinutes(1);
            try (PersistentSimulationSession session = open(paths, tick)) {
                ClockSnapshot initial = session.snapshot().join();
                require(initial.tickSequence() == 20 && !initial.simulationEnabled(),
                        "Persistent session did not restore imported state.");
                DurableCommandResult enable = session.submit(
                        new SimulationCommandExecutor.Enable(), "session-test", null).join();
                DurableCommandResult step = session.submit(
                        new SimulationCommandExecutor.Step(3), "session-test", "First durable step").join();
                require(enable.receipt().acceptedSequence() == 1
                                && step.receipt().acceptedSequence() == 2,
                        "Persistent session command sequence failed.");
                require(step.persistence().checkpointId() != null
                                && step.receipt().after().tickSequence() == 23,
                        "Persistent session did not commit the reviewed checkpoint.");
            }

            try (PersistentSimulationSession reopened = open(paths, tick)) {
                ClockSnapshot restored = reopened.snapshot().join();
                require(restored.tickSequence() == 23 && restored.simulationEnabled(),
                        "Reopened session did not restore durable state.");
                DurableCommandResult checkpoint = reopened.submit(
                        new SimulationCommandExecutor.Checkpoint(), "session-test", null).join();
                require(checkpoint.receipt().acceptedSequence() == 3
                                && checkpoint.persistence().checkpointId() != null,
                        "Reopened session did not continue durable sequence or checkpoint state.");
            }

            try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
                 Statement statement = connection.createStatement();
                 ResultSet commands = statement.executeQuery("SELECT COUNT(*) FROM simulation_command_receipt")) {
                require(commands.next() && commands.getInt(1) == 3,
                        "Persistent session did not retain all command receipts.");
            }
        } finally {
            deleteTree(root);
        }
    }

    private static void installSimulationFixture(WorldPaths paths, UUID worldId, UUID artifactId)
            throws Exception {
        Class.forName("org.sqlite.JDBC");
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            try (Statement statement = connection.createStatement()) {
                statement.execute("PRAGMA foreign_keys = ON");
            }
            try (PreparedStatement artifact = connection.prepareStatement(
                    "INSERT INTO import_artifact(artifact_id, sha256, byte_length, source_name, source_kind, "
                            + "inspected_at, imported_at) VALUES (?, ?, 12, 'session-world.json', 'web-suite-v22', ?, ?)")) {
                artifact.setString(1, artifactId.toString());
                artifact.setString(2, "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc");
                artifact.setString(3, Instant.parse("2026-07-17T00:00:00Z").toString());
                artifact.setString(4, Instant.parse("2026-07-17T00:01:00Z").toString());
                artifact.executeUpdate();
            }
            try (PreparedStatement metadata = connection.prepareStatement(
                    "INSERT INTO world_simulation_metadata(world_id, canonical_time, real_epoch, "
                            + "last_simulated_at, imported_tick_sequence, imported_at, source_artifact_id, "
                            + "simulation_enabled, scheduler_state) VALUES (?, ?, ?, NULL, 20, ?, ?, 0, 'PAUSED')")) {
                metadata.setString(1, worldId.toString());
                metadata.setString(2, Instant.parse("2175-01-01T00:00:00Z").toString());
                metadata.setString(3, Instant.parse("2026-06-20T08:00:00Z").toString());
                metadata.setString(4, Instant.parse("2026-07-17T00:01:00Z").toString());
                metadata.setString(5, artifactId.toString());
                metadata.executeUpdate();
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

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Barotrauma persistent single-writer simulation session contracts passed.");
    }
}
