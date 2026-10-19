package org.beckenburg;

import java.util.Arrays;
import java.util.List;
import java.util.Objects;

/**
 * Player-facing evidence matrix for the thirteen original Beckenburg ghosts.
 *
 * Reads live EMF/thermal/writing/UV/visibility rules rather than duplicating
 * them. Proposed instruments are catalog targets, NOT playable ghost events.
 * The matrix is a deduction reference; it NEVER verifies a player reading.
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
    /** Planned additional equipment must correspond to an actual authored world
     * event when implemented. These entries NEVER generate measurements by themselves.
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
    /** Complete live hard-evidence matrix, from the same host quota source
     * that chooses Easy/Medium/Death Wish slots. Seed is irrelevant on Easy.
     * Inactive or proposed future devices are deliberately excluded.
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
