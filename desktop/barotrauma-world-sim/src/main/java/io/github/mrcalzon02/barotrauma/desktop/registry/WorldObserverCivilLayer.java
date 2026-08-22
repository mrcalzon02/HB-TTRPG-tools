package io.github.mrcalzon02.barotrauma.desktop.registry;

import io.github.mrcalzon02.barotrauma.observation.ObservationRegistry;
import io.github.mrcalzon02.barotrauma.observation.ObservationRegistry.CreaturePopulationRow;
import io.github.mrcalzon02.barotrauma.observation.ObservationRegistry.FactionPresenceRow;
import io.github.mrcalzon02.barotrauma.observation.ObservationRegistry.MigrationFlowRow;
import io.github.mrcalzon02.barotrauma.observation.ObservationRegistry.NpcPopulationRow;
import io.github.mrcalzon02.barotrauma.observation.ObservationRegistry.PopulationLedgerRow;
import io.github.mrcalzon02.barotrauma.observation.ObservationRegistry.SettlementProjectRow;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Read-only presentation model for population, migration, settlement, faction, creature, and institutional activity.
 * It reuses query-only registries and never owns simulation mutation.
 */
public final class WorldObserverCivilLayer {
    private static final int QUERY_LIMIT = 2_000;
    private static final int MAX_LEDGER_ROWS = 12;
    private static final int MAX_FLOW_ROWS = 12;
    private static final int MAX_SETTLEMENT_ROWS = 10;
    private static final int MAX_CREATURE_ROWS = 10;
    private static final int MAX_FACTION_ROWS = 10;

    private WorldObserverCivilLayer() { }

    public static CivilSnapshot load(WorldPaths world) throws Exception {
        Objects.requireNonNull(world, "world");
        return new CivilSnapshot(
                ObservationRegistry.load(world),
                ObservationRegistry.migrationFlows(world, -1, QUERY_LIMIT),
                ObservationRegistry.settlementProjects(world, -1, QUERY_LIMIT),
                WorldObserverInstitutionalLayer.load(world));
    }

    public static String world(CivilSnapshot civil) {
        Objects.requireNonNull(civil, "civil");
        var summary = civil.observation().summary();
        long activeMigrations = civil.migrations().stream()
                .filter(row -> !List.of("COMPLETE", "FAILED", "CANCELLED").contains(row.status())).count();
        long activeSettlements = civil.settlements().stream()
                .filter(row -> !List.of("COMPLETE", "FAILED", "CANCELLED").contains(row.status())).count();
        long populationStress = civil.observation().npcPopulations().stream()
                .filter(WorldObserverCivilLayer::populationUnderPressure).count();
        long creaturePressureZones = civil.observation().creaturePopulations().stream()
                .filter(row -> creaturePressure(row) >= 50).map(CreaturePopulationRow::locationName).distinct().count();

        String base = "CIVILIZATION / POPULATION LAYERS\n\n"
                + "Estimated NPC population: " + summary.npcPopulationTotal() + "\n"
                + "Station population records: " + summary.npcPopulations() + "\n"
                + "Population-pressure stations: " + populationStress + "\n"
                + "Active migration flows: " + activeMigrations + "\n"
                + "Active settlement projects: " + activeSettlements + "\n"
                + "Faction presence records: " + summary.factionPresences() + "\n"
                + "Estimated creatures: " + summary.creatureEstimatedTotal() + "\n"
                + "High creature-pressure locations: " + creaturePressureZones + "\n";
        return base + "\n" + WorldObserverInstitutionalLayer.world(civil.institutions());
    }

