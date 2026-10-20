package org.beckenburg;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Authored ground-floor architecture, not a room-label reskin of a rectangular grid.
 * Each piece of traversable floor has a named room and each doorway joins actual
 * neighboring volumes. The exterior wall is the negative space around the footprint.
 *
 * The reference architectural sheets also contain upper and lower floors; those are
 * NOT represented here until vertical body and ghost state are implemented.
 */
final class ArchitecturalPlans {
    record Portal(int x,int z,int a,int b) {
        boolean joins(int from,int to){
            return a==from&&b==to || a==to&&b==from;
        }
    }
    static final class Plan {
        final int width,height;
        final char[][] tile;
        final int[][] owner;
        final double[] cx=new double[HouseMap.ROOM_COUNT],cz=new double[HouseMap.ROOM_COUNT];
        final List<Portal> portals;
        Plan(int w,int h,char[][] tile,int[][] owner,List<Portal> doors){
            width=w;height=h;this.tile=tile;this.owner=owner;
            portals=List.copyOf(doors);
            for(int room=0;room<HouseMap.ROOM_COUNT;room++){
                double sx=0,sz=0;int count=0;
                for(int z=1;z<h-1;z++)for(int x=1;x<w-1;x++)
                    if(owner[z][x]==room&&tile[z][x]!='D'){sx+=x+.5;sz+=z+.5;count++;}
                if(count==0)throw new IllegalStateException("empty architectural room "+room);
                double meanX=sx/count,meanZ=sz/count,best=Double.MAX_VALUE;
                for(int z=1;z<h-1;z++)for(int x=1;x<w-1;x++)
                    if(owner[z][x]==room&&tile[z][x]!='D'){
                        double d=Math.hypot(x+.5-meanX,z+.5-meanZ);
                        if(d<best){best=d;cx[room]=x+.5;cz[room]=z+.5;}
                    }
            }
        }
        char tile(int x,int z){return x<0||z<0||x>=width||z>=height?'#':tile[z][x];}
        int roomAt(double x,double z){
            if(!Double.isFinite(x)||!Double.isFinite(z))return -1;
            int xx=(int)Math.floor(x),zz=(int)Math.floor(z);
            return xx<0||zz<0||xx>=width||zz>=height?-1:owner[zz][xx];
        }
        List<Integer> exits(int from){
            ArrayList<Integer> list=new ArrayList<>();
            for(Portal portal:portals){
                if(portal.a==from&&!list.contains(portal.b))list.add(portal.b);
                if(portal.b==from&&!list.contains(portal.a))list.add(portal.a);
            }
            // Yards and van staging have genuine contiguous, unpartitioned boundaries.
            for(int z=1;z<height-1;z++)for(int x=1;x<width-1;x++){
                if(owner[z][x]!=from||tile[z][x]=='#')continue;
                for(int[] delta:new int[][]{{1,0},{0,1}}){
                    int nx=x+delta[0],nz=z+delta[1];
                    if(nx>=width-1||nz>=height-1)continue;
                    int adjacent=owner[nz][nx];
                    if(adjacent!=from&&adjacent>=0&&tile[nz][nx]!='#'
                        &&!list.contains(adjacent))list.add(adjacent);
                }
            }
            // For reverse-direction outdoor edges.
            for(int z=1;z<height-1;z++)for(int x=1;x<width-1;x++){
                if(owner[z][x]!=from||tile[z][x]=='#')continue;
                for(int[] delta:new int[][]{{-1,0},{0,-1}}){
                    int nx=x+delta[0],nz=z+delta[1],adjacent=owner[nz][nx];
                    if(adjacent!=from&&adjacent>=0&&tile[nz][nx]!='#'
                        &&!list.contains(adjacent))list.add(adjacent);
                }
            }
            return List.copyOf(list);
        }
        Portal portal(int from,int to){
            for(Portal portal:portals)if(portal.joins(from,to))return portal;
            return null;
        }
        boolean doorwayAlongX(int x,int z){
            for(Portal p:portals)if(p.x==x&&p.z==z)
                return owner[z][x-1]>=0&&owner[z][x+1]>=0
                    &&owner[z][x-1]!=owner[z][x+1];
            return false;
        }
        boolean connected(){
            boolean[][] visited=new boolean[height][width];
            ArrayDeque<int[]> q=new ArrayDeque<>();
            q.add(new int[]{(int)cx[14],(int)cz[14]});
            while(!q.isEmpty()){
                int[] pos=q.removeFirst();int x=pos[0],z=pos[1];
                if(x<0||z<0||x>=width||z>=height||visited[z][x]
                        ||tile[z][x]=='#'||tile[z][x]=='W')continue;
                visited[z][x]=true;
                q.add(new int[]{x+1,z});q.add(new int[]{x-1,z});
                q.add(new int[]{x,z+1});q.add(new int[]{x,z-1});
            }
            for(int i=0;i<cx.length;i++)
                if(!visited[(int)cz[i]][(int)cx[i]])return false;
            return true;
        }
    }
    private static final class Builder {
        final int w,h;
        final char[][] grid;
        final int[][] owner;
        final List<Portal> portals=new ArrayList<>();
        Builder(int width,int height){
            w=width;h=height;grid=new char[h][w];owner=new int[h][w];
            for(char[] a:grid)Arrays.fill(a,'#');
            for(int[] a:owner)Arrays.fill(a,-1);
        }
        Builder room(int id,int x0,int z0,int x1,int z1){
            if(id<0||id>=HouseMap.ROOM_COUNT||x0<=0||z0<=0||x1>=w-1||z1>=h-1)
                throw new IllegalArgumentException("room outside authored building");
            for(int z=z0;z<=z1;z++)for(int x=x0;x<=x1;x++){
                if(owner[z][x]>=0&&owner[z][x]!=id)
                    throw new IllegalStateException("overlapping authored rooms");
                grid[z][x]=id>=12?'o':'.';owner[z][x]=id;
            }
            return this;
        }
        Builder door(int x,int z,int a,int b){
            if(grid[z][x]!='#')throw new IllegalStateException("door not in masonry");
            boolean horizontal=owner[z][x-1]==a&&owner[z][x+1]==b
                ||owner[z][x-1]==b&&owner[z][x+1]==a;
            boolean vertical=owner[z-1][x]==a&&owner[z+1][x]==b
                ||owner[z-1][x]==b&&owner[z+1][x]==a;
            if(horizontal==vertical)throw new IllegalStateException("invalid door socket "+x+","+z);
            grid[z][x]='D';owner[z][x]=a;
            portals.add(new Portal(x,z,a,b));
            return this;
        }
        Plan finish(){
            // External window bays belong to the wall itself. They are neither
            // traversable space nor survey equipment. Do not cut through
            // partition walls or undermine a door jamb.
            for(int z=2;z<h-2;z++)for(int x=2;x<w-2;x++){
                if(grid[z][x]!='#'||Math.floorMod(x*3+z*5,11)>1)continue;
                boolean exposedEastWest=
                    inside(owner[z][x-1])&&owner[z][x+1]==-1
                    ||inside(owner[z][x+1])&&owner[z][x-1]==-1;
                boolean exposedNorthSouth=
                    inside(owner[z-1][x])&&owner[z+1][x]==-1
                    ||inside(owner[z+1][x])&&owner[z-1][x]==-1;
                if(exposedEastWest==exposedNorthSouth)continue;
                boolean nearDoor=false;
                for(int dz=-2;dz<=2;dz++)for(int dx=-2;dx<=2;dx++)
                    if(grid[z+dz][x+dx]=='D')nearDoor=true;
                if(!nearDoor)grid[z][x]='W';
            }
            Plan p=new Plan(w,h,grid,owner,portals);
            // Calculate all established room centers BEFORE extending the
            // outdoor driveway. The new access road must not move the van,
            // teleport any room center or replace authored interior rooms.
            extendVanStreet(p);
            if(!p.connected())throw new IllegalStateException("disconnected architectural wing");
            return p;
        }
        /** Outdoor infrastructure is part of the physical site footprint.
         * The former extraction parking bay ended at solid '#' masonry and
         * the new road was being drawn BEHIND that wall. Carve only unused
         * exterior map cells, preserving every house and classroom partition.
         */
        private void extendVanStreet(Plan plan){
            VanStaging position=new VanStaging(new VanStaging.Placement(
                plan.cx[HouseMap.EXTRACTION_ROOM],plan.cz[HouseMap.EXTRACTION_ROOM],
                -Math.PI/2));
            for(int z=1;z<h-1;z++)for(int x=1;x<w-1;x++){
                if(owner[z][x]!=-1||grid[z][x]!='#')continue;
                VanStaging.Position local=position.local(x+.5,z+.5);
                if(Math.abs(local.x())>VanArrivalStreet.ROAD_HALF_WIDTH+1.04||
                   local.z()<VanArrivalStreet.ROAD_END||
                   local.z()>VanArrivalStreet.ROAD_START)continue;
                grid[z][x]='o';
                owner[z][x]=HouseMap.EXTRACTION_ROOM;
            }
        }
        private static boolean inside(int id){return id>=0&&id<HouseMap.INDOOR_ROOMS;}
    }
    static Plan build(HouseMap.Site kind){
        if(kind==HouseMap.Site.HOUSE)return house();
        if(kind==HouseMap.Site.FARMHOUSE)return farmhouse();
        if(kind==HouseMap.Site.SCHOOL)return school();
        throw new IllegalArgumentException("unsupported authored investigation location");
    }
    /** Late-Victorian domestic plan: central stair-hall and entrance vestibule,
     * offset parlour and kitchen wings, rear garden, a separate scullery and WC,
     * front portico, and an isolated safe expedition van outside the property.
     * Bedroom and actual cellar floors require vertical simulation; they are not
     * misrepresented as ground-floor rooms.
     */
    private static Plan house(){
        Builder b=new Builder(48,84);
        b.room(1,4,12,17,23).room(2,30,12,43,23)
         .room(3,4,25,17,36).room(5,30,25,43,36)
         .room(6,4,38,17,49).room(8,30,38,43,49)
         .room(7,4,51,17,61).room(11,30,51,43,61)
         .room(9,4,63,17,68).room(0,30,63,43,68)
         .room(4,19,12,28,49).room(10,19,51,28,65)
         .room(12,4,2,17,10).room(13,20,67,27,71)
         .room(14,15,73,30,81)
         // Asymmetric projecting bay windows give the Victorian exterior its
         // distinctive silhouette rather than a monolithic rectangular facade.
         .room(1,2,15,4,19).room(3,2,27,4,33)
         .room(7,2,54,4,58).room(8,43,40,45,46)
         .room(5,43,27,45,33);
        b.door(18,16,1,4).door(29,16,2,4)
         .door(18,30,3,4).door(29,30,5,4)
         .door(18,43,6,4).door(29,43,8,4)
         .door(18,56,7,10).door(29,56,11,10)
         .door(10,24,1,3).door(10,37,3,6)
         .door(10,50,6,7).door(10,62,7,9)
         .door(36,24,2,5).door(36,37,5,8)
         .door(36,50,8,11).door(36,62,11,0)
         .door(23,50,4,10).door(23,66,10,13)
         .door(23,72,13,14).door(10,11,12,1);
        return b.finish();
    }
    private static Plan farmhouse(){
        // A central stair passage, asymmetric domestic wings, service rooms, bay
        // projections, rear yard and orchard. Every partition and doorway is real.
        Builder b=new Builder(56,74);
        b.room(1,3,3,19,17).room(2,35,3,52,17)
         .room(3,3,19,19,33).room(4,21,3,33,50)
         .room(5,35,19,46,33).room(0,48,19,53,33)
         .room(7,3,35,19,48).room(8,35,35,46,48)
         .room(6,48,35,53,48).room(9,3,50,19,56)
         .room(11,35,50,52,56).room(10,22,52,32,58)
         .room(12,2,58,20,72).room(13,35,58,54,72)
         .room(14,21,60,34,72)
         // Projecting bays, not square facade strips.
         .room(3,1,24,3,29).room(7,1,39,3,45)
         .room(2,52,7,54,13).room(1,1,8,3,13);
        b.door(20,9,1,4).door(34,10,2,4)
         .door(20,26,3,4).door(34,26,5,4)
         .door(20,41,7,4).door(34,40,8,4)
         .door(47,24,5,0).door(47,41,8,6)
         .door(11,18,1,3).door(42,18,2,5)
         .door(11,34,3,7).door(39,34,5,8)
         .door(11,49,7,9).door(39,49,8,11)
         .door(27,51,4,10).door(27,59,10,14)
         .door(12,57,9,12).door(42,57,11,13);
        return b.finish();
    }
    private static Plan school(){
        // Formal assembly axis, classroom wings, separate faculty, sciences,
        // library, headmaster rooms and an articulated south service vestibule.
        Builder b=new Builder(70,84);
        b.room(7,28,3,41,20).room(1,3,4,26,21)
         .room(2,43,4,66,21).room(4,28,22,41,60)
         .room(3,3,24,26,36).room(5,43,24,66,40)
         .room(6,3,39,26,56).room(8,43,43,66,58)
         .room(0,3,58,26,68).room(11,43,60,49,68)
         .room(9,51,60,66,68).room(10,28,62,41,69)
         .room(12,2,70,26,82).room(13,43,70,67,82)
         .room(14,27,71,42,82)
         // Formal school bay windows, a projecting assembly apse, and side wings.
         .room(7,28,1,41,3).room(6,1,43,3,50)
         .room(5,66,27,68,35).room(8,66,47,68,54);
        b.door(34,21,7,4).door(27,12,1,7).door(42,12,7,2)
         .door(27,28,3,4).door(42,30,4,5)
         .door(27,46,6,4).door(42,48,4,8)
         .door(13,57,6,0).door(46,59,8,11)
         .door(50,64,11,9).door(34,61,4,10)
         .door(34,70,10,14).door(13,69,0,12)
         .door(58,69,9,13);
        return b.finish();
    }
}
