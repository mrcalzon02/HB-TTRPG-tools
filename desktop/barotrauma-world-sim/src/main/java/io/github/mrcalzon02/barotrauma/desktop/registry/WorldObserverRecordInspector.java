package io.github.mrcalzon02.barotrauma.desktop.registry;

import io.github.mrcalzon02.barotrauma.persistence.NaturalWorldAndFleetRegistry;
import io.github.mrcalzon02.barotrauma.persistence.PassiveWorldRegistry;

import java.util.Comparator;
import java.util.Objects;

/** Renders a single stable causal record selected from the observer timeline or overlays. */
public final class WorldObserverRecordInspector {
    private WorldObserverRecordInspector() { }

    public static String render(WorldObserverNavigation.Target target,
                                PassiveWorldRegistry.Snapshot passive,
                                NaturalWorldAndFleetRegistry.Snapshot natural,
                                WorldObserverCivilLayer.CivilSnapshot civil) {
        Objects.requireNonNull(target, "target");
        Objects.requireNonNull(passive, "passive");
        Objects.requireNonNull(natural, "natural");
        Objects.requireNonNull(civil, "civil");
        return switch (target.kind()) {
            case MISSION -> mission(target.id(), passive);
            case ENCOUNTER -> encounter(target.id(), passive);
            case FLEET_RESPONSE -> fleetResponse(target.id(), passive);
            case FREIGHT -> freight(target.id(), passive);
            case TREASURY -> treasury(target.id(), passive);
            case NATURAL_EVENT -> naturalEvent(target.id(), natural);
            case EXTRACTION -> extraction(target.id(), natural);
            case RESOURCE_SITE -> resource(target.id(), natural);
            case POPULATION -> population(target.id(), civil);
            case MIGRATION -> migration(target.id(), civil);
            case SETTLEMENT -> settlement(target.id(), civil);
            case CIVIL_EVENT -> civilEvent(target.id(), civil);
            default -> "This navigation target is represented by its live map dossier rather than a standalone record.\n";
        };
    }

    private static String mission(String id, PassiveWorldRegistry.Snapshot passive) {
        var row = passive.missions().stream().filter(candidate -> candidate.missionId().toString().equals(id))
                .findFirst().orElse(null);
        if (row == null) return missing("MISSION", id);
        StringBuilder out = new StringBuilder("MISSION / CONTRACT RECORD\n\n")
                .append("ID: ").append(row.missionId()).append("\n")
                .append("Type / state: ").append(row.type()).append(" / ").append(row.status()).append("\n")
                .append("Origin → target: ").append(value(row.origin())).append(" → ").append(value(row.target())).append("\n")
                .append("Assigned vessel: ").append(value(row.vessel())).append("\n")
                .append("Difficulty: ").append(row.difficulty()).append("\n")
                .append("Progress: ").append(row.progress()).append("%\n")
                .append("Reward: ").append(row.rewardCredits()).append(" credits\n")
                .append("Cargo units: ").append(row.cargoUnits()).append("\n")
                .append("Created / updated / completed ticks: ").append(row.createdTick()).append(" / ")
                .append(row.updatedTick()).append(" / ").append(value(row.completedTick())).append("\n");
        passive.freight().stream().filter(freight -> id.equals(freight.missionId()))
                .sorted(Comparator.comparingLong(PassiveWorldRegistry.FreightRow::updatedTick).reversed())
                .forEach(freight -> out.append("\nFREIGHT EFFECT\n")
                        .append(value(freight.itemName())).append(" ×").append(freight.quantity())
                        .append(" · ").append(freight.status()).append("\n")
                        .append(value(freight.sourceStation())).append(" → ").append(value(freight.destinationStation()))
                        .append(" · delivered tick ").append(value(freight.deliveredTick())).append("\n"));
        return out.toString();
    }

    private static String encounter(String id, PassiveWorldRegistry.Snapshot passive) {
        var row = passive.encounters().stream().filter(candidate -> candidate.encounterId().toString().equals(id))
                .findFirst().orElse(null);
        if (row == null) return missing("ENCOUNTER", id);
        return "ENCOUNTER / HAZARD REPORT\n\n"
                + "ID: " + row.encounterId() + "\n"
                + "Vessel: " + value(row.vesselName()) + "\n"
                + "Tick / canonical time: " + row.tickSequence() + " / " + value(row.canonicalTime()) + "\n"
                + "Hazard: " + value(row.hazardType()) + "\n"
                + "Challenge / roll / margin: " + row.challenge() + " / " + row.roll() + " / " + row.margin() + "\n"
                + "Outcome: " + value(row.outcome()) + "\n\n"
                + value(row.narrative()) + "\n";
    }

