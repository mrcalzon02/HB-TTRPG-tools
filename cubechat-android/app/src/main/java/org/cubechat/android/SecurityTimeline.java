package org.cubechat.android;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.TreeMap;

/**
 * Aggregate-only, bounded time-series for a local security dashboard.
 * No cell identifiers, addresses, peer identities, packet contents or location.
 * A bucket without a report is UNKNOWN, never interpolated as a zero signal.
 */
public final class SecurityTimeline {
    public static final long BUCKET_MS = 5 * 60_000L;
    public static final long HOUR_MS = 60 * 60_000L;
    public static final long MAX_AGE_MS = 7 * 24 * HOUR_MS;
    public static final int MAX_BUCKETS = 2016;
    public static final int UNKNOWN_SIGNAL = -1;
    private static final String VERSION = "v1";
    private final TreeMap<Long, Mutable> buckets = new TreeMap<>();
    private long watermarkMs;

    public static final class Bucket {
        public final long startMs, droppedPackets, droppedBytes;
        public final int cellReports, reportedCells, freshCells, servingCells, servingDbm;
        private Bucket(Mutable b) {
            startMs = b.startMs;
            droppedPackets = b.droppedPackets;
            droppedBytes = b.droppedBytes;
            cellReports = b.cellReports;
            reportedCells = b.reportedCells;
            freshCells = b.freshCells;
            servingCells = b.servingCells;
            servingDbm = b.servingDbm;
        }
    }
    private static final class Mutable {
        final long startMs;
        long droppedPackets, droppedBytes;
        int cellReports, reportedCells, freshCells, servingCells, servingDbm = UNKNOWN_SIGNAL;
        Mutable(long start) { startMs = start; }
    }

