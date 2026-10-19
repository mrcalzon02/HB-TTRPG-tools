package org.beckenburg;

import java.util.EnumSet;
import java.util.Objects;

/** Per-species evidence scarcity: Easy >=4, Medium unique 3, Death Wish 1.
 * All permitted families have real ghost-specific producers. Ambient/weather
 * readings and non-exclusive behavioral clues do not use quota slots.
 * Never send the case's chosen private evidence set to clients.
 */
public final class HardEvidenceQuota {
    public enum Level {
        EASY("Easy — at least 4 hard evidence types",1.00),
        MEDIUM("Medium — exactly 3 hard evidence types",1.50),
        DEATH_WISH("Death Wish — exactly 1 hard evidence type",2.40);
        private final String label;
        private final double multiplier;
        Level(String label,double multiplier){this.label=label;this.multiplier=multiplier;}
        public double rewardMultiplier(){return multiplier;}
        @Override public String toString(){return label;}
    }
    public enum Family { EMF, TEMPERATURE, SPIRIT_BOX, WRITING, DOTS, UV, ORBS,
        ECTOPLASM, RESONANCE, SEISMIC, ATMOSPHERIC, SHADOW, IMPRINT, LASER }
    /**
     * One distinct, guaranteed three-evidence combination per ghost. These
     * combinations are the Medium contract's three actual hard-positive
     * producers. Every combination is unique across the current 13 species and now includes
     * physically observable results from the additional authored instruments;
     * D.O.T.S. remains reserved for Wraith, Shade and Specter.
     */
    public static EnumSet<Family> signature(GhostIdentity.Type ghost){
        return switch(Objects.requireNonNull(ghost)){
            case POSSESSIVE  ->EnumSet.of(Family.EMF,Family.SPIRIT_BOX,Family.IMPRINT);
            case POLTERGEIST ->EnumSet.of(Family.EMF,Family.TEMPERATURE,Family.SEISMIC);
            case DEMON       ->EnumSet.of(Family.EMF,Family.TEMPERATURE,Family.RESONANCE);
            case YOKAI       ->EnumSet.of(Family.EMF,Family.WRITING,Family.RESONANCE);
            case BANSHEE     ->EnumSet.of(Family.TEMPERATURE,Family.SPIRIT_BOX,Family.ECTOPLASM);
            case WRAITH      ->EnumSet.of(Family.EMF,Family.DOTS,Family.LASER);
            case SHADE       ->EnumSet.of(Family.TEMPERATURE,Family.DOTS,Family.SHADOW);
            case SPECTER     ->EnumSet.of(Family.WRITING,Family.DOTS,Family.SHADOW);
            case SPIRIT      ->EnumSet.of(Family.TEMPERATURE,Family.SPIRIT_BOX,Family.IMPRINT);
            case HANTU       ->EnumSet.of(Family.EMF,Family.TEMPERATURE,Family.ATMOSPHERIC);
            case DEVIL       ->EnumSet.of(Family.TEMPERATURE,Family.WRITING,Family.RESONANCE);
            case MIMIC       ->EnumSet.of(Family.EMF,Family.TEMPERATURE,Family.IMPRINT);
            case TWINS       ->EnumSet.of(Family.SPIRIT_BOX,Family.WRITING,Family.SEISMIC);
        };
    }
    private final Level level;
    private final EnumSet<Family> allowed;
    public HardEvidenceQuota(GhostIdentity.Type ghost,Level level,long seed){
        Objects.requireNonNull(ghost);this.level=Objects.requireNonNull(level);
        // HIGH / LOW_MID / NONE are all authored ghost EMF signatures.
        // No-EMF is a real localized suppression event; ambient background remains noisy.
        EnumSet<Family> capable=EnumSet.of(Family.EMF,Family.SPIRIT_BOX);
        if(GhostEvidenceProfile.thermal(ghost)!=EvidenceSignals.Polarity.NONE)
            capable.add(Family.TEMPERATURE);
        if(GhostEvidenceProfile.availableWriting(ghost).length>0)
            capable.add(Family.WRITING);
        if(GhostEvidenceProfile.compatible(ghost,GhostFieldGuide.Clue.DOTS_PATTERN))
            capable.add(Family.DOTS);
        GhostTraits.Profile physiology=GhostTraits.of(ghost);
        if(physiology.leavesUv())capable.add(Family.UV);
        if(physiology.sight()==GhostTraits.Sight.ORBS)capable.add(Family.ORBS);
        for(EquipmentRegistry.Evidence phenomenon:GhostEvidenceMatrix.forGhost(ghost).future())
            capable.add(AdditionalEvidence.family(phenomenon));
        // Every ghost must have at least four real producers available on Easy.
        if(capable.size()<4)throw new IllegalStateException(
            "Ghost "+ghost+" has only "+capable.size()+" hard evidence producers");
        EnumSet<Family> three=signature(ghost);
        if(three.size()!=3||!capable.containsAll(three))
            throw new IllegalStateException("Ghost "+ghost+
                " must genuinely produce its distinct three-evidence signature "+three);
        allowed=EnumSet.noneOf(Family.class);
        if(level==Level.EASY)allowed.addAll(capable);
        else if(level==Level.MEDIUM)allowed.addAll(three);
        else {
            Family[] possible=three.toArray(new Family[0]);
            int index=Math.floorMod(Long.hashCode(seed^
                ((long)ghost.ordinal()*0x9e3779b97f4a7c15L)),possible.length);
            allowed.add(possible[index]);
        }
        int minimum=level==Level.EASY?4:level==Level.MEDIUM?3:1;
        if((level==Level.EASY&&allowed.size()<minimum)
                ||(level!=Level.EASY&&allowed.size()!=minimum))
            throw new IllegalStateException("Hard-evidence quota violated");
    }
    public boolean permits(Family kind){return allowed.contains(Objects.requireNonNull(kind));}
    public int allowance(){return allowed.size();}
    public Level level(){return level;}
    /** Same contract/match is reproducible; no changing evidence slots by re-scanning. */
    public EnumSet<Family> families(){return allowed.clone();}
}
