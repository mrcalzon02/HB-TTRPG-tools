package org.beckenburg;

import java.io.*;
import java.net.*;
import java.util.*;
import java.util.concurrent.*;

/** Real, small, host-authoritative TCP LAN *room simulation*, not a 3D network match.
 * A socket is bound to one seat; remote peers cannot submit a Source or authoritative damage.
 */
public final class LanHost implements AutoCloseable {
    private final ServerSocket listener;
    private final ExecutorService workers=Executors.newCachedThreadPool(r->{Thread t=new Thread(r,"beckenburg-lan-peer");t.setDaemon(true);return t;});
    private final ScheduledExecutorService clock=Executors.newSingleThreadScheduledExecutor(r->{Thread t=new Thread(r,"beckenburg-lan-tick");t.setDaemon(true);return t;});
    private final Object mutex=new Object();
    private final Peer[] seats=new Peer[4];
    private final int[] hunterRooms={HouseMap.EXTRACTION_ROOM,HouseMap.EXTRACTION_ROOM,HouseMap.EXTRACTION_ROOM};
    private final long[] hunterSequences={-1,-1,-1};
    private final HouseMap map=new HouseMap();
    private final GhostDomain ghost=new GhostDomain(map,4);
    private final GhostDomain.AiController ai=new GhostDomain.AiController(20261016L);
    private volatile boolean closed;
    private boolean running,everStarted;
    private int tick;
    private final String bindAddress;

