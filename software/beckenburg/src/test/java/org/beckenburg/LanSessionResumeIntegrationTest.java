package org.beckenburg;

import java.net.Socket;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

/** Real TCP sockets: accidental loss, same-seat reconnect, expiry, and AI ghost continuity. */
public final class LanSessionResumeIntegrationTest {
    private static void check(boolean pass,String reason){if(!pass)throw new AssertionError(reason);}
    private static final class Peer implements AutoCloseable {
        final BlockingQueue<String> messages=new LinkedBlockingQueue<>();
        final LanClient client;
        Peer(int port,boolean ghost,String nickname)throws Exception {
            client=new LanClient("127.0.0.1",port,ghost,nickname,messages::offer);
        }
        Peer(int port,LanClient.ResumeTicket ticket)throws Exception {
            client=new LanClient("127.0.0.1",port,ticket,messages::offer);
        }
        String await(String prefix)throws Exception{
            long end=System.nanoTime()+TimeUnit.SECONDS.toNanos(9);
            while(System.nanoTime()<end){
                String message=messages.poll(80,TimeUnit.MILLISECONDS);
                if(message==null)continue;
                // Regression: a ghost is never given hunter-only world or journal data.
                if("GHOST".equals(client.seat()) && (message.startsWith("BODY|")
                    ||message.startsWith("PROGRESS|") ||message.startsWith("TEAMMAP|")
                    ||message.startsWith("EVIDENCE|") ||message.startsWith("DOORS|")))
                    throw new AssertionError("private hunter state leaked to ghost: "+message);
                if(message.startsWith(prefix))return message;
            }
            throw new AssertionError("Missing "+prefix+" on "+client.seat());
        }
        void breakTransportWithoutLeaving() throws Exception {
            // Simulate an actual disconnected TCP socket, NOT public client.close(),
            // which now sends the explicit LEAVE command and ends reservation rights.
            var field=LanClient.class.getDeclaredField("socket");
            field.setAccessible(true);
            ((Socket)field.get(client)).close();
        }
        public void close(){client.close();}
    }
    private static void begin(Peer a,Peer b,Peer c)throws Exception {
        a.client.ready();b.client.ready();c.client.ready();
        a.await("LOBBY|3|AI|3|WAITING");a.client.start();a.await("INFO|mission started");
    }
    private static void hunterRejoin()throws Exception {
        try(LanHost host=new LanHost("127.0.0.1",0)){
            host.setReconnectGraceSeconds(5);
            try(Peer a=new Peer(host.port(),false,"Cleric");
                Peer b=new Peer(host.port(),false,"Observer");
                Peer c=new Peer(host.port(),false,"Demonologist")){
                begin(a,b,c);
                b.client.view3D();b.await("ACCEPT|VIEW3D");
                b.client.move(11);b.await("ACCEPT|MOVE|11");
                var original=b.client.resumeTicket();
                check(original!=null,"new host sends opaque reconnect credentials");
                b.breakTransportWithoutLeaving();
                a.await("PEER|LOST|1");
                check(host.running()&&host.reservedSeats()==1,"hunter still owns host-side state");
                // A JVM crash can leave an older last-command counter on disk. Host
                // handshake supplies the accepted high-water mark, so input still works.
                var stale=new LanClient.ResumeTicket(original.seat(),original.token(),0);
                try(Peer restored=new Peer(host.port(),stale)){
                    check("H2".equals(restored.client.seat()),"old seat restored, no new hunter");
                    restored.await("INFO|mission resumed");
                    restored.client.view3D();restored.await("ACCEPT|VIEW3D");
                    restored.client.move(8);restored.await("ACCEPT|MOVE|8");
                    check(host.reservedSeats()==0&&host.connected()==3,"same mission/connected party recovered");
                    check(restored.client.resumeTicket()!=null
                        &&!restored.client.resumeTicket().token().equals(original.token()),"resume secret rotated");
                    try(Peer duplicate=new Peer(host.port(),original)){
                        throw new AssertionError("replayed resume secret allowed second connection");
                    }catch(java.io.IOException expected){ /* rejected by live host */ }
                }
                check(host.running(),"guest's deliberate departure does not end remaining mission");
            }
        }
    }
    private static void timeoutExpires()throws Exception {
        try(LanHost host=new LanHost("127.0.0.1",0)){
            host.setReconnectGraceSeconds(1);
            try(Peer a=new Peer(host.port(),false,"Cleric");
                Peer b=new Peer(host.port(),false,"Observer");
                Peer c=new Peer(host.port(),false,"Demonologist")){
                begin(a,b,c);
                var original=b.client.resumeTicket();
                b.breakTransportWithoutLeaving();
                a.await("PEER|LOST|1");
                a.await("PEER|LEFT|1");
                check(host.reservedSeats()==0 && host.running(),"expired guest removed, mission retained");
                try(Peer late=new Peer(host.port(),original)){
                    throw new AssertionError("expired session resumed");
                }catch(java.io.IOException expected){ /* expired credential refused */ }
            }
        }
    }
    private static void ghostRejoin()throws Exception {
        try(LanHost host=new LanHost("127.0.0.1",0)){
            host.setReconnectGraceSeconds(5);
            try(Peer a=new Peer(host.port(),false,"Cleric");
                Peer b=new Peer(host.port(),false,"Observer");
                Peer c=new Peer(host.port(),false,"Demonologist");
                Peer ghost=new Peer(host.port(),true,"Specter")){
                a.client.ready();b.client.ready();c.client.ready();ghost.client.ready();
                a.await("LOBBY|3|HUMAN|4|WAITING");a.client.start();a.await("INFO|mission started");
                ghost.client.viewGhost3D();ghost.await("ACCEPT|GVIEW3D");
                var ticket=ghost.client.resumeTicket();
                ghost.breakTransportWithoutLeaving();
                a.await("INFO|human ghost disconnected - AI has taken control");
                check(host.running()&&host.reservedSeats()==1,"AI takes over same live ghost");
                try(Peer restored=new Peer(host.port(),ticket)){
                    check("GHOST".equals(restored.client.seat()),"human controls original ghost");
                    restored.await("INFO|mission resumed");
                    restored.client.viewGhost3D();restored.await("ACCEPT|GVIEW3D");
                    restored.await("GTYPE|"); // authorized ghost only, after active view
                    a.await("INFO|human ghost reconnected - AI released control");
                    check(host.reservedSeats()==0&&host.running(),"reconnected ghost recovered");
                }
            }
        }
    }
    public static void main(String[] args)throws Exception {
        hunterRejoin();timeoutExpires();ghostRejoin();
        System.out.println("PASS: unexpected loss, real rejoin/token rotation, expiry, ghost AI continuity and role privacy");
    }
}
