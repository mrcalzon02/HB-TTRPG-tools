package io.github.mrcalzon02.barotrauma.desktop.registry;

import io.github.mrcalzon02.barotrauma.persistence.DefaultWorldGenerator;
import io.github.mrcalzon02.barotrauma.persistence.NaturalWorldAndFleetRegistry;
import io.github.mrcalzon02.barotrauma.persistence.PassiveWorldRegistry;
import io.github.mrcalzon02.barotrauma.persistence.WorldMapRegistry;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;
import io.github.mrcalzon02.barotrauma.simulation.PassiveWorldSimulationService;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Sustained unattended-observer contract.
 *
 * <p>The fixture keeps the real passive scheduler writing while observer registries repeatedly read the same
 * authoritative world. It verifies tick progress, scheduler ownership, health reporting, and read/write
 * coexistence without introducing a second simulation authority.</p>
 */
public final class WorldObserverUnattendedSoakVerification {
    private static final int TICKS_PER_CYCLE = 25;
    private static final long REQUIRED_CYCLES = 4;
    // Windows hosted runners execute the same SQLite-heavy 25-tick cycles materially slower than Linux.
    // Keep the workload identical and bounded; give slower platforms enough wall-clock time to finish it.
    private static final long DEADLINE_SECONDS = 60;
    private static final long NO_PROGRESS_DEADLINE_SECONDS = 30;
    private static final long CLEANUP_DEADLINE_SECONDS = 8;
    private static final long CLEANUP_RETRY_MILLIS = 75;

    private WorldObserverUnattendedSoakVerification() { }

    public static void main(String[] args) throws Exception {
        Path root = Files.createTempDirectory("barotrauma-observer-soak-");
        WorldPaths world = null;
        try {
            var generated = DefaultWorldGenerator.create(root.resolve("world"), "Observer Soak Verification");
            world = generated.paths();
            long baselineTick = generated.initializedTick();

            PassiveWorldSimulationService service = PassiveWorldSimulationService.enable(
                    world, Duration.ofSeconds(1), TICKS_PER_CYCLE);
            require(PassiveWorldSimulationService.enable(world, Duration.ofSeconds(1), TICKS_PER_CYCLE) == service,
                    "Unattended observer fixture created a duplicate scheduler owner.");

            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(DEADLINE_SECONDS);
            long lastProgressAt = System.nanoTime();
            long observedCycles = service.health().cyclesCommitted();
            int observerReads = 0;
            while (service.health().cyclesCommitted() < REQUIRED_CYCLES && System.nanoTime() < deadline) {
                exerciseObserverReads(world);
                observerReads += 1;
                long committed = service.health().cyclesCommitted();
                if (committed > observedCycles) {
                    observedCycles = committed;
                    lastProgressAt = System.nanoTime();
                }
                if (System.nanoTime() - lastProgressAt > TimeUnit.SECONDS.toNanos(NO_PROGRESS_DEADLINE_SECONDS)) {
                    throw new IllegalStateException("Passive runtime made no cycle progress for "
                            + NO_PROGRESS_DEADLINE_SECONDS + " seconds during unattended observer soak.");
                }
                Thread.sleep(200L);
            }

            var health = service.health();
            require(health.running(), "Passive runtime stopped during unattended observer soak.");
            require(health.fault() == null, "Passive runtime faulted during unattended observer soak: " + health.fault());
            require(health.cyclesCommitted() >= REQUIRED_CYCLES,
                    "Passive runtime did not commit the required unattended cycles within "
                            + DEADLINE_SECONDS + " seconds; committed=" + health.cyclesCommitted() + ".");
            require(health.lastCycleCompletedAt() != null,
                    "Passive runtime health did not report a completed cycle.");
            require(health.lastCycleDuration() != null && !health.lastCycleDuration().isNegative(),
                    "Passive runtime health did not report a valid cycle duration.");
            require(observerReads >= 4, "Observer read pressure was not exercised during the soak.");

            exerciseObserverReads(world);
            PassiveWorldRegistry.Snapshot passive = PassiveWorldRegistry.load(world);
            Long currentTick = passive.configuration().currentTickSequence();
            require(currentTick != null && currentTick >= baselineTick + REQUIRED_CYCLES * TICKS_PER_CYCLE,
                    "Authoritative world tick did not advance through unattended Passive Mode.");

            var natural = NaturalWorldAndFleetRegistry.load(world);
            var civil = WorldObserverCivilLayer.load(world);
            require(!WorldMapRegistry.load(world).locations().isEmpty(),
                    "Observer map registry became empty during unattended operation.");
            require(!passive.stations().isEmpty(),
                    "Observer passive registry lost station state during unattended operation.");
            WorldObserverTimeline.build(passive, natural, civil);

            PassiveWorldSimulationService.disable(world);
            require(PassiveWorldSimulationService.active(world) == null,
                    "Unattended observer soak left a scheduler registered after disable.");

            System.out.println("Living World Observer unattended soak verification passed: "
                    + health.cyclesCommitted() + " cycles, " + observerReads + " concurrent observer read passes.");
        } finally {
            if (world != null) {
                try { PassiveWorldSimulationService.disable(world); } catch (Exception ignored) { }
            }
            deleteTree(root);
        }
    }

    private static void exerciseObserverReads(WorldPaths world) throws Exception {
        WorldMapRegistry.RegistrySnapshot map = WorldMapRegistry.load(world);
        PassiveWorldRegistry.Snapshot passive = PassiveWorldRegistry.load(world);
        NaturalWorldAndFleetRegistry.Snapshot natural = NaturalWorldAndFleetRegistry.load(world);
        WorldObserverCivilLayer.CivilSnapshot civil = WorldObserverCivilLayer.load(world);
        require(map.summary() != null, "Observer map summary was unavailable during soak.");
        require(passive.configuration() != null, "Passive observer configuration was unavailable during soak.");
        WorldObserverTimeline.build(passive, natural, civil);
    }

    private static void deleteTree(Path root) throws Exception {
        if (!Files.exists(root)) return;
        List<Path> paths;
        try (var stream = Files.walk(root)) {
            paths = stream.sorted(Comparator.reverseOrder()).toList();
        }
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(CLEANUP_DEADLINE_SECONDS);
        for (Path path : paths) deleteWithRetry(path, deadline);
    }

    private static void deleteWithRetry(Path path, long deadline) throws Exception {
        IOException lastFailure = null;
        while (Files.exists(path)) {
            try {
                Files.deleteIfExists(path);
                return;
            } catch (IOException exception) {
                lastFailure = exception;
                if (System.nanoTime() >= deadline) throw exception;
                try {
                    Thread.sleep(CLEANUP_RETRY_MILLIS);
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    if (lastFailure != null) interrupted.addSuppressed(lastFailure);
                    throw interrupted;
                }
            }
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }
}
