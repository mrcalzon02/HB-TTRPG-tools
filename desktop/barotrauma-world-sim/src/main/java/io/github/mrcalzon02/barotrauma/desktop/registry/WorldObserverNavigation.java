package io.github.mrcalzon02.barotrauma.desktop.registry;

import io.github.mrcalzon02.barotrauma.persistence.NaturalWorldAndFleetRegistry;
import io.github.mrcalzon02.barotrauma.persistence.PassiveWorldRegistry;
import io.github.mrcalzon02.barotrauma.persistence.WorldMapRegistry;

import java.util.Objects;
import java.util.UUID;

/** Resolves timeline evidence into stable observer records and optional map anchors. */
public final class WorldObserverNavigation {
    private WorldObserverNavigation() { }

    public static Target resolve(WorldObserverTimeline.Entry entry,
                                 WorldMapRegistry.RegistrySnapshot registry,
                                 PassiveWorldRegistry.Snapshot passive,
                                 NaturalWorldAndFleetRegistry.Snapshot natural,
                                 WorldObserverCivilLayer.CivilSnapshot civil) {
        Objects.requireNonNull(entry, "entry");
        Objects.requireNonNull(registry, "registry");
        Objects.requireNonNull(passive, "passive");
        Objects.requireNonNull(natural, "natural");
        Objects.requireNonNull(civil, "civil");

        return switch (entry.category()) {
            case "VOYAGE" -> vesselTarget(entry.entityId(), entry.label(), TargetKind.VESSEL, registry, passive);
            case "ENCOUNTER" -> encounterTarget(entry, registry, passive);
            case "MISSION" -> missionTarget(entry.entityId(), registry, passive);
            case "FLEET_RESPONSE" -> fleetResponseTarget(entry.entityId(), registry, passive);
            case "FREIGHT" -> freightTarget(entry.entityId(), registry, passive);
            case "ECONOMY" -> treasuryTarget(entry.entityId(), entry.stableKey(), registry, passive);
            case "NATURAL" -> naturalEventTarget(entry, registry, natural);
            case "EXTRACTION" -> extractionTarget(entry, registry, natural);
            case "POPULATION" -> stationLocationTarget(entry.entityId(), entry.label(), TargetKind.POPULATION,
                    entry.stableKey(), registry);
            case "MIGRATION" -> migrationTarget(entry.entityId(), registry, civil);
            case "SETTLEMENT" -> settlementTarget(entry.entityId(), registry, civil);
            case "CIVILIZATION" -> civilizationTarget(entry, registry);
            default -> locationByName(entry.label(), TargetKind.LOCATION, entry.entityId(), registry)
                    .orElse(Target.world("World overview"));
        };
    }

    private static Target encounterTarget(WorldObserverTimeline.Entry entry,
                                          WorldMapRegistry.RegistrySnapshot registry,
                                          PassiveWorldRegistry.Snapshot passive) {
        Target anchor = vesselTarget(entry.entityId(), entry.label(), TargetKind.VESSEL, registry, passive);
        String recordId = stripPrefix(entry.stableKey(), "encounter:");
        return new Target(TargetKind.ENCOUNTER, recordId, entry.title(), anchor.anchor());
    }

    private static Target missionTarget(String missionId, WorldMapRegistry.RegistrySnapshot registry,
                                        PassiveWorldRegistry.Snapshot passive) {
        var mission = passive.missions().stream()
                .filter(row -> row.missionId().toString().equals(missionId)).findFirst().orElse(null);
        if (mission == null) return new Target(TargetKind.MISSION, missionId, "Mission", Anchor.none());
        var vessel = passive.vessels().stream().filter(row -> mission.missionId().equals(row.missionId()))
                .findFirst().orElse(null);
        Anchor anchor = vessel != null ? new Anchor(TargetKind.VESSEL, vessel.vesselId().toString(), vessel.name())
                : locationAnchor(mission.target(), registry);
        return new Target(TargetKind.MISSION, missionId, mission.type() + " mission", anchor);
    }

    private static Target fleetResponseTarget(String operationId, WorldMapRegistry.RegistrySnapshot registry,
                                              PassiveWorldRegistry.Snapshot passive) {
        var response = passive.fleetResponses().stream()
                .filter(row -> row.operationId().equals(operationId)).findFirst().orElse(null);
        if (response == null) return new Target(TargetKind.FLEET_RESPONSE, operationId, "Fleet response", Anchor.none());
        Anchor anchor;
        if (response.responderVesselId() != null) {
            anchor = new Anchor(TargetKind.VESSEL, response.responderVesselId(), value(response.responderVesselName()));
        } else {
            anchor = locationAnchor(response.targetLocationName(), registry);
        }
        return new Target(TargetKind.FLEET_RESPONSE, operationId,
                response.type() + " · " + value(response.targetLocationName()), anchor);
    }

