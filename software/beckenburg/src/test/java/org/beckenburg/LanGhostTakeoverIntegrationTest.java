package org.beckenburg;

import java.util.concurrent.*;

/** Live takeover must preserve one ghost's cooldowns, powers, and sequence authority. */
public final class LanGhostTakeoverIntegrationTest {
    static void ok(boolean yes,String label){if(!yes)throw new AssertionError(label);}
    static final class Peer implements AutoCloseable {
        final BlockingQueue<String> inbox=new LinkedBlockingQueue<>();
        final LanClient client;
        Peer(int port,boolean ghost,String name)throws Exception{
            client=new LanClient("127.0.0.1",port,ghost,name,inbox::offer);
        }
        String expect(String prefix)throws Exception{
            long end=System.nanoTime()+TimeUnit.SECONDS.toNanos(10);
            while(System.nanoTime()<end){
                String msg=inbox.poll(90,TimeUnit.MILLISECONDS);
                if(msg==null)continue;
                if("GHOST".equals(client.seat())&&(msg.startsWith("BODY|")||msg.startsWith("DOORS|")
                    ||msg.startsWith("PROGRESS|")||msg.startsWith("TEAMMAP|")
                    ||msg.startsWith("EVIDENCE|")||msg.startsWith("APPARITION|")
                    ||msg.startsWith("MOTION|")))
                    throw new AssertionError("ghost received private hunter packet "+msg);
                if(msg.startsWith(prefix))return msg;
            }
            throw new AssertionError("missing "+prefix+" for "+client.seat());
        }
        public void close(){client.close();}
    }
    public static void main(String[] args)throws Exception{
        try(LanHost server=new LanHost("127.0.0.1",0);
            Peer a=new Peer(server.port(),false,"Cleric");
            Peer b=new Peer(server.port(),false,"Observer");
            Peer c=new Peer(server.port(),false,"Demonologist");
            Peer human=new Peer(server.port(),true,"Spirit")){
            a.client.ready();b.client.ready();c.client.ready();human.client.ready();
            a.expect("LOBBY|3|HUMAN|4|WAITING");a.client.start();a.expect("INFO|mission started");
            for(int room:new int[]{11,8,5,4}){a.client.move(room);a.expect("ACCEPT|MOVE|"+room);}
            human.client.ghost(GhostDomain.Action.WHISPER,4);
            human.expect("ACCEPT|GHOST|WHISPER");
            human.client.ghost(GhostDomain.Action.DISTURB,4);
            human.expect("ACCEPT|GHOST|DISTURB");
            human.close();
            a.expect("INFO|human ghost disconnected - AI has taken control");
            ok(a.expect("LOBBY|3|AI|3|RUNNING").contains("|AI|"),"controller becomes AI");
            ok(server.running()&&server.connected()==3,"no full match abort on ghost departure");
            // AI must act at its first legal whisper tick even though the human
            // already used two GhostDomain command numbers.
            a.client.scan(LanCase.Tool.EMF);a.expect("ACCEPT|SCAN");
            a.expect("EFFECT|WHISPER|2|0");
            ok(server.running(),"AI ghost's first post-takeover cast resolved through shared domain");
            b.close();
            a.expect("PEER|LEFT|1");
            a.expect("INFO|hunter 2 departed - 2 investigator(s) remaining");
            ok(server.running(),"departing guest hunter does not cancel investigation");
            a.close();
            c.expect("INFO|match stopped after host departure");
            ok(!server.running(),"host departure still terminates authoritative session");
            System.out.println("PASS: human to AI ghost continuity, sequence monotonicity and hunter exit");
        }
    }
}
