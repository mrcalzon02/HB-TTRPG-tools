package org.beckenburg;

/** Authored Beckenburg castle ground floor. All workstations have physical positions. */
public final class CastleHubMap {
    public static final int WIDTH=28, HEIGHT=22;
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
    private static final java.util.List<Furnishing> FURNISHINGS=java.util.List.of(
        new Furnishing("shelf_mp_6",2.4,3.5,1.70,0,.76,.26),
        new Furnishing("shelf_mp_6",2.4,8.4,1.70,0,.76,.26),
        new Furnishing("chair_mp_5",15.9,3.7,1.12,Math.PI/2,.35,.39),
        new Furnishing("chair_mp_5",24.1,17.7,1.12,0,.35,.39)
    );
    public static java.util.List<Furnishing> furnishings(){return FURNISHINGS;}
    public CastleHubMap(){
        for(int z=0;z<HEIGHT;z++)for(int x=0;x<WIDTH;x++)
            grid[z][x]=(x==0||z==0||x==WIDTH-1||z==HEIGHT-1)?'#':'.';
        // Medieval masonry divides the northern library, great hall and armory.
        for(int z=1;z<=10;z++)for(int col:new int[]{9,18})if(z!=6)grid[z][col]='#';
        // Archways connect the courtyard staging area to all castle wings.
        for(int x=1;x<WIDTH-1;x++)if(x!=5&&x!=13&&x!=22)grid[11][x]='#';
        // Free-standing pillars allow navigation around the launch platforms.
        for(int x:new int[]{9,18})for(int z:new int[]{15,19})grid[z][x]='#';
    }
    public char tile(int x,int z){return x<0||z<0||x>=WIDTH||z>=HEIGHT?'#':grid[z][x];}
    public boolean solid(int x,int z){return tile(x,z)=='#';}
    public boolean outside(double x,double z){return z>=12;}
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