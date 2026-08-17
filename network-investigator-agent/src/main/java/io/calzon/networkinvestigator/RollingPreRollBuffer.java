package io.calzon.networkinvestigator;

import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;

/**
 * Disk-backed segmented circular buffer. Segments are sealed frequently so a
 * RECORD transition can preserve them without pausing the live event stream.
 */
public final class RollingPreRollBuffer implements AutoCloseable {
    public static final Duration DEFAULT_RETENTION = Duration.ofMinutes(10);
    public static final Duration DEFAULT_SEGMENT_DURATION = Duration.ofSeconds(10);

    private final Path root;
    private final Duration retention;
    private final Duration segmentDuration;
    private final Deque<Segment> sealed = new ArrayDeque<>();
    private BufferedWriter writer;
    private Segment current;
    private long sequence;

    public RollingPreRollBuffer(Path root) throws IOException {
        this(root, DEFAULT_RETENTION, DEFAULT_SEGMENT_DURATION);
    }

    RollingPreRollBuffer(Path root, Duration retention, Duration segmentDuration) throws IOException {
        this.root = root;
        this.retention = retention;
        this.segmentDuration = segmentDuration;
        Files.createDirectories(root);
        openSegment(Instant.now());
    }

    public synchronized void append(EventRecord event) throws IOException {
        if (Duration.between(current.openedAt(), event.timestamp()).compareTo(segmentDuration) >= 0) {
            rotate(event.timestamp());
        }
        writer.write(JsonUtil.event(event));
        writer.newLine();
        writer.flush();
    }

    /**
     * Seal the current segment and return a stable pre-roll snapshot. A fresh
     * segment is opened before return so the sensor has no observation gap.
     */
    public synchronized List<Path> snapshotAndContinue(Instant now) throws IOException {
        rotate(now);
        return sealed.stream().map(Segment::path).toList();
    }

    public synchronized Duration availableHistory(Instant now) {
        Instant oldest = sealed.isEmpty() ? current.openedAt() : sealed.peekFirst().openedAt();
        Duration duration = Duration.between(oldest, now);
        if (duration.isNegative()) return Duration.ZERO;
        return duration.compareTo(retention) > 0 ? retention : duration;
    }

    public synchronized void copySnapshotTo(List<Path> snapshot, Path destination) throws IOException {
        Files.createDirectories(destination);
        int index = 0;
        for (Path source : snapshot) {
            Path target = destination.resolve(String.format("preroll-%04d.jsonl", ++index));
            Files.copy(source, target, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    private void rotate(Instant now) throws IOException {
        if (writer != null) writer.close();
        sealed.addLast(current);
        prune(now);
        openSegment(now);
    }

    private void prune(Instant now) throws IOException {
        Instant cutoff = now.minus(retention);
        while (!sealed.isEmpty() && sealed.peekFirst().openedAt().isBefore(cutoff.minus(segmentDuration))) {
            Segment old = sealed.removeFirst();
            Files.deleteIfExists(old.path());
        }
    }

    private void openSegment(Instant openedAt) throws IOException {
        Path file = root.resolve(String.format("segment-%08d.jsonl", ++sequence));
        writer = Files.newBufferedWriter(file, StandardCharsets.UTF_8);
        current = new Segment(file, openedAt);
    }

    @Override
    public synchronized void close() throws IOException {
        if (writer != null) writer.close();
    }

    private record Segment(Path path, Instant openedAt) {}
}
