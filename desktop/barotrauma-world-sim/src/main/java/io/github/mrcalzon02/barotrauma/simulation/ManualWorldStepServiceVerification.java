package io.github.mrcalzon02.barotrauma.simulation;

import io.github.mrcalzon02.barotrauma.persistence.DefaultWorldGenerator;
import io.github.mrcalzon02.barotrauma.persistence.SimulationCheckpointStore;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Comparator;

/** End-to-end contract for explicit observer stepping without a second simulation writer. */
public final class ManualWorldStepServiceVerification {
    private ManualWorldStepServiceVerification() { }

    public static void main(String[] args) throws Exception {
        Path root = Files.createTempDirectory("barotrauma-manual-step-");
        try {
            var generated = DefaultWorldGenerator.create(root.resolve("world"), "Manual Step Verification");
            var before = SimulationCheckpointStore.load(generated.paths(), Duration.ofMinutes(1));
            require(!before.snapshot().simulationEnabled(), "Generated verification world must begin disabled.");
            require(before.snapshot().schedulerState() == DeterministicSimulationClock.SchedulerState.PAUSED,
                    "Generated verification world must begin paused.");

            var result = ManualWorldStepService.step(generated.paths(), 3);
            var after = SimulationCheckpointStore.load(generated.paths(), Duration.ofMinutes(1));
            require(result.tickSequence() == before.snapshot().tickSequence() + 3,
                    "Manual step transaction advanced the wrong tick count.");
            require(after.snapshot().tickSequence() == result.tickSequence(),
                    "Manual step result and durable clock diverged.");
            require(!after.snapshot().simulationEnabled(),
                    "Manual step failed to restore the world's prior disabled state.");
            require(after.snapshot().schedulerState() == DeterministicSimulationClock.SchedulerState.PAUSED,
                    "Manual step failed to restore the world's prior paused state.");
            require(PassiveWorldSimulationService.active(generated.paths()) == null,
                    "Manual step left an automatic scheduler running.");

            PassiveWorldSimulationService service = PassiveWorldSimulationService.enable(
                    generated.paths(), Duration.ofHours(1), 1);
            try {
                try {
                    ManualWorldStepService.step(generated.paths(), 1);
                    throw new IllegalStateException("Manual step was allowed while Passive Mode owned the world.");
                } catch (IllegalStateException expected) {
                    require(expected.getMessage().contains("Pause Passive Mode"),
                            "Manual step rejected the active writer for the wrong reason.");
                }
            } finally {
                PassiveWorldSimulationService.disable(generated.paths());
                service.close();
            }

            System.out.println("Living world observer authoritative manual-step verification passed.");
        } finally {
            deleteTree(root);
        }
    }

    private static void deleteTree(Path root) throws Exception {
        if (!Files.exists(root)) return;
        try (var stream = Files.walk(root)) {
            for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }
}