    private static String fleetResponse(String id, PassiveWorldRegistry.Snapshot passive) {
        var row = passive.fleetResponses().stream().filter(candidate -> candidate.operationId().equals(id))
                .findFirst().orElse(null);
        if (row == null) return missing("FLEET RESPONSE", id);
        StringBuilder out = new StringBuilder("FLEET RESPONSE OPERATION\n\n")
                .append("ID: ").append(row.operationId()).append("\n")
                .append("Type / status / phase: ").append(row.type()).append(" / ").append(row.status())
                .append(" / ").append(row.phase()).append("\n")
                .append("Responder: ").append(value(row.responderVesselName())).append("\n")
                .append("Casualty: ").append(value(row.distressedVesselName())).append("\n")
                .append("Origin: ").append(value(row.originStationName())).append("\n")
                .append("Target station/location: ").append(value(row.targetStationName())).append(" / ")
                .append(value(row.targetLocationName())).append("\n")
                .append("Progress / difficulty / attempt: ").append(row.progress()).append("% / ")
                .append(row.difficulty()).append(" / ").append(row.attemptNumber()).append("\n")
                .append("Required stores — steel/fuel/ammo/medical: ").append(row.sparePartsRequired()).append(" / ")
                .append(row.fuelRequired()).append(" / ").append(row.ammunitionRequired()).append(" / ")
                .append(row.medicalRequired()).append("\n")
                .append("Materials committed: ").append(row.materialsCommitted() ? "yes" : "no").append("\n")
                .append("Created/updated/completed: ").append(row.createdTick()).append(" / ")
                .append(row.updatedTick()).append(" / ").append(value(row.completedTick())).append("\n")
                .append("Outbound/scene/return/home: ").append(value(row.outboundStartedTick())).append(" / ")
                .append(value(row.arrivedTick())).append(" / ").append(value(row.returnStartedTick())).append(" / ")
                .append(value(row.responderReturnedTick())).append("\n\nRESPONSE LOG\n");
        passive.fleetResponseLogs().stream().filter(log -> id.equals(log.operationId()))
                .sorted(Comparator.comparingLong(PassiveWorldRegistry.FleetResponseLogRow::tickSequence))
                .forEach(log -> out.append("[Tick ").append(log.tickSequence()).append("] ")
                        .append(log.eventType()).append(" · ").append(log.summary()).append("\n"));
        out.append("\nTRANSIT LEGS\n");
        passive.fleetTransitLegs().stream().filter(leg -> id.equals(leg.operationId()))
                .sorted(Comparator.comparingLong(PassiveWorldRegistry.FleetTransitLegRow::startedTick))
                .forEach(leg -> out.append("• ").append(leg.legType()).append(" · ").append(leg.status())
                        .append(" · ").append(value(leg.startLocation())).append(" → ").append(value(leg.endLocation()))
                        .append(" · route ").append(leg.routeTicksRequired()).append(" tick(s)\n"));
        return out.toString();
    }

    private static String freight(String id, PassiveWorldRegistry.Snapshot passive) {
        var row = passive.freight().stream().filter(candidate -> candidate.lotId().equals(id)).findFirst().orElse(null);
        if (row == null) return missing("FREIGHT", id);
        return "FREIGHT MANIFEST\n\n"
                + "Lot: " + row.lotId() + "\n"
                + "Mission: " + value(row.missionId()) + "\n"
                + "Cargo: " + value(row.itemName()) + " ×" + row.quantity() + " · " + value(row.itemCategory()) + "\n"
                + "Status: " + row.status() + "\n"
                + "Source → destination: " + value(row.sourceStation()) + " → " + value(row.destinationStation()) + "\n"
                + "Carrier: " + value(row.npcVesselName()) + "\n"
                + "Created / updated / delivered: " + row.createdTick() + " / " + row.updatedTick() + " / "
                + value(row.deliveredTick()) + "\n";
    }

