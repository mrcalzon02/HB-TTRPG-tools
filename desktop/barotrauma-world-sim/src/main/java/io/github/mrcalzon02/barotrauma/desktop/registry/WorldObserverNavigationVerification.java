package io.github.mrcalzon02.barotrauma.desktop.registry;

import io.github.mrcalzon02.barotrauma.observation.ObservationRegistry;
import io.github.mrcalzon02.barotrauma.persistence.NaturalWorldAndFleetRegistry;
import io.github.mrcalzon02.barotrauma.persistence.PassiveWorldRegistry;
import io.github.mrcalzon02.barotrauma.persistence.WorldMapRegistry;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Headless contract for timeline-to-record navigation and map anchoring. */
public final class WorldObserverNavigationVerification {
    private WorldObserverNavigationVerification() { }

    public static void main(String[] args) {
        UUID worldId = UUID.fromString("73000000-0000-0000-0000-000000000001");
        UUID alphaId = UUID.fromString("73000000-0000-0000-0000-000000000010");
        UUID betaId = UUID.fromString("73000000-0000-0000-0000-000000000011");
        UUID vesselId = UUID.fromString("73000000-0000-0000-0000-000000000020");
        UUID missionId = UUID.fromString("73000000-0000-0000-0000-000000000030");
        UUID encounterId = UUID.fromString("73000000-0000-0000-0000-000000000040");

        WorldMapRegistry.WorldSummary worldSummary = new WorldMapRegistry.WorldSummary(
                worldId, "Navigation Europa", true, null, "MASTER-NAVIGATION", 22,
                Instant.parse("2175-01-01T00:00:00Z"), Instant.parse("2026-08-21T00:00:00Z"),
                48, 2, 1, 7008.0, "Watcher", "Barsuk", 0, 1, 1,
                Instant.parse("2175-01-02T00:00:00Z"), Instant.parse("2026-06-20T08:00:00Z"),
                Instant.parse("2175-01-02T00:00:00Z"), 52L, true, "RUNNING");
        WorldMapRegistry.LocationRow alpha = new WorldMapRegistry.LocationRow(
                alphaId, "alpha", 0, "Alpha Station", "station", 48, 1,
                10.0, 20.0, "cold-caverns", "Coalition", true);
        WorldMapRegistry.LocationRow beta = new WorldMapRegistry.LocationRow(
                betaId, "beta", 1, "Beta Trench", "location", 42, 3,
                80.0, 60.0, "abyss", null, false);
        WorldMapRegistry.RegistrySnapshot registry = new WorldMapRegistry.RegistrySnapshot(
                worldSummary, List.of(alpha, beta), List.of(), List.of(), List.of());

        PassiveWorldRegistry.Configuration configuration = new PassiveWorldRegistry.Configuration(
                true, true, 5, 1, Instant.parse("2175-01-02T00:00:00Z"), 52L,
                Instant.parse("2175-01-02T00:00:00Z"), 52L);
        PassiveWorldRegistry.VesselRow vessel = new PassiveWorldRegistry.VesselRow(
                vesselId, "Courier Nav 1", "COURIER", "IN_TRANSIT", 84, 70, 12,
                76, 82, 72, 61, 42, 28, 4, 10, 52L,
                "Alpha Station", "Beta Trench", missionId, "TRADE", "ACTIVE", 60,
                54L, 56L, 2, 1, 54L, 1);
        PassiveWorldRegistry.MissionRow mission = new PassiveWorldRegistry.MissionRow(
                missionId, "TRADE", "ACTIVE", "Alpha Station", "Beta Trench",
                "Courier Nav 1", 40, 3600, 16, 60, 45L, 52L, null);
        PassiveWorldRegistry.EncounterRow encounter = new PassiveWorldRegistry.EncounterRow(
                encounterId, vesselId, "Courier Nav 1", 51L,
                Instant.parse("2175-01-01T23:59:00Z"), "ICE_SHEAR", 55, 63, 8,
                "SUCCESS", "The courier crossed the shear with minor hull strain.");
        PassiveWorldRegistry.Snapshot passive = new PassiveWorldRegistry.Snapshot(configuration,
                List.of(), List.of(vessel), List.of(mission), List.of(), List.of(encounter), List.of(),
                List.of(), List.of(), List.of(), List.of(), List.of());

        NaturalWorldAndFleetRegistry.Summary naturalSummary = new NaturalWorldAndFleetRegistry.Summary(
                1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        NaturalWorldAndFleetRegistry.EventRow naturalEvent = new NaturalWorldAndFleetRegistry.EventRow(
                "natural-nav-1", 52L, "Beta Trench", "ROCKFALL", 72,
                "A fresh collapse narrowed the approach to Beta Trench.");
        NaturalWorldAndFleetRegistry.Snapshot natural = new NaturalWorldAndFleetRegistry.Snapshot(naturalSummary,
                List.of(), List.of(), List.of(), List.of(), List.of(naturalEvent),
                List.of(), List.of(), List.of(), List.of());

        ObservationRegistry.WorldSummary observationSummary = new ObservationRegistry.WorldSummary(
                "world-navigation", "Navigation Europa", 0, 0, 0, 0, 0, 0,
                52L, "2175-01-02T00:00:00Z", 0);
        ObservationRegistry.Snapshot observation = new ObservationRegistry.Snapshot(observationSummary,
                List.of(), List.of(), List.of(), List.of(), List.of(), List.of(), List.of(), List.of(), -1L);
        WorldObserverCivilLayer.CivilSnapshot civil = new WorldObserverCivilLayer.CivilSnapshot(
                observation, List.of(), List.of());

        WorldObserverTimeline.Entry encounterEntry = new WorldObserverTimeline.Entry(
                51L, "ENCOUNTER", "NPC_VESSEL", vesselId.toString(), "Courier Nav 1",
                "ICE_SHEAR", "SUCCESS", "The courier crossed the shear.", 55,
                "encounter:" + encounterId);
        var encounterTarget = WorldObserverNavigation.resolve(encounterEntry, registry, passive, natural, civil);
        require(encounterTarget.kind() == WorldObserverNavigation.TargetKind.ENCOUNTER,
                "Encounter did not resolve to an encounter record.");
        require(encounterTarget.anchor().kind() == WorldObserverNavigation.TargetKind.VESSEL,
                "Encounter did not anchor to its vessel.");
        requireContains(WorldObserverRecordInspector.render(encounterTarget, passive, natural, civil),
                "minor hull strain", "Encounter record lost its durable narrative.");

        WorldObserverTimeline.Entry missionEntry = new WorldObserverTimeline.Entry(
                52L, "MISSION", "MISSION", missionId.toString(), "Courier Nav 1",
                "TRADE · ACTIVE", "60%", "Alpha Station → Beta Trench", 20,
                "mission:" + missionId + ":52");
        var missionTarget = WorldObserverNavigation.resolve(missionEntry, registry, passive, natural, civil);
        require(missionTarget.kind() == WorldObserverNavigation.TargetKind.MISSION,
                "Mission did not resolve to a mission record.");
        require(missionTarget.anchor().kind() == WorldObserverNavigation.TargetKind.VESSEL,
                "Mission did not anchor to its assigned vessel.");
        requireContains(WorldObserverRecordInspector.render(missionTarget, passive, natural, civil),
                "Reward: 3600 credits", "Mission record lost contract evidence.");

        WorldObserverTimeline.Entry naturalEntry = new WorldObserverTimeline.Entry(
                52L, "NATURAL", "LOCATION", "Beta Trench", "Beta Trench",
                "ROCKFALL", "Severity 72", naturalEvent.summary(), 72, "natural:" + naturalEvent.eventId());
        var naturalTarget = WorldObserverNavigation.resolve(naturalEntry, registry, passive, natural, civil);
        require(naturalTarget.kind() == WorldObserverNavigation.TargetKind.NATURAL_EVENT,
                "Natural event did not resolve to a natural-event record.");
        require(naturalTarget.anchor().kind() == WorldObserverNavigation.TargetKind.LOCATION,
                "Natural event did not anchor to its map location.");
        require(naturalTarget.anchor().id().equals(betaId.toString()),
                "Natural event anchored to the wrong location.");
        requireContains(WorldObserverRecordInspector.render(naturalTarget, passive, natural, civil),
                "narrowed the approach", "Natural-event record lost its durable evidence.");

        System.out.println("Living world observer timeline navigation verification passed.");
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    private static void requireContains(String text, String expected, String message) {
        if (text == null || !text.contains(expected)) throw new IllegalStateException(message + " Missing: " + expected);
    }
}
