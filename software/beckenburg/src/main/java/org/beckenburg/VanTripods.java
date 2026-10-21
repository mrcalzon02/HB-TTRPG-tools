package org.beckenburg;

import java.util.ArrayList;
import java.util.List;

/** Physical, owner-placed camera tripods; distinct from camera ownership. */
public final class VanTripods {
    public record Stand(int owner,int room,double x,double y,double z,
                        EquipmentTiers.Tier tier) {
        public Stand {
            if(owner<0||owner>=6||room<0||room>=HouseMap.INDOOR_ROOMS
                    ||!Double.isFinite(x)||!Double.isFinite(y)||!Double.isFinite(z)
                    ||x<0||z<0||tier==null)
                throw new IllegalArgumentException("invalid physical tripod");
        }
        public String frame(){
            return "TRIPOD|PLACE|"+owner+"|"+room+"|"+
                Math.round(x*1000)+"|"+Math.round(y*1000)+"|"+
                Math.round(z*1000)+"|"+tier;
        }
        public String mesh(){return EquipmentModelCatalog.model("TRIPOD",tier);}
    }
    private final Stand[] stands=new Stand[6];
    public Stand at(int owner){
        if(owner<0||owner>=6)throw new IllegalArgumentException("invalid tripod owner");
        return stands[owner];
    }
    public Stand placeOrRetrieve(int owner,LanWorld.Body body,EquipmentTiers.Tier tier){
        if(body==null||tier==null||body.room()<0
                ||body.room()>=HouseMap.INDOOR_ROOMS)
            throw new IllegalArgumentException("tripod requires an indoor position");
        Stand old=at(owner);
        if(old!=null){
            if(old.room()!=body.room()||Math.abs(old.y()-body.y())>.65
                    ||Math.hypot(old.x()-body.x(),old.z()-body.z())>1.5)
                throw new IllegalArgumentException("retrieve tripod beside its stand");
            stands[owner]=null;return null;
        }
        Stand created=new Stand(owner,body.room(),body.x(),body.y(),body.z(),tier);
        stands[owner]=created;
        return created;
    }
    public Stand near(LanWorld.Body body,double reach){
        if(body==null||reach<0)throw new IllegalArgumentException("invalid camera mount");
        Stand nearest=null;double best=reach;
        for(Stand s:stands){
            if(s==null||s.room()!=body.room()||Math.abs(s.y()-body.y())>.5)continue;
            double dist=Math.hypot(s.x()-body.x(),s.z()-body.z());
            if(dist<=best){best=dist;nearest=s;}
        }
        return nearest;
    }
    public List<Stand> all(){
        List<Stand> result=new ArrayList<>();
        for(Stand s:stands)if(s!=null)result.add(s);
        return List.copyOf(result);
    }
}
