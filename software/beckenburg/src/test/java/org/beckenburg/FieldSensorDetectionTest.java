package org.beckenburg;

import java.util.List;

/** Physical sensor radius, room clipping and genuine event reception. */
public final class FieldSensorDetectionTest {
    private static void ok(boolean yes,String reason){if(!yes)throw new AssertionError(reason);}
    public static void main(String[] args){
        HouseMap map=new HouseMap(HouseMap.Site.HOUSE);
        int room=2;
        var kitchen=map.level().room(room);
        double x=kitchen.spawn().x(),z=kitchen.spawn().z();
        VanSensorStations nodes=new VanSensorStations();
        var motion=nodes.placeOrRetrieve(0,"MOTION_SENSOR",room,x,z,
            EquipmentTiers.Tier.I).placed();
        var sound=nodes.placeOrRetrieve(1,"SOUND_SENSOR",room,x,z,
            EquipmentTiers.Tier.II).placed();
        ok(SensorCoverage.contains(map,motion,room,x,z),"sensor covers its actual placement");
        ok(!SensorCoverage.contains(map,motion,1,x,z),"adjacent room never inherits circle");
        ok(!SensorCoverage.contains(map,motion,room,kitchen.x0()-.5,z),
            "circle clipped by room wall even near a corner");
        ok(!SensorCoverage.contains(map,motion,room,x+40,z),
            "distance rejects targets outside hardware range");
        FieldSensorDetection detection=new FieldSensorDetection();
        ok(detection.movement("G",room,x,z,30,map,List.of(motion)).isEmpty(),
            "initial actor sample is not motion");
        var moved=detection.movement("G",room,x+.35,z,31,map,List.of(motion));
        ok(moved.size()==1&&moved.get(0).kind().equals("MOTION"),
            "real in-room movement triggers one sensor");
        ok(moved.get(0).frame().split("\\|").length==6,
            "alert packet contains no actor ID or ghost coordinates");
        ok(detection.movement("G",room,x+.70,z,32,map,List.of(motion)).isEmpty(),
            "alarm cooldown suppresses per-tick beeping");
        ok(detection.movement("G",room,x+20,z,33,map,List.of(motion)).isEmpty(),
            "teleport does not fabricate motion alarm");
        ok(detection.sound(1,x,z,8,45,map,List.of(sound)).isEmpty(),
            "a different room's sound cannot leak through the wall");
        var audio=detection.sound(room,x,z,9,46,map,List.of(sound));
        ok(audio.size()==1&&audio.get(0).kind().equals("SOUND"),
            "genuine source event captured in microphone footprint");
        ok(detection.recent(sound.id(),48,18)!=null,
            "recent room sound shown on van map");
        ok(detection.recent(sound.id(),85,18)==null,
            "stale alert expires without inventing an ongoing event");
        detection.removed(sound.id());
        ok(detection.recent(sound.id(),47,18)==null,
            "retrieval removes remote alert state");
        System.out.println("PASS: room-clipped coverage, movement, microphones and privacy");
    }
}
