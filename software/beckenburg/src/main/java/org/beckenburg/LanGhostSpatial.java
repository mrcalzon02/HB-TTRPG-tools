package org.beckenburg;

import java.util.Objects;

/** Host-owned ghost spectator pose: within-room movement changes only viewpoint, not ghost powers.
 * GhostDomain remains sole authority for changing rooms, energy, manifestations and attacks.
 */
public final class LanGhostSpatial {
    public record Pose(int room,double x,double z,int heading) { }
    private final HouseMap map;
    private int room,heading=180,lastStepTick=-1,slowedUntil=-1;
    public void slowFor(int currentTick,int duration){
        if(currentTick<0||duration<1||duration>100)throw new IllegalArgumentException("invalid slow period");
        slowedUntil=Math.max(slowedUntil,currentTick+duration);
    }
    private double x,z;

    public LanGhostSpatial(HouseMap map,int startingRoom){
        this.map=Objects.requireNonNull(map);
        syncRoom(startingRoom);
    }
    public Pose pose(){return new Pose(room,x,z,heading);}
    public void syncRoom(int newRoom){
        if(newRoom<0||newRoom>=HouseMap.EXTRACTION_ROOM)throw new IllegalArgumentException("ghost cannot occupy safe van");
        if(newRoom!=room||x==0&&z==0){room=newRoom;x=map.centerX(room);z=map.centerZ(room);}
    }
    public boolean step(int dx,int dz,int tick){
        if(dx< -100||dx>100||dz< -100||dz>100||(dx==0&&dz==0))throw new IllegalArgumentException("invalid spectral input");
        if(tick<=lastStepTick)throw new IllegalArgumentException("ghost step rate exceeded");
        lastStepTick=tick;
        double length=Math.hypot(dx,dz);
        double speed=tick<slowedUntil?.105:.31;
        double nx=x+speed*dx/length,nz=z+speed*dz/length;
        // Move around furnishings; crossing room boundaries is a paid, cooldown-gated DRIFT only.
        if(map.roomAt(nx,nz)!=room||map.tile((int)nx,(int)nz)=='#')
            throw new IllegalArgumentException("spectral room boundary; use DRIFT");
        x=nx;z=nz;return true;
    }
    public void turn(int degrees){
        if(degrees<0||degrees>359)throw new IllegalArgumentException("invalid ghost heading");
        heading=degrees;
    }
    public String frame(int tick){
        return "GPOSE|"+room+"|"+Math.round(x*1000)+"|"+Math.round(z*1000)+"|"+heading+"|"+tick;
    }
}
