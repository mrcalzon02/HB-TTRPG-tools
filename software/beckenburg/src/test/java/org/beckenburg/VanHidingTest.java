package org.beckenburg;
/** Physical hiding pockets must be reachable and must defeat host direct strikes. */
public final class VanHidingTest {
    private static void ok(boolean x,String why){if(!x)throw new AssertionError(why);}
    public static void main(String[] args){
        HouseMap map=new HouseMap();
        CustomContract all=new CustomContract(6,100,150,100,100,100,100,100,
            CustomContract.Sprint.LIMITED,100,true,true);
        LanWorld world=new LanWorld(map);world.configure(all);
        world.setRoom(0,4);
        ok(map.hidingSpot(4,100)!=null,"authoritative hiding pocket");
        ok(world.move(0,100,100,1),"can approach the wardrobe");
        ok(world.toggleHide(0),"nearby hunter successfully concealed");
        LanGhostSpatial.Pose ghost=new LanGhostSpatial.Pose(4,map.centerX(4),
            map.centerZ(4),0);
        ok(!LanSpatialCombat.canStrike(map,world,ghost,0),"hidden hunter cannot be struck");
        ok(world.move(0,-100,0,2),"hunter can leave the pocket");
        ok(!world.hidden(0),"moving removes concealment");
        LanWorld absent=new LanWorld(map);
        absent.configure(new CustomContract(1,100,150,100,100,100,100,100,
            CustomContract.Sprint.LIMITED,0,true,true));
        absent.setRoom(0,4);absent.move(0,100,100,1);
        try{absent.toggleHide(0);throw new AssertionError("missing hide spot");}
        catch(IllegalArgumentException expected){}
        System.out.println("PASS: 0%-100% hiding spots, concealed ghost avoidance and movement exposure");
    }
}