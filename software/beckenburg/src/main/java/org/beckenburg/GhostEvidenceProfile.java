package org.beckenburg;

import java.util.EnumSet;
import java.util.Objects;

/**
 * Published investigator reference: which observations are compatible with each
 * species. Never inspect the current host's hidden ghost during journal filtering.
 *
 * These are evidence *possibilities*, not confirmation or an enforced scan count.
 */
public final class GhostEvidenceProfile {
    private GhostEvidenceProfile(){}
    private static EnumSet<GhostIdentity.Type> types(GhostIdentity.Type... choices){
        EnumSet<GhostIdentity.Type> set=EnumSet.noneOf(GhostIdentity.Type.class);
        for(var choice:choices)set.add(choice);
        return set;
    }
    private static final EnumSet<GhostIdentity.Type> SILENT=types(
        GhostIdentity.Type.SHADE,GhostIdentity.Type.SPECTER,
        GhostIdentity.Type.HANTU);
    public static boolean emfSuppressed(GhostIdentity.Type type){
        return SILENT.contains(Objects.requireNonNull(type));
    }
    // Thermal tendencies define an extreme a species CAN generate, not a
    // mandatory value on each scan. All species show ordinary room fluctuations.
    private static final EnumSet<GhostIdentity.Type> COLD=types(
        GhostIdentity.Type.BANSHEE,GhostIdentity.Type.SHADE,
        GhostIdentity.Type.SPIRIT,GhostIdentity.Type.HANTU);
    private static final EnumSet<GhostIdentity.Type> HOT=types(
        GhostIdentity.Type.POLTERGEIST,GhostIdentity.Type.DEMON,
        GhostIdentity.Type.DEVIL,GhostIdentity.Type.MIMIC);
    private static final EnumSet<GhostIdentity.Type> CHILD=types(
        GhostIdentity.Type.POSSESSIVE,GhostIdentity.Type.SPIRIT,
        GhostIdentity.Type.MIMIC);
    private static final EnumSet<GhostIdentity.Type> SCRAWL=types(
        GhostIdentity.Type.POLTERGEIST,GhostIdentity.Type.DEMON,
        GhostIdentity.Type.WRAITH,GhostIdentity.Type.DEVIL,
        GhostIdentity.Type.MIMIC);
    private static final EnumSet<GhostIdentity.Type> CIRCLE=types(
        GhostIdentity.Type.POSSESSIVE,GhostIdentity.Type.DEMON,
        GhostIdentity.Type.SHADE,GhostIdentity.Type.SPECTER,
        GhostIdentity.Type.DEVIL,GhostIdentity.Type.WRAITH);

    /** Shared between the simulated heat/cold generator and manual ghost guide. */
    public static EvidenceSignals.Polarity thermal(GhostIdentity.Type type){
        Objects.requireNonNull(type);
        return COLD.contains(type)?EvidenceSignals.Polarity.COLD:
               HOT.contains(type)?EvidenceSignals.Polarity.HOT:EvidenceSignals.Polarity.NONE;
    }
    /** Writing is not universal: YOKAI, BANSHEE, HANTU and TWINS
     * use other evidence producers. Multiple writers share each subtype.
     */
    public static boolean writing(GhostIdentity.Type type,GhostWriting.Style style){
        Objects.requireNonNull(type);Objects.requireNonNull(style);
        return switch(style){
            case CHILD_DRAWINGS->CHILD.contains(type);
            case FRANTIC_SCRAWLS->SCRAWL.contains(type);
            case RITUAL_CIRCLES->CIRCLE.contains(type);
        };
    }
    public static GhostWriting.Style[] availableWriting(GhostIdentity.Type type){
        Objects.requireNonNull(type);
        return java.util.Arrays.stream(GhostWriting.Style.values())
            .filter(style->writing(type,style)).toArray(GhostWriting.Style[]::new);
    }
    public static boolean compatible(GhostIdentity.Type type,GhostFieldGuide.Clue clue){
        Objects.requireNonNull(type);Objects.requireNonNull(clue);
        return switch(clue){
            case EMF_OVER_SIX->!emfSuppressed(type);
            case EMF_SUPPRESSION->emfSuppressed(type);
            case EXTREME_COLD->thermal(type)==EvidenceSignals.Polarity.COLD;
            case EXTREME_HEAT->thermal(type)==EvidenceSignals.Polarity.HOT;
            case WRITING_CHILD->writing(type,GhostWriting.Style.CHILD_DRAWINGS);
            case WRITING_SCRAWL->writing(type,GhostWriting.Style.FRANTIC_SCRAWLS);
            case WRITING_RITUAL->writing(type,GhostWriting.Style.RITUAL_CIRCLES);
            case GHOST_WRITING->availableWriting(type).length>0;
            case SPIRIT_REPLY->true; // all current spirits can reply if actually nearby
            case DOTS_PATTERN->GhostTraits.of(type).canPhase()
                    ||GhostTraits.of(type).sight()==GhostTraits.Sight.ORBS;
            default->true; // physical and behavioral traits are evaluated by the field guide
        };
    }
}
