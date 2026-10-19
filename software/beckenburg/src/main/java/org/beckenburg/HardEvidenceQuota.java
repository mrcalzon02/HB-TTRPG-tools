package org.beckenburg;

import java.util.EnumSet;
import java.util.Objects;

/** Per-species, case-seeded allowance for actual hard-evidence producers.
 * Natural environmental values and non-exclusive behaviors remain visible.
 * Host never sends this private set to clients.
 */
public final class HardEvidenceQuota {
    public enum Level {
        EASY("Easy — at least 3 hard evidence types",1.00),
        MEDIUM("Medium — exactly 2 hard evidence types",1.50),
        DEATH_WISH("Death Wish — exactly 1 hard evidence type",2.40);
        private final String label;
        private final double multiplier;
        Level(String label,double multiplier){this.label=label;this.multiplier=multiplier;}
        public double rewardMultiplier(){return multiplier;}
        @Override public String toString(){return label;}
    }
    public enum Family { EMF, TEMPERATURE, SPIRIT_BOX, WRITING, DOTS, UV, ORBS }
    private final Level level;
    private final EnumSet<Family> allowed;
    public HardEvidenceQuota(GhostIdentity.Type ghost,Level level,long seed){
        Objects.requireNonNull(ghost);this.level=Objects.requireNonNull(level);
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
        // Every ghost must have at least three real producers available on Easy.
        if(capable.size()<3)throw new IllegalStateException(
            "Ghost "+ghost+" has only "+capable.size()+" hard evidence producers");
        allowed=EnumSet.noneOf(Family.class);
        if(level==Level.EASY)allowed.addAll(capable);
        else {
            Family[] options=capable.toArray(new Family[0]);
            int start=Math.floorMod(Long.hashCode(seed^((long)ghost.ordinal()*0x9e3779b97f4a7c15L)),options.length);
            int required=level==Level.MEDIUM?2:1;
            for(int i=0;i<required;i++)allowed.add(options[(start+i)%options.length]);
        }
        int minimum=level==Level.EASY?3:level==Level.MEDIUM?2:1;
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
