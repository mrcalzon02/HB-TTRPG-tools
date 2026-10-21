package org.beckenburg;
import java.util.*;
/** Real sockets: physical aim is checked on the host and forged/stale targets fail. */
public final class InteractionNetworkTest {
 public static void main(String[]args)throws Exception{
  try(var host=new LanHost("127.0.0.1",0,GhostIdentity.Type.SPIRIT);
      var a=new AuthoredLevelNetworkTest.Peer(host.port(),false,"Cleric");
      var b=new AuthoredLevelNetworkTest.Peer(host.port(),false,"Observer");
      var c=new AuthoredLevelNetworkTest.Peer(host.port(),false,"Demonologist");
      var ghost=new AuthoredLevelNetworkTest.Peer(host.port(),true,"Spirit")){
   a.client.ready();b.client.ready();c.client.ready();ghost.client.ready();a.await("LOBBY|3|HUMAN|4|WAITING");a.client.start();a.await("INFO|mission started");a.client.view3D();a.await("ACCEPT|VIEW3D");
   var map=(HouseMap)LooseClutterNetworkTest.field(host,"map");var world=(LanWorld)LooseClutterNetworkTest.field(host,"world");
   LooseClutter.Observer observer=null;InteractionFocus.Target target=null;
   for(var item:map.clutter().states()){
    observer=InteractionFocusTest.find(map,item.x(),item.y(),item.z(),InteractionFocus.Kind.CLUTTER,""+item.id(),List.of());
    if(observer!=null){target=InteractionFocus.pick(map,observer,List.of());break;}
   }
   InteractionFocusTest.check(target!=null,"no actual clutter target");
   synchronized(LooseClutterNetworkTest.field(host,"mutex")){AuthoredTestSupport.place(map,world,0,new LevelDefinition.Vec(observer.x(),observer.y(),observer.z()));}
   var wrong=new InteractionFocus.Target(InteractionFocus.Kind.CLUTTER,"9999","forged cup",1);
   a.client.interact(wrong,observer.yaw(),observer.pitch());a.await("REJECT|");
   a.client.interact(target,observer.yaw(),observer.pitch());a.await("ACCEPT|INTERACT|");
   InteractionFocusTest.check(map.clutter().held(0)==Integer.parseInt(target.id()),"E picked another nearby prop");
   Thread.sleep(350);a.client.interact(target,observer.yaw(),observer.pitch());a.await("REJECT|");
   ghost.client.send("INTERACT|CLUTTER|1|0|0|1");ghost.await("REJECT|");
   System.out.println("PASS real-socket centre-ray pickup, forged/stale target rejection and hunter-only interaction");
  }
 }
}
