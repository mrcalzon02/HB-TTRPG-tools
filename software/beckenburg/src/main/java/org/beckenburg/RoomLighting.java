package org.beckenburg;

import java.util.Arrays;

/** Authoritative per-room light circuits and time-bounded supernatural interference. */
public final class RoomLighting {
    public enum Interference { MINOR, MODERATE, DANGEROUS, SIGNATURE }
    public record Switch(int room,double x,double z) { }
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
    /** Wall-mounted plates are well inside playable floor space, never inside a threshold. */
    public static Switch location(int room){
        valid(room);
        return new Switch(room,room%HouseMap.COLS*8+1.22,room/HouseMap.COLS*6+2.70);
    }
    /** Physical aim and line-of-sight: no remote switch activation from a different room. */
    public int aimed(HouseMap map,double x,double z,double yaw){
        if(map==null||!Double.isFinite(x)||!Double.isFinite(z)||!Double.isFinite(yaw))return -1;
        int room=map.roomAt(x,z);
        if(room<0||room>=HouseMap.INDOOR_ROOMS)return -1;
        Switch sw=location(room);
        double dx=sw.x-x,dz=sw.z-z,d=Math.hypot(dx,dz);
        if(d<.25||d>1.85)return -1;
        double facing=(dx*Math.sin(yaw)+dz*Math.cos(yaw))/d;
        return facing>=.55&&map.clearLineOfSight(x,z,sw.x,sw.z)?room:-1;
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