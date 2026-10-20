package org.beckenburg;

import java.util.List;
import java.util.Objects;

/** Host-authored acoustic projection. Never transmit an unmanifested ghost's world coordinates.
 * Even when a hunter hears a ghost, the packet contains only quantized pan and amplitude.
 */
public final class LanSound {
    private LanSound() { }
    public enum Cue {
        WHISPER(6, 72, "A WHISPER NEARBY"),
        DISTURB(7, 90, "AN OBJECT MOVES"),
        MANIFEST(7, 100, "AN ENTITY MANIFESTS"),
        STRIKE(7, 96, "SPECTRAL ATTACK BUILDING"),
        SIGNATURE(9, 100, "A SIGNATURE HAUNTING ERUPTS"),
        FOOTFALL(3, 53, "SOMETHING IS MOVING"),
        DOOR(6, 80, "DOOR MOVEMENT"),
        EQUIPMENT(5, 70, "ELECTRONIC DEVICE"),
        RITUAL(9, 93, "RITUAL ACTIVITY"),
        STEP(3, 42, "INVESTIGATOR FOOTSTEPS"),
        STEP_STONE(3, 46, "STONE FOOTSTEPS"),
        STEP_CARPET(2, 35, "CARPET FOOTSTEPS"),
        STEP_WOOD(3, 42, "TIMBER FOOTSTEPS"),
        SWITCH(4, 48, "LIGHT SWITCH CLICK"),
        BREAKER(6, 79, "POWER BREAKER THROWS"),
        VAN_DOOR(6, 76, "CARGO DOOR MOTOR"),
        UI_CLICK(0, 34, "MENU SELECTION"),
        UI_BACK(0, 30, "MENU BACK"),
        PICKUP(4, 49, "ITEM PICKED UP"),
        SELECT(0, 28, "EQUIPMENT SELECTED"),
        DEVICE_ON(5, 55, "DEVICE ACTIVATED"),
        DEVICE_OFF(5, 42, "DEVICE SWITCHED OFF"),
        SCANNER(5, 60, "INSTRUMENT SCAN"),
        CAMERA(5, 83, "CAMERA SHUTTER"),
        BOOK(4, 48, "BOOK HANDLING"),
        WARD(7, 83, "DEFENSIVE WARD DEPLOYED"),
        POTION(3, 44, "MEDICINE USED"),
        RITUAL_START(9, 96, "RITUAL BEGINS"),
        RITUAL_END(9, 94, "RITUAL COMPLETED"),
        IMPACT(8, 97, "GHOST STRIKE IMPACT"),
        GHOST_DRIFT(6, 64, "SPECTRAL MOVEMENT"),
        DOTS_MOTOR(5, 57, "D.O.T.S. PROJECTOR STARTS"),
        DOTS_STOP(4, 47, "D.O.T.S. PROJECTOR STOPS"),
        SPARK(5, 69, "IGNITER SPARK"),
        INCENSE_BURN(5, 51, "INCENSE IGNITES"),
        FIRELIGHT_IGNITE(5, 61, "FIRELIGHT LIT"),
        FIRELIGHT_OUT(4, 48, "FIRELIGHT EXTINGUISHED"),
        TENSION_BUILD(9, 75, "SUPERNATURAL PRESSURE RISING"),
        LOCKED_DOOR_RATTLE(6, 76, "SEALED THRESHOLD RATTLES"),
        HORROR_STING_A(7, 81, "AN UNNATURAL NOISE"),
        HORROR_STING_B(7, 77, "A SUDDEN HAUNTING SOUND"),
        HORROR_STING_C(7, 85, "PARANORMAL DISTURBANCE"),
        DROP(4, 52, "ITEM SET DOWN"),
        ELECTRIC_HUM(5, 53, "ELECTRICAL SYSTEM HUM"),
        MONITOR_HUM(0, 34, "VAN MONITOR ACTIVATED"),
        PHONE_RING(7,76,"A TELEPHONE RINGS"),ALARM_BELL(6,73,"AN ALARM CLOCK RINGS"),
        FIRE_BELL(10,88,"A FIRE ALARM SOUNDS"),RADIO_PLAY(7,66,"A RADIO PLAYS"),RUNNING_WATER(5,58,"WATER IS RUNNING");
        final int acousticBudget, baseGain;
        final String caption;
        Cue(int budget, int gain, String caption) { acousticBudget=budget;baseGain=gain;this.caption=caption; }
        public String caption(){return caption;}
        public Tier tier(){return switch(this){
            case FOOTFALL,DOOR,EQUIPMENT,RITUAL,STEP,STEP_STONE,STEP_CARPET,STEP_WOOD,
                    SWITCH,BREAKER,VAN_DOOR,
                    UI_CLICK,UI_BACK,PICKUP,SELECT,DEVICE_ON,DEVICE_OFF,SCANNER,
                    CAMERA,BOOK,POTION,DOTS_MOTOR,DOTS_STOP,SPARK,
                    INCENSE_BURN,FIRELIGHT_IGNITE,FIRELIGHT_OUT,DROP,ELECTRIC_HUM,MONITOR_HUM,
                    PHONE_RING,ALARM_BELL,FIRE_BELL,RADIO_PLAY,RUNNING_WATER->Tier.AMBIENT;
            case WHISPER->Tier.MINOR;
            case DISTURB,MANIFEST,GHOST_DRIFT,WARD,HORROR_STING_A,
                    HORROR_STING_B,HORROR_STING_C,LOCKED_DOOR_RATTLE->Tier.MODERATE;
            case STRIKE,IMPACT,RITUAL_START,RITUAL_END,TENSION_BUILD->Tier.DANGEROUS;
            case SIGNATURE->Tier.SIGNATURE;
        };}
    }
    public enum Tier { AMBIENT, MINOR, MODERATE, DANGEROUS, SIGNATURE }
    public record CueEvent(Cue cue, int pan, int volume, int tick) {
        public CueEvent {
            Objects.requireNonNull(cue);
            if(pan< -100||pan>100||pan%25!=0||volume<1||volume>100||tick<0)
                throw new IllegalArgumentException("invalid audio cue parameters");
        }
        public String frame(){return "SOUND|"+cue+"|"+pan+"|"+volume+"|"+tick;}
    }
    /** Decode only the bounded host packet. A malformed frame is never passed to audio output. */
    public static CueEvent decode(String frame) {
        List<String> parts=LanProtocol.parts(frame);
        if(parts.size()!=5||!parts.get(0).equals("SOUND"))
            throw new IllegalArgumentException("invalid sound frame");
        return new CueEvent(Cue.valueOf(parts.get(1)),LanProtocol.integer(parts.get(2),-100,100),
                LanProtocol.integer(parts.get(3),1,100),LanProtocol.integer(parts.get(4),0,99999999));
    }
    /** Real outdoor wind and precipitation mask audible spatial sounds, not ghost evidence. */
    public static CueEvent weatherMask(CueEvent cue,MissionWeather.State weather,boolean outside){
        if(cue==null||weather==null)return cue;
        int volume=cue.volume()-weather.noiseMask()*(outside?3:1);
        return volume<12?null:new CueEvent(cue.cue(),cue.pan(),volume,cue.tick());
    }
    /** Null means the source is inaudible or invalid. Map geometry and doors are server-owned. */
    public static CueEvent project(HouseMap map, LanWorld.Body listener, int sourceRoom,
                                   double sourceX, double sourceZ, Cue cue, int tick) {
        if(map==null||sourceRoom<0||sourceRoom>=map.roomCount())return null;
        return project(map,listener,sourceRoom,sourceX,map.floorY(sourceRoom),sourceZ,cue,tick);
    }
    /** Source and listener elevations are authoritative standing surfaces. */
    public static CueEvent project(HouseMap map,LanWorld.Body listener,int sourceRoom,
            double sourceX,double sourceY,double sourceZ,Cue cue,int tick){
        if(map==null||listener==null||cue==null||tick<0||sourceRoom<0
                ||sourceRoom>=map.roomCount()||!Double.isFinite(sourceX)
                ||!Double.isFinite(sourceY)||!Double.isFinite(sourceZ)
                ||map.roomAt(sourceX,sourceY,sourceZ)!=sourceRoom)return null;
        boolean ghost=ghostSource(cue);
        if(ghost&&(sourceRoom==HouseMap.EXTRACTION_ROOM
                ||listener.room()==HouseMap.EXTRACTION_ROOM))return null;
        int absorption=ghost?LanAcoustics.cost(map,listener.room(),sourceRoom)
            :LanAcoustics.physicalCost(map,listener.room(),sourceRoom);
        if(absorption>cue.acousticBudget)return null;
        double dx=sourceX-listener.x(),dy=sourceY-listener.y(),dz=sourceZ-listener.z();
        double horizontal=Math.hypot(dx,dz),distance=Math.sqrt(dx*dx+dy*dy+dz*dz);
        // Nearby sounds remain useful; distance and material both lower their perceptibility.
        int gain=(int)Math.round(cue.baseGain-absorption*11-Math.max(0,distance-2)*2.0);
        if(gain<12)return null;
        gain=Math.min(100,gain);
        double angle=Math.toRadians(listener.heading());
        double right=-dx*Math.cos(angle)+dz*Math.sin(angle);
        int pan=horizontal<.01?0:(int)Math.round(4*right/horizontal)*25;
        pan=Math.max(-100,Math.min(100,pan));
        return new CueEvent(cue,pan,gain,tick);
    }
    private static boolean ghostSource(Cue cue){
        return switch(cue){
            case WHISPER,DISTURB,MANIFEST,STRIKE,SIGNATURE,FOOTFALL,IMPACT,GHOST_DRIFT,
                TENSION_BUILD,LOCKED_DOOR_RATTLE,HORROR_STING_A,HORROR_STING_B,HORROR_STING_C->true;
            default->false;
        };
    }
    /** Footfall material belongs to the floor finish, never the room number. */
    public static Cue stepCue(HouseMap map,int room){
        if(map==null||room<0||room>=map.roomCount())return Cue.STEP;
        String material=(map.level().room(room).finish()+" "+map.level().room(room).acoustic())
            .toLowerCase(java.util.Locale.ROOT);
        if(material.contains("carpet")||material.contains("soft"))return Cue.STEP_CARPET;
        if(material.contains("wood")||material.contains("timber")||material.contains("parquet"))return Cue.STEP_WOOD;
        if(material.contains("stone")||material.contains("tile")||material.contains("concrete")
            ||material.contains("brick")||material.contains("crypt"))return Cue.STEP_STONE;
        return Cue.STEP;
    }
}
