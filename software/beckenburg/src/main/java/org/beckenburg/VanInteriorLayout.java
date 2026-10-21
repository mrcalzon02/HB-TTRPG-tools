package org.beckenburg;

import java.util.ArrayList;
import java.util.List;

/**
 * Reusable VAN architectural fit-out, authored in metres rather than tile cells.
 * Cargo opening is at negative Z. Both wall rails and floor brackets are part
 * of the same authoritative module that handles stations, inventory and solids.
 */
public final class VanInteriorLayout {
    private VanInteriorLayout(){}
    public enum Mount { FLOOR, FURNITURE, BULKHEAD, WALL }
    public record Fixture(String mesh,double localX,double y,double localZ,
                          double scale,double yaw,Mount mount,String purpose){
        public Fixture{
            if(!Double.isFinite(localX+y+localZ+scale+yaw)||scale<=0)
                throw new IllegalArgumentException("invalid van fixture");
        }
    }
    public static final double FLOOR_Y=VanStaging.FLOOR_Y, ROOF_Y=FLOOR_Y+VanStaging.INTERIOR_HEIGHT;
    public static final double INNER_WALL=VanStaging.INTERIOR_HALF_WIDTH-.03;
    public static final double AISLE_HALF_WIDTH=.48;
    public static final int TOOL_COLUMNS=7,TOOL_ROWS=6,TOOL_CAPACITY=TOOL_COLUMNS*TOOL_ROWS;
    public static final double TOOL_COLUMN_PITCH=.50;
    public static final double TOOL_FIRST_Z=-1.70, TOOL_FIRST_Y=FLOOR_Y+.27, TOOL_ROW_PITCH=.32;
    public record ToolSocket(String equipment,double x,double y,double z,int row,int column){}
    private static final List<ToolSocket> TOOLS=buildToolSockets();
    private static List<ToolSocket> buildToolSockets(){
        List<String> catalog=new ArrayList<>(FieldEquipment.workingTools());
        if(!catalog.contains("SALT"))catalog.add("SALT");
        catalog.sort(String::compareTo);
        if(catalog.size()>TOOL_CAPACITY)
            throw new ExceptionInInitializerError("VAN equipment rack exceeded "+TOOL_CAPACITY+" real sockets");
        List<ToolSocket> slots=new ArrayList<>();
        for(int i=0;i<catalog.size();i++){
            int row=i/TOOL_COLUMNS,col=i%TOOL_COLUMNS;
            slots.add(new ToolSocket(catalog.get(i),row==5?-.64:-.70,
                TOOL_FIRST_Y+row*TOOL_ROW_PITCH,TOOL_FIRST_Z+col*TOOL_COLUMN_PITCH,row,col));
        }
        return List.copyOf(slots);
    }
    public static List<ToolSocket> toolSockets(){return TOOLS;}
    public static ToolSocket toolSocket(String name){
        return TOOLS.stream().filter(s->s.equipment().equals(name)).findFirst()
            .orElseThrow(()->new IllegalArgumentException("No VAN socket for "+name));
    }
    // Real scale is retained from owner GLB source files. Floor height and
    // table-top height are measured; monitors have independent wall brackets.
    public static final List<Fixture> FIXTURES=List.of(
        new Fixture("tv_table_1_4",0,FLOOR_Y,1.74,1,0,Mount.FLOOR,"command workstation"),
        new Fixture("pc_mp_1",-.66,FLOOR_Y,1.69,1,0,Mount.FLOOR,"computer tower"),
        new Fixture("pc_keyboard_mp_1",.02,FLOOR_Y+.742,1.53,1,0,Mount.FURNITURE,"desk keyboard"),
        new Fixture("monitoring_screen_mp_1",0,FLOOR_Y+.742,2.015,1,Math.PI,Mount.BULKHEAD,"main command monitor"),
        new Fixture("monitoring_screen_mp_1",.85,FLOOR_Y+1.25,-1.2,1,Math.PI/2,Mount.WALL,"sanity telemetry"),
        new Fixture("monitoring_screen_mp_1",.85,FLOOR_Y+1.25,-.2,1,Math.PI/2,Mount.WALL,"haunting activity"),
        new Fixture("monitoring_screen_mp_1",.85,FLOOR_Y+1.25,.8,1,Math.PI/2,Mount.WALL,"sound telemetry"),
        new Fixture("blender_site_map_fixed",.83,FLOOR_Y+.75,-1.2,.78,-Math.PI/2,Mount.WALL,"site map"),
        new Fixture("blender_objective_board_fixed",.83,FLOOR_Y+.75,-.2,.65,-Math.PI/2,Mount.WALL,"contract objective board"),
        new Fixture("blender_clipboards_fixed",.83,FLOOR_Y+.75,.8,1,-Math.PI/2,Mount.WALL,"daily assignment board")
    );
    /** These are the volumes occupied by fitted real furniture and racks;
     * no collision volume is placed across the central aisle.
     */
    public record Clearance(double x0,double x1,double z0,double z1){}
    private static final List<Clearance> SOLIDS=List.of(
        new Clearance(-.82,.82,1.42,1.97), // front workstation and bulkhead
        new Clearance(-.87,-.48,-1.88,1.42), // fitted equipment rack
        new Clearance(.49,.88,-1.52,1.08) // monitoring wall and storage
    );
    public static List<Clearance> collisionVolumes(){return SOLIDS;}
    public static boolean collides(double x,double z,double radius){
        for(Clearance c:SOLIDS){
            double nearX=Math.max(c.x0(),Math.min(x,c.x1()));
            double nearZ=Math.max(c.z0(),Math.min(z,c.z1()));
            if(Math.hypot(x-nearX,z-nearZ)<=radius)return true;
        }
        return false;
    }
    public record Bounds(double x0,double y0,double z0,double x1,double y1,double z1){}
    private static final class MonitorBasis {
        static final double[] right,up,front;static final double midX,minY,minZ;
        static double dot(GlbProps.Vertex v,double[] a){return v.x()*a[0]+v.y()*a[1]+v.z()*a[2];}
        static double[] unit(double x,double y,double z){double d=Math.sqrt(x*x+y*y+z*z);return new double[]{x/d,y/d,z/d};}
        static{
            var model=GlbProps.model("monitoring_screen_mp_1");int screen=model.triangles().stream().mapToInt(GlbProps.Triangle::material).max().orElseThrow();
            var face=model.triangles().stream().filter(t->t.material()==screen).findFirst().orElseThrow();
            right=unit(face.c().x()-face.b().x(),face.c().y()-face.b().y(),face.c().z()-face.b().z());
            up=unit(face.a().x()-face.b().x(),face.a().y()-face.b().y(),face.a().z()-face.b().z());
            front=unit(right[1]*up[2]-right[2]*up[1],right[2]*up[0]-right[0]*up[2],right[0]*up[1]-right[1]*up[0]);
            double lo=1e9,hi=-1e9,y=1e9,z=1e9;
            for(var t:model.triangles())for(var v:new GlbProps.Vertex[]{t.a(),t.b(),t.c()}){double x=dot(v,right);lo=Math.min(lo,x);hi=Math.max(hi,x);y=Math.min(y,dot(v,up));z=Math.min(z,dot(v,front));}
            midX=(lo+hi)/2;minY=y;minZ=z;
        }
    }
    /** Remove the source CRT's baked yaw/tilt using its real screen UV plane; preserve every UV. */
    public static int screenMaterial(){return GlbProps.model("monitoring_screen_mp_1").triangles().stream().mapToInt(GlbProps.Triangle::material).max().orElseThrow();}
    public static GlbProps.Vertex vertex(String mesh,GlbProps.Vertex v){
        if(!mesh.equals("monitoring_screen_mp_1"))return v;
        return new GlbProps.Vertex(MonitorBasis.dot(v,MonitorBasis.right)-MonitorBasis.midX,MonitorBasis.dot(v,MonitorBasis.up)-MonitorBasis.minY,MonitorBasis.dot(v,MonitorBasis.front)-MonitorBasis.minZ,v.u(),v.v());
    }
    public static Bounds bounds(String mesh){
        double x0=1e9,y0=1e9,z0=1e9,x1=-1e9,y1=-1e9,z1=-1e9;
        for(var t:GlbProps.model(mesh).triangles())for(var original:new GlbProps.Vertex[]{t.a(),t.b(),t.c()}){
            var v=vertex(mesh,original);x0=Math.min(x0,v.x());y0=Math.min(y0,v.y());z0=Math.min(z0,v.z());
            x1=Math.max(x1,v.x());y1=Math.max(y1,v.y());z1=Math.max(z1,v.z());}
        return new Bounds(x0,y0,z0,x1,y1,z1);
    }
    public static boolean insideShell(Fixture p){
        Bounds b=bounds(p.mesh());
        for(double x:new double[]{b.x0,b.x1})for(double y:new double[]{b.y0,b.y1})for(double z:new double[]{b.z0,b.z1}){
            double px=p.localX+p.scale*(x*Math.cos(p.yaw)-z*Math.sin(p.yaw));
            double pz=p.localZ+p.scale*(x*Math.sin(p.yaw)+z*Math.cos(p.yaw));
            double py=p.y+p.scale*y;
            double t=Math.max(0,(py-VanStaging.ROOF_SHOULDER_Y)/(ROOF_Y-VanStaging.ROOF_SHOULDER_Y));
            double half=VanStaging.INTERIOR_HALF_WIDTH-t*(VanStaging.INTERIOR_HALF_WIDTH-VanStaging.INTERIOR_ROOF_HALF_WIDTH);
            if(Math.abs(px)>half-.015||pz<VanStaging.FRONT+.06||pz>VanStaging.REAR-.08||py<FLOOR_Y-.005||py>ROOF_Y-.015)return false;
        }return true;
    }
    public static double clearAisleHalfWidth(){return AISLE_HALF_WIDTH;}
    public static boolean openAisle(double x,double z){
        return Math.abs(x)<AISLE_HALF_WIDTH
            &&z>VanStaging.FRONT+.19&&z<1.18
            &&!collides(x,z,.18);
    }
}
