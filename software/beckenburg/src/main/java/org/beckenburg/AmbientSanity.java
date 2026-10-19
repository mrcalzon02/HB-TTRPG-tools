package org.beckenburg;

/** Progressive ambient sanity pressure based on occupants, real illumination,
 * and ghost presence; this produces physical stress, not an evidence verdict.
 * Each call advances exactly one authoritative 100ms simulation tick.
 */
public final class AmbientSanity {
    private final int[] remainders=new int[6];
    private static final int TICKS_PER_POINT=300;
    /**
     * Indoor isolation: 1 point per ~30 seconds; isolation in darkness: ~10s;
     * solitude, darkness and nearby spectral presence: ~4s before species feeding.
     */
    public int advance(int seat,boolean inside,int occupants,boolean illuminated,boolean ghostHere,
                       GhostTraits.Charge feeding){
        if(seat<0||seat>=6||occupants<0||occupants>6||feeding==null)
            throw new IllegalArgumentException("invalid ambient sanity context");
        if(!inside||occupants==0){remainders[seat]=0;return 0;}
        int pressure=0;
        if(occupants==1)pressure++;
        if(!illuminated)pressure+=occupants==1?2:1;
        if(ghostHere){
            pressure+=2;
            if(feeding==GhostTraits.Charge.PRESENCE)pressure+=2;
            if(occupants==1&&feeding==GhostTraits.Charge.ISOLATION)pressure++;
        }
        if(pressure==0)return 0;
        remainders[seat]+=pressure;
        if(remainders[seat]<TICKS_PER_POINT)return 0;
        remainders[seat]-=TICKS_PER_POINT;
        return 1;
    }
    public void reset(int seat){
        if(seat<0||seat>=6)throw new IllegalArgumentException("invalid seat");
        remainders[seat]=0;
    }
}
