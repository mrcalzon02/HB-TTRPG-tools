package io.github.mrcalzon02.barotrauma.simulation;

import io.github.mrcalzon02.barotrauma.persistence.PassiveWorldTickTransaction;
import io.github.mrcalzon02.barotrauma.persistence.PassiveWorldTickTransaction.TickResult;
import io.github.mrcalzon02.barotrauma.persistence.SimulationCheckpointStore;
import io.github.mrcalzon02.barotrauma.persistence.SimulationCheckpointStore.RecoveryState;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldLock;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;
import io.github.mrcalzon02.barotrauma.simulation.SimulationCommandExecutor.CommandReceipt;

import java.io.IOException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Consumer;

/** Process-wide automatic scheduler for explicitly enabled passive world-map simulation. */
public final class PassiveWorldSimulationService implements AutoCloseable {
    private static final Duration DEFAULT_TICK_SIZE = Duration.ofMinutes(1);
    private static final Map<java.nio.file.Path, PassiveWorldSimulationService> ACTIVE = new ConcurrentHashMap<>();

    private final WorldPaths world;
    private final Duration cadence;
    private final long ticksPerCycle;
    private final SimulationCommandExecutor writer;
    private final ScheduledExecutorService scheduler;
    private final CopyOnWriteArrayList<Consumer<Status>> listeners = new CopyOnWriteArrayList<>();
    private final AtomicBoolean closed = new AtomicBoolean();
    private final AtomicLong cyclesCommitted = new AtomicLong();
    private final Instant startedAt = Instant.now();
    private volatile ScheduledFuture<?> scheduled;
    private volatile TickResult lastResult;
    private volatile Throwable fault;
    private volatile boolean cycleRunning;
    private volatile long restartCatchUpTicks;
    private volatile PassiveWorldCatchUpPolicy.Plan restartCatchUpPlan;
    private volatile Instant lastCycleStartedAt;
    private volatile Instant lastCycleCompletedAt;
    private volatile Duration lastCycleDuration;

    private PassiveWorldSimulationService(WorldPaths world, Duration cadence, long ticksPerCycle,
                                          SimulationCommandExecutor writer) {
        this.world = world;
        this.cadence = cadence;
        this.ticksPerCycle = ticksPerCycle;
        this.writer = writer;
        this.scheduler = Executors.newSingleThreadScheduledExecutor(runnable -> {
            Thread thread = new Thread(runnable,
                    "barotrauma-passive-world-" + world.root().getFileName());
            thread.setDaemon(true);
            thread.setUncaughtExceptionHandler((ignored, throwable) -> throwable.printStackTrace(System.err));
            return thread;
        });
    }

    public static synchronized PassiveWorldSimulationService enable(
            WorldPaths world, Duration cadence, long ticksPerCycle) throws Exception {
        return enableInternal(world, cadence, ticksPerCycle, null);
    }

    private static PassiveWorldSimulationService enableInternal(
            WorldPaths world, Duration cadence, long ticksPerCycle,
            PassiveWorldCatchUpPolicy.Plan restartPlan) throws Exception {
        Objects.requireNonNull(world, "world");
        Duration effectiveCadence = requireCadence(cadence);
        if (ticksPerCycle < 1 || ticksPerCycle > 1_000) {
            throw new IllegalArgumentException("Passive ticks per cycle must be between 1 and 1000.");
        }
        java.nio.file.Path key = world.root().toAbsolutePath().normalize();
        PassiveWorldSimulationService existing = ACTIVE.get(key);
        if (existing != null && !existing.closed.get() && existing.fault == null) return existing;
        if (existing != null) {
            existing.closeInternal(false);
            ACTIVE.remove(key, existing);
        }

        RecoveryState recovery = SimulationCheckpointStore.load(world, DEFAULT_TICK_SIZE);
        DeterministicSimulationClock clock = DeterministicSimulationClock.restore(recovery.snapshot());
        SimulationCommandExecutor writer = new SimulationCommandExecutor(clock,
                "barotrauma-passive-writer-" + recovery.worldId(), recovery.lastExecutionSequence());
        PassiveWorldSimulationService service = new PassiveWorldSimulationService(
                world, effectiveCadence, ticksPerCycle, writer);
        try {
            if (!recovery.snapshot().simulationEnabled()) {
                CommandReceipt enabled = writer.submit(new SimulationCommandExecutor.Enable(),
                        "passive-world-runtime").join();
                SimulationCheckpointStore.persist(world, enabled, "Passive world mode enabled");
            }
            service.writeConfiguration(true);
            ACTIVE.put(key, service);

            long initialDelay = 0L;
            if (restartPlan != null && restartPlan.required()) {
                service.applyRestartCatchUp(restartPlan);
                initialDelay = effectiveCadence.toMillis();
            }
            service.scheduled = service.scheduler.scheduleWithFixedDelay(service::runCycle,
                    initialDelay, effectiveCadence.toMillis(), TimeUnit.MILLISECONDS);
            service.publish();
            return service;
        } catch (Exception exception) {
            service.fault = unwrap(exception);
            try { service.writeConfiguration(false); }
            catch (Exception secondary) { service.fault.addSuppressed(secondary); }
            service.closeInternal(false);
            throw exception;
        }
    }