    private static Target freightTarget(String lotId, WorldMapRegistry.RegistrySnapshot registry,
                                        PassiveWorldRegistry.Snapshot passive) {
        var freight = passive.freight().stream().filter(row -> row.lotId().equals(lotId)).findFirst().orElse(null);
        if (freight == null) return new Target(TargetKind.FREIGHT, lotId, "Freight lot", Anchor.none());
        Anchor anchor = freight.npcVesselId() != null
                ? new Anchor(TargetKind.VESSEL, freight.npcVesselId(), value(freight.npcVesselName()))
                : locationAnchor(freight.destinationStation(), registry);
        return new Target(TargetKind.FREIGHT, lotId, freight.itemName() + " freight", anchor);
    }

    private static Target treasuryTarget(String entityId, String stableKey,
                                         WorldMapRegistry.RegistrySnapshot registry,
                                         PassiveWorldRegistry.Snapshot passive) {
        String transactionId = stripPrefix(stableKey, "treasury:");
        var row = passive.treasury().stream().filter(candidate -> candidate.transactionId().equals(transactionId))
                .findFirst().orElse(null);
        Anchor anchor = row == null ? locationAnchor(entityId, registry) : locationAnchor(row.stationName(), registry);
        return new Target(TargetKind.TREASURY, transactionId,
                row == null ? "Treasury entry" : row.category() + " · " + value(row.stationName()), anchor);
    }

    private static Target naturalEventTarget(WorldObserverTimeline.Entry entry,
                                             WorldMapRegistry.RegistrySnapshot registry,
                                             NaturalWorldAndFleetRegistry.Snapshot natural) {
        String eventId = stripPrefix(entry.stableKey(), "natural:");
        var row = natural.events().stream().filter(candidate -> candidate.eventId().equals(eventId))
                .findFirst().orElse(null);
        String location = row == null ? entry.entityId() : row.locationName();
        return new Target(TargetKind.NATURAL_EVENT, eventId, entry.title(), locationAnchor(location, registry));
    }

    private static Target extractionTarget(WorldObserverTimeline.Entry entry,
                                           WorldMapRegistry.RegistrySnapshot registry,
                                           NaturalWorldAndFleetRegistry.Snapshot natural) {
        String extractionId = stripPrefix(entry.stableKey(), "extraction:");
        var row = natural.extractions().stream().filter(candidate -> candidate.extractionId().equals(extractionId))
                .findFirst().orElse(null);
        String location = row == null ? entry.entityId() : row.locationName();
        return new Target(TargetKind.EXTRACTION, extractionId, entry.title(), locationAnchor(location, registry));
    }

    private static Target migrationTarget(String flowId, WorldMapRegistry.RegistrySnapshot registry,
                                          WorldObserverCivilLayer.CivilSnapshot civil) {
        var row = civil.migrations().stream().filter(candidate -> candidate.flowId().equals(flowId))
                .findFirst().orElse(null);
        if (row == null) return new Target(TargetKind.MIGRATION, flowId, "Migration flow", Anchor.none());
        Anchor anchor = locationAnchor(first(row.destinationLocation(), row.originLocation()), registry);
        return new Target(TargetKind.MIGRATION, flowId,
                row.flowKind() + " · " + value(row.destinationLocation()), anchor);
    }

    private static Target settlementTarget(String projectId, WorldMapRegistry.RegistrySnapshot registry,
                                           WorldObserverCivilLayer.CivilSnapshot civil) {
        var row = civil.settlements().stream().filter(candidate -> candidate.projectId().equals(projectId))
                .findFirst().orElse(null);
        if (row == null) return new Target(TargetKind.SETTLEMENT, projectId, "Settlement project", Anchor.none());
        Anchor anchor = locationAnchor(first(row.targetLocationName(), row.targetStationName()), registry);
        return new Target(TargetKind.SETTLEMENT, projectId,
                row.projectKind() + " · " + value(row.targetLocationName()), anchor);
    }

