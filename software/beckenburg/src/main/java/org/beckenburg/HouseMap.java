package org.beckenburg;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Authored investigation layouts: twelve physically navigable interiors and three exterior zones.
 * Original house remains the default; site variants are deterministic and replicated. */
public final class HouseMap {
    public static final int COLS=3, ROWS=5, INDOOR_ROOMS=12, ROOM_COUNT=15;
    public static final int WIDTH=25, HEIGHT=31, EXTRACTION_ROOM=14;
    public enum Site {
        HOUSE("Residential House"),
        FARMHOUSE("Abandoned Farmhouse"),
        SCHOOL("Ravenshade School");
        private final String label;
        Site(String label){this.label=label;}
        @Override public String toString(){return label;}
    }
    private final Site site;
    public Site site(){return site;}
    private static final String[] NAMES={
        "BATHROOM", "MASTER BEDROOM", "NURSERY",
        "LIVING ROOM", "MAIN HALL", "KITCHEN",
        "LIBRARY", "DINING ROOM", "STUDY",
        "STORAGE CELLAR", "FOYER", "UTILITY ROOM",
        "REAR GARDEN", "FRONT PORCH", "VAN STAGING"
    };
    private static final String[] FARM_NAMES={
        "SCULLERY","PARENTS' ROOM","CHILDREN'S ROOM",
        "FARM PARLOR","CENTRAL PASSAGE","FARM KITCHEN",
        "PANTRY","FAMILY DINING","FARM OFFICE",
        "ROOT CELLAR","MUDROOM","GENERATOR ROOM",
        "ORCHARD","BARNYARD","VAN STAGING"
    };
    private static final String[] SCHOOL_NAMES={
        "WASHROOM","CLASSROOM A","CLASSROOM B",
        "FACULTY LOUNGE","MAIN CORRIDOR","SCIENCE LAB",
        "SCHOOL LIBRARY","ASSEMBLY ROOM","HEADMASTER'S OFFICE",
        "BOILER ROOM","FRONT VESTIBULE","ELECTRICAL ROOM",
        "PLAYGROUND","SCHOOL STEPS","VAN STAGING"
    };
    private final char[][] tiles=new char[HEIGHT][WIDTH];
    private final Set<Integer> openDoors=new HashSet<>();
    private final VanStaging van=new VanStaging(new VanStaging.Placement(20.5,27.5,-Math.PI/2));
    public VanStaging van(){return van;}

