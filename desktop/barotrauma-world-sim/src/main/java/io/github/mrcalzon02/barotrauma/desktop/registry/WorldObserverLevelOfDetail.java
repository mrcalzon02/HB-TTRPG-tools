package io.github.mrcalzon02.barotrauma.desktop.registry;

/** Pure level-of-detail policy for keeping large Europa maps readable across zoom levels. */
public final class WorldObserverLevelOfDetail {
    private WorldObserverLevelOfDetail() { }

    public static boolean showLabel(double zoom, boolean station, boolean selected, int importance) {
        if (selected) return true;
        int boundedImportance = Math.max(0, Math.min(100, importance));
        if (zoom >= 1.45) return true;
        if (zoom >= 1.05) return station || boundedImportance >= 35;
        if (zoom >= 0.78) return station ? boundedImportance >= 15 : boundedImportance >= 65;
        if (zoom >= 0.55) return station && boundedImportance >= 45;
        return station && boundedImportance >= 75;
    }

    public static boolean showGenericMarker(double zoom, boolean station, boolean selected, int importance) {
        if (selected || station || zoom >= 0.72) return true;
        if (zoom >= 0.50) return importance >= 25;
        return importance >= 55;
    }

    public static int importance(WorldObserverNaturalLayer.LayerSignal natural,
                                 WorldObserverCivilLayer.CivilSignal civil) {
        int result = 0;
        if (natural != null) {
            result = Math.max(result, natural.overallHazard());
            result = Math.max(result, natural.overallOpportunity());
        }
        if (civil != null) {
            result = Math.max(result, civil.populationPressure());
            result = Math.max(result, civil.migrationActivity());
            result = Math.max(result, civil.settlementActivity());
            result = Math.max(result, civil.dominantFactionInfluence());
            result = Math.max(result, civil.creaturePressure());
            if (civil.population() > 0) {
                int populationImportance = Math.min(100,
                        20 + (int) Math.round(Math.log10(Math.max(1, civil.population())) * 18.0));
                result = Math.max(result, populationImportance);
            }
        }
        return Math.max(0, Math.min(100, result));
    }
}
