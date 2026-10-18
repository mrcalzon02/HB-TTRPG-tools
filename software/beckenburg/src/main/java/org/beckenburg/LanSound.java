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
        RITUAL(9, 93, "RITUAL ACTIVITY");
        final int acousticBudget, baseGain;
        final String caption;
        Cue(int budget, int gain, String caption) { acousticBudget=budget;baseGain=gain;this.caption=caption; }
        public String caption(){return caption;}
        public Tier tier(){return switch(this){
            case FOOTFALL,DOOR,EQUIPMENT,RITUAL->Tier.AMBIENT;
            case WHISPER->Tier.MINOR;
            case DISTURB,MANIFEST->Tier.MODERATE;
            case STRIKE->Tier.DANGEROUS;
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