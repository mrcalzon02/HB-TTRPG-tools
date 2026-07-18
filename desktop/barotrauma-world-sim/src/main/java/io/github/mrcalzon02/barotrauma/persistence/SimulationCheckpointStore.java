package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.simulation.DeterministicSimulationClock;
import io.github.mrcalzon02.barotrauma.simulation.DeterministicSimulationClock.ClockSnapshot;
import io.github.mrcalzon02.barotrauma.simulation.DeterministicSimulationClock.SchedulerState;
import io.github.mrcalzon02.barotrauma.simulation.SimulationCommandExecutor;
import io.github.mrcalzon02.barotrauma.simulation.SimulationCommandExecutor.CommandReceipt;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldLock;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Types;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.Objects;
import java.util.UUID;

/** Transactional persistence for simulation command receipts and reviewed clock checkpoints. */
public final class SimulationCheckpointStore {

    private SimulationCheckpointStore() { }

    public static RecoveryState load(WorldPaths paths, Duration defaultTickSize)
            throws IOException, SQLException {
        Objects.requireNonNull(paths, "paths");
        Duration effectiveTick = requireTickSize(defaultTickSize);
        requireDriver();
        try (WorldLock ignored = WorldStorageContracts.acquireExclusiveLock(paths);
             Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configure(connection);
            verifySchema(connection);
            return readRecoveryState(connection, effectiveTick);
        }
    }

    public static PersistResult persist(WorldPaths paths, CommandReceipt receipt, String checkpointReason)
            throws IOException, SQLException {
        Objects.requireNonNull(paths, "paths");
        Objects.requireNonNull(receipt, "receipt");
        requireDriver();
        try (WorldLock ignored = WorldStorageContracts.acquireExclusiveLock(paths);
             Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configure(connection);
            verifySchema(connection);
            return persist(connection, receipt, checkpointReason);
        }
    }

    private static PersistResult persist(Connection connection, CommandReceipt receipt,
                                         String checkpointReason) throws SQLException {
        boolean originalAutoCommit = connection.getAutoCommit();
        connection.setAutoCommit(false);
        try {
            RecoveryState stored = readRecoveryState(connection, receipt.before().tickSize());
            validateReceipt(stored, receipt);
            insertReceipt(connection, stored.worldId(), receipt);

            UUID checkpointId = null;
            String reason = normalizeReason(checkpointReason, receipt.command());
            if (reason != null) {
                checkpointId = UUID.randomUUID();
                insertCheckpoint(connection, checkpointId, stored.worldId(), receipt, reason);
            }
            updateCurrentState(connection, stored.worldId(), receipt.after(), receipt.commandId(), checkpointId);
            insertAudit(connection, stored.worldId(), receipt, checkpointId, reason);
            connection.commit();
            return new PersistResult(stored.worldId(), receipt.commandId(), receipt.acceptedSequence(),
                    checkpointId, receipt.after(), receipt.completedAt());
        } catch (SQLException | RuntimeException exception) {
            try { connection.rollback(); }
            catch (SQLException rollbackFailure) { exception.addSuppressed(rollbackFailure); }
            throw exception;
        } finally {
            connection.setAutoCommit(originalAutoCommit);
        }
    }

