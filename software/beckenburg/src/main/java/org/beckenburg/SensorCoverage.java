package org.beckenburg;

/** Physical, room-bounded coverage shared by live host detection and van map. */
public final class SensorCoverage {
    private SensorCoverage(){}
    public static double radius(VanSensorStations.Station station){
        if(!VanSensorStations.supported(station.tool()))throw new IllegalArgumentException("unsupported sensor");
        return EquipmentTiers.stage(station.tool(),station.tier()).reachCm()/100d;
    }
    public static boolean contains(HouseMap map,VanSensorStations.Station station,
                                   int room,double x,double z){
        if(map==null||station==null||room!=station.room()
                ||!Double.isFinite(x)||!Double.isFinite(z)
                ||Math.hypot(x-station.x(),z-station.z())>radius(station))
            return false;
        double y=map.floorY(room)+1.0;
        // The room and a physical line-of-sight test must both pass. Neither
        // neighboring wings nor walls become part of the detector's circle.
        return map.roomAt(x,y,z)==room
            &&map.roomAt(station.x(),y,station.z())==room
            &&map.clearLineOfSight(station.x(),y,station.z(),x,y,z);
    }
}
