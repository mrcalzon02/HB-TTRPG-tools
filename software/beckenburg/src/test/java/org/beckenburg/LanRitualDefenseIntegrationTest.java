package org.beckenburg;

import java.util.concurrent.*;

/** Four real peers verify ritual defense is not client-declared or timer-only. */
public final class LanRitualDefenseIntegrationTest {
    static void ok(boolean yes,String detail){if(!yes)throw new AssertionError(detail);}
    static final class Peer implements AutoCloseable {
        final BlockingQueue<String> queue=new LinkedBlockingQueue<>();
        final LanClient client;
        Peer(int port,boolean ghost,String name)throws Exception{
            client=new LanClient("127.0.0.1",port,ghost,name,queue::offer);
        }
        String await(String prefix)throws Exception{
            long end=System.nanoTime()+TimeUnit.SECONDS.toNanos(12);
            while(System.nanoTime()<end){
                String line=queue.poll(80,TimeUnit.MILLISECONDS);
                if(line==null)continue;
                if("GHOST".equals(client.seat()) && (line.startsWith("PROGRESS|")
                    ||line.startsWith("TEAMMAP|")||line.startsWith("EVIDENCE|")
                    ||line.startsWith("BODY|")||line.startsWith("RITUAL|")
                    ||line.startsWith("DOORS|")))
                    throw new AssertionError("hunter-private packet leaked: "+line);
                if(line.startsWith(prefix))return line;
            }
            throw new AssertionError("missing "+prefix+" for "+client.seat());
        }
        void move(int room)throws Exception{client.move(room);await("ACCEPT|MOVE|"+room);}
        @Override public void close(){client.close();}
    }
    public static void main(String[] args)throws Exception{
        try(LanHost host=new LanHost("127.0.0.1",0);
            Peer a=new Peer(host.port(),false,"Cleric");
            Peer b=new Peer(host.port(),false,"Observer");
            Peer c=new Peer(host.port(),false,"Demonologist");
            Peer g=new Peer(host.port(),true,"Spirit")){
            a.client.ready();b.client.ready();c.client.ready();g.client.ready();
            a.await("LOBBY|3|HUMAN|4|WAITING");a.client.start();a.await("INFO|mission started");
            for(int room:new int[]{11,8,5,4})a.move(room);
            for(LanCase.Tool tool:LanCase.Tool.values()){
                a.client.scan(tool);a.await("ACCEPT|SCAN|READING ");
            }
            a.client.ward();a.await("ACCEPT|WARD|ANCHOR WARD PREPARED");
            a.client.cleanse();a.await("ACCEPT|CLEANSE|RITUAL STARTED");
            a.move(5);
            a.await("RITUAL|PAUSED");
            a.await("RITUAL|BROKEN");
            ok(host.running(),"abandoned circle does not automatically win");
            a.move(4);
            a.client.cleanse();a.await("ACCEPT|CLEANSE|RITUAL STARTED");
            a.await("RESULT|CLEANSED");
            b.await("RESULT|CLEANSED");
            g.await("RESULT|CLEANSED");
            ok(!host.running(),"defended, explicitly restarted ritual wins");
            System.out.println("PASS: four-socket abandoned rite fails and guarded restarted rite cleanses");
        }
    }
}
