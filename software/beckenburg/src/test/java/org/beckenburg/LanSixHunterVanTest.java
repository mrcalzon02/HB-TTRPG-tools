package org.beckenburg;

import java.util.concurrent.*;
import java.util.ArrayList;

/** Real loopback LAN: six hunters, separate ghost, truthful van telemetry and no extra seats. */
public final class LanSixHunterVanTest {
    static final class Peer implements AutoCloseable {
        final BlockingQueue<String> inbox=new LinkedBlockingQueue<>();
        final LanClient client;
        Peer(int port,boolean ghost,String name)throws Exception {
            client=new LanClient("127.0.0.1",port,ghost,name,inbox::offer);
        }
        String expect(String prefix)throws Exception{
            long end=System.nanoTime()+TimeUnit.SECONDS.toNanos(8);
            while(System.nanoTime()<end){
                String frame=inbox.poll(100,TimeUnit.MILLISECONDS);
                if(frame!=null&&frame.startsWith(prefix))return frame;
            }
            throw new AssertionError("missing "+prefix+" for "+client.seat());
        }
        public void close(){client.close();}
    }
    static void check(boolean value,String msg){if(!value)throw new AssertionError(msg);}
    public static void main(String[] args)throws Exception{
        CustomContract contract=CustomContract.standard(6);
        try(LanHost host=new LanHost("127.0.0.1",0,GhostIdentity.Type.SPIRIT,contract)){
            java.util.List<Peer> players=new ArrayList<>();
            Peer ghost=null;
            try{
                for(int i=0;i<6;i++){
                    Peer p=new Peer(host.port(),false,"Hunter"+(i+1));
                    check(p.client.seat().equals("H"+(i+1)),"hunter seat ordering");
                    players.add(p);
                }
                try(Peer seventh=new Peer(host.port(),false,"Excess")){
                    throw new AssertionError("seventh hunter was admitted");
                }catch(java.io.IOException expected){/* no spare hunter seat */}
                ghost=new Peer(host.port(),true,"Spectral");
                check(ghost.client.seat().equals("GHOST"),"ghost owns independent seventh socket");
                for(Peer player:players)player.client.ready();
                ghost.client.ready();
                players.get(0).expect("LOBBY|6|HUMAN|7|WAITING");
                players.get(0).client.start();
                check(players.get(0).expect("PARTY|6|6").equals("PARTY|6|6"),
                    "real max-party difficulty +6");
                players.get(0).client.view3D();
                players.get(0).expect("ACCEPT|VIEW3D");
                players.get(0).client.vanMonitor();
                String packet=players.get(0).expect("VANMETERS|");
                var meter=VanTelemetry.Display.decode(packet);
                check(meter.sanity()[0]==100&&meter.sanity().length==6,
                    "host reports six real hunter sanity records");
                Thread.sleep(120);
                check(ghost.inbox.stream().noneMatch(x->x.startsWith("VANMETERS|")
                    ||x.startsWith("SUPPLY|")||x.startsWith("TEAMMAP|")),
                    "ghost cannot receive monitoring or teammate information");
                check(players.get(1).inbox.stream().noneMatch(x->x.startsWith("VANMETERS|")),
                    "van telemetry addressed to requester only");
                // H1 explicitly entered physical VIEW3D to operate the van display.
                // Room-jump MOVE is correctly forbidden for a 3D client. Keep H1
                // physically in the van and exercise the other five in room mode.
                for(int i=1;i<players.size();i++){
                    Peer player=players.get(i);
                    for(int room:new int[]{11,8,5,4}){
                        player.client.move(room);
                        player.expect("ACCEPT|MOVE|"+room);
                    }
                }
                Thread.sleep(350);
                check(host.running(),"van monitoring and five distant hunters coexist");
                System.out.println("PASS: 6+1 sockets, +6 threat, private van telemetry, seventh hunter denied");
            }finally{
                for(Peer p:players)p.close();
                if(ghost!=null)ghost.close();
            }
        }
        // Independent session: verify all six hunters physically occupy ghost room
        // using legal room-mode movement (none opened a 3D view). Never weaken the
        // authoritative no-teleport rule merely to make a mixed-mode test pass.
        try(LanHost host=new LanHost("127.0.0.1",0,GhostIdentity.Type.SPIRIT,
                CustomContract.standard(6))){
            java.util.List<Peer> hunters=new ArrayList<>();
            try{
                for(int i=0;i<6;i++)hunters.add(new Peer(host.port(),false,"FullParty"+(i+1)));
                for(Peer peer:hunters)peer.client.ready();
                hunters.get(0).expect("LOBBY|6|AI|6|WAITING");
                hunters.get(0).client.start();
                hunters.get(0).expect("INFO|mission started");
                for(Peer peer:hunters){
                    for(int room:new int[]{11,8,5,4}){
                        peer.client.move(room);
                        peer.expect("ACCEPT|MOVE|"+room);
                    }
                }
                Thread.sleep(350);
                check(host.running(),"six actual room-mode occupants share the ghost room");
                System.out.println("PASS: six simultaneous ghost-room occupants on authoritative room topology");
            }finally{
                for(Peer peer:hunters)peer.close();
            }
        }
    }
}
