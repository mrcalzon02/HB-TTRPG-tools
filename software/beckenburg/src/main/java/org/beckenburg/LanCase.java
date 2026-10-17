package org.beckenburg;

import java.util.EnumSet;

/** Room-level LAN case rules. All changes are made by LanHost, never by peer-supplied damage or evidence. */
public final class LanCase {
    public enum Outcome { ACTIVE, CLEANSED, RETREATED, LOST }
    /** Detection falls off within the actual 3D room; the room-mode demo remains abstract. */
    public enum Tool {
        EMF(2.6), THERMOMETER(3.4), SPIRIT_BOX(2.1);
        private final double sensingRadius;
        Tool(double radius){sensingRadius=radius;}
        public double sensingRadius(){return sensingRadius;}
    }
    public record Report(boolean accepted, String message) { }
    private static final int RITUAL_TICKS = 45, ABANDON_GRACE_TICKS = 20;
    public enum RitualAdvance { NONE, PAUSED, RESUMED, BROKEN, CLEANSED }
    private final int anchor;
    private final EnumSet<Tool> evidence=EnumSet.noneOf(Tool.class), tested=EnumSet.noneOf(Tool.class);
    private GhostIdentity.Type archetype=GhostIdentity.Type.SPIRIT, identified;
    private boolean identificationRequired;
    private int lastGuessTick=-1000;
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
    public int testedCount(){return tested.size();}
    public GhostIdentity.Type type(){return archetype;}
    public GhostIdentity.Type identified(){return identified;}
    /** Call only before a session; selection belongs to the host, not remote scan packets. */
    public void configure(GhostIdentity.Type type,boolean requireIdentification){
        if(outcome!=Outcome.ACTIVE||!evidence.isEmpty()||!tested.isEmpty()||ritualProgress>=0)
            throw new IllegalStateException("cannot change an active investigation");
        archetype=java.util.Objects.requireNonNull(type);
        identificationRequired=requireIdentification;
        identified=null;
    }
    public Report identify(int seat,GhostIdentity.Type guess,int tick){
        hunter(seat);
        java.util.Objects.requireNonNull(guess);
        if(outcome!=Outcome.ACTIVE||!alive(seat))return new Report(false,"identification unavailable");
        if(!identificationRequired)return new Report(false,"identity dossier not enabled");
        if(tested.size()!=Tool.values().length)return new Report(false,"test all three instruments at the haunting anchor");
        if(identified!=null)return new Report(false,"entity already identified");
        if(tick<0||tick-lastGuessTick<30)return new Report(false,"allow the entity to settle before another deduction");
        lastGuessTick=tick;
        if(guess!=archetype){
            stress[seat]=Math.min(100,stress[seat]+15);
            return new Report(false,"evidence contradicts that entity; investigator fear increases");
        }
        identified=guess;
        return new Report(true,"ENTITY IDENTIFIED "+guess);
    }
    public int health(int seat){hunter(seat);return health[seat];}
    /** Single host-owned predicate for participation, pursuit and strike eligibility. */
    public boolean alive(int seat){
        hunter(seat);return active[seat]&&health[seat]>0;
    }
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
        // Vacant and incapacitated seats cannot keep an already lost case active.
        boolean survivor=false;
        for(int i=0;i<3;i++)if(alive(i))survivor=true;
        if(outcome==Outcome.ACTIVE&&!survivor)outcome=Outcome.LOST;
    }
    public String privateState(int seat) {
        hunter(seat);
        return "PROGRESS|"+health[seat]+"|"+stress[seat]+"|"+wards[seat]+"|"+evidence.size()+"|"+(wardPrepared()?1:0)+"|"+Math.max(0,ritualProgress)+"|"+outcome;
    }
    public Report scan(int seat,Tool tool,int room,int ghostRoom) {
        hunter(seat);
        if(outcome!=Outcome.ACTIVE||!active[seat]||health[seat]<=0)return new Report(false,"investigation unavailable");
        int distance=Math.abs(room%HouseMap.COLS-anchor%HouseMap.COLS)+Math.abs(room/HouseMap.COLS-anchor/HouseMap.COLS);
        boolean atAnchor=room==anchor;
        if(atAnchor)tested.add(tool);
        boolean strong=atAnchor&&archetype.signature(tool);
        // Each instrument has a discoverable signature and possible negative result.
        // Presence in the same room is insufficient for a positive reading on every type.
        String reading=GhostIdentity.reading(archetype,tool,strong,distance,room==ghostRoom);
        if(strong){boolean newlyAdded=evidence.add(tool);
            return new Report(true,(newlyAdded?"CONFIRMED ":"REPEAT ")+tool+" in "+room+" - "+reading);
        }
        return new Report(true,"INCONCLUSIVE "+tool+" in "+room+" - "+reading);
    }
    /** Physical first-person scans use the host-owned world body, not a peer-supplied room
     * or claimed distance. Merely entering the anchor room no longer confirms every clue.
     */
    public Report scanSpatial(int seat,Tool tool,LanWorld.Body body,int ghostRoom,HouseMap map) {
        hunter(seat);
        if(outcome!=Outcome.ACTIVE||!alive(seat))return new Report(false,"investigation unavailable");
        if(tool==null||body==null||map==null||!Double.isFinite(body.x())||!Double.isFinite(body.z())
                ||map.roomAt(body.x(),body.z())!=body.room())
            return new Report(false,"invalid instrument or host body");
        int room=body.room();
        if(room==anchor&&Math.hypot(body.x()-map.centerX(anchor),body.z()-map.centerZ(anchor))
                >tool.sensingRadius())
            return new Report(true,"INCONCLUSIVE "+tool+" - weak reading; move closer to the source");
        return scan(seat,tool,room,ghostRoom);
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
        if(evidence.size()!=archetype.signatureCount())
            return new Report(false,"complete the entity's signature evidence set");
        if(identificationRequired&&identified!=archetype)
            return new Report(false,"identify the haunting entity before completing the rite");
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
