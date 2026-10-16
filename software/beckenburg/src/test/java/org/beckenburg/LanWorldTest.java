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
        rejected(()->world.move(3,100,0,1),"ghost seat world movement");
        rejected(()->world.move(0,200,0,1),"oversized movement");
        rejected(()->world.move(0,0,0,1),"zero length movement");
        world.setRoom(0,4); // Main hall x=12.5 z=9.5; north door at x12/z6 is closed.
        LanWorld.Body first=world.body(0);
        ok(first.room()==4,"spawn in hall");
        for(int tick=1;tick<=7;tick++)world.move(0,0,-100,tick);
        double before=world.body(0).z();
        ok(before>6.5,"approaching closed threshold");
        rejected(()->world.move(0,0,-100,7),"same-tick movement replay");
        rejected(()->world.move(0,0,-100,8),"wall/closed-door crossing");
        ok(world.door(0,8),"open adjacent door");
        ok(map.doorOpen(12,6),"real door tile opened");
        rejected(()->world.door(0,8),"instant door spam");
        String snapshot=map.doorSnapshot();
        HouseMap remote=new HouseMap();remote.applyDoorSnapshot(snapshot);
        ok(remote.doorOpen(12,6),"synchronized door reconstruction");
        for(int tick=9;tick<=14;tick++)world.move(0,0,-100,tick);
        ok(world.body(0).room()==1,"moved through opened door into bedroom");
        ok(Math.hypot(world.body(0).x()-first.x(),world.body(0).z()-first.z())<5,"bounded physical motion");
        ok(world.bodyFrame(0,14).startsWith("BODY|0|"),"host body protocol");
        world.turn(0,239);ok(world.body(0).heading()==239,"heading stored");
        rejected(()->world.turn(0,360),"out-of-range turn");
        ok(map.valid(),"door state does not invalidate authored topology");
        System.out.println("PASS: host 3D world movement, collision, door snapshots, speed and invalid state gates");
    }
}
