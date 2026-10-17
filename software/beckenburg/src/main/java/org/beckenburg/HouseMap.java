package org.beckenburg;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Authored, one-floor playable house blockout: twelve interior and three exterior zones. */
public final class HouseMap {
    public static final int COLS=3, ROWS=5, INDOOR_ROOMS=12, ROOM_COUNT=15;
    public static final int WIDTH=25, HEIGHT=31, EXTRACTION_ROOM=14;
    private static final String[] NAMES={
        "BATHROOM", "MASTER BEDROOM", "NURSERY",
        "LIVING ROOM", "MAIN HALL", "KITCHEN",
        "LIBRARY", "DINING ROOM", "STUDY",
        "STORAGE CELLAR", "FOYER", "UTILITY ROOM",
        "REAR GARDEN", "FRONT PORCH", "VAN STAGING"
    };
    private final char[][] tiles=new char[HEIGHT][WIDTH];
    private final Set<Integer> openDoors=new HashSet<>();
    private final VanStaging van=new VanStaging(new VanStaging.Placement(20.5,27.5,0));
    public VanStaging van(){return van;}

    public HouseMap(){
        for(int z=0;z<HEIGHT;z++)for(int x=0;x<WIDTH;x++){
            // Outdoor cells have no internal partitions; outer walls stand in for
            // hedge/fence at this early geometry stage, not an interior room.
            boolean boundary=x==0||z==0||x==WIDTH-1||z==HEIGHT-1;
            boolean divider=(z<24 && (x==8||x==16)) || z==6||z==12||z==18||z==24;
            tiles[z][x]=boundary||divider?'#': z>24?'o':'.';
        }
        for(int z:new int[]{3,9,15,21})for(int x:new int[]{8,16})tiles[z][x]='D';
        for(int z:new int[]{6,12,18,24})for(int x:new int[]{4,12,20})tiles[z][x]='D';
        // Side paths stay open for the back garden, porch and van staging.
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
        int xx,zz;
        if(from/COLS==to/COLS){xx=8+col*8;zz=3+row*6;}
        else {xx=4+col*8;zz=6+row*6;}
        if(tile(xx,zz)!='D')return false;
        return openDoors.add(doorId(xx,zz));
    }
    public int roomAt(double x,double z){
        if(!Double.isFinite(x)||!Double.isFinite(z))return -1;
        int xx=(int)Math.floor(x),zz=(int)Math.floor(z);
        if(xx<=0||zz<=0||xx>=WIDTH-1||zz>=HEIGHT-1)return -1;
        int col=xx<8?0:xx<16?1:2;
        int row=zz<6?0:zz<12?1:zz<18?2:zz<24?3:4;
        return row*COLS+col;
    }
    public String roomName(int room){return room<0||room>=ROOM_COUNT?"OUTSIDE":NAMES[room];}
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
