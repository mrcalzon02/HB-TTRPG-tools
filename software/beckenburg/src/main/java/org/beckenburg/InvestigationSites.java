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
        if(site==HouseMap.Site.HOUSE)return List.of();
        List<Prop> source=site==HouseMap.Site.FARMHOUSE?FARM:SCHOOL;
        List<Prop> found=new ArrayList<>();
        for(Prop item:source)if(item.room()==room)found.add(item);
        return List.copyOf(found);
    }
}
