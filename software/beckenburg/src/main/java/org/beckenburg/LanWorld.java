package org.beckenburg;

/** Shared-world host movement model, isolated from the legacy room-only demonstration.
 * Peers submit direction impulses; only this class owns collision and transforms.
 */
public final class LanWorld {
    public record Body(double x,double z,int heading,int room) { }
    private static final double SPEED=.31;
    private final HouseMap map;
    private final double[] xs=new double[3],zs=new double[3];
    private final int[] headings={90,90,90};
    private final int[] lastTick={-1,-1,-1};
    private final int[] lastDoorTick={-3,-3,-3};
    public LanWorld(HouseMap map){
        this.map=java.util.Objects.requireNonNull(map);
        for(int i=0;i<3;i++){
            setRoom(i,HouseMap.EXTRACTION_ROOM);
            xs[i]+=(i-1)*.88; // Distinct van spawn pads prevent cameras overlapping a teammate's head.
            if(!map.traversable(xs[i],zs[i]))throw new IllegalStateException("invalid van spawn pad");
        }
    }
    private static void seat(int id){if(id<0||id>2)throw new IllegalArgumentException("hunter seat required");}
    /** Room-only clients are synchronized to room centers; world-mode never uses this teleporter. */
    public void setRoom(int seat,int room){
        seat(seat);
        if(room<0||room>=HouseMap.ROOM_COUNT)throw new IllegalArgumentException("invalid room");
        xs[seat]=map.centerX(room);zs[seat]=map.centerZ(room);
    }
    public Body body(int seat){seat(seat);return new Body(xs[seat],zs[seat],headings[seat],map.roomAt(xs[seat],zs[seat]));}
    public boolean move(int seat,int dx,int dz,int tick){
        seat(seat);
        if(dx< -100||dx>100||dz< -100||dz>100||(dx==0&&dz==0))throw new IllegalArgumentException("invalid motion vector");
        if(tick<=lastTick[seat])throw new IllegalArgumentException("movement rate exceeded");
        lastTick[seat]=tick; // failed collisions still consume the per-tick movement allowance.
        double magnitude=Math.hypot(dx,dz);
        double x=xs[seat]+SPEED*dx/magnitude,z=zs[seat]+SPEED*dz/magnitude;
        // Forbid diagonal corner cutting; each axis must independently clear the collision radius.
        if(!map.traversable(x,z)||!map.traversable(x,zs[seat])||!map.traversable(xs[seat],z))
            throw new IllegalArgumentException("blocked by world collision");
        xs[seat]=x;zs[seat]=z;return true;
    }
    public void turn(int seat,int heading){seat(seat);if(heading<0||heading>=360)throw new IllegalArgumentException("invalid heading");headings[seat]=heading;}
    public boolean door(int seat,int tick){
        seat(seat);
        if(tick-lastDoorTick[seat]<3)throw new IllegalArgumentException("door interaction cooling down");
        if(!map.toggleNearestDoor(xs[seat],zs[seat]))return false;
        for(int i=0;i<3;i++)if(!map.traversable(xs[i],zs[i])){
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