    private static String treasury(String id, PassiveWorldRegistry.Snapshot passive) {
        var row = passive.treasury().stream().filter(candidate -> candidate.transactionId().equals(id))
                .findFirst().orElse(null);
        if (row == null) return missing("TREASURY", id);
        return "TREASURY / ECONOMIC RECORD\n\n"
                + "Transaction: " + row.transactionId() + "\n"
                + "Station: " + value(row.stationName()) + "\n"
                + "Tick: " + row.tickSequence() + "\n"
                + "Category: " + row.category() + "\n"
                + "Credit delta: " + signed(row.creditsDelta()) + "\n"
                + "Counterparty: " + value(row.counterpartyType()) + " / " + value(row.counterpartyId()) + "\n\n"
                + value(row.memo()) + "\n";
    }

    private static String naturalEvent(String id, NaturalWorldAndFleetRegistry.Snapshot natural) {
        var row = natural.events().stream().filter(candidate -> candidate.eventId().equals(id)).findFirst().orElse(null);
        if (row == null) return missing("NATURAL EVENT", id);
        return "NATURAL WORLD EVENT\n\n"
                + "ID: " + row.eventId() + "\n"
                + "Location: " + row.locationName() + "\n"
                + "Tick: " + row.tickSequence() + "\n"
                + "Type / severity: " + row.eventType() + " / " + row.severity() + "\n\n"
                + row.summary() + "\n";
    }

    private static String extraction(String id, NaturalWorldAndFleetRegistry.Snapshot natural) {
        var row = natural.extractions().stream().filter(candidate -> candidate.extractionId().equals(id))
                .findFirst().orElse(null);
        if (row == null) return missing("RESOURCE EXTRACTION", id);
        return "RESOURCE EXTRACTION RECORD\n\n"
                + "ID: " + row.extractionId() + "\n"
                + "Tick / location: " + row.tickSequence() + " / " + row.locationName() + "\n"
                + "Resource: " + row.resourceType() + "\n"
                + "Quantity / credits: " + row.quantity() + " / " + row.creditsValue() + "\n"
                + "Vessel / station: " + value(row.vesselName()) + " / " + value(row.stationName()) + "\n"
                + "Remaining: " + row.remainingBefore() + " → " + row.remainingAfter() + "\n"
                + "Richness: " + row.richnessBefore() + " → " + row.richnessAfter() + "\n"
                + "Renewable: " + (row.renewable() ? "yes" : "no") + "\n"
                + "Ecological / geological impact: " + row.ecologicalImpact() + " / " + row.geologicalImpact() + "\n"
                + "Site / mission / freight: " + value(row.siteId()) + " / " + value(row.missionId()) + " / "
                + value(row.freightLotId()) + "\n";
    }

    private static String resource(String id, NaturalWorldAndFleetRegistry.Snapshot natural) {
        var row = natural.resources().stream().filter(candidate -> candidate.siteId().equals(id)).findFirst().orElse(null);
        if (row == null) return missing("RESOURCE SITE", id);
        return "NATURAL RESOURCE SITE\n\n"
                + "Site: " + row.siteId() + "\n"
                + "Location: " + row.locationName() + "\n"
                + "Resource / status: " + row.resourceType() + " / " + row.status() + "\n"
                + "Richness / accessibility: " + row.richness() + " / " + row.accessibility() + "\n"
                + "Remaining / capacity: " + row.remainingUnits() + " / " + row.carryingCapacity() + "\n"
                + "Harvest rate / recovery: " + row.harvestRate() + " / " + row.recoveryProgress() + "\n"
                + "Renewable: " + (row.renewable() ? "yes" : "no") + "\n"
                + "Extraction count: " + row.extractionCount() + "\n"
                + "Discovered / last tick: " + row.discoveredTick() + " / " + row.lastTick() + "\n";
    }

    private static String population(String id, WorldObserverCivilLayer.CivilSnapshot civil) {
        var row = civil.observation().populationLedgers().stream()
                .filter(candidate -> candidate.ledgerId().equals(id)).findFirst().orElse(null);
        if (row == null) return missing("POPULATION LEDGER", id);
        return "POPULATION ACCOUNTING RECORD\n\n"
                + "Ledger: " + row.ledgerId() + "\n"
                + "Station / tick: " + row.stationName() + " / " + row.tickSequence() + "\n"
                + "Population: " + row.beforeTotal() + " → " + row.afterTotal() + "\n"
                + "Births / deaths: " + row.births() + " / " + row.deaths() + "\n"
                + "Immigration / emigration: " + row.immigration() + " / " + row.emigration() + "\n"
                + "Disaster losses: " + row.disasterLosses() + "\n"
                + "Cause: " + value(row.primaryCause()) + "\n"
                + "Source: " + value(row.sourceEntityId()) + "\n"
                + "Reconciliation: " + value(row.reconciliationStatus()) + "\n\n"
                + value(row.summary()) + "\n";
    }

