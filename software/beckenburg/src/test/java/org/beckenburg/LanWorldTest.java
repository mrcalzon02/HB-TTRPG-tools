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
        var portal=AuthoredTestSupport.door(map,4,3);
        AuthoredTestSupport.place(map,world,0,AuthoredTestSupport.side(map,portal,4,1.22));
        LanWorld.Body first=world.body(0);
        ok(first.room()==4,"spawn in central stair hall");
        for(int tick=1;tick<=2;tick++)world.move(0,0,-100,tick);
        ok(world.body(0).z()>portal.z()+.32,"approaching closed dining doorway");
        rejected(()->world.move(0,0,-100,2),"same-tick movement replay");
        rejected(()->world.move(0,0,-100,3),"wall/closed-door crossing");
        ok(world.door(0,4),"open adjacent architectural door");
        ok(map.doorOpen(portal.id()),"real dining door opened");
        rejected(()->world.door(0,4),"instant door spam");
        String snapshot=map.doorSnapshot();
        HouseMap remote=new HouseMap();remote.applyDoorSnapshot(snapshot);
        ok(remote.doorOpen(portal.id()),"synchronized door reconstruction");
        for(int tick=5;tick<=7;tick++)world.move(0,0,-100,tick);
        ok(world.body(0).room()==3,"physically crossed into dining room");
        ok(Math.hypot(world.body(0).x()-first.x(),world.body(0).z()-first.z())<6,
            "movement bounded across physical rooms");
        ok(world.bodyFrame(0,17).startsWith("BODY|0|"),"host body protocol");
        world.turn(0,239);ok(world.body(0).heading()==239,"heading stored");
        rejected(()->world.turn(0,360),"out-of-range turn");
        ok(map.valid(),"door state does not invalidate authored topology");
        System.out.println("PASS: host 3D world movement, collision, door snapshots, speed and invalid state gates");
    }
}
