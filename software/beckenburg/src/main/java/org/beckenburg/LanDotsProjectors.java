package org.beckenburg;

import java.util.ArrayList;
import java.util.List;

/** One actual host-placed, ghost-event-based D.O.T.S. unit per investigator.
 * Light-grid presence is observable but never evidence by itself. A PASS
 * requires a genuine authorized ghost manifestation inside the projected field.
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
    public record Passage(Placement placement,int tick){
        public String frame(){return "DOTS|PASS|"+placement.room()+"|"+tick;}
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
            return null;
        }
        Placement placed=new Placement(seat,room,x,z,tier);
        positions[seat]=placed;
        return placed;
    }
    public List<Placement> all(){
        List<Placement> out=new ArrayList<>();
        for(Placement placement:positions)if(placement!=null)out.add(placement);
        return List.copyOf(out);
    }
    /** No false-positive projector silhouettes: the projector illuminates empty
     * space normally, but a distinctive passage only comes from a real ghost.
     */
    public List<Passage> passages(GhostIdentity.Type species,GhostDomain.Resolution event,
                                  LanGhostSpatial.Pose pose,int tick){
        if(species==null||event==null||pose==null||!event.applied()
            ||!(event.action()==GhostDomain.Action.MANIFEST
                ||event.action()==GhostDomain.Action.SIGNATURE)
            ||!GhostEvidenceProfile.compatible(species,GhostFieldGuide.Clue.DOTS_PATTERN))
            return List.of();
        List<Passage> hits=new ArrayList<>();
        for(Placement p:positions){
            if(p==null||p.room()!=event.room()||tick-lastPass[p.seat()]<12)continue;
            double radius=EquipmentTiers.stage("DOTS_PROJECTOR",p.tier()).reachCm()/100.0;
            if(Math.hypot(pose.x()-p.x(),pose.z()-p.z())>radius)continue;
            lastPass[p.seat()]=tick;
            hits.add(new Passage(p,tick));
        }
        return List.copyOf(hits);
    }
}
