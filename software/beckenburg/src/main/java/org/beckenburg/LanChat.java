package org.beckenburg;

import java.util.List;
import java.util.Objects;

/** Immutable bounded chat frames; game messages are ASCII and never include raw separators. */
public final class LanChat {
    public enum Channel { LOCAL, RADIO }
    public static final int MAX_CHARS=80;
    private LanChat(){}

    public static String clean(String raw){
        if(raw==null||raw.isBlank()||raw.length()>MAX_CHARS)
            throw new IllegalArgumentException("chat must be 1-80 characters");
        String message=raw.strip();
        if(message.isEmpty()||message.length()>MAX_CHARS)
            throw new IllegalArgumentException("empty chat");
        for(int i=0;i<message.length();i++){
            char c=message.charAt(i);
            if(c<32||c>126||c=='|')throw new IllegalArgumentException("invalid chat character");
        }
        return message;
    }

    /** Validate room topology AND physical distance, not hunter-provided recipient lists. */
    public static boolean localVisible(HouseMap map,LanWorld.Body from,LanWorld.Body to){
        Objects.requireNonNull(map);Objects.requireNonNull(from);Objects.requireNonNull(to);
        double distance=Math.hypot(from.x()-to.x(),from.z()-to.z());
        if(!Double.isFinite(distance)||distance>10.0)return false;
        if(from.room()==to.room())return true;
        // Sound travels through open doors most efficiently. Closed doors can still
        // transmit nearby voices, but the budget is smaller than an entire building.
        if(from.room()==HouseMap.EXTRACTION_ROOM||to.room()==HouseMap.EXTRACTION_ROOM)
            return distance<=4.0 && map.clearLineOfSight(from.x(),from.z(),to.x(),to.z());
        return LanAcoustics.cost(map,from.room(),to.room())<=3
            &&distance<=6.0;
    }

    public record Entry(Channel channel,int seat,int tick,String message){
        public Entry {
            Objects.requireNonNull(channel);
            if(seat<0||seat>=6||tick<0||tick>99999999)
                throw new IllegalArgumentException("invalid chat origin");
            message=clean(message);
        }
        public String frame(){return "CHAT|"+channel+"|"+seat+"|"+tick+"|"+message;}
        public static Entry decode(String frame){
            List<String> parts=LanProtocol.parts(frame);
            if(parts.size()!=5||!parts.get(0).equals("CHAT"))
                throw new IllegalArgumentException("invalid chat packet");
            return new Entry(Channel.valueOf(parts.get(1)),
                LanProtocol.integer(parts.get(2),0,5),
                LanProtocol.integer(parts.get(3),0,99999999),parts.get(4));
        }
    }
}
