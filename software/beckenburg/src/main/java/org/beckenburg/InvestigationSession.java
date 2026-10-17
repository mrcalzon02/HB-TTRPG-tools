package org.beckenburg;

import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumSet;
import java.util.List;
import java.util.Random;
import java.util.UUID;

/** Deterministic solo contract rules. Networking and human ghost controls are NOT yet implemented. */
public final class InvestigationSession {
    public enum Role { CLERIC, OBSERVER, DEMONOLOGIST }
    public enum Instrument { EMF, THERMOMETER, SPIRIT_BOX }
    public enum Outcome { ACTIVE, CLEANSED, RETREATED, LOST }
    private final HouseMap map;
    private final Random random;
    private final Role role;
    private final String missionId=UUID.randomUUID().toString();
    private final int anchorRoom;
    private final int[] spectralTrace=new int[HouseMap.ROOM_COUNT];
    private int saltRoom=-1,saltTick=-1;
    private boolean apparitionPhotographed;
    private final EnumSet<Instrument> evidence = EnumSet.noneOf(Instrument.class);
    private final ArrayList<String> journal = new ArrayList<>();
    private Outcome outcome = Outcome.ACTIVE;
    private int ticks, health = 100, stress, wards, payouts;
    private final GhostDomain ghost;
    private final HunterCounters counters=new HunterCounters();
    private final GhostDomain.AiController ghostAi;
    private boolean prepared, haunted, rewarded;
    private String message = "Find disturbances, collect 3 instruments' evidence, prepare a ward, cleanse the anchor.";

