package io.github.mrcalzon02.barotrauma.simulation;

import io.github.mrcalzon02.barotrauma.simulation.DeterministicSimulationClock.CatchUpResult;
import io.github.mrcalzon02.barotrauma.simulation.DeterministicSimulationClock.ClockSnapshot;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Consumer;

/**
 * Single logical writer for deterministic simulation-clock commands.
 *
 * <p>Callers may submit concurrently, but all mutation and execution-sequence assignment occurs on
 * one owned thread. Swing views consume immutable receipts or snapshots and never mutate the clock
 * directly.</p>
 */
public final class SimulationCommandExecutor implements AutoCloseable {
    private final DeterministicSimulationClock clock;
    private final ExecutorService executor;
    private final AtomicLong acceptedSequence = new AtomicLong();
    private final AtomicBoolean closed = new AtomicBoolean();
    private final CopyOnWriteArrayList<Consumer<ClockSnapshot>> listeners = new CopyOnWriteArrayList<>();
    private volatile long writerThreadId = -1L;

    public SimulationCommandExecutor(DeterministicSimulationClock clock, String threadName) {
        this.clock = Objects.requireNonNull(clock, "clock");
        String effectiveName = threadName == null || threadName.isBlank()
                ? "barotrauma-simulation-writer" : threadName.trim();
        ThreadFactory factory = runnable -> {
            Thread thread = new Thread(runnable, effectiveName);
            thread.setDaemon(true);
            thread.setUncaughtExceptionHandler((ignored, throwable) -> throwable.printStackTrace(System.err));
            return thread;
        };
        this.executor = Executors.newSingleThreadExecutor(factory);
    }

    public CompletableFuture<CommandReceipt> submit(SimulationCommand command, String actor) {
        Objects.requireNonNull(command, "command");
        if (closed.get()) return CompletableFuture.failedFuture(
                new IllegalStateException("Simulation command executor is closed."));
        UUID commandId = UUID.randomUUID();
        Instant submittedAt = Instant.now();
        String effectiveActor = actor == null || actor.isBlank() ? "desktop-user" : actor.trim();
        return CompletableFuture.supplyAsync(
                () -> execute(commandId, submittedAt, effectiveActor, command), executor);
    }

    public CompletableFuture<ClockSnapshot> snapshot() {
        if (closed.get()) return CompletableFuture.failedFuture(
                new IllegalStateException("Simulation command executor is closed."));
        return CompletableFuture.supplyAsync(() -> {
            requireWriterThread();
            return clock.snapshot();
        }, executor);
    }

    public AutoCloseable addSnapshotListener(Consumer<ClockSnapshot> listener, boolean notifyImmediately) {
        Objects.requireNonNull(listener, "listener");
        if (closed.get()) throw new IllegalStateException("Simulation command executor is closed.");
        listeners.add(listener);
        if (notifyImmediately) snapshot().thenAccept(snapshot -> notifyListener(listener, snapshot));
        return () -> listeners.remove(listener);
    }

    private CommandReceipt execute(UUID commandId, Instant submittedAt,
                                   String actor, SimulationCommand command) {
        requireWriterThread();
        long sequence = acceptedSequence.incrementAndGet();
        ClockSnapshot before = clock.snapshot();
        CatchUpResult catchUp = null;
        ClockSnapshot after;
        if (command instanceof Enable) after = clock.enable();
        else if (command instanceof Disable) after = clock.disable();
        else if (command instanceof Start) after = clock.start();
        else if (command instanceof Pause) after = clock.pause();
        else if (command instanceof Step step) after = clock.step(step.ticks());
        else if (command instanceof AdvanceRunning advance) after = clock.advanceRunning(advance.ticks());
        else if (command instanceof CatchUp catchUpCommand) {
            catchUp = clock.catchUpTo(catchUpCommand.targetCanonicalTime(), catchUpCommand.maxTicks());
            after = catchUp.snapshot();
        } else if (command instanceof Checkpoint) after = before;
        else if (command instanceof Fault) after = clock.fault();
        else throw new IllegalArgumentException("Unsupported simulation command: " + command.getClass().getName());

        for (Consumer<ClockSnapshot> listener : listeners) notifyListener(listener, after);
        return new CommandReceipt(sequence, commandId, actor, command.label(), submittedAt,
                Instant.now(), writerThreadId, before, after,
                catchUp == null ? null : catchUp.appliedTicks(),
                catchUp == null ? null : catchUp.remainingTicks(),
                catchUp == null ? null : catchUp.complete());
    }

    private static void notifyListener(Consumer<ClockSnapshot> listener, ClockSnapshot snapshot) {
        try {
            listener.accept(snapshot);
        } catch (RuntimeException exception) {
            System.err.println("Simulation snapshot listener failed: " + exception.getMessage());
        }
    }

    private void requireWriterThread() {
        long current = Thread.currentThread().getId();
        if (writerThreadId < 0) writerThreadId = current;
        if (writerThreadId != current) {
            throw new IllegalStateException("Simulation mutation escaped the single writer thread.");
        }
    }

