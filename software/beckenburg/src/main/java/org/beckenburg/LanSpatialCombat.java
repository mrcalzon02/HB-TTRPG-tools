package org.beckenburg;

import java.util.Objects;

/** Pure host-side contact test. It never reveals hunter positions to a ghost client. */
public final class LanSpatialCombat {
    public static final double STRIKE_RANGE = 2.0;
    private LanSpatialCombat() { }

    /** Legacy room-only seats remain room-abstract; physical hunter seats need proximity and sight.
     * Exactly one 3D hunter can be hit per strike, selected by distance then seat order.
     */
    public static boolean[] victims(HouseMap map, LanWorld world, LanGhostSpatial.Pose ghost,
                                    int[] hunterRooms, boolean[] connected, boolean[] spatial) {
        Objects.requireNonNull(map); Objects.requireNonNull(world); Objects.requireNonNull(ghost);
        if(hunterRooms.length!=3||connected.length!=3||spatial.length!=3)
            throw new IllegalArgumentException("exactly three hunter seats required");
        boolean[] selected=new boolean[3];
        double best=STRIKE_RANGE*STRIKE_RANGE;
        int closest=-1;
        for(int i=0;i<3;i++) {
            if(!connected[i]||hunterRooms[i]!=ghost.room())continue;
            if(!spatial[i]) { selected[i]=true; continue; } // Existing room-level compatibility.
            LanWorld.Body body=world.body(i);
            if(body.room()!=ghost.room())continue;
            double dx=body.x()-ghost.x(), dz=body.z()-ghost.z();
            double d2=dx*dx+dz*dz;
            if(d2>best||!lineOfSight(map,ghost.x(),ghost.z(),body.x(),body.z()))continue;
            if(closest<0||d2<best-1.0e-9){best=d2;closest=i;}
        }
        if(closest>=0)selected[closest]=true;
        return selected;
    }
    public static boolean any(boolean[] victims){for(boolean victim:victims)if(victim)return true;return false;}

    /** Check fixed geometry and closed doors with short ray samples; no client coordinates involved. */
    static boolean lineOfSight(HouseMap map,double x0,double z0,double x1,double z1) {
        double dist=Math.hypot(x1-x0,z1-z0);
        if(!Double.isFinite(dist)||dist>STRIKE_RANGE||dist<0)return false;
        int steps=Math.max(1,(int)Math.ceil(dist/.12));
        for(int i=1;i<steps;i++){
            double t=(double)i/steps;
            int x=(int)Math.floor(x0+(x1-x0)*t),z=(int)Math.floor(z0+(z1-z0)*t);
            if(map.solid(x,z))return false;
        }
        return true;
    }
}