    public InvestigationSession(HouseMap map, Role role, long seed) {
        this.map=map; this.role=role; this.random=new Random(seed);
        java.util.Arrays.fill(spectralTrace,-100000);
        this.wards=role==Role.CLERIC?3:2;
        this.anchorRoom=random.nextInt(map.interiorRoomCount());
        this.ghost=new GhostDomain(map,anchorRoom);
        this.ghostAi=new GhostDomain.AiController(seed ^ 0x4245434b454eL);
        journal.add("Case 001 / Spirit-class disturbance. Three complementary readings required.");
        journal.add("All classes can finish the contract; specialist actions change efficiency.");
    }
    public HouseMap map() { return map; }
    public Role role() { return role; }
    public String missionId() { return missionId; }
    public int anchorRoom() { return anchorRoom; } // simulation/test authority; do not expose in player HUD
    public int ghostRoom() { return ghost.room(); }
    public java.util.List<SceneRenderer.WorldMark> counterMarks(){
        return counters.snapshot(ticks).stream()
                .map(m->new SceneRenderer.WorldMark(m.x(),m.z(),m.height(),m.kind())).toList();
    }
    public int counterCharges(HunterCounters.Kind kind){return counters.charges(0,kind);}
    public boolean deployCounter(HunterCounters.Kind kind,double x,double z,double yaw){
        if(outcome!=Outcome.ACTIVE)return false;
        try{
            int heading=Math.floorMod((int)Math.round(Math.toDegrees(yaw)),360);
            counters.launch(0,kind,new LanWorld.Body(x,z,heading,map.roomAt(x,z)),map,ticks);
            log(switch(kind){case CROSS->"Cross thrown: try to interrupt a manifested strike.";
                case WARD->"Ward thrown: temporary shelter where it lands.";
                case SALT->"Salt deployed: slows and reveals grounded spirits only.";});
            return true;
        }catch(IllegalArgumentException denied){log(denied.getMessage());return false;}
    }
    public int ticks() { return ticks; }
    public int health() { return health; }
    public int stress() { return stress; }
    public int wards() { return wards; }
    public int payout() { return payouts; }
    public boolean apparitionPhotographed(){return apparitionPhotographed;}
    public int evidenceCount() { return evidence.size(); }
    public boolean hasEvidence(Instrument instrument) { return evidence.contains(instrument); }
    public boolean wardPrepared() { return prepared; }
    public boolean ghostManifesting() { return haunted; }
    public Outcome outcome() { return outcome; }
    public String message() { return message; }
    public List<String> journal() { return Collections.unmodifiableList(journal); }
    public String statusLine() { return "INJURY " + (100-health) + "  FEAR " + stress + "  CLUES " + evidence.size() + "/3  WARDS " + wards; }
    private void log(String text) {
        message = text;
        journal.add(String.format("%02d:%02d  %s",ticks/600,(ticks/10)%60,text));
        if(journal.size()>64) journal.remove(2);
    }
    public void tick(double playerX, double playerZ) {
        if(outcome!=Outcome.ACTIVE) return;
        ticks++;
        // Every supernatural action, including AI behavior, follows the same host-style dispatcher.
        // Ghost observation has only room-local presence, never the hunter's global position or notebook.
        int playerRoom=map.roomAt(playerX,playerZ);
        ghost.advance(ticks,playerRoom,playerRoom==ghost.room()?1:0);
        int feed=GhostTraits.passiveFear(ghost.type(),ticks,playerRoom==ghost.room()?1:0);
        if(feed>0){
            stress=Math.min(100,stress+feed);
            if(ticks%90==0)log("Your sanity keeps draining. Something is feeding on your presence.");
        }
        if(ghost.room()>=0&&ghost.room()<spectralTrace.length){
            spectralTrace[ghost.room()]=ticks;
            if(saltRoom==ghost.room()&&ticks>saltTick&&GhostTraits.saltAffects(ghost.type())){
                ghost.reveal(30);ghost.slowFor(26);
                log("Salt disturbed in "+map.roomName(saltRoom)+" — grounded spirit slowed and briefly revealed.");
                saltRoom=-1;saltTick=-1;
            }
        }
        HunterCounters.Impact counter=counters.advance(map,ghost.type(),ghost,
            new LanGhostSpatial.Pose(ghost.room(),map.centerX(ghost.room()),map.centerZ(ghost.room()),0),ticks);
        if(counter.saltTrack())log("Salt tracks: the grounded ghost is visible and slowed.");
        if(counter.repelled())log("Cross struck the manifestation: attack interrupted.");
        GhostDomain.Command command=ghostAi.decide(ghost.observe());
        if(command!=null) {
            GhostDomain.Resolution result=ghost.dispatch(command);
            if(result.applied()) {
                if(result.fear()>0) stress=Math.min(100,stress+result.fear());
                // Only present events a hunter could plausibly hear in their current room.
                if(playerRoom==result.room() && result.action()==GhostDomain.Action.WHISPER)
                    log("An indistinct whisper moves through "+map.roomName(playerRoom)+".");
                if(playerRoom==result.room() && result.action()==GhostDomain.Action.DISTURB)
                    log("Loose objects shudder in "+map.roomName(playerRoom)+".");
                if(result.harm()>0) {
                    int wound=prepared?Math.min(result.harm(),4):role==Role.CLERIC?Math.min(result.harm(),8):result.harm();
                    health=Math.max(0,health-wound);
                    log("A spectral strike! -"+wound+" health. Retreat, or use protective wards.");
                    if(health==0) finish(Outcome.LOST);
                }
            }
        }
        haunted=ghost.manifested();
        if(haunted && playerRoom==ghost.room() && ticks%10==0)
            stress=Math.min(100,stress+1);
    }

    /** In-hand use has real case effects. Only three evidence instruments count toward a cleansing. */
    public boolean useEquipment(EquipmentLoadout loadout,double x,double z){
        return useEquipment(loadout,x,z,0);
    }
    public boolean useEquipment(EquipmentLoadout loadout,double x,double z,double yaw){
        java.util.Objects.requireNonNull(loadout);
        if(outcome!=Outcome.ACTIVE||!map.traversable(x,z)){
            log("Cannot operate equipment here.");return false;
        }
        EquipmentLoadout.Item item=loadout.equipped();
        return switch(item){
            case EMF->scan(Instrument.EMF,x,z);
            case THERMOMETER->scan(Instrument.THERMOMETER,x,z);
            case SPIRIT_BOX->scan(Instrument.SPIRIT_BOX,x,z);
            case UV_LAMP->{
                int room=map.roomAt(x,z);
                boolean residue=room>=0&&ticks-spectralTrace[room]<=100;
                log(residue?"UV: transient spectral residue detected in "+map.roomName(room)+"."
                    :"UV: no fresh traces in "+map.roomName(room)+".");
                yield true;
            }
            case PHOTO_CAMERA->{
                if(!loadout.consume(item)){log("Camera empty. Reload at the van equipment rack.");yield false;}
                int room=map.roomAt(x,z);
                boolean visible=haunted&&room==ghost.room()
                    &&CameraAim.onTarget(x,z,yaw,map.centerX(ghost.room()),map.centerZ(ghost.room()))
                    &&map.clearLineOfSight(x,z,map.centerX(ghost.room()),map.centerZ(ghost.room()));
                if(visible&&!apparitionPhotographed){
                    apparitionPhotographed=true;
                    log("APPARITION PHOTOGRAPHED. The developed image will count in your case payout.");
                }else log(visible?"Apparition photographed again.":"No apparition visible in the photograph.");
                yield visible;
            }
            case SALT->{
                int room=map.roomAt(x,z);
                if(room<0||map.outside(room)){log("Salt must be placed in a traversable interior.");yield false;}
                if(!loadout.consume(item)){log("No salt left. Refill at the van equipment rack.");yield false;}
                saltRoom=room;saltTick=ticks;
                log("Salt scattered in "+map.roomName(room)+". Return later to check for tracks.");
                yield true;
            }
        };
    }

