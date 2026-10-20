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
    private final EnumSet<Instrument> measuredTools = EnumSet.noneOf(Instrument.class);
    private final ArrayList<String> journal = new ArrayList<>();
    private Outcome outcome = Outcome.ACTIVE;
    private int ticks, health = 100, stress, wards, payouts;
    private final long evidenceSeed;
    private final EvidenceSignals.Polarity thermalPolarity;
    private final EvidenceSignals.Season season;
    private MissionWeather missionWeather;
    public void configureWeather(MissionWeather.Mode mode,EvidenceSignals.Weather selected,
            int intensity){
        if(ticks>0)throw new IllegalStateException("weather cannot be changed mid-session");
        missionWeather=new MissionWeather(season,mode,selected,intensity,evidenceSeed^0x57454154484552L);
    }
    public MissionWeather.State weather(){return missionWeather.state();}
    private int lastEvidenceTick=-10000,lastEvidenceRoom=-1,lastEvidenceStrength;
    private final GhostDomain ghost;
    private RoomLighting roomLights;
    public void connectLighting(RoomLighting roomLights){this.roomLights=roomLights;}
    private final HunterCounters counters=new HunterCounters();
    private final AmbientSanity ambientSanity=new AmbientSanity();
    private final GhostDomain.AiController ghostAi;
    private boolean prepared, haunted, rewarded;
    private String message = "Inspect the haunting, record instrument measurements, prepare a ward, and attempt the rite.";

    public InvestigationSession(HouseMap map, Role role, long seed) {
        this.map=map; this.role=role; this.random=new Random(seed);
        evidenceSeed=seed;
        thermalPolarity=GhostEvidenceProfile.thermal(GhostIdentity.Type.SPIRIT);
        int month=java.time.LocalDate.now().getMonthValue();
        season=switch(month){
            case 12,1,2->EvidenceSignals.Season.WINTER;
            case 3,4,5->EvidenceSignals.Season.SPRING;
            case 6,7,8->EvidenceSignals.Season.SUMMER;
            default->EvidenceSignals.Season.AUTUMN;
        };
        missionWeather=new MissionWeather(season,MissionWeather.Mode.FIXED,
            EvidenceSignals.Weather.CLEAR,1,seed);
        java.util.Arrays.fill(spectralTrace,-100000);
        this.wards=role==Role.CLERIC?3:2;
        this.anchorRoom=random.nextInt(map.interiorRoomCount());
        this.ghost=new GhostDomain(map,anchorRoom);
        this.ghostAi=new GhostDomain.AiController(seed ^ 0x4245434b454eL);
        journal.add("Case 001 / All valid instrument measurements are recorded; interpret the evidence yourself.");
        journal.add("All classes can finish the contract; specialist actions change efficiency.");
    }
    public HouseMap map() { return map; }
    public Role role() { return role; }
    public String missionId() { return missionId; }
    public int anchorRoom() { return anchorRoom; } // simulation/test authority; do not expose in player HUD
    public int ghostRoom() { return ghost.room(); }
    /** Used only by the local simulated van sensor, never by the hunter's HUD. */
    int ghostEnergy(){return ghost.energy();}
    public java.util.List<SceneRenderer.WorldMark> counterMarks(){
        return counters.snapshot(ticks).stream()
                .map(m->new SceneRenderer.WorldMark(m.x(),m.z(),m.height(),m.kind())).toList();
    }
    public int counterCharges(HunterCounters.Kind kind){return counters.charges(0,kind);}
    public boolean deployCounter(HunterCounters.Kind kind,double x,double z,double yaw){
        return deployCounter(kind,x,standingY(x,z),z,yaw);
    }
    public boolean deployCounter(HunterCounters.Kind kind,double x,double y,double z,double yaw){
        if(outcome!=Outcome.ACTIVE)return false;
        try{
            int heading=Math.floorMod((int)Math.round(Math.toDegrees(yaw)),360);
            counters.launch(0,kind,new LanWorld.Body(x,y,z,heading,map.roomAt(x,y,z)),map,ticks);
            log(switch(kind){case CROSS->"Cross thrown: try to interrupt a manifested strike.";
                case WARD->"Ward thrown: temporary shelter where it lands.";
                case SALT->"Salt deployed: slows and reveals grounded spirits only.";});
            return true;
        }catch(IllegalArgumentException denied){log(denied.getMessage());return false;}
    }
    public int ticks() { return ticks; }
    public int health() { return health; }
    public int stress() { return stress; }
    public boolean useMedicine(FieldSupplies.Kind kind,int amount){
        if(outcome!=Outcome.ACTIVE||amount<1||amount>100)return false;
        if(kind==FieldSupplies.Kind.HEALTH){
            if(health>=100)return false;
            health=Math.min(100,health+amount);
            log("Medical treatment restored health. Current HP "+health);
        }else{
            if(stress==0)return false;
            stress=Math.max(0,stress-amount);
            log("Sanity treatment eased distress. Remaining fear "+stress);
        }
        return true;
    }
    public int wards() { return wards; }
    public int payout() { return payouts; }
    public boolean apparitionPhotographed(){return apparitionPhotographed;}
    /** Legacy HUD/API count: different instruments used, NOT verified ghost evidence. */
    public int evidenceCount() { return measuredTools.size(); }
    public boolean hasEvidence(Instrument instrument) { return measuredTools.contains(instrument); }
    public boolean wardPrepared() { return prepared; }
    public boolean ghostManifesting() { return haunted; }
    public Outcome outcome() { return outcome; }
    public String message() { return message; }
    public List<String> journal() { return Collections.unmodifiableList(journal); }
    public String statusLine() { return "INJURY " + (100-health) + "  FEAR " + stress + "  MEASURED TOOLS " + measuredTools.size() + "  WARDS " + wards; }
    private void log(String text) {
        message = text;
        journal.add(String.format("%02d:%02d  %s",ticks/600,(ticks/10)%60,text));
        if(journal.size()>64) journal.remove(2);
    }
    public void tick(double playerX, double playerZ) {
        tick(playerX,playerZ,false);
    }
    public void tick(double playerX,double playerZ,boolean carriedLight) {
        tick(playerX,standingY(playerX,playerZ),playerZ,carriedLight);
    }
    public void tick(double playerX,double playerY,double playerZ,boolean carriedLight) {
        if(outcome!=Outcome.ACTIVE) return;
        ticks++;
        missionWeather.advance(ticks);
        // Every supernatural action, including AI behavior, follows the same host-style dispatcher.
        // Ghost observation has only room-local presence, never the hunter's global position or notebook.
        int playerRoom=map.roomAt(playerX,playerY,playerZ);
        ghost.advance(ticks,playerRoom,playerRoom==ghost.room()?1:0);
        boolean indoor=playerRoom>=0&&playerRoom<HouseMap.INDOOR_ROOMS;
        boolean light=carriedLight||(indoor&&(roomLights==null
            ||roomLights.brightness(playerRoom,ticks)>.32));
        int stressFromRoom=ambientSanity.advance(0,indoor,1,light,
            playerRoom==ghost.room(),GhostTraits.of(ghost.type()).charge());
        if(stressFromRoom>0)stress=Math.min(100,stress+stressFromRoom);
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
            new LanGhostSpatial.Pose(ghost.room(),map.centerX(ghost.room()),map.floorY(ghost.room()),map.centerZ(ghost.room()),0),ticks);
        if(counter.saltTrack())log("Salt tracks: the grounded ghost is visible and slowed.");
        if(counter.repelled())log("Cross struck the manifestation: attack interrupted.");
        GhostDomain.Command command=ghostAi.decide(ghost.observe());
        if(command!=null) {
            GhostDomain.Resolution result=ghost.dispatch(command);
            if(result.applied()) {
                int power=switch(result.action()){
                    case WHISPER->3;case DISTURB->8;case MANIFEST->9;
                    case STRIKE,SIGNATURE->10;case DRIFT->0;
                };
                if(power>0){
                    lastEvidenceTick=ticks;
                    lastEvidenceRoom=result.room();
                    lastEvidenceStrength=power;
                }
                if(roomLights!=null && result.room()<HouseMap.INDOOR_ROOMS){
                    RoomLighting.Interference effect=switch(result.action()){
                        case WHISPER->RoomLighting.Interference.MINOR;
                        case DISTURB,MANIFEST->RoomLighting.Interference.MODERATE;
                        case STRIKE->RoomLighting.Interference.DANGEROUS;
                        case SIGNATURE->RoomLighting.Interference.SIGNATURE;
                        default->null;
                    };
                    if(effect!=null)roomLights.pulse(result.room(),effect,ticks);
                }
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
        return useEquipment(loadout,x,standingY(x,z),z,yaw);
    }
    public boolean useEquipment(EquipmentLoadout loadout,double x,double y,double z,double yaw){
        java.util.Objects.requireNonNull(loadout);
        if(outcome!=Outcome.ACTIVE||!map.traversable(x,y,z)){
            log("Cannot operate equipment here.");return false;
        }
        EquipmentLoadout.Item item=loadout.equipped();
        return switch(item){
            case EMF->scan(Instrument.EMF,x,y,z);
            case THERMOMETER->scan(Instrument.THERMOMETER,x,y,z);
            case SPIRIT_BOX->scan(Instrument.SPIRIT_BOX,x,y,z);
            case UV_LAMP->{
                int room=map.roomAt(x,y,z);
                boolean residue=room>=0&&ticks-spectralTrace[room]<=100;
                log(residue?"UV: transient spectral residue detected in "+map.roomName(room)+"."
                    :"UV: no fresh traces in "+map.roomName(room)+".");
                yield true;
            }
            case PHOTO_CAMERA->{
                if(!loadout.consume(item)){log("Camera empty. Reload at the van equipment rack.");yield false;}
                int room=map.roomAt(x,y,z);
                boolean visible=haunted&&room==ghost.room()
                    &&CameraAim.onTarget(x,z,yaw,map.centerX(ghost.room()),map.centerZ(ghost.room()))
                    &&map.clearLineOfSight(x,y+1.62,z,map.centerX(ghost.room()),
                        map.floorY(ghost.room())+1.2,map.centerZ(ghost.room()));
                if(visible&&!apparitionPhotographed){
                    apparitionPhotographed=true;
                    log("APPARITION PHOTOGRAPHED. The developed image will count in your case payout.");
                }else log(visible?"Apparition photographed again.":"No apparition visible in the photograph.");
                yield visible;
            }
            case SALT->{
                int room=map.roomAt(x,y,z);
                if(room<0||map.outside(room)){log("Salt must be placed in a traversable interior.");yield false;}
                if(!loadout.consume(item)){log("No salt left. Refill at the van equipment rack.");yield false;}
                saltRoom=room;saltTick=ticks;
                log("Salt scattered in "+map.roomName(room)+". Return later to check for tracks.");
                yield true;
            }
        };
    }

    /** Environmental measurements mirror the LAN's numeric evidence model. */
    /** A valid scan ALWAYS produces a measurement and a journal entry. */
    public boolean scan(Instrument tool, double x, double z) {
        return scan(tool,x,standingY(x,z),z);
    }
    public boolean scan(Instrument tool,double x,double y,double z){
        if(outcome!=Outcome.ACTIVE||tool==null)return false;
        if(!map.traversable(x,y,z))return false;
        int room=map.roomAt(x,y,z);
        if(room<0)return false;
        int age=ticks-lastEvidenceTick;
        int eventPower=age>=0&&age<=40
            ?Math.max(0,lastEvidenceStrength-age/7):0;
        String reading;
        switch(tool){
            case EMF -> {
                var measured=EvidenceSignals.emf(evidenceSeed,ticks,room,lastEvidenceRoom,eventPower,false,
                    missionWeather.state().weather(),missionWeather.state().intensity());
                reading="EMF "+measured.level()+"/10";
            }
            case THERMOMETER -> {
                boolean indoor=room<HouseMap.INDOOR_ROOMS;
                boolean heated=roomLights==null||roomLights.breaker();
                var location=new EvidenceSignals.Location(season,missionWeather.state().weather(),
                    14,room,indoor,heated);
                var measured=EvidenceSignals.temperature(evidenceSeed,ticks,location,
                    thermalPolarity,room==anchorRoom,eventPower,missionWeather.state().intensity());
                reading="Air "+measured.displayText(EvidenceSignals.Unit.CELSIUS)
                    +" / "+measured.displayText(EvidenceSignals.Unit.FAHRENHEIT);
            }
            case SPIRIT_BOX -> reading=room==ghost.room()
                ?"Voice response detected":"No response detected";
            default -> throw new AssertionError(tool);
        }
        measuredTools.add(tool);
        log("T"+ticks+" / "+map.roomName(room)+" / "+tool+" / "+reading);
        return true;
    }
    public boolean placeWard(double x,double z) {
        return placeWard(x,standingY(x,z),z);
    }
    public boolean placeWard(double x,double y,double z){
        if(outcome!=Outcome.ACTIVE || wards<=0) return false;
        if(!map.traversable(x,y,z)) return false;
        wards--;
        prepared=map.roomAt(x,y,z)==anchorRoom;
        stress=Math.max(0,stress-(role==Role.CLERIC?35:17));
        log(prepared?"Ward established at the attachment locus; the circle is ready.":"Defensive ward established; fear reduced. The primary anchor lies elsewhere.");
        return true;
    }
    public boolean cleanse(double x,double z) {
        return cleanse(x,standingY(x,z),z);
    }
    public boolean cleanse(double x,double y,double z){
        if(outcome!=Outcome.ACTIVE) return false;
        if(!map.traversable(x,y,z))return false;
        if(map.roomAt(x,y,z)!=anchorRoom) { log("Ritual failed: no true attachment anchor in this room.");stress=Math.min(100,stress+5);return false; }
        if(!prepared) { log("The anchor needs a prepared ward before the banishment rite.");return false; }
        finish(Outcome.CLEANSED);
        log("Anchor broken. Spirit banished. Return to the extraction point to secure the site.");
        return true;
    }
    public boolean extract(double x,double z) {
        return extract(x,standingY(x,z),z);
    }
    public boolean extract(double x,double y,double z){
        var local=map.van().local(x,z);
        if(Math.abs(y-map.level().dock().y())>.25
                ||map.roomAt(x,y,z)!=HouseMap.EXTRACTION_ROOM
                ||Math.abs(local.x())>=VanStaging.HALF_WIDTH-VanStaging.WALL_THICKNESS
                ||local.z()<VanStaging.FRONT||local.z()>=VanStaging.REAR-VanStaging.WALL_THICKNESS) {
            log("Return inside the expedition van to extract.");return false; }
        if(outcome==Outcome.ACTIVE) { finish(Outcome.RETREATED);log("Team withdrew with partial evidence. The haunting remains."); }
        else if(outcome==Outcome.CLEANSED) log("Site secured. Beckenburg case closed.");
        return outcome!=Outcome.LOST;
    }
    private double standingY(double x,double z){int room=map.roomAt(x,z);return room<0?0:map.floorY(room);}
    private void finish(Outcome result) {
        if(rewarded)return;
        outcome=result;rewarded=true;
        payouts=switch(result){case CLEANSED->220 + measuredTools.size()*40 + health/2 + (apparitionPhotographed?45:0);case RETREATED->measuredTools.size()*30 + (apparitionPhotographed?25:0);case LOST->0;case ACTIVE->0;};
    }
}
