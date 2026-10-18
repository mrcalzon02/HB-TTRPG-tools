package org.beckenburg;

import java.util.List;
import java.util.concurrent.*;

/** Real LAN socket boundary: overhead identities belong exclusively to hunters. */
public final class LanPrivateHunterNamesTest {
    private static void ok(boolean yes,String reason){if(!yes)throw new AssertionError(reason);}
    private static final class Peer implements AutoCloseable {
        final BlockingQueue<String> packets=new LinkedBlockingQueue<>();
        final List<String> history=new CopyOnWriteArrayList<>();
        final LanClient client;
        Peer(int port,boolean spectral,String username)throws Exception{
            client=new LanClient("127.0.0.1",port,spectral,username,s->{
                history.add(s);
                packets.offer(s);
            });
        }
        String await(String prefix)throws Exception{
            long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(8);
            while(System.nanoTime()<deadline){
                String message=packets.poll(80,TimeUnit.MILLISECONDS);
                if(message!=null&&message.startsWith(prefix))return message;
            }
            throw new AssertionError("missing "+prefix+" on "+client.seat());
        }
        @Override public void close(){client.close();}
    }
    public static void main(String[] args)throws Exception{
        try(LanHost host=new LanHost("127.0.0.1",0,GhostIdentity.Type.WRAITH,
                CustomContract.standard(2));
            Peer a=new Peer(host.port(),false,"Archivist");
            Peer ghost=new Peer(host.port(),true,"Haunting");
            Peer b=new Peer(host.port(),false,"Fred")){

            String costume;
            do{costume=a.await("LOBBYAVATAR|");}
            while(costume.equals("LOBBYAVATAR|NONE"));
            var visibleDisguise=LobbyGhostAvatar.Look.decode(costume);
            ok(visibleDisguise.facing()==0||visibleDisguise.facing()==2
                ||visibleDisguise.facing()==6,"random visible lobby ghost uses approved facing");
            ok(!costume.contains("WRAITH"),
                "lobby appearance cannot expose actual species");
            ok(a.await("PLAYERNAME|1|").equals("PLAYERNAME|1|Fred"),
                "validated teammate name delivered to hunter");
            ok(b.await("PLAYERNAME|0|").equals("PLAYERNAME|0|Archivist"),
                "late joining hunter receives first investigator name");
            ok(ghost.history.stream().noneMatch(s->s.startsWith("PLAYERNAME|")),
                "ghost is never sent the hunters' names");
            ok(ghost.history.stream().noneMatch(s->s.startsWith("GTYPE|")),
                "real ghost type not revealed during queueing");

            a.client.ready();b.client.ready();ghost.client.ready();
            a.client.start();
            a.await("INFO|mission started");
            a.client.view3D();
            a.await("ACCEPT|VIEW3D");
            ok(a.await("PLAYERNAME|1|").equals("PLAYERNAME|1|Fred"),
                "world view receives independent teammate name replay");
            ok(ghost.history.stream().noneMatch(s->s.startsWith("PLAYERNAME|")),
                "no namepacket leak after switching to the active scene");
            ok(ghost.history.stream().noneMatch(s->s.startsWith("GTYPE|")),
                "ghost species still hidden until in-game ghost view");
            ghost.client.viewGhost3D();
            ghost.await("ACCEPT|GVIEW3D");
            ok(ghost.await("GTYPE|").startsWith("GTYPE|WRAITH|"),
                "species disclosed to ghost only after entering live game");
            ok(ghost.history.stream().noneMatch(s->s.startsWith("PLAYERNAME|")),
                "ghost view never receives real player nicknames");
            ok(a.history.stream().noneMatch(s->s.startsWith("GTYPE|")),
                "investigator view never receives assigned playable ghost type");
            b.close();
            a.await("PEER|LEFT|1");
            System.out.println("PASS: hunter-only world labels and anonymous ghost lobby appearance");
        }
    }
}