    public static synchronized PassiveWorldSimulationService resumeIfEnabled(WorldPaths world) throws Exception {
        PassiveConfiguration configuration = readConfiguration(world);
        if (configuration == null || !configuration.enabled()) return null;
        Duration cadence = Duration.ofSeconds(configuration.cadenceSeconds());
        PassiveWorldCatchUpPolicy.Plan restartPlan = PassiveWorldCatchUpPolicy.plan(
                configuration.lastCycleAt(), Instant.now(), cadence, configuration.ticksPerCycle());
        return enableInternal(world, cadence, configuration.ticksPerCycle(), restartPlan);
    }

    public static PassiveWorldSimulationService active(WorldPaths world) {
        if (world == null) return null;
        return ACTIVE.get(world.root().toAbsolutePath().normalize());
    }

    public static synchronized void disable(WorldPaths world) throws Exception {
        if (world == null) return;
        PassiveWorldSimulationService service = ACTIVE.remove(world.root().toAbsolutePath().normalize());
        if (service != null) service.closeInternal(true);
        else writeConfiguration(world, false, 5, 1);
    }

    public static PassiveConfiguration configuration(WorldPaths world) throws Exception {
        return readConfiguration(world);
    }

    public AutoCloseable addListener(Consumer<Status> listener, boolean notifyImmediately) {
        Objects.requireNonNull(listener, "listener");
        listeners.add(listener);
        if (notifyImmediately) notifyListener(listener, status());
        return () -> listeners.remove(listener);
    }

    public Status status() {
        return new Status(world, !closed.get() && fault == null, cycleRunning, cadence, ticksPerCycle,
                lastResult, fault, Instant.now());
    }

    public Health health() {
        return new Health(world, !closed.get() && fault == null, cycleRunning, startedAt,
                cyclesCommitted.get(), restartCatchUpTicks, restartCatchUpPlan,
                lastCycleStartedAt, lastCycleCompletedAt, lastCycleDuration, fault);
    }

    private void applyRestartCatchUp(PassiveWorldCatchUpPolicy.Plan plan) throws Exception {
        restartCatchUpPlan = Objects.requireNonNull(plan, "plan");
        if (!plan.required()) return;
        cycleRunning = true;
        lastCycleStartedAt = Instant.now();
        publish();
        try {
            lastResult = commitStep(plan.appliedTicks(), "passive-world-restart-catch-up");
            restartCatchUpTicks = plan.appliedTicks();
            cyclesCommitted.incrementAndGet();
        } finally {
            lastCycleCompletedAt = Instant.now();
            lastCycleDuration = Duration.between(lastCycleStartedAt, lastCycleCompletedAt);
            cycleRunning = false;
            publish();
        }
    }

    private void runCycle() {
        if (closed.get() || fault != null) return;
        cycleRunning = true;
        lastCycleStartedAt = Instant.now();
        publish();
        try {
            lastResult = commitStep(ticksPerCycle, "passive-world-runtime");
            cyclesCommitted.incrementAndGet();
        } catch (Throwable throwable) {
            fault = unwrap(throwable);
            try { writeConfiguration(false); } catch (Exception secondary) { fault.addSuppressed(secondary); }
            ScheduledFuture<?> task = scheduled;
            if (task != null) task.cancel(false);
        } finally {
            lastCycleCompletedAt = Instant.now();
            lastCycleDuration = Duration.between(lastCycleStartedAt, lastCycleCompletedAt);
            cycleRunning = false;
            publish();
        }
    }

    private TickResult commitStep(long ticks, String actor) throws Exception {
        CommandReceipt receipt = writer.submit(new SimulationCommandExecutor.Step(ticks), actor).join();
        return PassiveWorldTickTransaction.commit(world, receipt);
    }

    private void writeConfiguration(boolean enabled) throws IOException, SQLException {
        writeConfiguration(world, enabled, Math.toIntExact(cadence.toSeconds()), Math.toIntExact(ticksPerCycle));
    }

    private static void writeConfiguration(WorldPaths world, boolean enabled,
                                           int cadenceSeconds, int ticksPerCycle)
            throws IOException, SQLException {
        requireDriver();
        try (WorldLock ignored = WorldStorageContracts.acquireExclusiveLock(world);
             Connection connection = DriverManager.getConnection("jdbc:sqlite:" + world.database())) {
            configure(connection);
            String worldId = worldId(connection);
            try (PreparedStatement statement = connection.prepareStatement(
                    "INSERT INTO passive_simulation_config(world_id,enabled,cadence_seconds,ticks_per_cycle,updated_at) "
                            + "VALUES (?,?,?,?,?) ON CONFLICT(world_id) DO UPDATE SET enabled=excluded.enabled, "
                            + "cadence_seconds=excluded.cadence_seconds, ticks_per_cycle=excluded.ticks_per_cycle, "
                            + "updated_at=excluded.updated_at")) {
                statement.setString(1, worldId);
                statement.setInt(2, enabled ? 1 : 0);
                statement.setInt(3, cadenceSeconds);
                statement.setInt(4, ticksPerCycle);
                statement.setString(5, Instant.now().toString());
                statement.executeUpdate();
            }
        }
    }

