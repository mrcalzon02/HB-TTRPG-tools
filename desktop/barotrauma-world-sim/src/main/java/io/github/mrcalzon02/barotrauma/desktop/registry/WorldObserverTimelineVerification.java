package io.github.mrcalzon02.barotrauma.desktop.registry;

import io.github.mrcalzon02.barotrauma.observation.ObservationRegistry;
import io.github.mrcalzon02.barotrauma.persistence.NaturalWorldAndFleetRegistry;
import io.github.mrcalzon02.barotrauma.persistence.PassiveWorldRegistry;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Headless contract for the unified non-mutating observer timeline. */
public final class WorldObserverTimelineVerification {
    private WorldObserverTimelineVerification() { }

    public static void main(String[] args) {
        UUID vesselId = UUID.fromString("72000000-0000-0000-0000-000000000001");
        PassiveWorldRegistry.Configuration configuration = new PassiveWorldRegistry.Configuration(
                true, true, 5, 1, Instant.parse("2175-01-02T00:00:00Z"), 50L,
                Instant.parse("2175-01-02T00:00:00Z"), 50L);
        PassiveWorldRegistry.VoyageLogRow voyage = new PassiveWorldRegistry.VoyageLogRow(
                UUID.fromString("72000000-0000-0000-0000-000000000002"), vesselId, "Courier 7", null,
                48L, Instant.parse("2175-01-01T23:58:00Z"), "VOYAGE_PROGRESS", 35,
                "Transit delay", "Ice shear forced a slower approach.", "IN_TRANSIT", -2, -4, 0);
        PassiveWorldRegistry.TreasuryRow treasury = new PassiveWorldRegistry.TreasuryRow(
                "treasury-49", "Alpha Station", 49L, "FREIGHT", 2400,
                "NPC_VESSEL", vesselId.toString(), "Delivered medical freight.");
        PassiveWorldRegistry.Snapshot passive = new PassiveWorldRegistry.Snapshot(configuration,
                List.of(), List.of(), List.of(), List.of(voyage), List.of(), List.of(),
                List.of(), List.of(), List.of(), List.of(), List.of(treasury));

        NaturalWorldAndFleetRegistry.Summary naturalSummary = new NaturalWorldAndFleetRegistry.Summary(
                1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        NaturalWorldAndFleetRegistry.EventRow naturalEvent = new NaturalWorldAndFleetRegistry.EventRow(
                "natural-50", 50L, "Beta Trench", "ROCKFALL", 74,
                "A cave collapse obstructed the transit corridor.");
        NaturalWorldAndFleetRegistry.Snapshot natural = new NaturalWorldAndFleetRegistry.Snapshot(naturalSummary,
                List.of(), List.of(), List.of(), List.of(), List.of(naturalEvent),
                List.of(), List.of(), List.of(), List.of());

        ObservationRegistry.WorldSummary civilSummary = new ObservationRegistry.WorldSummary(
                "world-alpha", "Observer Europa", 0, 0, 0, 0, 0, 1,
                50L, "2175-01-02T00:00:00Z", 0);
        ObservationRegistry.EventRow civilEvent = new ObservationRegistry.EventRow(
                "civil-47", 47L, "2175-01-01T23:57:00Z", "MIGRATION", "LOCATION", "Alpha Station",
                "FAUNA_PRESSURE", "flow-47", "predator expansion", 65,
                "PUBLIC", 80, "Civilians began relocating toward the inner stations.");
        ObservationRegistry.Snapshot observation = new ObservationRegistry.Snapshot(civilSummary,
                List.of(), List.of(), List.of(), List.of(), List.of(), List.of(civilEvent), List.of(), List.of(), -1L);
        WorldObserverCivilLayer.CivilSnapshot civil = new WorldObserverCivilLayer.CivilSnapshot(
                observation, List.of(), List.of());

        List<WorldObserverTimeline.Entry> entries = WorldObserverTimeline.build(passive, natural, civil);
        if (entries.size() != 4) throw new IllegalStateException("Timeline did not preserve all evidence families.");
        requireEquals(entries.get(0).tick(), 50L, "Newest event was not sorted first.");
        requireContains(entries.get(0).title(), "ROCKFALL", "Natural incident lost its event type.");
        requireContains(entries.get(1).details(), "Delivered medical freight", "Treasury evidence was lost.");
        requireContains(entries.get(2).details(), "Ice shear", "Voyage evidence was lost.");
        requireContains(entries.get(3).details(), "relocating", "Civilization evidence was lost.");

        String rendered = WorldObserverTimeline.render(entries, 10);
        requireContains(rendered, "RECENT WORLD TIMELINE", "Timeline heading is missing.");
        requireContains(rendered, "[Tick 50] NATURAL", "Rendered timeline lost chronological evidence.");
        requireContains(rendered, "[Tick 49] ECONOMY", "Rendered timeline lost economic evidence.");
        requireContains(rendered, "[Tick 48] VOYAGE", "Rendered timeline lost voyage evidence.");
        requireContains(rendered, "[Tick 47] CIVILIZATION", "Rendered timeline lost civil evidence.");

        System.out.println("Living world observer unified timeline verification passed.");
    }

    private static void requireContains(String text, String expected, String message) {
        if (text == null || !text.contains(expected)) throw new IllegalStateException(message + " Missing: " + expected);
    }

    private static void requireEquals(long actual, long expected, String message) {
        if (actual != expected) throw new IllegalStateException(message + " Expected " + expected + ", got " + actual + '.');
    }
}