    private static Target civilizationTarget(WorldObserverTimeline.Entry entry,
                                             WorldMapRegistry.RegistrySnapshot registry) {
        if ("LOCATION".equals(entry.entityType())) {
            var byId = registry.locations().stream()
                    .filter(row -> row.locationId().toString().equals(entry.entityId())
                            || value(row.sourceLocationId()).equals(entry.entityId()))
                    .findFirst();
            if (byId.isPresent()) {
                var row = byId.get();
                return new Target(TargetKind.CIVIL_EVENT, entry.stableKey(), entry.title(),
                        new Anchor(TargetKind.LOCATION, row.locationId().toString(), row.displayName()));
            }
        }
        return new Target(TargetKind.CIVIL_EVENT, entry.stableKey(), entry.title(),
                locationAnchor(entry.label(), registry));
    }

    private static Target stationLocationTarget(String stationId, String label, TargetKind recordKind,
                                                String recordId, WorldMapRegistry.RegistrySnapshot registry) {
        var station = registry.stations().stream().filter(row -> row.stationId().toString().equals(stationId))
                .findFirst().orElse(null);
        Anchor anchor = station == null ? locationAnchor(label, registry)
                : new Anchor(TargetKind.LOCATION, station.locationId().toString(), station.displayName());
        return new Target(recordKind, stripAfterColon(recordId), label, anchor);
    }

    private static Target vesselTarget(String vesselId, String label, TargetKind kind,
                                       WorldMapRegistry.RegistrySnapshot registry,
                                       PassiveWorldRegistry.Snapshot passive) {
        var vessel = passive.vessels().stream().filter(row -> row.vesselId().toString().equals(vesselId))
                .findFirst().orElse(null);
        if (vessel != null) {
            Anchor anchor = new Anchor(TargetKind.VESSEL, vessel.vesselId().toString(), vessel.name());
            return new Target(kind, vessel.vesselId().toString(), vessel.name(), anchor);
        }
        return new Target(kind, vesselId, label, Anchor.none());
    }

    private static java.util.Optional<Target> locationByName(String locationName, TargetKind kind, String recordId,
                                                            WorldMapRegistry.RegistrySnapshot registry) {
        if (locationName == null || locationName.isBlank()) return java.util.Optional.empty();
        return registry.locations().stream().filter(row -> locationName.equals(row.displayName()))
                .findFirst().map(row -> new Target(kind, recordId, locationName,
                        new Anchor(TargetKind.LOCATION, row.locationId().toString(), row.displayName())));
    }

    private static Anchor locationAnchor(String locationName, WorldMapRegistry.RegistrySnapshot registry) {
        if (locationName == null || locationName.isBlank()) return Anchor.none();
        return registry.locations().stream().filter(row -> locationName.equals(row.displayName()))
                .findFirst().map(row -> new Anchor(TargetKind.LOCATION, row.locationId().toString(), row.displayName()))
                .orElse(Anchor.none());
    }

    private static String stripPrefix(String value, String prefix) {
        if (value == null) return "";
        return value.startsWith(prefix) ? value.substring(prefix.length()) : value;
    }

    private static String stripAfterColon(String value) {
        if (value == null) return "";
        int first = value.indexOf(':');
        if (first < 0) return value;
        int second = value.indexOf(':', first + 1);
        return second < 0 ? value.substring(first + 1) : value.substring(first + 1, second);
    }

    private static String first(String... values) {
        for (String value : values) if (value != null && !value.isBlank()) return value;
        return null;
    }

    private static String value(Object value) { return value == null ? "" : value.toString(); }

    public enum TargetKind {
        WORLD,
        LOCATION,
        VESSEL,
        ROUTE,
        MISSION,
        ENCOUNTER,
        FLEET_RESPONSE,
        FREIGHT,
        TREASURY,
        NATURAL_EVENT,
        EXTRACTION,
        RESOURCE_SITE,
        POPULATION,
        MIGRATION,
        SETTLEMENT,
        CIVIL_EVENT
    }

    public record Anchor(TargetKind kind, String id, String label) {
        public Anchor {
            Objects.requireNonNull(kind, "kind");
            id = id == null ? "" : id;
            label = label == null ? "" : label;
        }
        static Anchor none() { return new Anchor(TargetKind.WORLD, "", ""); }
        public boolean present() { return kind != TargetKind.WORLD && !id.isBlank(); }
    }

    public record Target(TargetKind kind, String id, String label, Anchor anchor) {
        public Target {
            Objects.requireNonNull(kind, "kind");
            id = id == null ? "" : id;
            label = label == null ? "" : label;
            anchor = anchor == null ? Anchor.none() : anchor;
        }
        static Target world(String label) { return new Target(TargetKind.WORLD, "", label, Anchor.none()); }
    }
}
