package org.beckenburg;

/** Camera line-of-sight is governed by actual map doors, not a UI-only sight flag. */
public final class EquipmentSightTest {
    private static void ok(boolean b,String reason){if(!b)throw new AssertionError(reason);}
    public static void main(String[] args){
        HouseMap map=new HouseMap();
        double x=map.centerX(4),z=map.centerZ(4);
        double tx=map.centerX(7),tz=map.centerZ(7);
        ok(!map.clearLineOfSight(x,z,tx,tz),"closed door blocks photo");
        ok(map.toggleNearestDoor(12.5,12.5),"door is actually operable");
        ok(map.clearLineOfSight(x,z,tx,tz),"open door permits photo");
        ok(!map.clearLineOfSight(Double.NaN,z,tx,tz),"nonfinite camera path rejected");
        System.out.println("PASS: playable house geometry occludes camera evidence");
    }
}