    private Mutable at(long nowMs) {
        if (nowMs < 0) throw new IllegalArgumentException("Invalid wall clock");
        // A large future-clock excursion can strand every corrected-time event.
        // Do not reinterpret normal delayed/out-of-order reports as a clock reset.
        if (watermarkMs > nowMs && watermarkMs - nowMs > MAX_AGE_MS)
            prune(nowMs, MAX_AGE_MS);
        watermarkMs = Math.max(watermarkMs, nowMs);
        long start = nowMs - nowMs % BUCKET_MS;
        Mutable b = buckets.get(start);
        if (b == null) { b = new Mutable(start); buckets.put(start, b); }
        prune(watermarkMs, MAX_AGE_MS);
        return b;
    }
    private static long sum(long a, long b) {
        return a > Long.MAX_VALUE - b ? Long.MAX_VALUE : a + b;
    }
    public synchronized void recordDrops(long wallMs, long count, long bytes) {
        if (count < 0 || bytes < 0) throw new IllegalArgumentException("Negative VPN counter");
        if (count == 0 && bytes == 0) return;
        Mutable b = at(wallMs);
        b.droppedPackets = sum(b.droppedPackets, count);
        b.droppedBytes = sum(b.droppedBytes, bytes);
    }
    public synchronized void recordCellReport(long wallMs, int reported, int fresh,
                                               int serving, int servingDbm) {
        if (reported < 0 || reported > 256 || fresh < 0 || fresh > reported
                || serving < 0 || serving > reported
                || (servingDbm != UNKNOWN_SIGNAL && (servingDbm < -160 || servingDbm > -20)))
            throw new IllegalArgumentException("Invalid aggregate cell report");
        Mutable b = at(wallMs);
        b.cellReports = b.cellReports == Integer.MAX_VALUE ? b.cellReports : b.cellReports + 1;
        b.reportedCells = reported; b.freshCells = fresh;
        b.servingCells = serving; b.servingDbm = servingDbm;
    }
    /** Returns true when rows expired, allowing encrypted storage to persist their removal. */
    public synchronized boolean prune(long nowMs, long maxAgeMs) {
        if (!validRetention(maxAgeMs) || nowMs < 0) throw new IllegalArgumentException("Invalid retention");
        int before = buckets.size();
        if (watermarkMs > nowMs && watermarkMs - nowMs > BUCKET_MS) {
            // This is a real clock correction, not a few seconds of jitter.
            // A jump exceeding the entire storage window makes all old timestamps
            // untrustworthy; discard them rather than carry future history forward.
            if (watermarkMs - nowMs > MAX_AGE_MS) buckets.clear();
            watermarkMs = nowMs;
        } else {
            watermarkMs = Math.max(watermarkMs, nowMs);
        }
        long cutoff = Math.max(0, watermarkMs - maxAgeMs);
        while (!buckets.isEmpty() && (buckets.firstKey() < cutoff || buckets.size() > MAX_BUCKETS))
            buckets.pollFirstEntry();
        // Compare future rows to the actual clock, not a stale high watermark.
        // Clamp addition so extreme valid timestamps cannot overflow.
        long latest = nowMs > Long.MAX_VALUE - BUCKET_MS
                ? Long.MAX_VALUE : nowMs + BUCKET_MS;
        while (!buckets.isEmpty() && buckets.lastKey() > latest)
            buckets.pollLastEntry();
        return buckets.size() != before;
    }
    public synchronized List<Bucket> snapshot(long nowMs, long retentionMs) {
        prune(nowMs, retentionMs);
        List<Bucket> result = new ArrayList<>();
        for (Mutable b : buckets.values()) result.add(new Bucket(b));
        return Collections.unmodifiableList(result);
    }
    public synchronized void clear() { buckets.clear(); watermarkMs = 0; }
    public static boolean validRetention(long ms) {
        return ms == 6 * HOUR_MS || ms == 24 * HOUR_MS
                || ms == 72 * HOUR_MS || ms == MAX_AGE_MS;
    }
    public synchronized String encode(long nowMs) {
        prune(nowMs, MAX_AGE_MS);
        StringBuilder out = new StringBuilder(VERSION).append('\n');
        for (Mutable b : buckets.values()) {
            out.append(b.startMs).append(',').append(b.droppedPackets).append(',')
                    .append(b.droppedBytes).append(',').append(b.cellReports).append(',')
                    .append(b.reportedCells).append(',').append(b.freshCells).append(',')
                    .append(b.servingCells).append(',').append(b.servingDbm).append('\n');
        }
        return out.toString();
    }
    public static SecurityTimeline decode(String encoded, long nowMs) {
        if (encoded == null || encoded.length() > 512_000 || !encoded.startsWith(VERSION + "\n"))
            throw new IllegalArgumentException("Invalid telemetry encoding");
        SecurityTimeline result = new SecurityTimeline();
        String[] lines = encoded.split("\n", -1);
        if (lines.length > MAX_BUCKETS + 2) throw new IllegalArgumentException("Too many buckets");
        long previous = -1;
        for (int i = 1; i < lines.length; i++) {
            if (lines[i].isEmpty()) {
                if (i != lines.length - 1) throw new IllegalArgumentException("Blank bucket");
                continue;
            }
            // A corrupt, over-capacity snapshot must fail closed, not be
            // accepted and silently truncated by prune() during restoration.
            if (i > MAX_BUCKETS) throw new IllegalArgumentException("Too many buckets");
            String[] fields = lines[i].split(",", -1);
            if (fields.length != 8) throw new IllegalArgumentException("Bad bucket width");
            try {
                long start = Long.parseLong(fields[0]);
                long packets = Long.parseLong(fields[1]);
                long bytes = Long.parseLong(fields[2]);
                int reports = Integer.parseInt(fields[3]);
                int cells = Integer.parseInt(fields[4]);
                int fresh = Integer.parseInt(fields[5]);
                int serving = Integer.parseInt(fields[6]);
                int dbm = Integer.parseInt(fields[7]);
                if (start < 0 || start % BUCKET_MS != 0 || start <= previous
                        || packets < 0 || bytes < 0 || reports < 0
                        || cells < 0 || cells > 256 || fresh < 0 || fresh > cells
                        || serving < 0 || serving > cells
                        // A bucket with zero cell reports can only have the
                        // default aggregate fields from Mutable's constructor.
                        || (reports == 0 && (cells != 0 || fresh != 0
                                || serving != 0 || dbm != UNKNOWN_SIGNAL))
                        || (dbm != UNKNOWN_SIGNAL && (dbm < -160 || dbm > -20)))
                    throw new IllegalArgumentException("Bad bucket values");
                previous = start;
                Mutable b = new Mutable(start);
                b.droppedPackets = packets; b.droppedBytes = bytes;
                b.cellReports = reports; b.reportedCells = cells;
                b.freshCells = fresh; b.servingCells = serving; b.servingDbm = dbm;
                result.buckets.put(start, b);
            } catch (NumberFormatException bad) {
                throw new IllegalArgumentException("Unparseable bucket", bad);
            }
        }
        result.prune(nowMs, MAX_AGE_MS);
        return result;
    }
}
