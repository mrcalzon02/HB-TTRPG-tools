package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.assets.BarotraumaAssetCatalogue;
import io.github.mrcalzon02.barotrauma.assets.BarotraumaDonorAssets;
import io.github.mrcalzon02.barotrauma.assets.BarotraumaAssetCatalog;
import io.github.mrcalzon02.barotrauma.assets.PackagedFallbackAssetVerification;
import io.github.mrcalzon02.barotrauma.assets.SceneAtlasIndex;
import io.github.mrcalzon02.barotrauma.assets.SceneAtlasPreview;
import io.github.mrcalzon02.barotrauma.assets.UiAtlasSliceIndex;
import io.github.mrcalzon02.barotrauma.assets.UiAtlasImplementationPreview;
import io.github.mrcalzon02.barotrauma.assets.UiAtlasSemanticPreview;
import io.github.mrcalzon02.barotrauma.observation.MigrationObservationRegistryVerification;
import io.github.mrcalzon02.barotrauma.observation.ObservationContractVerification;
import io.github.mrcalzon02.barotrauma.observation.ObservationRegistryVerification;
import io.github.mrcalzon02.barotrauma.observation.SettlementContributionDispositionObservationRegistryVerification;
import io.github.mrcalzon02.barotrauma.observation.SettlementFoundingObservationRegistryVerification;
import io.github.mrcalzon02.barotrauma.observation.SettlementObservationRegistryVerification;
import io.github.mrcalzon02.barotrauma.simulation.DeterministicSimulationClock;
import io.github.mrcalzon02.barotrauma.simulation.NpcTransitScheduleEngine;
import io.github.mrcalzon02.barotrauma.simulation.PersistentSimulationSession;
import io.github.mrcalzon02.barotrauma.simulation.SimulationCommandExecutor;
import io.github.mrcalzon02.barotrauma.simulation.TransitResolutionEngine;

/** Runs the complete dependency-ordered desktop persistence, installation, and simulation-contract chain. */
public final class DesktopPersistenceVerificationSuite {

    private DesktopPersistenceVerificationSuite() { }

    public static void verifyContract() throws Exception {
        BarotraumaDonorAssets.verifyContract();
        BarotraumaAssetCatalog.verifyContract();
        PackagedFallbackAssetVerification.verifyContract();
        SceneAtlasIndex.verifyContract();
        SceneAtlasPreview.verifyContract();
        UiAtlasSliceIndex.verifyContract();
        UiAtlasImplementationPreview.verifyContract();
        UiAtlasSemanticPreview.verifyContract();
        BarotraumaAssetCatalogue.verifyContract();
        ObservationContractVerification.verifyContract();
        RecursiveSqliteDriver.verifyContract();
        WorldStorageContracts.verifyContract();
        WorldDatabaseMigrations.verifyContract();
        OrganizationFactionSchemaVerification.verifyContract();
        OrganizationOperationsSchemaVerification.verifyContract();
        DefaultWorldGeneratorVerification.verifyContract();
        SettlementLifecycleSchemaVerification.verifyContract();
        SettlementFoundingMigrationSchemaVerification.verifyContract();
        SettlementContributionDispositionSchemaVerification.verifyContract();
        SettlementPhysicalSupportHardeningSchemaVerification.verifyContract();
        SettlementProjectTransactionVerification.verifyContract();
        SettlementProjectContributionAuthorityVerification.verifyContract();
        SettlementContributionDispositionTransactionVerification.verifyContract();
        SettlementProjectEngineVerification.verifyContract();
        SettlementProjectConsequencesVerification.verifyContract();
        SettlementFoundingMigrationTransactionVerification.verifyContract();
        ObservationFoundationVerification.verifyContract();
        NpcPopulationAccountingVerification.verifyContract();
        NpcDemographicLifecycleVerification.verifyContract();
        NpcPopulationMigrationVerification.verifyContract();
        NpcPopulationMigrationEngineVerification.verifyContract();
        ObservationRegistryVerification.verifyContract();
        MigrationObservationRegistryVerification.verifyContract();
        SettlementObservationRegistryVerification.verifyContract();
        SettlementFoundingObservationRegistryVerification.verifyContract();
        SettlementContributionDispositionObservationRegistryVerification.verifyContract();
        AcceptedImportTransaction.verifyContract();
        VesselSnapshotTransaction.verifyContract();
        WorldMapRegistry.verifyContract();
        DeterministicSimulationClock.verifyContract();
        SimulationCommandExecutor.verifyContract();
        SimulationCheckpointStore.verifyContract();
        PersistentSimulationSession.verifyContract();
        TransitResolutionEngine.verifyContract();
        NpcTransitScheduleEngine.verifyContract();
        PassiveWorldSimulationVerification.verifyContract();
        StationLogisticsVerification.verifyContract();
        StationPopulationSeedVerification.verifyContract();
        StationCivilizationVerification.verifyContract();
        FleetRecoveryAndNaturalWorldVerification.verifyContract();
        NaturalResourceHarvestingVerification.verifyContract();
        StationCausalityVerification.verifyContract();
    }

    public static void main(String[] args) throws Exception {
        if (args.length == 1 && args[0].equals("--verify")) {
            verifyContract();
            System.out.println("Complete Barotrauma donor discovery, construction-time graphical desktop shell, current-schema default Europa world generation, atlas-aware semantic asset catalogue, packaged 20-sheet scene atlas index with 120 approved backgrounds, packaged UI atlas slice index, 612 approved semantic UI atlas assets, 7 explicit rejections, and unified correction previews, local media catalog, procedural and packaged fallbacks, observation vocabulary, conserved NPC population accounting, schema-027 capacity-supported births, mortality, morale and demographic hysteresis, schema-028 transport-backed migration and evacuation foundation with deterministic pressure planning and transit synchronization, schema-029 guarded settlement projects, schema-030 staged founding migration with exact cohort handoff and immutable generated population baselines, schema-031 exact returned, stranded, consumed and lost contribution disposition, schema-032 physical support source ownership and resource reuse guards, schema-033 sovereign factions, six-way internal doctrinal blocs, local civic organizations, construction firms, companies, trade bodies, banks, credit unions, insurers, unions, professional guilds, research institutes, medical networks, security contractors, shipping/logistics organizations, permanent sovereign headquarters, station control history, organization influence, relationships, and regional conflict-zone foundations, schema-034 active construction contracts, trade and labor delegations, credit/finance operations, diplomatic and influence activity, security assistance, relief, industrial investment, research grants, resource and salvage contracts, blockades, raids, durable station assets, institutional news, mission sponsorship, sustained station-control transfer, permanent-HQ immunity, and regional conflict escalation, authoritative transaction lifecycle, physical inventory, arrived-population and idle-vessel contribution reconciliation, deterministic security-gated progression, canonical founding, expansion, abandonment and reclamation consequences with rollback containment, query-only settlement projects, founding migrations, contribution dispositions, migration flows and conservation, persistence, recursive SQLite trigger, passive-world, station consumption, production, delivery, attack, recovery, frontier, population, allocation-backed faction planning, exact command provenance, enforced mutation explanation, time-gated NPC transit, fleet response transit, towing return, ecology, geology, finite resource harvesting, renewable recovery, logistics, player transit, NPC, research, encounter, and recovery contracts passed.");
            return;
        }
        System.err.println("Usage: DesktopPersistenceVerificationSuite --verify");
        System.exit(2);
    }
}
