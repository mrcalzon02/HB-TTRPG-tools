package org.beckenburg;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Real dropped portable lights: owner, source position, tier and host power state. */
public final class LanPortableLights {
    public record Light(int owner,String tool,int room,double x,double y,double z,
                        EquipmentTiers.Tier tier,boolean on) {
        public Light {
            if(owner<0||owner>=6||room<0||room>=HouseMap.INDOOR_ROOMS
                    ||!("FLASHLIGHT".equals(tool)||"FIRELIGHT".equals(tool))
                    ||!Double.isFinite(x)||!Double.isFinite(y)||!Double.isFinite(z)
                    ||x<0||z<0||tier==null)
                throw new IllegalArgumentException("invalid placed light");
        }
        public String frame(){
            return "PORTABLE|PLACE|"+owner+"|"+tool+"|"+room+"|"
                +Math.round(x*1000)+"|"+Math.round(y*1000)+"|"
                +Math.round(z*1000)+"|"+tier+"|"+(on?1:0);
        }
        public String mesh(){
            return on&&tool.equals("FIRELIGHT")
                ?EquipmentModelCatalog.variant("FIRELIGHT",tier,"lit")
                :EquipmentModelCatalog.model(tool,tier);
        }
    }
    private final Map<String,Light> lights=new LinkedHashMap<>();
    private static String key(int owner,String tool){return owner+":"+tool;}
    public Light at(int owner,String tool){return lights.get(key(owner,tool));}
    public Light placeOrRetrieve(int owner,String tool,LanWorld.Body body,
                                 EquipmentTiers.Tier tier,boolean powered){
        if(body==null||body.room()<0||body.room()>=HouseMap.INDOOR_ROOMS)
            throw new IllegalArgumentException("place portable lighting indoors");
        Light old=at(owner,tool);
        if(old!=null){
            if(old.room()!=body.room()||Math.abs(old.y()-body.y())>.7
                    ||Math.hypot(old.x()-body.x(),old.z()-body.z())>1.5)
                throw new IllegalArgumentException("retrieve the light where it is placed");
            lights.remove(key(owner,tool));
            return null;
        }
        Light created=new Light(owner,tool,body.room(),body.x(),body.y(),
            body.z(),tier,powered);
        lights.put(key(owner,tool),created);
        return created;
    }
    public Light powered(int owner,String tool,boolean enabled){
        Light old=at(owner,tool);
        if(old==null)return null;
        Light next=new Light(old.owner(),old.tool(),old.room(),old.x(),
            old.y(),old.z(),old.tier(),enabled);
        lights.put(key(owner,tool),next);
        return next;
    }
    public boolean illuminates(int room){
        for(Light light:lights.values())if(light.on()&&light.room()==room)return true;
        return false;
    }
    public List<Light> all(){return List.copyOf(lights.values());}
    public List<String> snapshot(){
        List<String> frames=new ArrayList<>();
        frames.add("PORTABLE|RESET");
        for(Light l:lights.values())frames.add(l.frame());
        return List.copyOf(frames);
    }
}
