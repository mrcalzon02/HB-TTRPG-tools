package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.simulation.DeterministicSimulationClock;
import io.github.mrcalzon02.barotrauma.simulation.SimulationCommandExecutor;

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
    }

    public static void main(String[] args) throws Exception {
        if (args.length == 1 && args[0].equals("--verify")) {
            verifyContract();
            System.out.println("Complete Barotrauma desktop persistence, clock, and single-writer command contracts passed.");
            return;
        }
        System.err.println("Usage: DesktopPersistenceVerificationSuite --verify");
        System.exit(2);
    }
}
