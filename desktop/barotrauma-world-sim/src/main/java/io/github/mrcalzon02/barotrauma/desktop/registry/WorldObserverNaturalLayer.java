package io.github.mrcalzon02.barotrauma.desktop.registry;

import io.github.mrcalzon02.barotrauma.persistence.NaturalWorldAndFleetRegistry;
import io.github.mrcalzon02.barotrauma.persistence.NaturalWorldAndFleetRegistry.EcologyRow;
import io.github.mrcalzon02.barotrauma.persistence.NaturalWorldAndFleetRegistry.EventRow;
import io.github.mrcalzon02.barotrauma.persistence.NaturalWorldAndFleetRegistry.ExtractionRow;
import io.github.mrcalzon02.barotrauma.persistence.NaturalWorldAndFleetRegistry.GeologyRow;
import io.github.mrcalzon02.barotrauma.persistence.NaturalWorldAndFleetRegistry.ResourceRow;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Pure presentation model for the observer's ecology, geology, resource, and natural-event layers.
 * It contains no mutation path; every value is derived from committed natural-world evidence.
 */
public final class WorldObserverNaturalLayer {
    private static final int MAX_RESOURCE_ROWS = 12;
    private static final int MAX_EVENT_ROWS = 14;
    private static final int MAX_EXTRACTION_ROWS = 10;

    private WorldObserverNaturalLayer() { }

    public static String world(NaturalWorldAndFleetRegistry.Snapshot natural) {
        Objects.requireNonNull(natural, "natural");
        var summary = natural.summary();
        return "NATURAL WORLD LAYERS\n\n"
                + "Ecology locations: " + summary.locations() + "\n"
                + "Active algal blooms: " + summary.activeBlooms() + "\n"
                + "Predator migration zones: " + summary.predatorMigrationZones() + "\n"
                + "Geological hotspots: " + summary.geologicalHotspots() + "\n"
                + "Resource sites: " + summary.resourceSites() + "\n"
                + "Harvestable sites: " + summary.harvestableSites() + "\n"
                + "Dormant / depleted sites: " + summary.dormantSites() + " / " + summary.depletedSites() + "\n"
                + "Recorded extraction batches: " + summary.extractionBatches() + "\n"
                + "Extracted units: " + summary.extractedUnits() + "\n";
    }

    public static String location(String locationName, NaturalWorldAndFleetRegistry.Snapshot natural) {
        Objects.requireNonNull(locationName, "locationName");
        Objects.requireNonNull(natural, "natural");
        StringBuilder out = new StringBuilder();
        out.append("NATURAL WORLD EVIDENCE\n\n");

        EcologyRow ecology = natural.ecology().stream()
                .filter(row -> locationName.equals(row.locationName())).findFirst().orElse(null);
        out.append("ECOLOGY\n");
        if (ecology == null) {
            out.append("No ecology record for this location.\n");
        } else {
            out.append("Primary producers: ").append(ecology.primaryProducers()).append("\n")
                    .append("Algal bloom: ").append(ecology.algalBloom()).append("\n")
                    .append("Herbivores / predators / scavengers: ")
                    .append(ecology.herbivores()).append(" / ").append(ecology.predators()).append(" / ")
                    .append(ecology.scavengers()).append("\n")
                    .append("Bioaccumulators: ").append(ecology.bioaccumulators()).append("\n")
                    .append("Nutrients: ").append(ecology.nutrients()).append("\n")
                    .append("Habitat integrity: ").append(ecology.habitatIntegrity()).append("\n")
                    .append("Migration pressure: ").append(ecology.migrationPressure()).append("\n")
                    .append("Last ecology tick: ").append(ecology.lastTick()).append("\n");
        }

        GeologyRow geology = natural.geology().stream()
                .filter(row -> locationName.equals(row.locationName())).findFirst().orElse(null);
        out.append("\nGEOLOGY\n");
        if (geology == null) {
            out.append("No geology record for this location.\n");
        } else {
            out.append("Tectonic stress: ").append(geology.tectonicStress()).append("\n")
                    .append("Hydrothermal activity: ").append(geology.hydrothermalActivity()).append("\n")
                    .append("Mineral exposure: ").append(geology.mineralExposure()).append("\n")
                    .append("Cave instability: ").append(geology.caveInstability()).append("\n")
                    .append("Sediment flux: ").append(geology.sedimentFlux()).append("\n")
                    .append("Last geology tick: ").append(geology.lastTick()).append("\n");
        }

        List<ResourceRow> resources = natural.resources().stream()
                .filter(row -> locationName.equals(row.locationName()))
                .sorted(Comparator.comparingInt(ResourceRow::remainingUnits).reversed())
                .limit(MAX_RESOURCE_ROWS).toList();
        out.append("\nRESOURCE SITES\n");
        if (resources.isEmpty()) out.append("No known natural resource sites.\n");
        for (ResourceRow row : resources) {
            out.append("• ").append(row.resourceType()).append(" · ").append(row.status())
                    .append(" · remaining ").append(row.remainingUnits()).append('/').append(row.carryingCapacity()).append("\n")
                    .append("  Richness/accessibility: ").append(row.richness()).append(" / ").append(row.accessibility())
                    .append(" · renewable ").append(row.renewable() ? "yes" : "no").append("\n")
                    .append("  Harvest rate: ").append(row.harvestRate()).append(" · recovery ")
                    .append(row.recoveryProgress()).append(" · extractions ").append(row.extractionCount()).append("\n")
                    .append("  Last harvest/dormant until: ").append(value(row.lastHarvestTick())).append(" / ")
                    .append(value(row.dormantUntilTick())).append("\n");
        }

        List<EventRow> events = natural.events().stream()
                .filter(row -> locationName.equals(row.locationName()))
                .sorted(Comparator.comparingLong(EventRow::tickSequence).reversed())
                .limit(MAX_EVENT_ROWS).toList();
        out.append("\nRECENT NATURAL EVENTS\n");
        if (events.isEmpty()) out.append("No natural-world events recorded.\n");
        for (EventRow row : events) {
            out.append("• [Tick ").append(row.tickSequence()).append("] ").append(row.eventType())
                    .append(" · severity ").append(row.severity()).append("\n")
                    .append("  ").append(row.summary()).append("\n");
        }

        List<ExtractionRow> extractions = natural.extractions().stream()
                .filter(row -> locationName.equals(row.locationName()))
                .sorted(Comparator.comparingLong(ExtractionRow::tickSequence).reversed())
                .limit(MAX_EXTRACTION_ROWS).toList();
        out.append("\nRESOURCE EXTRACTION LEDGER\n");
        if (extractions.isEmpty()) out.append("No extraction batches recorded.\n");
        for (ExtractionRow row : extractions) {
            out.append("• [Tick ").append(row.tickSequence()).append("] ").append(row.resourceType())
                    .append(" · ").append(row.quantity()).append(" unit(s) · ").append(row.creditsValue()).append(" credits\n")
                    .append("  Vessel/station: ").append(value(row.vesselName())).append(" / ")
                    .append(value(row.stationName())).append("\n")
                    .append("  Remaining: ").append(row.remainingBefore()).append(" → ").append(row.remainingAfter())
                    .append(" · richness ").append(row.richnessBefore()).append(" → ").append(row.richnessAfter()).append("\n")
                    .append("  Ecological/geological impact: ").append(row.ecologicalImpact()).append(" / ")
                    .append(row.geologicalImpact()).append("\n");
        }
        return out.toString();
    }

