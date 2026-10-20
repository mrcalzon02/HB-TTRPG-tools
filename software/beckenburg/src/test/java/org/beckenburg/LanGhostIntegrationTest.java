package org.beckenburg;

import java.util.concurrent.*;

/** Four genuine sockets prove ghost-only pose telemetry and host-authorized room change. */
public final class LanGhostIntegrationTest {
    static final class Peer implements AutoCloseable {
        final BlockingQueue<String> inbox=new LinkedBlockingQueue<>();
        final LanClient client;
        Peer(int port,boolean ghost,String name)throws Exception{client=new LanClient("127.0.0.1",port,ghost,name,inbox::offer);}
        String expect(String prefix)throws Exception{
            long end=System.nanoTime()+TimeUnit.SECONDS.toNanos(8);
            while(System.nanoTime()<end){String s=inbox.poll(90,TimeUnit.MILLISECONDS);if(s!=null){
                // Door state is public physical architecture for both cameras.
                if(client.seat().equals("GHOST")&& (s.startsWith("BODY|")||s.startsWith("TEAMMAP|")||s.startsWith("PROGRESS|")))
                    throw new AssertionError("ghost received private hunter telemetry: "+s);
                if(s.startsWith(prefix))return s;
            }}throw new AssertionError("missing "+prefix+" for "+client.seat());
        }
        @Override public void close(){client.close();}
    }
    static void ok(boolean v,String s){if(!v)throw new AssertionError(s);}
    public static void main(String[] args)throws Exception{
        try(LanHost host=new LanHost("127.0.0.1",0);
            Peer a=new Peer(host.port(),false,"Cleric");
            Peer b=new Peer(host.port(),false,"Observer");
            Peer c=new Peer(host.port(),false,"Scholar");
            Peer spirit=new Peer(host.port(),true,"Spirit")){
            a.client.ready();b.client.ready();c.client.ready();spirit.client.ready();
            a.expect("LOBBY|3|HUMAN|4|WAITING");a.client.start();a.expect("INFO|mission started");
            spirit.client.view3D();ok(spirit.expect("REJECT|").contains("hunter"),"ghost cannot impersonate hunter");
            a.client.viewGhost3D();ok(a.expect("REJECT|").contains("ghost"),"hunter cannot enter spectral view");
            spirit.client.viewGhost3D();spirit.expect("ACCEPT|GVIEW3D");
            String initial=spirit.expect("GPOSE|");
            ok(initial.startsWith("GPOSE|4|"),"ghost starts at true host anchor");
            spirit.client.ghostStep(1000,0);ok(spirit.expect("REJECT|").contains("bounds"),"large speed rejected");
            Thread.sleep(180);
            spirit.client.ghostStep(100,0);spirit.expect("ACCEPT|GSTEP");
            String pose=spirit.expect("GPOSE|");ok(pose.startsWith("GPOSE|4|"),"spectral movement cannot teleport rooms");
            spirit.client.send("GSTEP|100|0|1");ok(spirit.expect("REJECT|").contains("stale"),"pose input replay denied");
            spirit.client.ghost(GhostDomain.Action.DRIFT,1);spirit.expect("ACCEPT|GHOST|DRIFT");
            String drift=spirit.expect("GPOSE|");ok(drift.startsWith("GPOSE|1|"),"actual DRIFT changes host ghost room");
            spirit.client.ghost(GhostDomain.Action.DRIFT,HouseMap.EXTRACTION_ROOM);
            ok(spirit.expect("REJECT|").contains("invalid"),"ghost may not phase into van");
            // Only hunters receive hunter world snapshots, which remain withheld from the fourth socket.
            b.expect("BODY|0|");
            spirit.expect("STATE|");
            ok(host.running(),"invalid spectral inputs cannot abort mission");
            System.out.println("PASS: 4-socket LAN ghost spatial camera, legal DRIFT, privacy and anti-replay");
        }
    }
}
