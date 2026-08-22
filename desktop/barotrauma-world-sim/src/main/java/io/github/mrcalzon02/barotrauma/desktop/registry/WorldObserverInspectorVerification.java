package io.github.mrcalzon02.barotrauma.desktop.registry;

import io.github.mrcalzon02.barotrauma.persistence.PassiveWorldRegistry;
import io.github.mrcalzon02.barotrauma.persistence.WorldMapRegistry;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Headless contract for the operator-facing living-world dossiers. */
public final class WorldObserverInspectorVerification {
    private WorldObserverInspectorVerification() { }

    public static void main(String[] args) {
        UUID worldId = UUID.fromString("71000000-0000-0000-0000-000000000001");
        UUID locationA = UUID.fromString("71000000-0000-0000-0000-000000000010");
        UUID locationB = UUID.fromString("71000000-0000-0000-0000-000000000011");
        UUID stationA = UUID.fromString("71000000-0000-0000-0000-000000000020");
        UUID vesselId = UUID.fromString("71000000-0000-0000-0000-000000000030");
        UUID missionId = UUID.fromString("71000000-0000-0000-0000-000000000040");

        WorldMapRegistry.WorldSummary summary = new WorldMapRegistry.WorldSummary(
                worldId, "Observer Europa", true, null, "MASTER-OBSERVER", 22,
                Instant.parse("2175-01-01T00:00:00Z"), Instant.parse("2026-08-21T00:00:00Z"),
                48, 2, 1, 7008.0, "Watcher", "Barsuk", 0, 1, 1,
                Instant.parse("2175-01-02T00:00:00Z"), Instant.parse("2026-06-20T08:00:00Z"),
                Instant.parse("2175-01-02T00:00:00Z"), 42L, true, "RUNNING");
        WorldMapRegistry.LocationRow alpha = new WorldMapRegistry.LocationRow(
                locationA, "alpha", 0, "Alpha Station", "station", 48, 1,
                10.0, 20.0, "cold-caverns", "Coalition", true);
        WorldMapRegistry.LocationRow beta = new WorldMapRegistry.LocationRow(
                locationB, "beta", 1, "Beta Trench", "location", 42, 3,
                80.0, 60.0, "abyss", null, false);
        WorldMapRegistry.RegistrySnapshot registry = new WorldMapRegistry.RegistrySnapshot(summary,
                List.of(alpha, beta),
                List.of(new WorldMapRegistry.StationRow(stationA, "alpha", locationA, "alpha",
                        "Alpha Station", "outpost", "Coalition", 48, 1, true)),
                List.of(), List.of("worldEconomy"));

        PassiveWorldRegistry.Configuration configuration = new PassiveWorldRegistry.Configuration(
                true, true, 5, 1, Instant.parse("2175-01-02T00:00:00Z"), 42L,
                Instant.parse("2175-01-02T00:00:00Z"), 42L);
        PassiveWorldRegistry.StationRow station = new PassiveWorldRegistry.StationRow(
                stationA, "Alpha Station", "Coalition", 48, 1, 12000, 88, 33,
                61, 72, 94, 18, 27, "STABLE", 42L);
        PassiveWorldRegistry.VesselRow vessel = new PassiveWorldRegistry.VesselRow(
                vesselId, "Courier Alpha 1", "COURIER", "IN_TRANSIT", 82, 67, 12,
                75, 83, 71, 62, 48, 30, 5, 10, 42L,
                "Alpha Station", "Beta Trench", missionId, "TRADE", "ACTIVE", 55,
                46L, 48L, 2, 1, 45L, 2);
        PassiveWorldRegistry.MissionRow mission = new PassiveWorldRegistry.MissionRow(
                missionId, "TRADE", "ACTIVE", "Alpha Station", "Beta Trench",
                "Courier Alpha 1", 35, 4200, 20, 55, 35L, 42L, null);
        PassiveWorldRegistry.VoyageLogRow log = new PassiveWorldRegistry.VoyageLogRow(
                UUID.fromString("71000000-0000-0000-0000-000000000050"), vesselId, "Courier Alpha 1",
                missionId, 41L, Instant.parse("2175-01-01T23:59:00Z"), "VOYAGE_PROGRESS", 15,
                "Voyage progress report", "A current shear delayed the vessel.", "IN_TRANSIT", -2, -3, 0);
        PassiveWorldRegistry.EncounterRow encounter = new PassiveWorldRegistry.EncounterRow(
                UUID.fromString("71000000-0000-0000-0000-000000000060"), vesselId, "Courier Alpha 1",
                40L, Instant.parse("2175-01-01T23:58:00Z"), "FAUNA_CONTACT", 44, 57, 13,
                "SUCCESS", "The crew drove off a hunting pack.");

        String operationId = "response-71000000-0000-0000-0000-000000000070";
        PassiveWorldRegistry.FleetResponseRow response = new PassiveWorldRegistry.FleetResponseRow(
                operationId, "RESCUE", "ACTIVE", "OUTBOUND", 35, 58,
                "71000000-0000-0000-0000-000000000099", "Hauler Distress 9",
                vesselId.toString(), "Courier Alpha 1", stationA.toString(), "Alpha Station",
                null, null, locationB.toString(), "Beta Trench", locationA.toString(), "Alpha Station",
                5, 4, 0, 2, 1, true, 38L, 42L, null, 39L, null, null, null);
        PassiveWorldRegistry.FleetResponseLogRow responseLog = new PassiveWorldRegistry.FleetResponseLogRow(
                "response-log-1", operationId, 39L, "ASSIGNED",
                "Courier Alpha 1 accepted the distress call and began outbound departure checks.");
        PassiveWorldRegistry.FleetTransitLegRow responseLeg = new PassiveWorldRegistry.FleetTransitLegRow(
                "response-leg-1", operationId, vesselId.toString(), "Courier Alpha 1", 1,
                "OUTBOUND", "IN_TRANSIT", "Alpha Station", "Beta Trench", 8, 39L, null, null);
        PassiveWorldRegistry.FreightRow freight = new PassiveWorldRegistry.FreightRow(
                "freight-lot-1", missionId.toString(), "Alpha Station", "Beta Trench",
                "Crew Rations", "SUPPLY", 20, "IN_TRANSIT", vesselId.toString(),
                "Courier Alpha 1", 35L, 42L, null);
        PassiveWorldRegistry.TreasuryRow treasury = new PassiveWorldRegistry.TreasuryRow(
                "treasury-1", "Alpha Station", 42L, "FREIGHT", 2400,
                "NPC_VESSEL", vesselId.toString(), "Freight contract settlement reserved for Courier Alpha 1.");

        PassiveWorldRegistry.Snapshot passive = new PassiveWorldRegistry.Snapshot(configuration,
                List.of(station), List.of(vessel), List.of(mission), List.of(log),
                List.of(encounter), List.of(), List.of(response), List.of(responseLog),
                List.of(responseLeg), List.of(freight), List.of(treasury));

        String world = WorldObserverInspector.world(registry, passive, "procedural", 0, 12);
        requireContains(world, "Observer Europa", "World dossier lost the world identity.");
        requireContains(world, "Passive Mode: ENABLED", "World dossier lost passive runtime state.");
        requireContains(world, "Active routes/vessels: 1", "World dossier lost active traffic evidence.");
        requireContains(world, "Active fleet responses: 1", "World dossier lost fleet-response activity.");
        requireContains(world, "Freight in transit: 1", "World dossier lost freight activity.");

        String vesselDossier = WorldObserverInspector.vessel(vessel, passive);
        requireContains(vesselDossier, "Route: 5/10 (50%)", "Vessel dossier lost committed route progress.");
        requireContains(vesselDossier, "TRADE · ACTIVE", "Vessel dossier lost its mission contract.");
        requireContains(vesselDossier, "RESCUE · ACTIVE · OUTBOUND", "Vessel dossier lost fleet-response state.");
        requireContains(vesselDossier, "Courier Alpha 1 accepted the distress call", "Vessel dossier lost response evidence.");
        requireContains(vesselDossier, "Crew Rations ×20 · IN_TRANSIT", "Vessel dossier lost its freight manifest.");
        requireContains(vesselDossier, "+2400 credits", "Vessel dossier lost settlement evidence.");
        requireContains(vesselDossier, "A current shear delayed the vessel.", "Vessel dossier lost voyage evidence.");
        requireContains(vesselDossier, "FAUNA_CONTACT · SUCCESS", "Vessel dossier lost encounter evidence.");

        String route = WorldObserverInspector.route(vessel, passive);
        requireContains(route, "Alpha Station  →  Beta Trench", "Route dossier lost endpoints.");
        requireContains(route, "Accumulated delay: 2 tick(s)", "Route dossier lost delay evidence.");
        requireContains(route, "OUTBOUND · IN_TRANSIT", "Route dossier lost fleet-response transit evidence.");
        requireContains(route, "Crew Rations ×20 · IN_TRANSIT", "Route dossier lost freight-in-transit evidence.");

        String stationDossier = WorldObserverInspector.location(alpha, registry, passive);
        requireContains(stationDossier, "Credits: 12000", "Station dossier lost economic state.");
        requireContains(stationDossier, "Courier Alpha 1", "Station dossier lost local traffic.");
        requireContains(stationDossier, "MISSION / TRADE DOCUMENTS", "Station dossier lost mission documents.");
        requireContains(stationDossier, "FLEET RESPONSE DOCUMENTS", "Station dossier lost fleet-response documents.");
        requireContains(stationDossier, "FREIGHT / TRADE LEDGER", "Station dossier lost freight documents.");
        requireContains(stationDossier, "TREASURY LEDGER", "Station dossier lost treasury documents.");
        requireContains(stationDossier, "Freight contract settlement reserved", "Station dossier lost treasury memo evidence.");

        System.out.println("Living world observer dossier verification passed.");
    }

    private static void requireContains(String text, String expected, String message) {
        if (text == null || !text.contains(expected)) throw new IllegalStateException(message + " Missing: " + expected);
    }
}
