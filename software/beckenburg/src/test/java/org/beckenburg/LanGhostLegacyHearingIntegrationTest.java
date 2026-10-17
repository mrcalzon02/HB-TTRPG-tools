package org.beckenburg;

import java.util.concurrent.*;

/** Legacy four-peer status regression: ghost senses a sound event, not a private room-position feed. */
public final class LanGhostLegacyHearingIntegrationTest {
    static void check(boolean yes,String detail){if(!yes)throw new AssertionError(detail);}
    static final class Peer implements AutoCloseable {
        final BlockingQueue<String> inbox=new LinkedBlockingQueue<>();
        final LanClient client;
        Peer(int port,boolean ghost,String label)throws Exception {
            client=new LanClient("127.0.0.1",port,ghost,label,inbox::offer);
        }
        String await(String prefix)throws Exception {
            long end=System.nanoTime()+TimeUnit.SECONDS.toNanos(7);
            while(System.nanoTime()<end) {
                String msg=inbox.poll(100,TimeUnit.MILLISECONDS);
                if(msg==null)continue;
                if(client.seat().equals("GHOST") && (msg.startsWith("BODY|")||
                        msg.startsWith("TEAMMAP|")||msg.startsWith("PROGRESS|")||msg.startsWith("DOORS|")))
                    throw new AssertionError("private data leaked to ghost: "+msg);
                if(msg.startsWith(prefix))return msg;
            }
            throw new AssertionError("missing "+prefix+" for "+client.seat());
        }
        /** Ignore earlier states; require a state generated after the specified tick. */
        String stateAfter(int minTick)throws Exception {
            long end=System.nanoTime()+TimeUnit.SECONDS.toNanos(7);
            while(System.nanoTime()<end){String msg=await("STATE|");
                String[] fields=msg.split("\\|",-1);
                if(Integer.parseInt(fields[1])>=minTick)return msg;
            }
            throw new AssertionError("no fresh ghost state");
        }
        public void close(){client.close();}
    }
    public static void main(String[] args)throws Exception {
        try(LanHost host=new LanHost("127.0.0.1",0);
                Peer a=new Peer(host.port(),false,"Cleric");
                Peer b=new Peer(host.port(),false,"Observer");
                Peer c=new Peer(host.port(),false,"Demonologist");
                Peer ghost=new Peer(host.port(),true,"Specter")) {
            a.client.ready();b.client.ready();c.client.ready();ghost.client.ready();
            a.await("LOBBY|3|HUMAN|4|WAITING");
            a.client.start();a.await("INFO|mission started");
            String before=ghost.stateAfter(5);
            check(before.endsWith("|0"),"van-only hunters must not be acoustically detected");
            for(int room:new int[]{11,10,7,4}){
                a.client.move(room);a.await("ACCEPT|MOVE|"+room);
            }
            String heard=ghost.stateAfter(10);
            check(heard.endsWith("|1"),"the ghost receives a permissible recent-audio status");
            int eventTick=Integer.parseInt(heard.split("\\|")[1]);
            String faded=ghost.stateAfter(eventTick+15);
            check(faded.endsWith("|0"),"audible hint fades; no permanent same-room position detection");
            check(host.running(),"hearing and malformed-private-info tests cannot end the match");
            System.out.println("PASS: four-socket ghost sound privacy, expiry and private hunter state exclusion");
        }
    }
}
