package org.beckenburg;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Objects;

/** Host-authoritative physical thrown crosses, thrown temporary wards and ground salt. */
public final class HunterCounters {
    public enum Kind { CROSS, WARD, SALT }
    public record Marker(int id,Kind kind,double x,double z,double height,int remaining) {
        public String frame(){return "COUNTER|"+id+"|"+kind+"|"+Math.round(x*1000)+"|"
                +Math.round(z*1000)+"|"+Math.round(height*1000)+"|"+remaining;}
    }
    public record Impact(boolean repelled, boolean saltTrack, boolean wardContact) { }
    private static final class Instance {
        final int id,owner,born;final Kind kind;double x,z;final double feetY;int steps,expires;
        boolean airborne,used;
        Instance(int id,int owner,Kind kind,double x,double feetY,double z,int born){
            this.id=id;this.owner=owner;this.kind=kind;this.x=x;this.z=z;this.feetY=feetY;this.born=born;
            airborne=kind!=Kind.SALT;expires=born+(kind==Kind.SALT?220:125);
        }
        double height(){return feetY+(airborne?Math.max(.12,1.32-.095*steps):.045);}
    }
    private final int[][] charges={{2,2,3},{2,2,3},{2,2,3},{2,2,3},{2,2,3},{2,2,3}};
    private final int[] lastThrow={-1000,-1000,-1000,-1000,-1000,-1000};
    private final List<Instance> active=new ArrayList<>();
    private int nextId=1;
    public int charges(int seat,Kind kind){validateSeat(seat);return charges[seat][kind.ordinal()];}
    private static void validateSeat(int seat){if(seat<0||seat>=6)throw new IllegalArgumentException("hunter seat required");}
    public void replenish(int seat){validateSeat(seat);charges[seat]=new int[]{2,2,3};}
    public Marker deploy(int seat,Kind kind,LanWorld.Body body,HouseMap map,int tick){
        validateSeat(seat);Objects.requireNonNull(kind);Objects.requireNonNull(body);Objects.requireNonNull(map);
        if(tick<0||body.room()!=map.roomAt(body.x(),body.y(),body.z())||!map.traversable(body.x(),body.y(),body.z()))
            throw new IllegalArgumentException("invalid physical deployment");
        if(body.room()==HouseMap.EXTRACTION_ROOM||body.room()<0)
            throw new IllegalArgumentException("use protective tools inside the investigation site");
        if(tick-lastThrow[seat]<6)throw new IllegalArgumentException("throw cooling down");
        if(charges[seat][kind.ordinal()]<=0)throw new IllegalArgumentException("no charges remaining");
        lastThrow[seat]=tick;charges[seat][kind.ordinal()]--;
        Instance item=new Instance(nextId++,seat,kind,body.x(),body.y(),body.z(),tick);
        active.add(item);
        return new Marker(item.id,item.kind,item.x,item.z,item.height(),item.expires-tick);
    }
    public Impact advance(HouseMap map,GhostIdentity.Type type,GhostDomain ghost,
                          LanGhostSpatial.Pose pose,int tick){
        Objects.requireNonNull(map);Objects.requireNonNull(type);Objects.requireNonNull(ghost);
        Objects.requireNonNull(pose);
        boolean repelled=false,tracked=false,warded=false;
        Iterator<Instance> it=active.iterator();
        while(it.hasNext()){
            Instance item=it.next();
            if(tick>=item.expires){trajectories.remove(item.id);it.remove();continue;}
            if(item.airborne){
                double nx=item.x+itemDirectionX(item.id),nz=item.z+itemDirectionZ(item.id);
                if(item.steps>=9||!map.traversable(nx,item.feetY,nz)){item.airborne=false;}
                else {item.x=nx;item.z=nz;item.steps++;if(item.steps>=9)item.airborne=false;}
            }
            if(item.used)continue;
            double d=Math.hypot(item.x-pose.x(),item.z-pose.z());
            if(pose.room()!=map.roomAt(item.x,item.feetY,item.z))continue;
            switch(item.kind){
                case CROSS -> {
                    if(d<=1.25&&ghost.manifested()){
                        ghost.repel(23);item.used=true;item.expires=tick+6;repelled=true;
                    }
                }
                case WARD -> {if(!item.airborne&&d<1.45){ghost.suppress(8);warded=true;}}
                case SALT -> {
                    if(d<=.9&&GhostTraits.saltAffects(type)){
                        ghost.reveal(32);ghost.slowFor(28);item.used=true;
                        item.expires=tick+35;tracked=true;
                    }
                }
            }
        }
        return new Impact(repelled,tracked,warded);
    }
    private final java.util.Map<Integer,double[]> trajectories=new java.util.HashMap<>();
    private final int[] lastUvTick=new int[HouseMap.ROOM_COUNT];
    public HunterCounters(){java.util.Arrays.fill(lastUvTick,-100000);}
    public void leaveUv(int room,int tick){
        if(room>=0&&room<HouseMap.EXTRACTION_ROOM&&tick>=0)lastUvTick[room]=tick;
    }
    public boolean recentUv(int room,int tick){
        return recentUv(room,tick,90);
    }
    /** Higher output UV lamps can still illuminate a genuinely ghost-authored,
     * fading trace. A stronger beam NEVER manufactures a trace.
     */
    public boolean recentUv(int room,int tick,int detectorPersistenceTicks){
        if(detectorPersistenceTicks<1||detectorPersistenceTicks>240)
            throw new IllegalArgumentException("invalid UV beam persistence");
        return room>=0&&room<HouseMap.EXTRACTION_ROOM&&tick>=0
            &&tick>=lastUvTick[room]
            &&tick-lastUvTick[room]<=detectorPersistenceTicks;
    }
    private double itemDirectionX(int id){return trajectories.getOrDefault(id,new double[]{0,0})[0];}
    private double itemDirectionZ(int id){return trajectories.getOrDefault(id,new double[]{0,0})[1];}
    /** Set the host-derived throw velocity. Never accept velocity from the client. */
    public Marker launch(int seat,Kind kind,LanWorld.Body body,HouseMap map,int tick){
        Marker result=deploy(seat,kind,body,map,tick);
        double rad=Math.toRadians(body.heading());
        trajectories.put(result.id(),new double[]{Math.sin(rad)*.45,Math.cos(rad)*.45});
        return result;
    }
    /** Active wards, not ritual seals, can briefly shelter nearby hunters during a strike. */
    public boolean wardsAt(double x,double z,int tick){return wardsAt(x,0,z,tick);}
    public boolean wardsAt(double x,double y,double z,int tick){
        for(Instance item:active)if(item.kind==Kind.WARD&&!item.airborne&&!item.used
                &&Math.abs(item.feetY-y)<.6&&tick<item.expires&&Math.hypot(item.x-x,item.z-z)<=1.45)return true;
        return false;
    }
    public List<Marker> snapshot(int tick){
        List<Marker> out=new ArrayList<>();
        for(Instance item:active)if(tick<item.expires)
            out.add(new Marker(item.id,item.kind,item.x,item.z,item.height(),item.expires-tick));
        return List.copyOf(out);
    }
}
