package org.beckenburg;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/** Authored licensed-runtime-mesh furniture, shared by solo and LAN scenes.
 * Models are already individually imported GLBs under assets/runtime/models;
 * source ZIPs/Blend files are not copied into the playable distribution.
 */
public final class InvestigationSites {
    private InvestigationSites(){}
    /** Map scenery is an allow-list. Evidence/countermeasure equipment is NEVER
     * a world-map decorative prop or an item found in an investigation location.
     * Devices appear only through player ownership and authorized deployment.
     */
    private static final java.util.Set<String> SCENERY_MESHES=java.util.Set.of(
        "armchair_1","sofa_1","dinner_table_1","wardrobe_mp_1",
        "display_cabinet_mp_2","chair_mp_5","shelf_mp_6",
        "tv_mp_1","tv_table_1_4","kenney_detail_bench",
        "kenney_detail_dumpster_closed","kenney_detail_barrier_type_a"
    );
    public static boolean permittedScenery(String mesh){
        return mesh!=null&&SCENERY_MESHES.contains(mesh)
            &&!EquipmentModelCatalog.approved(mesh);
    }
    public record Prop(int room,String mesh,double dx,double y,double dz,double scale,double yaw){
        public Prop{
            if(room<0||room>=HouseMap.ROOM_COUNT||!permittedScenery(mesh)
                    ||!Double.isFinite(dx)||!Double.isFinite(y)||!Double.isFinite(dz)
                    ||!Double.isFinite(scale)||scale<=0||!Double.isFinite(yaw))
                throw new IllegalArgumentException("invalid site mesh placement");
        }
    }
    /** Conservative physical radius relative to the imported model's authored scale.
     * Host-side collision shares the same placement as render; no false invisible props.
     */
    public static double radius(Prop prop){
        double base=switch(prop.mesh()){
            case "dinner_table_1"->.82;
            case "sofa_1"->1.13;
            case "shelf_mp_6"->.42;
            case "wardrobe_mp_1"->.64;
            case "display_cabinet_mp_2"->.54;
            case "kenney_detail_bench"->.50;
            case "chair_mp_5"->.38;
            case "armchair_1"->.53;
            default->.30;
        };
        return base*prop.scale();
    }
    private static Prop prop(int room,String mesh,double x,double z,double scale,double yaw){
        return new Prop(room,mesh,x,0,z,scale,yaw);
    }
    private static final List<Prop> HOUSE=List.of(
        // Ground-floor WC: domestic cabinets, not a discoverable investigation device.
        prop(0,"display_cabinet_mp_2",-4.6,-1.40,.74,Math.PI/2),
        // Victorian drawing room: deliberately composed seating group and bookcase.
        prop(1,"sofa_1",-2.70,-2.35,.83,0),
        prop(1,"armchair_1",2.45,-2.15,.87,Math.PI/2),
        prop(1,"armchair_1",3.80,2.15,.87,Math.PI),
        prop(1,"dinner_table_1",-1.10,1.85,.62,0),
        prop(1,"display_cabinet_mp_2",-5.15,3.55,.87,Math.PI/2),
        // Breakfast room: natural central table, sideboard and facing chairs.
        prop(2,"dinner_table_1",-1.25,-1.65,.96,0),
        prop(2,"chair_mp_5",2.35,-1.35,1.0,Math.PI/2),
        prop(2,"chair_mp_5",-2.60,1.85,1.0,Math.PI),
        prop(2,"display_cabinet_mp_2",5.0,3.0,.82,Math.PI/2),
        // Parlour: informal family seating and historical shelving.
        prop(3,"sofa_1",-3.15,-2.45,.84,0),
        prop(3,"armchair_1",2.85,-2.05,.87,Math.PI),
        prop(3,"dinner_table_1",.40,2.85,.67,0),
        prop(3,"shelf_mp_6",-5.20,2.75,1.55,Math.PI/2),
        // Stair hall: circulation spine kept open, fixtures at its edges.
        prop(4,"display_cabinet_mp_2",-3.15,-13.8,.78,Math.PI/2),
        prop(4,"kenney_detail_bench",3.0,12.5,1.21,0),
        // Working kitchen: heavy fitted household furniture.
        prop(5,"dinner_table_1",-1.80,-2.0,.88,0),
        prop(5,"chair_mp_5",1.55,1.50,.96,Math.PI/2),
        prop(5,"display_cabinet_mp_2",4.45,-3.25,.91,Math.PI/2),
        prop(5,"shelf_mp_6",-5.0,3.35,1.55,Math.PI/2),
        // Library: full-sided shelving and a private reading arrangement.
        prop(6,"shelf_mp_6",-5.0,-3.55,1.90,Math.PI/2),
        prop(6,"shelf_mp_6",-5.0,3.30,1.90,Math.PI/2),
        prop(6,"shelf_mp_6",4.85,-3.50,1.90,Math.PI/2),
        prop(6,"armchair_1",2.45,2.65,.88,Math.PI),
        // Formal dining: prominent central table and surrounding chairs.
        prop(7,"dinner_table_1",-1.0,-1.60,1.05,0),
        prop(7,"chair_mp_5",-3.1,-2.80,1.0,0),
        prop(7,"chair_mp_5",2.50,-2.80,1.0,Math.PI/2),
        prop(7,"chair_mp_5",-3.1,2.05,1.0,Math.PI),
        prop(7,"chair_mp_5",2.55,2.0,1.0,Math.PI),
        prop(7,"display_cabinet_mp_2",5.05,3.0,.88,Math.PI/2),
        // Writing study: substantial desk, reader's chair and archive.
        prop(8,"dinner_table_1",-2.05,-1.90,.82,0),
        prop(8,"chair_mp_5",1.20,-1.80,1.0,0),
        prop(8,"shelf_mp_6",4.85,-3.3,1.70,Math.PI/2),
        prop(8,"display_cabinet_mp_2",4.90,3.10,.81,Math.PI/2),
        // Cellar stair vestibule and scullery are sparse functional spaces.
        prop(9,"shelf_mp_6",-4.0,-1.05,1.50,Math.PI/2),
        prop(10,"display_cabinet_mp_2",-3.0,4.05,.80,Math.PI/2),
        prop(10,"kenney_detail_bench",3.0,-4.0,1.20,0),
        prop(11,"shelf_mp_6",-5.10,-2.70,1.65,Math.PI/2),
        prop(11,"shelf_mp_6",4.90,2.95,1.65,Math.PI/2),
        prop(11,"display_cabinet_mp_2",4.95,-2.75,.80,Math.PI/2),
        // Architectural outdoor amenities; no purchased survey instruments.
        prop(12,"kenney_detail_bench",-3.1,-1.10,1.48,0),
        prop(13,"kenney_detail_bench",-2.15,.85,1.15,Math.PI/2)
    );
    private static final List<Prop> FARM=List.of(
        prop(0,"display_cabinet_mp_2",-2.35,-1.1,.78,0),
        prop(1,"wardrobe_mp_1",2.2,-1.1,.92,Math.PI/2),
        prop(1,"armchair_1",-1.8,1.3,.79,0),
        prop(1,"display_cabinet_mp_2",-4.35,-2.45,.80,Math.PI/2),
        prop(1,"chair_mp_5",3.65,2.55,.92,Math.PI),
        prop(2,"wardrobe_mp_1",2.1,-1.15,.88,Math.PI/2),
        prop(2,"chair_mp_5",-1.8,1.1,1.05,0),
        prop(3,"sofa_1",-1.8,-1.55,.78,0),
        prop(3,"armchair_1",1.7,1.2,.78,Math.PI),
        prop(3,"tv_table_1_4",4.05,-2.50,.82,Math.PI/2),
        prop(3,"tv_mp_1",4.05,-2.50,.82,Math.PI/2),
        prop(3,"display_cabinet_mp_2",-4.0,2.65,.86,Math.PI/2),
        prop(4,"dinner_table_1",-1.85,-1.5,.78,0),
        prop(5,"dinner_table_1",-1.7,-1.3,.90,0),
        prop(5,"chair_mp_5",1.0,1.35,1.05,Math.PI/2),
        prop(5,"display_cabinet_mp_2",-4.0,2.65,.94,Math.PI/2),
        prop(5,"shelf_mp_6",3.95,2.45,1.40,Math.PI/2),
        prop(6,"shelf_mp_6",-2.15,-1.2,1.78,Math.PI/2),
        prop(6,"shelf_mp_6",2.1,-1.1,1.78,Math.PI/2),
        prop(6,"shelf_mp_6",-4.0,2.5,1.65,Math.PI/2),
        prop(6,"shelf_mp_6",4.0,2.5,1.65,Math.PI/2),
        prop(7,"dinner_table_1",-.2,-1.1,1.02,0),
        prop(7,"chair_mp_5",-1.65,.8,1.05,0),
        prop(7,"chair_mp_5",1.5,1.0,1.05,Math.PI),
        prop(7,"display_cabinet_mp_2",-4.1,-2.4,.86,Math.PI/2),
        prop(7,"display_cabinet_mp_2",4.0,-2.4,.86,Math.PI/2),
        prop(8,"display_cabinet_mp_2",-2.15,-1.1,.89,Math.PI/2),
        prop(8,"armchair_1",1.9,1.3,.82,Math.PI),
        prop(9,"shelf_mp_6",2.0,-1.5,1.58,Math.PI/2),
        prop(10,"wardrobe_mp_1",2.15,-1.0,.90,Math.PI/2),
        prop(11,"display_cabinet_mp_2",2.2,-1.45,.82,Math.PI/2),
        prop(12,"kenney_detail_bench",-1.45,-1.0,1.75,0),
        prop(13,"kenney_detail_bench",1.3,-1.4,1.55,Math.PI/2)
    );
    private static final List<Prop> SCHOOL=List.of(
        prop(0,"display_cabinet_mp_2",-2.3,-1.2,.78,0),
        prop(1,"dinner_table_1",-1.9,-1.25,.74,0),
        prop(1,"chair_mp_5",1.5,1.3,.98,Math.PI),
        prop(1,"shelf_mp_6",2.20,-1.3,1.48,Math.PI/2),
        prop(1,"dinner_table_1",-3.8,2.45,.70,0),
        prop(1,"dinner_table_1",3.6,2.45,.70,0),
        prop(1,"chair_mp_5",-3.8,3.4,.84,Math.PI),
        prop(1,"chair_mp_5",3.6,3.4,.84,Math.PI),
        prop(2,"dinner_table_1",-1.9,-1.1,.74,0),
        prop(2,"chair_mp_5",1.35,1.3,.98,Math.PI),
        prop(2,"shelf_mp_6",2.2,-1.25,1.48,Math.PI/2),
        prop(2,"dinner_table_1",-3.8,2.45,.70,0),
        prop(2,"dinner_table_1",3.6,2.45,.70,0),
        prop(2,"chair_mp_5",-3.8,3.4,.84,Math.PI),
        prop(2,"chair_mp_5",3.6,3.4,.84,Math.PI),
        prop(3,"sofa_1",-1.85,-1.3,.75,0),
        prop(3,"armchair_1",1.9,1.2,.75,Math.PI),
        prop(4,"kenney_detail_bench",-2.15,-1.5,1.38,0),
        prop(5,"dinner_table_1",-1.75,-1.2,.84,0),
        prop(5,"display_cabinet_mp_2",2.2,-1.0,.8,Math.PI/2),
        prop(6,"shelf_mp_6",-2.25,-1.5,1.95,Math.PI/2),
        prop(6,"shelf_mp_6",2.15,-1.4,1.95,Math.PI/2),
        prop(6,"shelf_mp_6",-4.2,-2.25,1.83,Math.PI/2),
        prop(6,"shelf_mp_6",4.1,-2.20,1.83,Math.PI/2),
        prop(6,"dinner_table_1",1.2,1.45,.68,0),
        prop(7,"chair_mp_5",-2.1,-1.4,1.03,0),
        prop(7,"chair_mp_5",2.1,-1.35,1.03,0),
        prop(7,"dinner_table_1",1.55,1.5,.78,0),
        prop(7,"chair_mp_5",-4.15,2.50,.92,0),
        prop(7,"chair_mp_5",-2.7,2.55,.92,0),
        prop(7,"chair_mp_5",2.75,2.5,.92,Math.PI),
        prop(7,"chair_mp_5",4.1,2.55,.92,Math.PI),
        prop(8,"dinner_table_1",-1.65,-1.3,.78,0),
        prop(8,"armchair_1",1.8,1.2,.84,Math.PI),
        prop(8,"display_cabinet_mp_2",-4.15,2.50,.88,Math.PI/2),
        prop(8,"display_cabinet_mp_2",4.15,2.50,.88,Math.PI/2),
        prop(9,"shelf_mp_6",2.15,-1.15,1.45,Math.PI/2),
        prop(10,"display_cabinet_mp_2",-2.2,-1.25,.74,0),
        prop(11,"shelf_mp_6",2.2,-1.3,1.6,Math.PI/2),
        prop(12,"kenney_detail_bench",-1.55,-1.15,1.75,Math.PI/2),
        prop(13,"kenney_detail_bench",1.35,-1.15,1.55,0)
    );
    public static List<Prop> props(HouseMap.Site site,int room){
        Objects.requireNonNull(site);
        if(room<0||room>=HouseMap.ROOM_COUNT)
            throw new IllegalArgumentException("invalid room");
        List<Prop> source=switch(site){
            case HOUSE->HOUSE;
            case FARMHOUSE->FARM;
            case SCHOOL->SCHOOL;
            default->List.of();
        };
        List<Prop> found=new ArrayList<>();
        for(Prop item:source)if(item.room()==room)found.add(item);
        return List.copyOf(found);
    }
}
