package org.beckenburg;

/** Authored Beckenburg castle ground floor. All workstations have physical positions. */
public final class CastleHubMap {
    public static final int WIDTH=44, HEIGHT=36;
    private final char[][] grid=new char[HEIGHT][WIDTH];
    public enum Station {
        ARMORY_UV(5.2,4.5,"UV LAMP / £150"),
        ARMORY_SALT(5.2,8.0,"SALT KIT / £80"),
        ROLE(23.0,6.0,"HUNTER WARDROBE / CHANGE ROLE"),
        CONTRACT(13.5,6.8,"CONTRACT BOARD / CONDITIONS"),
        EXPEDITION(13.5,16.6,"EXPEDITION VAN / START CASE"),
        MULTIPLAYER(22.5,16.6,"NETWORK DESK / HOST OR JOIN"),
        SPECTRAL(5.0,16.6,"SPECTRAL PRACTICE");
        public final double x,z;public final String label;
        Station(double x,double z,String label){this.x=x;this.z=z;this.label=label;}
    }
    /** Small, authored real GLB furnishings with matching walkable collision footprints. */
    public record Furnishing(String mesh,double x,double z,double scale,double yaw,
                             double halfWidth,double halfDepth) { }
    private static final java.util.List<Furnishing> FURNISHINGS=CastleHubDecor.furnishings();
    public static java.util.List<Furnishing> furnishings(){return FURNISHINGS;}
    /** Articulated H-plan with real hall passages, two connected eastern service
     * wings, a covered north block and an open south courtyard.
     * Purchasing stations retain their physically reachable world coordinates.
     */
    public CastleHubMap(){
        for(char[] row:grid)java.util.Arrays.fill(row,'#');
        carve(1,1,9,10);   // west armory
        carve(10,1,18,10); // north great hall and contract archive
        carve(19,1,27,10); // eastern lounge, wardrobe and offices
        carve(29,4,42,16); // north-east gallery / records wing
        carve(1,12,9,32);  // west training and practice wing
        carve(10,12,20,33);// broad open court / departure platforms
        carve(21,12,27,33);// eastern operations and network wing
        carve(29,18,42,33);// north-east workshop and service extension
        // Collision raster only. The independent architectural plan owns all
        // visible surfaces, portal widths, floors and mounting coordinates.
        for(int z=1;z<=10;z++)if(z<5||z>7){grid[z][10]='#';grid[z][19]='#';}
        for(int x=1;x<=27;x++)grid[11][x]='#';
        for(int xx:new int[]{5,13,22})
            for(int dx=-1;dx<=1;dx++)grid[11][xx+dx]='.';
        for(int z=12;z<=32;z++)if(z<15||z>17&&z<24||z>26){
            grid[z][10]='#';grid[z][20]='#';
        }
        for(int z=4;z<=10;z++)grid[z][28]='#';
        for(int z=6;z<=8;z++)grid[z][28]='.';
        for(int z=18;z<=33;z++)grid[z][28]='#';
        for(int z=23;z<=25;z++)grid[z][28]='.';
        for(int x=29;x<=42;x++)grid[17][x]='#';
        for(int x=34;x<=36;x++)grid[17][x]='.';
    }
    private void carve(int x0,int z0,int x1,int z1){
        for(int z=z0;z<=z1;z++)for(int x=x0;x<=x1;x++)grid[z][x]='.';
    }
    /** Courtyard paving is open to the sky; both lateral wings remain indoors. */
    public boolean outside(double x,double z){
        return z>=12&&x>=10&&x<=20;
    }
    /** One source of truth for displayed flooring and physical footfall Foley. */
    public int floorMaterial(double x,double z){
        if(!Double.isFinite(x)||!Double.isFinite(z)||
                solid((int)Math.floor(x),(int)Math.floor(z)))
            throw new IllegalArgumentException("floor location must be navigable");
        if(outside(x,z))return MaterialAtlas.STONE;
        // Ground-floor halls are flagstone, furnished salons are carpeted and
        // records/working offices have genuine timber floors.
        if(z<11)return x<10?MaterialAtlas.PARQUET:
                x<19?MaterialAtlas.CARPET:MaterialAtlas.PARQUET;
        if(x<10)return z<24?MaterialAtlas.STONE:MaterialAtlas.CARPET;
        if(x>=29)return z<18?MaterialAtlas.PARQUET:MaterialAtlas.STONE;
        return x>=21?MaterialAtlas.PARQUET:MaterialAtlas.STONE;
    }
    public LanSound.Cue footstep(double x,double z){
        return footstep(x,z,0);
    }
    public LanSound.Cue footstep(double x,double z,double elevation){
        if(elevation>2.0&&CastleHubArchitecturalPlan.upperWalkable(x,z))
            return z<=10.7?LanSound.Cue.STEP_WOOD:LanSound.Cue.STEP_STONE;
        if(CastleHubArchitecturalPlan.onStairs(x,z))
            return LanSound.Cue.STEP_STONE;
        return switch(floorMaterial(x,z)){
            case MaterialAtlas.CARPET->LanSound.Cue.STEP_CARPET;
            case MaterialAtlas.PARQUET,MaterialAtlas.AGED_WOOD->LanSound.Cue.STEP_WOOD;
            default->LanSound.Cue.STEP_STONE;
        };
    }

