package org.beckenburg;
import java.util.concurrent.*;

/** Real human ghost + 3-hunter LAN mission must use species-specific banishment and site. */
public final class LanRiteNetworkTest {
 static void ok(boolean yes,String why){if(!yes)throw new AssertionError(why);}
 static final class Peer implements AutoCloseable{
  final BlockingQueue<String> events=new LinkedBlockingQueue<>();
  final LanClient client;
  Peer(int port,boolean ghost,String label)throws Exception{
   client=new LanClient("127.0.0.1",port,ghost,label,events::offer);
  }
  String until(String prefix)throws Exception{
   long end=System.nanoTime()+TimeUnit.SECONDS.toNanos(11);
   while(System.nanoTime()<end){
    String e=events.poll(100,TimeUnit.MILLISECONDS);
    if(e==null)continue;
    if(client.seat().equals("GHOST")&&(e.startsWith("PROGRESS|")||e.startsWith("IDENTIFIED|")
       ||e.startsWith("TEAMMAP|")||e.startsWith("EVIDENCE|")
       ||e.startsWith("CASEFILE|")||e.startsWith("RITUAL|")))
      throw new AssertionError("private hunter observation leaked to ghost: "+e);
    if(e.startsWith(prefix))return e;
   }
   throw new AssertionError("timed out on "+prefix+" for "+client.seat());
  }
  void move(int room)throws Exception{client.move(room);until("ACCEPT|MOVE|"+room);}
  public void close(){client.close();}
 }
 public static void main(String[] args)throws Exception {
  try(LanHost host=new LanHost("127.0.0.1",0,GhostIdentity.Type.WRAITH);
    Peer a=new Peer(host.port(),false,"Cleric");
    Peer b=new Peer(host.port(),false,"Observer");
    Peer c=new Peer(host.port(),false,"Demonologist");
    Peer g=new Peer(host.port(),true,"Wraith")){
   a.client.ready();b.client.ready();c.client.ready();g.client.ready();
   a.until("LOBBY|3|HUMAN|4|WAITING");
   a.client.start();a.until("INFO|mission started");
   g.client.viewGhost3D();
   g.until("GTYPE|WRAITH|PHASE_TRAVEL");
   g.client.identify(GhostIdentity.Type.SPIRIT);
   ok(g.until("REJECT|").contains("hunter"),"ghost cannot make investigator deduction");
   for(int r:new int[]{11,8,5,4})a.move(r);
   for(LanCase.Tool instrument:LanCase.Tool.values()){
    a.client.scan(instrument);a.until("ACCEPT|SCAN|CONFIRMED");
   }
   ok(host.running(),"case still active after evidence");
   a.client.identify(GhostIdentity.Type.WRAITH);
   a.until("ACCEPT|IDENTIFY|ENTITY IDENTIFIED WRAITH");
   b.until("IDENTIFIED|WRAITH|BANISHMENT");
   a.client.ward();a.until("ACCEPT|WARD|ANCHOR WARD PREPARED");
   for(int r:new int[]{7,10,9})a.move(r);
   a.client.cleanse();
   ok(a.until("REJECT|CLEANSE").contains("incorrect rite"),"wrong ritual rejected");
   a.client.banish();a.until("ACCEPT|BANISH|RITUAL STARTED");
   a.until("RESULT|BANISHED");
   b.until("RESULT|BANISHED");
   g.until("RESULT|BANISHED");
   ok(!host.running(),"banishment outcome stops match");
   System.out.println("PASS: 4 real sockets, Wraith triple clues, hunter-only identification, required site/banishment, human-ghost privacy");
  }
 }
}
