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
        f("chair_mp_5",11.5,5.0,1.12,0,.35,.39),
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
        f("wardrobe_mp_1",25.8,13.7,.75,Math.PI/2,.27,.52),
        // East archive and service wings - furniture, never free field equipment.
        f("shelf_mp_6",31.3,5.4,1.58,Math.PI/2,.32,.78),
        f("shelf_mp_6",40.2,6.0,1.58,Math.PI/2,.32,.78),
        f("display_cabinet_mp_2",32.1,13.1,.92,0,.57,.31),
        f("dinner_table_1",36.0,11.8,.87,0,.81,.53),
        f("chair_mp_5",33.0,13.5,.94,Math.PI,.35,.38),
        f("chair_mp_5",38.0,12.5,.94,0,.35,.38),
        f("shelf_mp_6",31.3,21.3,1.60,Math.PI/2,.32,.78),
        f("shelf_mp_6",39.5,21.3,1.60,Math.PI/2,.32,.78),
        f("dinner_table_1",35.5,25.2,.9,0,.85,.56),
        f("armchair_1",33.0,27.7,.78,Math.PI,.61,.45),
        f("armchair_1",39.0,27.7,.78,0,.61,.45),
        f("display_cabinet_mp_2",40.5,30.5,.92,Math.PI/2,.32,.72),
        f("sofa_1",5.5,27.8,.77,0,1.05,.48),
        f("dinner_table_1",5.1,24.9,.70,0,.58,.40)
    );
    /** Small furniture-top detail is decorative; no invisible solid boxes. */
    public record Accent(String mesh,double x,double y,double z,double scale,double yaw){}
    public static final List<Accent> ACCENTS=List.of(
        new Accent("open_book_mp_1",13.5,.88,3.4,.48,0),
        new Accent("tv_mp_1",24.35,.75,2.1,.85,Math.PI/2),
        new Accent("tv_mp_1",25.15,.62,20.0,.67,Math.PI/2),
        new Accent("book_mp_1",11.3,1.40,13.3,.42,0),
        new Accent("handheld_tablet_1",16.0,1.40,13.3,.43,0),
        new Accent("book_mp_1",5.65,.56,18.2,.36,0));
    /** Licensed fixture families are explicitly assigned to real building mounts.
     * A fixture cannot be authored in the sky, over the courtyard, or behind
     * an imaginary wall. Placement, rendering and verification use this list.
     */
    public enum Mount { CEILING, WALL }
    public record Light(String on,String off,double x,double y,double z,
                        double scale,double yaw,Mount mount){
        public boolean attached(CastleHubMap map){
            if(mount==Mount.CEILING)
                return !map.solid((int)Math.floor(x),(int)Math.floor(z))
                    &&!map.outside(x,z)&&Math.abs(y-3.38)<.08;
            return CastleHubArchitecturalPlan.mountingWall(x,y,z,yaw);
        }
    }
    private static Light ceiling(String family,double x,double z,double scale){
        return new Light(family+"_on",family+"_off",x,3.38,z,scale,0,Mount.CEILING);
    }
    private static Light sconce(double x,double z,double yaw){
        return new Light("lamp_3_on","lamp_3_off",x,2.24,z,.72,yaw,Mount.WALL);
    }
    public static final List<Light> LIGHTS=List.of(
        // Different historical lamp families, fitted flush to stone-vault ceilings.
        ceiling("ceiling_lamp_1",5.0,5.5,.90),
        ceiling("ceiling_lamp_4",13.5,5.2,.67),
        ceiling("ceiling_lamp_1",23.0,5.2,.90),
        ceiling("ceiling_lamp_4",5.0,17.5,.67),
        ceiling("ceiling_lamp_1",24.0,17.5,.85),
        ceiling("ceiling_lamp_4",35.0,10.0,.64),
        ceiling("ceiling_lamp_1",35.0,25.0,.85),
        // Actual bracketed sconces on existing collision-map masonry.
        sconce(10.30,5.0,Math.PI/2),
        sconce(10.70,8.8,-Math.PI/2),
        sconce(19.30,8.0,Math.PI/2),
        sconce(19.70,4.2,-Math.PI/2),
        sconce(15.5,11.30,0),
        sconce(3.0,11.70,Math.PI),
        sconce(10.30,18.3,Math.PI/2),
        sconce(20.70,18.0,-Math.PI/2),
        sconce(28.70,23.0,-Math.PI/2),
        sconce(36.0,17.70,Math.PI));
    public record Switch(double x,double y,double z,double yaw){}
    public static final List<Switch> SWITCHES=List.of(
        new Switch(10.30,1.45,8.75,Math.PI/2),
        new Switch(10.70,1.45,8.75,-Math.PI/2),
        new Switch(20.70,1.45,14.0,-Math.PI/2));
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
