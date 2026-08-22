package io.github.mrcalzon02.barotrauma.desktop.registry;

import io.github.mrcalzon02.barotrauma.observation.ObservationRegistry.MetricRow;
import io.github.mrcalzon02.barotrauma.observation.ObservationRegistry.Snapshot;
import io.github.mrcalzon02.barotrauma.observation.ObservationRegistry.SnapshotRow;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Read-only historical evidence model over committed observation snapshots and metric series. */
public final class WorldObserverHistory {
    private WorldObserverHistory() { }

    public static List<SnapshotRow> snapshots(Snapshot observation) {
        Objects.requireNonNull(observation, "observation");
        return observation.snapshots().stream()
                .sorted(Comparator.comparingLong(SnapshotRow::tickSequence).reversed()
                        .thenComparing(SnapshotRow::createdAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    public static String renderSnapshot(String snapshotId, Snapshot observation) {
        Objects.requireNonNull(snapshotId, "snapshotId");
        Objects.requireNonNull(observation, "observation");
        SnapshotRow snapshot = observation.snapshots().stream()
                .filter(row -> snapshotId.equals(row.snapshotId())).findFirst().orElse(null);
        if (snapshot == null) return missing(snapshotId);
        List<MetricRow> metrics = metricsFor(snapshotId, observation);
        StringBuilder out = new StringBuilder("HISTORICAL OBSERVATION EVIDENCE\n\n")
                .append("Snapshot: ").append(snapshot.snapshotId()).append("\n")
                .append("Tick: ").append(snapshot.tickSequence()).append("\n")
                .append("Created: ").append(value(snapshot.createdAt())).append("\n")
                .append("Status: ").append(value(snapshot.status())).append("\n")
                .append("Source: ").append(value(snapshot.source())).append("\n")
                .append("Rules version: ").append(value(snapshot.rulesVersion())).append("\n")
                .append("Parent snapshot: ").append(value(snapshot.parentSnapshotId())).append("\n")
                .append("Metric rows: ").append(metrics.size()).append("\n\n")
                .append("RECORDED METRICS\n");
        if (metrics.isEmpty()) out.append("No metric-series rows were persisted for this snapshot.\n");
        for (MetricRow row : metrics) {
            out.append("• ").append(value(row.entityType())).append(" / ").append(value(row.entityId()))
                    .append(" · ").append(value(row.metricKey())).append(" = ")
                    .append(format(row.numericValue())).append(' ').append(value(row.unit())).append("\n");
        }
        out.append("\nThis is committed historical evidence, not a reconstructed historical map state. ")
                .append("Only values actually persisted in the observation snapshot/metric series are shown.\n");
        return out.toString();
    }

    public static String compare(String newerSnapshotId, String olderSnapshotId, Snapshot observation) {
        Objects.requireNonNull(newerSnapshotId, "newerSnapshotId");
        Objects.requireNonNull(olderSnapshotId, "olderSnapshotId");
        Objects.requireNonNull(observation, "observation");
        SnapshotRow newer = find(newerSnapshotId, observation);
        SnapshotRow older = find(olderSnapshotId, observation);
        if (newer == null) return missing(newerSnapshotId);
        if (older == null) return missing(olderSnapshotId);

        Map<MetricKey, MetricRow> oldMetrics = indexedMetrics(olderSnapshotId, observation);
        Map<MetricKey, MetricRow> newMetrics = indexedMetrics(newerSnapshotId, observation);
        Map<MetricKey, MetricPair> pairs = new LinkedHashMap<>();
        oldMetrics.forEach((key, row) -> pairs.put(key, new MetricPair(row, null)));
        newMetrics.forEach((key, row) -> pairs.compute(key,
                (ignored, pair) -> new MetricPair(pair == null ? null : pair.older(), row)));

        StringBuilder out = new StringBuilder("HISTORICAL SNAPSHOT COMPARISON\n\n")
                .append("Older: ").append(older.snapshotId()).append(" · tick ").append(older.tickSequence()).append("\n")
                .append("Newer: ").append(newer.snapshotId()).append(" · tick ").append(newer.tickSequence()).append("\n")
                .append("Tick delta: ").append(newer.tickSequence() - older.tickSequence()).append("\n\n")
                .append("METRIC CHANGES\n");
        if (pairs.isEmpty()) out.append("No comparable metric-series evidence was persisted.\n");
        pairs.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .forEach(entry -> {
                    MetricKey key = entry.getKey();
                    MetricPair pair = entry.getValue();
                    String unit = pair.newer() != null ? pair.newer().unit()
                            : pair.older() == null ? "" : pair.older().unit();
                    out.append("• ").append(key.entityType()).append(" / ").append(key.entityId())
                            .append(" · ").append(key.metricKey()).append(": ");
                    if (pair.older() == null) {
                        out.append("— → ").append(format(pair.newer().numericValue()));
                    } else if (pair.newer() == null) {
                        out.append(format(pair.older().numericValue())).append(" → —");
                    } else {
                        double delta = pair.newer().numericValue() - pair.older().numericValue();
                        out.append(format(pair.older().numericValue())).append(" → ")
                                .append(format(pair.newer().numericValue())).append(" (Δ ")
                                .append(signed(delta)).append(')');
                    }
                    if (unit != null && !unit.isBlank()) out.append(' ').append(unit);
                    out.append("\n");
                });
        out.append("\nComparison is non-mutating and limited to metrics persisted in both observation records.\n");
        return out.toString();
    }

    public static String renderIndex(Snapshot observation) {
        Objects.requireNonNull(observation, "observation");
        StringBuilder out = new StringBuilder("HISTORICAL SNAPSHOTS\n\n");
        List<SnapshotRow> rows = snapshots(observation);
        if (rows.isEmpty()) return out.append("No observation snapshots have been committed.\n").toString();
        for (SnapshotRow row : rows) {
            long metricCount = observation.metrics().stream()
                    .filter(metric -> row.snapshotId().equals(metric.snapshotId())).count();
            out.append("• Tick ").append(row.tickSequence()).append(" · ").append(row.snapshotId())
                    .append(" · ").append(value(row.status())).append(" · metrics ").append(metricCount)
                    .append(" · ").append(value(row.source())).append("\n");
        }
        return out.toString();
    }

    public static SnapshotRow previous(String snapshotId, Snapshot observation) {
        List<SnapshotRow> rows = snapshots(observation);
        for (int index = 0; index < rows.size(); index++) {
            if (!snapshotId.equals(rows.get(index).snapshotId())) continue;
            return index + 1 < rows.size() ? rows.get(index + 1) : null;
        }
        return null;
    }

    private static SnapshotRow find(String id, Snapshot observation) {
        return observation.snapshots().stream().filter(row -> id.equals(row.snapshotId())).findFirst().orElse(null);
    }

    private static List<MetricRow> metricsFor(String snapshotId, Snapshot observation) {
        return observation.metrics().stream().filter(row -> snapshotId.equals(row.snapshotId()))
                .sorted(Comparator.comparing(MetricRow::entityType)
                        .thenComparing(MetricRow::entityId)
                        .thenComparing(MetricRow::metricKey))
                .toList();
    }

    private static Map<MetricKey, MetricRow> indexedMetrics(String snapshotId, Snapshot observation) {
        Map<MetricKey, MetricRow> result = new LinkedHashMap<>();
        for (MetricRow row : metricsFor(snapshotId, observation)) {
            result.put(new MetricKey(value(row.entityType()), value(row.entityId()), value(row.metricKey())), row);
        }
        return result;
    }

    private static String missing(String id) {
        return "HISTORICAL OBSERVATION EVIDENCE\n\nSnapshot is not present in the current observation registry.\nID: "
                + value(id) + "\n";
    }

    private static String value(Object value) {
        return value == null || value.toString().isBlank() ? "—" : value.toString();
    }

    private static String format(double value) {
        if (Math.rint(value) == value) return Long.toString(Math.round(value));
        return String.format(java.util.Locale.ROOT, "%.3f", value).replaceAll("0+$", "").replaceAll("\\.$", "");
    }

    private static String signed(double value) {
        return value > 0 ? "+" + format(value) : format(value);
    }

    private record MetricKey(String entityType, String entityId, String metricKey)
            implements Comparable<MetricKey> {
        @Override public int compareTo(MetricKey other) {
            int result = entityType.compareTo(other.entityType);
            if (result != 0) return result;
            result = entityId.compareTo(other.entityId);
            if (result != 0) return result;
            return metricKey.compareTo(other.metricKey);
        }
    }

    private record MetricPair(MetricRow older, MetricRow newer) { }
}
