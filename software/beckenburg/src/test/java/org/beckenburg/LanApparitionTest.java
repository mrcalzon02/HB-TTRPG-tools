package org.beckenburg;

/** Apparitions are physically visible only when the host permits a hunter to see them. */
public final class LanApparitionTest {
    private static void ok(boolean value, String message){if(!value)throw new AssertionError(message);}
    public static void main(String[] args){
        HouseMap map=new HouseMap();LanWorld world=new LanWorld(map);
        LanGhostSpatial ghost=new LanGhostSpatial(map,4);
        world.setRoom(0,4);
        LanWorld.Body viewer=world.body(0);
        String visible=LanApparition.frame(map,viewer,true,ghost.pose(),true,90);
        ok(visible.equals("APPARITION|VISIBLE|"+Math.round(ghost.pose().x()*1000)+"|"+Math.round(ghost.pose().y()*1000)+"|"+Math.round(ghost.pose().z()*1000)+"|90"),"exact host pose disclosed only in line of sight");
        ok(LanApparition.frame(map,viewer,true,ghost.pose(),false,91).equals("APPARITION|HIDDEN|91"),"unmanifested ghost not visible");
        ok(LanApparition.frame(map,viewer,false,ghost.pose(),true,91).contains("HIDDEN"),"room-only mode sees no 3D position");
        world.setRoom(0,HouseMap.EXTRACTION_ROOM);
        ok(LanApparition.frame(map,world.body(0),true,ghost.pose(),true,92).contains("HIDDEN"),"distant hunter sees no position");
        var door=AuthoredTestSupport.door(map,3,4);var a=AuthoredTestSupport.side(map,door,3,.7);var b=AuthoredTestSupport.side(map,door,4,.7);
        ok(!LanApparition.lineOfSight(map,a.x(),a.z(),b.x(),b.z()),"closed door occludes ghost");
        ok(map.toggleNearestDoor(a.x(),a.y(),a.z()),"test door opens");
        ok(LanApparition.lineOfSight(map,a.x(),a.z(),b.x(),b.z()),"open doorway reveals apparition");
        ok(!LanApparition.lineOfSight(map,a.x()-12,a.z(),b.x(),b.z()),"distant ghost not revealed");
        ok(!LanApparition.lineOfSight(map,Double.NaN,1,2,1),"nonfinite positions rejected");
        try{LanApparition.frame(map,viewer,true,ghost.pose(),true,-1);throw new AssertionError("negative tick permitted");}
        catch(IllegalArgumentException expected){}
        System.out.println("PASS: exact-position LAN apparition, room privacy, occlusion, range, despawn");
    }
}
