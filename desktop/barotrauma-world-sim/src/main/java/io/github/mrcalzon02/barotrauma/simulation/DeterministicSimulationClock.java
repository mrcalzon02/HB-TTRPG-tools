package io.github.mrcalzon02.barotrauma.simulation;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;

/**
 * Deterministic canonical-time clock for the future single-writer world simulation.
 *
 * <p>The clock contains no threads, timers, Swing dependencies, or database access. A later
 * simulation executor will own one instance and serialize commands through it. Imported worlds
 * begin disabled and paused; no wall-clock time advances the world implicitly.</p>
 */
public final class DeterministicSimulationClock {
    public static final long MAX_TICKS_PER_COMMAND = 1_000_000L;

    private final Duration tickSize;
    private Instant canonicalTime;
    private final Instant realEpoch;
    private long tickSequence;
    private boolean simulationEnabled;
    private SchedulerState schedulerState;

    private DeterministicSimulationClock(
            Instant canonicalTime,
            Instant realEpoch,
            long tickSequence,
            Duration tickSize,
            boolean simulationEnabled,
            SchedulerState schedulerState
    ) {
        this.canonicalTime = Objects.requireNonNull(canonicalTime, "canonicalTime");
        this.realEpoch = Objects.requireNonNull(realEpoch, "realEpoch");
        this.tickSize = requireTickSize(tickSize);
        if (tickSequence < 0) throw new IllegalArgumentException("Tick sequence cannot be negative.");
        this.tickSequence = tickSequence;
        this.simulationEnabled = simulationEnabled;
        this.schedulerState = Objects.requireNonNull(schedulerState, "schedulerState");
        if (!simulationEnabled
                && schedulerState != SchedulerState.PAUSED
                && schedulerState != SchedulerState.FAULTED) {
            throw new IllegalArgumentException("A disabled simulation must remain PAUSED or FAULTED.");
        }
    }

    public static DeterministicSimulationClock imported(
            Instant canonicalTime,
            Instant realEpoch,
            long importedTickSequence,
            Duration tickSize
    ) {
        return new DeterministicSimulationClock(canonicalTime, realEpoch, importedTickSequence,
                tickSize, false, SchedulerState.PAUSED);
    }

    public static DeterministicSimulationClock restore(ClockSnapshot snapshot) {
        Objects.requireNonNull(snapshot, "snapshot");
        return new DeterministicSimulationClock(snapshot.canonicalTime(), snapshot.realEpoch(),
                snapshot.tickSequence(), snapshot.tickSize(), snapshot.simulationEnabled(),
                snapshot.schedulerState());
    }

    public synchronized ClockSnapshot enable() {
        requireNotFaulted();
        simulationEnabled = true;
        schedulerState = SchedulerState.PAUSED;
        return snapshot();
    }

    public synchronized ClockSnapshot disable() {
        simulationEnabled = false;
        schedulerState = SchedulerState.PAUSED;
        return snapshot();
    }

    public synchronized ClockSnapshot start() {
        requireEnabled();
        requireNotFaulted();
        schedulerState = SchedulerState.RUNNING;
        return snapshot();
    }

    public synchronized ClockSnapshot pause() {
        requireNotFaulted();
        schedulerState = SchedulerState.PAUSED;
        return snapshot();
    }

    public synchronized ClockSnapshot fault() {
        simulationEnabled = false;
        schedulerState = SchedulerState.FAULTED;
        return snapshot();
    }

    /** Advances an enabled paused clock by an explicit number of complete ticks. */
    public synchronized ClockSnapshot step(long ticks) {
        requireEnabled();
        requireState(SchedulerState.PAUSED, "Step requires a PAUSED scheduler.");
        advance(ticks);
        return snapshot();
    }

    /** Advances an enabled running clock when called by the future single-writer executor. */
    public synchronized ClockSnapshot advanceRunning(long ticks) {
        requireEnabled();
        requireState(SchedulerState.RUNNING, "Running advancement requires a RUNNING scheduler.");
        advance(ticks);
        return snapshot();
    }

    /**
     * Applies at most {@code maxTicks} complete ticks toward a canonical target and returns to PAUSED.
     * Partial tick durations are never rounded upward and the target is never overshot.
     */
    public synchronized CatchUpResult catchUpTo(Instant targetCanonicalTime, long maxTicks) {
        requireEnabled();
        requireNotFaulted();
        Objects.requireNonNull(targetCanonicalTime, "targetCanonicalTime");
        requireTickCount(maxTicks, true);
        if (targetCanonicalTime.isBefore(canonicalTime)) {
            throw new IllegalArgumentException("Catch-up target cannot precede canonical time.");
        }

        long availableTicks = completeTicksBetween(canonicalTime, targetCanonicalTime, tickSize);
        long appliedTicks = Math.min(availableTicks, maxTicks);
        schedulerState = SchedulerState.CATCHING_UP;
        if (appliedTicks > 0) advance(appliedTicks);
        schedulerState = SchedulerState.PAUSED;
        long remainingTicks = availableTicks - appliedTicks;
        return new CatchUpResult(snapshot(), appliedTicks, remainingTicks,
                remainingTicks == 0, targetCanonicalTime);
    }

