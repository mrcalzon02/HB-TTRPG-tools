package org.beckenburg;

import java.util.EnumSet;

/** Room-level LAN case rules. All changes are made by LanHost, never by peer-supplied damage or evidence. */
public final class LanCase {
    public enum Outcome { ACTIVE, CLEANSED, RETREATED, LOST }
    public enum Tool { EMF, THERMOMETER, SPIRIT_BOX }
    public record Report(boolean accepted, String message) { }
    private static final int RITUAL_TICKS = 45, ABANDON_GRACE_TICKS = 20;
    public enum RitualAdvance { NONE, PAUSED, RESUMED, BROKEN, CLEANSED }
    private final int anchor;
    private final EnumSet<Tool> evidence=EnumSet.noneOf(Tool.class);
    private final int[] health={100,100,100},stress={0,0,0},wards={2,2,2};
    private final boolean[] active={true,true,true};
    private int wardRoom=-1,ritualProgress=-1,unguardedTicks;
    private Outcome outcome=Outcome.ACTIVE;

    public LanCase(int anchor) {
        if(anchor<0||anchor>=HouseMap.INDOOR_ROOMS)throw new IllegalArgumentException("invalid anchor");
        this.anchor=anchor;
    }
    private static void hunter(int seat){if(seat<0||seat>=3)throw new IllegalArgumentException("hunter seat required");}
    public Outcome outcome(){return outcome;}
    public int evidenceCount(){return evidence.size();}
    public int health(int seat){hunter(seat);return health[seat];}
    public int stress(int seat){hunter(seat);return stress[seat];}
    public int wards(int seat){hunter(seat);return wards[seat];}
    public boolean wardPrepared(){return wardRoom==anchor;}
    public int ritualProgress(){return ritualProgress;}
    public int remainingHunters(){
        int count=0;for(boolean connected:active)if(connected)count++;
        return count;
    }
    /** Only the host can retire a departing seat; no reconnect/seat reuse in this alpha. */
    public void depart(int seat){
        hunter(seat);
        if(!active[seat])return;
        active[seat]=false;
        if(outcome==Outcome.ACTIVE&&remainingHunters()==0)outcome=Outcome.LOST;
    }
    public String privateState(int seat) {
        hunter(seat);
        return "PROGRESS|"+health[seat]+"|"+stress[seat]+"|"+wards[seat]+"|"+evidence.size()+"|"+(wardPrepared()?1:0)+"|"+Math.max(0,ritualProgress)+"|"+outcome;
    }
    public Report scan(int seat,Tool tool,int room,int ghostRoom) {
        hunter(seat);
        if(outcome!=Outcome.ACTIVE||!active[seat]||health[seat]<=0)return new Report(false,"investigation unavailable");
        int distance=Math.abs(room%HouseMap.COLS-anchor%HouseMap.COLS)+Math.abs(room/HouseMap.COLS-anchor/HouseMap.COLS);
        boolean strong=room==anchor;
        // EMF can detect ghost activity elsewhere, but a transient spike alone is not proof of its anchor.
        String reading=switch(tool){
            case EMF -> strong?"EMF level 5":room==ghostRoom?"EMF level 3":"EMF baseline";
            case THERMOMETER -> strong?"Unnatural cold 2C":distance==1?"Cool air 11C":"Ambient 19C";
            case SPIRIT_BOX -> strong?"Response detected":"No conclusive response";
        };
        if(strong){boolean newlyAdded=evidence.add(tool);
            return new Report(true,(newlyAdded?"CONFIRMED ":"REPEAT ")+tool+" in "+room+" - "+reading);
        }
        return new Report(true,"INCONCLUSIVE "+tool+" in "+room+" - "+reading);
    }
    public Report ward(int seat,int room) {
        hunter(seat);
        if(outcome!=Outcome.ACTIVE||!active[seat]||health[seat]<=0)return new Report(false,"cannot ward now");
        if(wards[seat]<=0)return new Report(false,"no wards remaining");
        wards[seat]--;
        stress[seat]=Math.max(0,stress[seat]-20);
        if(room==anchor)wardRoom=room;
        return new Report(true,room==anchor?"ANCHOR WARD PREPARED":"DEFENSIVE WARD PLACED");
    }
    public Report cleanse(int seat,int room) {
        hunter(seat);
        if(outcome!=Outcome.ACTIVE||!active[seat]||health[seat]<=0)return new Report(false,"cannot perform rite");
        if(evidence.size()!=Tool.values().length)return new Report(false,"three corroborated evidence families required");
        if(room!=anchor)return new Report(false,"no true attachment anchor here");
        if(!wardPrepared())return new Report(false,"anchor ward required");
        if(ritualProgress>=0)return new Report(false,"ritual already underway");
        ritualProgress=0;unguardedTicks=0;
        return new Report(true,"RITUAL STARTED - defend the prepared circle");
    }
    public Report extract(int seat,int room) {
        hunter(seat);
        if(outcome!=Outcome.ACTIVE||!active[seat]||health[seat]<=0)return new Report(false,"extraction unavailable");
        if(room!=HouseMap.EXTRACTION_ROOM)return new Report(false,"return to van staging");
        outcome=Outcome.RETREATED;
        return new Report(true,"TEAM WITHDREW - haunting unresolved");
    }
    public void applyGhostEffect(int room,int[] hunterRooms,GhostDomain.Resolution effect) {
        applyGhostEffect(room,hunterRooms,effect,new boolean[]{true,true,true});
    }
    /** Host may narrow an actual spatial strike to eligible seats; never trust a client mask. */
    public void applyGhostEffect(int room,int[] hunterRooms,GhostDomain.Resolution effect,boolean[] affected) {
        if(hunterRooms.length!=3||affected.length!=3)throw new IllegalArgumentException("three hunter seats required");
        if(outcome!=Outcome.ACTIVE||!effect.applied())return;
        for(int i=0;i<3;i++)if(active[i]&&affected[i]&&hunterRooms[i]==room && health[i]>0){
            stress[i]=Math.min(100,stress[i]+effect.fear());
            if(effect.harm()>0)health[i]=Math.max(0,health[i]-Math.max(1,wardRoom==room?Math.min(4,effect.harm()):effect.harm()));
        }
        if(ritualProgress>=0 && room==anchor && effect.action()==GhostDomain.Action.DISTURB){
            ritualProgress=Math.max(0,ritualProgress-12); // Contest, but bounded disruption cannot permanently stun the rite.
        }
        // Disconnected seats cannot become invulnerable phantom survivors.
        boolean survivor=false;
        for(int i=0;i<3;i++)if(active[i]&&health[i]>0)survivor=true;
        if(!survivor)outcome=Outcome.LOST;
    }
    /** Advance on the host's 100ms simulation clock, never on a client timer.
     * An investigator must be active, alive and physically in the anchor room.
     * A vacated circle pauses immediately and unravels after twenty unattended ticks.
     */
    public RitualAdvance advance(int[] hunterRooms) {
        if(hunterRooms==null||hunterRooms.length!=3)
            throw new IllegalArgumentException("three hunter room snapshots required");
        if(outcome!=Outcome.ACTIVE||ritualProgress<0)return RitualAdvance.NONE;
        boolean guarded=false;
        for(int seat=0;seat<3;seat++)
            if(active[seat]&&health[seat]>0&&hunterRooms[seat]==anchor)guarded=true;
        if(!guarded){
            if(++unguardedTicks>=ABANDON_GRACE_TICKS){
                ritualProgress=-1;
                unguardedTicks=0;
                return RitualAdvance.BROKEN;
            }
            return unguardedTicks==1?RitualAdvance.PAUSED:RitualAdvance.NONE;
        }
        boolean resumed=unguardedTicks>0;
        unguardedTicks=0;
        if(++ritualProgress>=RITUAL_TICKS){
            outcome=Outcome.CLEANSED;
            return RitualAdvance.CLEANSED;
        }
        return resumed?RitualAdvance.RESUMED:RitualAdvance.NONE;
    }
}
