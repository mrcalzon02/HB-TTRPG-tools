package org.beckenburg;

import java.net.Socket;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

/** Owning listen-host role may be H1 or GHOST; a guest H1 must not own ghost-hosted games. */
public final class LanHostOwnerRecoveryTest {
    private static void ok(boolean truth,String reason){if(!truth)throw new AssertionError(reason);}
    private static class Peer implements AutoCloseable {
        final BlockingQueue<String> events=new LinkedBlockingQueue<>();
        final LanClient client;
        Peer(int port,boolean ghost,String name)throws Exception{
            client=new LanClient("127.0.0.1",port,ghost,name,events::offer);
        }
        Peer(int port,LanClient.ResumeTicket saved)throws Exception{
            client=new LanClient("127.0.0.1",port,saved,events::offer);
        }
        String await(String prefix)throws Exception{
            long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(8);
            while(System.nanoTime()<deadline){
                String frame=events.poll(50,TimeUnit.MILLISECONDS);
                if(frame!=null&&frame.startsWith(prefix))return frame;
            }
            throw new AssertionError("Missing "+prefix+" on "+client.seat());
        }
        void interruptSocket()throws Exception{
            var field=LanClient.class.getDeclaredField("socket");field.setAccessible(true);
            ((Socket)field.get(client)).close();
        }
        public void close(){client.close();}
    }
    private static void ghostHosting()throws Exception{
        try(LanHost host=new LanHost("127.0.0.1",0,
                GhostIdentity.Type.SPIRIT,CustomContract.standard(3),true)){
            host.setReconnectGraceSeconds(5);
            try(Peer a=new Peer(host.port(),false,"HunterHostSeat");
                Peer b=new Peer(host.port(),false,"HunterTwo");
                Peer c=new Peer(host.port(),false,"HunterThree");
                Peer ghost=new Peer(host.port(),true,"ActualHostGhost")){
                a.client.ready();b.client.ready();c.client.ready();ghost.client.ready();
                ghost.await("LOBBY|3|HUMAN|4|WAITING");
                ghost.client.start();ghost.await("INFO|mission started");
                LanClient.ResumeTicket old=a.client.resumeTicket();
                a.interruptSocket();
                b.await("PEER|LOST|0");
                ok(host.running()&&host.reservedSeats()==1,
                    "guest H1 cannot kill a ghost-owned match on transient disconnect");
                try(Peer returned=new Peer(host.port(),old)){
                    ok("H1".equals(returned.client.seat()),"ghost-host guest H1 can reclaim same seat");
                    returned.await("INFO|mission resumed");
                    returned.client.view3D();returned.await("ACCEPT|VIEW3D");
                    ok(host.running()&&host.reservedSeats()==0,"ghost host stays authoritative");
                }
                ghost.client.close();
                b.await("INFO|match stopped after host departure");
                ok(!host.running(),"explicit ghost-owner departure terminates listen match");
            }
        }
    }
    private static void hunterOwnerTransportLoss()throws Exception{
        try(LanHost host=new LanHost("127.0.0.1",0)){
            host.setReconnectGraceSeconds(5);
            try(Peer owner=new Peer(host.port(),false,"ActualHunterHost");
                Peer b=new Peer(host.port(),false,"B");
                Peer c=new Peer(host.port(),false,"C")){
                owner.client.ready();b.client.ready();c.client.ready();
                owner.await("LOBBY|3|AI|3|WAITING");
                owner.client.start();owner.await("INFO|mission started");
                var ticket=owner.client.resumeTicket();
                owner.interruptSocket();b.await("PEER|LOST|0");
                ok(host.running(),"authoritative listen process remains alive despite owner TCP loss");
                try(Peer returned=new Peer(host.port(),ticket)){
                    returned.await("INFO|mission resumed");
                    ok("H1".equals(returned.client.seat()),"owner reclaims H1 while server alive");
                    returned.client.close();
                    b.await("INFO|match stopped after host departure");
                }
                ok(!host.running(),"owner intentional Leave ends listen match");
            }
        }
    }
    public static void main(String[] args)throws Exception{
        ghostHosting();hunterOwnerTransportLoss();
        System.out.println("PASS: ghost-host guest H1 continuity, recovering owner sockets and explicit owner-exit semantics");
    }
}
