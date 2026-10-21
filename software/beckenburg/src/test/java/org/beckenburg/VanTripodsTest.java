package org.beckenburg;

/** World-anchored tripod/camera behavior; no remote pickup or invisible support. */
public final class VanTripodsTest {
    private static void ok(boolean v,String reason){if(!v)throw new AssertionError(reason);}
    private static void fail(Runnable r,String reason){
        try{r.run();throw new AssertionError(reason);}catch(IllegalArgumentException expected){}
    }
    public static void main(String[] args){
        VanTripods tripods=new VanTripods();
        LanWorld.Body byDoor=new LanWorld.Body(5,0,5,0,2);
        VanTripods.Stand stand=tripods.placeOrRetrieve(0,byDoor,EquipmentTiers.Tier.II);
        ok(stand!=null&&stand.room()==2&&stand.frame().split("\\|").length==8,
            "placed tripod broadcasts real owner, room, pose and tier");
        ok(tripods.near(new LanWorld.Body(5.6,0,5,90,2),.9)==stand,
            "another hunter can find the same co-op camera support");
        LanVideoCameras camera=new LanVideoCameras();
        var deployed=camera.placeOrRetrieve(1,new LanWorld.Body(5.6,0,5,90,2),
            EquipmentTiers.Tier.I,stand);
        ok(Math.abs(deployed.x()-5)<.001&&Math.abs(deployed.z()-5)<.001,
            "camera anchored on stand rather than on hunter hands");
        ok(Math.abs(deployed.y()-.45)<.001,"mounted camera gets raised lens pose");
        fail(()->tripods.placeOrRetrieve(0,new LanWorld.Body(15,0,15,0,2),
            EquipmentTiers.Tier.II),"cannot retrieve stand from across room");
        ok(tripods.placeOrRetrieve(0,byDoor,EquipmentTiers.Tier.II)==null,
            "stand retrieved only at physical location");
        ok(tripods.all().isEmpty(),"removed support absent from world");
        fail(()->tripods.placeOrRetrieve(0,new LanWorld.Body(5,0,5,0,HouseMap.INDOOR_ROOMS),
            EquipmentTiers.Tier.I),"cannot install outdoors");
        System.out.println("PASS: physical tripods, tier state and mounted camera pose");
    }
}
