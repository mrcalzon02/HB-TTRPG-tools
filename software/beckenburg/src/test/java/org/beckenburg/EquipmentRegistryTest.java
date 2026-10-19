package org.beckenburg;

import java.util.HashSet;

/** Preserve the complete equipment comparison baseline and originals without fake release claims. */
public final class EquipmentRegistryTest {
    private static void ok(boolean state,String reason){
        if(!state)throw new AssertionError(reason);
    }
    public static void main(String[] args){
        ok(EquipmentRegistry.all().size()==42,"42 indexed items");
        ok(EquipmentRegistry.byOrigin(EquipmentRegistry.Origin.STARTER).size()==8,
            "8 reference starters");
        ok(EquipmentRegistry.byOrigin(EquipmentRegistry.Origin.OPTIONAL).size()==13,
            "13 reference optional tools");
        ok(EquipmentRegistry.byOrigin(EquipmentRegistry.Origin.TRUCK).size()==7,
            "7 reference truck systems");
        ok(EquipmentRegistry.byOrigin(EquipmentRegistry.Origin.ORIGINAL).size()==14,
            "14 Beckenburg designs");
        var ids=new HashSet<String>();
        for(var item:EquipmentRegistry.all())
            ok(ids.add(item.id()),"all item IDs must be unique");
        ok(EquipmentRegistry.get("EMF_READER").candidateReadings().contains(
            EquipmentRegistry.Evidence.HIGH_EMF),"EMF can measure numeric event");
        var thermometer=EquipmentRegistry.get("THERMOMETER").candidateReadings();
        ok(thermometer.contains(EquipmentRegistry.Evidence.FREEZING)
            &&thermometer.contains(EquipmentRegistry.Evidence.EXTREME_HEAT),
            "thermometer supports both cold and hot evidence");
        ok(!EquipmentRegistry.couldDetect(EquipmentRegistry.Evidence.ECTOPLASM).isEmpty(),
            "original ectoplasm sample tool exists in data registry");
        ok(EquipmentRegistry.get("VIDEO_CAMERA").lan()==EquipmentRegistry.State.ABSENT,
            "reference-only video must not be mislabeled implemented");
        ok(EquipmentRegistry.get("SOUND_RECORDER").lan()==EquipmentRegistry.State.PARTIAL_SOURCE
            &&EquipmentRegistry.get("SOUND_RECORDER").solo()==EquipmentRegistry.State.ABSENT,
            "LAN recorder source is integrated; legacy solo is not claimed complete");
        System.out.println("PASS: 42 equipment entries, status separation, and evidence families");
    }
}
