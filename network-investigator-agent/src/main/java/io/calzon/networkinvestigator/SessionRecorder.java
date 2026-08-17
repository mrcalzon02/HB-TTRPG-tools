package io.calzon.networkinvestigator;

import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

public final class SessionRecorder implements AutoCloseable {
    private static final DateTimeFormatter SESSION_NAME = DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss")
            .withZone(ZoneId.systemDefault());

    private final Path recordingsRoot;
    private final RollingPreRollBuffer preRoll;
    private final long monotonicOrigin = System.nanoTime();
    private final AtomicLong observedEvents = new AtomicLong();
    private volatile InvestigatorState state = InvestigatorState.PASSIVE;
    private volatile Instant recordingStarted;
    private volatile Instant manualTrigger;
    private volatile Path sessionDirectory;
    private volatile BufferedWriter activeWriter;

    public SessionRecorder(Path dataRoot) throws IOException {
        this.recordingsRoot = dataRoot.resolve("recordings");
        Files.createDirectories(recordingsRoot);
        this.preRoll = new RollingPreRollBuffer(dataRoot.resolve("passive-buffer"));
        observe("AGENT_STARTED", Map.of("state", state.name()));
    }

    public synchronized void observe(String type, Map<String, String> fields) throws IOException {
        EventRecord event = EventRecord.of(type, fields, monotonicOrigin);
        observedEvents.incrementAndGet();
        preRoll.append(event);
        if (state == InvestigatorState.RECORDING && activeWriter != null) {
            activeWriter.write(JsonUtil.event(event));
            activeWriter.newLine();
            activeWriter.flush();
        }
    }

    public synchronized Status startRecording() throws IOException {
        if (state == InvestigatorState.RECORDING) return status();
        if (state == InvestigatorState.FINALIZING) throw new IllegalStateException("Recording is finalizing.");

        Instant trigger = Instant.now();
        List<Path> snapshot = preRoll.snapshotAndContinue(trigger);
        Path session = uniqueSessionDirectory(trigger);
        Path raw = session.resolve("raw");
        Files.createDirectories(raw.resolve("preroll"));
        preRoll.copySnapshotTo(snapshot, raw.resolve("preroll"));

        activeWriter = Files.newBufferedWriter(raw.resolve("active-events.jsonl"), StandardCharsets.UTF_8);
        sessionDirectory = session;
        recordingStarted = trigger;
        manualTrigger = trigger;
        state = InvestigatorState.RECORDING;

        writeSessionMetadata("RECORDING", null);
        observe("USER_PRESSED_RECORD", Map.of(
                "preRollSeconds", Long.toString(preRoll.availableHistory(trigger).toSeconds()),
                "session", session.getFileName().toString()
        ));
        return status();
    }

    public synchronized Status markEvent(String note) throws IOException {
        if (state != InvestigatorState.RECORDING) throw new IllegalStateException("MARK EVENT requires an active recording.");
        observe("USER_EVENT_MARKER", note == null || note.isBlank()
                ? Map.of()
                : Map.of("note", note.trim()));
        return status();
    }

    public synchronized Status stopRecording() throws IOException {
        if (state != InvestigatorState.RECORDING) return status();
        state = InvestigatorState.FINALIZING;
        EventRecord stopped = EventRecord.of("USER_STOPPED_RECORDING", Map.of(), monotonicOrigin);
        preRoll.append(stopped);
        observedEvents.incrementAndGet();
        if (activeWriter != null) {
            activeWriter.write(JsonUtil.event(stopped));
            activeWriter.newLine();
            activeWriter.flush();
            activeWriter.close();
            activeWriter = null;
        }
        writeSessionMetadata("COMPLETE", Instant.now());
        state = InvestigatorState.PASSIVE;
        recordingStarted = null;
        manualTrigger = null;
        sessionDirectory = null;
        return status();
    }

    public Status status() {
        Instant now = Instant.now();
        Duration history = preRoll.availableHistory(now);
        Duration active = recordingStarted == null ? Duration.ZERO : Duration.between(recordingStarted, now);
        return new Status(state, history, active, observedEvents.get(), sessionDirectory, manualTrigger);
    }

    private Path uniqueSessionDirectory(Instant instant) throws IOException {
        String base = SESSION_NAME.format(instant);
        Path candidate = recordingsRoot.resolve(base);
        int suffix = 1;
        while (Files.exists(candidate)) candidate = recordingsRoot.resolve(base + "-" + suffix++);
        Files.createDirectories(candidate);
        return candidate;
    }

    private void writeSessionMetadata(String status, Instant stoppedAt) throws IOException {
        if (sessionDirectory == null) return;
        String json = "{\n" +
                "  \"formatVersion\": 1,\n" +
                "  \"status\": " + JsonUtil.quote(status) + ",\n" +
                "  \"manualTrigger\": " + JsonUtil.quote(manualTrigger == null ? null : manualTrigger.toString()) + ",\n" +
                "  \"stoppedAt\": " + JsonUtil.quote(stoppedAt == null ? null : stoppedAt.toString()) + ",\n" +
                "  \"preRollTargetSeconds\": 600,\n" +
                "  \"payloadCapture\": false\n" +
                "}\n";
        Files.writeString(sessionDirectory.resolve("session.json"), json, StandardCharsets.UTF_8);
    }

    @Override
    public synchronized void close() throws IOException {
        if (state == InvestigatorState.RECORDING) stopRecording();
        preRoll.close();
    }

    public record Status(
            InvestigatorState state,
            Duration preRollAvailable,
            Duration activeDuration,
            long observedEvents,
            Path sessionDirectory,
            Instant manualTrigger
    ) {}
}
