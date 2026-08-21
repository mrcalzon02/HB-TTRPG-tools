package io.github.mrcalzon02.barotrauma.desktop.registry;

import io.github.mrcalzon02.barotrauma.persistence.PassiveWorldRegistry;
import io.github.mrcalzon02.barotrauma.persistence.PassiveWorldRegistry.EncounterRow;
import io.github.mrcalzon02.barotrauma.persistence.PassiveWorldRegistry.MissionRow;
import io.github.mrcalzon02.barotrauma.persistence.PassiveWorldRegistry.StationRow;
import io.github.mrcalzon02.barotrauma.persistence.PassiveWorldRegistry.VesselRow;
import io.github.mrcalzon02.barotrauma.persistence.PassiveWorldRegistry.VoyageLogRow;
import io.github.mrcalzon02.barotrauma.persistence.WorldMapRegistry;
import io.github.mrcalzon02.barotrauma.persistence.WorldMapRegistry.LocationRow;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/** Formats durable simulation evidence as operator-facing living-world dossiers. */
public final class WorldObserverInspector {
    private static final int MAX_LOG_ROWS = 16;
    private static final int MAX_ENCOUNTER_ROWS = 12;
    private static final int MAX_MISSION_ROWS = 12;

    private WorldObserverInspector() { }

    public static String world(WorldMapRegistry.RegistrySnapshot registry, PassiveWorldRegistry.Snapshot passive,
                               String visualSource, int donorRoles, int fallbackRoles) {
        Objects.requireNonNull(registry, "registry");
        Objects.requireNonNull(passive, "passive");
        var summary = registry.summary();
        var configuration = passive.configuration();
        long activeVessels = passive.vessels().stream()
                .filter(vessel -> !"DOCKED".equals(vessel.status()) && !"LOST".equals(vessel.status()))
                .count();
        long damaged = passive.vessels().stream()
                .filter(vessel -> vessel.hull() < 40 || "DISABLED".equals(vessel.status()) || "LOST".equals(vessel.status()))
                .count();
        long activeMissions = passive.missions().stream()
                .filter(mission -> List.of("ACTIVE", "ASSIGNED", "AVAILABLE").contains(mission.status()))
                .count();

        return "LIVING EUROPA OBSERVER\n\n"
                + "World: " + value(summary.displayName()) + "\n"
                + "Master world: " + value(summary.masterWorldId()) + "\n"
                + "Canonical time: " + value(configuration.canonicalTime()) + "\n"
                + "Canonical tick: " + value(configuration.currentTickSequence()) + "\n"
                + "Passive Mode: " + (configuration.enabled() ? "ENABLED" : "PAUSED")
                + " · " + configuration.cadenceSeconds() + "s cadence"
                + " · " + configuration.ticksPerCycle() + " tick(s)/cycle\n\n"
                + "WORLD ACTIVITY\n"
                + "Locations: " + registry.locations().size() + "\n"
                + "Stations: " + registry.stations().size() + "\n"
                + "NPC vessels: " + passive.vessels().size() + "\n"
                + "Active routes/vessels: " + activeVessels + "\n"
                + "Damaged, disabled or lost: " + damaged + "\n"
                + "Open missions: " + activeMissions + "\n"
                + "Recorded encounters: " + passive.encounters().size() + "\n\n"
                + "VISUAL SOURCE\n" + value(visualSource) + "\n"
                + "Donor-backed roles: " + donorRoles + "\n"
                + "Procedural fallbacks: " + fallbackRoles + "\n\n"
                + "Click a submarine, station/location, or transit line to pin a live dossier. "
                + "The selected dossier follows that entity as Passive Mode advances.\n";
    }

