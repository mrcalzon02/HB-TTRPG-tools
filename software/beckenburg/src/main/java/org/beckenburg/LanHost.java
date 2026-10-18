package org.beckenburg;

import java.io.*;
import java.net.*;
import java.util.*;
import java.util.concurrent.*;

/** Host-authoritative TCP LAN case with room mode and physically validated 3D hunter mode.
 * A socket is bound to one seat; remote peers cannot submit a Source or authoritative damage.
 */
public final class LanHost implements AutoCloseable {
    private final ServerSocket listener;
    /** UDP media socket on the same numeric port as TCP. LAN-only, not encrypted. */
    private final LanVoiceRelay voice;
    private final ExecutorService workers=Executors.newCachedThreadPool(r->{Thread t=new Thread(r,"beckenburg-lan-peer");t.setDaemon(true);return t;});
    private final ScheduledExecutorService clock=Executors.newSingleThreadScheduledExecutor(r->{Thread t=new Thread(r,"beckenburg-lan-tick");t.setDaemon(true);return t;});
    private final Object mutex=new Object();
    private static final int HUNTERS=6,GHOST_SEAT=HUNTERS;
    private final Peer[] seats=new Peer[HUNTERS+1];
    private final int[] hunterRooms=new int[HUNTERS];
    private final long[] hunterSequences=new long[HUNTERS];
    private final HouseMap map=new HouseMap();
    private final LanWorld world=new LanWorld(map);
    private final LanGhostSpatial ghostPose=new LanGhostSpatial(map,4);
    private final GhostDomain ghost;
    private final LanCase mission;
    private final LanEvidenceJournal casefile=new LanEvidenceJournal();
    private final FieldJournal fieldNotes=new FieldJournal();
    // Radio history is bounded and investigator-only. Local speech has no global replay.
    private final java.util.ArrayDeque<LanChat.Entry> radioHistory=new java.util.ArrayDeque<>();
    private final LanGhostPursuit ai;
    private final GhostIdentity.Type ghostType;
    private final boolean ghostMayStart; 
    private LobbyGhostAvatar.Look ghostLobbyLook;
    private final LanGhostAnimation animation=new LanGhostAnimation();
    private final HunterCounters counters=new HunterCounters();
    private final CustomContract contract;
    private final VanTelemetry monitor=new VanTelemetry(20261017L);
    private final FieldSupplies[] supplies=new FieldSupplies[HUNTERS];
    private volatile boolean closed;
    private boolean running,everStarted;
    private long hostGhostActionSequence=-1;
    private int tick;
    private int lastGhostSoundTick=-10000;
    private final int[] lastGhostFootstepCueTick=new int[HUNTERS];
    private final int[] lastVoiceCueTick=new int[HUNTERS];
    private LanTelegraphedStrike.Pending pendingStrike;
    private final String bindAddress;

