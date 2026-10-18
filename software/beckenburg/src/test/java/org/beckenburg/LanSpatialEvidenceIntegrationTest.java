package org.beckenburg;

import java.util.concurrent.*;

/** Four real LAN clients prove spatial clue range and a recoverable, successful case. */
public final class LanSpatialEvidenceIntegrationTest {
    static void ok(boolean value,String name){if(!value)throw new AssertionError(name);}
    static final class Peer implements AutoCloseable {
        final BlockingQueue<String> queue=new LinkedBlockingQueue<>();
        final LanClient client;
        Peer(int port,boolean ghost,String name)throws Exception{
            client=new LanClient("127.0.0.1",port,ghost,name,queue::offer);
        }
        String await(String prefix)throws Exception{
            long end=System.nanoTime()+TimeUnit.SECONDS.toNanos(10);
            while(System.nanoTime()<end){
                String s=queue.poll(80,TimeUnit.MILLISECONDS);if(s==null)continue;
                if("GHOST".equals(client.seat())&&(s.startsWith("BODY|")
                    ||s.startsWith("PROGRESS|")||s.startsWith("TEAMMAP|")
                    ||s.startsWith("EVIDENCE|")||s.startsWith("DOORS|")
                    ||s.startsWith("CASEFILE|")))
                    throw new AssertionError("ghost received hunter-private state: "+s);
                if(s.startsWith(prefix))return s;
            }
            throw new AssertionError("missing "+prefix+" on "+client.seat());
        }
        void room(int r)throws Exception{client.move(r);await("ACCEPT|MOVE|"+r);}
        void step(int dx)throws Exception{
            Thread.sleep(135);client.step(dx,0);await("ACCEPT|STEP");
        }
        public void close(){client.close();}
    }
    public static void main(String[] args)throws Exception{
        try(LanHost host=new LanHost("127.0.0.1",0);
            Peer hunter=new Peer(host.port(),false,"Cleric");
            Peer other=new Peer(host.port(),false,"Observer");
            Peer third=new Peer(host.port(),false,"Demonologist");
            Peer ghost=new Peer(host.port(),true,"Spirit")){
            hunter.client.ready();other.client.ready();third.client.ready();ghost.client.ready();
            hunter.await("LOBBY|3|HUMAN|4|WAITING");
            hunter.client.start();hunter.await("INFO|mission started");
            for(int r:new int[]{11,8,5,4})hunter.room(r);
            hunter.client.view3D();hunter.await("ACCEPT|VIEW3D");
            // The human ghost must actually disturb the room to create >6 EMF.
            ghost.client.ghost(GhostDomain.Action.DISTURB,4);
            ghost.await("ACCEPT|GHOST|DISTURB|");
            hunter.client.scan(LanCase.Tool.EMF);
            ok(hunter.await("ACCEPT|SCAN|CONFIRMED").contains("EMF"),"event-driven EMF >6");
            for(int i=0;i<10;i++)hunter.step(100);
            hunter.client.scan(LanCase.Tool.SPIRIT_BOX);
            ok(hunter.await("ACCEPT|SCAN|INCONCLUSIVE").contains("move closer"),
                "out-of-range spirit box cannot provide evidence");
            hunter.client.scan(LanCase.Tool.THERMOMETER);
            ok(hunter.await("ACCEPT|SCAN|CONFIRMED").contains("THERMOMETER"),
                "thermometer operates at a longer practical distance");
            for(int i=0;i<10;i++)hunter.step(-100);
            hunter.client.scan(LanCase.Tool.SPIRIT_BOX);
            ok(hunter.await("ACCEPT|SCAN|CONFIRMED").contains("SPIRIT_BOX"),
                "approaching the source adds last clue");
            hunter.client.ward();hunter.await("ACCEPT|WARD|ANCHOR WARD PREPARED");
            hunter.client.cleanse();hunter.await("ACCEPT|CLEANSE|RITUAL STARTED");
            hunter.await("RESULT|CLEANSED");
            ghost.await("RESULT|CLEANSED");
            ok(!host.running(),"spatial tool gating still permits completing the actual case");
            System.out.println("PASS: four-peer spatial tool range, in-range proof, ghost privacy and defended resolution");
        }
    }
}
