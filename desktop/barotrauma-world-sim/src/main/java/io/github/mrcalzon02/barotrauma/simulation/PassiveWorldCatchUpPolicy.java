package io.github.mrcalzon02.barotrauma.simulation;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;

/** Pure bounded policy for translating passive-runtime downtime into deterministic catch-up ticks. */
public final class PassiveWorldCatchUpPolicy {
    public static final long MAX_RESTART_CATCH_UP_TICKS = 1_000L;
    public static final long MAX_RESTART_CATCH_UP_CYCLES = 240L;

    private PassiveWorldCatchUpPolicy() { }

    public static Plan plan(Instant lastCycleAt, Instant now, Duration cadence, long ticksPerCycle) {
        Objects.requireNonNull(now, "now");
        Objects.requireNonNull(cadence, "cadence");
        if (cadence.isZero() || cadence.isNegative()) {
            throw new IllegalArgumentException("Catch-up cadence must be positive.");
        }
        if (ticksPerCycle < 1 || ticksPerCycle > 1_000) {
            throw new IllegalArgumentException("Catch-up ticks per cycle must be between 1 and 1000.");
        }
        if (lastCycleAt == null || !now.isAfter(lastCycleAt)) {
            return new Plan(Duration.ZERO, 0, 0, 0, false);
        }

        Duration downtime = Duration.between(lastCycleAt, now);
        long cadenceMillis = Math.max(1L, cadence.toMillis());
        long elapsedMillis;
        try {
            elapsedMillis = downtime.toMillis();
        } catch (ArithmeticException exception) {
            elapsedMillis = Long.MAX_VALUE;
        }
        long elapsedCycles = elapsedMillis / cadenceMillis;
        if (elapsedCycles <= 0) return new Plan(downtime, 0, 0, 0, false);

        long boundedCycles = Math.min(elapsedCycles, MAX_RESTART_CATCH_UP_CYCLES);
        long requestedTicks;
        try {
            requestedTicks = Math.multiplyExact(elapsedCycles, ticksPerCycle);
        } catch (ArithmeticException exception) {
            requestedTicks = Long.MAX_VALUE;
        }
        long boundedCycleTicks;
        try {
            boundedCycleTicks = Math.multiplyExact(boundedCycles, ticksPerCycle);
        } catch (ArithmeticException exception) {
            boundedCycleTicks = Long.MAX_VALUE;
        }
        long appliedTicks = Math.min(boundedCycleTicks, MAX_RESTART_CATCH_UP_TICKS);
        boolean capped = elapsedCycles > boundedCycles || requestedTicks > appliedTicks;
        return new Plan(downtime, elapsedCycles, requestedTicks, appliedTicks, capped);
    }

    public record Plan(Duration downtime, long elapsedCycles, long requestedTicks,
                       long appliedTicks, boolean capped) {
        public Plan {
            Objects.requireNonNull(downtime, "downtime");
            if (downtime.isNegative() || elapsedCycles < 0 || requestedTicks < 0 || appliedTicks < 0) {
                throw new IllegalArgumentException("Catch-up plan values cannot be negative.");
            }
            if (appliedTicks > MAX_RESTART_CATCH_UP_TICKS) {
                throw new IllegalArgumentException("Catch-up plan exceeded the hard tick cap.");
            }
        }

        public boolean required() { return appliedTicks > 0; }
    }
}
