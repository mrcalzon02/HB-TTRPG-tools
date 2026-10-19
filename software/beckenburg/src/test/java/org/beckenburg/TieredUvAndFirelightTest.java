package org.beckenburg;

/** UV upgrades extend visibility of a REAL trace; firelights burn real finite fuel. */
public final class TieredUvAndFirelightTest {
    private static void ok(boolean test,String reason){
        if(!test)throw new AssertionError(reason);
    }
    public static void main(String[] args){
        HunterCounters marks=new HunterCounters();
        int room=4;
        ok(!marks.recentUv(room,100,160),
            "even Tier III UV cannot invent a ghost mark before one exists");
        marks.leaveUv(room,10);
        ok(marks.recentUv(room,100,90),"Tier I sees a 90-tick genuine trace");
        ok(!marks.recentUv(room,111,90),"Tier I trace detection fades naturally");
        ok(marks.recentUv(room,111,125),
            "Tier II higher power recovers a genuinely authored older mark");
        ok(!marks.recentUv(room,150,125),"Tier II trace eventually fades");
        ok(marks.recentUv(room,150,160),"Tier III detects the oldest genuine trace");
        ok(!marks.recentUv(room,171,160),"no permanent or false-positive UV");

        var gear=new FieldEquipment();
        gear.equip(3,"FIRELIGHT");gear.selectSlot(3);
        ok(gear.batterySecondsLeft("FIRELIGHT")==120,
            "Tier I firelight starts with 120s burn fuel");
        gear.advancePower(0);
        ok(gear.toggle("FIRELIGHT"),"ordinary empty-room candle ignites");
        gear.advancePower(1199);
        ok(gear.powered("FIRELIGHT"),"burning until remaining last tick");
        ok(gear.advancePower(1200).contains("FIRELIGHT")&&
            !gear.powered("FIRELIGHT"),"candle extinguishes at fuel exhaustion");
        gear.upgrade("FIRELIGHT",EquipmentTiers.Tier.II);
        ok(gear.batterySecondsLeft("FIRELIGHT")==180,
            "Tier II actually gains 180s fuel");
        gear.upgrade("FIRELIGHT",EquipmentTiers.Tier.III);
        ok(gear.batterySecondsLeft("FIRELIGHT")==270,
            "Tier III actually gains 270s fuel");
        ok(gear.toggle("FIRELIGHT"),"upgraded candle still ignites normally");
        gear.advancePower(3900);
        ok(!gear.powered("FIRELIGHT"),"upgraded candle is not infinite");
        gear.rechargeAtVan();
        ok(gear.batterySecondsLeft("FIRELIGHT")==270,
            "tiered lantern refuels at authoritative van service");
        System.out.println("PASS: three-tier true UV sensitivity and finite 120/180/270s firelight");
    }
}
