package org.beckenburg;

import java.util.concurrent.*;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/** Real socket test for position-bound local delivery and private radio text. */
public final class LanChatIntegrationTest {
    static void ok(boolean yes,String reason){if(!yes)throw new AssertionError(reason);}
    static final class Peer implements AutoCloseable{
        final BlockingQueue<String> messages=new LinkedBlockingQueue<>();
        final List<String> history=new CopyOnWriteArrayList<>();
        final LanClient client;
        Peer(int port,boolean ghost,String name)throws Exception{
            client=new LanClient("127.0.0.1",port,ghost,name,text->{
                messages.offer(text);history.add(text);
            });
        }
        String await(String prefix)throws Exception{
            long until=System.nanoTime()+TimeUnit.SECONDS.toNanos(8);
            while(System.nanoTime()<until){
                String next=messages.poll(90,TimeUnit.MILLISECONDS);
                if(next!=null&&next.startsWith(prefix))return next;
            }
            throw new AssertionError("timeout awaiting "+prefix+" for "+client.seat());
        }
        boolean seen(String prefix){return history.stream().anyMatch(x->x.startsWith(prefix));}
        public void close(){client.close();}
    }
    public static void main(String[] args)throws Exception{
        try(LanHost host=new LanHost("127.0.0.1",0,GhostIdentity.Type.SPIRIT,
                    CustomContract.standard(2));
            Peer a=new Peer(host.port(),false,"Fred");
            Peer b=new Peer(host.port(),false,"Martha");
            Peer ghost=new Peer(host.port(),true,"Specter")){
            ghost.client.lobbyChat("Good luck.");
            ok(a.await("LOBBYCHAT|GHOST|").endsWith("|Good luck."),
                "visible ghost-role player can speak in lobby anonymously by species");
            ok(ghost.history.stream().noneMatch(x->x.startsWith("GTYPE|")),
                "lobby chat never discloses ghost type");
            a.client.ready();b.client.ready();ghost.client.ready();
            a.await("LOBBY|2|HUMAN|3|WAITING"); // Host has processed all independent READY packets.
            a.client.start();a.await("INFO|mission started");
            // Move Martha through existing authored adjacent rooms without teleporting in 3D.
            for(int room:new int[]{11,8,5,4}){
                b.client.move(room);b.await("ACCEPT|MOVE|"+room);
            }
            a.client.view3D();a.await("ACCEPT|VIEW3D");
            b.client.view3D();b.await("ACCEPT|VIEW3D");
            ghost.client.viewGhost3D();ghost.await("ACCEPT|GVIEW3D");
            a.client.say(LanChat.Channel.LOCAL,"Van is clear.");
            ok(a.await("CHAT|LOCAL|0|").endsWith("|Van is clear."),"speaker hears own message");
            a.await("ACCEPT|SAY|LOCAL");
            Thread.sleep(150);
            ok(!b.seen("CHAT|LOCAL|0|"),"remote hunter cannot overhear van speech");
            ok(!ghost.seen("CHAT|"),"ghost does not receive transcript");
            b.client.say(LanChat.Channel.LOCAL,"I heard it moving.");
            ok(b.await("CHAT|LOCAL|1|").endsWith("|I heard it moving."),"local source receives chat");
            b.await("ACCEPT|SAY|LOCAL");
            ok(ghost.await("GHEAR|VOICE|").contains("GHEAR|VOICE|"),"nearby spoken text attracts ghost");
            Thread.sleep(150);
            ok(!a.seen("CHAT|LOCAL|1|"),"distant local talk is not team chat");
            b.client.say(LanChat.Channel.LOCAL,"flood");
            ok(b.await("REJECT|").contains("chat cooling down"),"rate limiting");
            Thread.sleep(780);
            b.client.say(LanChat.Channel.RADIO,"Fred, bring the salt.");
            ok(a.await("CHAT|RADIO|1|").endsWith("|Fred, bring the salt."),
                "radio reaches distant hunter");
            b.await("ACCEPT|SAY|RADIO");
            ghost.client.send("SAY|RADIO|I know your names|500");
            ok(ghost.await("REJECT|").contains("hunter"),"ghost cannot send hunter radio");
            ok(ghost.history.stream().noneMatch(x->x.startsWith("CHAT|")),
                "ghost receives no local transcript or radio message");
            ok(host.running(),"chat rejection does not interrupt match");
            System.out.println("PASS: two hunters, ghost, local distance, radio and transcript privacy");
        }
    }
}