    public static String location(String locationName, CivilSnapshot civil) {
        Objects.requireNonNull(locationName, "locationName");
        Objects.requireNonNull(civil, "civil");
        StringBuilder out = new StringBuilder("CIVILIZATION / POPULATION EVIDENCE\n\n");

        NpcPopulationRow population = civil.observation().npcPopulations().stream()
                .filter(row -> locationName.equals(row.stationName())).findFirst().orElse(null);
        out.append("STATION POPULATION\n");
        if (population == null) {
            out.append("No resident NPC population record at this location.\n");
        } else {
            out.append("Total residents: ").append(population.totalPopulation()).append("\n")
                    .append("Civilians: ").append(population.civilians()).append("\n")
                    .append("Industrial / logistics: ").append(population.industrialWorkers()).append(" / ")
                    .append(population.logisticsWorkers()).append("\n")
                    .append("Security / medical / science: ").append(population.securityPersonnel()).append(" / ")
                    .append(population.medicalPersonnel()).append(" / ").append(population.scientificPersonnel()).append("\n")
                    .append("Temporary / refugees: ").append(population.temporaryResidents()).append(" / ")
                    .append(population.refugees()).append("\n")
                    .append("Housing / life support / employment: ").append(population.housingCapacity()).append(" / ")
                    .append(population.lifeSupportCapacity()).append(" / ").append(population.employmentCapacity()).append("\n")
                    .append("Morale: ").append(population.morale()).append("\n")
                    .append("Last population tick: ").append(population.lastTick()).append("\n");
        }

        List<PopulationLedgerRow> ledgers = civil.observation().populationLedgers().stream()
                .filter(row -> locationName.equals(row.stationName()))
                .sorted(Comparator.comparingLong(PopulationLedgerRow::tickSequence).reversed())
                .limit(MAX_LEDGER_ROWS).toList();
        out.append("\nPOPULATION LEDGER\n");
        if (ledgers.isEmpty()) out.append("No population-accounting changes recorded.\n");
        for (PopulationLedgerRow row : ledgers) {
            out.append("• [Tick ").append(row.tickSequence()).append("] ")
                    .append(row.beforeTotal()).append(" → ").append(row.afterTotal())
                    .append(" · ").append(value(row.primaryCause())).append("\n")
                    .append("  Births/deaths: ").append(row.births()).append(" / ").append(row.deaths())
                    .append(" · immigration/emigration: ").append(row.immigration()).append(" / ").append(row.emigration()).append("\n")
                    .append("  Disaster losses: ").append(row.disasterLosses())
                    .append(" · reconciliation ").append(value(row.reconciliationStatus())).append("\n")
                    .append("  ").append(value(row.summary())).append("\n");
        }

        List<MigrationFlowRow> migrations = civil.migrations().stream()
                .filter(row -> locationName.equals(row.originStation()) || locationName.equals(row.destinationStation())
                        || locationName.equals(row.originLocation()) || locationName.equals(row.destinationLocation()))
                .sorted(Comparator.comparingLong(MigrationFlowRow::updatedTick).reversed())
                .limit(MAX_FLOW_ROWS).toList();
        out.append("\nMIGRATION MANIFESTS\n");
        if (migrations.isEmpty()) out.append("No migration flows reference this location.\n");
        for (MigrationFlowRow row : migrations) appendMigration(out, row);

        List<SettlementProjectRow> settlements = civil.settlements().stream()
                .filter(row -> locationName.equals(row.originStationName()) || locationName.equals(row.targetStationName())
                        || locationName.equals(row.targetLocationName()))
                .sorted(Comparator.comparingLong(SettlementProjectRow::updatedTick).reversed())
                .limit(MAX_SETTLEMENT_ROWS).toList();
        out.append("\nSETTLEMENT PROJECTS\n");
        if (settlements.isEmpty()) out.append("No settlement projects reference this location.\n");
        for (SettlementProjectRow row : settlements) appendSettlement(out, row);

        List<FactionPresenceRow> factions = civil.observation().factionPresence().stream()
                .filter(row -> locationName.equals(row.locationName()))
                .sorted(Comparator.comparingInt(FactionPresenceRow::influence).reversed())
                .limit(MAX_FACTION_ROWS).toList();
        out.append("\nLEGACY FACTION PRESENCE EVIDENCE\n");
        if (factions.isEmpty()) out.append("No legacy faction-presence evidence recorded.\n");
        for (FactionPresenceRow row : factions) {
            out.append("• ").append(value(row.factionKey())).append(" · influence ").append(row.influence())
                    .append(" · ").append(value(row.presenceState())).append("\n")
                    .append("  Source: ").append(value(row.seedSource())).append(" · tick ").append(row.lastTick()).append("\n");
        }

        List<CreaturePopulationRow> creatures = civil.observation().creaturePopulations().stream()
                .filter(row -> locationName.equals(row.locationName()))
                .sorted(Comparator.comparingInt(WorldObserverCivilLayer::creaturePressure).reversed())
                .limit(MAX_CREATURE_ROWS).toList();
        out.append("\nCREATURE POPULATIONS\n");
        if (creatures.isEmpty()) out.append("No creature-population evidence recorded.\n");
        for (CreaturePopulationRow row : creatures) {
            out.append("• ").append(value(row.speciesKey())).append(" · ").append(value(row.populationClass()))
                    .append(" · estimate ").append(row.estimatedCount()).append("\n")
                    .append("  Biomass/health/food stress: ").append(row.biomass()).append(" / ")
                    .append(row.health()).append(" / ").append(row.foodStress()).append("\n")
                    .append("  Migration/territory/nest pressure: ").append(row.migrationPressure()).append(" / ")
                    .append(row.territoryPressure()).append(" / ").append(row.nestStrength()).append("\n");
        }

        out.append("\n").append(WorldObserverInstitutionalLayer.location(locationName, civil.institutions()));
        return out.toString();
    }