    private static RecoveryState readRecoveryState(Connection connection, Duration defaultTickSize)
            throws SQLException {
        String sql = "SELECT wm.world_id, sm.canonical_time, sm.real_epoch, "
                + "COALESCE(sm.current_tick_sequence, sm.imported_tick_sequence) AS tick_sequence, "
                + "sm.tick_size_seconds, sm.tick_size_nanos, sm.simulation_enabled, sm.scheduler_state, "
                + "sm.last_command_id, sm.last_checkpoint_id, "
                + "COALESCE((SELECT MAX(execution_sequence) FROM simulation_command_receipt scr "
                + "WHERE scr.world_id = wm.world_id), 0) AS last_execution_sequence "
                + "FROM world_metadata wm JOIN world_simulation_metadata sm ON sm.world_id = wm.world_id LIMIT 1";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) {
                throw new SQLException("Simulation persistence requires an imported normalized master world.");
            }
            Instant canonical = instant(result.getString("canonical_time"), "canonical_time");
            Instant epoch = instant(result.getString("real_epoch"), "real_epoch");
            long tickSequence = result.getLong("tick_sequence");
            Duration tickSize = result.getObject("tick_size_seconds") == null
                    ? defaultTickSize
                    : Duration.ofSeconds(result.getLong("tick_size_seconds"), result.getInt("tick_size_nanos"));
            requireTickSize(tickSize);
            SchedulerState state;
            try {
                state = SchedulerState.valueOf(result.getString("scheduler_state"));
            } catch (RuntimeException exception) {
                throw new SQLException("Stored scheduler state is invalid.", exception);
            }
            ClockSnapshot snapshot = new ClockSnapshot(canonical, epoch, tickSequence, tickSize,
                    result.getInt("simulation_enabled") == 1, state);
            return new RecoveryState(
                    UUID.fromString(result.getString("world_id")),
                    snapshot,
                    result.getLong("last_execution_sequence"),
                    uuid(result.getString("last_command_id")),
                    uuid(result.getString("last_checkpoint_id"))
            );
        }
    }

    private static void validateReceipt(RecoveryState stored, CommandReceipt receipt) throws SQLException {
        long expectedSequence = stored.lastExecutionSequence() + 1;
        if (receipt.acceptedSequence() != expectedSequence) {
            throw new SQLException("Simulation command sequence mismatch; expected " + expectedSequence
                    + " but received " + receipt.acceptedSequence() + ".");
        }
        if (!stored.snapshot().equals(receipt.before())) {
            throw new SQLException("Simulation command was produced from stale world state; its before snapshot "
                    + "does not match the durable clock.");
        }
        if (!receipt.before().realEpoch().equals(receipt.after().realEpoch())) {
            throw new SQLException("A simulation command cannot change the real epoch.");
        }
        if (!receipt.before().tickSize().equals(receipt.after().tickSize())) {
            throw new SQLException("A simulation command cannot change tick size.");
        }
        if (receipt.after().tickSequence() < receipt.before().tickSequence()) {
            throw new SQLException("A simulation command cannot move tick sequence backward.");
        }
        if (receipt.after().canonicalTime().isBefore(receipt.before().canonicalTime())) {
            throw new SQLException("A simulation command cannot move canonical time backward.");
        }
    }

    private static void insertReceipt(Connection connection, UUID worldId, CommandReceipt receipt)
            throws SQLException {
        String sql = "INSERT INTO simulation_command_receipt(command_id, world_id, execution_sequence, actor, "
                + "command, submitted_at, completed_at, writer_thread_id, before_canonical_time, "
                + "before_tick_sequence, before_simulation_enabled, before_scheduler_state, "
                + "after_canonical_time, after_tick_sequence, after_simulation_enabled, after_scheduler_state, "
                + "catch_up_applied_ticks, catch_up_remaining_ticks, catch_up_complete) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, receipt.commandId().toString());
            statement.setString(2, worldId.toString());
            statement.setLong(3, receipt.acceptedSequence());
            statement.setString(4, receipt.actor());
            statement.setString(5, receipt.command());
            statement.setString(6, receipt.submittedAt().toString());
            statement.setString(7, receipt.completedAt().toString());
            statement.setLong(8, receipt.writerThreadId());
            statement.setString(9, receipt.before().canonicalTime().toString());
            statement.setLong(10, receipt.before().tickSequence());
            statement.setInt(11, receipt.before().simulationEnabled() ? 1 : 0);
            statement.setString(12, receipt.before().schedulerState().name());
            statement.setString(13, receipt.after().canonicalTime().toString());
            statement.setLong(14, receipt.after().tickSequence());
            statement.setInt(15, receipt.after().simulationEnabled() ? 1 : 0);
            statement.setString(16, receipt.after().schedulerState().name());
            nullableLong(statement, 17, receipt.catchUpAppliedTicks());
            nullableLong(statement, 18, receipt.catchUpRemainingTicks());
            if (receipt.catchUpComplete() == null) statement.setNull(19, Types.INTEGER);
            else statement.setInt(19, receipt.catchUpComplete() ? 1 : 0);
            statement.executeUpdate();
        }
    }

    private static void insertCheckpoint(Connection connection, UUID checkpointId, UUID worldId,
                                         CommandReceipt receipt, String reason) throws SQLException {
        ClockSnapshot snapshot = receipt.after();
        String sql = "INSERT INTO simulation_checkpoint(checkpoint_id, world_id, created_at, reason, "
                + "source_command_id, canonical_time, real_epoch, tick_sequence, tick_size_seconds, "
                + "tick_size_nanos, simulation_enabled, scheduler_state) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, checkpointId.toString());
            statement.setString(2, worldId.toString());
            statement.setString(3, receipt.completedAt().toString());
            statement.setString(4, reason);
            statement.setString(5, receipt.commandId().toString());
            statement.setString(6, snapshot.canonicalTime().toString());
            statement.setString(7, snapshot.realEpoch().toString());
            statement.setLong(8, snapshot.tickSequence());
            statement.setLong(9, snapshot.tickSize().getSeconds());
            statement.setInt(10, snapshot.tickSize().getNano());
            statement.setInt(11, snapshot.simulationEnabled() ? 1 : 0);
            statement.setString(12, snapshot.schedulerState().name());
            statement.executeUpdate();
        }
    }

    private static void updateCurrentState(Connection connection, UUID worldId, ClockSnapshot snapshot,
                                           UUID commandId, UUID checkpointId) throws SQLException {
        String sql = "UPDATE world_simulation_metadata SET canonical_time = ?, current_tick_sequence = ?, "
                + "tick_size_seconds = ?, tick_size_nanos = ?, simulation_enabled = ?, scheduler_state = ?, "
                + "last_command_id = ?, last_checkpoint_id = COALESCE(?, last_checkpoint_id) WHERE world_id = ?";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, snapshot.canonicalTime().toString());
            statement.setLong(2, snapshot.tickSequence());
            statement.setLong(3, snapshot.tickSize().getSeconds());
            statement.setInt(4, snapshot.tickSize().getNano());
            statement.setInt(5, snapshot.simulationEnabled() ? 1 : 0);
            statement.setString(6, snapshot.schedulerState().name());
            statement.setString(7, commandId.toString());
            if (checkpointId == null) statement.setNull(8, Types.VARCHAR);
            else statement.setString(8, checkpointId.toString());
            statement.setString(9, worldId.toString());
            if (statement.executeUpdate() != 1) {
                throw new SQLException("Simulation metadata row disappeared before command persistence.");
            }
        }
    }

    private static void insertAudit(Connection connection, UUID worldId, CommandReceipt receipt,
                                    UUID checkpointId, String reason) throws SQLException {
        String details = "{\"executionSequence\":" + receipt.acceptedSequence()
                + ",\"command\":\"" + json(receipt.command()) + "\",\"tickSequence\":"
                + receipt.after().tickSequence() + ",\"canonicalTime\":\""
                + receipt.after().canonicalTime() + "\",\"checkpointId\":"
                + (checkpointId == null ? "null" : "\"" + checkpointId + "\"")
                + ",\"checkpointReason\":"
                + (reason == null ? "null" : "\"" + json(reason) + "\"") + "}";
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO audit_entry(occurred_at, actor, action, entity_type, entity_id, details_json) "
                        + "VALUES (?, ?, 'simulation_command_persisted', 'simulation_command', ?, ?)")) {
            statement.setString(1, receipt.completedAt().toString());
            statement.setString(2, receipt.actor());
            statement.setString(3, receipt.commandId().toString());
            statement.setString(4, details);
            statement.executeUpdate();
        }
    }

    private static String normalizeReason(String requested, String command) {
        if (requested != null && !requested.isBlank()) return requested.trim();
        return "CHECKPOINT".equals(command) ? "Explicit checkpoint command" : null;
    }

    private static void nullableLong(PreparedStatement statement, int index, Long value) throws SQLException {
        if (value == null) statement.setNull(index, Types.BIGINT);
        else statement.setLong(index, value);
    }

    private static Instant instant(String value, String field) throws SQLException {
        if (value == null || value.isBlank()) {
            throw new SQLException("Simulation metadata is missing " + field + ".");
        }
        try { return Instant.parse(value); }
        catch (RuntimeException exception) {
            throw new SQLException("Simulation metadata has invalid " + field + ": " + value, exception);
        }
    }

    private static UUID uuid(String value) {
        return value == null || value.isBlank() ? null : UUID.fromString(value);
    }

    private static Duration requireTickSize(Duration tickSize) {
        Objects.requireNonNull(tickSize, "tickSize");
        if (tickSize.isZero() || tickSize.isNegative() || tickSize.getSeconds() <= 0) {
            throw new IllegalArgumentException("Persisted simulation tick size must be at least one second.");
        }
        return tickSize;
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
                throw new SQLException("Simulation persistence requires database schema "
                        + WorldStorageContracts.DATABASE_SCHEMA_VERSION + "; found " + version + ".");
            }
        }
    }

    private static void requireDriver() throws SQLException {
        try { Class.forName("org.sqlite.JDBC"); }
        catch (ClassNotFoundException exception) {
            throw new SQLException("SQLite JDBC driver is unavailable.", exception);
        }
    }

    private static String json(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t");
    }

    public record RecoveryState(UUID worldId, ClockSnapshot snapshot, long lastExecutionSequence,
                                UUID lastCommandId, UUID lastCheckpointId) {
        public RecoveryState {
            Objects.requireNonNull(worldId, "worldId");
            Objects.requireNonNull(snapshot, "snapshot");
            if (lastExecutionSequence < 0) {
                throw new IllegalArgumentException("Last execution sequence cannot be negative.");
            }
        }
    }

    public record PersistResult(UUID worldId, UUID commandId, long executionSequence,
                                UUID checkpointId, ClockSnapshot snapshot, Instant persistedAt) {
        public PersistResult {
            Objects.requireNonNull(worldId, "worldId");
            Objects.requireNonNull(commandId, "commandId");
            if (executionSequence <= 0) throw new IllegalArgumentException("Execution sequence must be positive.");
            Objects.requireNonNull(snapshot, "snapshot");
            Objects.requireNonNull(persistedAt, "persistedAt");
        }
    }

    public static void verifyContract() throws Exception {
        Path root = Files.createTempDirectory("barotrauma-simulation-checkpoint-");
        try {
            UUID worldId = UUID.fromString("95000000-0000-0000-0000-000000000001");
            WorldPaths paths = WorldStorageContracts.createWorld(root, "Checkpoint Europa", worldId);
            UUID artifactId = UUID.fromString("95000000-0000-0000-0000-000000000002");
            try (SqliteWorldStore ignored = SqliteWorldStore.open(paths)) {
                // Initialize the schema and world metadata before installing a normalized-world fixture.
            }
            try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
                configure(connection);
                try (PreparedStatement artifact = connection.prepareStatement(
                        "INSERT INTO import_artifact(artifact_id, sha256, byte_length, source_name, source_kind, "
                                + "inspected_at, imported_at) VALUES (?, ?, 12, 'clock-world.json', 'web-suite-v22', ?, ?)")) {
                    artifact.setString(1, artifactId.toString());
                    artifact.setString(2, "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
                    artifact.setString(3, Instant.parse("2026-07-17T00:00:00Z").toString());
                    artifact.setString(4, Instant.parse("2026-07-17T00:01:00Z").toString());
                    artifact.executeUpdate();
                }
                try (PreparedStatement metadata = connection.prepareStatement(
                        "INSERT INTO world_simulation_metadata(world_id, canonical_time, real_epoch, "
                                + "last_simulated_at, imported_tick_sequence, imported_at, source_artifact_id, "
                                + "simulation_enabled, scheduler_state) VALUES (?, ?, ?, NULL, 12, ?, ?, 0, 'PAUSED')")) {
                    metadata.setString(1, worldId.toString());
                    metadata.setString(2, Instant.parse("2175-01-01T00:00:00Z").toString());
                    metadata.setString(3, Instant.parse("2026-06-20T08:00:00Z").toString());
                    metadata.setString(4, Instant.parse("2026-07-17T00:01:00Z").toString());
                    metadata.setString(5, artifactId.toString());
                    metadata.executeUpdate();
                }
            }

            Duration tickSize = Duration.ofMinutes(1);
            RecoveryState initial = load(paths, tickSize);
            require(initial.lastExecutionSequence() == 0 && initial.snapshot().tickSequence() == 12
                            && !initial.snapshot().simulationEnabled(),
                    "Initial recovery state failed.");

            CommandReceipt enabled;
            CommandReceipt stepped;
            try (SimulationCommandExecutor executor = new SimulationCommandExecutor(
                    DeterministicSimulationClock.restore(initial.snapshot()),
                    "checkpoint-contract-writer", initial.lastExecutionSequence())) {
                enabled = executor.submit(new SimulationCommandExecutor.Enable(), "checkpoint-test").join();
                persist(paths, enabled, null);
                stepped = executor.submit(new SimulationCommandExecutor.Step(2), "checkpoint-test").join();
                PersistResult result = persist(paths, stepped, "Manual verification checkpoint");
                require(result.checkpointId() != null, "Reviewed checkpoint was not created.");
            }

            RecoveryState recovered = load(paths, tickSize);
            require(recovered.lastExecutionSequence() == 2
                            && recovered.snapshot().tickSequence() == 14
                            && recovered.snapshot().simulationEnabled()
                            && recovered.snapshot().schedulerState() == SchedulerState.PAUSED,
                    "Durable command recovery failed.");
            require(recovered.lastCommandId().equals(stepped.commandId())
                            && recovered.lastCheckpointId() != null,
                    "Durable command or checkpoint pointer failed.");

            CommandReceipt checkpoint;
            try (SimulationCommandExecutor executor = new SimulationCommandExecutor(
                    DeterministicSimulationClock.restore(recovered.snapshot()),
                    "checkpoint-resume-writer", recovered.lastExecutionSequence())) {
                checkpoint = executor.submit(new SimulationCommandExecutor.Checkpoint(), "checkpoint-test").join();
                persist(paths, checkpoint, null);
            }
            require(load(paths, tickSize).lastExecutionSequence() == 3,
                    "Restarted command sequence was not persisted.");

            long commandsBefore = count(paths, "simulation_command_receipt");
            CommandReceipt stale = new CommandReceipt(4, UUID.randomUUID(), "checkpoint-test", "STEP",
                    Instant.now(), Instant.now(), 999L, initial.snapshot(), stepped.after(),
                    null, null, null);
            try {
                persist(paths, stale, null);
                throw new IllegalStateException("Stale command receipt unexpectedly committed.");
            } catch (SQLException expected) {
                require(expected.getMessage().contains("stale"), "Unexpected stale-command failure.");
            }
            require(count(paths, "simulation_command_receipt") == commandsBefore,
                    "Failed command persistence left a partial receipt.");
            require(count(paths, "simulation_checkpoint") == 2,
                    "Explicit and command checkpoints were not both retained.");
        } finally {
            deleteTree(root);
        }
    }

    private static long count(WorldPaths paths, String table) throws SQLException {
        if (!table.equals("simulation_command_receipt") && !table.equals("simulation_checkpoint")) {
            throw new IllegalArgumentException("Unsupported verification table.");
        }
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COUNT(*) FROM " + table)) {
            return result.next() ? result.getLong(1) : 0;
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
        System.out.println("Barotrauma durable simulation receipt and checkpoint contracts passed.");
    }
}
