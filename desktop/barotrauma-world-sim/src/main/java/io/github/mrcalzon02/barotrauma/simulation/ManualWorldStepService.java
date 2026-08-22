package io.github.mrcalzon02.barotrauma.simulation;

import io.github.mrcalzon02.barotrauma.persistence.PassiveWorldTickTransaction;
import io.github.mrcalzon02.barotrauma.persistence.PassiveWorldTickTransaction.TickResult;
import io.github.mrcalzon02.barotrauma.persistence.SimulationCheckpointStore;
import io.github.mrcalzon02.barotrauma.persistence.SimulationCheckpointStore.RecoveryState;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;
import io.github.mrcalzon02.barotrauma.simulation.DeterministicSimulationClock.SchedulerState;
import io.github.mrcalzon02.barotrauma.simulation.SimulationCommandExecutor.CommandReceipt;

import java.time.Duration;
import java.util.Objects;

/**
 * Explicit one-shot advancement for the desktop observer when Passive Mode is not running.
 *
 * <p>This service never creates a second writer beside an active passive scheduler. It restores the
 * authoritative checkpoint, serializes any temporary clock-state transition and the requested step
 * through one writer, commits the same passive-world transaction used by automatic cycles, and then
 * restores the clock's prior enabled/scheduler state.</p>
 */
public final class ManualWorldStepService {
    private static final Duration DEFAULT_TICK_SIZE = Duration.ofMinutes(1);
    private static final int MAX_MANUAL_TICKS = 1_000;

    private ManualWorldStepService() { }

    public static synchronized TickResult step(WorldPaths world, long ticks) throws Exception {
        Objects.requireNonNull(world, "world");
        if (ticks < 1 || ticks > MAX_MANUAL_TICKS) {
            throw new IllegalArgumentException("Manual observer step must advance between 1 and "
                    + MAX_MANUAL_TICKS + " ticks.");
        }
        if (PassiveWorldSimulationService.active(world) != null) {
            throw new IllegalStateException("Pause Passive Mode before using Manual Step; an automatic writer owns this world.");
        }

        RecoveryState recovery = SimulationCheckpointStore.load(world, DEFAULT_TICK_SIZE);
        if (recovery.snapshot().schedulerState() == SchedulerState.FAULTED) {
            throw new IllegalStateException("A faulted world must be restored from a reviewed checkpoint before manual stepping.");
        }
        boolean originallyEnabled = recovery.snapshot().simulationEnabled();
        SchedulerState originalSchedulerState = recovery.snapshot().schedulerState();

        DeterministicSimulationClock clock = DeterministicSimulationClock.restore(recovery.snapshot());
        try (SimulationCommandExecutor writer = new SimulationCommandExecutor(clock,
                "barotrauma-manual-step-" + recovery.worldId(), recovery.lastExecutionSequence())) {
            if (!originallyEnabled) {
                CommandReceipt enable = writer.submit(new SimulationCommandExecutor.Enable(),
                        "world-observer-manual-step").join();
                SimulationCheckpointStore.persist(world, enable, "Manual observer step: temporary clock enable");
            }
            if (clock.snapshot().schedulerState() != SchedulerState.PAUSED) {
                CommandReceipt pause = writer.submit(new SimulationCommandExecutor.Pause(),
                        "world-observer-manual-step").join();
                SimulationCheckpointStore.persist(world, pause, "Manual observer step: temporary scheduler pause");
            }

            CommandReceipt step = writer.submit(new SimulationCommandExecutor.Step(ticks),
                    "world-observer-manual-step").join();
            TickResult result = PassiveWorldTickTransaction.commit(world, step);

            if (!originallyEnabled) {
                CommandReceipt disable = writer.submit(new SimulationCommandExecutor.Disable(),
                        "world-observer-manual-step").join();
                SimulationCheckpointStore.persist(world, disable, "Manual observer step: restore disabled clock");
            } else if (originalSchedulerState == SchedulerState.RUNNING) {
                CommandReceipt start = writer.submit(new SimulationCommandExecutor.Start(),
                        "world-observer-manual-step").join();
                SimulationCheckpointStore.persist(world, start, "Manual observer step: restore running scheduler state");
            }
            return result;
        }
    }
}
