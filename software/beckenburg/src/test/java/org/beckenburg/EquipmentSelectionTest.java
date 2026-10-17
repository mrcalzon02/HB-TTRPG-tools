package org.beckenburg;

import java.util.Arrays;

public final class EquipmentSelectionTest {
    private static void ok(boolean b,String reason){if(!b)throw new AssertionError(reason);}
    private static void reject(Runnable run){try{run.run();throw new AssertionError("accepted illegal selection");}catch(IllegalArgumentException expected){}}
    public static void main(String[] args){
        var kit=new EquipmentLoadout();
        ok(kit.at(0)==EquipmentLoadout.Item.EMF&&kit.at(3)==EquipmentLoadout.Item.PHOTO_CAMERA,"default loadout");
        kit.select(3);
        ok(kit.equipped()==EquipmentLoadout.Item.PHOTO_CAMERA,"hotbar selection selects the held item");
        for(int i=0;i<6;i++)ok(kit.consume(EquipmentLoadout.Item.PHOTO_CAMERA),"exposure consumed once");
        ok(!kit.consume(EquipmentLoadout.Item.PHOTO_CAMERA)&&kit.usesLeft(EquipmentLoadout.Item.PHOTO_CAMERA)==0,"cannot photograph without film");
        var before=kit.at(2);
        reject(()->kit.replaceAtRack(new EquipmentLoadout.Item[]{EquipmentLoadout.Item.EMF,EquipmentLoadout.Item.EMF,EquipmentLoadout.Item.UV_LAMP,EquipmentLoadout.Item.SALT}));
        ok(kit.at(2)==before,"invalid rack assignment is atomic");
        kit.replaceAtRack(new EquipmentLoadout.Item[]{EquipmentLoadout.Item.EMF,EquipmentLoadout.Item.THERMOMETER,EquipmentLoadout.Item.SPIRIT_BOX,EquipmentLoadout.Item.SALT});
        ok(kit.equipped()==EquipmentLoadout.Item.SALT&&kit.usesLeft(EquipmentLoadout.Item.PHOTO_CAMERA)==6,"rack slot changes and restocks gear");
        for(int i=0;i<3;i++)ok(kit.consume(EquipmentLoadout.Item.SALT),"salt placement consumes pouch");
        ok(!kit.consume(EquipmentLoadout.Item.SALT),"salt runs out");
        reject(()->kit.select(4));reject(()->kit.replaceAtRack(new EquipmentLoadout.Item[]{EquipmentLoadout.Item.EMF}));
        ok(Arrays.stream(EquipmentLoadout.Item.values()).filter(EquipmentLoadout.Item::evidence).count()==3,"three evidence families remain mandatory");
        System.out.println("PASS: four-slot selection, distinct rack swaps, consumables and resupply");
    }
}