    public static Map<String, CivilSignal> signals(CivilSnapshot civil) {
        Objects.requireNonNull(civil, "civil");
        Map<String, MutableSignal> working = new LinkedHashMap<>();
        for (NpcPopulationRow row : civil.observation().npcPopulations()) {
            MutableSignal signal = working.computeIfAbsent(row.stationName(), ignored -> new MutableSignal());
            signal.population = safeInt(row.totalPopulation());
            signal.populationPressure = populationPressure(row);
            signal.morale = clamp(row.morale());
        }
        for (MigrationFlowRow row : civil.migrations()) {
            if (!List.of("COMPLETE", "FAILED", "CANCELLED").contains(row.status())) {
                int strength = clamp((int) Math.min(100, Math.max(10, row.quantity() / 5)));
                if (row.originLocation() != null && !row.originLocation().isBlank()) {
                    MutableSignal signal = working.computeIfAbsent(row.originLocation(), ignored -> new MutableSignal());
                    signal.migrationActivity = Math.max(signal.migrationActivity, strength);
                }
                if (row.destinationLocation() != null && !row.destinationLocation().isBlank()) {
                    MutableSignal signal = working.computeIfAbsent(row.destinationLocation(), ignored -> new MutableSignal());
                    signal.migrationActivity = Math.max(signal.migrationActivity, strength);
                }
            }
        }
        for (SettlementProjectRow row : civil.settlements()) {
            if (!List.of("COMPLETE", "FAILED", "CANCELLED").contains(row.status())
                    && row.targetLocationName() != null && !row.targetLocationName().isBlank()) {
                MutableSignal signal = working.computeIfAbsent(row.targetLocationName(), ignored -> new MutableSignal());
                signal.settlementActivity = Math.max(signal.settlementActivity,
                        clamp(Math.max(20, 100 - row.progressPercent())));
            }
        }
        for (FactionPresenceRow row : civil.observation().factionPresence()) {
            MutableSignal signal = working.computeIfAbsent(row.locationName(), ignored -> new MutableSignal());
            if (row.influence() > signal.dominantFactionInfluence) {
                signal.dominantFactionInfluence = clamp(row.influence());
                signal.dominantFaction = row.factionKey();
            }
        }
        // Schema-033+ station control is authoritative. Legacy faction-presence rows remain evidence only.
        for (var row : civil.institutions().politics()) {
            MutableSignal signal = working.computeIfAbsent(row.stationName(), ignored -> new MutableSignal());
            signal.dominantFaction = row.controllingMajorFaction();
            signal.dominantFactionInfluence = clamp(row.controlScore());
        }
        for (CreaturePopulationRow row : civil.observation().creaturePopulations()) {
            MutableSignal signal = working.computeIfAbsent(row.locationName(), ignored -> new MutableSignal());
            signal.creaturePressure = Math.max(signal.creaturePressure, creaturePressure(row));
        }
        Map<String, CivilSignal> result = new LinkedHashMap<>();
        working.forEach((name, signal) -> result.put(name, signal.freeze()));
        return Map.copyOf(result);
    }

    private static boolean populationUnderPressure(NpcPopulationRow row) {
        return populationPressure(row) >= 50;
    }

    private static int populationPressure(NpcPopulationRow row) {
        long total = row.totalPopulation();
        long minimumCapacity = Math.min(row.housingCapacity(), Math.min(row.lifeSupportCapacity(), row.employmentCapacity()));
        if (minimumCapacity <= 0) return total > 0 ? 100 : 0;
        double utilization = total / (double) minimumCapacity;
        int capacityPressure = clamp((int) Math.round((utilization - 0.70) * 180.0));
        int moralePressure = clamp((50 - row.morale()) * 2);
        int refugeePressure = total <= 0 ? 0 : clamp((int) Math.round(row.refugees() * 100.0 / total));
        return Math.max(capacityPressure, Math.max(moralePressure, refugeePressure));
    }