    public static String vessel(VesselRow vessel, PassiveWorldRegistry.Snapshot passive) {
        Objects.requireNonNull(vessel, "vessel");
        Objects.requireNonNull(passive, "passive");
        StringBuilder out = new StringBuilder();
        out.append("NPC VESSEL DOSSIER\n\n")
                .append(vessel.name()).append("\n")
                .append("Role: ").append(value(vessel.role())).append("\n")
                .append("State: ").append(value(vessel.status())).append("\n")
                .append("Hull: ").append(vessel.hull()).append("%\n")
                .append("Supplies: ").append(vessel.supplies()).append("\n")
                .append("Cargo: ").append(vessel.cargo()).append("\n")
                .append("Current: ").append(value(vessel.currentLocation())).append("\n")
                .append("Destination: ").append(value(vessel.destinationLocation())).append("\n")
                .append("Route: ").append(vessel.routeProgress()).append('/').append(vessel.routeTicksRequired())
                .append(" (\").append(percent(vessel.routeProgress(), vessel.routeTicksRequired())).append("%)\n")
                .append("Base arrival tick: ").append(value(vessel.baseArrivalTick())).append("\n")
                .append("Revised arrival tick: ").append(value(vessel.scheduledArrivalTick())).append("\n")
                .append("Next incident tick: ").append(value(vessel.nextIncidentTick())).append("\n")
                .append("Incidents: ").append(value(vessel.incidentsResolved())).append('/')
                .append(value(vessel.plannedIncidents())).append("\n")
                .append("Accumulated delay: ").append(value(vessel.cumulativeDelayTicks())).append(" tick(s)\n")
                .append("Last simulation tick: ").append(vessel.lastTick()).append("\n\n")
                .append("CREW CAPABILITY\n")
                .append("Crew quality: ").append(vessel.crewQuality()).append("\n")
                .append("Navigation: ").append(vessel.navigation()).append("\n")
                .append("Engineering: ").append(vessel.engineering()).append("\n")
                .append("Combat: ").append(vessel.combat()).append("\n")
                .append("Mining: ").append(vessel.mining()).append("\n")
                .append("Research: ").append(vessel.research()).append("\n\n");

        MissionRow mission = mission(passive, vessel.missionId());
        out.append("CURRENT MISSION / CONTRACT\n");
        if (mission == null) {
            out.append("No ordinary mission assigned.\n");
        } else {
            appendMission(out, mission);
        }

        List<VoyageLogRow> logs = passive.voyageLogs().stream()
                .filter(row -> vessel.vesselId().equals(row.vesselId()))
                .sorted(Comparator.comparingLong(VoyageLogRow::tickSequence).reversed())
                .limit(MAX_LOG_ROWS).toList();
        out.append("\nVOYAGE DOCUMENTS\n");
        if (logs.isEmpty()) out.append("No voyage documents recorded.\n");
        for (VoyageLogRow log : logs) {
            out.append("[Tick ").append(log.tickSequence()).append("] ")
                    .append(value(log.eventType())).append(" · ").append(value(log.summary())).append("\n")
                    .append("  ").append(value(log.details())).append("\n");
            if (log.resolution() != null && !log.resolution().isBlank()) {
                out.append("  Resolution: ").append(log.resolution()).append("\n");
            }
            if (log.hullDelta() != 0 || log.suppliesDelta() != 0 || log.stationDelta() != 0) {
                out.append("  Effects: hull ").append(signed(log.hullDelta()))
                        .append(", supplies ").append(signed(log.suppliesDelta()))
                        .append(", station ").append(signed(log.stationDelta())).append("\n");
            }
        }

        List<EncounterRow> encounters = passive.encounters().stream()
                .filter(row -> vessel.vesselId().equals(row.vesselId()))
                .sorted(Comparator.comparingLong(EncounterRow::tickSequence).reversed())
                .limit(MAX_ENCOUNTER_ROWS).toList();
        out.append("\nENCOUNTER REPORTS\n");
        if (encounters.isEmpty()) out.append("No encounters recorded.\n");
        for (EncounterRow encounter : encounters) {
            out.append("[Tick ").append(encounter.tickSequence()).append("] ")
                    .append(value(encounter.hazardType())).append(" · ").append(value(encounter.outcome())).append("\n")
                    .append("  Challenge ").append(encounter.challenge()).append(", roll ").append(encounter.roll())
                    .append(", margin ").append(encounter.margin()).append("\n")
                    .append("  ").append(value(encounter.narrative())).append("\n");
        }
        return out.toString();
    }

    public static String route(VesselRow vessel, PassiveWorldRegistry.Snapshot passive) {
        Objects.requireNonNull(vessel, "vessel");
        Objects.requireNonNull(passive, "passive");
        StringBuilder out = new StringBuilder();
        out.append("TRANSIT ROUTE DOSSIER\n\n")
                .append(vessel.name()).append("\n")
                .append(value(vessel.currentLocation())).append("  →  ").append(value(vessel.destinationLocation())).append("\n")
                .append("Vessel state: ").append(value(vessel.status())).append("\n")
                .append("Progress: ").append(vessel.routeProgress()).append('/').append(vessel.routeTicksRequired())
                .append(" (\").append(percent(vessel.routeProgress(), vessel.routeTicksRequired())).append("%)\n")
                .append("Base arrival tick: ").append(value(vessel.baseArrivalTick())).append("\n")
                .append("Revised arrival tick: ").append(value(vessel.scheduledArrivalTick())).append("\n")
                .append("Accumulated delay: ").append(value(vessel.cumulativeDelayTicks())).append(" tick(s)\n")
                .append("Incidents resolved: ").append(value(vessel.incidentsResolved())).append('/')
                .append(value(vessel.plannedIncidents())).append("\n")
                .append("Next incident tick: ").append(value(vessel.nextIncidentTick())).append("\n")
                .append("Hull / supplies: ").append(vessel.hull()).append("% / ").append(vessel.supplies()).append("\n\n")
                .append("MISSION\n");
        MissionRow mission = mission(passive, vessel.missionId());
        if (mission == null) out.append("No ordinary mission assigned; route may be fleet response or repositioning.\n");
        else appendMission(out, mission);

        out.append("\nROUTE INCIDENT LEDGER\n");
        List<EncounterRow> encounters = passive.encounters().stream()
                .filter(row -> vessel.vesselId().equals(row.vesselId()))
                .sorted(Comparator.comparingLong(EncounterRow::tickSequence).reversed())
                .limit(MAX_ENCOUNTER_ROWS).toList();
        if (encounters.isEmpty()) out.append("No recorded transit incidents for this vessel.\n");
        for (EncounterRow encounter : encounters) {
            out.append("[Tick ").append(encounter.tickSequence()).append("] ")
                    .append(value(encounter.hazardType())).append(" · ").append(value(encounter.outcome())).append("\n")
                    .append("  ").append(value(encounter.narrative())).append("\n");
        }
        return out.toString();
    }

