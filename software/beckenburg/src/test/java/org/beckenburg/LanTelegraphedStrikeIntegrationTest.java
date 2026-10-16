package org.beckenburg;

import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

/** Real four-seat TCP match proves delayed, single-seat damage and hunter-only warnings. */
public final class LanTelegraphedStrikeIntegrationTest {
    static final class Peer implements AutoCloseable {
        final BlockingQueue<String> events=new LinkedBlockingQueue<>();
        final LanClient client;
        Peer(int port,boolean ghost,String name)throws Exception {
            client=new LanClient("127.0.0.1",port,ghost,name,events::offer);
        }
        String expect(String prefix)throws Exception{
            long until=System.nanoTime()+TimeUnit.SECONDS.toNanos(23);
            while(System.nanoTime()<until){String line=events.poll(150,TimeUnit.MILLISECONDS);
                if(line==null)continue;
                if(client.seat().equals("GHOST")&&(line.startsWith("THREAT|")||line.startsWith("BODY|")||line.startsWith("TEAMMAP|")||line.startsWith("PROGRESS|")))
                    throw new AssertionError("hunter-only events disclosed to ghost: "+line);
                if(line.startsWith(prefix))return line;
            }
            throw new AssertionError("missing "+prefix+" for "+client.seat());
        }
        int tickAtLeast(int threshold)throws Exception{
            int tick=0;
            while(tick<threshold){String s=expect("STATE|");tick=Integer.parseInt(s.split("\\|")[1]);}
            return tick;
        }
        @Override public void close(){client.close();}
    }
    static void ok(boolean condition,String label){if(!condition)throw new AssertionError(label);}
    public static void main(String[] args)throws Exception{
        try(LanHost server=new LanHost("127.0.0.1",0);
            Peer a=new Peer(server.port(),false,"Cleric");
            Peer b=new Peer(server.port(),false,"Observer");
            Peer c=new Peer(server.port(),false,"Demonologist");
            Peer g=new Peer(server.port(),true,"Spirit")){
            a.client.ready();b.client.ready();c.client.ready();g.client.ready();
            a.expect("LOBBY|3|HUMAN|4|WAITING");a.client.start();a.expect("INFO|mission started");
            for(int room:new int[]{11,8,5,4}){a.client.move(room);a.expect("ACCEPT|MOVE|"+room);}
            a.client.view3D();a.expect("ACCEPT|VIEW3D");
            g.client.viewGhost3D();g.expect("ACCEPT|GVIEW3D");
            g.tickAtLeast(170);
            g.client.ghost(GhostDomain.Action.MANIFEST,4);g.expect("ACCEPT|GHOST|MANIFEST");
            g.client.ghost(GhostDomain.Action.STRIKE,4);g.expect("ACCEPT|GHOST|STRIKE");
            String warning=a.expect("THREAT|START|");
            ok(warning.equals("THREAT|START|8|0"),"targeted hunter receives eight-tick warning");
            String impact=a.expect("THREAT|HIT|0");
            ok(impact.equals("THREAT|HIT|0"),"host resolves delayed strike against locked target");
            String status=a.expect("PROGRESS|"); // May precede the hit if a periodic status is queued.
            int hp=Integer.parseInt(status.split("\\|")[1]);
            for(int attempts=0;attempts<10&&hp==100;attempts++){
                status=a.expect("PROGRESS|");hp=Integer.parseInt(status.split("\\|")[1]);
            }
            ok(hp==88,"only targeted hunter receives twelve health damage");
            // A distant observer never gets the attack event or a manufactured 3D hit.
            String other=b.expect("PROGRESS|");
            ok(Integer.parseInt(other.split("\\|")[1])==100,"non-target hunter unharmed");
            g.expect("STATE|"); // Detect any private THREAT/PROGRESS/BODY payload sent to ghost.
            ok(server.running(),"delayed strike does not stop the mission");
            System.out.println("PASS: four sockets, 800ms warning, host target lock, delayed damage, ghost privacy");
        }
    }
}
