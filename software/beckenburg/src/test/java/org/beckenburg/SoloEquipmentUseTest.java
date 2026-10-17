package org.beckenburg;

/** Solo player actions must interact with the live investigation simulation, not the menu only. */
public final class SoloEquipmentUseTest {
    private static void ok(boolean yes,String why){if(!yes)throw new AssertionError(why);}
    public static void main(String[] args){
        HouseMap map=new HouseMap();
        InvestigationSession mission=new InvestigationSession(map,InvestigationSession.Role.OBSERVER,12345L);
        EquipmentLoadout kit=new EquipmentLoadout();
        double x=map.centerX(14),z=map.centerZ(14);
        kit.select(3);
        ok(!mission.useEquipment(kit,x,z),"outside van photo cannot register a sighting");
        ok(kit.usesLeft(EquipmentLoadout.Item.PHOTO_CAMERA)==5,"a camera exposure is consumed");
        kit.replaceAtRack(new EquipmentLoadout.Item[]{EquipmentLoadout.Item.EMF,
            EquipmentLoadout.Item.THERMOMETER,EquipmentLoadout.Item.SPIRIT_BOX,
            EquipmentLoadout.Item.UV_LAMP});
        kit.select(3);
        ok(mission.useEquipment(kit,x,z),"UV scans produce a real reading");
        ok(mission.evidenceCount()==0,"UV clue is supplementary, never fake case evidence");
        kit.replaceAtRack(new EquipmentLoadout.Item[]{EquipmentLoadout.Item.EMF,
            EquipmentLoadout.Item.THERMOMETER,EquipmentLoadout.Item.SPIRIT_BOX,
            EquipmentLoadout.Item.SALT});
        kit.select(3);
        ok(mission.useEquipment(kit,map.centerX(4),map.centerZ(4)),"salt can be placed in a real room");
        ok(kit.usesLeft(EquipmentLoadout.Item.SALT)==2,"salt is a consumed field resource");
        ok(!mission.useEquipment(kit,x,z),"salt cannot be wasted outside the house");
        ok(kit.usesLeft(EquipmentLoadout.Item.SALT)==2,"rejected salt action does not consume supplies");
        System.out.println("PASS: in-game equipment usage affects the actual solo case and expendables");
    }
}
