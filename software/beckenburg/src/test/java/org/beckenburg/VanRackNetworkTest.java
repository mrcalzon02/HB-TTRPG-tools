package org.beckenburg;
import java.util.*;
import java.util.concurrent.TimeUnit;
/** Real sockets: shared remaining quantities, pickup/return, late entry and ghost privacy. */
public final class VanRackNetworkTest {
    static List<VanRackStock.Entry> rack(AuthoredLevelNetworkTest.Peer peer,String id,int count)throws Exception{
        var receiver=new VanRackStock.Receiver();long end=System.nanoTime()+6_000_000_000L;
        while(System.nanoTime()<end){String frame=peer.inbox.poll(100,TimeUnit.MILLISECONDS);if(frame==null||!frame.startsWith("RACK"))continue;
            receiver.accept(LanProtocol.parts(frame));if(frame.startsWith("RACKEND|")&&VanRackStockTest.count(receiver.stock(),id)==count)return receiver.stock();
        }throw new AssertionError("missing shared rack quantity "+id+" "+count);
    }
    public static void main(String[]args)throws Exception{
        try(var host=new LanHost("127.0.0.1",0,GhostIdentity.Type.SPIRIT);
            var a=new AuthoredLevelNetworkTest.Peer(host.port(),false,"Cleric");
            var b=new AuthoredLevelNetworkTest.Peer(host.port(),false,"Observer");
            var c=new AuthoredLevelNetworkTest.Peer(host.port(),false,"Demonologist");
            var ghost=new AuthoredLevelNetworkTest.Peer(host.port(),true,"Spirit")){
            a.client.ready();b.client.ready();c.client.ready();ghost.client.ready();a.await("LOBBY|3|HUMAN|4|WAITING");a.client.start();a.await("INFO|mission started");
            a.client.view3D();a.await("ACCEPT|VIEW3D");b.client.view3D();b.await("ACCEPT|VIEW3D");ghost.client.viewGhost3D();ghost.await("ACCEPT|GVIEW3D");
            var initialA=rack(a,"FLASHLIGHT",3);var initialB=rack(b,"FLASHLIGHT",3);VanRackStockTest.check(initialA.equals(initialB),"hunters must see the same physical shelf stock");
            var map=(HouseMap)LooseClutterNetworkTest.field(host,"map");var world=(LanWorld)LooseClutterNetworkTest.field(host,"world");var point=map.van().location(VanStaging.Station.EQUIPMENT);
            synchronized(LooseClutterNetworkTest.field(host,"mutex")){AuthoredTestSupport.place(map,world,0,new LevelDefinition.Vec(point.x(),VanStaging.FLOOR_Y,point.z()));}
            a.client.equipAt(0,"FLASHLIGHT");a.await("ACCEPT|GEAREQUIP");
            var afterA=rack(a,"FLASHLIGHT",2);var afterB=rack(b,"FLASHLIGHT",2);
            VanRackStockTest.check(afterA.equals(afterB)&&VanRackStockTest.count(afterA,"EMF_READER")==1,"taking one torch removes one model and returns one EMF");
            c.client.view3D();c.await("ACCEPT|VIEW3D");VanRackStockTest.check(rack(c,"FLASHLIGHT",2).equals(afterA),"late view must replay exact remaining quantities");
            Thread.sleep(150);VanRackStockTest.check(ghost.inbox.stream().noneMatch(f->f.startsWith("RACK")),"ghost must not receive equipment inventory snapshots");
            ghost.client.send("RACKUNIT|FLASHLIGHT|III|48");ghost.await("REJECT|");
            System.out.println("PASS shared real-socket stock counts, equip/return synchronization, late-entry replay, bounded intents and ghost privacy");
        }
    }
}
