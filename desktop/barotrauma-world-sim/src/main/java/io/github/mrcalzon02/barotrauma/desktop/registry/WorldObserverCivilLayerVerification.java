package io.github.mrcalzon02.barotrauma.desktop.registry;

import io.github.mrcalzon02.barotrauma.observation.ObservationRegistry;

import java.util.List;

/** Headless contract for population, migration, settlement, faction, creature, and institutional observer evidence. */
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

        WorldObserverInstitutionalLayer.InstitutionalSnapshot institutions =
                new WorldObserverInstitutionalLayer.InstitutionalSnapshot(
                        new WorldObserverInstitutionalLayer.Summary(12, 2, 8, 1, 1, 1, 500_000, 12_000),
                        List.of(new WorldObserverInstitutionalLayer.OrganizationRow(
                                "org-credit-alpha", "Alpha Mutual Credit", "CREDIT_UNION", "Coalition",
                                "Alpha Station", 80_000, 4_000, 200_000, 18_000, 9_000, 350,
                                82, 42, 45, 260, 10, 1, 18_000, 9_000)),
                        List.of(new WorldObserverInstitutionalLayer.PresenceRow(
                                "org-credit-alpha", "Alpha Mutual Credit", "CREDIT_UNION", "Coalition",
                                "Alpha Station", 25, 84, 35, 15, "ACTIVE", 42)),
                        List.of(new WorldObserverInstitutionalLayer.PoliticalRow(
                                "station-alpha", "Alpha Station", "Coalition", "Commercial Bloc",
                                88, "CONTESTED", 42, false)),
                        List.of(new WorldObserverInstitutionalLayer.OperationRow(
                                "operation-alpha", "CONSTRUCTION_CONTRACT", "ACTIVE", 41, 46,
                                "Alpha Engineering Cooperative", "Alpha Station",
                                "FINANCE: Alpha Mutual Credit; LABOR: Alpha Workers Federation",
                                12_000, 1_000, 11_000, "Alpha Mutual Credit", false, 0)),
                        List.of(new WorldObserverInstitutionalLayer.AssetRow(
                                "asset-alpha", "Alpha Station", "Alpha Engineering Cooperative", "DOCKYARD", 1,
                                15, 8, 4, 0, 5, 40, "operation-alpha")),
                        List.of(new WorldObserverInstitutionalLayer.ConflictRow(
                                "conflict-alpha", "Alpha Control Crisis", "CONTESTED", 67,
                                "Alpha Station", 2, 39, 42,
                                "Coalition and Separatist organizations are contesting station influence.",
                                "Coalition:INCUMBENT; Separatists:CHALLENGER")),
                        List.of(new WorldObserverInstitutionalLayer.NewsRow(
                                "news-alpha", 42, "CONTROL_CONTEST", "Separatists", "Alpha Station", 67,
                                "Station control contested", "Political pressure has entered a sustained contest.")),
                        List.of(new WorldObserverInstitutionalLayer.LedgerRow(
                                "finance-alpha", 41, "Alpha Mutual Credit", "LOAN_DRAW", -11_000,
                                69_000, "Alpha Engineering Cooperative", "operation-alpha",
                                "Construction credit advanced for dockyard expansion.")));

        WorldObserverCivilLayer.CivilSnapshot civil = new WorldObserverCivilLayer.CivilSnapshot(
                observation, List.of(migration), List.of(settlement), institutions);

        String world = WorldObserverCivilLayer.world(civil);
        requireContains(world, "Estimated NPC population: 920", "World civil layer lost population total.");
        requireContains(world, "Active migration flows: 1", "World civil layer lost migration activity.");
        requireContains(world, "Active settlement projects: 1", "World civil layer lost settlement activity.");
        requireContains(world, "High creature-pressure locations: 1", "World civil layer lost creature pressure.");
        requireContains(world, "Organizations: 12", "World dossier lost institutional organization summary.");
        requireContains(world, "Active regional conflicts: 1", "World dossier lost regional-conflict summary.");

        String location = WorldObserverCivilLayer.location("Alpha Station", civil);
        requireContains(location, "Total residents: 920", "Location dossier lost population evidence.");
        requireContains(location, "REFUGEE_ARRIVAL", "Location dossier lost population-accounting evidence.");
        requireContains(location, "EVACUATION · IN_TRANSIT", "Location dossier lost migration manifest.");
        requireContains(location, "HABITAT_EXPANSION · ACTIVE · 55%", "Location dossier lost settlement project.");
        requireContains(location, "Coalition · influence 78", "Location dossier lost legacy faction evidence.");
        requireContains(location, "mudraptor · PREDATOR", "Location dossier lost creature evidence.");
        requireContains(location, "Major faction: Coalition", "Location dossier lost authoritative station control.");
        requireContains(location, "Governing bloc: Commercial Bloc", "Location dossier lost governing subfaction.");
        requireContains(location, "Alpha Mutual Credit · CREDIT_UNION", "Location dossier lost headquartered institution.");
        requireContains(location, "CONSTRUCTION_CONTRACT · ACTIVE", "Location dossier lost organization operation.");
        requireContains(location, "DOCKYARD L1", "Location dossier lost durable institutional asset.");
        requireContains(location, "Alpha Control Crisis · CONTESTED", "Location dossier lost regional conflict.");
        requireContains(location, "LOAN_DRAW · -11000", "Location dossier lost institutional finance ledger.");

        var signal = WorldObserverCivilLayer.signals(civil).get("Alpha Station");
        if (signal == null) throw new IllegalStateException("Civil layer did not generate an Alpha Station signal.");
        requireEquals(signal.population(), 920, "Population signal is incorrect.");
        requireEquals(signal.dominantFactionInfluence(), 88,
                "Authoritative station-control influence did not override the legacy faction hint.");
        requireEquals(signal.dominantFaction(), "Coalition",
                "Authoritative station-control faction did not drive the faction overlay.");
        requireEquals(signal.creaturePressure(), 74, "Creature pressure signal is incorrect.");
        if (signal.migrationActivity() <= 0) throw new IllegalStateException("Migration activity signal was not projected.");
        if (signal.settlementActivity() <= 0) throw new IllegalStateException("Settlement activity signal was not projected.");

        System.out.println("Living world observer civilization and institutional-layer verification passed.");
    }

    private static void requireContains(String text, String expected, String message) {
        if (text == null || !text.contains(expected)) throw new IllegalStateException(message + " Missing: " + expected);
    }

    private static void requireEquals(int actual, int expected, String message) {
        if (actual != expected) throw new IllegalStateException(message + " Expected " + expected + ", got " + actual + '.');
    }

    private static void requireEquals(String actual, String expected, String message) {
        if (!java.util.Objects.equals(actual, expected)) {
            throw new IllegalStateException(message + " Expected " + expected + ", got " + actual + '.');
        }
    }
}