    /** Map-ready normalized signals for each location. */
    public static Map<String, LayerSignal> signals(NaturalWorldAndFleetRegistry.Snapshot natural) {
        Objects.requireNonNull(natural, "natural");
        Map<String, MutableSignal> working = new LinkedHashMap<>();
        for (EcologyRow row : natural.ecology()) {
            MutableSignal signal = working.computeIfAbsent(row.locationName(), ignored -> new MutableSignal());
            signal.ecologicalRisk = clamp(Math.max(row.migrationPressure(), Math.max(row.predators(), row.algalBloom())));
            signal.habitatIntegrity = clamp(row.habitatIntegrity());
        }
        for (GeologyRow row : natural.geology()) {
            MutableSignal signal = working.computeIfAbsent(row.locationName(), ignored -> new MutableSignal());
            signal.geologicalRisk = clamp(Math.max(row.tectonicStress(),
                    Math.max(row.hydrothermalActivity(), row.caveInstability())));
            signal.mineralOpportunity = clamp(row.mineralExposure());
        }
        for (ResourceRow row : natural.resources()) {
            MutableSignal signal = working.computeIfAbsent(row.locationName(), ignored -> new MutableSignal());
            if (!"DEPLETED".equals(row.status())) {
                signal.resourceOpportunity = Math.max(signal.resourceOpportunity,
                        clamp((row.richness() + row.accessibility()) / 2));
            }
        }
        for (EventRow row : natural.events()) {
            MutableSignal signal = working.computeIfAbsent(row.locationName(), ignored -> new MutableSignal());
            signal.eventSeverity = Math.max(signal.eventSeverity, clamp(row.severity()));
        }
        Map<String, LayerSignal> result = new LinkedHashMap<>();
        working.forEach((location, signal) -> result.put(location, signal.freeze()));
        return Map.copyOf(result);
    }

    private static int clamp(int value) {
        return Math.max(0, Math.min(100, value));
    }

    private static String value(Object value) {
        return value == null ? "—" : value.toString();
    }

    public record LayerSignal(int ecologicalRisk, int habitatIntegrity, int geologicalRisk,
                              int mineralOpportunity, int resourceOpportunity, int eventSeverity) {
        public int overallHazard() {
            return Math.max(eventSeverity, Math.max(ecologicalRisk, geologicalRisk));
        }

        public int overallOpportunity() {
            return Math.max(mineralOpportunity, resourceOpportunity);
        }
    }

    private static final class MutableSignal {
        int ecologicalRisk;
        int habitatIntegrity;
        int geologicalRisk;
        int mineralOpportunity;
        int resourceOpportunity;
        int eventSeverity;

        LayerSignal freeze() {
            return new LayerSignal(ecologicalRisk, habitatIntegrity, geologicalRisk,
                    mineralOpportunity, resourceOpportunity, eventSeverity);
        }
    }
}