    public HouseMap(){this(Site.HOUSE);}
    public HouseMap(Site variant){
        site=java.util.Objects.requireNonNull(variant);
        for(int z=0;z<HEIGHT;z++)for(int x=0;x<WIDTH;x++){
            // Outdoor cells have no internal partitions; outer walls stand in for
            // hedge/fence at this early geometry stage, not an interior room.
            boolean boundary=x==0||z==0||x==WIDTH-1||z==HEIGHT-1;
            boolean divider=(z<24 && (x==8||x==16)) || z==6||z==12||z==18||z==24;
            tiles[z][x]=boundary||divider?'#': z>24?'o':'.';
        }
        // Every site retains the safe van and 20 accessible physical doors, but
        // door locations, interior subdivisions and room purposes are authored per site.
        int[] west=switch(site){
            case HOUSE->new int[]{3,9,15,21};
            case FARMHOUSE->new int[]{2,8,16,22};
            case SCHOOL->new int[]{4,10,14,20};
        };
        int[] east=switch(site){
            case HOUSE->new int[]{3,9,15,21};
            case FARMHOUSE->new int[]{4,10,14,20};
            case SCHOOL->new int[]{2,8,16,22};
        };
        for(int z:west)tiles[z][8]='D';
        for(int z:east)tiles[z][16]='D';
        int[][] north=switch(site){
            case HOUSE->new int[][]{{4,12,20},{4,12,20},{4,12,20},{4,12,20}};
            case FARMHOUSE->new int[][]{{3,13,21},{5,11,19},{4,14,20},{3,12,21}};
            case SCHOOL->new int[][]{{5,11,20},{3,13,21},{5,12,19},{4,11,20}};
        };
        for(int row=0;row<4;row++)for(int x:north[row])tiles[6*(row+1)][x]='D';
        if(site==Site.SCHOOL){
            // Divided classroom alcoves and administrative archive partitions.
            for(int room:new int[]{1,2,5,7,8}){
                int bx=(room%COLS)*8, bz=(room/COLS)*6;
                tiles[bz+2][bx+6]='#';tiles[bz+3][bx+6]='#';
            }
        }else if(site==Site.FARMHOUSE){
            // Farm service cubbies and short original masonry returns.
            for(int room:new int[]{1,2,3,8}){
                int bx=(room%COLS)*8,bz=(room/COLS)*6;
                tiles[bz+1][bx+5]='#';tiles[bz+2][bx+5]='#';
            }
        }
        // Exterior staging remains navigable for all locations.
    }
    /** Sorted fixed tile IDs allow clients to reproduce the server's physical doors. */
    public String doorSnapshot(){
        return openDoors.stream().sorted().map(String::valueOf).collect(java.util.stream.Collectors.joining(","));
    }
    public void applyDoorSnapshot(String encoded){
        if(encoded==null||encoded.length()>100)throw new IllegalArgumentException("invalid doors");
        Set<Integer> result=new HashSet<>();
        if(!encoded.isEmpty())for(String token:encoded.split(",",-1)){
            if(!token.matches("[0-9]{1,4}"))throw new IllegalArgumentException("invalid door id");
            int id=Integer.parseInt(token),dx=id%WIDTH,dz=id/WIDTH;
            if(dz>=HEIGHT||tile(dx,dz)!='D'||!result.add(id))throw new IllegalArgumentException("invalid door list");
        }
        openDoors.clear();openDoors.addAll(result);
    }
    /** Deterministic interior hiding sockets. Density changes which locations physically exist. */
    public VanStaging.Position hidingSpot(int room,int density){
        if(density<0||density>100)throw new IllegalArgumentException("hiding density 0-100");
        if(room<0||room>=INDOOR_ROOMS)return null;
        if(Math.floorMod(room*37+17,100)>=density)return null;
        return new VanStaging.Position(centerX(room)+.65,centerZ(room)+.70);
    }
    public int width(){return WIDTH;}
    public int height(){return HEIGHT;}
    public int roomCount(){return ROOM_COUNT;}
    public int interiorRoomCount(){return INDOOR_ROOMS;}
    public boolean outside(int room){return room>=INDOOR_ROOMS && room<ROOM_COUNT;}
    public char tile(int x,int z){return x<0||z<0||x>=WIDTH||z>=HEIGHT?'#':tiles[z][x];}
    private static int doorId(int x,int z){return z*WIDTH+x;}
    public boolean doorOpen(int x,int z){return tile(x,z)=='D'&&openDoors.contains(doorId(x,z));}
    public boolean solid(int x,int z){char t=tile(x,z);return t=='#'||(t=='D'&&!doorOpen(x,z));}
    /** Collision-aware level ray for camera shots, including real open/closed doors. */
    public boolean clearLineOfSight(double ax,double az,double bx,double bz){
        if(!Double.isFinite(ax)||!Double.isFinite(az)||!Double.isFinite(bx)||!Double.isFinite(bz))return false;
        double distance=Math.hypot(bx-ax,bz-az);
        if(distance<.01||distance>20)return false;
        int steps=Math.max(2,(int)Math.ceil(distance/.10));
        for(int i=1;i<steps;i++){
            double t=i/(double)steps;
            if(solid((int)Math.floor(ax+(bx-ax)*t),(int)Math.floor(az+(bz-az)*t)))return false;
        }
        return true;
    }
    public boolean traversable(double x,double z){
        if(!Double.isFinite(x)||!Double.isFinite(z))return false;
        double r=.19;
        return !van.collides(x,z,r)
            && !solid((int)Math.floor(x-r),(int)Math.floor(z-r))
            && !solid((int)Math.floor(x+r),(int)Math.floor(z-r))
            && !solid((int)Math.floor(x-r),(int)Math.floor(z+r))
            && !solid((int)Math.floor(x+r),(int)Math.floor(z+r));
    }
    public boolean toggleNearestDoor(double x,double z){
        if(!Double.isFinite(x)||!Double.isFinite(z))return false;
        double best=1.40;int candidate=-1;
        for(int zz=1;zz<HEIGHT-1;zz++)for(int xx=1;xx<WIDTH-1;xx++){
            if(tile(xx,zz)!='D')continue;
            double d=Math.hypot(xx+.5-x,zz+.5-z);
            if(d<best){best=d;candidate=doorId(xx,zz);}
        }
        if(candidate<0)return false;
        if(!openDoors.add(candidate))openDoors.remove(candidate);
        return true;
    }
    /** A non-phasing ghost physically opens an authored door between adjacent rooms. */
    public boolean openDoorBetweenRooms(int from,int to){
        if(from<0||to<0||from>=ROOM_COUNT||to>=ROOM_COUNT
            ||Math.abs(from/COLS-to/COLS)+Math.abs(from%COLS-to%COLS)!=1)
            throw new IllegalArgumentException("adjacent room IDs required");
        int row=Math.min(from/COLS,to/COLS),col=Math.min(from%COLS,to%COLS);
        if(from/COLS==to/COLS){
            int xx=8+col*8;
            for(int zz=row*6+1;zz<row*6+6;zz++)
                if(tile(xx,zz)=='D')return openDoors.add(doorId(xx,zz));
        }else{
            int zz=(row+1)*6;
            for(int xx=col*8+1;xx<col*8+8;xx++)
                if(tile(xx,zz)=='D')return openDoors.add(doorId(xx,zz));
        }
        return false;
    }
    public int roomAt(double x,double z){
        if(!Double.isFinite(x)||!Double.isFinite(z))return -1;
        int xx=(int)Math.floor(x),zz=(int)Math.floor(z);
        if(xx<=0||zz<=0||xx>=WIDTH-1||zz>=HEIGHT-1)return -1;
        int col=xx<8?0:xx<16?1:2;
        int row=zz<6?0:zz<12?1:zz<18?2:zz<24?3:4;
        return row*COLS+col;
    }
    public String roomName(int room){
        if(room<0||room>=ROOM_COUNT)return "OUTSIDE";
        return switch(site){
            case HOUSE->NAMES[room];
            case FARMHOUSE->FARM_NAMES[room];
            case SCHOOL->SCHOOL_NAMES[room];
        };
    }
    public String roomName(double x,double z){return roomName(roomAt(x,z));}
    public double centerX(int room){checkRoom(room);return 4.5+(room%COLS)*8;}
    public double centerZ(int room){checkRoom(room);return 3.5+(room/COLS)*6;}
    private static void checkRoom(int room){if(room<0||room>=ROOM_COUNT)throw new IllegalArgumentException("invalid room "+room);}
    /** Potential spectral adjacency; the staging van is deliberately a hunter-only safe zone. */
    public List<Integer> ghostExits(int room){
        checkRoom(room);
        if(room==EXTRACTION_ROOM)return List.of();
        int row=room/COLS,col=room%COLS;
        List<Integer> out=new ArrayList<>(4);
        if(row>0)out.add(room-COLS);
        if(row<ROWS-1&&room+COLS!=EXTRACTION_ROOM)out.add(room+COLS);
        if(col>0)out.add(room-1);
        if(col<COLS-1&&room+1!=EXTRACTION_ROOM)out.add(room+1);
        return List.copyOf(out);
    }
    /** Validate door topology and full connected hunter navigation with all doors opened. */
    public boolean valid(){
        if(NAMES.length!=ROOM_COUNT)return false;
        int count=0;
        for(int z=0;z<HEIGHT;z++)for(int x=0;x<WIDTH;x++)if(tiles[z][x]=='D'){
            count++;
            boolean ns=tile(x,z-1)!='#'&&tile(x,z+1)!='#';
            boolean ew=tile(x-1,z)!='#'&&tile(x+1,z)!='#';
            if(ns==ew)return false; // A proper threshold has just one usable axis.
        }
        if(count!=20)return false;
        Set<Integer> saved=new HashSet<>(openDoors);
        try{
            for(int z=0;z<HEIGHT;z++)for(int x=0;x<WIDTH;x++)if(tile(x,z)=='D')openDoors.add(doorId(x,z));
            boolean[][] seen=new boolean[HEIGHT][WIDTH];
            ArrayDeque<int[]> queue=new ArrayDeque<>();
            queue.add(new int[]{(int)centerX(EXTRACTION_ROOM),(int)centerZ(EXTRACTION_ROOM)});
            while(!queue.isEmpty()){
                int[] pos=queue.removeFirst();int x=pos[0],z=pos[1];
                if(x<0||z<0||x>=WIDTH||z>=HEIGHT||seen[z][x]||solid(x,z))continue;
                seen[z][x]=true;
                queue.addLast(new int[]{x+1,z});queue.addLast(new int[]{x-1,z});
                queue.addLast(new int[]{x,z+1});queue.addLast(new int[]{x,z-1});
            }
            for(int r=0;r<ROOM_COUNT;r++)if(!seen[(int)centerZ(r)][(int)centerX(r)])return false;
            return true;
        } finally {openDoors.clear();openDoors.addAll(saved);}
    }
}