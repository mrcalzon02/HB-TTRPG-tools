package org.beckenburg;

import java.util.List;

/** Authored PSX interior rooms: real purchased meshes, not placeholder furniture. */
public final class CastleHubDecor {
    private CastleHubDecor(){}
    private static CastleHubMap.Furnishing f(String mesh,double x,double z,double scale,
            double yaw,double hx,double hz){
        return new CastleHubMap.Furnishing(mesh,x,z,scale,yaw,hx,hz);
    }
    public static List<CastleHubMap.Furnishing> furnishings(){return FURNISHINGS;}
    private static final List<CastleHubMap.Furnishing> FURNISHINGS=List.of(
        // Armoury: storage, display and evidence cabinets
        f("shelf_mp_6",2.4,3.5,1.70,0,.76,.26),
        f("shelf_mp_6",2.4,6.1,1.70,0,.76,.26),
        f("shelf_mp_6",2.4,8.4,1.70,0,.76,.26),
        f("display_cabinet_mp_2",7.7,2.3,1.0,Math.PI/2,.34,.70),
        f("display_cabinet_mp_2",7.7,9.2,1.0,Math.PI/2,.34,.70),
        // Contract and reading room
        f("dinner_table_1",13.5,3.4,1.0,0,.86,.56),
        f("chair_mp_5",15.9,3.7,1.12,Math.PI/2,.35,.39),
        f("chair_mp_5",11.75,3.4,1.12,0,.35,.39),
        f("armchair_1",10.95,9.2,.82,0,.62,.44),
        f("sofa_1",16.0,9.0,.75,Math.PI/2,.48,1.0),
        // Dressing suite: wardrobes and TV lounge
        f("wardrobe_mp_1",25.4,4.0,1.0,Math.PI/2,.34,.70),
        f("wardrobe_mp_1",25.4,8.4,1.0,Math.PI/2,.34,.70),
        f("sofa_1",21.4,9.0,.75,0,1.0,.48),
        f("armchair_1",20.6,3.6,.82,0,.62,.44),
        f("tv_table_1_4",24.35,2.1,1.0,Math.PI/2,.34,.83),
        // Courtyard gathering spot
        f("sofa_1",4.0,20.0,.74,0,.98,.48),
        f("armchair_1",7.25,19.6,.78,Math.PI/2,.44,.60),
        f("dinner_table_1",5.65,18.2,.65,0,.56,.38),
        // Operations and multiplayer offices
        f("display_cabinet_mp_2",11.3,13.3,.75,0,.51,.25),
        f("display_cabinet_mp_2",16.0,13.3,.75,0,.51,.25),
        f("chair_mp_5",24.1,17.7,1.12,0,.35,.39),
        f("tv_table_1_4",25.15,20.0,.82,Math.PI/2,.29,.69),
        f("armchair_1",20.4,20.0,.77,0,.57,.42),
        f("wardrobe_mp_1",25.8,13.7,.75,Math.PI/2,.27,.52)
    );
    /** Small furniture-top detail is decorative; no invisible solid boxes. */
    public record Accent(String mesh,double x,double y,double z,double scale,double yaw){}
    public static final List<Accent> ACCENTS=List.of(
        new Accent("open_book_mp_1",13.5,.88,3.4,.48,0),
        new Accent("tv_mp_1",24.35,.75,2.1,.85,Math.PI/2),
        new Accent("tv_mp_1",25.15,.62,20.0,.67,Math.PI/2),
        new Accent("book_mp_1",11.3,1.40,13.3,.42,0),
        new Accent("handheld_tablet_1",16.0,1.40,13.3,.43,0),
        new Accent("book_mp_1",5.65,.56,18.2,.36,0),
        new Accent("pc_keyboard_mp_1",22.5,.95,16.9,.55,0));
    /** Lamps use distinct authored on/off geometry. */
    public record Light(String on,String off,double x,double y,double z,double scale,double yaw){}
    public static final List<Light> LIGHTS=List.of(
        new Light("ceiling_lamp_4_on","ceiling_lamp_4_off",5,3.31,5.5,1,0),
        new Light("ceiling_lamp_4_on","ceiling_lamp_4_off",13.5,3.31,5.2,1,0),
        new Light("ceiling_lamp_4_on","ceiling_lamp_4_off",23,3.31,5.2,1,0),
        new Light("lamp_3_on","lamp_3_off",8.42,2.25,5,1,Math.PI/2),
        new Light("lamp_3_on","lamp_3_off",17.42,2.25,8.7,1,Math.PI/2),
        new Light("lamp_3_on","lamp_3_off",19.55,2.25,7.7,1,Math.PI/2),
        new Light("lamp_3_on","lamp_3_off",3,2.25,14.2,1,0),
        new Light("lamp_3_on","lamp_3_off",24.7,2.25,14,1,0),
        new Light("lamp_3_on","lamp_3_off",12.1,2.25,19.5,1,0));
    public record Switch(double x,double y,double z,double yaw){}
    public static final List<Switch> SWITCHES=List.of(
        new Switch(8.25,1.45,6.1,Math.PI/2),
        new Switch(17.25,1.45,6.1,Math.PI/2),
        new Switch(24.7,1.45,13,0));
    /** Players must stand on traversable ground and actually look at a switch. */
    public static Switch aimed(CastleHubMap map,double x,double z,double yaw){
        if(!map.traversable(x,z)||!Double.isFinite(yaw))return null;
        Switch best=null;double alignment=.77;
        for(Switch s:SWITCHES){
            double dx=s.x()-x,dz=s.z()-z,d=Math.hypot(dx,dz);
            if(d<.3||d>2.1)continue;
            double forward=(dx*Math.sin(yaw)+dz*Math.cos(yaw))/d;
            if(forward>alignment){alignment=forward;best=s;}
        }
        return best;
    }
}