    private static PassiveConfiguration readConfiguration(WorldPaths world) throws Exception {
        Objects.requireNonNull(world, "world");
        requireDriver();
        try (WorldLock ignored = WorldStorageContracts.acquireExclusiveLock(world);
             Connection connection = DriverManager.getConnection("jdbc:sqlite:" + world.database())) {
            configure(connection);
            String id = worldId(connection);
            try (PreparedStatement statement = connection.prepareStatement(
                    "SELECT enabled,cadence_seconds,ticks_per_cycle,last_cycle_at,last_cycle_tick "
                            + "FROM passive_simulation_config WHERE world_id=?")) {
                statement.setString(1, id);
                try (ResultSet result = statement.executeQuery()) {
                    if (!result.next()) return null;
                    String lastCycle = result.getString("last_cycle_at");
                    Object lastTick = result.getObject("last_cycle_tick");
                    return new PassiveConfiguration(result.getInt("enabled") == 1,
                            result.getInt("cadence_seconds"), result.getInt("ticks_per_cycle"),
                            lastCycle == null ? null : Instant.parse(lastCycle),
                            lastTick == null ? null : result.getLong("last_cycle_tick"));
                }
            }
        }
    }

    private static String worldId(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT world_id FROM world_metadata LIMIT 1")) {
            if (!result.next()) throw new SQLException("Passive simulation world metadata is missing.");
            return result.getString(1);
        }
    }

    private void publish() {
        Status current = status();
        for (Consumer<Status> listener : listeners) notifyListener(listener, current);
    }

    private static void notifyListener(Consumer<Status> listener, Status status) {
        try { listener.accept(status); }
        catch (RuntimeException exception) {
            System.err.println("Passive simulation listener failed: " + exception.getMessage());
        }
    }

    @Override
    public void close() {
        closeInternal(false);
    }

    private synchronized void closeInternal(boolean persistDisabled) {
        if (!closed.compareAndSet(false, true)) return;
        ScheduledFuture<?> task = scheduled;
        if (task != null) task.cancel(false);
        scheduler.shutdown();
        try {
            scheduler.awaitTermination(5, TimeUnit.SECONDS);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        }
        if (persistDisabled && fault == null) {
            try {
                CommandReceipt disabled = writer.submit(new SimulationCommandExecutor.Disable(),
                        "passive-world-runtime").join();
                SimulationCheckpointStore.persist(world, disabled, "Passive world mode disabled");
                writeConfiguration(false);
            } catch (Exception exception) {
                fault = unwrap(exception);
            }
        }
        writer.close();
        ACTIVE.remove(world.root().toAbsolutePath().normalize(), this);
        publish();
    }

    private static Duration requireCadence(Duration cadence) {
        Objects.requireNonNull(cadence, "cadence");
        if (cadence.isNegative() || cadence.isZero() || cadence.compareTo(Duration.ofHours(1)) > 0
                || cadence.toSeconds() < 1) {
            throw new IllegalArgumentException("Passive cadence must be between one second and one hour.");
        }
        return cadence;
    }

    private static void configure(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys=ON");
            statement.execute("PRAGMA busy_timeout=5000");
            statement.execute("PRAGMA journal_mode=WAL");
            statement.execute("PRAGMA synchronous=FULL");
        }
    }

    private static void requireDriver() throws SQLException {
        try { Class.forName("org.sqlite.JDBC"); }
        catch (ClassNotFoundException exception) { throw new SQLException("SQLite JDBC driver is unavailable.", exception); }
    }

    private static Throwable unwrap(Throwable throwable) {
        Throwable current = throwable;
        while ((current instanceof java.util.concurrent.CompletionException
                || current instanceof java.util.concurrent.ExecutionException)
                && current.getCause() != null) current = current.getCause();
        return current;
    }

    public record PassiveConfiguration(boolean enabled, int cadenceSeconds, int ticksPerCycle,
                                       Instant lastCycleAt, Long lastCycleTick) { }

    public record Status(WorldPaths world, boolean running, boolean cycleRunning, Duration cadence,
                         long ticksPerCycle, TickResult lastResult, Throwable fault, Instant observedAt) { }

    public record Health(WorldPaths world, boolean running, boolean cycleRunning, Instant startedAt,
                         long cyclesCommitted, long restartCatchUpTicks,
                         PassiveWorldCatchUpPolicy.Plan restartCatchUpPlan,
                         Instant lastCycleStartedAt, Instant lastCycleCompletedAt,
                         Duration lastCycleDuration, Throwable fault) { }
}
