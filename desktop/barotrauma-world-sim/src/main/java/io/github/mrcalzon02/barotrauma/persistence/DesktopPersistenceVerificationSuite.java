package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.assets.BarotraumaAssetCatalogue;
import io.github.mrcalzon02.barotrauma.assets.BarotraumaDonorAssets;
import io.github.mrcalzon02.barotrauma.assets.PackagedFallbackAssetVerification;
import io.github.mrcalzon02.barotrauma.observation.ObservationContractVerification;
import io.github.mrcalzon02.barotrauma.simulation.DeterministicSimulationClock;
import io.github.mrcalzon02.barotrauma.simulation.PersistentSimulationSession;
import io.github.mrcalzon02.barotrauma.simulation.SimulationCommandExecutor;
import io.github.mrcalzon02.barotrauma.simulation.TransitResolutionEngine;

/** Runs the complete dependency-ordered desktop persistence, installation, and simulation-contract chain. */
public final class DesktopPersistenceVerificationSuite {

    private DesktopPersistenceVerificationSuite() { }

    public static void verifyContract() throws Exception {
        BarotraumaDonorAssets.verifyContract();
        PackagedFallbackAssetVerification.verifyContract();
        BarotraumaAssetCatalogue.verifyContract();
        ObservationContractVerification.verifyContract();
        RecursiveSqliteDriver.verifyContract();
        WorldStorageContracts.verifyContract();
        WorldDatabaseMigrations.verifyContract();
        AcceptedImportTransaction.verifyContract();
        VesselSnapshotTransaction.verifyContract();
        WorldMapRegistry.verifyContract();
        DeterministicSimulationClock.verifyContract();
        SimulationCommandExecutor.verifyContract();
        SimulationCheckpointStore.verifyContract();
        PersistentSimulationSession.verifyContract();
        TransitResolutionEngine.verifyContract();
        PassiveWorldSimulationVerification.verifyContract();
        StationLogisticsVerification.verifyContract();
        StationCivilizationVerification.verifyContract();
        FleetRecoveryAndNaturalWorldVerification.verifyContract();
        NaturalResourceHarvestingVerification.verifyContract();
    }

    public static void main(String[] args) throws Exception {
        if (args.length == 1 && args[0].equals("--verify")) {
            verifyContract();
            System.out.println("Complete Barotrauma donor discovery, atlas-aware semantic asset catalogue, procedural and packaged fallbacks, observation vocabulary and invariants, persistence, recursive SQLite trigger, passive-world, station consumption, civilization frontier, fleet response transit, towing return, ecology, geology, finite resource harvesting, renewable recovery, logistics, player transit, NPC, research, encounter, and recovery contracts passed.");
            return;
        }
        System.err.println("Usage: DesktopPersistenceVerificationSuite --verify");
        System.exit(2);
    }
}
