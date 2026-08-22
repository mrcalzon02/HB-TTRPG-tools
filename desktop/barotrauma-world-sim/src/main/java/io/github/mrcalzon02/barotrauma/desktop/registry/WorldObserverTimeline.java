package io.github.mrcalzon02.barotrauma.desktop.registry;

import io.github.mrcalzon02.barotrauma.observation.ObservationRegistry;
import io.github.mrcalzon02.barotrauma.persistence.NaturalWorldAndFleetRegistry;
import io.github.mrcalzon02.barotrauma.persistence.PassiveWorldRegistry;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/** Builds a non-mutating chronological stream from committed observer evidence. */
public final class WorldObserverTimeline {
    private static final int DEFAULT_LIMIT = 80;

    private WorldObserverTimeline() { }

    public static List<Entry> build(PassiveWorldRegistry.Snapshot passive,
                                    NaturalWorldAndFleetRegistry.Snapshot natural,
                                    WorldObserverCivilLayer.CivilSnapshot civil) {
        Objects.requireNonNull(passive, "passive");
        Objects.requireNonNull(natural, "natural");
        Objects.requireNonNull(civil, "civil");
        List<Entry> entries = new ArrayList<>();

        for (var row : passive.voyageLogs()) {
            entries.add(new Entry(row.tickSequence(), "VOYAGE", "NPC_VESSEL", row.vesselId().toString(),
                    row.vesselName(), row.eventType(), row.summary(), row.details(), clamp(row.severity()),
                    "voyage:" + row.logId()));
        }
        for (var row : passive.encounters()) {
            entries.add(new Entry(row.tickSequence(), "ENCOUNTER", "NPC_VESSEL", row.vesselId().toString(),
                    row.vesselName(), row.hazardType(), row.outcome(), row.narrative(),
                    clamp(Math.max(0, row.challenge())), "encounter:" + row.encounterId()));
        }
        for (var row : passive.missions()) {
            long tick = row.completedTick() == null ? row.updatedTick() : row.completedTick();
            int severity = switch (row.status()) {
                case "FAILED" -> 70;
                case "ACTIVE", "ASSIGNED" -> Math.max(15, row.difficulty() / 2);
                default -> 10;
            };
            entries.add(new Entry(tick, "MISSION", "MISSION", row.missionId().toString(),
                    first(row.vessel(), row.target(), row.origin()), row.type() + " · " + row.status(),
                    row.progress() + "% · " + row.rewardCredits() + " credits",
                    value(row.origin()) + " → " + value(row.target()), clamp(severity),
                    "mission:" + row.missionId() + ':' + tick));
        }
        for (var row : passive.fleetResponseLogs()) {
            var response = passive.fleetResponses().stream()
                    .filter(candidate -> candidate.operationId().equals(row.operationId())).findFirst().orElse(null);
            String label = response == null ? row.operationId()
                    : first(response.responderVesselName(), response.distressedVesselName(), response.targetLocationName());
            entries.add(new Entry(row.tickSequence(), "FLEET_RESPONSE", "FLEET_RESPONSE", row.operationId(),
                    label, row.eventType(), row.summary(), row.summary(),
                    response == null ? 45 : clamp(response.difficulty()), "fleet:" + row.logId()));
        }
        for (var row : passive.freight()) {
            long tick = row.deliveredTick() == null ? row.updatedTick() : row.deliveredTick();
            String summary = row.quantity() + " × " + value(row.itemName()) + " · " + row.status();
            entries.add(new Entry(tick, "FREIGHT", "FREIGHT", row.lotId(),
                    first(row.npcVesselName(), row.destinationStation(), row.sourceStation()),
                    "Freight · " + row.status(), summary,
                    value(row.sourceStation()) + " → " + value(row.destinationStation()),
                    "LOST".equals(row.status()) ? 65 : 12, "freight:" + row.lotId()));
        }
        for (var row : passive.treasury()) {
            entries.add(new Entry(row.tickSequence(), "ECONOMY", "STATION", value(row.stationName()),
                    value(row.stationName()), row.category(), signed(row.creditsDelta()) + " credits",
                    row.memo(), row.creditsDelta() < 0 ? 35 : 15, "treasury:" + row.transactionId()));
        }
        for (var row : natural.events()) {
            entries.add(new Entry(row.tickSequence(), "NATURAL", "LOCATION", row.locationName(),
                    row.locationName(), row.eventType(), "Severity " + row.severity(), row.summary(),
                    clamp(row.severity()), "natural:" + row.eventId()));
        }
        for (var row : natural.extractions()) {
            int impact = clamp(Math.max(row.ecologicalImpact(), row.geologicalImpact()));
            entries.add(new Entry(row.tickSequence(), "EXTRACTION", "RESOURCE_EXTRACTION", row.extractionId(),
                    row.locationName(), row.resourceType(), row.quantity() + " unit(s) extracted",
                    value(row.vesselName()) + " · " + row.remainingBefore() + " → " + row.remainingAfter()
                            + " remaining · " + row.creditsValue() + " credits",
                    Math.max(10, impact), "extraction:" + row.extractionId()));
        }

        ObservationRegistry.Snapshot observation = civil.observation();
        for (var row : observation.events()) {
            entries.add(new Entry(row.tickSequence(), "CIVILIZATION", row.entityType(), row.entityId(),
                    row.entityId(), row.category(), row.primaryCause(), row.summary(),
                    clamp(Math.max(row.confidence(), safeMagnitude(row.magnitude()))), "observation:" + row.eventId()));
        }
        for (var row : observation.populationLedgers()) {
            long change = row.afterTotal() - row.beforeTotal();
            int severity = clamp((int) Math.min(100, Math.abs(change) / 5));
            entries.add(new Entry(row.tickSequence(), "POPULATION", "STATION", row.stationId(), row.stationName(),
                    row.primaryCause(), signed(change) + " residents", row.summary(), severity,
                    "population:" + row.ledgerId()));
        }
        for (var row : civil.migrations()) {
            int severity = clamp((int) Math.min(100, row.losses() * 3 + row.stranded() * 2
                    + Math.max(0, row.quantity() - row.arrived()) / 10));
            entries.add(new Entry(row.updatedTick(), "MIGRATION", "MIGRATION_FLOW", row.flowId(),
                    first(row.transportName(), row.destinationLocation(), row.originLocation()),
                    row.flowKind() + " · " + row.status(), row.quantity() + " people",
                    row.summary(), severity, "migration:" + row.flowId() + ':' + row.updatedTick()));
        }
        for (var row : civil.settlements()) {
            int severity = "FAILED".equals(row.status()) ? 80 : Math.max(10, 50 - row.progressPercent() / 2);
            entries.add(new Entry(row.updatedTick(), "SETTLEMENT", "SETTLEMENT_PROJECT", row.projectId(),
                    row.targetLocationName(), row.projectKind() + " · " + row.status(),
                    row.progressPercent() + "% complete", row.summary(), clamp(severity),
                    "settlement:" + row.projectId() + ':' + row.updatedTick()));
        }

        return entries.stream()
                .sorted(Comparator.comparingLong(Entry::tick).reversed()
                        .thenComparing(Entry::category)
                        .thenComparing(Entry::stableKey))
                .toList();
    }

