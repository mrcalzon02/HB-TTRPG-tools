package org.beckenburg;
import java.util.*;
import java.util.concurrent.*;
/** Real sockets verify revision negotiation, XYZ snapshots and private ghost projection. */
public final class AuthoredLevelNetworkTest {
 static class Peer implements AutoCloseable {
  final BlockingQueue<String> inbox=new LinkedBlockingQueue<>();final LanClient client;
  Peer(int port,boolean ghost,String name)throws Exception{client=new LanClient("127.0.0.1",port,ghost,name,inbox::offer);}
  String await(String prefix)throws Exception{long end=System.nanoTime()+TimeUnit.SECONDS.toNanos(5);while(System.nanoTime()<end){String f=inbox.poll(50,TimeUnit.MILLISECONDS);if(f!=null){if(client.seat().equals("GHOST"))assertPublic(f);if(f.startsWith(prefix))return f;}}throw new AssertionError("missing "+prefix);}
  public void close(){client.close();}
 }
 public static void main(String[] args)throws Exception{
  for(HouseMap.Site site:new HouseMap.Site[]{HouseMap.Site.HOUSE,HouseMap.Site.FARMHOUSE,HouseMap.Site.SCHOOL}){
   HouseMap map=new HouseMap(site);
   try(LanHost host=new LanHost("127.0.0.1",0,GhostIdentity.Type.SPIRIT,CustomContract.standard(3),false,false,site);
       Peer a=new Peer(host.port(),false,"Cleric");Peer b=new Peer(host.port(),false,"Observer");Peer c=new Peer(host.port(),false,"Demonologist");Peer ghost=new Peer(host.port(),true,"Spirit")){
    check(a.await("SITE|").equals("SITE|"+site+"|"+map.level().revision()),"site revision");
    a.client.ready();b.client.ready();c.client.ready();ghost.client.ready();
    a.await("LOBBY|3|HUMAN|4|WAITING");a.client.start();a.await("INFO|mission started");
    int target=map.floorY(6)>0?6:8;
    List<Integer> path=path(map,14,target);for(int room:path){a.client.move(room);a.await("ACCEPT|MOVE|"+room);}
    a.client.view3D();a.await("ACCEPT|VIEW3D");
    String body=a.await("BODY|0|");var fields=LanProtocol.parts(body);check(fields.size()==7,"XYZ body width");
    double x=Double.parseDouble(fields.get(2))/1000,y=Double.parseDouble(fields.get(3))/1000,z=Double.parseDouble(fields.get(4))/1000;
    check(Math.abs(y-map.floorY(target))<.001&&y>0&&map.roomAt(x,y,z)==target,"upper storey host transform");
    a.await("DOORS|");a.await("WINDOWS|");
    if(site!=HouseMap.Site.SCHOOL){
     int steps=site==HouseMap.Site.HOUSE?5:9;
     for(int i=0;i<steps;i++){Thread.sleep(125);a.client.step(-100,0);a.await("ACCEPT|STEP");}
     a.client.window();a.await("ACCEPT|WINDOW");
     String state=a.await("WINDOWS|");check(!state.equals("WINDOWS|"),"host accepted window without state");
     HouseMap remote=new HouseMap(site);remote.applyWindowSnapshot(state.substring(8));
     check(remote.level().portals().stream().anyMatch(p->p.kind().equals("window")&&remote.windowOpen(p.id())),"remote window state");
    }
    a.client.scan(LanCase.Tool.EMF);a.await("ACCEPT|SCAN");
    a.client.journal();a.await("ACCEPT|JOURNAL");
    ghost.client.viewGhost3D();ghost.await("ACCEPT|GVIEW3D");ghost.await("SITE|");
    String pose=ghost.await("GPOSE|");check(LanProtocol.parts(pose).size()==7,"XYZ ghost pose");
    ghost.client.journal();ghost.await("REJECT|");
    for(String message:ghost.inbox)assertPublic(message);
    check(host.running(),"host alive after height snapshots");
    System.out.println("PASS "+site+": real host/client XYZ, map revision, door/window resync and ghost privacy");
   }
  }
 }
 static void assertPublic(String frame){
  for(String prefix:new String[]{"BODY|","TEAMMAP|","PROGRESS|","EVIDENCE|","APPARITION|","MOTION|","SOUND|","CASEFILE|","GEARSTATE|","RECORDER|","RECAUDIO|","BOOK|","DOTS|","CAMERA|","COUNTER|"})
   check(!frame.startsWith(prefix),"private hunter state leaked: "+prefix);
 }
 static List<Integer> path(HouseMap map,int from,int to){Map<Integer,Integer> parent=new HashMap<>();ArrayDeque<Integer> q=new ArrayDeque<>();q.add(from);parent.put(from,-1);while(!q.isEmpty()){int r=q.remove();if(r==to)break;for(var p:map.level().portalsFrom(r))if(!p.kind().equals("window")){int n=p.a()==r?p.b():p.a();if(!parent.containsKey(n)){parent.put(n,r);q.add(n);}}}List<Integer> out=new ArrayList<>();for(int r=to;r!=from;r=parent.get(r))out.add(r);Collections.reverse(out);return out;}
 static void check(boolean value,String why){if(!value)throw new AssertionError(why);}
}
