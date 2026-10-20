package org.beckenburg;

import java.util.concurrent.*;

/** Four actual sockets share real world-body snapshots; ghost receives no private transforms. */
public final class LanWorldIntegrationTest {
    private static class Peer implements AutoCloseable {
        final BlockingQueue<String> events=new LinkedBlockingQueue<>();
        final LanClient c;
        Peer(int port,boolean ghost,String name)throws Exception {c=new LanClient("127.0.0.1",port,ghost,name,events::offer);}
        String waitFor(String prefix)throws Exception{
            long until=System.nanoTime()+TimeUnit.SECONDS.toNanos(7);
            while(System.nanoTime()<until){String f=events.poll(120,TimeUnit.MILLISECONDS);if(f!=null&&f.startsWith(prefix))return f;}
            throw new AssertionError(c.seat()+" missing "+prefix);
        }
        void noBodies(){if(events.stream().anyMatch(x->x.startsWith("BODY|")||x.startsWith("TEAMMAP|")||x.startsWith("PROGRESS|")))throw new AssertionError("ghost saw private hunter state");}
        @Override public void close(){c.close();}
    }
    private static void ok(boolean v,String msg){if(!v)throw new AssertionError(msg);}
    public static void main(String[] args)throws Exception {
        try(LanHost host=new LanHost("127.0.0.1",0);
            Peer a=new Peer(host.port(),false,"Cleric");
            Peer b=new Peer(host.port(),false,"Observer");
            Peer c=new Peer(host.port(),false,"Scholar");
            Peer ghost=new Peer(host.port(),true,"Haunt")){
            a.c.ready();b.c.ready();c.c.ready();ghost.c.ready();
            a.waitFor("LOBBY|3|HUMAN|4|WAITING");a.c.start();a.waitFor("INFO|mission started");
            String initialBody=b.waitFor("BODY|0|");
            ok(initialBody.startsWith("BODY|0|"),"host broadcasts hunter bodies");
            ok(b.waitFor("DOORS|").startsWith("DOORS|"),"hunter world receives shared physical doors");
            ghost.noBodies();
            ghost.c.send("VIEW3D");ok(ghost.waitFor("REJECT|").contains("hunter"),"ghost cannot enter hunter view");
            a.c.view3D();ok(a.waitFor("ACCEPT|VIEW3D").startsWith("ACCEPT"),"hunter enters world");
            a.c.move(11);ok(a.waitFor("REJECT|").contains("room jumps"),"3D mode cannot exploit legacy room jumps");
            a.c.send("STEP|900|0|2");ok(a.waitFor("REJECT|").contains("bounds"),"large direction denied");
            // A STEP uses normalized direction, not an absolute coordinate. The host owns speed.
            Thread.sleep(130);
            a.c.step(0,-100);ok(a.waitFor("ACCEPT|STEP").startsWith("ACCEPT"),"legal world input");
            String body=null;
            long end=System.nanoTime()+TimeUnit.SECONDS.toNanos(5);
            while(System.nanoTime()<end){String next=b.waitFor("BODY|0|");
                String[] before=initialBody.split("\\|"),after=next.split("\\|");
                if(!before[2].equals(after[2])||!before[4].equals(after[4])){body=next;break;}
            }
            ok(body!=null&&body.split("\\|").length==7,"replicated movement changed explicit XYZ position");
            a.c.send("STEP|100|0|1");ok(a.waitFor("REJECT|").contains("stale"),"replayed motion rejected");
            a.c.send("DOOR|999");ok(a.waitFor("REJECT|").contains("reachable"),"far door denied");
            ghost.noBodies();
            ok(host.running(),"invalid commands do not stop shared case");
            System.out.println("PASS: 4-socket authoritative world stepping, snapshot privacy, door range, legacy-mode isolation");
        }
    }
}
