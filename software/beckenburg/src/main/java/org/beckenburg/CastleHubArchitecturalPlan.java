package org.beckenburg;

import java.util.ArrayList;
import java.util.List;

/**
 * Castle Beckenburg's authored architectural surfaces, in metres.
 * Wall runs, full-height portal dimensions, upper floors and staircase are
 * independent of the legacy cell map. The latter remains only a collision
 * acceleration structure and must agree with the authored openings.
 */
public final class CastleHubArchitecturalPlan {
    private CastleHubArchitecturalPlan(){}
    public static final double GROUND_CEILING=3.40;
    public static final double UPPER_CEILING=6.80;
    public static final double DOOR_HEIGHT=2.70;
    public static final double DOOR_WIDTH=2.50;

    public record Wall(double x0,double z0,double x1,double z1,
                       double bottom,double top,int material,
                       double portalCenter,double portalWidth) {
        public boolean hasDoor(){return Double.isFinite(portalCenter);}
        public boolean horizontal(){return Math.abs(z1-z0)<.001;}
        public double length(){return horizontal()?Math.abs(x1-x0):Math.abs(z1-z0);}
    }
    public record Deck(double x0,double z0,double x1,double z1,
                       double height,int material){}
    public record Trim(String mesh,double x,double y,double z,
                       double sx,double sy,double sz,double yaw){}
    private static final List<Wall> WALLS=buildWalls();
    private static final List<Deck> DECKS=List.of(
        // Functional second storey: library above the contract hall.
        new Deck(10.8,1.2,19.0,10.7,GROUND_CEILING,MaterialAtlas.PARQUET),
        // Continuous stone gallery reaches the stair landing without a teleport.
        new Deck(16.0,10.7,19.0,22.0,GROUND_CEILING,MaterialAtlas.STONE),
        // Upper library is sheltered by a genuine higher ceiling.
        new Deck(10.8,1.2,19.0,10.7,UPPER_CEILING,MaterialAtlas.CEILING)
    );
    private static final List<Trim> TRIMS=List.of(
        // Imported medieval architectural sources used as measured trim, not
        // hundreds of enlarged copies pretending to be walls.
        new Trim("kenney_medieval_column",10.55,0,11.48,.44,3.30,.44,0),
        new Trim("kenney_medieval_column",19.52,0,11.48,.44,3.30,.44,0),
        new Trim("kenney_medieval_column",13.5,0,11.48,.44,3.30,.44,0),
        new Trim("kenney_medieval_column",5.5,0,11.48,.44,3.30,.44,0),
        new Trim("kenney_medieval_column",22.5,0,11.48,.44,3.30,.44,0),
        new Trim("kenney_medieval_column",10.65,GROUND_CEILING,10.60,.44,3.30,.44,0),
        new Trim("kenney_medieval_column",19.10,GROUND_CEILING,10.60,.44,3.30,.44,0),
        new Trim("kenney_medieval_tower_base",.5,0,11.5,1.7,1.7,1.7,0),
        new Trim("kenney_medieval_tower",.5,1.7,11.5,1.7,1.65,1.7,0),
        new Trim("kenney_medieval_tower_top",.5,3.35,11.5,1.75,1,1.75,0),
        new Trim("kenney_medieval_tower_base",43.5,0,18,1.7,1.7,1.7,0),
        new Trim("kenney_medieval_tower",43.5,1.7,18,1.7,1.65,1.7,0),
        new Trim("kenney_medieval_tower_top",43.5,3.35,18,1.75,1,1.75,0)
    );
    private static List<Wall> buildWalls(){
        List<Wall> out=new ArrayList<>();
        // Ground plan: a sequence of measured masonry and partition walls.
        // Door openings are 2.5m wide and 2.7m high, with proper lintels.
        horizontal(out,1.0,1.0,28.0,0,GROUND_CEILING,MaterialAtlas.STONE);
        horizontal(out,4.0,29.0,43.0,0,GROUND_CEILING,MaterialAtlas.STONE);
        horizontal(out,34.0,1.0,43.0,0,GROUND_CEILING,MaterialAtlas.STONE);
        vertical(out,1.0,1.0,34.0,0,GROUND_CEILING,MaterialAtlas.STONE);
        vertical(out,43.0,4.0,34.0,0,GROUND_CEILING,MaterialAtlas.STONE);
        // True full-height interior separations and archways.
        vertical(out,10.5,1.0,11.2,0,GROUND_CEILING,MaterialAtlas.STONE,6.5);
        vertical(out,19.5,1.0,11.2,0,GROUND_CEILING,MaterialAtlas.STONE,6.5);
        horizontal(out,11.5,1.0,28.5,0,GROUND_CEILING,MaterialAtlas.STONE,5.5,13.5,22.5);
        vertical(out,10.5,11.5,34.0,0,GROUND_CEILING,MaterialAtlas.STONE,16.5,25.5);
        vertical(out,20.5,11.5,34.0,0,GROUND_CEILING,MaterialAtlas.STONE,16.5,25.5);
        vertical(out,28.5,1.0,17.5,0,GROUND_CEILING,MaterialAtlas.STONE,7.5);
        vertical(out,28.5,17.5,34.0,0,GROUND_CEILING,MaterialAtlas.STONE,24.5);
        horizontal(out,17.5,28.5,43.0,0,GROUND_CEILING,MaterialAtlas.STONE,35.5);
        // Visible architectural second storey; the south-facing gallery has
        // an actual upper opening into the library, not an unreachable façade.
        horizontal(out,1.2,10.8,19.0,GROUND_CEILING,UPPER_CEILING,MaterialAtlas.STONE);
        vertical(out,10.8,1.2,10.7,GROUND_CEILING,UPPER_CEILING,MaterialAtlas.STONE);
        vertical(out,19.0,1.2,10.7,GROUND_CEILING,UPPER_CEILING,MaterialAtlas.STONE);
        horizontal(out,10.7,10.8,19.0,GROUND_CEILING,UPPER_CEILING,MaterialAtlas.STONE,17.5);
        return List.copyOf(out);
    }
    private static void horizontal(List<Wall> out,double z,double from,double to,
                                   double y0,double y1,int material,double... doors){
        split(out,from,to,z,true,y0,y1,material,doors);
    }
    private static void vertical(List<Wall> out,double x,double from,double to,
                                 double y0,double y1,int material,double... doors){
        split(out,from,to,x,false,y0,y1,material,doors);
    }
    private static void split(List<Wall> out,double from,double to,double fixed,
                              boolean horizontal,double y0,double y1,int material,double[] doors){
        // Each physically authored opening creates wall shoulders and its own
        // upper lintel. No opaque mesh seals the top of an opening.
        double cursor=from;
        for(double door:doors){
            double l=door-DOOR_WIDTH/2,r=door+DOOR_WIDTH/2;
            if(l<cursor+.01||r>to-.01)throw new IllegalArgumentException("door outside wall");
            add(out,cursor,l,fixed,horizontal,y0,y1,material);
            add(out,l,r,fixed,horizontal,y0+DOOR_HEIGHT,y1,material);
            // A zero-height portal marker lets tests verify the true opening.
            out.add(new Wall(horizontal?l:fixed,horizontal?fixed:l,
                horizontal?r:fixed,horizontal?fixed:r,y0,y0,material,door,DOOR_WIDTH));
            cursor=r;
        }
        add(out,cursor,to,fixed,horizontal,y0,y1,material);
    }
    private static void add(List<Wall> out,double a,double b,double fixed,
                            boolean horizontal,double y0,double y1,int material){
        if(b-a<.02||y1-y0<.02)return;
        out.add(new Wall(horizontal?a:fixed,horizontal?fixed:a,
            horizontal?b:fixed,horizontal?fixed:b,y0,y1,material,
            Double.NaN,0));
    }
    /** Exact continuous wall-surface test for switches and candle brackets.
     * Validates vertical range, segment endpoints and facing, so an apparent
     * floating object cannot pass merely because a solid grid cell is nearby.
     */
    public static boolean mountingWall(double x,double y,double z,double yaw){
        if(!Double.isFinite(x+y+z+yaw))return false;
        double fx=Math.sin(yaw),fz=Math.cos(yaw);
        for(Wall wall:WALLS){
            if(wall.hasDoor()||y<wall.bottom()+.04||y>wall.top()-.04)continue;
            double wx,wz;
            if(wall.horizontal()){
                wx=Math.max(Math.min(x,wall.x1()),wall.x0());
                wz=wall.z0();
            }else{
                wx=wall.x0();
                wz=Math.max(Math.min(z,wall.z1()),wall.z0());
            }
            double vx=wx-x,vz=wz-z;
            double distance=Math.hypot(vx,vz);
            if(distance>=.08&&distance<=.28&&vx*fx+vz*fz>distance*.65)
                return true;
        }
        return false;
    }
    public static List<Wall> walls(){return WALLS;}
    public static List<Deck> decks(){return DECKS;}
    public static List<Trim> trims(){return TRIMS;}

    public static boolean onStairs(double x,double z){
        return x>=16&&x<=19&&z>=22&&z<=32;
    }
    public static double stairHeight(double x,double z){
        if(!onStairs(x,z))return 0;
        return Math.max(0,Math.min(GROUND_CEILING,(32-z)*GROUND_CEILING/10));
    }
    public static boolean upperWalkable(double x,double z){
        return x>=10.8&&x<=19&&z>=1.2&&z<=10.7 ||
            x>=16&&x<=19&&z>10.7&&z<=22;
    }
    /** Walkable 3D height follows a physical incline and retains underpasses. */
    public static double elevation(double x,double z,double oldElevation){
        if(onStairs(x,z))return stairHeight(x,z);
        if(oldElevation>2.0&&upperWalkable(x,z))return GROUND_CEILING;
        return 0;
    }
}
