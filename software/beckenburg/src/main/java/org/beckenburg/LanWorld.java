package org.beckenburg;

/** Shared-world host movement model, isolated from the legacy room-only demonstration.
 * Peers submit direction impulses; only this class owns collision and transforms.
 */
public final class LanWorld {
    public record Body(double x,double z,int heading,int room) { }
    private static final double SPEED=.31;
    private final HouseMap map;
    private final double[] xs=new double[6],zs=new double[6];
    private final int[] headings={270,270,270,270,270,270};
    private final int[] lastTick={-1,-1,-1,-1,-1,-1};
    private final int[] lastDoorTick={-3,-3,-3,-3,-3,-3};
    private double playerSpeed=1.0,sprintSpeed=1.5;
    private int hidingDensity=70;
    private final boolean[] hiding=new boolean[6];
    private boolean exitSealed;
    /** The investigation/van boundary is sealed only while a true Frenzy is active. */
    public void setExitSealed(boolean sealed){exitSealed=sealed;}
    public boolean exitSealed(){return exitSealed;}
    public boolean hidden(int seat){seat(seat);return hiding[seat];}
    public boolean toggleHide(int seat){
        seat(seat);
        if(hiding[seat]){hiding[seat]=false;return false;}
        var pocket=map.hidingSpot(body(seat).room(),hidingDensity);
        if(pocket==null||Math.hypot(xs[seat]-pocket.x(),zs[seat]-pocket.z())>.84)
            throw new IllegalArgumentException("no hiding place within reach");
        hiding[seat]=true;return true;
    }
    private CustomContract.Sprint sprint=CustomContract.Sprint.LIMITED;
    private final int[] stamina={40,40,40,40,40,40};
    public void configure(CustomContract c){
        playerSpeed=c.playerSpeed()/100.0;sprintSpeed=c.sprintSpeed()/100.0;sprint=c.sprint();
        hidingDensity=c.hidingSpots();
    }
    public LanWorld(HouseMap map){
        this.map=java.util.Objects.requireNonNull(map);
        for(int i=0;i<6;i++){
            setRoom(i,HouseMap.EXTRACTION_ROOM);
            xs[i]+=(i-2.5)*.54; // Distinct van spawn pads prevent cameras overlapping a teammate's head.
            if(!map.traversable(xs[i],zs[i]))throw new IllegalStateException("invalid van spawn pad");
        }
    }
    private static void seat(int id){if(id<0||id>=6)throw new IllegalArgumentException("hunter seat required");}
    /** Room-only clients are synchronized to room centers; world-mode never uses this teleporter. */
    public void setRoom(int seat,int room){
        seat(seat);
        if(room<0||room>=HouseMap.ROOM_COUNT)throw new IllegalArgumentException("invalid room");
        xs[seat]=map.centerX(room);zs[seat]=map.centerZ(room);hiding[seat]=false;
    }
    public Body body(int seat){seat(seat);return new Body(xs[seat],zs[seat],headings[seat],map.roomAt(xs[seat],zs[seat]));}
    public boolean move(int seat,int dx,int dz,int tick){return move(seat,dx,dz,tick,false);}
    public boolean move(int seat,int dx,int dz,int tick,boolean wantsSprint){
        seat(seat);
        if(dx< -100||dx>100||dz< -100||dz>100||(dx==0&&dz==0))throw new IllegalArgumentException("invalid motion vector");
        if(tick<=lastTick[seat])throw new IllegalArgumentException("movement rate exceeded");
        lastTick[seat]=tick; // failed collisions still consume the per-tick movement allowance.
        double magnitude=Math.hypot(dx,dz);
        boolean running=wantsSprint&&sprint!=CustomContract.Sprint.DISABLED
            &&(sprint==CustomContract.Sprint.UNLIMITED||stamina[seat]>0);
        double speed=SPEED*playerSpeed*(running?sprintSpeed:1);
        if(running&&sprint==CustomContract.Sprint.LIMITED)stamina[seat]--;
        else if(!running&&tick%2==0)stamina[seat]=Math.min(40,stamina[seat]+1);
        double x=xs[seat]+speed*dx/magnitude,z=zs[seat]+speed*dz/magnitude;
        if(exitSealed && map.roomAt(xs[seat],zs[seat])!=HouseMap.EXTRACTION_ROOM
                &&map.roomAt(x,z)==HouseMap.EXTRACTION_ROOM)
            throw new IllegalArgumentException("frenzy sealed the van extraction threshold");
        // Forbid diagonal corner cutting; each axis must independently clear the collision radius.
        if(!map.traversable(x,z)||!map.traversable(x,zs[seat])||!map.traversable(xs[seat],z))
            throw new IllegalArgumentException("blocked by world collision");
        xs[seat]=x;zs[seat]=z;hiding[seat]=false;return true;
    }
    public void turn(int seat,int heading){seat(seat);if(heading<0||heading>=360)throw new IllegalArgumentException("invalid heading");headings[seat]=heading;}
    public boolean door(int seat,int tick){
        seat(seat);
        if(tick-lastDoorTick[seat]<3)throw new IllegalArgumentException("door interaction cooling down");
        if(!map.toggleNearestDoor(xs[seat],zs[seat]))return false;
        for(int i=0;i<6;i++)if(!map.traversable(xs[i],zs[i])){
            // Never close the door through a player's physical capsule.
            map.toggleNearestDoor(xs[seat],zs[seat]);
            throw new IllegalArgumentException("door occupied");
        }
        lastDoorTick[seat]=tick;return true;
    }
    public String bodyFrame(int seat,int tick){
        Body b=body(seat);
        return "BODY|"+seat+"|"+Math.round(b.x()*1000)+"|"+Math.round(b.z()*1000)+"|"+b.heading()+"|"+tick;
    }
}