    public LanHost(String ip,int port)throws IOException{
        this(ip,port,GhostIdentity.Type.SPIRIT,false,CustomContract.standard(3),false);
    }
    /** Legacy three-hunter host is retained for existing integration tests. */
    public LanHost(String ip,int port,GhostIdentity.Type type)throws IOException{
        this(ip,port,type,true,CustomContract.standard(3),false);
    }
    public LanHost(String ip,int port,GhostIdentity.Type type,CustomContract config)throws IOException{
        this(ip,port,type,true,config,false);
    }
    /** Hosting as a ghost is possible only when the local host explicitly selected it. */
    public LanHost(String ip,int port,GhostIdentity.Type type,CustomContract config,
            boolean hostAsGhost)throws IOException{
        this(ip,port,type,true,config,hostAsGhost);
    }
    private LanHost(String ip,int port,GhostIdentity.Type type,boolean identityMode,
            CustomContract config,boolean hostAsGhost)throws IOException {
        if(port<0||port>65535)throw new IllegalArgumentException("invalid port");
        ghostType=Objects.requireNonNull(type);
        contract=Objects.requireNonNull(config);
        ghostMayStart=hostAsGhost;
        Arrays.fill(hunterRooms,HouseMap.EXTRACTION_ROOM);
        Arrays.fill(hunterSequences,-1);
        Arrays.fill(lastGhostFootstepCueTick,-10000);
        Arrays.fill(lastVoiceCueTick,-10000);
        for(int i=0;i<HUNTERS;i++)supplies[i]=new FieldSupplies();
        world.configure(contract);
        ghostPose.configureSpeed(contract.ghostSpeed());
        ghost=new GhostDomain(map,4,type);
        mission=new LanCase(4);
        mission.configureHunters(contract.hunters());
        mission.configurePartyThreat(contract.partyDifficulty());
        mission.setStartingSanity(contract.startingSanity());
        mission.configureSanityDrain(contract.sanityDrain());
        ghost.configureRecovery(contract.energyRecovery());
        if(identityMode)mission.configure(type,true);
        ai=new LanGhostPursuit(map,20261016L,type);
        ai.configureFrequency(contract.eventFrequency());
        bindAddress=Objects.requireNonNull(ip);
        listener=new ServerSocket();listener.setReuseAddress(true);
        listener.bind(new InetSocketAddress(InetAddress.getByName(ip),port),8);
        try{voice=new LanVoiceRelay(listener.getInetAddress(),listener.getLocalPort(),this::routeVoice);}
        catch(SocketException failure){listener.close();throw failure;}
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
                int slot=wantsGhost?GHOST_SEAT:firstVacantHunter();
                if(slot<0||seats[slot]!=null){LanProtocol.write(out,"REJECT|seat unavailable");return;}
                peer=new Peer(socket,in,out,slot,nickname);seats[slot]=peer;
                if(wantsGhost)ghostLobbyLook=LobbyGhostAvatar.random(
                    java.util.concurrent.ThreadLocalRandom.current());
                LanProtocol.write(out,"WELCOME|"+(slot==GHOST_SEAT?"GHOST":"H"+(slot+1))+"|"+LanProtocol.VERSION);
                if(slot!=GHOST_SEAT){
                    // Joining hunters also receive earlier teammates' names, not just the
                    // current join. This avoids a stale lobby before their first 3D view.
                    for(int i=0;i<HUNTERS;i++)
                        if(i!=slot&&seats[i]!=null)
                            reply(peer,"PLAYERNAME|"+i+"|"+seats[i].name);
                    // The ghost is never in the private hunter packet fanout.
                    notifyHunters("PLAYERNAME|"+slot+"|"+nickname);
                }
                broadcastLobby();
            }
            socket.setSoTimeout(0);
            while(!closed){String frame=LanProtocol.read(in);if(frame==null)break;
                synchronized(mutex){if(closed)break;handle(peer,frame);}
            }
        }catch(Exception e){if(!closed&&peer!=null){synchronized(mutex){reply(peer,"REJECT|connection terminated");}}}
        finally {
            if(peer!=null) synchronized(mutex){
                if(seats[peer.slot]==peer){
                    seats[peer.slot]=null;
                    voice.unregister(peer.slot);
                    if(peer.slot==GHOST_SEAT)ghostLobbyLook=null;
                    if(running){
                        if(peer.slot==GHOST_SEAT){
                            // No world reset: the AI inherits the same room, energy, cooldowns,
                            // manifestation and pending strike. Only the controller is swapped.
                            ai.forget();
                            notifyHunters("INFO|human ghost disconnected - AI has taken control");
                            broadcastState();
                        }else if(peer.slot==0){
                            // The host-owned hunter still owns the session lifecycle.
                            running=false;
                            notifyAllPeers("INFO|match stopped after host departure");
                        }else{
                            // A guest hunter cannot destroy the other players' investigation.
                            mission.depart(peer.slot);
                            notifyHunters("PEER|LEFT|"+peer.slot);
                            notifyHunters("INFO|hunter "+(peer.slot+1)+" departed - "
                                    +mission.remainingHunters()+" investigator(s) remaining");
                            broadcastState();broadcastWorld();broadcastProgress();
                            finishIfComplete();
                        }
                    }
                    broadcastLobby();
                }
            }
        }
    }
    private int firstVacantHunter(){for(int i=0;i<contract.hunters();i++)if(seats[i]==null)return i;return -1;}
    private void handle(Peer peer,String frame){
        List<String> p;
        try{p=LanProtocol.parts(frame);}catch(IllegalArgumentException ex){reply(peer,"REJECT|invalid frame");return;}
        try{
            switch(p.get(0)){
                case "LOBBYCHAT" -> {
                    if(running||p.size()!=2)throw new IllegalArgumentException("lobby chat only before match");
                    String words=LanChat.clean(p.get(1));
                    long now=System.nanoTime();
                    if(peer.lastLobbyChatNanos!=0 &&
                            now-peer.lastLobbyChatNanos<500_000_000L)
                        throw new IllegalArgumentException("lobby chat cooling down");
                    peer.lastLobbyChatNanos=now;
                    notifyAllPeers("LOBBYCHAT|"+(peer.slot==GHOST_SEAT?"GHOST":"H"+(peer.slot+1))
                        +"|"+peer.name+"|"+words);
                }
                case "READY" -> {
                    if(p.size()!=1||running)throw new IllegalArgumentException("invalid ready command");
                    peer.ready=!peer.ready;broadcastLobby();
                }
                case "START" -> {
                    if(p.size()!=1||(peer.slot!=0&&!(ghostMayStart&&peer.slot==GHOST_SEAT)))
                        throw new IllegalArgumentException("host hunter or hosting ghost must start");
                    if(running||everStarted)throw new IllegalArgumentException("fresh host required for another match");
                    for(int i=0;i<contract.hunters();i++)
                        if(seats[i]==null||!seats[i].ready)
                            throw new IllegalArgumentException("configured hunter party must be ready");
                    if(seats[GHOST_SEAT]!=null&&!seats[GHOST_SEAT].ready)throw new IllegalArgumentException("ghost must be ready");
                    running=true;everStarted=true;tick=0;
                    notifyAllPeers("INFO|mission started with "+(seats[GHOST_SEAT]==null?"AI":"human")+" ghost");
                    if(mission.identificationRequired())notifyHunters("SITES|9|6|10");
                    broadcastState();broadcastProgress();broadcastWorld();
                    notifyHunters("PARTY|"+contract.hunters()+"|"+contract.partyDifficulty());
                }
                case "VIEW3D" -> {
                    if(!running||peer.slot==GHOST_SEAT||p.size()!=1)throw new IllegalArgumentException("3D view requires active hunter");
                    peer.worldMode=true;
                    reply(peer,"ACCEPT|VIEW3D");
                    // Replay real investigator nicknames to newly opened hunter windows.
                    // Ghost seats cannot enter VIEW3D and are never name recipients.
                    for(int i=0;i<HUNTERS;i++)
                        if(i!=peer.slot&&seats[i]!=null)
                            reply(peer,"PLAYERNAME|"+i+"|"+seats[i].name);
                    broadcastWorld();broadcastApparitions();broadcastCounters();sendCounterAmmo(peer);
                    reply(peer,supplies[peer.slot].frame());
                    reply(peer,"PARTY|"+contract.hunters()+"|"+contract.partyDifficulty());
                    reply(peer,"HIDECONFIG|"+contract.hidingSpots());
                    reply(peer,"VOICEKEY|"+voice.port()+"|"+voice.register(peer.slot,peer.socket.getInetAddress()));
                    for(LanChat.Entry line:radioHistory)reply(peer,line.frame());
                }
                case "GVIEW3D" -> {
                    if(!running||peer.slot!=GHOST_SEAT||p.size()!=1)throw new IllegalArgumentException("ghost view requires active ghost seat");
                    peer.ghostWorldMode=true;
                    reply(peer,"ACCEPT|GVIEW3D");
                    reply(peer,"VOICEKEY|"+voice.port()+"|"+voice.register(peer.slot,peer.socket.getInetAddress()));
                    reply(peer,"GTYPE|"+ghostType+"|"+ghostType.behavior());
                    reply(peer,ghostPose.frame(tick));broadcastState();
                }
                case "GSTEP" -> {
                    if(!running||peer.slot!=GHOST_SEAT||!peer.ghostWorldMode||p.size()!=4)
                        throw new IllegalArgumentException("spectral movement requires ghost view");
                    int dx=LanProtocol.integer(p.get(1),-100,100),dz=LanProtocol.integer(p.get(2),-100,100);
                    acceptGhostPoseSequence(peer,LanProtocol.sequence(p.get(3)));
                    ghostPose.step(dx,dz,tick);
                    reply(peer,"ACCEPT|GSTEP");reply(peer,ghostPose.frame(tick));broadcastApparitions();
                    if(ghost.manifested()&&tick%5==0)broadcastGhostSound(LanSound.Cue.FOOTFALL);
                }
                case "GTURN" -> {
                    if(!running||peer.slot!=GHOST_SEAT||!peer.ghostWorldMode||p.size()!=3)
                        throw new IllegalArgumentException("spectral heading requires ghost view");
                    int heading=LanProtocol.integer(p.get(1),0,359);
                    acceptGhostPoseSequence(peer,LanProtocol.sequence(p.get(2)));
                    ghostPose.turn(heading);reply(peer,ghostPose.frame(tick));
                }
                case "STEP" -> {
                    if(!running||peer.slot==GHOST_SEAT||!peer.worldMode||(p.size()!=4&&p.size()!=5))
                        throw new IllegalArgumentException("3D movement unavailable");
                    int dx=LanProtocol.integer(p.get(1),-100,100),dz=LanProtocol.integer(p.get(2),-100,100);
                    acceptHunterSequence(peer,LanProtocol.sequence(p.get(p.size()-1)));
                    ensureActiveHunter(peer);
                    boolean runningFast=p.size()==5&&LanProtocol.integer(p.get(3),0,1)==1;
                    world.move(peer.slot,dx,dz,tick,runningFast);
                    hunterRooms[peer.slot]=world.body(peer.slot).room();
                    recordSound(peer.slot,LanGhostPursuit.Sound.FOOTSTEP);
                    reply(peer,"ACCEPT|STEP");broadcastWorld();broadcastState();
                }
                case "TURN" -> {
                    if(!running||peer.slot==GHOST_SEAT||!peer.worldMode||p.size()!=3)throw new IllegalArgumentException("3D heading unavailable");
                    int heading=LanProtocol.integer(p.get(1),0,359);
                    acceptHunterSequence(peer,LanProtocol.sequence(p.get(2)));
                    world.turn(peer.slot,heading);broadcastWorld();
                }
                case "DOOR" -> {
                    if(!running||peer.slot==GHOST_SEAT||!peer.worldMode||p.size()!=2)throw new IllegalArgumentException("door command unavailable");
                    acceptHunterSequence(peer,LanProtocol.sequence(p.get(1)));
                    ensureActiveHunter(peer);
                    if(!world.door(peer.slot,tick))throw new IllegalArgumentException("no reachable door");
                    recordSound(peer.slot,LanGhostPursuit.Sound.DOOR);
                    reply(peer,"ACCEPT|DOOR");broadcastWorld();
                }
                case "MOVE" -> {
                    if(!running||peer.slot==GHOST_SEAT||p.size()!=3)throw new IllegalArgumentException("hunter command unavailable");
                    if(peer.worldMode)throw new IllegalArgumentException("room jumps disabled in 3D mode");
                    int target=LanProtocol.integer(p.get(1),0,HouseMap.ROOM_COUNT-1);
                    long seq=LanProtocol.sequence(p.get(2));
                    acceptHunterSequence(peer,seq);
                    ensureActiveHunter(peer);
                    int at=hunterRooms[peer.slot];
                    if(target==at||Math.abs(target/HouseMap.COLS-at/HouseMap.COLS)+Math.abs(target%HouseMap.COLS-at%HouseMap.COLS)!=1)
                        throw new IllegalArgumentException("room not adjacent");
                    // Room-level topology proof only; physical door and body collision still need synced transform validation.
                    hunterRooms[peer.slot]=target;world.setRoom(peer.slot,target);recordSound(peer.slot,LanGhostPursuit.Sound.FOOTSTEP);reply(peer,"ACCEPT|MOVE|"+target);broadcastState();broadcastWorld();
                }
                case "HIDE" -> {
                    if(!running||peer.slot==GHOST_SEAT||!peer.worldMode||p.size()!=2)
                        throw new IllegalArgumentException("hunter hiding requires world view");
                    acceptHunterSequence(peer,LanProtocol.sequence(p.get(1)));
                    ensureActiveHunter(peer);
                    boolean concealed=world.toggleHide(peer.slot);
                    reply(peer,"HIDING|"+(concealed?1:0));
                }
                case "VANMON" -> {
                    if(!running||peer.slot==GHOST_SEAT||!peer.worldMode||p.size()!=2)
                        throw new IllegalArgumentException("hunter van display required");
                    acceptHunterSequence(peer,LanProtocol.sequence(p.get(1)));
                    if(!contract.sanityMonitor()&&!contract.activityMonitor())
                        throw new IllegalArgumentException("monitors disabled by contract");
                    if(!insideVan(peer.slot))throw new IllegalArgumentException("van monitors are only usable in the van");
                    if(tick-peer.lastMonitorTick<5)throw new IllegalArgumentException("monitor update cooldown");
                    peer.lastMonitorTick=tick;
                    int[] sane=new int[HUNTERS];
                    for(int i=0;i<HUNTERS;i++)
                        sane[i]=contract.sanityMonitor()&&seats[i]!=null?100-mission.stress(i):-1;
                    int activity=contract.activityMonitor()?monitor.sample(tick,ghost.energy()):0;
                    reply(peer,new VanTelemetry.Display(tick,activity,sane).frame());
                }
                case "BUY" -> {
                    if(!running||peer.slot==GHOST_SEAT||!peer.worldMode||p.size()!=4)
                        throw new IllegalArgumentException("hunter store required");
                    FieldSupplies.Kind kind=FieldSupplies.Kind.valueOf(p.get(1));
                    FieldSupplies.Tier tier=FieldSupplies.Tier.valueOf(p.get(2));
                    acceptHunterSequence(peer,LanProtocol.sequence(p.get(3)));
                    ensureActiveHunter(peer);
                    if(map.van().stationAt(world.body(peer.slot).x(),world.body(peer.slot).z())
                        !=VanStaging.Station.EQUIPMENT)
                        throw new IllegalArgumentException("purchase supplies at the van equipment rack");
                    if(!supplies[peer.slot].purchase(kind,tier))
                        throw new IllegalArgumentException("insufficient credits or full stock");
                    reply(peer,"ACCEPT|BUY|"+kind+"|"+tier);
                    reply(peer,supplies[peer.slot].frame());
                }
                case "USESUPPLY" -> {
                    if(!running||peer.slot==GHOST_SEAT||!peer.worldMode||p.size()!=4)
                        throw new IllegalArgumentException("hunter medicine required");
                    FieldSupplies.Kind kind=FieldSupplies.Kind.valueOf(p.get(1));
                    FieldSupplies.Tier tier=FieldSupplies.Tier.valueOf(p.get(2));
                    acceptHunterSequence(peer,LanProtocol.sequence(p.get(3)));
                    ensureActiveHunter(peer);
                    if(supplies[peer.slot].stock(kind,tier)==0)
                        throw new IllegalArgumentException("medicine not purchased");
                    int amount=tier.restore(kind);
                    boolean used=kind==FieldSupplies.Kind.HEALTH
                        ?mission.heal(peer.slot,amount):mission.calm(peer.slot,amount);
                    if(!used)throw new IllegalArgumentException("already at full health or sanity");
                    supplies[peer.slot].consume(kind,tier);
                    reply(peer,"ACCEPT|USESUPPLY|"+kind+"|"+tier);
                    reply(peer,supplies[peer.slot].frame());
                    broadcastProgress();
                }
                case "DEPLOY" -> {
                    if(!running||peer.slot==GHOST_SEAT||!peer.worldMode||p.size()!=3)
                        throw new IllegalArgumentException("physical hunter view required");
                    HunterCounters.Kind kind=HunterCounters.Kind.valueOf(p.get(1));
                    acceptHunterSequence(peer,LanProtocol.sequence(p.get(2)));
                    ensureActiveHunter(peer);
                    counters.launch(peer.slot,kind,world.body(peer.slot),map,tick);
                    reply(peer,"ACCEPT|DEPLOY|"+kind);
                    sendCounterAmmo(peer);
                    recordSound(peer.slot,LanGhostPursuit.Sound.EQUIPMENT);
                    broadcastCounters();
                }
                case "UVSCAN" -> {
                    if(!running||peer.slot==GHOST_SEAT||!peer.worldMode||p.size()!=2)
                        throw new IllegalArgumentException("physical hunter view required");
                    acceptHunterSequence(peer,LanProtocol.sequence(p.get(1)));
                    ensureActiveHunter(peer);
                    int room=world.body(peer.slot).room();
                    boolean trace=counters.recentUv(room,tick);
                    reply(peer,"ACCEPT|UVSCAN|"+(trace?"FRESH SURFACE TRACE":"NO RECENT TRACE"));
                    recordSound(peer.slot,LanGhostPursuit.Sound.EQUIPMENT);
                }
                case "SCAN" -> {
                    if(!running||peer.slot==GHOST_SEAT||p.size()!=3)throw new IllegalArgumentException("hunter action unavailable");
                    LanCase.Tool tool=LanCase.Tool.valueOf(p.get(1));
                    acceptHunterSequence(peer,LanProtocol.sequence(p.get(2)));
                    LanCase.Report result=peer.worldMode
                            ?mission.scanSpatial(peer.slot,tool,world.body(peer.slot),ghost.room(),map)
                            :mission.scan(peer.slot,tool,hunterRooms[peer.slot],ghost.room());
                    answerHunter(peer,"SCAN",result);
                    if(result.accepted()){
                        recordSound(peer.slot,LanGhostPursuit.Sound.EQUIPMENT);
                        String note=casefile.record(tick,peer.slot,hunterRooms[peer.slot],tool,result);
                        if(note!=null)notifyHunters(note);
                    }
                    if(result.accepted()&&result.message().startsWith("CONFIRMED"))notifyHunters("EVIDENCE|"+tool+"|"+mission.evidenceCount());
                    broadcastProgress();
                }
                case "JOURNAL" -> {
                    if(!running||peer.slot==GHOST_SEAT||p.size()!=1)
                        throw new IllegalArgumentException("active hunter required for casefile");
                    reply(peer,"CASEFILE|RESET");
                    for(String note:casefile.snapshot())reply(peer,note);
                    reply(peer,"NOTES|RESET");
                    for(String note:fieldNotes.snapshot())reply(peer,note);
                    reply(peer,"ACCEPT|JOURNAL");
                }
                case "SAY" -> {
                    if(!running||peer.slot==GHOST_SEAT||!peer.worldMode||p.size()!=4)
                        throw new IllegalArgumentException("hunter world chat required");
                    LanChat.Channel channel=LanChat.Channel.valueOf(p.get(1));
                    String message=LanChat.clean(p.get(2));
                    acceptHunterSequence(peer,LanProtocol.sequence(p.get(3)));
                    ensureActiveHunter(peer);
                    if(tick-peer.lastChatTick<6)
                        throw new IllegalArgumentException("chat cooling down");
                    peer.lastChatTick=tick;
                    LanChat.Entry line=new LanChat.Entry(channel,peer.slot,tick,message);
                    LanWorld.Body from=world.body(peer.slot);
                    for(int i=0;i<HUNTERS;i++){
                        Peer recipient=seats[i];
                        if(recipient==null||!recipient.worldMode)continue;
                        if(channel==LanChat.Channel.RADIO ||
                           i==peer.slot||LanChat.localVisible(map,from,world.body(i)))
                            reply(recipient,line.frame());
                    }
                    if(channel==LanChat.Channel.RADIO){
                        radioHistory.addLast(line);
                        if(radioHistory.size()>16)radioHistory.removeFirst();
                    }
                    // The physical act of speaking creates a coarse ghost hearing cue,
                    // but the ghost receives neither transcript nor speaker identity.
                    recordSound(peer.slot,LanGhostPursuit.Sound.VOICE);
                    reply(peer,"ACCEPT|SAY|"+channel);
                }
                case "NOTE" -> {
                    if(!running||peer.slot==GHOST_SEAT||p.size()!=4)
                        throw new IllegalArgumentException("active hunter notes required");
                    GhostFieldGuide.Clue clue=GhostFieldGuide.Clue.valueOf(p.get(1));
                    FieldJournal.Status status=FieldJournal.Status.valueOf(p.get(2));
                    acceptHunterSequence(peer,LanProtocol.sequence(p.get(3)));
                    ensureActiveHunter(peer);
                    FieldJournal.Note note=fieldNotes.set(clue,status,peer.slot,tick);
                    notifyHunters(note.frame()); // observed mark only; never confirms an instrument result
                    reply(peer,"ACCEPT|NOTE|"+clue);
                }
                case "IDENTIFY" -> {
                    if(!running||peer.slot==GHOST_SEAT||p.size()!=3)throw new IllegalArgumentException("hunter identification required");
                    GhostIdentity.Type guess=GhostIdentity.Type.valueOf(p.get(1));
                    acceptHunterSequence(peer,LanProtocol.sequence(p.get(2)));
                    LanCase.Report result=mission.identify(peer.slot,guess,tick);
                    answerHunter(peer,"IDENTIFY",result);
                    if(result.accepted())notifyHunters("IDENTIFIED|"+guess+"|"+guess.rite());
                    broadcastProgress();
                }
                case "WARD", "CLEANSE", "BANISH", "ABSOLVE", "EXTRACT" -> {
                    if(!running||peer.slot==GHOST_SEAT||p.size()!=2)throw new IllegalArgumentException("hunter action unavailable");
                    acceptHunterSequence(peer,LanProtocol.sequence(p.get(1)));
                    int here=hunterRooms[peer.slot];
                    LanCase.Report result=switch(p.get(0)){
                        case "WARD" -> mission.ward(peer.slot,here);
                        case "CLEANSE", "BANISH", "ABSOLVE" -> {
                            GhostIdentity.Rite rite=switch(p.get(0)){
                                case "CLEANSE"->GhostIdentity.Rite.CLEANSING;
                                case "BANISH"->GhostIdentity.Rite.BANISHMENT;
                                default->GhostIdentity.Rite.ABSOLUTION;
                            };
                            boolean near=!peer.worldMode||RitualSites.site(map,rite).near(world.body(peer.slot));
                            yield mission.performRite(peer.slot,rite,here,near);
                        }
                        case "EXTRACT" -> mission.extract(peer.slot,here);
                        default -> throw new AssertionError();
                    };
                    answerHunter(peer,p.get(0),result);
                    if(result.accepted()&&!p.get(0).equals("EXTRACT"))recordSound(peer.slot,LanGhostPursuit.Sound.RITUAL);
                    if(result.accepted()&&(p.get(0).equals("CLEANSE")||p.get(0).equals("BANISH")||p.get(0).equals("ABSOLVE")))
                        notifyHunters("RITUAL|STARTED|"+mission.activeRite());
                    broadcastProgress();finishIfComplete();
                }
                case "GHOST" -> {
                    if(!running||peer.slot!=GHOST_SEAT||p.size()!=4)throw new IllegalArgumentException("ghost seat required");
                    GhostDomain.Action action=GhostDomain.Action.valueOf(p.get(1));
                    int room=LanProtocol.integer(p.get(2),0,HouseMap.ROOM_COUNT-1);
                    long seq=LanProtocol.sequence(p.get(3));
                    // Consume the input sequence even for out-of-reach attacks, preventing late replays.
                    if(seq<=peer.lastGhostActionSequence)throw new IllegalArgumentException("stale ghost action sequence");
                    peer.lastGhostActionSequence=seq;
                    // Spatial reach is checked by the host BEFORE consuming the ability's energy.
                    if(action==GhostDomain.Action.STRIKE && ghost.observe().legalActions().contains(action)
                            && !LanSpatialCombat.any(strikeVictims()))
                        throw new IllegalArgumentException("no hunter within striking reach");
                    int from=ghost.room();
                    GhostDomain.Resolution result=ghost.dispatch(new GhostDomain.Command(action,room,++hostGhostActionSequence,GhostDomain.Source.HUMAN));
                    if(!result.applied())throw new IllegalArgumentException(result.reason());
                    reply(peer,"ACCEPT|GHOST|"+action+"|"+result.energy());
                    ghostPose.syncRoom(ghost.room());
                    onGhostTravel(from,ghost.room());
                    resolveGhostAction(result);
                    if(peer.ghostWorldMode)reply(peer,ghostPose.frame(tick));
                    broadcastState();broadcastApparitions();broadcastProgress();finishIfComplete();
                }
                default -> throw new IllegalArgumentException("unknown command");
            }
        }catch(IllegalArgumentException ex){reply(peer,"REJECT|"+safeReason(ex.getMessage()));}
    }
    private void acceptGhostPoseSequence(Peer peer,long sequence){
        if(sequence<=peer.lastGhostPoseSequence)throw new IllegalArgumentException("stale spectral command sequence");
        peer.lastGhostPoseSequence=sequence;
    }
    /** Keep anti-replay sequences consumed before rejecting incapacitated movement.
     * Look/viewport operations remain available as inert first-person spectating.
     */
    private void ensureActiveHunter(Peer peer){
        if(peer.slot>=HUNTERS||!mission.alive(peer.slot))
            throw new IllegalArgumentException("hunter incapacitated");
    }
    private void acceptHunterSequence(Peer peer,long sequence){
        if(sequence<=hunterSequences[peer.slot])throw new IllegalArgumentException("stale hunter command sequence");
        hunterSequences[peer.slot]=sequence;
    }
    private static void answerHunter(Peer peer,String action,LanCase.Report result){
        reply(peer,(result.accepted()?"ACCEPT":"REJECT")+"|"+action+"|"+result.message());
    }
    /** Only accepted hunter actions create sounds. Both controller paths use the
     * same host door graph; a human gets a bounded bearing, never exact positions.
     */
    /** Authenticated, rate-limited UDP input; every recipient is chosen using live host state. */
    private void routeVoice(int seat,LanVoicePacket.Frame frame){
        synchronized(mutex){
            if(closed||!running||seat<0||seat>=HUNTERS
                ||seats[seat]==null||!seats[seat].worldMode||!mission.alive(seat))return;
            LanWorld.Body speaker=world.body(seat);
            for(int i=0;i<HUNTERS;i++){
                Peer listener=seats[i];
                if(i==seat||listener==null||!listener.worldMode)continue;
                if(frame.channel()==LanChat.Channel.RADIO ||
                    LanChat.localVisible(map,speaker,world.body(i))){
                    double distance=Math.hypot(speaker.x()-world.body(i).x(),
                                               speaker.z()-world.body(i).z());
                    int gain=frame.channel()==LanChat.Channel.RADIO?85:
                        Math.max(18,100-(int)(distance*8));
                    if(frame.channel()==LanChat.Channel.LOCAL &&speaker.room()!=world.body(i).room())
                        gain=Math.max(15,gain-20);
                    voice.forward(i,seat,frame,gain);
                }
            }
            // The ghost hears a nearby physical voice, including somebody speaking
            // into a radio. The ghost cannot listen to the RADIO broadcast itself.
            if(speaker.room()>=0&&speaker.room()<HouseMap.EXTRACTION_ROOM){
                int attenuation=LanAcoustics.cost(map,ghost.room(),speaker.room());
                double range=Math.hypot(speaker.x()-ghostPose.pose().x(),
                                        speaker.z()-ghostPose.pose().z());
                if(attenuation<=3&&range<=9){
                    Peer spectral=seats[GHOST_SEAT];
                    if(spectral!=null&&spectral.ghostWorldMode)
                        voice.forward(GHOST_SEAT,seat,frame,
                            Math.max(12,70-attenuation*13-(int)(range*4)));
                }
            }
            // One coarse ghost clue per second, not fifty high-resolution positions.
            if(tick-lastVoiceCueTick[seat]>=10){
                lastVoiceCueTick[seat]=tick;
                recordSound(seat,LanGhostPursuit.Sound.VOICE);
            }
        }
    }
    private void recordSound(int seat,LanGhostPursuit.Sound type){
        LanWorld.Body body=world.body(seat);
        if(LanAcoustics.audible(map,ghost.room(),hunterRooms[seat],type))lastGhostSoundTick=tick;
        if(seats[GHOST_SEAT]==null){
            ai.heard(ghost.room(),hunterRooms[seat],body.x(),body.z(),type,tick);
        }else if(seats[GHOST_SEAT].ghostWorldMode){
            LanGhostHearing.Event cue=LanGhostHearing.project(map,ghostPose.pose(),
                    hunterRooms[seat],body.x(),body.z(),type,tick);
            if(cue!=null&&(type!=LanGhostPursuit.Sound.FOOTSTEP
                    ||tick-lastGhostFootstepCueTick[seat]>=4)){
                reply(seats[GHOST_SEAT],cue.frame());
                if(type==LanGhostPursuit.Sound.FOOTSTEP)lastGhostFootstepCueTick[seat]=tick;
            }
        }
    }
    private boolean insideVan(int seat){
        LanWorld.Body body=world.body(seat);
        VanStaging.Position p=map.van().local(body.x(),body.z());
        return body.room()==HouseMap.EXTRACTION_ROOM&&
            Math.abs(p.x())<VanStaging.HALF_WIDTH-.2&&
            p.z()>=VanStaging.FRONT&&p.z()<VanStaging.REAR-.2;
    }
    private void sendCounterAmmo(Peer peer){
        reply(peer,"COUNTERAMMO|"+counters.charges(peer.slot,HunterCounters.Kind.CROSS)+"|"
            +counters.charges(peer.slot,HunterCounters.Kind.WARD)+"|"
            +counters.charges(peer.slot,HunterCounters.Kind.SALT));
    }
    private void broadcastCounters(){
        notifyHunters("COUNTER|RESET");
        for(HunterCounters.Marker marker:counters.snapshot(tick))notifyHunters(marker.frame());
    }
    /** Every successful room transition uses an actual door or produces a wall-phase trace. */
    private void onGhostTravel(int from,int to){
        if(from==to)return;
        GhostTraits.Profile trait=GhostTraits.of(ghostType);
        if(trait.passage()==GhostTraits.Passage.DOORS && map.openDoorBetweenRooms(from,to))
            broadcastWorld();
        if(trait.leavesUv()){counters.leaveUv(from,tick);counters.leaveUv(to,tick);}
        String detail=trait.canPhase()?"WALL PASSAGE":"DOOR ACTIVITY";
        for(int i=0;i<HUNTERS;i++)if(seats[i]!=null&&(hunterRooms[i]==from||hunterRooms[i]==to))
            reply(seats[i],"FIELD|"+detail);
    }
    private void notifyHunters(String event){for(int i=0;i<HUNTERS;i++)if(seats[i]!=null)reply(seats[i],event);}
    private void broadcastProgress(){for(int i=0;i<HUNTERS;i++)if(seats[i]!=null)reply(seats[i],mission.privateState(i));}
    private boolean[] strikeVictims(){
        boolean[] connected=new boolean[HUNTERS],spatial=new boolean[HUNTERS];
        for(int i=0;i<HUNTERS;i++)if(seats[i]!=null&&mission.alive(i)){
            connected[i]=true;spatial[i]=seats[i].worldMode;
        }
        return LanSpatialCombat.victims(map,world,ghostPose.pose(),hunterRooms,connected,spatial);
    }
    /** Hunter-only positional acoustic projection; never a ghost pose or private team feed. */
    private void broadcastGhostSound(LanSound.Cue cue){
        LanGhostSpatial.Pose pose=ghostPose.pose();
        for(int i=0;i<HUNTERS;i++){
            if(seats[i]==null||!seats[i].worldMode)continue;
            LanSound.CueEvent sound=LanSound.project(map,world.body(i),pose.room(),pose.x(),pose.z(),cue,tick);
            if(sound!=null)reply(seats[i],sound.frame());
        }
    }
    private void distributeEffect(GhostDomain.Resolution result){
        distributeEffect(result,result.action()==GhostDomain.Action.STRIKE?strikeVictims():new boolean[]{true,true,true});
    }
    private void distributeEffect(GhostDomain.Resolution result,boolean[] affected){
        if(!result.applied())return;
        boolean[] wasAlive=new boolean[HUNTERS];
        for(int i=0;i<HUNTERS;i++)wasAlive[i]=seats[i]!=null&&mission.alive(i);
        mission.applyGhostEffect(result.room(),hunterRooms,result,affected);
        if(result.fear()>0||result.harm()>0)
            for(int i=0;i<HUNTERS;i++)if(wasAlive[i]&&affected[i]&&hunterRooms[i]==result.room())
                reply(seats[i],"EFFECT|"+result.action()+"|"+result.fear()+"|"+result.harm());
        // Announce only actual living-to-downed transitions to the hunter team.
        // Human ghosts never receive health, incapacitation or team-state telemetry.
        for(int i=0;i<HUNTERS;i++)if(wasAlive[i]&&!mission.alive(i))
            notifyHunters("HUNTER|DOWN|"+i);
    }
    /** AI and human origins both enter this exact damage/telegraph pipeline. */
    private void resolveGhostAction(GhostDomain.Resolution result){
        if(!result.applied())return;
        if(result.action()==GhostDomain.Action.MANIFEST)animation.manifested(tick);
        if(result.action()==GhostDomain.Action.SIGNATURE)
            for(int i=0;i<HUNTERS;i++)if(seats[i]!=null&&hunterRooms[i]==result.room())
                reply(seats[i],"TELL|"+GhostTraits.of(ghostType).clue());
        GhostBehavior.Profile behavior=GhostBehavior.profile(ghostType);
        if(result.action()==behavior.favored())
            for(int i=0;i<HUNTERS;i++)if(seats[i]!=null&&mission.alive(i)
                    &&Math.abs(hunterRooms[i]/HouseMap.COLS-result.room()/HouseMap.COLS)
                      +Math.abs(hunterRooms[i]%HouseMap.COLS-result.room()%HouseMap.COLS)<=1)
                reply(seats[i],"TELL|"+behavior.tell());
        LanSound.Cue cue=switch(result.action()){
            case WHISPER->LanSound.Cue.WHISPER;
            case DISTURB->LanSound.Cue.DISTURB;
            case MANIFEST->LanSound.Cue.MANIFEST;
            case STRIKE->LanSound.Cue.STRIKE;
            case SIGNATURE->LanSound.Cue.MANIFEST;
            default->null;
        };
        if(cue!=null)broadcastGhostSound(cue);
        if(result.action()!=GhostDomain.Action.STRIKE){distributeEffect(result);return;}
        boolean[] acquired=strikeVictims(),immediate=new boolean[HUNTERS];
        int target=-1;
        for(int i=0;i<HUNTERS;i++)if(acquired[i]){
            if(seats[i]!=null&&seats[i].worldMode)target=i;
            else immediate[i]=true; // Preserve room-only clients' existing hit semantics.
        }
        if(LanSpatialCombat.any(immediate))distributeEffect(result,immediate);
        if(target>=0){
            pendingStrike=LanTelegraphedStrike.begin(tick,target,result);
            animation.windup(tick);
            for(int i=0;i<HUNTERS;i++)if(seats[i]!=null&&hunterRooms[i]==result.room())
                reply(seats[i],"THREAT|START|"+LanTelegraphedStrike.WINDUP_TICKS+"|"+target);
        }
    }
    private void resolvePendingStrike(){
        LanTelegraphedStrike.Pending pending=pendingStrike;
        if(pending==null||!pending.due(tick))return;
        pendingStrike=null;
        animation.impact(tick);
        boolean[] connected=new boolean[HUNTERS],spatial=new boolean[HUNTERS];
        for(int i=0;i<HUNTERS;i++)if(seats[i]!=null&&mission.alive(i)){
            connected[i]=true;spatial[i]=seats[i].worldMode;
        }
        int near=0;
        for(int i=0;i<HUNTERS;i++)if(seats[i]!=null&&mission.alive(i)&&hunterRooms[i]==pending.room())near++;
        boolean soloAllowed=!GhostTraits.of(ghostType).huntsSolitary()||near==1;
        boolean hit=soloAllowed&&pending.hits(map,world,ghostPose.pose(),hunterRooms,connected,spatial)
            &&!counters.wardsAt(world.body(pending.targetSeat()).x(),
                               world.body(pending.targetSeat()).z(),tick);
        if(hit){
            boolean[] one=new boolean[HUNTERS];one[pending.targetSeat()]=true;
            distributeEffect(pending.effect(),one);
        }
        for(int i=0;i<HUNTERS;i++)if(seats[i]!=null&&hunterRooms[i]==pending.room())
            reply(seats[i],"THREAT|"+(hit?"HIT":"EVADED")+"|"+pending.targetSeat());
    }
    private void finishIfComplete(){
        if(mission.outcome()==LanCase.Outcome.ACTIVE)return;
        running=false;
        notifyAllPeers("RESULT|"+mission.outcome());
        broadcastProgress();
    }
    private static String safeReason(String s){return s==null?"invalid command":s.replaceAll("[^A-Za-z0-9 ._-]","").substring(0,Math.min(85,s.replaceAll("[^A-Za-z0-9 ._-]","").length()));}
    private void tickSafely(){if(closed)return; synchronized(mutex){
        if(!running)return;
        try{tick++;
            int audible=-1,occupants=0;
            for(int i=0;i<HUNTERS;i++)if(seats[i]!=null&&mission.alive(i)
                    &&hunterRooms[i]==ghost.room()){audible=hunterRooms[i];occupants++;}
            ghost.advance(tick,audible,occupants);
            if(tick%12==0)monitor.sample(tick,ghost.energy());
            int drain=GhostTraits.passiveFear(ghostType,tick,occupants);
            if(drain>0)for(int i=0;i<HUNTERS;i++)if(seats[i]!=null&&hunterRooms[i]==ghost.room()
                    &&mission.drainSanity(i,drain))reply(seats[i],"FEED|SANITY DRAIN");
            HunterCounters.Impact impact=counters.advance(map,ghostType,ghost,ghostPose.pose(),tick);
            if(impact.saltTrack()){
                ghostPose.slowFor(tick,28);
                for(int i=0;i<HUNTERS;i++)if(seats[i]!=null&&hunterRooms[i]==ghost.room())
                    reply(seats[i],"FIELD|SALT TRACKS AND SLOWED ENTITY");
                broadcastApparitions();
            }
            if(impact.repelled()){
                if(pendingStrike!=null){
                    int target=pendingStrike.targetSeat();pendingStrike=null;animation.impact(tick);
                    notifyHunters("THREAT|EVADED|"+target);
                }
                notifyHunters("FIELD|CROSS REPELLED THE ENTITY");
                broadcastApparitions();
            }
            if(seats[GHOST_SEAT]==null){GhostDomain.Observation seen=ghost.observe();
                LanGhostPursuit.Impulse impulse=ai.approach(seen,ghostPose.pose());
                if(impulse!=null){try{ghostPose.step(impulse.dx(),impulse.dz(),tick);broadcastApparitions();
                    if(ghost.manifested()&&tick%5==0)broadcastGhostSound(LanSound.Cue.FOOTFALL);}
                    catch(IllegalArgumentException blocked){ /* Same physical rejection as a human ghost. */ }}
                GhostDomain.Command choice=ai.decide(seen,LanSpatialCombat.any(strikeVictims()));if(choice!=null){
                // AI and human strikes use the same host-owned spatial reach gate.
                if(choice.action()!=GhostDomain.Action.STRIKE||LanSpatialCombat.any(strikeVictims())){
                    // The incoming AI sequence belongs to its controller only. The host's
                    // single monotonic domain sequence survives human/AI controller swaps.
                    GhostDomain.Command authorized=new GhostDomain.Command(choice.action(),
                            choice.targetRoom(),++hostGhostActionSequence,GhostDomain.Source.AI);
                    GhostDomain.Resolution result=ghost.dispatch(authorized);
                    if(result.applied()){
                        int from=ghostPose.pose().room();
                        ghostPose.syncRoom(ghost.room());
                        onGhostTravel(from,ghost.room());
                        resolveGhostAction(result);broadcastApparitions();
                    }
                }
            }}
            resolvePendingStrike();
            LanCase.RitualAdvance ritual=mission.advance(hunterRooms);
            if(ritual==LanCase.RitualAdvance.PAUSED
                    ||ritual==LanCase.RitualAdvance.RESUMED
                    ||ritual==LanCase.RitualAdvance.BROKEN){
                notifyHunters("RITUAL|"+ritual);
                broadcastProgress();
            }
            if(animation.animating(tick)||pendingStrike!=null)broadcastApparitions();
            if(tick%2==0)broadcastCounters();
            if(tick%5==0){broadcastState();broadcastApparitions();broadcastProgress();broadcastWorld();
                if(seats[GHOST_SEAT]!=null&&seats[GHOST_SEAT].ghostWorldMode)reply(seats[GHOST_SEAT],ghostPose.frame(tick));}
            finishIfComplete();
        }catch(RuntimeException ex){running=false;notifyAllPeers("INFO|host simulation stopped");System.err.println("LAN tick failure: "+ex.getMessage());}
    }}
    /** Every 3D investigator receives only their own host-validated line-of-sight projection.
     * An explicit HIDDEN packet also clears stale manifestations after a move or expiry.
     * This is never sent to the ghost seat or used for ghost AI decisions.
     */
    private void broadcastApparitions(){
        LanGhostSpatial.Pose pose=ghostPose.pose();
        for(int i=0;i<HUNTERS;i++){
            Peer hunter=seats[i];
            if(hunter!=null && hunter.worldMode) {
                GhostTraits.Sight form=GhostTraits.of(ghostType).sight();
                String sight=LanApparition.frame(map,world.body(i),true,pose,
                    ghost.manifested()&&form!=GhostTraits.Sight.CAMERA_ONLY,tick);
                if(sight.startsWith("APPARITION|VISIBLE|"))
                    reply(hunter,"FORM|"+(form==GhostTraits.Sight.ORBS?"ORBS":"FIGURE"));
                reply(hunter,sight);
                if(sight.startsWith("APPARITION|VISIBLE|")) {
                    LanGhostAnimation.Motion motion=animation.project(true,pendingStrike!=null,pose.heading(),tick);
                    reply(hunter,motion.frame()); // No private coordinates, only already-disclosed sight.
                }
            }
        }
    }

    /** Visible body positions go only to hunter peers; no omniscient team feed for ghosts. */
    private void broadcastWorld(){
        String doors="DOORS|"+map.doorSnapshot();
        notifyHunters(doors);
        for(int i=0;i<HUNTERS;i++)if(seats[i]!=null)notifyHunters(world.bodyFrame(i,tick));
    }
    private void broadcastState(){
        GhostDomain.Observation o=ghost.observe();
        StringBuilder team=new StringBuilder("TEAMMAP");
        for(int i=0;i<HUNTERS;i++)team.append('|').append(seats[i]==null?-1:hunterRooms[i]);
        notifyHunters(team.toString());
        for(int i=0;i<seats.length;i++){
            Peer peer=seats[i];if(peer==null)continue;
            boolean isGhost=i==GHOST_SEAT;
            int myRoom=isGhost?o.room():hunterRooms[i];
            int visible=isGhost?-1:(o.manifested()&&myRoom==o.room()?o.room():-1);
            reply(peer,"STATE|"+tick+"|"+myRoom+"|"+visible+"|"+(isGhost?o.energy():-1)+"|"+(isGhost?o.legalActions().toString().replace(" ",""):("role:"+peer.slot))+"|"+(isGhost&&tick-lastGhostSoundTick<12?1:0));
        }
    }
    private void broadcastLobby(){
        int hunters=0,ready=0;for(int i=0;i<seats.length;i++)if(seats[i]!=null){if(i<HUNTERS)hunters++;if(seats[i].ready)ready++;}
        notifyAllPeers("LOBBY|"+hunters+"|"+(seats[GHOST_SEAT]==null?"AI":"HUMAN")+"|"+ready+"|"+(running?"RUNNING":"WAITING"));
        // Everyone may see a cosmetic selection. It does not encode the actual ghost species.
        notifyAllPeers(ghostLobbyLook==null?"LOBBYAVATAR|NONE":ghostLobbyLook.frame());
    }
    private void notifyAllPeers(String event){for(Peer peer:seats)if(peer!=null)reply(peer,event);}
    private static void reply(Peer peer,String event){try{LanProtocol.write(peer.output,event);}catch(IOException ex){try{peer.socket.close();}catch(IOException ignored){}}}
    @Override public void close(){closed=true;voice.close();try{listener.close();}catch(IOException ignored){}
        synchronized(mutex){for(Peer peer:seats)if(peer!=null){try{peer.socket.close();}catch(IOException ignored){}}}
        clock.shutdownNow();workers.shutdownNow();
    }
    private static final class Peer{
        final Socket socket;final Reader input;final Writer output;final int slot;final String name;boolean ready,worldMode,ghostWorldMode;
        long lastGhostPoseSequence=-1,lastGhostActionSequence=-1;
        int lastMonitorTick=-100000,lastChatTick=-100000;
        long lastLobbyChatNanos;
        Peer(Socket s,Reader in,Writer out,int slot,String name){socket=s;input=in;output=out;this.slot=slot;this.name=name;}
    }
}
