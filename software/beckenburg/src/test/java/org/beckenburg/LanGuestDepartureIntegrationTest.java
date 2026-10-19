package org.beckenburg;

import java.util.concurrent.*;

/** Guest exits cannot kill a LAN case; host exit retains explicit stop policy. */
public final class LanGuestDepartureIntegrationTest {
    static void ok(boolean value,String description){if(!value)throw new AssertionError(description);}
    static final class Peer implements AutoCloseable {
        final BlockingQueue<String> inbox=new LinkedBlockingQueue<>();
        final LanClient client;
        Peer(int port,String label)throws Exception {
            client=new LanClient("127.0.0.1",port,false,label,inbox::offer);
        }
        String await(String prefix)throws Exception{
            long until=System.nanoTime()+TimeUnit.SECONDS.toNanos(12);
            while(System.nanoTime()<until){
                String s=inbox.poll(80,TimeUnit.MILLISECONDS);
                if(s!=null&&s.startsWith(prefix))return s;
            }
            throw new AssertionError("missing "+prefix+" for "+client.seat());
        }
        void move(int room)throws Exception{
            client.move(room);await("ACCEPT|MOVE|"+room);
        }
        public void close(){client.close();}
    }
    public static void main(String[] args)throws Exception {
        try(LanHost host=new LanHost("127.0.0.1",0);
            Peer a=new Peer(host.port(),"Cleric");
            Peer b=new Peer(host.port(),"Observer");
            Peer c=new Peer(host.port(),"Demonologist")){
            a.client.ready();b.client.ready();c.client.ready();
            a.await("LOBBY|3|AI|3|WAITING");a.client.start();a.await("INFO|mission started");
            for(int room:new int[]{11,8,5,4})a.move(room);
            a.client.view3D();a.await("ACCEPT|VIEW3D");
            a.await("BODY|1|");
            b.close();
            a.await("PEER|LEFT|1");
            a.await("INFO|hunter 2 departed - 2 investigator(s) remaining");
            a.await("LOBBY|2|AI|2|RUNNING");
            ok(host.connected()==2&&host.running(),"remaining team still playing");
            for(LanCase.Tool tool:LanCase.Tool.values()){
                a.client.scan(tool);a.await("ACCEPT|SCAN|READING ");
            }
            a.client.ward();a.await("ACCEPT|WARD|ANCHOR WARD PREPARED");
            a.client.cleanse();a.await("ACCEPT|CLEANSE|RITUAL STARTED");
            a.await("RESULT|CLEANSED");
            ok(!host.running(),"successful ritual resolves the same case");
        }
        try(LanHost host=new LanHost("127.0.0.1",0);
            Peer a=new Peer(host.port(),"Cleric");
            Peer b=new Peer(host.port(),"Observer");
            Peer c=new Peer(host.port(),"Demonologist")){
            a.client.ready();b.client.ready();c.client.ready();
            a.await("LOBBY|3|AI|3|WAITING");a.client.start();b.await("INFO|mission started");
            a.close();
            b.await("INFO|match stopped after host departure");
            ok(!host.running(),"host departure closes authoritative match");
        }
        System.out.println("PASS: guest exit preserves case and cleanse; host departure ends match");
    }
}
