package org.cubechat.android;

import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Bounded, memory-only, per-process observation history. This is deliberately NOT
 * trusted-cell registration. It resets when the process ends, stores no location,
 * and cannot authenticate radio transmitters or detect attacks by itself.
 */
public final class CellObservationBook {
    public static final int MAX_IDENTITIES = 256;
    private static final long MIN_DISTINCT_SAMPLE_MS = 15_000L;
    private static final long REPEATED_SPAN_MS = 10 * 60_000L;

    public static final class Evidence {
        public final int observations;
        public final long firstSeenElapsedMs, lastSeenElapsedMs;
        public final boolean repeatedThisSession;
        private Evidence(int count, long first, long last) {
            observations = count;
            firstSeenElapsedMs = first;
            lastSeenElapsedMs = last;
            repeatedThisSession = count >= 3 && last - first >= REPEATED_SPAN_MS;
        }
        public String label() {
            if (observations <= 1) return "First observation in this session (identity unverified)";
            if (repeatedThisSession) return "Repeated this session (identity still unverified)";
            return observations + " observations this session (identity unverified)";
        }
    }

    private static final class SeenCell {
        long firstSampleMs, lastSampleMs;
        int count;
        SeenCell(long sampleMs) { firstSampleMs = lastSampleMs = sampleMs; count = 1; }
        Evidence snapshot() { return new Evidence(count, firstSampleMs, lastSampleMs); }
    }

    // Access-order eviction bounds memory without sending data outside the phone.
    private final LinkedHashMap<String, SeenCell> entries = new LinkedHashMap<String, SeenCell>(32, .75f, true) {
        @Override protected boolean removeEldestEntry(Map.Entry<String, SeenCell> eldest) {
            return size() > MAX_IDENTITIES;
        }
    };

    public synchronized Map<String, Evidence> record(List<CellObservation> sample, long nowElapsedMs) {
        if (sample == null || nowElapsedMs < 0) return Collections.emptyMap();
        Map<String, Evidence> results = new HashMap<>();
        for (CellObservation cell : sample) {
            if (cell == null || !cell.isCurrent()) continue;
            String key = cell.identityKey();
            if (key == null) continue;
            long modemObservationMs = nowElapsedMs - cell.ageMs;
            if (modemObservationMs < 0) continue;
            SeenCell record = entries.get(key);
            if (record == null) {
                record = new SeenCell(modemObservationMs);
                entries.put(key, record);
            } else if (modemObservationMs > record.lastSampleMs
                    && modemObservationMs - record.lastSampleMs >= MIN_DISTINCT_SAMPLE_MS) {
                record.lastSampleMs = modemObservationMs;
                record.count = Math.min(record.count + 1, Integer.MAX_VALUE);
            }
            results.put(key, record.snapshot());
        }
        return Collections.unmodifiableMap(results);
    }

    public synchronized Evidence find(CellObservation cell) {
        if (cell == null || cell.identityKey() == null) return null;
        SeenCell entry = entries.get(cell.identityKey());
        return entry == null ? null : entry.snapshot();
    }

    public synchronized int size() { return entries.size(); }

    public synchronized void clear() { entries.clear(); }
}
