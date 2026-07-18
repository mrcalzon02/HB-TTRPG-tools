package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.simulation.DeterministicSimulationClock;
import io.github.mrcalzon02.barotrauma.simulation.PersistentSimulationSession;
import io.github.mrcalzon02.barotrauma.simulation.SimulationCommandExecutor;
import io.github.mrcalzon02.barotrauma.simulation.TransitResolutionEngine;

/** Runs the complete dependency-ordered desktop persistence and simulation-contract chain. */
public final class DesktopPersistenceVerificationSuite {

    private DesktopPersistenceVerificationSuite() { }

    public static void verifyContract() throws Exception {
        SqliteWorldStore.verifyContract();
        AcceptedImportTransaction.verifyContract();
        VesselSnapshotTransaction.verifyContract();
        WorldMapRegistry.verifyContract();
        DeterministicSimulationClock.verifyContract();
        SimulationCommandExecutor.verifyContract();
        SimulationCheckpointStore.verifyContract();
        PersistentSimulationSession.verifyContract();
        TransitResolutionEngine.verifyContract();
        PassiveWorldSimulationVerification.verifyContract();
    }

    public static void main(String[] args) throws Exception {
        if (args.length == 1 && args[0].equals("--verify")) {
            verifyContract();
            System.out.println("Complete Barotrauma persistence, passive-world, transit, station, mission, NPC, research, encounter, and recovery contracts passed.");
            return;
        }
        System.err.println("Usage: DesktopPersistenceVerificationSuite --verify");
        System.exit(2);
    }
}
