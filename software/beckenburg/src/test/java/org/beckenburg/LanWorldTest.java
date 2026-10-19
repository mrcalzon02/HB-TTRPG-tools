package org.beckenburg;

/** Fixed-step world authority: physical collision, door cooldowns and snapshots. */
public final class LanWorldTest {
    private static void ok(boolean value,String message){if(!value)throw new AssertionError(message);}
    private static void rejected(Runnable f,String tag){try{f.run();throw new AssertionError(tag+" was accepted");}catch(IllegalArgumentException accepted){}}
    public static void main(String[] args){
        HouseMap map=new HouseMap();
        LanWorld world=new LanWorld(map);
        ok(map.valid(),"valid initial map");
        rejected(()->map.applyDoorSnapshot("garbage"),"invalid door ID");
        rejected(()->map.applyDoorSnapshot("10,10"),"duplicate door ID");
        ok(world.body(5).room()==HouseMap.EXTRACTION_ROOM,"sixth hunter has a real world body");
        rejected(()->world.move(6,100,0,1),"ghost seat world movement");
        rejected(()->world.move(0,200,0,1),"oversized movement");
        rejected(()->world.move(0,0,0,1),"zero length movement");
        world.setRoom(0,4); // Victorian stair hall: physical parlour door x18/z30.
        LanWorld.Body first=world.body(0);
        ok(first.room()==4,"spawn in central stair hall");
        for(int tick=1;tick<=13;tick++)world.move(0,-100,0,tick);
        double before=world.body(0).x();
        ok(before>19.2,"approaching closed west parlour doorway");
        rejected(()->world.move(0,-100,0,13),"same-tick movement replay");
        rejected(()->world.move(0,-100,0,14),"wall/closed-door crossing");
        ok(world.door(0,14),"open adjacent architectural door");
        ok(map.doorOpen(18,30),"real Victorian parlour door tile opened");
        rejected(()->world.door(0,14),"instant door spam");
        String snapshot=map.doorSnapshot();
        HouseMap remote=new HouseMap();remote.applyDoorSnapshot(snapshot);
        ok(remote.doorOpen(18,30),"synchronized door reconstruction");
        for(int tick=15;tick<=17;tick++)world.move(0,-100,0,tick);
        ok(world.body(0).room()==3,"physically crossed into front parlour");
        ok(Math.hypot(world.body(0).x()-first.x(),world.body(0).z()-first.z())<6,
            "movement bounded across physical rooms");
        ok(world.bodyFrame(0,17).startsWith("BODY|0|"),"host body protocol");
        world.turn(0,239);ok(world.body(0).heading()==239,"heading stored");
        rejected(()->world.turn(0,360),"out-of-range turn");
        ok(map.valid(),"door state does not invalidate authored topology");
        System.out.println("PASS: host 3D world movement, collision, door snapshots, speed and invalid state gates");
    }
}
