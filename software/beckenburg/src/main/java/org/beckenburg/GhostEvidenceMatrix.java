package org.beckenburg;

import java.util.Arrays;
import java.util.List;
import java.util.Objects;

/**
 * Player-facing evidence matrix for the all 23 Beckenburg ghosts, including ten Ancient variants.
 *
 * Reads live EMF/thermal/writing/UV/visibility rules. The seven additional
 * equipment phenomena are now available to the LAN host as observed outputs.
 * The matrix is a deduction reference: it NEVER certifies player readings.
 */
public final class GhostEvidenceMatrix {
    private GhostEvidenceMatrix() { }

    public record Row(GhostIdentity.Type type,
                      GhostFieldGuide.Clue emf,
                      GhostFieldGuide.Clue temperature,
                      List<GhostWriting.Style> writing,
                      boolean uv,
                      GhostTraits.Sight optical,
                      List<EquipmentRegistry.Evidence> future,
                      GhostIdentity.Rite rite,
                      GhostIdentity.Behavior behavior) {
        public Row {
            Objects.requireNonNull(type);Objects.requireNonNull(emf);
            Objects.requireNonNull(temperature);Objects.requireNonNull(optical);
            Objects.requireNonNull(rite);Objects.requireNonNull(behavior);
            writing=List.copyOf(writing);
            future=List.copyOf(future);
        }
    }
    /** Eligible species for each extra observation. A sensor returns readings
     * only for a recent real host ghost event in its detection footprint.
     */
    private static List<EquipmentRegistry.Evidence> future(GhostIdentity.Type ghost) {
        return switch(ghost) {
            case POSSESSIVE -> List.of(EquipmentRegistry.Evidence.OBJECT_IMPRINT,
                EquipmentRegistry.Evidence.ECTOPLASM);
            case POLTERGEIST -> List.of(EquipmentRegistry.Evidence.SEISMIC_IMPACT,
                EquipmentRegistry.Evidence.OBJECT_IMPRINT);
            case DEMON -> List.of(EquipmentRegistry.Evidence.RESONANCE,
                EquipmentRegistry.Evidence.ATMOSPHERIC_REVERSAL);
            case YOKAI -> List.of(EquipmentRegistry.Evidence.RESONANCE,
                EquipmentRegistry.Evidence.SEISMIC_IMPACT);
            case BANSHEE -> List.of(EquipmentRegistry.Evidence.ECTOPLASM,
                EquipmentRegistry.Evidence.RESONANCE);
            case WRAITH -> List.of(EquipmentRegistry.Evidence.STRUCTURED_LIGHT,
                EquipmentRegistry.Evidence.ATMOSPHERIC_REVERSAL);
            case SHADE -> List.of(EquipmentRegistry.Evidence.SPECTRAL_SHADOW,
                EquipmentRegistry.Evidence.ATMOSPHERIC_REVERSAL);
            case SPECTER -> List.of(EquipmentRegistry.Evidence.SPECTRAL_SHADOW,
                EquipmentRegistry.Evidence.RESONANCE);
            case SPIRIT -> List.of(EquipmentRegistry.Evidence.OBJECT_IMPRINT,
                EquipmentRegistry.Evidence.SEISMIC_IMPACT);
            case HANTU -> List.of(EquipmentRegistry.Evidence.ATMOSPHERIC_REVERSAL,
                EquipmentRegistry.Evidence.ECTOPLASM);
            case DEVIL -> List.of(EquipmentRegistry.Evidence.RESONANCE,
                EquipmentRegistry.Evidence.OBJECT_IMPRINT);
            case MIMIC -> List.of(EquipmentRegistry.Evidence.OBJECT_IMPRINT,
                EquipmentRegistry.Evidence.RESONANCE);
            case TWINS -> List.of(EquipmentRegistry.Evidence.SEISMIC_IMPACT,
                EquipmentRegistry.Evidence.RESONANCE);
            case ANCIENT_POSSESSIVE -> List.of(EquipmentRegistry.Evidence.ECTOPLASM,
                EquipmentRegistry.Evidence.SPECTRAL_SHADOW,
                EquipmentRegistry.Evidence.OBJECT_IMPRINT);
            case ANCIENT_POLTERGEIST -> List.of(EquipmentRegistry.Evidence.SEISMIC_IMPACT,
                EquipmentRegistry.Evidence.STRUCTURED_LIGHT,
                EquipmentRegistry.Evidence.RESONANCE);
            case ANCIENT_DEMON -> List.of(EquipmentRegistry.Evidence.RESONANCE,
                EquipmentRegistry.Evidence.ATMOSPHERIC_REVERSAL,
                EquipmentRegistry.Evidence.ECTOPLASM);
            case ANCIENT_YOKAI -> List.of(EquipmentRegistry.Evidence.RESONANCE,
                EquipmentRegistry.Evidence.OBJECT_IMPRINT,
                EquipmentRegistry.Evidence.SEISMIC_IMPACT);
            case ANCIENT_BANSHEE -> List.of(EquipmentRegistry.Evidence.ECTOPLASM,
                EquipmentRegistry.Evidence.ATMOSPHERIC_REVERSAL,
                EquipmentRegistry.Evidence.SPECTRAL_SHADOW);
            case ANCIENT_WRAITH -> List.of(EquipmentRegistry.Evidence.STRUCTURED_LIGHT,
                EquipmentRegistry.Evidence.SPECTRAL_SHADOW,
                EquipmentRegistry.Evidence.ATMOSPHERIC_REVERSAL);
            case ANCIENT_SHADE -> List.of(EquipmentRegistry.Evidence.SPECTRAL_SHADOW,
                EquipmentRegistry.Evidence.OBJECT_IMPRINT,
                EquipmentRegistry.Evidence.ECTOPLASM);
            case ANCIENT_SPECTER -> List.of(EquipmentRegistry.Evidence.SPECTRAL_SHADOW,
                EquipmentRegistry.Evidence.RESONANCE,
                EquipmentRegistry.Evidence.STRUCTURED_LIGHT);
            case ANCIENT_HANTU -> List.of(EquipmentRegistry.Evidence.ATMOSPHERIC_REVERSAL,
                EquipmentRegistry.Evidence.ECTOPLASM,
                EquipmentRegistry.Evidence.SEISMIC_IMPACT);
            case ANCIENT_TWINS -> List.of(EquipmentRegistry.Evidence.SEISMIC_IMPACT,
                EquipmentRegistry.Evidence.OBJECT_IMPRINT,
                EquipmentRegistry.Evidence.RESONANCE);
        };
    }
    public static Row forGhost(GhostIdentity.Type type){
        Objects.requireNonNull(type);
        GhostTraits.Profile trait=GhostTraits.of(type);
        return new Row(type,
            switch(GhostEvidenceProfile.emfBand(type)){
                case HIGH->GhostFieldGuide.Clue.EMF_OVER_SIX;
                case LOW_MID->GhostFieldGuide.Clue.EMF_LOW_MID;
                case NONE->GhostFieldGuide.Clue.EMF_SUPPRESSION;
            },
            switch(GhostEvidenceProfile.thermal(type)){
                case COLD->GhostFieldGuide.Clue.EXTREME_COLD;
                case HOT->GhostFieldGuide.Clue.EXTREME_HEAT;
                case NONE->GhostFieldGuide.Clue.TEMPERATURE_NORMAL;
            },
            Arrays.asList(GhostEvidenceProfile.availableWriting(type)),
            trait.leavesUv(),trait.sight(),future(type),type.rite(),type.behavior());
    }
    /** All possible hard-evidence families, including the seven extra sensor
     * families. The actual contract may enable a subset. Seed is irrelevant on Easy.
     */
    public static java.util.EnumSet<HardEvidenceQuota.Family> hardEvidenceFor(
            GhostIdentity.Type type){
        return new HardEvidenceQuota(type,HardEvidenceQuota.Level.EASY,0).families();
    }
    public static List<Row> all(){
        return Arrays.stream(GhostIdentity.Type.values())
            .map(GhostEvidenceMatrix::forGhost).toList();
    }
}