    public boolean scan(Instrument tool, double x, double z) {
        if(outcome!=Outcome.ACTIVE) return false;
        int room=map.roomAt(x,z);
        if(room<0) return false;
        int distance=Math.abs(room%3-anchorRoom%3)+Math.abs(room/3-anchorRoom/3);
        int signal=distance==0?5:distance==1?2:0;
        if(tool==Instrument.EMF && room==ghost.room()) signal=Math.max(signal,3);
        boolean strong=signal>=5 || (signal>=2 && ((role==Role.OBSERVER && tool==Instrument.EMF) ||
            (role==Role.DEMONOLOGIST && tool==Instrument.SPIRIT_BOX)));
        String reading=switch(tool) {
            case EMF -> "EMF " + (signal==0?"baseline": "level "+signal);
            case THERMOMETER -> "Air temperature " + (signal==5?"2°C / unnatural cold":signal==2?"11°C / unstable":"19°C / normal");
            case SPIRIT_BOX -> signal==5?"Reply recorded: LEAVE THIS PLACE":signal==2?"Carrier static / faint whisper":"No anomalous reply";
        };
        if(strong && evidence.add(tool)) {
            log("CONFIRMED "+tool.name().replace('_',' ')+" / "+map.roomName(room)+" — "+reading);
        } else log(reading+" / "+map.roomName(room)+(strong?" (already recorded)":" (not conclusive)"));
        return strong;
    }
    public boolean placeWard(double x,double z) {
        if(outcome!=Outcome.ACTIVE || wards<=0) return false;
        if(!map.traversable(x,z)) return false;
        wards--;
        prepared=map.roomAt(x,z)==anchorRoom;
        stress=Math.max(0,stress-(role==Role.CLERIC?35:17));
        log(prepared?"Ward established at the attachment locus; the circle is ready.":"Defensive ward established; fear reduced. The primary anchor lies elsewhere.");
        return true;
    }
    public boolean cleanse(double x,double z) {
        if(outcome!=Outcome.ACTIVE) return false;
        if(evidence.size()!=3) { log("Cannot cleanse: corroborate all three evidence families first.");return false; }
        if(map.roomAt(x,z)!=anchorRoom) { log("Ritual failed: no true attachment anchor in this room.");stress=Math.min(100,stress+5);return false; }
        if(!prepared) { log("The anchor needs a prepared ward before the banishment rite.");return false; }
        finish(Outcome.CLEANSED);
        log("Anchor broken. Spirit banished. Return to the extraction point to secure the site.");
        return true;
    }
    public boolean extract(double x,double z) {
        if(map.roomAt(x,z)!=HouseMap.EXTRACTION_ROOM ||
                Math.hypot(x-map.centerX(HouseMap.EXTRACTION_ROOM),z-map.centerZ(HouseMap.EXTRACTION_ROOM))>1.65) {
            log("Extraction is at the VAN STAGING area beyond the front porch.");return false; }
        if(outcome==Outcome.ACTIVE) { finish(Outcome.RETREATED);log("Team withdrew with partial evidence. The haunting remains."); }
        else if(outcome==Outcome.CLEANSED) log("Site secured. Beckenburg case closed.");
        return outcome!=Outcome.LOST;
    }
    private void finish(Outcome result) {
        if(rewarded)return;
        outcome=result;rewarded=true;
        payouts=switch(result){case CLEANSED->220 + evidence.size()*40 + health/2 + (apparitionPhotographed?45:0);case RETREATED->evidence.size()*30 + (apparitionPhotographed?25:0);case LOST->0;case ACTIVE->0;};
    }
}
