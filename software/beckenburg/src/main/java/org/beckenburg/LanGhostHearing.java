package org.beckenburg;

import java.util.List;
import java.util.Objects;

/** Host-authored coarse acoustic perception for human ghosts; never hunter coordinates,
 * room, seat, health, equipment selection or private journal.
 */
public final class LanGhostHearing {
    private LanGhostHearing() { }
    public enum Direction { AHEAD, RIGHT, BEHIND, LEFT, HERE }
    public enum Strength { FAINT, NEAR, LOUD }
    public record Event(LanGhostPursuit.Sound source, Direction direction, Strength strength, int tick) {
        public Event {
            Objects.requireNonNull(source);
            Objects.requireNonNull(direction);
            Objects.requireNonNull(strength);
            if(tick<0||tick>99999999)throw new IllegalArgumentException("invalid ghost hearing tick");
        }
        public String frame(){return "GHEAR|"+source+"|"+direction+"|"+strength+"|"+tick;}
        public String caption(){
            String category=switch(source){
                case FOOTSTEP->"FOOTSTEPS";case DOOR->"DOOR MOVEMENT";
                case EQUIPMENT->"EQUIPMENT";case RITUAL->"RITUAL ACTIVITY";case VOICE->"DISTANT VOICES";
            };
            return category+" / "+direction+" / "+strength;
        }
    }
    public static Event decode(String frame){
        List<String> parts=LanProtocol.parts(frame);
        if(parts.size()!=5||!parts.get(0).equals("GHEAR"))
            throw new IllegalArgumentException("invalid hearing event");
        return new Event(LanGhostPursuit.Sound.valueOf(parts.get(1)),
            Direction.valueOf(parts.get(2)),Strength.valueOf(parts.get(3)),
            LanProtocol.integer(parts.get(4),0,99999999));
    }
    public static Event project(HouseMap map,LanGhostSpatial.Pose ghost,int sourceRoom,
                                double sourceX,double sourceZ,LanGhostPursuit.Sound kind,int tick){
        if(map==null||ghost==null||kind==null||tick<0||tick>99999999
            ||ghost.room()<0||ghost.room()>=HouseMap.EXTRACTION_ROOM
            ||sourceRoom<0||sourceRoom>=HouseMap.EXTRACTION_ROOM
            ||ghost.heading()<0||ghost.heading()>359
            ||!Double.isFinite(ghost.x())||!Double.isFinite(ghost.z())
            ||map.roomAt(ghost.x(),ghost.z())!=ghost.room()
            ||!Double.isFinite(sourceX)||!Double.isFinite(sourceZ)
            ||map.roomAt(sourceX,sourceZ)!=sourceRoom)return null;
        int absorption=LanAcoustics.cost(map,ghost.room(),sourceRoom);
        if(absorption>kind.budget)return null;
        double dx=sourceX-ghost.x(),dz=sourceZ-ghost.z();
        double distance=Math.hypot(dx,dz),heading=Math.toRadians(ghost.heading());
        double forward=dx*Math.sin(heading)+dz*Math.cos(heading);
        double right=dx*Math.cos(heading)-dz*Math.sin(heading);
        Direction bearing=distance<.5?Direction.HERE
            :Math.abs(forward)>=Math.abs(right)
                ?(forward>=0?Direction.AHEAD:Direction.BEHIND)
                :(right>=0?Direction.RIGHT:Direction.LEFT);
        Strength loudness=absorption==0&&distance<3?Strength.LOUD
            :absorption>=kind.budget||distance>7?Strength.FAINT:Strength.NEAR;
        return new Event(kind,bearing,loudness,tick);
    }
}