    public synchronized ClockSnapshot apply(Command command) {
        Objects.requireNonNull(command, "command");
        if (command instanceof Enable) return enable();
        if (command instanceof Disable) return disable();
        if (command instanceof Start) return start();
        if (command instanceof Pause) return pause();
        if (command instanceof Step step) return step(step.ticks());
        if (command instanceof AdvanceRunning running) return advanceRunning(running.ticks());
        throw new IllegalArgumentException("CatchUp commands return CatchUpResult and must use applyCatchUp.");
    }

    public synchronized CatchUpResult applyCatchUp(CatchUp command) {
        Objects.requireNonNull(command, "command");
        return catchUpTo(command.targetCanonicalTime(), command.maxTicks());
    }

    public synchronized ClockSnapshot snapshot() {
        return new ClockSnapshot(canonicalTime, realEpoch, tickSequence, tickSize,
                simulationEnabled, schedulerState);
    }

    private void advance(long ticks) {
        requireTickCount(ticks, false);
        long seconds = Math.multiplyExact(tickSize.getSeconds(), ticks);
        long nanos = Math.multiplyExact(tickSize.getNano(), ticks);
        canonicalTime = canonicalTime.plusSeconds(seconds).plusNanos(nanos);
        tickSequence = Math.addExact(tickSequence, ticks);
    }

    private void requireEnabled() {
        if (!simulationEnabled) throw new IllegalStateException("Simulation is disabled.");
    }

    private void requireNotFaulted() {
        if (schedulerState == SchedulerState.FAULTED) {
            throw new IllegalStateException("A FAULTED clock must be restored from a reviewed checkpoint.");
        }
    }

    private void requireState(SchedulerState expected, String message) {
        requireNotFaulted();
        if (schedulerState != expected) throw new IllegalStateException(message);
    }

    private static Duration requireTickSize(Duration value) {
        Objects.requireNonNull(value, "tickSize");
        if (value.isZero() || value.isNegative()) {
            throw new IllegalArgumentException("Tick size must be positive.");
        }
        return value;
    }

    private static void requireTickCount(long ticks, boolean allowZero) {
        long minimum = allowZero ? 0 : 1;
        if (ticks < minimum || ticks > MAX_TICKS_PER_COMMAND) {
            throw new IllegalArgumentException("Tick count must be between " + minimum
                    + " and " + MAX_TICKS_PER_COMMAND + ".");
        }
    }

    private static long completeTicksBetween(Instant from, Instant to, Duration tickSize) {
        Duration distance = Duration.between(from, to);
        if (distance.isZero()) return 0;
        long tickNanos;
        long distanceNanos;
        try {
            tickNanos = tickSize.toNanos();
            distanceNanos = distance.toNanos();
        } catch (ArithmeticException exception) {
            long seconds = distance.getSeconds();
            long tickSeconds = tickSize.getSeconds();
            if (tickSize.getNano() != 0 || tickSeconds <= 0) {
                throw new IllegalArgumentException("Catch-up duration is too large for a sub-second tick size.", exception);
            }
            return seconds / tickSeconds;
        }
        return distanceNanos / tickNanos;
    }

    public enum SchedulerState {
        PAUSED,
        RUNNING,
        CATCHING_UP,
        FAULTED
    }

    public sealed interface Command permits Enable, Disable, Start, Pause, Step, AdvanceRunning, CatchUp { }
    public record Enable() implements Command { }
    public record Disable() implements Command { }
    public record Start() implements Command { }
    public record Pause() implements Command { }
    public record Step(long ticks) implements Command { }
    public record AdvanceRunning(long ticks) implements Command { }
    public record CatchUp(Instant targetCanonicalTime, long maxTicks) implements Command {
        public CatchUp { Objects.requireNonNull(targetCanonicalTime, "targetCanonicalTime"); }
    }

