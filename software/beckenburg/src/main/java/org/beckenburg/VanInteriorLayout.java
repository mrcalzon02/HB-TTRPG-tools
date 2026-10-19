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
    public static final double FLOOR_Y=.10, ROOF_Y=VanStaging.INTERIOR_HEIGHT;
    public static final double INNER_WALL=VanStaging.HALF_WIDTH-.18;
    public static final double AISLE_HALF_WIDTH=.79;
    public static final int TOOL_COLUMNS=7,TOOL_ROWS=6,TOOL_CAPACITY=TOOL_COLUMNS*TOOL_ROWS;
    public static final double TOOL_COLUMN_PITCH=.91;
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
            slots.add(new ToolSocket(catalog.get(i),-INNER_WALL+.14,
                .38+row*.45,-2.76+col*TOOL_COLUMN_PITCH,row,col));
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
        new Fixture("tv_table_1_4",.10,FLOOR_Y,2.91,.89,
                    0,Mount.FLOOR,"command workstation"),
        new Fixture("pc_mp_1",-1.14,FLOOR_Y,2.62,1.02,
                    0,Mount.FLOOR,"computer tower"),
        new Fixture("pc_keyboard_mp_1",.08,.765,2.66,.88,
                    0,Mount.FURNITURE,"desk keyboard"),
        new Fixture("monitoring_screen_mp_1",.12,1.07,3.22,1.36,
                    0,Mount.BULKHEAD,"main command monitor"),
        // Right bulkhead carries three actual monitoring fixtures.
        new Fixture("monitoring_screen_mp_1",1.70,1.87,-1.71,.94,
                    -Math.PI/2,Mount.WALL,"sanity telemetry"),
        new Fixture("monitoring_screen_mp_1",1.70,1.87,-.21,.94,
                    -Math.PI/2,Mount.WALL,"haunting activity"),
        new Fixture("monitoring_screen_mp_1",1.70,1.87,1.29,.94,
                    -Math.PI/2,Mount.WALL,"sound telemetry"),
        new Fixture("blender_site_map_fixed",1.70,1.03,-1.71,.79,
                    -Math.PI/2,Mount.WALL,"site map"),
        // Distinct contract and daily task boards, mounted rather than
        // stored as unlabelled blocks in the middle of the walkway.
        new Fixture("blender_objective_board_fixed",1.70,1.07,-.21,.81,
                    -Math.PI/2,Mount.WALL,"contract objective board"),
        new Fixture("blender_clipboards_fixed",1.70,1.06,1.29,.68,
                    -Math.PI/2,Mount.WALL,"daily assignment board")
    );
    /** These are the volumes occupied by fitted real furniture and racks;
     * no collision volume is placed across the central aisle.
     */
    public record Clearance(double x0,double x1,double z0,double z1){}
    private static final List<Clearance> SOLIDS=List.of(
        new Clearance(-1.53,1.00,2.39,3.47), // front workstation and bulkhead
        new Clearance(-1.96,-1.38,-3.10,3.05), // fitted equipment rack
        new Clearance(1.40,1.96,-2.72,2.05) // monitoring wall and storage
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
    public static boolean insideShell(Fixture p){
        return Math.abs(p.localX())<VanStaging.HALF_WIDTH-.10
            &&p.localZ()>VanStaging.FRONT+.12
            &&p.localZ()<VanStaging.REAR-.11
            &&p.y()>=0&&p.y()<ROOF_Y;
    }
    public static double clearAisleHalfWidth(){return AISLE_HALF_WIDTH;}
    public static boolean openAisle(double x,double z){
        return Math.abs(x)<AISLE_HALF_WIDTH
            &&z>VanStaging.FRONT+.19&&z<2.25
            &&!collides(x,z,.18);
    }
}
