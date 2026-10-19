package org.beckenburg;

import java.util.EnumSet;
import java.util.Objects;

/** Per-species, case-seeded allowance for actual hard-evidence producers.
 * Independent of benign ambient readings and non-exclusive behavioral traits.
 * Host never sends this private set to clients.
 */
public final class HardEvidenceQuota {
    public enum Level {
        EASY("Easy — all compatible evidence",1.00),
        MEDIUM("Medium — two hard-evidence families",1.50),
        DEATH_WISH("Death Wish — no hard evidence",2.40);
        private final String label;
        private final double multiplier;
        Level(String label,double multiplier){this.label=label;this.multiplier=multiplier;}
        public double rewardMultiplier(){return multiplier;}
        @Override public String toString(){return label;}
    }
    public enum Family { EMF, TEMPERATURE, SPIRIT_BOX, WRITING, DOTS }
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
        allowed=EnumSet.noneOf(Family.class);
        if(level==Level.EASY)allowed.addAll(capable);
        else if(level==Level.MEDIUM){
            Family[] options=capable.toArray(new Family[0]);
            int start=Math.floorMod(Long.hashCode(seed^((long)ghost.ordinal()*0x9e3779b97f4a7c15L)),options.length);
            allowed.add(options[start]);
            allowed.add(options[(start+1)%options.length]);
        }
    }
    public boolean permits(Family kind){return allowed.contains(Objects.requireNonNull(kind));}
    public int allowance(){return allowed.size();}
    public Level level(){return level;}
    /** Same contract/match is reproducible; no changing evidence slots by re-scanning. */
    public EnumSet<Family> families(){return allowed.clone();}
}