    private static int creaturePressure(CreaturePopulationRow row) {
        return clamp(Math.max(row.migrationPressure(), Math.max(row.territoryPressure(),
                Math.max(row.nestStrength(), (row.biomass() + row.foodStress()) / 2))));
    }

    private static void appendMigration(StringBuilder out, MigrationFlowRow row) {
        out.append("• ").append(value(row.flowKind())).append(" · ").append(value(row.status())).append("\n")
                .append("  ").append(value(row.originLocation())).append(" → ").append(value(row.destinationLocation())).append("\n")
                .append("  Population: ").append(row.quantity()).append(" · embarked ").append(row.embarked())
                .append(" · arrived ").append(row.arrived()).append(" · returned ").append(row.returned()).append("\n")
                .append("  Losses/stranded: ").append(row.losses()).append(" / ").append(row.stranded()).append("\n")
                .append("  Transport: ").append(value(row.transportName())).append(" · progress ")
                .append(row.progressTicks()).append('/').append(value(row.durationTicks())).append("\n")
                .append("  Cause: ").append(value(row.cause())).append("\n")
                .append("  ").append(value(row.summary())).append("\n");
    }

    private static void appendSettlement(StringBuilder out, SettlementProjectRow row) {
        out.append("• ").append(value(row.projectKind())).append(" · ").append(value(row.status()))
                .append(" · ").append(row.progressPercent()).append("%\n")
                .append("  Origin/target: ").append(value(row.originStationName())).append(" → ")
                .append(value(row.targetLocationName())).append("\n")
                .append("  Sponsor: ").append(value(row.sponsorFaction())).append(" · transport ")
                .append(value(row.assignedTransportName())).append("\n")
                .append("  Materials: ").append(row.committedMaterials()).append('/').append(row.requiredMaterials())
                .append(" · supplies ").append(row.committedSupplies()).append('/').append(row.requiredSupplies()).append("\n")
                .append("  Population: ").append(row.committedPopulation()).append('/').append(row.requiredPopulation())
                .append(" · transport ").append(row.committedTransport()).append('/').append(row.requiredTransport()).append("\n")
                .append("  Security: ").append(row.currentSecurity()).append('/').append(row.requiredSecurity()).append("\n")
                .append("  ").append(value(row.summary())).append("\n");
    }

    private static int safeInt(long value) {
        return value > Integer.MAX_VALUE ? Integer.MAX_VALUE : (int) Math.max(0, value);
    }

    private static int clamp(int value) {
        return Math.max(0, Math.min(100, value));
    }

    private static String value(Object value) {
        return value == null || value.toString().isBlank() ? "—" : value.toString();
    }

    public record CivilSnapshot(ObservationRegistry.Snapshot observation,
                                List<MigrationFlowRow> migrations,
                                List<SettlementProjectRow> settlements,
                                WorldObserverInstitutionalLayer.InstitutionalSnapshot institutions) {
        public CivilSnapshot {
            Objects.requireNonNull(observation, "observation");
            migrations = List.copyOf(migrations);
            settlements = List.copyOf(settlements);
            institutions = Objects.requireNonNull(institutions, "institutions");
        }

        /** Compatibility constructor for presentation-only fixtures predating institutional projection. */
        public CivilSnapshot(ObservationRegistry.Snapshot observation,
                             List<MigrationFlowRow> migrations,
                             List<SettlementProjectRow> settlements) {
            this(observation, migrations, settlements, WorldObserverInstitutionalLayer.InstitutionalSnapshot.empty());
        }
    }

    public record CivilSignal(int population, int populationPressure, int morale, int migrationActivity,
                              int settlementActivity, String dominantFaction, int dominantFactionInfluence,
                              int creaturePressure) { }

    private static final class MutableSignal {
        int population;
        int populationPressure;
        int morale;
        int migrationActivity;
        int settlementActivity;
        String dominantFaction;
        int dominantFactionInfluence;
        int creaturePressure;

        CivilSignal freeze() {
            return new CivilSignal(population, populationPressure, morale, migrationActivity, settlementActivity,
                    dominantFaction, dominantFactionInfluence, creaturePressure);
        }
    }
}
