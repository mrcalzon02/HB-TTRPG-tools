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
        FIRELIGHT_OUT(4, 48, "FIRELIGHT EXTINGUISHED");
        final int acousticBudget, baseGain;
        final String caption;
        Cue(int budget, int gain, String caption) { acousticBudget=budget;baseGain=gain;this.caption=caption; }
        public String caption(){return caption;}
        public Tier tier(){return switch(this){
            case FOOTFALL,DOOR,EQUIPMENT,RITUAL,STEP,SWITCH,BREAKER,VAN_DOOR,
                    UI_CLICK,UI_BACK,PICKUP,SELECT,DEVICE_ON,DEVICE_OFF,SCANNER,
                    CAMERA,BOOK,POTION,DOTS_MOTOR,DOTS_STOP,SPARK,
                    INCENSE_BURN,FIRELIGHT_IGNITE,FIRELIGHT_OUT->Tier.AMBIENT;
            case WHISPER->Tier.MINOR;
            case DISTURB,MANIFEST,GHOST_DRIFT,WARD->Tier.MODERATE;
            case STRIKE,IMPACT,RITUAL_START,RITUAL_END->Tier.DANGEROUS;
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
    /** Null means the source is inaudible or invalid. Map geometry and doors are server-owned. */
    public static CueEvent project(HouseMap map, LanWorld.Body listener, int sourceRoom,
                                   double sourceX, double sourceZ, Cue cue, int tick) {
        if(map==null||listener==null||cue==null||tick<0||sourceRoom<0
                ||sourceRoom>=HouseMap.EXTRACTION_ROOM||listener.room()==HouseMap.EXTRACTION_ROOM
                ||!Double.isFinite(sourceX)||!Double.isFinite(sourceZ)
                ||map.roomAt(sourceX,sourceZ)!=sourceRoom)return null;
        int absorption=LanAcoustics.cost(map,listener.room(),sourceRoom);
        if(absorption>cue.acousticBudget)return null;
        double dx=sourceX-listener.x(), dz=sourceZ-listener.z();
        double distance=Math.hypot(dx,dz);
        // Nearby sounds remain useful; distance and material both lower their perceptibility.
        int gain=(int)Math.round(cue.baseGain-absorption*11-Math.max(0,distance-2)*2.0);
        if(gain<12)return null;
        gain=Math.min(100,gain);
        double angle=Math.toRadians(listener.heading());
        double right=dx*Math.cos(angle)-dz*Math.sin(angle);
        int pan=distance<.01?0:(int)Math.round(4*right/distance)*25;
        pan=Math.max(-100,Math.min(100,pan));
        return new CueEvent(cue,pan,gain,tick);
    }
}