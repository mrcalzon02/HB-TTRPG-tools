package org.beckenburg;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Host-owned, physically placed EMF and thermal stations. Never sends ghost identity. */
public final class VanSensorStations {
    public record Station(int id,int owner,String tool,int room,double x,double z,
                          EquipmentTiers.Tier tier) {
        public Station {
            if(id<1||owner<0||owner>=6||room<0||room>=HouseMap.INDOOR_ROOMS
                    ||!supported(tool)||!Double.isFinite(x)||!Double.isFinite(z)
                    ||x<0||z<0||tier==null)
                throw new IllegalArgumentException("invalid sensor station");
        }
        public String frame(){
            return "SENSOR|PLACE|"+id+"|"+owner+"|"+tool+"|"+room+"|"
                +Math.round(x*1000)+"|"+Math.round(z*1000)+"|"+tier;
        }
        public String model(){
            return "blender_"+(tool.equals("EMF_ARRAY")?"emf_array_":"thermal_beacon_")
                +(tier.ordinal()+1)+"_node";
        }
    }
    public record Change(Station placed,Station removed){
        public Change {
            if((placed==null)==(removed==null))
                throw new IllegalArgumentException("exactly one placement or removal");
        }
    }
    private final Map<Integer,Station> stations=new LinkedHashMap<>();
    private int nextId=1;

    public static boolean supported(String tool){
        return "EMF_ARRAY".equals(tool)||"THERMAL_BEACON".equals(tool);
    }
    public static int capacity(String tool,EquipmentTiers.Tier tier){
        if(!supported(tool)||tier==null)throw new IllegalArgumentException("unknown array");
        return "EMF_ARRAY".equals(tool)
            ?switch(tier){case I->2;case II->3;case III->5;}
            :switch(tier){case I->2;case II->4;case III->6;};
    }
    public Change placeOrRetrieve(int owner,String tool,int room,double x,double z,
                                  EquipmentTiers.Tier tier){
        if(owner<0||owner>=6||room<0||room>=HouseMap.INDOOR_ROOMS
                ||!Double.isFinite(x)||!Double.isFinite(z)||x<0||z<0)
            throw new IllegalArgumentException("station requires a real indoor hunter position");
        int max=capacity(tool,tier);
        int count=0;
        for(Station station:stations.values())if(station.owner()==owner
                &&station.tool().equals(tool)){
            count++;
            if(station.room()==room&&Math.hypot(station.x()-x,station.z()-z)<=.8){
                stations.remove(station.id());
                return new Change(null,station);
            }
        }
        if(count>=max)
            throw new IllegalArgumentException("array full: retrieve a nearby node first");
        if(nextId>=1000000000)throw new IllegalStateException("station identifiers exhausted");
        Station placed=new Station(nextId++,owner,tool,room,x,z,tier);
        stations.put(placed.id(),placed);
        return new Change(placed,null);
    }
    public List<Station> all(){return List.copyOf(stations.values());}
    public Station at(int id){return stations.get(id);}
    public int count(int owner,String tool){
        Objects.requireNonNull(tool);
        int count=0;
        for(Station s:stations.values())if(s.owner()==owner&&s.tool().equals(tool))count++;
        return count;
    }
    public List<String> snapshot(){
        List<String> frames=new ArrayList<>();
        frames.add("SENSOR|RESET");
        for(Station station:stations.values())frames.add(station.frame());
        return List.copyOf(frames);
    }
}
