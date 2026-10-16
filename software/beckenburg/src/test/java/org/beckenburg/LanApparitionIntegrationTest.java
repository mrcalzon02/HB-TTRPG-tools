package org.beckenburg;

import java.util.concurrent.*;

/** Four real socket peers: only the hunter facing a manifested ghost receives its position. */
public final class LanApparitionIntegrationTest {
    static final class Peer implements AutoCloseable {
        final BlockingQueue<String> inbox=new LinkedBlockingQueue<>();
        final LanClient client;
        Peer(int port,boolean ghost,String name)throws Exception{
            client=new LanClient("127.0.0.1",port,ghost,name,inbox::offer);
        }
        String expect(String prefix)throws Exception{
            long limit=System.nanoTime()+TimeUnit.SECONDS.toNanos(13);
            while(System.nanoTime()<limit){String s=inbox.poll(80,TimeUnit.MILLISECONDS);
                if(s==null)continue;
                if(client.seat().equals("GHOST") && (s.startsWith("BODY|")||s.startsWith("DOORS|")
                        ||s.startsWith("TEAMMAP|")||s.startsWith("APPARITION|")))
                    throw new AssertionError("private hunter sight data reached ghost: "+s);
                if(s.startsWith(prefix))return s;
            }
            throw new AssertionError("timed out waiting for "+prefix+" in "+client.seat());
        }
        @Override public void close(){client.close();}
    }
    private static void ok(boolean yes,String reason){if(!yes)throw new AssertionError(reason);}
    public static void main(String[] args)throws Exception{
        try(LanHost host=new LanHost("127.0.0.1",0);
            Peer a=new Peer(host.port(),false,"Cleric");
            Peer b=new Peer(host.port(),false,"Observer");
            Peer c=new Peer(host.port(),false,"Demonologist");
            Peer g=new Peer(host.port(),true,"Spirit")){
            a.client.ready();b.client.ready();c.client.ready();g.client.ready();
            a.expect("LOBBY|3|HUMAN|4|WAITING");a.client.start();a.expect("INFO|mission started");
            for(int room:new int[]{11,8,5,4}){a.client.move(room);a.expect("ACCEPT|MOVE|"+room);}
            a.client.view3D();a.expect("ACCEPT|VIEW3D");a.expect("APPARITION|HIDDEN");
            b.client.view3D();b.expect("ACCEPT|VIEW3D");b.expect("APPARITION|HIDDEN");
            g.client.viewGhost3D();g.expect("ACCEPT|GVIEW3D");g.expect("GPOSE|");
            // Host legitimately unlocks manifestation after eighty 100 ms ticks,
            // rather than a test-only privileged ghost state mutation.
            int tick=0;
            while(tick<82){
                String state=g.expect("STATE|");
                tick=Integer.parseInt(state.split("\\|")[1]);
            }
            g.client.ghost(GhostDomain.Action.MANIFEST,4);
            ok(g.expect("ACCEPT|GHOST|MANIFEST").contains("MANIFEST"),"valid human ghost manifestation accepted");
            String seen=a.expect("APPARITION|VISIBLE|");
            ok(seen.split("\\|").length==5,"visible hunter receives bounded coordinates");
            String hidden=b.expect("APPARITION|HIDDEN|");
            ok(!hidden.contains("VISIBLE"),"distant investigator has no ghost coordinates");
            g.expect("STATE|"); // no APPARITION frame may ever be sent to ghost
            g.client.ghost(GhostDomain.Action.DRIFT,1);
            g.expect("ACCEPT|GHOST|DRIFT");
            ok(a.expect("APPARITION|HIDDEN|").contains("HIDDEN"),"ghost drifting away clears hunter-visible specter");
            ok(host.running(),"private projections do not disrupt the match");
            System.out.println("PASS: four-client manifested ghost sight projection, distant privacy and authoritative despawn");
        }
    }
}
