package org.beckenburg;

import java.util.*;
import java.util.concurrent.*;

/** Four independent socket clients and a fifth rejected join; no mock transport. */
public final class LanLobbyTest {
    private static final class Wire implements AutoCloseable {
        final BlockingQueue<String> lines=new LinkedBlockingQueue<>();
        final LanClient client;
        Wire(int port,boolean ghost,String nick)throws Exception{
            client=new LanClient("127.0.0.1",port,ghost,nick,lines::offer);
        }
        String waitPrefix(String prefix,int seconds)throws Exception {
            long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(seconds);
            while(System.nanoTime()<deadline){String s=lines.poll(250,TimeUnit.MILLISECONDS);
                if(s!=null&&s.startsWith(prefix))return s;
}
            throw new AssertionError("timed out waiting for "+prefix+" on "+client.seat());
        }
        int waitTick(int earliest)throws Exception{
            long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(22);
            while(System.nanoTime()<deadline){String s=lines.poll(350,TimeUnit.MILLISECONDS);
                if(s!=null&&s.startsWith("STATE|")){var v=LanProtocol.parts(s);int tick=Integer.parseInt(v.get(1));if(tick>=earliest)return tick;}}
            throw new AssertionError("host never reached tick "+earliest);
        }
        @Override public void close(){client.close();}
    }
    private static void check(boolean yes,String description){if(!yes)throw new AssertionError(description);}
    public static void main(String[] args)throws Exception{
        try(LanHost host=new LanHost("127.0.0.1",0);
            Wire h1=new Wire(host.port(),false,"One");
            Wire h2=new Wire(host.port(),false,"Two");
            Wire h3=new Wire(host.port(),false,"Three");
            Wire g=new Wire(host.port(),true,"Ghost")){
            check(h1.client.seat().equals("H1")&&h2.client.seat().equals("H2")&&h3.client.seat().equals("H3")&&g.client.seat().equals("GHOST"),"distinct seats");
            check(host.connected()==4,"all four real sockets accepted");
            try{new LanClient("127.0.0.1",host.port(),true,"Fifth",s->{});throw new AssertionError("fifth ghost seat allowed");}
            catch(java.io.IOException expected){}
            h2.client.start();check(h2.waitPrefix("REJECT|",2).contains("host hunter"),"non-host cannot start");
            h1.client.start();check(h1.waitPrefix("REJECT|",2).contains("three hunters"),"start gate");
            h1.client.ready();h2.client.ready();h3.client.ready();g.client.ready();
            h1.waitPrefix("LOBBY|3|HUMAN|4|WAITING",3);
            h1.client.start();check(h1.waitPrefix("INFO|mission started",2).contains("human ghost"),"human-ghost match starts");
            check(host.running(),"host running");
            try{new LanClient("127.0.0.1",host.port(),false,"Late",msg->{});throw new AssertionError("late join accepted");}
            catch(java.io.IOException expected){}
            // Test wrong-seat command and impossible position before legitimate movement.
            h2.client.send("GHOST|STRIKE|4|1");check(h2.waitPrefix("REJECT|",2).contains("ghost seat"),"hunter cannot submit ghost action");
            g.client.send("MOVE|4|1");check(g.waitPrefix("REJECT|",2).contains("hunter command"),"ghost cannot move hunter");
            h1.client.move(4);check(h1.waitPrefix("REJECT|",2).contains("not adjacent"),"no hunter teleport");
            h1.client.move(11);check(h1.waitPrefix("ACCEPT|MOVE|11",2).startsWith("ACCEPT"),"legal first move");
            h1.client.move(8);h1.waitPrefix("ACCEPT|MOVE|8",2);
            h1.client.move(5);h1.waitPrefix("ACCEPT|MOVE|5",2);
            h1.client.move(4);h1.waitPrefix("ACCEPT|MOVE|4",2);
            h1.client.send("MOVE|5|4");check(h1.waitPrefix("REJECT|",2).contains("stale"),"sequence replay blocked");
            g.client.ghost(GhostDomain.Action.STRIKE,4);check(g.waitPrefix("REJECT|",2).contains("insufficient"),"ghost cannot open with strike");
            g.waitTick(170);
            g.client.ghost(GhostDomain.Action.MANIFEST,4);
            g.waitPrefix("ACCEPT|GHOST|MANIFEST",2);
            g.client.ghost(GhostDomain.Action.STRIKE,4);
            g.waitPrefix("ACCEPT|GHOST|STRIKE",2);
            check(h1.waitPrefix("EFFECT|STRIKE|6|12",2).startsWith("EFFECT"),"victim-only incremental damage event");
            // Private hunter coordinates must not leak to the ghost via snapshots.
            String state=g.waitPrefix("STATE|",2);var info=LanProtocol.parts(state);
            check(info.size()==7,"minimal ghost projection fields");
            check(!state.contains("H1|")&&!state.contains("H2|"),"no private team data in ghost state");
            g.client.ghost(GhostDomain.Action.STRIKE,4);
            check(g.waitPrefix("REJECT|",2).contains("cooldown"),"host denies ghost strike spam");
            System.out.println("PASS: four TCP clients, seats/readiness/start, host-validated moves, ghost parity, damage, authority, replay and private projection");
        }
        // A second match without a human ghost must start using the SAME AI command authority.
        try(LanHost fallback=new LanHost("127.0.0.1",0);
            Wire a=new Wire(fallback.port(),false,"A");Wire b=new Wire(fallback.port(),false,"B");Wire c=new Wire(fallback.port(),false,"C")){
            a.client.ready();b.client.ready();c.client.ready();
            a.waitPrefix("LOBBY|3|AI|3|WAITING",3);a.client.start();
            check(a.waitPrefix("INFO|mission started",2).contains("AI ghost"),"AI fallback starts without fourth socket");
            a.waitTick(5);
            System.out.println("PASS: 3-hunter LAN sessions use AI ghost fallback without extra seat");
        }
    }
}