    public LanHost(String ip,int port)throws IOException {
        if(port<0||port>65535)throw new IllegalArgumentException("invalid port");
        bindAddress=Objects.requireNonNull(ip);
        listener=new ServerSocket();listener.setReuseAddress(true);
        listener.bind(new InetSocketAddress(InetAddress.getByName(ip),port),8);
        workers.execute(this::acceptLoop);
        clock.scheduleAtFixedRate(this::tickSafely,100,100,TimeUnit.MILLISECONDS);
    }
    public int port(){return listener.getLocalPort();}
    public String bindAddress(){return bindAddress;}
    public boolean running(){synchronized(mutex){return running;}}
    public int connected(){synchronized(mutex){int count=0;for(Peer peer:seats)if(peer!=null)count++;return count;}}
    private void acceptLoop(){
        while(!closed){try{Socket socket=listener.accept();socket.setTcpNoDelay(true);
            workers.execute(()->serve(socket));
        }catch(IOException e){if(!closed)System.err.println("LAN accept failed: "+e.getMessage());}}
    }
    private void serve(Socket socket){
        Peer peer=null;
        try(socket){socket.setSoTimeout(5000);
            Reader in=LanProtocol.reader(socket.getInputStream());
            Writer out=LanProtocol.writer(socket.getOutputStream());
            String initial=LanProtocol.read(in);
            List<String> hello=LanProtocol.parts(initial);
            if(hello.size()!=4||!hello.get(0).equals("JOIN")||!hello.get(1).equals("1")){
                LanProtocol.write(out,"REJECT|protocol version or handshake");return;
            }
            boolean wantsGhost=switch(hello.get(2)){
                case "GHOST" -> true;case "HUNTER" -> false;default -> throw new IllegalArgumentException("invalid role");
            };
            String nickname=LanProtocol.cleanName(hello.get(3));
            synchronized(mutex){
                if(running){LanProtocol.write(out,"REJECT|match already running");return;}
                int slot=wantsGhost?3:firstVacantHunter();
                if(slot<0||seats[slot]!=null){LanProtocol.write(out,"REJECT|seat unavailable");return;}
                peer=new Peer(socket,in,out,slot,nickname);seats[slot]=peer;
                LanProtocol.write(out,"WELCOME|"+(slot==3?"GHOST":"H"+(slot+1))+"|"+LanProtocol.VERSION);
                broadcastLobby();
            }
            socket.setSoTimeout(0);
            while(!closed){String frame=LanProtocol.read(in);if(frame==null)break;
                synchronized(mutex){if(closed)break;handle(peer,frame);}
            }
        }catch(Exception e){if(!closed&&peer!=null){synchronized(mutex){reply(peer,"REJECT|connection terminated");}}}
        finally {if(peer!=null){synchronized(mutex){if(seats[peer.slot]==peer){seats[peer.slot]=null;if(running){running=false;notifyAllPeers("INFO|match stopped after disconnect");}broadcastLobby();}}}}
    }
    private int firstVacantHunter(){for(int i=0;i<3;i++)if(seats[i]==null)return i;return -1;}
    private void handle(Peer peer,String frame){
        List<String> p;
        try{p=LanProtocol.parts(frame);}catch(IllegalArgumentException ex){reply(peer,"REJECT|invalid frame");return;}
        try{
            switch(p.get(0)){
                case "READY" -> {
                    if(p.size()!=1||running)throw new IllegalArgumentException("invalid ready command");
                    peer.ready=!peer.ready;broadcastLobby();
                }
                case "START" -> {
                    if(p.size()!=1||peer.slot!=0)throw new IllegalArgumentException("host hunter must start");
                    if(running||everStarted)throw new IllegalArgumentException("fresh host required for another match");
                    for(int i=0;i<3;i++)if(seats[i]==null||!seats[i].ready)throw new IllegalArgumentException("three hunters must be ready");
                    if(seats[3]!=null&&!seats[3].ready)throw new IllegalArgumentException("ghost must be ready");
                    running=true;everStarted=true;tick=0;notifyAllPeers("INFO|mission started with "+(seats[3]==null?"AI":"human")+" ghost");broadcastState();
                }
                case "MOVE" -> {
                    if(!running||peer.slot==3||p.size()!=3)throw new IllegalArgumentException("hunter command unavailable");
                    int target=LanProtocol.integer(p.get(1),0,HouseMap.ROOM_COUNT-1);
                    long seq=LanProtocol.sequence(p.get(2));
                    if(seq<=hunterSequences[peer.slot])throw new IllegalArgumentException("stale movement sequence");
                    hunterSequences[peer.slot]=seq;
                    int at=hunterRooms[peer.slot];
                    if(target==at||Math.abs(target/HouseMap.COLS-at/HouseMap.COLS)+Math.abs(target%HouseMap.COLS-at%HouseMap.COLS)!=1)
                        throw new IllegalArgumentException("room not adjacent");
                    // Room-level topology proof only; physical door and body collision still need synced transform validation.
                    hunterRooms[peer.slot]=target;reply(peer,"ACCEPT|MOVE|"+target);broadcastState();
                }
                case "GHOST" -> {
                    if(!running||peer.slot!=3||p.size()!=4)throw new IllegalArgumentException("ghost seat required");
                    GhostDomain.Action action=GhostDomain.Action.valueOf(p.get(1));
                    int room=LanProtocol.integer(p.get(2),0,HouseMap.ROOM_COUNT-1);
                    long seq=LanProtocol.sequence(p.get(3));
                    GhostDomain.Resolution result=ghost.dispatch(new GhostDomain.Command(action,room,seq,GhostDomain.Source.HUMAN));
                    if(!result.applied())throw new IllegalArgumentException(result.reason());
                    reply(peer,"ACCEPT|GHOST|"+action+"|"+result.energy());
                    if(result.fear()>0||result.harm()>0){
                        for(int i=0;i<3;i++)if(seats[i]!=null&&hunterRooms[i]==result.room())
                            reply(seats[i],"EFFECT|"+action+"|"+result.fear()+"|"+result.harm());
                    }
                    broadcastState();
                }
                default -> throw new IllegalArgumentException("unknown command");
            }
        }catch(IllegalArgumentException ex){reply(peer,"REJECT|"+safeReason(ex.getMessage()));}
    }
    private static String safeReason(String s){return s==null?"invalid command":s.replaceAll("[^A-Za-z0-9 ._-]","").substring(0,Math.min(85,s.replaceAll("[^A-Za-z0-9 ._-]","").length()));}
    private void tickSafely(){if(closed)return; synchronized(mutex){
        if(!running)return;
        try{tick++;
            int audible=-1;for(int i=0;i<3;i++)if(seats[i]!=null&&hunterRooms[i]==ghost.room()){audible=hunterRooms[i];break;}
            ghost.advance(tick,audible);
            if(seats[3]==null){GhostDomain.Command choice=ai.decide(ghost.observe());if(choice!=null){GhostDomain.Resolution result=ghost.dispatch(choice);
                if(result.applied()&&(result.fear()>0||result.harm()>0))for(int i=0;i<3;i++)if(seats[i]!=null&&hunterRooms[i]==result.room())reply(seats[i],"EFFECT|"+result.action()+"|"+result.fear()+"|"+result.harm());
            }}
            if(tick%5==0)broadcastState();
        }catch(RuntimeException ex){running=false;notifyAllPeers("INFO|host simulation stopped");System.err.println("LAN tick failure: "+ex.getMessage());}
    }}
    private void broadcastState(){
        GhostDomain.Observation o=ghost.observe();
        for(int i=0;i<4;i++){
            Peer peer=seats[i];if(peer==null)continue;
            boolean isGhost=i==3;
            int myRoom=isGhost?o.room():hunterRooms[i];
            int visible=isGhost?-1:(o.manifested()&&myRoom==o.room()?o.room():-1);
            reply(peer,"STATE|"+tick+"|"+myRoom+"|"+visible+"|"+(isGhost?o.energy():-1)+"|"+(isGhost?o.legalActions().toString().replace(" ",""):("role:"+peer.slot))+"|"+(isGhost&&o.hearsHunter()?1:0));
        }
    }
    private void broadcastLobby(){
        int hunters=0,ready=0;for(int i=0;i<4;i++)if(seats[i]!=null){if(i<3)hunters++;if(seats[i].ready)ready++;}
        notifyAllPeers("LOBBY|"+hunters+"|"+(seats[3]==null?"AI":"HUMAN")+"|"+ready+"|"+(running?"RUNNING":"WAITING"));
    }
    private void notifyAllPeers(String event){for(Peer peer:seats)if(peer!=null)reply(peer,event);}
    private static void reply(Peer peer,String event){try{LanProtocol.write(peer.output,event);}catch(IOException ex){try{peer.socket.close();}catch(IOException ignored){}}}
    @Override public void close(){closed=true;try{listener.close();}catch(IOException ignored){}
        synchronized(mutex){for(Peer peer:seats)if(peer!=null){try{peer.socket.close();}catch(IOException ignored){}}}
        clock.shutdownNow();workers.shutdownNow();
    }
    private static final class Peer{
        final Socket socket;final Reader input;final Writer output;final int slot;final String name;boolean ready;
        Peer(Socket s,Reader in,Writer out,int slot,String name){socket=s;input=in;output=out;this.slot=slot;this.name=name;}
    }
}
