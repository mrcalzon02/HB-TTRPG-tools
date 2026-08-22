package io.github.mrcalzon02.barotrauma.desktop.registry;

import io.github.mrcalzon02.barotrauma.observation.ObservationRegistry;

import java.util.List;

/** Headless contract for population, migration, settlement, faction, and creature observer evidence. */
public final class WorldObserverCivilLayerVerification {
    private WorldObserverCivilLayerVerification() { }

    public static void main(String[] args) {
        ObservationRegistry.WorldSummary summary = new ObservationRegistry.WorldSummary(
                "world-alpha", "Observer Europa", 1, 920, 1, 180,
                2, 3, 42L, "2175-01-02T00:00:00Z", 1);
        ObservationRegistry.NpcPopulationRow population = new ObservationRegistry.NpcPopulationRow(
                "pop-alpha", "station-alpha", "Alpha Station", 500, 110, 80, 55, 35, 40,
                20, 80, 920, 900, 940, 910, 42, 42L);
        ObservationRegistry.PopulationLedgerRow ledger = new ObservationRegistry.PopulationLedgerRow(
                "ledger-alpha", "pop-alpha", "station-alpha", "Alpha Station", 42L,
                900, 4, 2, 30, 5, 7, 0, 0, 920, 900, 940, 910, 42,
                48, 49, "REFUGEE_ARRIVAL", "migration-alpha", "A refugee convoy reached Alpha Station.",
                18.75, "BALANCED");
        ObservationRegistry.CreaturePopulationRow creature = new ObservationRegistry.CreaturePopulationRow(
                "creature-alpha", "location-alpha", "Alpha Station", "mudraptor", "PREDATOR",
                180, 72, 68, 61, 55, 74, 90, "EXPANDING", 69, 58, 42L);
        ObservationRegistry.FactionPresenceRow faction = new ObservationRegistry.FactionPresenceRow(
                "presence-alpha", "location-alpha", "Alpha Station", "Coalition", 78,
                "ESTABLISHED", "station-control", 42L);
        ObservationRegistry.FlowRow flow = new ObservationRegistry.FlowRow(
                "flow-alpha", "NPC_POPULATION", "pop-alpha", "Beta Trench", "Alpha Station",
                120, 7, "FAUNA_PRESSURE", "IN_TRANSIT", 39L, null, 38L, 42L,
                "Civilians are relocating away from predator expansion.");
        ObservationRegistry.EventRow event = new ObservationRegistry.EventRow(
                "event-alpha", 42L, "2175-01-02T00:00:00Z", "MIGRATION", "LOCATION", "location-alpha",
                "FAUNA_PRESSURE", "flow-alpha", "predator expansion", 120, "PUBLIC", 88,
                "Population movement increased around Alpha Station.");
        ObservationRegistry.Snapshot observation = new ObservationRegistry.Snapshot(summary,
                List.of(population), List.of(ledger), List.of(creature), List.of(faction), List.of(flow),
                List.of(event), List.of(), List.of(), -1L);

        ObservationRegistry.MigrationFlowRow migration = new ObservationRegistry.MigrationFlowRow(
                "migration-alpha", "EVACUATION", "IN_TRANSIT", "FAUNA_PRESSURE", 120, 120,
                120, 60, 0, 7, 0, "Beta Station", "Alpha Station", "Beta Trench", "Alpha Station",
                "vessel-alpha", "Transport Alpha", "leg-alpha", 38L, 39L, null, null,
                3L, 6L, 38L, 42L, null, "Half of the convoy has reached Alpha Station.");
        ObservationRegistry.SettlementProjectRow settlement = new ObservationRegistry.SettlementProjectRow(
                "settlement-alpha", "HABITAT_EXPANSION", "ACTIVE", "Coalition", "station-alpha",
                "Alpha Station", null, null, "location-alpha", "Alpha Station", "pop-alpha", "vessel-alpha",
                "Transport Alpha", 80, 60, 100, 90, 160, 120, 6, 5, 55, 62,
                55, 100, 55, 35L, 36L, 37L, null, 42L, null,
                "Additional habitat modules are being assembled for population growth.");

        WorldObserverCivilLayer.CivilSnapshot civil = new WorldObserverCivilLayer.CivilSnapshot(
                observation, List.of(migration), List.of(settlement));

        String world = WorldObserverCivilLayer.world(civil);
        requireContains(world, "Estimated NPC population: 920", "World civil layer lost population total.");
        requireContains(world, "Active migration flows: 1", "World civil layer lost migration activity.");
        requireContains(world, "Active settlement projects: 1", "World civil layer lost settlement activity.");
        requireContains(world, "High creature-pressure locations: 1", "World civil layer lost creature pressure.");

        String location = WorldObserverCivilLayer.location("Alpha Station", civil);
        requireContains(location, "Total residents: 920", "Location dossier lost population evidence.");
        requireContains(location, "REFUGEE_ARRIVAL", "Location dossier lost population-accounting evidence.");
        requireContains(location, "EVACUATION · IN_TRANSIT", "Location dossier lost migration manifest.");
        requireContains(location, "HABITAT_EXPANSION · ACTIVE · 55%", "Location dossier lost settlement project.");
        requireContains(location, "Coalition · influence 78", "Location dossier lost faction evidence.");
        requireContains(location, "mudraptor · PREDATOR", "Location dossier lost creature evidence.");

        var signal = WorldObserverCivilLayer.signals(civil).get("Alpha Station");
        if (signal == null) throw new IllegalStateException("Civil layer did not generate an Alpha Station signal.");
        requireEquals(signal.population(), 920, "Population signal is incorrect.");
        requireEquals(signal.dominantFactionInfluence(), 78, "Faction influence signal is incorrect.");
        requireEquals(signal.creaturePressure(), 74, "Creature pressure signal is incorrect.");
        if (signal.migrationActivity() <= 0) throw new IllegalStateException("Migration activity signal was not projected.");
        if (signal.settlementActivity() <= 0) throw new IllegalStateException("Settlement activity signal was not projected.");

        System.out.println("Living world observer civilization-layer verification passed.");
    }

    private static void requireContains(String text, String expected, String message) {
        if (text == null || !text.contains(expected)) throw new IllegalStateException(message + " Missing: " + expected);
    }

    private static void requireEquals(int actual, int expected, String message) {
        if (actual != expected) throw new IllegalStateException(message + " Expected " + expected + ", got " + actual + '.');
    }
}
