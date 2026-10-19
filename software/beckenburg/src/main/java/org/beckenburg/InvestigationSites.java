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
    public record Prop(int room,String mesh,double dx,double y,double dz,double scale,double yaw){
        public Prop{
            if(room<0||room>=HouseMap.ROOM_COUNT||mesh==null||mesh.isBlank()
                    ||!Double.isFinite(dx)||!Double.isFinite(y)||!Double.isFinite(dz)
                    ||!Double.isFinite(scale)||scale<=0||!Double.isFinite(yaw))
                throw new IllegalArgumentException("invalid site mesh placement");
        }
    }
    private static Prop prop(int room,String mesh,double x,double z,double scale,double yaw){
        return new Prop(room,mesh,x,0,z,scale,yaw);
    }
    private static final List<Prop> FARM=List.of(
        prop(0,"display_cabinet_mp_2",-2.35,-1.1,.78,0),
        prop(1,"wardrobe_mp_1",2.2,-1.1,.92,Math.PI/2),
        prop(1,"armchair_1",-1.8,1.3,.79,0),
        prop(2,"wardrobe_mp_1",2.1,-1.15,.88,Math.PI/2),
        prop(2,"chair_mp_5",-1.8,1.1,1.05,0),
        prop(3,"sofa_1",-1.8,-1.55,.78,0),
        prop(3,"armchair_1",1.7,1.2,.78,Math.PI),
        prop(4,"dinner_table_1",-1.85,-1.5,.78,0),
        prop(5,"dinner_table_1",-1.7,-1.3,.90,0),
        prop(5,"chair_mp_5",1.0,1.35,1.05,Math.PI/2),
        prop(6,"shelf_mp_6",-2.15,-1.2,1.78,Math.PI/2),
        prop(6,"shelf_mp_6",2.1,-1.1,1.78,Math.PI/2),
        prop(7,"dinner_table_1",-.2,-1.1,1.02,0),
        prop(7,"chair_mp_5",-1.65,.8,1.05,0),
        prop(7,"chair_mp_5",1.5,1.0,1.05,Math.PI),
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
        prop(2,"dinner_table_1",-1.9,-1.1,.74,0),
        prop(2,"chair_mp_5",1.35,1.3,.98,Math.PI),
        prop(2,"shelf_mp_6",2.2,-1.25,1.48,Math.PI/2),
        prop(3,"sofa_1",-1.85,-1.3,.75,0),
        prop(3,"armchair_1",1.9,1.2,.75,Math.PI),
        prop(4,"kenney_detail_bench",-2.15,-1.5,1.38,0),
        prop(5,"dinner_table_1",-1.75,-1.2,.84,0),
        prop(5,"display_cabinet_mp_2",2.2,-1.0,.8,Math.PI/2),
        prop(6,"shelf_mp_6",-2.25,-1.5,1.95,Math.PI/2),
        prop(6,"shelf_mp_6",2.15,-1.4,1.95,Math.PI/2),
        prop(6,"dinner_table_1",1.2,1.45,.68,0),
        prop(7,"chair_mp_5",-2.1,-1.4,1.03,0),
        prop(7,"chair_mp_5",2.1,-1.35,1.03,0),
        prop(7,"dinner_table_1",1.55,1.5,.78,0),
        prop(8,"dinner_table_1",-1.65,-1.3,.78,0),
        prop(8,"armchair_1",1.8,1.2,.84,Math.PI),
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