    public static String render(PassiveWorldRegistry.Snapshot passive,
                                NaturalWorldAndFleetRegistry.Snapshot natural,
                                WorldObserverCivilLayer.CivilSnapshot civil) {
        return render(build(passive, natural, civil), DEFAULT_LIMIT);
    }

    public static String render(List<Entry> entries, int limit) {
        Objects.requireNonNull(entries, "entries");
        if (limit < 1) throw new IllegalArgumentException("Timeline limit must be positive.");
        StringBuilder out = new StringBuilder("RECENT WORLD TIMELINE\n\n");
        if (entries.isEmpty()) return out.append("No committed observer events recorded.\n").toString();
        entries.stream().limit(limit).forEach(entry -> out.append("[Tick ").append(entry.tick()).append("] ")
                .append(entry.category()).append(" · ").append(value(entry.label())).append("\n")
                .append("  ").append(value(entry.title())).append(" · ").append(value(entry.summary())).append("\n")
                .append("  ").append(value(entry.details())).append("\n")
                .append("  Severity: ").append(entry.severity()).append(" · evidence ")
                .append(entry.stableKey()).append("\n"));
        return out.toString();
    }

    private static int safeMagnitude(long magnitude) {
        return clamp((int) Math.min(100L, Math.abs(magnitude)));
    }

    private static int clamp(int value) { return Math.max(0, Math.min(100, value)); }

    private static String first(String... values) {
        for (String value : values) if (value != null && !value.isBlank()) return value;
        return "—";
    }

    private static String value(Object value) {
        return value == null || value.toString().isBlank() ? "—" : value.toString();
    }

    private static String signed(long value) { return value > 0 ? "+" + value : Long.toString(value); }

    public record Entry(long tick, String category, String entityType, String entityId, String label,
                        String title, String summary, String details, int severity, String stableKey) {
        public Entry {
            if (tick < 0) throw new IllegalArgumentException("Timeline tick cannot be negative.");
            category = value(category);
            entityType = value(entityType);
            entityId = value(entityId);
            label = value(label);
            title = value(title);
            summary = value(summary);
            details = value(details);
            severity = clamp(severity);
            stableKey = value(stableKey);
        }
    }
}