    public boolean valid(){
        java.util.HashSet<Integer> seen=new java.util.HashSet<>();
        java.util.ArrayDeque<int[]> queue=new java.util.ArrayDeque<>();
        queue.add(new int[]{13,19});
        while(!queue.isEmpty()){
            int[] point=queue.removeFirst();
            int x=point[0],z=point[1],key=z*WIDTH+x;
            if(x<0||x>=WIDTH||z<0||z>=HEIGHT||solid(x,z)||!seen.add(key))continue;
            queue.add(new int[]{x+1,z});queue.add(new int[]{x-1,z});
            queue.add(new int[]{x,z+1});queue.add(new int[]{x,z-1});
        }
        for(int z=0;z<HEIGHT;z++)for(int x=0;x<WIDTH;x++)
            if(!solid(x,z)&&!seen.contains(z*WIDTH+x))return false;
        for(Station station:Station.values())
            if(solid((int)station.x,(int)station.z))return false;
        return true;
    }
    public char tile(int x,int z){return x<0||z<0||x>=WIDTH||z>=HEIGHT?'#':grid[z][x];}
    public boolean solid(int x,int z){return tile(x,z)=='#';}

    public boolean traversable(double x,double z){
        if(!Double.isFinite(x)||!Double.isFinite(z))return false;
        double r=.21;
        if(solid((int)Math.floor(x-r),(int)Math.floor(z-r))
            ||solid((int)Math.floor(x+r),(int)Math.floor(z-r))
            ||solid((int)Math.floor(x-r),(int)Math.floor(z+r))
            ||solid((int)Math.floor(x+r),(int)Math.floor(z+r)))return false;
        for(Furnishing item:FURNISHINGS)
            if(Math.abs(x-item.x())<item.halfWidth()+r &&
               Math.abs(z-item.z())<item.halfDepth()+r)return false;
        return true;
    }
    /** True three-dimensional walk path: landings and upper corridors ignore
     * solid ground-wall cells only when physically above their lintels. */
    public boolean traversable(double x,double z,double elevation){
        if(!Double.isFinite(elevation)||elevation<0)return false;
        if(elevation>2.0&&CastleHubArchitecturalPlan.upperWalkable(x,z)){
            double radius=.21;
            for(Furnishing item:CastleHubDecor.UPPER_FURNISHINGS)
                if(Math.abs(x-item.x())<item.halfWidth()+radius&&
                    Math.abs(z-item.z())<item.halfDepth()+radius)return false;
            return true;
        }
        return traversable(x,z);
    }
    /** Interaction uses actual position and camera orientation, not a free-floating button. */
    public Station aimed(double playerX,double playerZ,double yaw){
        if(!traversable(playerX,playerZ)||!Double.isFinite(yaw))return null;
        Station nearest=null;double best=-1;
        for(Station s:Station.values()){
            double dx=s.x-playerX,dz=s.z-playerZ,d=Math.hypot(dx,dz);
            if(d>.5&&d<=2.75){
                double forward=(dx*Math.sin(yaw)+dz*Math.cos(yaw))/d;
                if(forward>.77&&forward>best){best=forward;nearest=s;}
            }
        }
        return nearest;
    }
}