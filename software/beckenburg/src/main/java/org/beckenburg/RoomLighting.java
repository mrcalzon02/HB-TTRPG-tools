package org.beckenburg;

import java.util.Arrays;

/** Authoritative per-room light circuits and time-bounded supernatural interference. */
public final class RoomLighting {
    public enum Interference { MINOR, MODERATE, DANGEROUS, SIGNATURE }
    /** Centre of a plate on its supporting wall. Y is the plate height, not the floor. */
    public record Switch(int room,double x,double y,double z,double yaw) {
        public Switch(int room,double x,double z){this(room,x,1.20,z,Math.PI/2);}
    }
    private final boolean[] on=new boolean[HouseMap.INDOOR_ROOMS];
    private final int[] start=new int[HouseMap.INDOOR_ROOMS],until=new int[HouseMap.INDOOR_ROOMS];
    private final Interference[] disruption=new Interference[HouseMap.INDOOR_ROOMS];
    private boolean breaker=true;
    public RoomLighting(){Arrays.fill(on,true);}
    public boolean breaker(){return breaker;}
    public void setBreaker(boolean value){breaker=value;}
    public boolean on(int room){valid(room);return on[room];}
    public boolean toggle(int room){valid(room);return on[room]=!on[room];}
    private static void valid(int room){
        if(room<0||room>=HouseMap.INDOOR_ROOMS)throw new IllegalArgumentException("interior room required");
    }
    /** Compatibility adapter for callers that select the default house. */
    public static Switch location(int room){
        valid(room);
        return location(new HouseMap(),room);
    }
    /** Architectural sockets preserve the actual wall plane on every storey. */
    public static Switch location(HouseMap map,int room){
        if(map==null)throw new IllegalArgumentException("map required");
        valid(room);
        LevelDefinition.Socket socket=map.level().socket("switch",room);
        if(socket==null)throw new IllegalStateException("Missing switch socket for room "+room);
        return new Switch(room,socket.x(),socket.y(),socket.z(),socket.yaw());
    }
    /** The single service-panel socket is authored alongside the room circuits. */
    public static LevelDefinition.Socket breaker(HouseMap map){
        if(map==null)throw new IllegalArgumentException("map required");
        return map.level().sockets().stream().filter(s->s.type().equals("breaker")).findFirst()
            .orElseThrow(()->new IllegalStateException("Missing breaker socket"));
    }
    /** Physical aim and line-of-sight: no remote switch activation from a different room. */
    public int aimed(HouseMap map,double x,double z,double yaw){
        if(map==null)return -1;
        int room=map.roomAt(x,z);
        return room<0?-1:aimed(map,x,map.floorY(room),z,yaw);
    }
    public int aimed(HouseMap map,double x,double feetY,double z,double yaw){
        if(map==null||!Double.isFinite(x)||!Double.isFinite(feetY)
                ||!Double.isFinite(z)||!Double.isFinite(yaw))return -1;
        int room=map.roomAt(x,feetY,z);
        if(room<0||room>=HouseMap.INDOOR_ROOMS)return -1;
        Switch sw=location(map,room);
        return reachable(map,x,feetY,z,yaw,sw.x(),sw.y(),sw.z())?room:-1;
    }
    public static boolean breakerAimed(HouseMap map,double x,double feetY,double z,double yaw){
        if(map==null||!Double.isFinite(x)||!Double.isFinite(feetY)
                ||!Double.isFinite(z)||!Double.isFinite(yaw))return false;
        LevelDefinition.Socket panel=breaker(map);
        return map.roomAt(x,feetY,z)==panel.room()
            &&reachable(map,x,feetY,z,yaw,panel.x(),panel.y(),panel.z());
    }
    private static boolean reachable(HouseMap map,double x,double y,double z,double yaw,
            double targetX,double targetY,double targetZ){
        double dx=targetX-x,dz=targetZ-z,d=Math.hypot(dx,dz);
        if(d<.18||d>1.85||Math.abs(targetY-(y+1.20))>.85)return false;
        double facing=(dx*Math.sin(yaw)+dz*Math.cos(yaw))/d;
        // Stop slightly in front of the plate so its supporting wall is not an obstruction.
        return facing>=.55&&map.clearLineOfSight(x,y+1.30,z,
            targetX-dx/d*.035,targetY,targetZ-dz/d*.035);
    }
    /** Snapshot is only 12 state bits plus breaker; never includes hidden ghost details. */
    public String snapshot(){
        StringBuilder b=new StringBuilder();for(boolean light:on)b.append(light?'1':'0');
        return b.toString();
    }
    public void acceptSnapshot(String encoded){
        if(encoded==null||!encoded.matches("[01]{12}"))throw new IllegalArgumentException("bad room-light snapshot");
        for(int i=0;i<on.length;i++)on[i]=encoded.charAt(i)=='1';
    }
    public void pulse(int room,Interference mode,int tick){
        valid(room);if(mode==null||tick<0)throw new IllegalArgumentException("bad disturbance");
        int length=switch(mode){case MINOR->22;case MODERATE->42;
            case DANGEROUS->70;case SIGNATURE->100;};
        pulseUntil(room,mode,tick,tick+length);
    }
    public void pulseUntil(int room,Interference mode,int from,int to){
        valid(room);
        if(mode==null||from<0||to<from||to-from>100)throw new IllegalArgumentException("invalid light event");
        if(to>=until[room]){
            start[room]=from;until[room]=to;disruption[room]=mode;
        }
    }
    public Interference interference(int room,int tick){
        valid(room);
        return tick>=start[room]&&tick<until[room]?disruption[room]:null;
    }
    /** Factor 0..1; deterministic per simulation tick for both peers and headless tests. */
    public double brightness(int room,int tick){
        if(room<0||room>=HouseMap.INDOOR_ROOMS)return 1;
        double base=breaker&&on[room]?.95:.085;
        Interference mode=interference(room,tick);
        if(mode==null||!breaker||!on[room])return base;
        // Irregular but synchronized flicker: no client RNG or per-frame random flash.
        int noise=Math.floorMod((tick/2*1103515245)^((room+13)*761),17);
        return switch(mode){
            case MINOR -> base*(noise<4?.52:1.0);
            case MODERATE -> base*(noise<9?.23:.75);
            case DANGEROUS -> base*(noise<13?.065:.44);
            case SIGNATURE -> base*(noise<15?.045:.38);
        };
    }
}
