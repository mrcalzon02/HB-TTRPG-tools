package org.beckenburg;

import java.util.ArrayList;
import java.util.List;

/** Physical D.O.T.S. light: ghost presence distorts projected light regardless of
 * species, evidence table or prior ability use. Interpretation belongs to players.
 */
public final class LanDotsProjectors {
    public record Placement(int seat,int room,double x,double z,
                            EquipmentTiers.Tier tier){
        public Placement{
            if(seat<0||seat>=6||room<0||room>=HouseMap.INDOOR_ROOMS
                ||tier==null||!Double.isFinite(x)||!Double.isFinite(z))
                throw new IllegalArgumentException("invalid D.O.T.S. placement");
        }
        public String frame(){
            return "DOTS|PLACE|"+seat+"|"+room+"|"+Math.round(x*1000)
                +"|"+Math.round(z*1000)+"|"+tier;
        }
    }
    public record Passage(Placement placement,int tick,double x,double z){
        public String frame(){return "DOTS|ILLUMINATE|"+placement.room()+"|"+tick
            +"|"+Math.round(x*1000)+"|"+Math.round(z*1000);}
    }
    private final Placement[] positions=new Placement[6];
    private final int[] lastPass=new int[6];
    public LanDotsProjectors(){java.util.Arrays.fill(lastPass,-100000);}
    public Placement at(int seat){
        if(seat<0||seat>=6)throw new IllegalArgumentException("hunter seat");
        return positions[seat];
    }
    public Placement placeOrRemove(int seat,int room,double x,double z,
                                   EquipmentTiers.Tier tier){
        if(positions[seat]!=null){
            if(Math.hypot(x-positions[seat].x(),z-positions[seat].z())>1.6)
                throw new IllegalArgumentException("retrieve projector at its physical location");
            positions[seat]=null;
            lastPass[seat]=-100000;
            return null;
        }
        Placement placed=new Placement(seat,room,x,z,tier);
        positions[seat]=placed;
        lastPass[seat]=-100000;
        return placed;
    }
    public List<Placement> all(){
        List<Placement> out=new ArrayList<>();
        for(Placement placement:positions)if(placement!=null)out.add(placement);
        return List.copyOf(out);
    }
    /** Actual laser-space intersection sampled at 10 Hz; nothing is classified. */
    public List<Passage> illuminate(LanGhostSpatial.Pose pose,int tick){
        if(pose==null||tick<0||pose.room()<0||pose.room()>=HouseMap.INDOOR_ROOMS
                ||!Double.isFinite(pose.x())||!Double.isFinite(pose.z()))
            return List.of();
        List<Passage> hits=new ArrayList<>();
        for(Placement p:positions){
            if(p==null||p.room()!=pose.room()||tick-lastPass[p.seat()]<2)continue;
            double radius=EquipmentTiers.stage("DOTS_PROJECTOR",p.tier()).reachCm()/100.0;
            if(Math.hypot(pose.x()-p.x(),pose.z()-p.z())>radius)continue;
            lastPass[p.seat()]=tick;
            hits.add(new Passage(p,tick,pose.x(),pose.z()));
        }
        return List.copyOf(hits);
    }
}
