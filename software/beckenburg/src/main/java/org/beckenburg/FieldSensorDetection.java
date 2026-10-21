package org.beckenburg;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Host-only motion and microphone receiver. Every alert comes from an actual
 * actor displacement or audible event, never a ghost identity lookup.
 */
public final class FieldSensorDetection {
    public record Pulse(int stationId,int tick,String kind,int strength){
        public Pulse {
            if(stationId<1||tick<0||(!kind.equals("MOTION")&&!kind.equals("SOUND"))
                    ||strength<1||strength>10)
                throw new IllegalArgumentException("invalid physical detector pulse");
        }
        public String frame(){
            return "SENSOR|ALERT|"+stationId+"|"+tick+"|"+kind+"|"+strength;
        }
    }
    private record Position(int room,double x,double z,int tick){}
    private final Map<String,Position> previous=new HashMap<>();
    private final Map<Integer,Pulse> recent=new HashMap<>();
    private final Map<Integer,Integer> lastAlert=new HashMap<>();
    private final Map<Integer,Integer> lastSoundSourceTick=new HashMap<>();
    private static final int ALERT_COOLDOWN=12;
    public void removed(int stationId){
        recent.remove(stationId);lastAlert.remove(stationId);
        lastSoundSourceTick.remove(stationId);
    }
    private boolean eligible(VanSensorStations.Station station,int tick){
        return tick-lastAlert.getOrDefault(station.id(),-100000)>=ALERT_COOLDOWN;
    }
    /** Single movement sample for an actual named actor (hunter or spectral entity). */
    public List<Pulse> movement(String actor,int room,double x,double z,int tick,
                                HouseMap map,List<VanSensorStations.Station> stations){
        if(actor==null||actor.isBlank()||room<0||tick<0
                ||!Double.isFinite(x)||!Double.isFinite(z))
            throw new IllegalArgumentException("invalid movement observation");
        Position old=previous.put(actor,new Position(room,x,z,tick));
        if(old==null||old.room()!=room||old.tick()>=tick)return List.of();
        double moved=Math.hypot(x-old.x(),z-old.z());
        // Ignore positional jitter and discontinuities/teleports: only real
        // local movement can trip a sensor.
        if(moved<.055||moved>2.5)return List.of();
        int strength=Math.max(1,Math.min(10,(int)Math.round(2+moved*12)));
        java.util.ArrayList<Pulse> found=new java.util.ArrayList<>();
        for(var station:stations){
            if(!station.tool().equals("MOTION_SENSOR")
                    ||!SensorCoverage.contains(map,station,room,x,z)
                    ||!eligible(station,tick))continue;
            var pulse=new Pulse(station.id(),tick,"MOTION",strength);
            recent.put(station.id(),pulse);lastAlert.put(station.id(),tick);
            found.add(pulse);
        }
        return List.copyOf(found);
    }
    /** Authoritative in-world sound emission, with source coordinates. */
    public List<Pulse> sound(int room,double x,double z,int strength,int tick,
                             HouseMap map,List<VanSensorStations.Station> stations){
        if(room<0||strength<1||strength>10||tick<0
                ||!Double.isFinite(x)||!Double.isFinite(z))
            throw new IllegalArgumentException("invalid sound source");
        java.util.ArrayList<Pulse> found=new java.util.ArrayList<>();
        for(var station:stations){
            if(!station.tool().equals("SOUND_SENSOR")
                    ||!SensorCoverage.contains(map,station,room,x,z))continue;
            int loudness=Math.max(1,Math.min(10,(int)Math.round(
                strength*(1.0-Math.hypot(x-station.x(),z-station.z())
                    /Math.max(.5,SensorCoverage.radius(station))*.45))));
            var pulse=new Pulse(station.id(),tick,"SOUND",loudness);
            recent.put(station.id(),pulse);
            lastSoundSourceTick.put(station.id(),tick);
            if(!eligible(station,tick))continue;
            lastAlert.put(station.id(),tick);
            found.add(pulse);
        }
        return List.copyOf(found);
    }
    public Pulse recent(int stationId,int tick,int duration){
        Pulse pulse=recent.get(stationId);
        return pulse!=null&&tick>=pulse.tick()&&tick-pulse.tick()<=duration
            ?pulse:null;
    }
}
