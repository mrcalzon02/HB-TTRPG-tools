package io.github.mrcalzon02.barotrauma.simulation;

import io.github.mrcalzon02.barotrauma.persistence.DefaultWorldGenerator;
import io.github.mrcalzon02.barotrauma.persistence.SimulationCheckpointStore;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;

/** End-to-end contract for bounded passive restart catch-up and runtime health accounting. */
public final class PassiveWorldRestartCatchUpVerification {
    private PassiveWorldRestartCatchUpVerification() { }

    public static void main(String[] args) throws Exception {
        Class.forName("org.sqlite.JDBC");
        Path root = Files.createTempDirectory("barotrauma-passive-restart-");
        try {
            var generated = DefaultWorldGenerator.create(root.resolve("world"), "Restart Catch-up Verification");
            long initialTick = SimulationCheckpointStore.load(generated.paths(), Duration.ofMinutes(1))
                    .snapshot().tickSequence();
            Instant now = Instant.now();
            Instant lastCycle = now.minusSeconds(35);
            try (var connection = DriverManager.getConnection("jdbc:sqlite:" + generated.paths().database());
                 var statement = connection.prepareStatement(
                         "UPDATE passive_simulation_config SET enabled=1,cadence_seconds=10,ticks_per_cycle=2,"
                                 + "last_cycle_at=?,last_cycle_tick=?")) {
                statement.setString(1, lastCycle.toString());
                statement.setLong(2, initialTick);
                require(statement.executeUpdate() == 1,
                        "Restart fixture did not update the passive configuration.");
            }

            PassiveWorldCatchUpPolicy.Plan expected = PassiveWorldCatchUpPolicy.plan(
                    lastCycle, now, Duration.ofSeconds(10), 2);
            require(expected.appliedTicks() == 6,
                    "Restart fixture expected three missed cycles / six ticks.");

            PassiveWorldSimulationService service = PassiveWorldSimulationService.resumeIfEnabled(generated.paths());
            require(service != null, "Enabled passive configuration did not resume.");
            try {
                var after = SimulationCheckpointStore.load(generated.paths(), Duration.ofMinutes(1));
                var health = service.health();
                require(after.snapshot().tickSequence() == initialTick + expected.appliedTicks(),
                        "Restart catch-up advanced a different number of ticks than the bounded policy.");
                require(health.restartCatchUpTicks() == expected.appliedTicks(),
                        "Runtime health lost the applied restart catch-up count.");
                require(health.restartCatchUpPlan() != null && health.restartCatchUpPlan().required(),
                        "Runtime health lost the restart catch-up plan.");
                require(health.cyclesCommitted() == 1,
                        "Restart catch-up should be one committed transaction before the recurring cadence fires.");
                require(health.lastCycleCompletedAt() != null && health.lastCycleDuration() != null,
                        "Runtime health did not record catch-up completion timing.");
                require(health.fault() == null, "Restart catch-up faulted the passive runtime.");
            } finally {
                PassiveWorldSimulationService.disable(generated.paths());
            }

            System.out.println("Passive world bounded restart catch-up and health verification passed.");
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
