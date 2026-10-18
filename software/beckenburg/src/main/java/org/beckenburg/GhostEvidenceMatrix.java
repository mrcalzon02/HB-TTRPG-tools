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
    private static List<EquipmentRegistry.Evidence> future(GhostIdentity.Type ghost) {
        return switch(ghost) {
            case POSSESSIVE -> List.of(EquipmentRegistry.Evidence.OBJECT_IMPRINT);
            case POLTERGEIST -> List.of(EquipmentRegistry.Evidence.SEISMIC_IMPACT);
            case DEMON -> List.of(EquipmentRegistry.Evidence.RESONANCE);
            case YOKAI -> List.of(EquipmentRegistry.Evidence.RESONANCE);
            case BANSHEE -> List.of(EquipmentRegistry.Evidence.ECTOPLASM);
            case WRAITH -> List.of(EquipmentRegistry.Evidence.STRUCTURED_LIGHT);
            case SHADE -> List.of(EquipmentRegistry.Evidence.SPECTRAL_SHADOW);
            case SPECTER -> List.of(EquipmentRegistry.Evidence.SPECTRAL_SHADOW,
                                   EquipmentRegistry.Evidence.RESONANCE);
            case SPIRIT -> List.of(EquipmentRegistry.Evidence.OBJECT_IMPRINT);
            case HANTU -> List.of(EquipmentRegistry.Evidence.ATMOSPHERIC_REVERSAL);
            case DEVIL -> List.of(EquipmentRegistry.Evidence.RESONANCE);
            case MIMIC -> List.of(EquipmentRegistry.Evidence.OBJECT_IMPRINT);
            case TWINS -> List.of(EquipmentRegistry.Evidence.SEISMIC_IMPACT);
        };
    }
    public static Row forGhost(GhostIdentity.Type type){
        Objects.requireNonNull(type);
        GhostTraits.Profile trait=GhostTraits.of(type);
        return new Row(type,
            GhostEvidenceProfile.emfSuppressed(type)
                ?GhostFieldGuide.Clue.EMF_SUPPRESSION:GhostFieldGuide.Clue.EMF_OVER_SIX,
            GhostEvidenceProfile.thermal(type)==EvidenceSignals.Polarity.COLD
                ?GhostFieldGuide.Clue.EXTREME_COLD:GhostFieldGuide.Clue.EXTREME_HEAT,
            Arrays.asList(GhostEvidenceProfile.availableWriting(type)),
            trait.leavesUv(),trait.sight(),future(type),type.rite(),type.behavior());
    }
    public static List<Row> all(){
        return Arrays.stream(GhostIdentity.Type.values())
            .map(GhostEvidenceMatrix::forGhost).toList();
    }
}
