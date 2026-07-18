package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;
import io.github.mrcalzon02.barotrauma.simulation.DeterministicSimulationClock.ClockSnapshot;
import io.github.mrcalzon02.barotrauma.simulation.DeterministicSimulationClock.SchedulerState;

import java.nio.file.Files;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/** Read-only query model for durable simulation clock, command, and checkpoint evidence. */
public final class SimulationEvidenceRegistry {
    public static final int DEFAULT_LIMIT = 500;

    private SimulationEvidenceRegistry() { }

    public static RegistrySnapshot load(WorldPaths paths) throws SQLException {
        return load(paths, DEFAULT_LIMIT);
    }

    public static RegistrySnapshot load(WorldPaths paths, int limit) throws SQLException {
        Objects.requireNonNull(paths, "paths");
        if (limit < 1 || limit > 10_000) throw new IllegalArgumentException("Evidence limit must be 1-10000.");
        if (!Files.isRegularFile(paths.database())) {
            throw new SQLException("The selected desktop world has not initialized its database yet.");
        }
        requireDriver();
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configureReadOnly(connection);
            verifySchema(connection);
            Summary summary = readSummary(connection);
            return new RegistrySnapshot(summary, readCommands(connection, limit), readCheckpoints(connection, limit));
        }
    }

    private static Summary readSummary(Connection connection) throws SQLException {
        String sql = "SELECT wm.world_id, wm.display_name, sm.canonical_time, sm.real_epoch, "
                + "COALESCE(sm.current_tick_sequence, sm.imported_tick_sequence) AS current_tick_sequence, "
                + "sm.tick_size_seconds, sm.tick_size_nanos, sm.simulation_enabled, sm.scheduler_state, "
                + "sm.last_command_id, sm.last_checkpoint_id, "
                + "(SELECT COUNT(*) FROM simulation_command_receipt scr WHERE scr.world_id = wm.world_id) AS command_count, "
                + "(SELECT COUNT(*) FROM simulation_checkpoint sc WHERE sc.world_id = wm.world_id) AS checkpoint_count "
                + "FROM world_metadata wm LEFT JOIN world_simulation_metadata sm ON sm.world_id = wm.world_id LIMIT 1";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new SQLException("Desktop world metadata row is missing.");
            boolean initialized = result.getString("canonical_time") != null;
            ClockSnapshot clock = null;
            if (initialized) {
                long seconds = result.getObject("tick_size_seconds") == null ? 60L : result.getLong("tick_size_seconds");
                int nanos = result.getObject("tick_size_nanos") == null ? 0 : result.getInt("tick_size_nanos");
                SchedulerState state;
                try { state = SchedulerState.valueOf(result.getString("scheduler_state")); }
                catch (RuntimeException exception) { throw new SQLException("Stored scheduler state is invalid.", exception); }
                clock = new ClockSnapshot(
                        instant(result.getString("canonical_time")),
                        instant(result.getString("real_epoch")),
                        result.getLong("current_tick_sequence"),
                        Duration.ofSeconds(seconds, nanos),
                        result.getInt("simulation_enabled") == 1,
                        state
                );
            }
            return new Summary(
                    UUID.fromString(result.getString("world_id")),
                    result.getString("display_name"),
                    initialized,
                    clock,
                    uuid(result.getString("last_command_id")),
                    uuid(result.getString("last_checkpoint_id")),
                    result.getLong("command_count"),
                    result.getLong("checkpoint_count")
            );
        }
    }

    private static List<CommandRow> readCommands(Connection connection, int limit) throws SQLException {
        List<CommandRow> rows = new ArrayList<>();
        String sql = "SELECT command_id, execution_sequence, actor, command, submitted_at, completed_at, "
                + "writer_thread_id, before_canonical_time, before_tick_sequence, before_simulation_enabled, "
                + "before_scheduler_state, after_canonical_time, after_tick_sequence, after_simulation_enabled, "
                + "after_scheduler_state, catch_up_applied_ticks, catch_up_remaining_ticks, catch_up_complete "
                + "FROM simulation_command_receipt ORDER BY execution_sequence DESC LIMIT ?";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setInt(1, limit);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) {
                    rows.add(new CommandRow(
                            UUID.fromString(result.getString("command_id")),
                            result.getLong("execution_sequence"),
                            result.getString("actor"),
                            result.getString("command"),
                            instant(result.getString("submitted_at")),
                            instant(result.getString("completed_at")),
                            result.getLong("writer_thread_id"),
                            instant(result.getString("before_canonical_time")),
                            result.getLong("before_tick_sequence"),
                            result.getInt("before_simulation_enabled") == 1,
                            result.getString("before_scheduler_state"),
                            instant(result.getString("after_canonical_time")),
                            result.getLong("after_tick_sequence"),
                            result.getInt("after_simulation_enabled") == 1,
                            result.getString("after_scheduler_state"),
                            nullableLong(result, "catch_up_applied_ticks"),
                            nullableLong(result, "catch_up_remaining_ticks"),
                            nullableBoolean(result, "catch_up_complete")
                    ));
                }
            }
        }
        return List.copyOf(rows);
    }

    private static List<CheckpointRow> readCheckpoints(Connection connection, int limit) throws SQLException {
        List<CheckpointRow> rows = new ArrayList<>();
        String sql = "SELECT checkpoint_id, created_at, reason, source_command_id, canonical_time, real_epoch, "
                + "tick_sequence, tick_size_seconds, tick_size_nanos, simulation_enabled, scheduler_state "
                + "FROM simulation_checkpoint ORDER BY created_at DESC LIMIT ?";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setInt(1, limit);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) {
                    rows.add(new CheckpointRow(
                            UUID.fromString(result.getString("checkpoint_id")),
                            instant(result.getString("created_at")),
                            result.getString("reason"),
                            uuid(result.getString("source_command_id")),
                            new ClockSnapshot(
                                    instant(result.getString("canonical_time")),
                                    instant(result.getString("real_epoch")),
                                    result.getLong("tick_sequence"),
                                    Duration.ofSeconds(result.getLong("tick_size_seconds"),
                                            result.getInt("tick_size_nanos")),
                                    result.getInt("simulation_enabled") == 1,
                                    SchedulerState.valueOf(result.getString("scheduler_state"))
                            )
                    ));
                }
            }
        }
        return List.copyOf(rows);
    }

    private static void configureReadOnly(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys = ON");
            statement.execute("PRAGMA busy_timeout = 5000");
            statement.execute("PRAGMA query_only = ON");
        }
    }

    private static void verifySchema(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COALESCE(MAX(version), 0) FROM schema_migration")) {
            int version = result.next() ? result.getInt(1) : 0;
            if (version != WorldStorageContracts.DATABASE_SCHEMA_VERSION) {
                throw new SQLException("Simulation evidence requires database schema "
                        + WorldStorageContracts.DATABASE_SCHEMA_VERSION + "; found " + version + ".");
            }
        }
    }

    private static Instant instant(String value) throws SQLException {
        if (value == null || value.isBlank()) throw new SQLException("Stored simulation timestamp is missing.");
        try { return Instant.parse(value); }
        catch (RuntimeException exception) { throw new SQLException("Stored simulation timestamp is invalid: " + value, exception); }
    }

    private static UUID uuid(String value) {
        return value == null || value.isBlank() ? null : UUID.fromString(value);
    }

    private static Long nullableLong(ResultSet result, String column) throws SQLException {
        return result.getObject(column) == null ? null : result.getLong(column);
    }

    private static Boolean nullableBoolean(ResultSet result, String column) throws SQLException {
        return result.getObject(column) == null ? null : result.getInt(column) == 1;
    }

    private static void requireDriver() throws SQLException {
        try { Class.forName("org.sqlite.JDBC"); }
        catch (ClassNotFoundException exception) { throw new SQLException("SQLite JDBC driver is unavailable.", exception); }
    }

    public record RegistrySnapshot(Summary summary, List<CommandRow> commands,
                                   List<CheckpointRow> checkpoints) {
        public RegistrySnapshot {
            Objects.requireNonNull(summary, "summary");
            commands = List.copyOf(commands);
            checkpoints = List.copyOf(checkpoints);
        }
    }

    public record Summary(UUID worldId, String displayName, boolean initialized,
                          ClockSnapshot clock, UUID lastCommandId, UUID lastCheckpointId,
                          long commandCount, long checkpointCount) { }

    public record CommandRow(UUID commandId, long executionSequence, String actor, String command,
                             Instant submittedAt, Instant completedAt, long writerThreadId,
                             Instant beforeCanonicalTime, long beforeTickSequence,
                             boolean beforeSimulationEnabled, String beforeSchedulerState,
                             Instant afterCanonicalTime, long afterTickSequence,
                             boolean afterSimulationEnabled, String afterSchedulerState,
                             Long catchUpAppliedTicks, Long catchUpRemainingTicks,
                             Boolean catchUpComplete) { }

    public record CheckpointRow(UUID checkpointId, Instant createdAt, String reason,
                                UUID sourceCommandId, ClockSnapshot snapshot) { }
}
