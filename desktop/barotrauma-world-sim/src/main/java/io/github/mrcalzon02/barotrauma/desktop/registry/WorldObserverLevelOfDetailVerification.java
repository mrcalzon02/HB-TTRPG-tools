package io.github.mrcalzon02.barotrauma.desktop.registry;

/** Headless contract for readable label/marker density on very large observer maps. */
public final class WorldObserverLevelOfDetailVerification {
    private WorldObserverLevelOfDetailVerification() { }

    public static void main(String[] args) {
        require(WorldObserverLevelOfDetail.showLabel(0.40, true, true, 0),
                "Selected stations must remain labeled at minimum zoom.");
        require(!WorldObserverLevelOfDetail.showLabel(0.40, false, false, 100),
                "Generic locations must not flood minimum zoom with labels.");
        require(WorldObserverLevelOfDetail.showLabel(1.60, false, false, 0),
                "All labels must become available at close inspection zoom.");
        require(!WorldObserverLevelOfDetail.showGenericMarker(0.40, false, false, 20),
                "Unimportant generic markers must collapse at world scale.");
        require(WorldObserverLevelOfDetail.showGenericMarker(0.40, false, false, 80),
                "Important generic markers must remain visible at world scale.");

        var natural = new WorldObserverNaturalLayer.LayerSignal(82, 60, 44, 20, 35, 76);
        var civil = new WorldObserverCivilLayer.CivilSignal(2500, 58, 42, 66, 25,
                "Coalition", 71, 64);
        int importance = WorldObserverLevelOfDetail.importance(natural, civil);
        require(importance == 82, "Combined importance must preserve the strongest committed signal.");

        System.out.println("Living world observer level-of-detail verification passed.");
    }

    private static void require(boolean value, String message) {
        if (!value) throw new IllegalStateException(message);
    }
}
