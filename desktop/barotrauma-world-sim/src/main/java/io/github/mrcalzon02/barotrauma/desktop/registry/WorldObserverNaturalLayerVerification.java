package io.github.mrcalzon02.barotrauma.desktop.registry;

import io.github.mrcalzon02.barotrauma.persistence.NaturalWorldAndFleetRegistry;

import java.util.List;

/** Headless contract for natural-world observer dossiers and map signals. */
public final class WorldObserverNaturalLayerVerification {
    private WorldObserverNaturalLayerVerification() { }

    public static void main(String[] args) {
        NaturalWorldAndFleetRegistry.Summary summary = new NaturalWorldAndFleetRegistry.Summary(
                2, 1, 1, 1, 1, 1, 0, 0, 1, 18,
                1, 0, 1, 0, 0, 1, 1);
        NaturalWorldAndFleetRegistry.EcologyRow ecology = new NaturalWorldAndFleetRegistry.EcologyRow(
                "alpha-id", "Alpha Station", 48, 1, 72, 61, 55, 68, 34, 26, 58, 73, 64, 42L);
        NaturalWorldAndFleetRegistry.GeologyRow geology = new NaturalWorldAndFleetRegistry.GeologyRow(
                "alpha-id", "Alpha Station", 48, 1, 71, 78, 66, 49, 40, 42L);
        NaturalWorldAndFleetRegistry.ResourceRow resource = new NaturalWorldAndFleetRegistry.ResourceRow(
                "site-alpha", "Alpha Station", "HYDROTHERMAL_DEPOSIT", 82, 64, true, "HARVESTING",
                120, 180, 12, 30, null, 3, 40L, 20L, 42L);
        NaturalWorldAndFleetRegistry.ExtractionRow extraction = new NaturalWorldAndFleetRegistry.ExtractionRow(
                "extract-alpha", 41L, "Alpha Station", "Alpha Station", "Courier Alpha 1",
                "HYDROTHERMAL_DEPOSIT", "item-ore", 18, 138, 120, 84, 82, true,
                6, 4, 1620, "site-alpha", "mission-alpha", "freight-alpha");
        NaturalWorldAndFleetRegistry.EventRow event = new NaturalWorldAndFleetRegistry.EventRow(
                "event-alpha", 42L, "Alpha Station", "VENT_ERUPTION", 76,
                "A hydrothermal vent eruption destabilized the local transit corridor.");
        NaturalWorldAndFleetRegistry.Snapshot snapshot = new NaturalWorldAndFleetRegistry.Snapshot(summary,
                List.of(ecology), List.of(geology), List.of(resource), List.of(extraction), List.of(event),
                List.of(), List.of(), List.of(), List.of());

        String world = WorldObserverNaturalLayer.world(snapshot);
        requireContains(world, "Predator migration zones: 1", "World natural layer lost migration evidence.");
        requireContains(world, "Geological hotspots: 1", "World natural layer lost geology evidence.");
        requireContains(world, "Extracted units: 18", "World natural layer lost extraction totals.");

        String location = WorldObserverNaturalLayer.location("Alpha Station", snapshot);
        requireContains(location, "Migration pressure: 64", "Location dossier lost ecology state.");
        requireContains(location, "Hydrothermal activity: 78", "Location dossier lost geology state.");
        requireContains(location, "HYDROTHERMAL_DEPOSIT · HARVESTING", "Location dossier lost resource state.");
        requireContains(location, "VENT_ERUPTION · severity 76", "Location dossier lost natural event evidence.");
        requireContains(location, "18 unit(s) · 1620 credits", "Location dossier lost extraction evidence.");

        var signal = WorldObserverNaturalLayer.signals(snapshot).get("Alpha Station");
        if (signal == null) throw new IllegalStateException("Natural layer did not generate a location signal.");
        requireEquals(signal.ecologicalRisk(), 68, "Ecological risk projection is incorrect.");
        requireEquals(signal.geologicalRisk(), 78, "Geological risk projection is incorrect.");
        requireEquals(signal.resourceOpportunity(), 73, "Resource opportunity projection is incorrect.");
        requireEquals(signal.eventSeverity(), 76, "Natural event severity projection is incorrect.");
        requireEquals(signal.overallHazard(), 78, "Overall hazard projection is incorrect.");

        System.out.println("Living world observer natural-layer verification passed.");
    }

    private static void requireContains(String text, String expected, String message) {
        if (text == null || !text.contains(expected)) throw new IllegalStateException(message + " Missing: " + expected);
    }

    private static void requireEquals(int actual, int expected, String message) {
        if (actual != expected) throw new IllegalStateException(message + " Expected " + expected + ", got " + actual + '.');
    }
}