    @Override
    public void close() {
        if (!closed.compareAndSet(false, true)) return;
        listeners.clear();
        executor.shutdown();
        try {
            if (!executor.awaitTermination(5, TimeUnit.SECONDS)) executor.shutdownNow();
        } catch (InterruptedException exception) {
            executor.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }

    public sealed interface SimulationCommand
            permits Enable, Disable, Start, Pause, Step, AdvanceRunning, CatchUp, Checkpoint, Fault {
        String label();
    }

    public record Enable() implements SimulationCommand {
        @Override public String label() { return "ENABLE"; }
    }
    public record Disable() implements SimulationCommand {
        @Override public String label() { return "DISABLE"; }
    }
    public record Start() implements SimulationCommand {
        @Override public String label() { return "START"; }
    }
    public record Pause() implements SimulationCommand {
        @Override public String label() { return "PAUSE"; }
    }
    public record Step(long ticks) implements SimulationCommand {
        @Override public String label() { return "STEP"; }
    }
    public record AdvanceRunning(long ticks) implements SimulationCommand {
        @Override public String label() { return "ADVANCE_RUNNING"; }
    }
    public record CatchUp(Instant targetCanonicalTime, long maxTicks) implements SimulationCommand {
        public CatchUp { Objects.requireNonNull(targetCanonicalTime, "targetCanonicalTime"); }
        @Override public String label() { return "CATCH_UP"; }
    }
    public record Checkpoint() implements SimulationCommand {
        @Override public String label() { return "CHECKPOINT"; }
    }
    public record Fault() implements SimulationCommand {
        @Override public String label() { return "FAULT"; }
    }

    public record CommandReceipt(
            long acceptedSequence,
            UUID commandId,
            String actor,
            String command,
            Instant submittedAt,
            Instant completedAt,
            long writerThreadId,
            ClockSnapshot before,
            ClockSnapshot after,
            Long catchUpAppliedTicks,
            Long catchUpRemainingTicks,
            Boolean catchUpComplete
    ) {
        public CommandReceipt {
            if (acceptedSequence <= 0) throw new IllegalArgumentException("Accepted sequence must be positive.");
            Objects.requireNonNull(commandId, "commandId");
            Objects.requireNonNull(actor, "actor");
            Objects.requireNonNull(command, "command");
            Objects.requireNonNull(submittedAt, "submittedAt");
            Objects.requireNonNull(completedAt, "completedAt");
            Objects.requireNonNull(before, "before");
            Objects.requireNonNull(after, "after");
            if (completedAt.isBefore(submittedAt)) {
                throw new IllegalArgumentException("Command completion cannot precede submission.");
            }
        }
    }

    public static void verifyContract() throws Exception {
        Instant canonical = Instant.parse("2175-01-01T00:00:00Z");
        DeterministicSimulationClock clock = DeterministicSimulationClock.imported(
                canonical, Instant.parse("2026-06-20T08:00:00Z"), 40,
                java.time.Duration.ofMinutes(1));
        AtomicLong listenerTicks = new AtomicLong(-1);
        List<CommandReceipt> receipts;
        SimulationCommandExecutor writer = new SimulationCommandExecutor(clock, "contract-simulation-writer");
        try (AutoCloseable observed = writer.addSnapshotListener(
                     snapshot -> listenerTicks.set(snapshot.tickSequence()), false);
             AutoCloseable faulty = writer.addSnapshotListener(
                     snapshot -> { throw new IllegalStateException("display listener fixture"); }, false)) {
            CompletableFuture<CommandReceipt> enable = writer.submit(new Enable(), "contract-test");
            CompletableFuture<CommandReceipt> firstStep = writer.submit(new Step(2), "contract-test");
            CompletableFuture<CommandReceipt> secondStep = writer.submit(new Step(3), "contract-test");
            receipts = List.of(enable.join(), firstStep.join(), secondStep.join());
            require(receipts.get(0).acceptedSequence() == 1
                            && receipts.get(1).acceptedSequence() == 2
                            && receipts.get(2).acceptedSequence() == 3,
                    "Commands were not sequenced by writer execution order.");
            long threadId = receipts.get(0).writerThreadId();
            require(threadId > 0 && receipts.stream().allMatch(receipt -> receipt.writerThreadId() == threadId),
                    "Commands did not remain on one writer thread.");
            require(receipts.get(2).after().tickSequence() == 45
                            && receipts.get(2).after().canonicalTime().equals(canonical.plusSeconds(300)),
                    "Serialized step commands produced the wrong deterministic state.");
            require(listenerTicks.get() == 45, "Snapshot listener did not receive the latest immutable state.");

            CommandReceipt checkpoint = writer.submit(new Checkpoint(), "contract-test").join();
            require(checkpoint.before().equals(checkpoint.after()), "Checkpoint command mutated clock state.");

            CommandReceipt catchUp = writer.submit(new CatchUp(canonical.plusSeconds(900), 4), "contract-test").join();
            require(catchUp.catchUpAppliedTicks() == 4L && catchUp.catchUpRemainingTicks() == 6L
                            && Boolean.FALSE.equals(catchUp.catchUpComplete()),
                    "Executor catch-up receipt failed.");
            require(writer.snapshot().join().equals(catchUp.after()),
                    "Serialized snapshot did not match the latest command receipt.");
        } finally {
            writer.close();
        }

        try {
            writer.submit(new Checkpoint(), "contract-test").join();
            throw new IllegalStateException("Closed command executor accepted work.");
        } catch (java.util.concurrent.CompletionException expected) {
            require(expected.getCause() instanceof IllegalStateException
                            && expected.getCause().getMessage().contains("closed"),
                    "Unexpected closed-executor rejection.");
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Barotrauma single-writer simulation command contracts passed.");
    }
}
