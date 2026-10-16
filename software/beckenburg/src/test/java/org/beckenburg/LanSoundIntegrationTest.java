package org.beckenburg;

import java.util.concurrent.*;

/** Four real sockets: a legal ghost whisper is projected only to audible hunters, never as XYZ. */
public final class LanSoundIntegrationTest {
    static void ok(boolean b,String message){if(!b)throw new AssertionError(message);}
    static class Peer implements AutoCloseable {
        final BlockingQueue<String> inbox=new LinkedBlockingQueue<>();
        final LanClient client;
        Peer(int port,boolean ghost,String nickname)throws Exception{
            client=new LanClient("127.0.0.1",port,ghost,nickname,inbox::offer);
        }
        String await(String prefix)throws Exception{
            long until=System.nanoTime()+TimeUnit.SECONDS.toNanos(5);
            while(System.nanoTime()<until){
                String msg=inbox.poll(50,TimeUnit.MILLISECONDS);
                if(msg==null)continue;
                if(client.seat().equals("GHOST") && (msg.startsWith("SOUND|")||msg.startsWith("BODY|")||msg.startsWith("TEAMMAP|")))
                    throw new AssertionError("private hunter-only projection leaked to ghost: "+msg);
                if(msg.startsWith(prefix))return msg;
            }
            throw new AssertionError("missing "+prefix+" on "+client.seat());
        }
        boolean unexpectedSound(long ms)throws Exception{
            long end=System.nanoTime()+TimeUnit.MILLISECONDS.toNanos(ms);
            while(System.nanoTime()<end){
                String msg=inbox.poll(30,TimeUnit.MILLISECONDS);
                if(msg!=null&&msg.startsWith("SOUND|"))return true;
            }
            return false;
        }
        @Override public void close(){client.close();}
    }
    public static void main(String[] args)throws Exception{
        try(LanHost host=new LanHost("127.0.0.1",0);
            Peer a=new Peer(host.port(),false,"Cleric");
            Peer b=new Peer(host.port(),false,"Observer");
            Peer c=new Peer(host.port(),false,"Demonologist");
            Peer ghost=new Peer(host.port(),true,"Specter")){
            a.client.ready();b.client.ready();c.client.ready();ghost.client.ready();
            a.await("LOBBY|3|HUMAN|4|WAITING");a.client.start();a.await("INFO|mission started");
            for(int room:new int[]{11,8,5,4}){a.client.move(room);a.await("ACCEPT|MOVE|"+room);}
            a.client.view3D();a.await("ACCEPT|VIEW3D");
            b.client.view3D();b.await("ACCEPT|VIEW3D");
            c.client.view3D();c.await("ACCEPT|VIEW3D");
            ghost.client.ghost(GhostDomain.Action.WHISPER,4);
            ghost.await("ACCEPT|GHOST|WHISPER");
            String packet=a.await("SOUND|WHISPER|");
            LanSound.CueEvent heard=LanSound.decode(packet);
            ok(heard.volume()>10 && packet.split("\\|").length==5,"coarse pan and gain only, no ghost XYZ");
            ok(!b.unexpectedSound(300)&&!c.unexpectedSound(300),"van occupants hear no spatial ghost cue");
            ghost.await("STATE|");
            ok(host.running(),"audio projection does not disrupt room authority");
            System.out.println("PASS: four-socket host-only paranormal audio projection, van isolation, no ghost pose leak");
        }
    }
}
