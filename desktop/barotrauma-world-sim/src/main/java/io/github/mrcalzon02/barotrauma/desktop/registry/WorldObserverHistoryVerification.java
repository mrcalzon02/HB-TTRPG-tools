package io.github.mrcalzon02.barotrauma.desktop.registry;

import io.github.mrcalzon02.barotrauma.observation.ObservationRegistry;

import java.util.List;

/** Headless contract for non-mutating historical snapshot and metric comparison. */
public final class WorldObserverHistoryVerification {
    private WorldObserverHistoryVerification() { }

    public static void main(String[] args) {
        ObservationRegistry.WorldSummary summary = new ObservationRegistry.WorldSummary(
                "world-history", "History Europa", 2, 2400, 3, 120, 4, 10,
                80L, "2175-01-03T00:00:00Z", 12);
        ObservationRegistry.SnapshotRow older = new ObservationRegistry.SnapshotRow(
                "snapshot-60", 60L, null, "rules-1", "2175-01-02T12:00:00Z", "COMMITTED", "PASSIVE");
        ObservationRegistry.SnapshotRow newer = new ObservationRegistry.SnapshotRow(
                "snapshot-80", 80L, "snapshot-60", "rules-1", "2175-01-03T00:00:00Z", "COMMITTED", "PASSIVE");
        ObservationRegistry.MetricRow olderPopulation = new ObservationRegistry.MetricRow(
                "metric-1", "STATION", "alpha", "population", 60L, 1000.0, "people", "snapshot-60");
        ObservationRegistry.MetricRow newerPopulation = new ObservationRegistry.MetricRow(
                "metric-2", "STATION", "alpha", "population", 80L, 1125.0, "people", "snapshot-80");
        ObservationRegistry.MetricRow olderThreat = new ObservationRegistry.MetricRow(
                "metric-3", "LOCATION", "beta", "threat", 60L, 42.0, "index", "snapshot-60");
        ObservationRegistry.MetricRow newerThreat = new ObservationRegistry.MetricRow(
                "metric-4", "LOCATION", "beta", "threat", 80L, 31.5, "index", "snapshot-80");
        ObservationRegistry.MetricRow onlyNew = new ObservationRegistry.MetricRow(
                "metric-5", "VESSEL", "courier", "hull", 80L, 78.0, "percent", "snapshot-80");
        ObservationRegistry.Snapshot observation = new ObservationRegistry.Snapshot(summary,
                List.of(), List.of(), List.of(), List.of(), List.of(), List.of(),
                List.of(newer, older), List.of(newerPopulation, olderPopulation, olderThreat, newerThreat, onlyNew), -1L);

        List<ObservationRegistry.SnapshotRow> ordered = WorldObserverHistory.snapshots(observation);
        require(ordered.size() == 2, "Historical snapshot index lost records.");
        require("snapshot-80".equals(ordered.get(0).snapshotId()), "Historical snapshots were not sorted newest-first.");
        require(WorldObserverHistory.previous("snapshot-80", observation) == older,
                "Previous-snapshot navigation did not resolve the parent-era record.");

        String rendered = WorldObserverHistory.renderSnapshot("snapshot-80", observation);
        requireContains(rendered, "Tick: 80", "Historical snapshot lost its tick.");
        requireContains(rendered, "population = 1125 people", "Historical snapshot lost persisted metric evidence.");
        requireContains(rendered, "not a reconstructed historical map state",
                "Historical evidence view no longer states its reconstruction boundary.");

        String comparison = WorldObserverHistory.compare("snapshot-80", "snapshot-60", observation);
        requireContains(comparison, "Tick delta: 20", "Historical comparison lost its tick separation.");
        requireContains(comparison, "1000 → 1125 (Δ +125) people", "Historical comparison lost population delta.");
        requireContains(comparison, "42 → 31.5 (Δ -10.5) index", "Historical comparison lost threat delta.");
        requireContains(comparison, "— → 78 percent", "Historical comparison lost newly appearing metrics.");

        System.out.println("Living world observer historical evidence verification passed.");
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    private static void requireContains(String text, String expected, String message) {
        if (text == null || !text.contains(expected)) throw new IllegalStateException(message + " Missing: " + expected);
    }
}