    private static String migration(String id, WorldObserverCivilLayer.CivilSnapshot civil) {
        var row = civil.migrations().stream().filter(candidate -> candidate.flowId().equals(id)).findFirst().orElse(null);
        if (row == null) return missing("MIGRATION", id);
        return "MIGRATION MANIFEST\n\n"
                + "Flow: " + row.flowId() + "\n"
                + "Kind / status / cause: " + row.flowKind() + " / " + row.status() + " / " + value(row.cause()) + "\n"
                + "Origin → destination: " + value(row.originLocation()) + " → " + value(row.destinationLocation()) + "\n"
                + "Population: " + row.quantity() + "\n"
                + "Embarked / arrived / returned: " + row.embarked() + " / " + row.arrived() + " / " + row.returned() + "\n"
                + "Losses / stranded: " + row.losses() + " / " + row.stranded() + "\n"
                + "Transport: " + value(row.transportName()) + "\n"
                + "Progress: " + row.progressTicks() + " / " + value(row.durationTicks()) + "\n"
                + "Created / updated / completed: " + row.createdTick() + " / " + row.updatedTick() + " / "
                + value(row.completedTick()) + "\n\n" + value(row.summary()) + "\n";
    }

    private static String settlement(String id, WorldObserverCivilLayer.CivilSnapshot civil) {
        var row = civil.settlements().stream().filter(candidate -> candidate.projectId().equals(id)).findFirst().orElse(null);
        if (row == null) return missing("SETTLEMENT", id);
        return "SETTLEMENT PROJECT RECORD\n\n"
                + "Project: " + row.projectId() + "\n"
                + "Kind / status: " + row.projectKind() + " / " + row.status() + "\n"
                + "Sponsor: " + value(row.sponsorFaction()) + "\n"
                + "Origin → target: " + value(row.originStationName()) + " → " + value(row.targetLocationName()) + "\n"
                + "Progress: " + row.progressPercent() + "%\n"
                + "Materials: " + row.committedMaterials() + " / " + row.requiredMaterials() + "\n"
                + "Supplies: " + row.committedSupplies() + " / " + row.requiredSupplies() + "\n"
                + "Population: " + row.committedPopulation() + " / " + row.requiredPopulation() + "\n"
                + "Transport: " + row.committedTransport() + " / " + row.requiredTransport() + "\n"
                + "Security: " + row.currentSecurity() + " / " + row.requiredSecurity() + "\n"
                + "Assigned transport: " + value(row.assignedTransportName()) + "\n"
                + "Created / updated / completed: " + row.createdTick() + " / " + row.updatedTick() + " / "
                + value(row.completedTick()) + "\n\n" + value(row.summary()) + "\n";
    }

    private static String civilEvent(String id, WorldObserverCivilLayer.CivilSnapshot civil) {
        String eventId = stripPrefix(id, "observation:");
        var row = civil.observation().events().stream().filter(candidate -> candidate.eventId().equals(eventId))
                .findFirst().orElse(null);
        if (row == null) return missing("CIVILIZATION EVENT", eventId);
        return "CIVILIZATION OBSERVATION EVENT\n\n"
                + "ID / tick: " + row.eventId() + " / " + row.tickSequence() + "\n"
                + "Entity: " + row.entityType() + " / " + row.entityId() + "\n"
                + "Category / cause: " + row.category() + " / " + value(row.primaryCause()) + "\n"
                + "Source: " + value(row.sourceEntityType()) + " / " + value(row.sourceEntityId()) + "\n"
                + "Magnitude / confidence: " + row.magnitude() + " / " + row.confidence() + "\n"
                + "Visibility: " + row.visibility() + "\n\n" + value(row.summary()) + "\n";
    }

    private static String missing(String type, String id) {
        return type + " RECORD\n\nThe selected committed record is no longer present in the current observer snapshot.\nID: "
                + value(id) + "\n";
    }

    private static String stripPrefix(String value, String prefix) {
        return value != null && value.startsWith(prefix) ? value.substring(prefix.length()) : value;
    }

    private static String signed(int value) { return value > 0 ? "+" + value : Integer.toString(value); }
    private static String value(Object value) { return value == null || value.toString().isBlank() ? "—" : value.toString(); }
}
