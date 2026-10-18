package org.beckenburg;

import java.util.concurrent.*;
import java.util.List;
import java.util.ArrayList;

/** Real host/client frames: the advertised ghost body is NOT a species leak. */
public final class LanGhostLobbySecrecyTest {
    private static void check(boolean condition,String why){
        if(!condition)throw new AssertionError(why);
    }
    private static final class Peer implements AutoCloseable {
        final BlockingQueue<String> packets=new LinkedBlockingQueue<>();
        final List<String> received=new java.util.concurrent.CopyOnWriteArrayList<>();
        final LanClient client;
        Peer(int port,boolean ghost,String nickname)throws Exception{
            client=new LanClient("127.0.0.1",port,ghost,nickname,s->{
                received.add(s);
                packets.offer(s);
            });
        }
        String await(String prefix)throws Exception{
            long until=System.nanoTime()+TimeUnit.SECONDS.toNanos(7);
            while(System.nanoTime()<until){
                String v=packets.poll(80,TimeUnit.MILLISECONDS);
                if(v!=null&&v.startsWith(prefix))return v;
            }
            throw new AssertionError("missing "+prefix+" for "+client.seat());
        }
        public void close(){client.close();}
    }
    public static void main(String[] args)throws Exception{
        try(LanHost host=new LanHost("127.0.0.1",0,GhostIdentity.Type.DEMON,
                CustomContract.standard(1),true);
            Peer ghost=new Peer(host.port(),true,"Masked")){
            check(ghost.client.seat().equals("GHOST"),"hosting as ghost joins ghost seat");
            String costume=ghost.await("LOBBYAVATAR|");
            var disguise=LobbyGhostAvatar.Look.decode(costume);
            check(DirectionalSprites.frame("banshee",disguise.facing())!=null,"real sprite loaded");
            try(Peer hunter=new Peer(host.port(),false,"Investigator")){
                check(hunter.client.seat().equals("H1"),"separate hunter admitted");
                String hunterCostume=hunter.await("LOBBYAVATAR|");
                check(hunterCostume.equals(costume),"every lobby participant sees same cosmetic ghost");
                check(!costume.contains("DEMON")&&!costume.contains("RITE"),
                    "species and resolution are secret before gameplay");
                check(ghost.received.stream().noneMatch(s->s.startsWith("GTYPE|")),
                    "no real ghost species in pre-match messages");
                ghost.client.ready();hunter.client.ready();
                ghost.client.start();
                ghost.await("INFO|mission started");
                check(ghost.received.stream().noneMatch(s->s.startsWith("GTYPE|")),
                    "starting match alone does not leak the identity");
                ghost.client.viewGhost3D();
                ghost.await("ACCEPT|GVIEW3D");
                String reveal=ghost.await("GTYPE|");
                check(reveal.startsWith("GTYPE|DEMON|"),"actual identity revealed in game only");
                check(hunter.received.stream().noneMatch(s->s.startsWith("GTYPE|")),
                    "hunter must never receive ghost-player identity reveal");
                ghost.close(); // release ghost: host switches to AI without exposing species
                hunter.await("LOBBYAVATAR|NONE");
                check(host.running(),"AI replaces departed ghost without resetting case");
            }
        }
        System.out.println("PASS: cosmetic lobby ghost visible to party; real species withheld until play");
    }
}
