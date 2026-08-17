package io.calzon.networkinvestigator;

import java.time.Instant;
import java.util.Map;

public record EventRecord(
        Instant timestamp,
        long monotonicNanos,
        String type,
        Map<String, String> fields
) {
    public static EventRecord of(String type, Map<String, String> fields, long monotonicOrigin) {
        return new EventRecord(
                Instant.now(),
                System.nanoTime() - monotonicOrigin,
                type,
                Map.copyOf(fields)
        );
    }
}