    public record ClockSnapshot(
            Instant canonicalTime,
            Instant realEpoch,
            long tickSequence,
            Duration tickSize,
            boolean simulationEnabled,
            SchedulerState schedulerState
    ) {
        public ClockSnapshot {
            Objects.requireNonNull(canonicalTime, "canonicalTime");
            Objects.requireNonNull(realEpoch, "realEpoch");
            requireTickSize(tickSize);
            if (tickSequence < 0) throw new IllegalArgumentException("Tick sequence cannot be negative.");
            Objects.requireNonNull(schedulerState, "schedulerState");
        }
    }

    public record CatchUpResult(
            ClockSnapshot snapshot,
            long appliedTicks,
            long remainingTicks,
            boolean complete,
            Instant targetCanonicalTime
    ) {
        public CatchUpResult {
            Objects.requireNonNull(snapshot, "snapshot");
            if (appliedTicks < 0 || remainingTicks < 0) {
                throw new IllegalArgumentException("Catch-up counts cannot be negative.");
            }
            Objects.requireNonNull(targetCanonicalTime, "targetCanonicalTime");
            if (complete != (remainingTicks == 0)) {
                throw new IllegalArgumentException("Catch-up completion flag does not match remaining ticks.");
            }
        }
    }

    public static void verifyContract() {
        Instant canonical = Instant.parse("2175-01-01T00:00:00Z");
        Instant epoch = Instant.parse("2026-06-20T08:00:00Z");
        Duration tick = Duration.ofMinutes(1);
        DeterministicSimulationClock clock = imported(canonical, epoch, 12, tick);
        require(!clock.snapshot().simulationEnabled()
                        && clock.snapshot().schedulerState() == SchedulerState.PAUSED,
                "Imported clock did not begin disabled and paused.");
        failure(clock::start, "disabled");

        clock.apply(new Enable());
        ClockSnapshot stepped = clock.apply(new Step(3));
        require(stepped.canonicalTime().equals(canonical.plus(Duration.ofMinutes(3)))
                        && stepped.tickSequence() == 15,
                "Explicit stepping was not deterministic.");

        clock.apply(new Start());
        ClockSnapshot running = clock.apply(new AdvanceRunning(2));
        require(running.canonicalTime().equals(canonical.plus(Duration.ofMinutes(5)))
                        && running.tickSequence() == 17
                        && running.schedulerState() == SchedulerState.RUNNING,
                "Running advancement failed.");
        clock.apply(new Pause());

        Instant target = canonical.plus(Duration.ofMinutes(15).plusSeconds(30));
        CatchUpResult first = clock.applyCatchUp(new CatchUp(target, 4));
        require(first.appliedTicks() == 4 && first.remainingTicks() == 6 && !first.complete(),
                "Bounded catch-up failed.");
        require(first.snapshot().canonicalTime().equals(canonical.plus(Duration.ofMinutes(9)))
                        && first.snapshot().schedulerState() == SchedulerState.PAUSED,
                "Catch-up did not return to PAUSED.");
        CatchUpResult second = clock.applyCatchUp(new CatchUp(target, 10));
        require(second.appliedTicks() == 6 && second.remainingTicks() == 0 && second.complete(),
                "Catch-up completion failed.");
        require(second.snapshot().canonicalTime().equals(canonical.plus(Duration.ofMinutes(15))),
                "Catch-up overshot or rounded a partial tick.");

        DeterministicSimulationClock restored = restore(second.snapshot());
        require(restored.snapshot().equals(second.snapshot()), "Checkpoint restore changed clock state.");

        DeterministicSimulationClock replay = imported(canonical, epoch, 12, tick);
        replay.enable();
        replay.step(3);
        replay.start();
        replay.advanceRunning(2);
        replay.pause();
        replay.catchUpTo(target, 4);
        CatchUpResult replayResult = replay.catchUpTo(target, 10);
        require(replayResult.snapshot().equals(second.snapshot()), "Command replay was not deterministic.");

        failure(() -> restored.step(0), "between");
        failure(() -> restored.catchUpTo(canonical.minusSeconds(1), 1), "precede");
        restored.fault();
        ClockSnapshot faulted = restored.snapshot();
        require(restore(faulted).snapshot().equals(faulted), "FAULTED checkpoint restore changed state.");
        failure(restored::enable, "FAULTED");
    }

    private static void failure(Runnable action, String expected) {
        RuntimeException failure = null;
        try {
            action.run();
        } catch (IllegalArgumentException | IllegalStateException exception) {
            failure = exception;
        }
        if (failure == null) {
            throw new IllegalStateException("Expected clock failure containing: " + expected);
        }
        require(failure.getMessage() != null && failure.getMessage().contains(expected),
                "Unexpected clock failure: " + failure.getMessage());
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    public static void main(String[] args) {
        verifyContract();
        System.out.println("Barotrauma deterministic simulation clock contracts passed.");
    }
}
