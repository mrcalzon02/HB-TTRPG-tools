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
        SettlementLifecycleSchemaVerification.verifyContract();
        SettlementProjectTransactionVerification.verifyContract();
        ObservationFoundationVerification.verifyContract();
        NpcPopulationAccountingVerification.verifyContract();
        NpcDemographicLifecycleVerification.verifyContract();
        NpcPopulationMigrationVerification.verifyContract();
        NpcPopulationMigrationEngineVerification.verifyContract();
        ObservationRegistryVerification.verifyContract();
        MigrationObservationRegistryVerification.verifyContract();
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
        StationCivilizationVerification.verifyContract();
        FleetRecoveryAndNaturalWorldVerification.verifyContract();
        NaturalResourceHarvestingVerification.verifyContract();
        StationCausalityVerification.verifyContract();
    }

    public static void main(String[] args) throws Exception {
        if (args.length == 1 && args[0].equals("--verify")) {
            verifyContract();
            System.out.println("Complete Barotrauma donor discovery, atlas-aware semantic asset catalogue, packaged 20-sheet scene atlas index with 120 approved backgrounds, packaged UI atlas slice index, 612 approved semantic UI atlas assets, 7 explicit rejections, and unified correction previews, local media catalog, procedural and packaged fallbacks, observation vocabulary, conserved NPC population accounting, schema-027 capacity-supported births, mortality, morale and demographic hysteresis, schema-028 transport-backed migration and evacuation foundation with deterministic pressure planning and transit synchronization, schema-029 guarded settlement project foundation and authoritative transaction lifecycle, query-only migration observations and conservation, persistence, recursive SQLite trigger, passive-world, station consumption, production, delivery, attack, recovery, frontier, population, allocation-backed faction planning, exact command provenance, enforced mutation explanation, time-gated NPC transit, fleet response transit, towing return, ecology, geology, finite resource harvesting, renewable recovery, logistics, player transit, NPC, research, encounter, and recovery contracts passed.");
            return;
        }
        System.err.println("Usage: DesktopPersistenceVerificationSuite --verify");
        System.exit(2);
    }
}
