package org.beckenburg;

/** Ownership, placement, pickup, host light state and tiered physical models. */
public final class LanPortableLightsTest {
    private static void ok(boolean v,String why){if(!v)throw new AssertionError(why);}
    private static void denied(Runnable action,String why){
        try{action.run();throw new AssertionError(why);}catch(IllegalArgumentException expected){}
    }
    public static void main(String[] args){
        LanPortableLights lights=new LanPortableLights();
        LanWorld.Body body=new LanWorld.Body(6,0,8,0,2);
        var placed=lights.placeOrRetrieve(0,"FIRELIGHT",body,EquipmentTiers.Tier.II,true);
        ok(placed.frame().split("\\|").length==10,"ten-field bounded placement packet");
        ok(placed.mesh().equals(EquipmentModelCatalog.variant(
            "FIRELIGHT",EquipmentTiers.Tier.II,"lit")),"real lit tier model");
        ok(lights.illuminates(2)&&!lights.illuminates(3),"light belongs to its actual room");
        var off=lights.powered(0,"FIRELIGHT",false);
        ok(!off.on()&&!lights.illuminates(2),"switching off extinguishes environmental source");
        denied(()->lights.placeOrRetrieve(0,"FIRELIGHT",
            new LanWorld.Body(16,0,8,0,2),EquipmentTiers.Tier.II,false),
            "cannot remotely take placed lamp");
        var another=lights.placeOrRetrieve(1,"FLASHLIGHT",body,EquipmentTiers.Tier.I,true);
        ok(another.on()&&lights.all().size()==2,"separate hunters retain separate lights");
        ok(lights.snapshot().size()==3,"both lights replay to reconnecting investigators");
        ok(lights.placeOrRetrieve(0,"FIRELIGHT",body,EquipmentTiers.Tier.II,false)==null,
            "physical pickup removes the first lamp");
        ok(lights.at(0,"FIRELIGHT")==null&&lights.at(1,"FLASHLIGHT")!=null,
            "retrieval cannot erase another owner's lamp");
        denied(()->lights.placeOrRetrieve(2,"FLASHLIGHT",
            new LanWorld.Body(2,0,3,0,HouseMap.INDOOR_ROOMS),
            EquipmentTiers.Tier.I,true),"outdoor installation rejected");
        System.out.println("PASS: deployed lights, switching, tier housings, multiplayer pickup");
    }
}
