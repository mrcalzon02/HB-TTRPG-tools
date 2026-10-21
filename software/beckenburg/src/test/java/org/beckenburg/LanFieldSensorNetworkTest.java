package org.beckenburg;

import java.util.concurrent.TimeUnit;

/** Loopback LAN: shelf pickup, world installation, live pulse, private map. */
public final class LanFieldSensorNetworkTest {
    private static void ok(boolean v,String msg){if(!v)throw new AssertionError(msg);}
    public static void main(String[] args)throws Exception{
        try(var host=new LanHost("127.0.0.1",0,GhostIdentity.Type.SPIRIT);
            var a=new AuthoredLevelNetworkTest.Peer(host.port(),false,"SensorTech");
            var b=new AuthoredLevelNetworkTest.Peer(host.port(),false,"Walker");
            var c=new AuthoredLevelNetworkTest.Peer(host.port(),false,"Observer");
            var ghost=new AuthoredLevelNetworkTest.Peer(host.port(),true,"Specter")){
            a.client.ready();b.client.ready();c.client.ready();ghost.client.ready();
            a.await("LOBBY|3|HUMAN|4|WAITING");
            a.client.start();a.await("INFO|mission started");
            a.client.view3D();a.await("ACCEPT|VIEW3D");
            b.client.view3D();b.await("ACCEPT|VIEW3D");
            ghost.client.viewGhost3D();ghost.await("ACCEPT|GVIEW3D");
            var map=(HouseMap)LooseClutterNetworkTest.field(host,"map");
            var world=(LanWorld)LooseClutterNetworkTest.field(host,"world");
            var lock=LooseClutterNetworkTest.field(host,"mutex");
            var rack=map.van().location(VanStaging.Station.EQUIPMENT);
            synchronized(lock){
                AuthoredTestSupport.place(map,world,0,
                    new LevelDefinition.Vec(rack.x(),VanStaging.FLOOR_Y,rack.z()));
            }
            a.client.equipAt(0,"MOTION_SENSOR");
            a.await("ACCEPT|GEAREQUIP");
            var kitchen=map.spawn(2);
            synchronized(lock){
                AuthoredTestSupport.place(map,world,0,kitchen);
                AuthoredTestSupport.place(map,world,1,kitchen);
            }
            a.client.useHeldEquipment();
            ok(a.await("SENSOR|PLACE|").contains("|MOTION_SENSOR|2|"),
                "deployed motion node reaches team with authored room");
            a.await("ACCEPT|GEARUSE|MOTION_SENSOR|");
            Thread.sleep(270);
            synchronized(lock){
                AuthoredTestSupport.place(map,world,1,new LevelDefinition.Vec(
                    kitchen.x()+.30,kitchen.y(),kitchen.z()));
            }
            String pulse=a.await("SENSOR|ALERT|");
            ok(pulse.contains("|MOTION|"),"actual movement produces live motion packet");
            ok(ghost.inbox.stream().noneMatch(row->
                row.startsWith("SENSOR|")||row.startsWith("VANMETERS|")),
                "ghost seat cannot subscribe to investigator sensors");
            Thread.sleep(850); // Host's physical device refresh, not an inventory shortcut.
            a.client.useHeldEquipment();
            ok(a.await("SENSOR|CLEAR|").startsWith("SENSOR|CLEAR|"),
                "sensor can be physically retrieved");
            System.out.println("PASS: TCP placed sensor, motion alarm, retrieval, ghost privacy");
        }
    }
}
