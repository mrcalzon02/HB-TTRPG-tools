package io.github.mrcalzon02.barotrauma.simulation;

import io.github.mrcalzon02.barotrauma.persistence.DefaultWorldGenerator;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Comparator;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/** End-to-end unattended-runtime contract for single scheduler ownership and listener cleanup. */
public final class PassiveWorldRuntimeOwnershipVerification {
    private PassiveWorldRuntimeOwnershipVerification() { }

    public static void main(String[] args) throws Exception {
        Path root = Files.createTempDirectory("barotrauma-passive-ownership-");
        try {
            var generated = DefaultWorldGenerator.create(root.resolve("world"), "Runtime Ownership Verification");
            PassiveWorldSimulationService first = PassiveWorldSimulationService.enable(
                    generated.paths(), Duration.ofSeconds(1), 1);
            PassiveWorldSimulationService second = PassiveWorldSimulationService.enable(
                    generated.paths(), Duration.ofSeconds(1), 1);
            require(first == second, "Repeated enable created more than one process-wide scheduler for a world.");
            require(PassiveWorldSimulationService.active(generated.paths()) == first,
                    "Active-world lookup did not retain the canonical scheduler owner.");

            AtomicInteger callbacks = new AtomicInteger();
            CountDownLatch committed = new CountDownLatch(1);
            AutoCloseable subscription = first.addListener(status -> {
                callbacks.incrementAndGet();
                if (status.lastResult() != null) committed.countDown();
            }, true);
            require(committed.await(10, TimeUnit.SECONDS),
                    "Ownership fixture did not observe its first automatic cycle.");
            subscription.close();
            int callbacksAfterClose = callbacks.get();
            long committedBeforeWait = first.health().cyclesCommitted();

            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
            while (first.health().cyclesCommitted() <= committedBeforeWait && System.nanoTime() < deadline) {
                Thread.sleep(50L);
            }
            require(first.health().cyclesCommitted() > committedBeforeWait,
                    "Runtime did not continue after observer-listener removal.");
            require(callbacks.get() == callbacksAfterClose,
                    "A removed observer listener continued receiving passive-runtime notifications.");

            PassiveWorldSimulationService.disable(generated.paths());
            require(PassiveWorldSimulationService.active(generated.paths()) == null,
                    "Disabling Passive Mode left a process-wide scheduler owner registered.");

            System.out.println("Passive world scheduler ownership and listener cleanup verification passed.");
        } finally {
            try { PassiveWorldSimulationService.disable(null); } catch (Exception ignored) { }
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