    public static String location(LocationRow location, WorldMapRegistry.RegistrySnapshot registry,
                                  PassiveWorldRegistry.Snapshot passive) {
        Objects.requireNonNull(location, "location");
        Objects.requireNonNull(registry, "registry");
        Objects.requireNonNull(passive, "passive");
        StringBuilder out = new StringBuilder();
        out.append(location.station() ? "STATION DOSSIER\n\n" : "LOCATION DOSSIER\n\n")
                .append(location.displayName()).append("\n")
                .append("Type: ").append(value(location.locationType())).append("\n")
                .append("Ring / level: ").append(location.ring()).append(" / ").append(location.locationLevel()).append("\n")
                .append("Biome: ").append(value(location.biome())).append("\n")
                .append("Faction: ").append(value(location.faction())).append("\n")
                .append("Source ID: ").append(value(location.sourceLocationId())).append("\n")
                .append("Map coordinates: ").append(value(location.mapX())).append(", ").append(value(location.mapY())).append("\n\n");

        StationRow station = passive.stations().stream()
                .filter(row -> location.displayName().equals(row.name()))
                .findFirst().orElse(null);
        out.append("LOCAL ECONOMY / CONDITION\n");
        if (station == null) {
            out.append("No station simulation state at this location.\n");
        } else {
            out.append("Status: ").append(value(station.status())).append("\n")
                    .append("Credits: ").append(station.credits()).append("\n")
                    .append("Supplies: ").append(station.supplies()).append("\n")
                    .append("Ore: ").append(station.ore()).append("\n")
                    .append("Industry: ").append(station.industry()).append("\n")
                    .append("Security: ").append(station.security()).append("\n")
                    .append("Integrity: ").append(station.integrity()).append("%\n")
                    .append("Threat: ").append(station.threat()).append("\n")
                    .append("Research: ").append(station.research()).append("\n")
                    .append("Last tick: ").append(station.lastTick()).append("\n");
        }

        List<VesselRow> traffic = passive.vessels().stream()
                .filter(vessel -> location.displayName().equals(vessel.currentLocation())
                        || location.displayName().equals(vessel.destinationLocation()))
                .toList();
        out.append("\nLOCAL / INBOUND TRAFFIC\n");
        if (traffic.isEmpty()) out.append("No tracked NPC traffic.\n");
        for (VesselRow vessel : traffic) {
            out.append("• ").append(vessel.name()).append(" · ").append(value(vessel.status()))
                    .append(" · ").append(value(vessel.currentLocation()));
            if (vessel.destinationLocation() != null) out.append(" → ").append(vessel.destinationLocation());
            out.append("\n");
        }

        List<MissionRow> missions = passive.missions().stream()
                .filter(mission -> location.displayName().equals(mission.origin())
                        || location.displayName().equals(mission.target()))
                .sorted(Comparator.comparingLong(MissionRow::updatedTick).reversed())
                .limit(MAX_MISSION_ROWS).toList();
        out.append("\nMISSION / TRADE DOCUMENTS\n");
        if (missions.isEmpty()) out.append("No mission records reference this location.\n");
        for (MissionRow mission : missions) appendMission(out, mission);
        return out.toString();
    }

    private static MissionRow mission(PassiveWorldRegistry.Snapshot passive, UUID missionId) {
        if (missionId == null) return null;
        return passive.missions().stream().filter(row -> missionId.equals(row.missionId())).findFirst().orElse(null);
    }

    private static void appendMission(StringBuilder out, MissionRow mission) {
        out.append("• ").append(value(mission.type())).append(" · ").append(value(mission.status())).append("\n")
                .append("  ").append(value(mission.origin())).append(" → ").append(value(mission.target())).append("\n")
                .append("  Vessel: ").append(value(mission.vessel())).append("\n")
                .append("  Progress: ").append(mission.progress()).append(" · difficulty ").append(mission.difficulty()).append("\n")
                .append("  Contract: ").append(mission.rewardCredits()).append(" credits · cargo ")
                .append(mission.cargoUnits()).append("\n")
                .append("  Created/updated/completed: ").append(mission.createdTick()).append(" / ")
                .append(mission.updatedTick()).append(" / ").append(value(mission.completedTick())).append("\n");
    }

    private static int percent(int progress, int required) {
        if (required <= 0) return 0;
        return (int) Math.round(WorldObserverProjection.routeFraction(progress, required) * 100.0);
    }

    private static String signed(int number) {
        return number > 0 ? "+" + number : Integer.toString(number);
    }

    private static String value(Object value) {
        return value == null ? "—" : value.toString();
    }
}
