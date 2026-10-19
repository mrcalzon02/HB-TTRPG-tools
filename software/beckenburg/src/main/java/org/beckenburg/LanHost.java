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
    private final Reservation[] reserved=new Reservation[HUNTERS+1];
    private static final java.security.SecureRandom RESUME_RANDOM=new java.security.SecureRandom();
    private int reconnectGraceSeconds=120;
    private String lobbyPassword="";
    private boolean lobbyLocked;
    private final int[] hunterRooms=new int[HUNTERS];
    private final long[] hunterSequences=new long[HUNTERS];
    private final HouseMap map=new HouseMap();
    private final RoomLighting lights=new RoomLighting();
    private final AmbientSanity ambientSanity=new AmbientSanity();
    private final LanWorld world=new LanWorld(map);
    private final LanGhostSpatial ghostPose=new LanGhostSpatial(map,4);
    private final GhostDomain ghost;
    private final GhostActionCadence actionCadence;
    private final LanCase mission;
    private final LanEvidenceJournal casefile=new LanEvidenceJournal();
    private final GhostWriting writingBook=new GhostWriting();
    private final LanDotsProjectors dots=new LanDotsProjectors();
    private final LanVideoCameras cameras=new LanVideoCameras();
    private final FieldJournal fieldNotes=new FieldJournal();
    // Radio history is bounded and investigator-only. Local speech has no global replay.
    private final java.util.ArrayDeque<LanChat.Entry> radioHistory=new java.util.ArrayDeque<>();
    private final LanGhostPursuit ai;
    private final GhostIdentity.Type ghostType;
    private final boolean ghostMayStart;
    private final int ownerSeat;
    private final String ownerJoinSecret;
    private LobbyGhostAvatar.Look ghostLobbyLook;
    private final LanGhostAnimation animation=new LanGhostAnimation();
    private final HunterCounters counters=new HunterCounters();
    private final CustomContract contract;
    private final MissionWeather weather;
    private final VanTelemetry monitor=new VanTelemetry(20261017L);
    private final FieldSupplies[] supplies=new FieldSupplies[HUNTERS];
    private final FieldEquipment[] equipment=new FieldEquipment[HUNTERS];
    private final FieldSoundRecorder[] recorders=new FieldSoundRecorder[HUNTERS];
    private final int[] lastRecordingPlayback={-10000,-10000,-10000,-10000,-10000,-10000};
    private final int[] lastHunterSound={-10000,-10000,-10000,-10000,-10000,-10000};
    private volatile boolean closed;
    private boolean running,everStarted;
    private long hostGhostActionSequence=-1;
    private int tick;
    private int lastGhostSoundTick=-10000;
    /** Recent authorized spectral events provide genuine transient EMF peaks. */
    private int lastEvidenceEventTick=-10000,lastEvidenceEventRoom=-1,lastEvidenceEventPower;
    private GhostDomain.Action lastEvidenceEventAction=GhostDomain.Action.DRIFT;
    private final int[] lastGhostFootstepCueTick=new int[HUNTERS];
    private final int[] lastVoiceCueTick=new int[HUNTERS];
    private LanTelegraphedStrike.Pending pendingStrike;
    private final GhostFrenzy frenzy;
    private int lastHumanFrenzyAttackTick=-10000;
    private int lastHorrorStingTick=-10000;
    private final int[] lastSealedDoorRattleTick={-10000,-10000,-10000,-10000,-10000,-10000};
    private final String bindAddress;

    public LanHost(String ip,int port)throws IOException{
        this(ip,port,GhostIdentity.Type.SPIRIT,false,CustomContract.standard(3),false,false);
    }
    /** Legacy three-hunter host is retained for existing integration tests. */
    public LanHost(String ip,int port,GhostIdentity.Type type)throws IOException{
        this(ip,port,type,true,CustomContract.standard(3),false,false);
    }
    public LanHost(String ip,int port,GhostIdentity.Type type,CustomContract config)throws IOException{
        this(ip,port,type,true,config,false,false);
    }
    /** Hosting as a ghost is possible only when the local host explicitly selected it. */
    public LanHost(String ip,int port,GhostIdentity.Type type,CustomContract config,
            boolean hostAsGhost)throws IOException{
        this(ip,port,type,true,config,hostAsGhost,false);
    }
    /** Production local host: reserve its actual player seat before accepting guests. */
    public LanHost(String ip,int port,GhostIdentity.Type type,CustomContract config,
            boolean hostAsGhost,boolean secureLocalOwner)throws IOException {
        this(ip,port,type,true,config,hostAsGhost,secureLocalOwner);
    }
    private LanHost(String ip,int port,GhostIdentity.Type type,boolean identityMode,
            CustomContract config,boolean hostAsGhost,boolean secureLocalOwner)throws IOException {
        if(port<0||port>65535)throw new IllegalArgumentException("invalid port");
        ghostType=Objects.requireNonNull(type);
        contract=Objects.requireNonNull(config);
        ghostMayStart=hostAsGhost;
        // Legacy host constructors preserve H1 ownership; production GUI hosts
        // explicitly claim their selected H1 or ghost role with a local secret.
        ownerSeat=secureLocalOwner&&hostAsGhost?GHOST_SEAT:0;
        ownerJoinSecret=secureLocalOwner?newResumeToken():null;
        Arrays.fill(hunterRooms,HouseMap.EXTRACTION_ROOM);
        Arrays.fill(hunterSequences,-1);
        Arrays.fill(lastGhostFootstepCueTick,-10000);
        Arrays.fill(lastVoiceCueTick,-10000);
        for(int i=0;i<HUNTERS;i++){
            supplies[i]=new FieldSupplies();
            equipment[i]=new FieldEquipment();
            recorders[i]=new FieldSoundRecorder();
        }
        world.configure(contract);
        ghostPose.configureSpeed(contract.ghostSpeed());
        ghostPose.configureBurst(ghostType,contract.ghostSprintSeconds());
        ghost=new GhostDomain(map,4,type);
        frenzy=new GhostFrenzy(type);
        actionCadence=new GhostActionCadence(type);
        mission=new LanCase(4);
        mission.configureHunters(contract.hunters());
        mission.configurePartyThreat(contract.partyDifficulty());
        mission.setStartingSanity(contract.startingSanity());
        mission.configureSanityDrain(contract.sanityDrain());
        ghost.configureRecovery(contract.energyRecovery());
        if(identityMode)mission.configure(type,true);
        // One host-owned climate snapshot per session: all rooms share the season
        // and weather while their indoor heating and local anomalies still vary.
        java.time.LocalDateTime climateClock=java.time.LocalDateTime.now();
        EvidenceSignals.Season season=switch(climateClock.getMonthValue()){
            case 12,1,2->EvidenceSignals.Season.WINTER;
            case 3,4,5->EvidenceSignals.Season.SPRING;
            case 6,7,8->EvidenceSignals.Season.SUMMER;
            default->EvidenceSignals.Season.AUTUMN;
        };
        // Contract-selected host weather: fixed, evolving or random-at-start.
        weather=new MissionWeather(season,contract.weatherMode(),contract.fixedWeather(),
            contract.weatherIntensity(),java.util.concurrent.ThreadLocalRandom.current().nextLong());
        mission.configureEvidenceClimate(season,weather.state().weather(),
            climateClock.getHour(),true,GhostEvidenceProfile.thermal(ghostType));
        mission.updateEvidenceWeather(weather.state().weather(),weather.state().intensity());
        ai=new LanGhostPursuit(map,20261016L,type);
        ai.configureFrequency(contract.eventFrequency());
        bindAddress=Objects.requireNonNull(ip);
        listener=new ServerSocket();listener.setReuseAddress(true);
        listener.bind(new InetSocketAddress(InetAddress.getByName(ip),port),8);
        // TCP and UDP use distinct transport namespaces. Binding voice to the TCP
        // ephemeral port can collide with an unrelated occupied Windows UDP port.
        // Bind UDP port zero and advertise its real allocation in VOICEKEY.
        try{voice=new LanVoiceRelay(listener.getInetAddress(),0,this::routeVoice);}
        catch(SocketException failure){listener.close();throw failure;}
        workers.execute(this::acceptLoop);
        clock.scheduleAtFixedRate(this::tickSafely,100,100,TimeUnit.MILLISECONDS);
    }
    /** Returned only to the in-process launcher, never in a lobby broadcast. */
    public String localOwnerCredential(){
        if(ownerJoinSecret==null)throw new IllegalStateException("local owner claim not enabled");
        return ownerJoinSecret;
    }
    public int port(){return listener.getLocalPort();}
    public int voicePort(){return voice.port();}
    public String bindAddress(){return bindAddress;}
    public boolean running(){synchronized(mutex){return running;}}
    public int connected(){synchronized(mutex){int count=0;for(Peer peer:seats)if(peer!=null)count++;return count;}}
    public int reservedSeats(){synchronized(mutex){int count=0;for(Reservation r:reserved)if(r!=null)count++;return count;}}
    public void setReconnectGraceSeconds(int seconds){
        if(seconds<1||seconds>300)throw new IllegalArgumentException("grace must be 1..300 seconds");
        synchronized(mutex){if(running||everStarted)throw new IllegalStateException("match already started");
            reconnectGraceSeconds=seconds;}
    }
    /** Host-only local administration. Never expose setter as an unprivileged packet. */
    public void setLobbyPassword(String password){
        if(password==null||password.length()>64||password.indexOf('|')>=0
                ||password.chars().anyMatch(ch->ch<32||ch>126))
            throw new IllegalArgumentException("password must be at most 64 printable ASCII characters");
        synchronized(mutex){
            if(running||everStarted||connected()>0)throw new IllegalStateException("configure password before joining");
            lobbyPassword=password;
        }
    }
    public void setLobbyLocked(boolean locked){synchronized(mutex){lobbyLocked=locked;}}
    public boolean lobbyLocked(){synchronized(mutex){return lobbyLocked;}}
    private static String newResumeToken(){
        byte[] bytes=new byte[24];RESUME_RANDOM.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }
    private static boolean resumeTokenMatches(String expected,String submitted){
        return expected!=null && submitted!=null && submitted.matches("[0-9a-f]{48}")
            && java.security.MessageDigest.isEqual(
                expected.getBytes(java.nio.charset.StandardCharsets.US_ASCII),
                submitted.getBytes(java.nio.charset.StandardCharsets.US_ASCII));
    }
    private static int parseSeat(String label){
        if("GHOST".equals(label))return GHOST_SEAT;
        if(label.matches("H[1-6]"))return Integer.parseInt(label.substring(1))-1;
        return -1;
    }
    private static String seatName(int slot){return slot==GHOST_SEAT?"GHOST":"H"+(slot+1);}
    private long seatSequenceHighWater(Peer peer){
        // Authoritative replay high-water mark survives loss of the client's volatile
        // counters. Recovery must not rely on a potentially stale disk ticket.
        return peer.slot==GHOST_SEAT
            ?Math.max(0,Math.max(peer.lastGhostActionSequence,peer.lastGhostPoseSequence))
            :Math.max(0,hunterSequences[peer.slot]);
    }
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
            boolean fresh=(hello.size()>=4&&hello.size()<=6)&&"JOIN".equals(hello.get(0))&&"1".equals(hello.get(1));
            boolean resume=hello.size()==4&&"RESUME".equals(hello.get(0))&&"1".equals(hello.get(1));
            if(!fresh&&!resume){LanProtocol.write(out,"REJECT|protocol version or handshake");return;}
            synchronized(mutex){
                if(resume){
                    int slot=parseSeat(hello.get(2));
                    Reservation waiting=slot>=0?reserved[slot]:null;
                    if(!running||waiting==null||seats[slot]!=null
                            ||System.nanoTime()-waiting.expiresNanos>=0
                            ||!resumeTokenMatches(waiting.token,hello.get(3))
                                &&!resumeTokenMatches(waiting.previousToken,hello.get(3))){
                        LanProtocol.write(out,"REJECT|reconnect seat expired or unavailable");return;
                    }
                    peer=new Peer(socket,in,out,slot,waiting.name);
                    peer.lastPongTick=tick;
                    peer.lastGhostActionSequence=waiting.lastActionSequence;
                    peer.lastGhostPoseSequence=waiting.lastPoseSequence;
                    // Until the replacement token has been durably saved and
                    // acknowledged, the previous recovery capability remains valid
                    // ONLY for a disconnected reserved seat, never a live controller.
                    peer.previousResumeToken=waiting.previousToken==null
                            ?waiting.token:waiting.previousToken;
                    peer.unconfirmedResumeDeadlineNanos=waiting.expiresNanos;
                    // The old reservation must survive a failed WELCOME write.
                    // Never consume a seat until its new credentials are sent.
                    LanProtocol.write(out,"WELCOME|"+seatName(slot)+"|"+LanProtocol.VERSION+"|"+peer.resumeToken+"|"+seatSequenceHighWater(peer));
                    peer.outbound.start(workers);
                    reserved[slot]=null;seats[slot]=peer;
                    reply(peer,"INFO|mission resumed - reopen 3D view");
                    if(slot!=GHOST_SEAT){
                        for(int i=0;i<HUNTERS;i++)if(i!=slot&&seats[i]!=null)
                            reply(peer,"PLAYERNAME|"+i+"|"+seats[i].name);
                        notifyHunters("PLAYERNAME|"+slot+"|"+peer.name);
                        reply(peer,"PARTY|"+contract.hunters()+"|"+contract.partyDifficulty());
                    }else notifyHunters("INFO|human ghost reconnected - AI released control");
                    broadcastLobby();broadcastState();broadcastProgress();broadcastWorld();
                }else{
                    boolean wantsGhost=switch(hello.get(2)){
                        case "GHOST" -> true;case "HUNTER" -> false;
                        default -> throw new IllegalArgumentException("invalid role");
                    };
                    String nickname=LanProtocol.cleanName(hello.get(3));
                    if(lobbyLocked){LanProtocol.write(out,"REJECT|lobby locked");return;}
                    boolean ownerClaim=hello.size()==6;
                    if(ownerClaim){
                        boolean roleMatches=wantsGhost==(ownerSeat==GHOST_SEAT);
                        String attempt=hello.get(5);
                        if(ownerJoinSecret==null||!roleMatches||!socket.getInetAddress().isLoopbackAddress()
                                ||!java.security.MessageDigest.isEqual(
                                    ownerJoinSecret.getBytes(java.nio.charset.StandardCharsets.US_ASCII),
                                    attempt.getBytes(java.nio.charset.StandardCharsets.US_ASCII))){
                            LanProtocol.write(out,"REJECT|unauthorized owner claim");return;
                        }
                    }else if(ownerJoinSecret!=null&&wantsGhost&&(ownerSeat==GHOST_SEAT)){
                        LanProtocol.write(out,"REJECT|host ghost seat reserved");return;
                    }
                    String supplied=hello.size()>=5?hello.get(4):"";
                    if(!java.security.MessageDigest.isEqual(
                            lobbyPassword.getBytes(java.nio.charset.StandardCharsets.US_ASCII),
                            supplied.getBytes(java.nio.charset.StandardCharsets.US_ASCII))){
                        LanProtocol.write(out,"REJECT|incorrect room password");return;
                    }
                    if(running){LanProtocol.write(out,"REJECT|match already running - reconnect needed");return;}
                    int slot=wantsGhost?GHOST_SEAT:firstVacantHunter(ownerClaim);
                    if(slot<0||seats[slot]!=null){LanProtocol.write(out,"REJECT|seat unavailable");return;}
                    peer=new Peer(socket,in,out,slot,nickname);peer.lastPongTick=tick;seats[slot]=peer;
                    if(wantsGhost)ghostLobbyLook=LobbyGhostAvatar.random(
                        java.util.concurrent.ThreadLocalRandom.current());
                    LanProtocol.write(out,"WELCOME|"+seatName(slot)+"|"+LanProtocol.VERSION+"|"+peer.resumeToken+"|"+seatSequenceHighWater(peer));
                    peer.outbound.start(workers);
                    if(slot!=GHOST_SEAT){
                        for(int i=0;i<HUNTERS;i++)if(i!=slot&&seats[i]!=null)
                            reply(peer,"PLAYERNAME|"+i+"|"+seats[i].name);
                        notifyHunters("PLAYERNAME|"+slot+"|"+nickname);
                    }
                    broadcastLobby();
                }
            }
            socket.setSoTimeout(0);
            while(!closed){String frame=LanProtocol.read(in);if(frame==null)break;
                synchronized(mutex){if(closed)break;handle(peer,frame);}
            }
        }catch(Exception e){if(!closed&&peer!=null){synchronized(mutex){reply(peer,"REJECT|connection terminated");}}}
        finally {
            if(peer!=null)peer.outbound.stop();
            if(peer!=null) synchronized(mutex){
                if(seats[peer.slot]==peer){
                    seats[peer.slot]=null;
                    voice.unregister(peer.slot);
                    if(peer.slot==GHOST_SEAT&&(peer.intentionalLeave||!running))ghostLobbyLook=null;
                    if(running){
                        if(!peer.intentionalLeave){
                            // Even the local owner's CLIENT socket can fail while this
                            // authoritative host process stays alive; only an explicit
                            // owner Leave or actual host shutdown ends that match.
                            long expires=System.nanoTime()
                                    +TimeUnit.SECONDS.toNanos(reconnectGraceSeconds);
                            // Failed token rotations cannot renew an old capability's
                            // reservation forever. Acknowledged sessions get a new grace.
                            if(peer.previousResumeToken!=null)
                                expires=Math.min(expires,peer.unconfirmedResumeDeadlineNanos);
                            reserved[peer.slot]=new Reservation(peer,expires);
                            if(peer.slot==GHOST_SEAT){
                                ai.forget();
                                notifyHunters("INFO|human ghost disconnected - AI has taken control");
                            }else{
                                notifyHunters("PEER|LOST|"+peer.slot);
                                notifyHunters("INFO|hunter "+(peer.slot+1)+" disconnected - reconnect reserved");
                            }
                            broadcastState();broadcastWorld();
                        }else if(peer.slot==ownerSeat){
                            // Listen-host ownership follows the player who ACTUALLY hosted,
                            // which can be a human ghost. A guest H1 isn't the owner then.
                            running=false;
                            notifyAllPeers("INFO|match stopped after host departure");
                        }else if(peer.slot==GHOST_SEAT){
                            ai.forget();
                            notifyHunters("INFO|human ghost disconnected - AI has taken control");
                            broadcastState();
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
    private int firstVacantHunter(boolean ownerClaim){
        for(int i=0;i<contract.hunters();i++){
            if(ownerJoinSecret!=null&&!ownerClaim&&i==ownerSeat)continue;
            if(ownerClaim&&i!=ownerSeat)continue;
            if(seats[i]==null&&reserved[i]==null)return i;
        }
        return -1;
    }
    private void expireDisconnectedSeats(){
        long now=System.nanoTime();
        for(int i=0;i<reserved.length;i++){
            Reservation seat=reserved[i];
            if(seat==null||now-seat.expiresNanos<0)continue;
            reserved[i]=null;
            if(i==GHOST_SEAT){ghostLobbyLook=null;broadcastLobby();continue;}
            mission.depart(i);
            notifyHunters("PEER|LEFT|"+i);
            notifyHunters("INFO|hunter "+(i+1)+" reconnect expired - "+mission.remainingHunters()+" investigator(s) remaining");
            broadcastWorld();broadcastProgress();
        }
        finishIfComplete();
    }
    private void handle(Peer peer,String frame){
        List<String> p;
        try{p=LanProtocol.parts(frame);}catch(IllegalArgumentException ex){reply(peer,"REJECT|invalid frame");return;}
        try{
            switch(p.get(0)){
                case "LEAVE" -> {
                    if(p.size()!=1)throw new IllegalArgumentException("invalid departure");
                    peer.intentionalLeave=true;
                    try{peer.socket.close();}catch(IOException ignored){}
                }
                case "PONG" -> {
                    if(p.size()!=2)throw new IllegalArgumentException("invalid heartbeat");
                    int acknowledged=LanProtocol.integer(p.get(1),0,99999999);
                    if(peer.expectedPongTick==acknowledged){
                        peer.expectedPongTick=-1;
                        peer.lastPongTick=tick;
                        long elapsed=System.nanoTime()-peer.pingSentNanos;
                        int latency=(int)Math.min(60000,Math.max(0,
                                TimeUnit.NANOSECONDS.toMillis(elapsed)));
                        reply(peer,"NETSTATS|"+latency);
                    }
                    // A late response to an older ping is not a new authorization.
                }
                case "RESUMEACK" -> {
                    // This message is a post-persistence confirmation, not an
                    // elevation of privileges. It is bound to this socket's seat.
                    if(p.size()!=2||peer.previousResumeToken==null
                            ||!resumeTokenMatches(peer.resumeToken,p.get(1)))
                        throw new IllegalArgumentException("invalid recovery acknowledgement");
                    peer.previousResumeToken=null;
                    peer.unconfirmedResumeDeadlineNanos=0;
                    reply(peer,"ACCEPT|RESUMEACK");
                }
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
                    if(p.size()!=1||(ownerJoinSecret!=null
                            ?peer.slot!=ownerSeat
                            :(peer.slot!=0&&!(ghostMayStart&&peer.slot==GHOST_SEAT))))
                        throw new IllegalArgumentException("only verified hosting player may start");
                    if(running||everStarted)throw new IllegalArgumentException("fresh host required for another match");
                    for(int i=0;i<contract.hunters();i++)
                        if(seats[i]==null||!seats[i].ready)
                            throw new IllegalArgumentException("configured hunter party must be ready");
                    if(seats[GHOST_SEAT]!=null&&!seats[GHOST_SEAT].ready)throw new IllegalArgumentException("ghost must be ready");
                    running=true;everStarted=true;tick=0;
                    notifyAllPeers("INFO|mission started with "+(seats[GHOST_SEAT]==null?"AI":"human")+" ghost");
                    notifyAllPeers(weather.state().packet());
                    if(seats[GHOST_SEAT]!=null)sendGhostPrompt();
                    if(mission.identificationRequired())notifyHunters("SITES|9|6|10");
                    broadcastState();broadcastProgress();broadcastWorld();
                    notifyHunters("PARTY|"+contract.hunters()+"|"+contract.partyDifficulty());
                }
                case "VIEW3D" -> {
                    if(!running||peer.slot==GHOST_SEAT||p.size()!=1)throw new IllegalArgumentException("3D view requires active hunter");
                    peer.worldMode=true;
                    reply(peer,"ACCEPT|VIEW3D");
                    reply(peer,world.staminaFrame(peer.slot,tick));
                    reply(peer,weather.state().packet());
                    // Replay real investigator nicknames to newly opened hunter windows.
                    // Ghost seats cannot enter VIEW3D and are never name recipients.
                    for(int i=0;i<HUNTERS;i++)
                        if(i!=peer.slot&&seats[i]!=null)
                            reply(peer,"PLAYERNAME|"+i+"|"+seats[i].name);
                    broadcastWorld();broadcastApparitions();broadcastCounters();sendCounterAmmo(peer);
                    reply(peer,"CAMERA|RESET");
                    for(LanVideoCameras.Camera station:cameras.all()){
                        reply(peer,station.frame());
                        reply(peer,"CAMERA|POWER|"+station.owner()+"|"+
                            (equipment[station.owner()].powered("VIDEO_CAMERA")?1:0));
                    }
                    reply(peer,"DOTS|RESET");
                    for(LanDotsProjectors.Placement placed:dots.all())reply(peer,placed.frame());
                    if(writingBook.placed())reply(peer,"BOOK|DEPLOYED|"+writingBook.room());
                    reply(peer,supplies[peer.slot].frame());
                    sendEquipmentState(peer);
                    reply(peer,"PARTY|"+contract.hunters()+"|"+contract.partyDifficulty());
                    if(mission.ritualProgress()>=0&&mission.activeRite()!=null)
                        reply(peer,"RITUAL|STARTED|"+mission.activeRite());
                    reply(peer,frenzyFrame());
                    reply(peer,"HIDECONFIG|"+contract.hidingSpots());
                    reply(peer,"LIGHTS|"+lights.snapshot()+"|"+(lights.breaker()?1:0));
                    // Recover only this investigator's current hiding and imminent threat.
                    // Never reset the pending strike's original authoritative impact tick.
                    reply(peer,"HIDING|"+(world.hidden(peer.slot)?1:0));
                    if(pendingStrike!=null && pendingStrike.impactTick()>tick
                            && hunterRooms[peer.slot]==pendingStrike.room())
                        reply(peer,"THREAT|START|"+(pendingStrike.impactTick()-tick)+"|"+pendingStrike.targetSeat());
                    // Re-entering a view (including after socket recovery) must supply
                    // the current personal progression and all authorized case notes.
                    if(mission.identificationRequired())reply(peer,"SITES|9|6|10");
                    reply(peer,mission.privateState(peer.slot));
                    sendCaseFile(peer);
                    reply(peer,"VOICEKEY|"+voice.port()+"|"+voice.register(peer.slot,peer.socket.getInetAddress()));
                    for(LanChat.Entry line:radioHistory)reply(peer,line.frame());
                }
                case "GVIEW3D" -> {
                    if(!running||peer.slot!=GHOST_SEAT||p.size()!=1)throw new IllegalArgumentException("ghost view requires active ghost seat");
                    peer.ghostWorldMode=true;
                    reply(peer,"ACCEPT|GVIEW3D");
                    reply(peer,ghostPose.staminaFrame(tick));
                    reply(peer,weather.state().packet());
                    reply(peer,"VOICEKEY|"+voice.port()+"|"+voice.register(peer.slot,peer.socket.getInetAddress()));
                    reply(peer,"GTYPE|"+ghostType+"|"+ghostType.behavior());
                    reply(peer,ghostPose.frame(tick));reply(peer,frenzyFrame());
                    broadcastState();sendGhostPrompt();
                }
                case "GSTEP" -> {
                    if(!running||peer.slot!=GHOST_SEAT||!peer.ghostWorldMode
                            ||(p.size()!=4&&p.size()!=5))
                        throw new IllegalArgumentException("spectral movement requires ghost view");
                    int dx=LanProtocol.integer(p.get(1),-100,100),dz=LanProtocol.integer(p.get(2),-100,100);
                    boolean bursting=p.size()==5&&LanProtocol.integer(p.get(3),0,1)==1;
                    acceptGhostPoseSequence(peer,LanProtocol.sequence(p.get(p.size()-1)));
                    ghostPose.step(dx,dz,tick,bursting);
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
                    try{
                        world.move(peer.slot,dx,dz,tick,runningFast);
                    }catch(IllegalArgumentException movementBlocked){
                        if("frenzy sealed the van extraction threshold".equals(movementBlocked.getMessage()))
                            sealedDoorRattle(peer);
                        throw movementBlocked;
                    }
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
                case "LIGHT" -> {
                    if(!running||peer.slot==GHOST_SEAT||!peer.worldMode||p.size()!=2)
                        throw new IllegalArgumentException("hunter 3D light interaction required");
                    acceptHunterSequence(peer,LanProtocol.sequence(p.get(1)));
                    ensureActiveHunter(peer);
                    LanWorld.Body body=world.body(peer.slot);
                    int at=lights.aimed(map,body.x(),body.z(),Math.toRadians(body.heading()));
                    if(at<0)throw new IllegalArgumentException("look toward a nearby wall switch");
                    if(tick-peer.lastLightTick<5)throw new IllegalArgumentException("switch cooling down");
                    peer.lastLightTick=tick;
                    boolean on=lights.toggle(at);
                    notifyHunters("LIGHTS|"+lights.snapshot()+"|"+(lights.breaker()?1:0));
                    reply(peer,"ACCEPT|LIGHT|"+at+"|"+(on?"ON":"OFF"));
                    recordSound(peer.slot,LanGhostPursuit.Sound.EQUIPMENT,LanSound.Cue.SWITCH);
                }
                case "POWER" -> {
                    if(!running||peer.slot==GHOST_SEAT||!peer.worldMode||p.size()!=2)
                        throw new IllegalArgumentException("hunter 3D breaker required");
                    acceptHunterSequence(peer,LanProtocol.sequence(p.get(1)));
                    ensureActiveHunter(peer);
                    LanWorld.Body body=world.body(peer.slot);
                    if(body.room()!=11||Math.hypot(body.x()-map.centerX(11),
                        body.z()-map.centerZ(11))>1.5)throw new IllegalArgumentException("breaker out of reach");
                    lights.setBreaker(!lights.breaker());
                    notifyHunters("LIGHTS|"+lights.snapshot()+"|"+(lights.breaker()?1:0));
                    reply(peer,"ACCEPT|POWER|"+(lights.breaker()?"ON":"OFF"));
                    recordSound(peer.slot,LanGhostPursuit.Sound.EQUIPMENT,LanSound.Cue.BREAKER);
                }
                case "VANDOOR" -> {
                    if(!running||peer.slot==GHOST_SEAT||!peer.worldMode||p.size()!=2)
                        throw new IllegalArgumentException("hunter at cargo button required");
                    acceptHunterSequence(peer,LanProtocol.sequence(p.get(1)));
                    ensureActiveHunter(peer);
                    if(tick-peer.lastLightTick<4)
                        throw new IllegalArgumentException("door control cooling down");
                    LanWorld.Body user=world.body(peer.slot);
                    if(!map.van().nearDoorButton(user.x(),user.z()))
                        throw new IllegalArgumentException("van door button out of reach");
                    boolean closed=map.van().toggleCargoDoor();
                    if(closed){
                        boolean blocked=false;
                        for(int i=0;i<HUNTERS;i++)
                            if((seats[i]!=null||reserved[i]!=null)
                                &&!map.traversable(world.body(i).x(),world.body(i).z()))
                                blocked=true;
                        if(blocked){
                            map.van().toggleCargoDoor();
                            throw new IllegalArgumentException("van doorway occupied");
                        }
                    }
                    peer.lastLightTick=tick;
                    notifyHunters("VANDOOR|"+(closed?1:0));
                    reply(peer,"ACCEPT|VANDOOR|"+(closed?"CLOSED":"OPEN"));
                    recordSound(peer.slot,LanGhostPursuit.Sound.EQUIPMENT,LanSound.Cue.VAN_DOOR);
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
                    if(frenzy.sealed()&&target==HouseMap.EXTRACTION_ROOM
                            &&at!=HouseMap.EXTRACTION_ROOM){
                        sealedDoorRattle(peer);
                        throw new IllegalArgumentException("frenzy sealed the extraction threshold");
                    }
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
                case "GEARSTATE" -> {
                    if(!running||peer.slot==GHOST_SEAT||p.size()!=1)
                        throw new IllegalArgumentException("hunter rack state only");
                    sendEquipmentState(peer);
                }
                case "GEARREFILL" -> {
                    if(!running||peer.slot==GHOST_SEAT||!peer.worldMode||p.size()!=2)
                        throw new IllegalArgumentException("hunter equipment service only");
                    acceptHunterSequence(peer,LanProtocol.sequence(p.get(1)));
                    ensureActiveHunter(peer);
                    if(map.van().stationAt(world.body(peer.slot).x(),world.body(peer.slot).z())
                            !=VanStaging.Station.EQUIPMENT)
                        throw new IllegalArgumentException("recharge at the actual van equipment rack");
                    if(cameras.at(peer.slot)!=null)
                        throw new IllegalArgumentException("retrieve deployed camera before recharging");
                    if(recorders[peer.slot].recording())stopRecording(peer.slot);
                    equipment[peer.slot].rechargeAtVan();
                    reply(peer,"ACCEPT|GEARREFILL|FILM AND BATTERIES RESTORED");
                    actorCue(peer.slot,LanSound.Cue.DEVICE_ON);
                    sendEquipmentState(peer);
                }
                case "GEARBUY" -> {
                    if(!running||peer.slot==GHOST_SEAT||!peer.worldMode||p.size()!=4)
                        throw new IllegalArgumentException("hunter equipment purchase only");
                    String id=p.get(1);
                    EquipmentTiers.Tier tier=EquipmentTiers.Tier.valueOf(p.get(2));
                    acceptHunterSequence(peer,LanProtocol.sequence(p.get(3)));
                    ensureActiveHunter(peer);
                    if(map.van().stationAt(world.body(peer.slot).x(),world.body(peer.slot).z())
                            !=VanStaging.Station.EQUIPMENT)
                        throw new IllegalArgumentException("purchase upgrades at the equipment rack");
                    if(id.equals("SOUND_RECORDER")&&recorders[peer.slot].recording())
                        throw new IllegalArgumentException("stop recording before upgrading hardware");
                    int cost=equipment[peer.slot].upgradePrice(id,tier);
                    if(!supplies[peer.slot].spend(cost))
                        throw new IllegalArgumentException("insufficient credits for instrument");
                    equipment[peer.slot].upgrade(id,tier);
                    reply(peer,"ACCEPT|GEARBUY|"+id+"|"+tier);
                    actorCue(peer.slot,LanSound.Cue.PICKUP);
                    reply(peer,supplies[peer.slot].frame());
                    sendEquipmentState(peer);
                }
                case "GEAREQUIP" -> {
                    if(!running||peer.slot==GHOST_SEAT||!peer.worldMode||p.size()!=4)
                        throw new IllegalArgumentException("hunter loadout only");
                    int slot=LanProtocol.integer(p.get(1),0,FieldEquipment.SLOTS-1);
                    String id=p.get(2);
                    acceptHunterSequence(peer,LanProtocol.sequence(p.get(3)));
                    ensureActiveHunter(peer);
                    if(map.van().stationAt(world.body(peer.slot).x(),world.body(peer.slot).z())
                            !=VanStaging.Station.EQUIPMENT)
                        throw new IllegalArgumentException("change field equipment at the van rack");
                    equipment[peer.slot].equip(slot,id);
                    reply(peer,"ACCEPT|GEAREQUIP|"+slot+"|"+id);
                    actorCue(peer.slot,LanSound.Cue.PICKUP);
                    sendEquipmentState(peer);
                }
                case "GEARSLOT" -> {
                    if(!running||peer.slot==GHOST_SEAT||!peer.worldMode||p.size()!=3)
                        throw new IllegalArgumentException("hunter gear slot only");
                    int slot=LanProtocol.integer(p.get(1),0,FieldEquipment.SLOTS-1);
                    acceptHunterSequence(peer,LanProtocol.sequence(p.get(2)));
                    ensureActiveHunter(peer);
                    equipment[peer.slot].selectSlot(slot);
                    actorCue(peer.slot,LanSound.Cue.SELECT);
                    sendEquipmentState(peer);
                }
                case "RECPLAY" -> {
                    if(!running||peer.slot==GHOST_SEAT||!peer.worldMode||p.size()!=2)
                        throw new IllegalArgumentException("hunter recorder playback only");
                    acceptHunterSequence(peer,LanProtocol.sequence(p.get(1)));
                    ensureActiveHunter(peer);
                    if(!equipment[peer.slot].active().equals("SOUND_RECORDER"))
                        throw new IllegalArgumentException("hold the sound recorder");
                    if(recorders[peer.slot].recording())
                        throw new IllegalArgumentException("stop recording before playback");
                    if(tick-lastRecordingPlayback[peer.slot]<20)
                        throw new IllegalArgumentException("recorder playback refreshing");
                    var clip=recorders[peer.slot].latest();
                    if(!equipment[peer.slot].ready("SOUND_RECORDER",tick))
                        throw new IllegalArgumentException("recorder refreshing or battery empty");
                    lastRecordingPlayback[peer.slot]=tick;
                    equipment[peer.slot].sampled("SOUND_RECORDER",tick);
                    for(String packet:clip.frames())reply(peer,packet);
                    reply(peer,"ACCEPT|RECPLAY|"+clip.samples().size()+" recorded sounds");
                    actorCue(peer.slot,LanSound.Cue.DEVICE_ON);
                }
                case "GEARUSE" -> {
                    if(!running||peer.slot==GHOST_SEAT||!peer.worldMode||p.size()!=2)
                        throw new IllegalArgumentException("hunter instrument required");
                    acceptHunterSequence(peer,LanProtocol.sequence(p.get(1)));
                    ensureActiveHunter(peer);
                    FieldEquipment gear=equipment[peer.slot];
                    String id=gear.active();
                    if(!gear.ready(id,tick))
                        throw new IllegalArgumentException(
                            gear.batterySecondsLeft(id)==0?
                                "battery empty - recharge at van":"instrument refreshing");
                    int room=world.body(peer.slot).room();
                    EquipmentTiers.Stage stage=gear.stage(id);
                    String reading;
                    switch(id){
                        case "EMF_READER", "THERMOMETER" -> {
                            // The probe ALWAYS measures the current air/field.
                            // Its reach limits whether it receives a *distant ghost event*,
                            // not whether ordinary environmental readings exist.
                            double distance=Math.hypot(
                                world.body(peer.slot).x()-ghostPose.pose().x(),
                                world.body(peer.slot).z()-ghostPose.pose().z());
                            int eventAge=tick-lastEvidenceEventTick;
                            int eventPower=eventAge>=0&&eventAge<=40
                                ?Math.max(0,lastEvidenceEventPower-eventAge/7):0;
                            boolean inReach=distance<=stage.reachCm()/100.0;
                            int origin=inReach?lastEvidenceEventRoom:-1;
                            boolean thermal=id.equals("THERMOMETER");
                            mission.setEvidenceHeating(lights.breaker());
                            LanCase.Report measure=mission.scanMeasured(peer.slot,
                                thermal?LanCase.Tool.THERMOMETER:LanCase.Tool.EMF,
                                room,ghost.room(),tick,origin,inReach?eventPower:0,
                                GhostEvidenceProfile.emfSuppressed(ghostType));
                            if(!measure.accepted())throw new IllegalArgumentException("instrument unavailable");
                            reading=measure.message().substring(measure.message().indexOf(" - ")+3)
                                .replace("°","deg ");
                            // Never append a supernatural validity assessment.
                        }
                        case "SPIRIT_BOX" -> {
                            boolean voiceEvent=room==lastEvidenceEventRoom
                                &&tick-lastEvidenceEventTick<=45
                                &&tick>=lastEvidenceEventTick
                                &&(lastEvidenceEventAction==GhostDomain.Action.WHISPER
                                    ||lastEvidenceEventAction==GhostDomain.Action.SIGNATURE)
                                &&Math.hypot(world.body(peer.slot).x()-ghostPose.pose().x(),
                                     world.body(peer.slot).z()-ghostPose.pose().z())
                                    <=stage.reachCm()/100.0;
                            reading=voiceEvent?"Voice response / spectral vocal event detected":
                                "No direct vocal response";
                        }
                        case "SOUND_RECORDER" -> {
                            if(recorders[peer.slot].recording()){
                                stopRecording(peer.slot);
                            }else{
                                recorders[peer.slot].start(gear.owned(id),tick);
                                gear.setPower(id,true);
                            }
                            reading=recorders[peer.slot].status(tick);
                        }
                        case "DOTS_PROJECTOR" -> {
                            if(room>=HouseMap.INDOOR_ROOMS)
                                throw new IllegalArgumentException("D.O.T.S. projection requires a room");
                            LanDotsProjectors.Placement placed=dots.placeOrRemove(peer.slot,room,
                                world.body(peer.slot).x(),world.body(peer.slot).z(),
                                gear.owned(id));
                            if(placed==null){
                                reading="Projector retrieved / emission ended";
                                notifyHunters("DOTS|CLEAR|"+peer.slot);
                            }else{
                                reading="Projector placed / projected field active";
                                notifyHunters(placed.frame());
                            }
                        }
                        case "UV_LIGHT" -> {
                            int persistence=90+gear.owned(id).ordinal()*35;
                            reading=counters.recentUv(room,tick,persistence)
                                ?"UV light / genuine surface trace":"UV light / no visible trace";
                        }
                        case "FLASHLIGHT","HEAD_GEAR","FIRELIGHT" -> {
                            boolean enabled=gear.toggle(id);
                            reading=switch(id){
                                case "FLASHLIGHT" -> "Flashlight "+(enabled?"on":"off");
                                case "HEAD_GEAR" -> "Night vision "+(enabled?"on":"off");
                                default -> "Firelight "+(enabled?"lit":"extinguished");
                            };
                            notifyHunters("GEARFX|"+peer.slot+"|"+id+"|"+(enabled?1:0));
                        }
                        case "VIDEO_CAMERA" -> {
                            if(cameras.at(peer.slot)==null&&gear.batterySecondsLeft(id)==0)
                                throw new IllegalArgumentException("camera battery empty: return to van");
                            LanVideoCameras.Camera station=cameras.placeOrRetrieve(
                                peer.slot,world.body(peer.slot),gear.owned(id));
                            gear.setPower(id,station!=null);
                            if(station==null){
                                reading="Video camera retrieved / feed ended";
                                notifyHunters("CAMERA|CLEAR|"+peer.slot);
                            }else{
                                reading="Video camera recording / live feed available in van";
                                notifyHunters(station.frame());
                                notifyHunters("CAMERA|POWER|"+peer.slot+"|1");
                            }
                        }
                        case "PHOTO_CAMERA" -> {
                            int remaining=gear.expend(id);
                            reading="Exposure captured / "+remaining+" frames remaining";
                            // The client captures its *actual rendered frame* on receipt.
                            // No image-recognition or ghost-presence check exists.
                        }
                        case "IGNITER" -> {
                            int remaining=gear.expend(id);
                            reading="Igniter sparked / "+remaining+" uses remaining";
                            notifyHunters("GEARFX|"+peer.slot+"|IGNITER|1");
                        }
                        case "INCENSE" -> {
                            int remaining=gear.expend(id);
                            reading="Incense burning / "+remaining+" bundles remaining";
                            LanWorld.Body body=world.body(peer.slot);
                            int duration=EquipmentTiers.stage(id,gear.owned(id)).batterySeconds()*10;
                            notifyHunters("BURN|INCENSE|"+room+"|"+
                                Math.round(body.x()*1000)+"|"+Math.round(body.z()*1000)+
                                "|"+(tick+Math.max(10,duration)));
                        }
                        case "GHOST_WRITING_BOOK" -> {
                            if(room>=HouseMap.INDOOR_ROOMS)
                                throw new IllegalArgumentException("writing book requires an interior room");
                            if(!writingBook.placed()){
                                writingBook.place(peer.slot,room,tick);
                                notifyHunters("BOOK|DEPLOYED|"+room);
                                reading="Writing book placed / page blank";
                            }else reading="Writing book / "+writingBook.inspect(room);
                        }
                        default -> throw new IllegalArgumentException("device has no working backend");
                    }
                    gear.sampled(id,tick);
                    if(gear.batterySecondsLeft(id)>=0)
                        reply(peer,"GEARPOWER|"+id+"|"+gear.batterySecondsLeft(id)+
                            "|"+(gear.powered(id)?1:0));
                    notifyHunters(casefile.recordDevice(tick,peer.slot,room,id,
                        LanEvidenceJournal.Finding.OBSERVED,reading));
                    reply(peer,"ACCEPT|GEARUSE|"+id+"|"+reading);
                    LanSound.Cue deviceCue=switch(id){
                        case "PHOTO_CAMERA"->LanSound.Cue.CAMERA;
                        case "GHOST_WRITING_BOOK"->LanSound.Cue.BOOK;
                        case "EMF_READER","THERMOMETER","SPIRIT_BOX","UV_LIGHT",
                                "SOUND_RECORDER"->LanSound.Cue.SCANNER;
                        case "DOTS_PROJECTOR"->dots.at(peer.slot)==null
                                    ?LanSound.Cue.DOTS_STOP:LanSound.Cue.DOTS_MOTOR;
                        case "FIRELIGHT"->gear.powered(id)
                                    ?LanSound.Cue.FIRELIGHT_IGNITE:LanSound.Cue.FIRELIGHT_OUT;
                        case "FLASHLIGHT","HEAD_GEAR","VIDEO_CAMERA"->gear.powered(id)
                                    ?LanSound.Cue.DEVICE_ON:LanSound.Cue.DEVICE_OFF;
                        case "IGNITER"->LanSound.Cue.SPARK;
                        case "INCENSE"->LanSound.Cue.INCENSE_BURN;
                        default->LanSound.Cue.EQUIPMENT;
                    };
                    recordSound(peer.slot,LanGhostPursuit.Sound.EQUIPMENT,deviceCue);
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
                    recordSound(peer.slot,LanGhostPursuit.Sound.EQUIPMENT,LanSound.Cue.POTION);
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
                    recordSound(peer.slot,LanGhostPursuit.Sound.EQUIPMENT,LanSound.Cue.WARD);
                    broadcastCounters();
                }
                case "PLACEBOOK" -> {
                    if(!running||peer.slot==GHOST_SEAT||!peer.worldMode||p.size()!=2)
                        throw new IllegalArgumentException("physical hunter required");
                    acceptHunterSequence(peer,LanProtocol.sequence(p.get(1)));
                    ensureActiveHunter(peer);
                    int room=world.body(peer.slot).room();
                    if(room<0||room>=HouseMap.INDOOR_ROOMS||writingBook.placed())
                        throw new IllegalArgumentException("book unavailable or already deployed");
                    writingBook.place(peer.slot,room,tick);
                    reply(peer,"ACCEPT|PLACEBOOK|"+room);
                    notifyHunters("BOOK|DEPLOYED|"+room);
                    recordSound(peer.slot,LanGhostPursuit.Sound.EQUIPMENT,LanSound.Cue.BOOK);
                }
                case "READBOOK" -> {
                    if(!running||peer.slot==GHOST_SEAT||!peer.worldMode||p.size()!=2)
                        throw new IllegalArgumentException("physical hunter required");
                    acceptHunterSequence(peer,LanProtocol.sequence(p.get(1)));
                    ensureActiveHunter(peer);
                    int room=world.body(peer.slot).room();
                    GhostWriting.Page page=writingBook.page();
                    boolean found=page!=null&&page.room()==room;
                    String words=writingBook.inspect(room);
                    reply(peer,"ACCEPT|READBOOK|"+words);
                    notifyHunters(casefile.recordDevice(tick,peer.slot,room,"GHOST_WRITING_BOOK",
                        LanEvidenceJournal.Finding.OBSERVED,
                        "Book inspection - "+words));
                    recordSound(peer.slot,LanGhostPursuit.Sound.EQUIPMENT,LanSound.Cue.BOOK);
                }
                case "TAKEBOOK" -> {
                    if(!running||peer.slot==GHOST_SEAT||!peer.worldMode||p.size()!=2)
                        throw new IllegalArgumentException("physical hunter required");
                    acceptHunterSequence(peer,LanProtocol.sequence(p.get(1)));
                    ensureActiveHunter(peer);
                    int room=world.body(peer.slot).room();
                    if(!writingBook.remove(peer.slot,room))
                        throw new IllegalArgumentException("no book to retrieve here");
                    notifyHunters("BOOK|REMOVED|"+room);
                    reply(peer,"ACCEPT|TAKEBOOK|"+room);
                    recordSound(peer.slot,LanGhostPursuit.Sound.EQUIPMENT,LanSound.Cue.BOOK);
                }
                case "UVSCAN" -> {
                    if(!running||peer.slot==GHOST_SEAT||!peer.worldMode||p.size()!=2)
                        throw new IllegalArgumentException("physical hunter view required");
                    acceptHunterSequence(peer,LanProtocol.sequence(p.get(1)));
                    ensureActiveHunter(peer);
                    int room=world.body(peer.slot).room();
                    boolean trace=counters.recentUv(room,tick);
                    reply(peer,"ACCEPT|UVSCAN|"+(trace?"FRESH SURFACE TRACE":"NO RECENT TRACE"));
                    String uvNote=casefile.recordDevice(tick,peer.slot,room,"UV_LAMP",
                        LanEvidenceJournal.Finding.OBSERVED,
                        trace?"UV lamp - fresh surface trace":"UV lamp - no recent trace");
                    notifyHunters(uvNote);
                    recordSound(peer.slot,LanGhostPursuit.Sound.EQUIPMENT,LanSound.Cue.SCANNER);
                }
                case "SCAN" -> {
                    if(!running||peer.slot==GHOST_SEAT||p.size()!=3)throw new IllegalArgumentException("hunter action unavailable");
                    LanCase.Tool tool=LanCase.Tool.valueOf(p.get(1));
                    acceptHunterSequence(peer,LanProtocol.sequence(p.get(2)));
                    int eventAge=tick-lastEvidenceEventTick;
                    int eventPower=eventAge>=0&&eventAge<=40
                        ?Math.max(0,lastEvidenceEventPower-eventAge/7):0;
                    // A nearby ghost isn't itself a talking radio. Only a real
                    // WHISPER/SIGNATURE with remaining strength can yield a reply.
                    boolean actualVoice=lastEvidenceEventAction==GhostDomain.Action.WHISPER
                        ||lastEvidenceEventAction==GhostDomain.Action.SIGNATURE;
                    int scanEventRoom=tool==LanCase.Tool.SPIRIT_BOX&&!actualVoice
                        ?-1:lastEvidenceEventRoom;
                    int scanEventPower=tool==LanCase.Tool.SPIRIT_BOX&&!actualVoice
                        ?0:eventPower;
                    mission.setEvidenceHeating(lights.breaker());
                    LanCase.Report result=peer.worldMode
                        ?mission.scanSpatialMeasured(peer.slot,tool,world.body(peer.slot),
                            ghost.room(),map,tick,scanEventRoom,scanEventPower,
                            GhostEvidenceProfile.emfSuppressed(ghostType))
                        :mission.scanMeasured(peer.slot,tool,hunterRooms[peer.slot],
                            ghost.room(),tick,scanEventRoom,scanEventPower,
                            GhostEvidenceProfile.emfSuppressed(ghostType));
                    answerHunter(peer,"SCAN",result);
                    if(result.accepted()){
                        recordSound(peer.slot,LanGhostPursuit.Sound.EQUIPMENT,LanSound.Cue.SCANNER);
                        String note=casefile.record(tick,peer.slot,hunterRooms[peer.slot],tool,result);
                        if(note!=null)notifyHunters(note);
                    }
                    broadcastProgress();
                }
                case "JOURNAL" -> {
                    if(!running||peer.slot==GHOST_SEAT||p.size()!=1)
                        throw new IllegalArgumentException("active hunter required for casefile");
                    sendCaseFile(peer);
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
                    if(result.accepted()&&!p.get(0).equals("EXTRACT"))
                        recordSound(peer.slot,LanGhostPursuit.Sound.RITUAL,
                            p.get(0).equals("WARD")?LanSound.Cue.WARD:LanSound.Cue.RITUAL_START);
                    if(result.accepted()&&(p.get(0).equals("CLEANSE")||p.get(0).equals("BANISH")||p.get(0).equals("ABSOLVE"))){
                        frenzy.provoke(32);
                        notifyHunters("RITUAL|STARTED|"+mission.activeRite());
                    }
                    broadcastProgress();finishIfComplete();
                }
                case "FATTACK" -> {
                    if(!running||peer.slot!=GHOST_SEAT||p.size()!=3)
                        throw new IllegalArgumentException("spectral seat required");
                    GhostFrenzy.Attack attack=GhostFrenzy.Attack.valueOf(p.get(1));
                    long seq=LanProtocol.sequence(p.get(2));
                    if(seq<=peer.lastGhostActionSequence)
                        throw new IllegalArgumentException("stale frenzy attack sequence");
                    peer.lastGhostActionSequence=seq;
                    if(!performFrenzyAttack(attack))
                        throw new IllegalArgumentException("frenzy attack unavailable, out of energy or target concealed");
                    lastHumanFrenzyAttackTick=tick;
                    reply(peer,"ACCEPT|FATTACK|"+attack+"|"+ghost.energy());
                    broadcastProgress();
                }
                case "FRENZY" -> {
                    if(!running||peer.slot!=GHOST_SEAT||p.size()!=2)
                        throw new IllegalArgumentException("spectral seat required");
                    long seq=LanProtocol.sequence(p.get(1));
                    if(seq<=peer.lastGhostActionSequence)
                        throw new IllegalArgumentException("stale frenzy sequence");
                    peer.lastGhostActionSequence=seq;
                    if(!startFrenzy(GhostFrenzy.Cause.GHOST_PLAYER))
                        throw new IllegalArgumentException("frenzy requires sufficient energy, living hunters and no recovery");
                    reply(peer,"ACCEPT|FRENZY");
                    broadcastState();
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
                    if(frenzy.phase()!=GhostFrenzy.Phase.CALM
                            && action!=GhostDomain.Action.DRIFT)
                        throw new IllegalArgumentException("use frenzy abilities while the major state is active");
                    if(action==GhostDomain.Action.STRIKE && ghost.observe().legalActions().contains(action)
                            && !LanSpatialCombat.any(strikeVictims()))
                        throw new IllegalArgumentException("no hunter within striking reach");
                    int from=ghost.room();
                    GhostDomain.Resolution result=ghost.dispatch(new GhostDomain.Command(action,room,++hostGhostActionSequence,GhostDomain.Source.HUMAN));
                    if(!result.applied())throw new IllegalArgumentException(result.reason());
                    actionCadence.completed(tick,result);
                    reply(peer,"ACCEPT|GHOST|"+action+"|"+result.energy());
                    ghostPose.syncRoom(ghost.room());
                    onGhostTravel(from,ghost.room());
                    resolveGhostAction(result);
                    if(peer.ghostWorldMode)reply(peer,ghostPose.frame(tick));
                    broadcastState();broadcastApparitions();broadcastProgress();finishIfComplete();
                    sendGhostPrompt();
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
    private void recordSound(int seat,LanGhostPursuit.Sound type){recordSound(seat,type,null);}
    private void sealedDoorRattle(Peer peer){
        if(peer.slot<0||peer.slot>=HUNTERS||tick-lastSealedDoorRattleTick[peer.slot]<18)return;
        lastSealedDoorRattleTick[peer.slot]=tick;
        actorCue(peer.slot,LanSound.Cue.LOCKED_DOOR_RATTLE);
    }
    private void actorCue(int seat,LanSound.Cue cue){
        Peer actor=seats[seat];
        if(actor!=null&&actor.worldMode)
            reply(actor,new LanSound.CueEvent(cue,0,Math.min(100,cue.baseGain),tick).frame());
    }
    /** Host owns the sound source and ghost hearing stimulus; cue picks only its texture. */
    private void recordSound(int seat,LanGhostPursuit.Sound type,LanSound.Cue selectedCue){
        LanWorld.Body body=world.body(seat);
        // These are the same real synthesized game sounds played by listeners.
        // Raw voice packets use their own media path and are not replaced with invented speech.
        if(type!=LanGhostPursuit.Sound.VOICE&&(type!=LanGhostPursuit.Sound.FOOTSTEP
                ||tick-lastHunterSound[seat]>=4)){
            lastHunterSound[seat]=tick;
            LanSound.Cue cue=selectedCue!=null?selectedCue:switch(type){
                case FOOTSTEP->LanSound.Cue.STEP;
                case DOOR->LanSound.Cue.DOOR;
                case RITUAL->LanSound.Cue.RITUAL;
                default->LanSound.Cue.EQUIPMENT;
            };
            for(int listener=0;listener<HUNTERS;listener++){
                LanSound.CueEvent sound=LanSound.project(map,world.body(listener),body.room(),
                    body.x(),body.z(),cue,tick);
                sound=LanSound.weatherMask(sound,weather.state(),
                    map.outside(world.body(listener).room())||map.outside(body.room()));
                if(sound==null)continue;
                if(seats[listener]!=null&&seats[listener].worldMode)reply(seats[listener],sound.frame());
                recorders[listener].capture(sound,Math.hypot(body.x()-world.body(listener).x(),
                    body.z()-world.body(listener).z()));
            }
            if(body.room()==HouseMap.EXTRACTION_ROOM&&type!=LanGhostPursuit.Sound.VOICE)
                actorCue(seat,cue);
        }
        boolean heard=LanAcoustics.audible(map,ghost.room(),hunterRooms[seat],type,
            weather.state());
        if(heard){
            lastGhostSoundTick=tick;
            if(!frenzy.active()&&frenzy.phase()==GhostFrenzy.Phase.CALM){
                switch(type){
                    case RITUAL -> frenzy.provoke(18);
                    case VOICE -> frenzy.provoke(6);
                    case EQUIPMENT -> frenzy.provoke(3);
                    case DOOR -> frenzy.provoke(2);
                    case FOOTSTEP -> { /* ordinary movement is not a guaranteed provocation */ }
                }
            }
        }
        if(heard&&seats[GHOST_SEAT]==null){
            ai.heard(ghost.room(),hunterRooms[seat],body.x(),body.z(),type,tick);
        }else if(heard&&seats[GHOST_SEAT]!=null&&seats[GHOST_SEAT].ghostWorldMode){
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
    private void sendEquipmentState(Peer peer){
        if(peer.slot==GHOST_SEAT)throw new IllegalArgumentException("ghost cannot access equipment");
        reply(peer,equipment[peer.slot].frame(supplies[peer.slot].credits()));
        for(String packet:equipment[peer.slot].inventoryFrames())reply(peer,packet);
        for(String id:FieldEquipment.workingTools())
            if(equipment[peer.slot].batterySecondsLeft(id)>=0)
                reply(peer,"GEARPOWER|"+id+"|"+
                    equipment[peer.slot].batterySecondsLeft(id)+"|"+
                    (equipment[peer.slot].powered(id)?1:0));
        sendRecorderState(peer.slot);
    }
    private void sendRecorderState(int seat){
        if(seats[seat]!=null)reply(seats[seat],"RECORDER|STATE|"+recorders[seat].status(tick));
    }
    private void stopRecording(int seat){
        var clip=recorders[seat].stop(tick);
        equipment[seat].setPower("SOUND_RECORDER",false);
        notifyHunters(casefile.recordDevice(tick,seat,world.body(seat).room(),"SOUND_RECORDER",
            LanEvidenceJournal.Finding.OBSERVED,"Recorded "+clip.duration()/10.0+"s / "+
                clip.samples().size()+" sound events"));
        sendRecorderState(seat);
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
    /** Never send investigator notes to a human or AI ghost seat. */
    private void sendCaseFile(Peer peer){
        if(peer.slot==GHOST_SEAT)throw new IllegalArgumentException("ghost cannot read casefile");
        reply(peer,"CASEFILE|RESET");
        for(String note:casefile.snapshot())reply(peer,note);
        reply(peer,"NOTES|RESET");
        for(String note:fieldNotes.snapshot())reply(peer,note);
    }
    private void notifyHunters(String event){for(int i=0;i<HUNTERS;i++)if(seats[i]!=null)reply(seats[i],event);}
    private void broadcastProgress(){for(int i=0;i<HUNTERS;i++)if(seats[i]!=null)reply(seats[i],mission.privateState(i));}
    private boolean[] strikeVictims(){
        boolean[] connected=new boolean[HUNTERS],spatial=new boolean[HUNTERS];
        for(int i=0;i<HUNTERS;i++)if(mission.alive(i)){
            if(seats[i]!=null){connected[i]=true;spatial[i]=seats[i].worldMode;}
            else if(reserved[i]!=null){connected[i]=true;spatial[i]=reserved[i].worldMode;}
        }
        return LanSpatialCombat.victims(map,world,ghostPose.pose(),hunterRooms,connected,spatial);
    }
    /** Hunter-only positional acoustic projection; never a ghost pose or private team feed. */
    private void broadcastGhostSound(LanSound.Cue cue){
        LanGhostSpatial.Pose pose=ghostPose.pose();
        for(int i=0;i<HUNTERS;i++){
            if((seats[i]==null||!seats[i].worldMode)
                    &&(reserved[i]==null||!reserved[i].worldMode))continue;
            LanSound.CueEvent sound=LanSound.project(map,world.body(i),pose.room(),pose.x(),pose.z(),cue,tick);
            sound=LanSound.weatherMask(sound,weather.state(),
                map.outside(world.body(i).room())||map.outside(pose.room()));
            if(sound!=null){
                if(seats[i]!=null)reply(seats[i],sound.frame());
                recorders[i].capture(sound,Math.hypot(pose.x()-world.body(i).x(),
                    pose.z()-world.body(i).z()));
            }
        }
    }
    private void distributeEffect(GhostDomain.Resolution result){
        // All live matches maintain six fixed hunter sockets, even in a three-hunter lobby.
        // The effect mask must match hunterRooms; a three-element mask stops the host tick.
        boolean[] all=new boolean[HUNTERS];java.util.Arrays.fill(all,true);
        distributeEffect(result,result.action()==GhostDomain.Action.STRIKE?strikeVictims():all);
    }
    private void distributeEffect(GhostDomain.Resolution result,boolean[] affected){
        if(!result.applied())return;
        boolean[] wasAlive=new boolean[HUNTERS];
        for(int i=0;i<HUNTERS;i++)wasAlive[i]=(seats[i]!=null||reserved[i]!=null)&&mission.alive(i);
        mission.applyGhostEffect(result.room(),hunterRooms,result,affected);
        if(result.fear()>0||result.harm()>0)
            for(int i=0;i<HUNTERS;i++)if(wasAlive[i]&&affected[i]&&hunterRooms[i]==result.room()&&seats[i]!=null)
                {
                    reply(seats[i],"EFFECT|"+result.action()+"|"+result.fear()+"|"+result.harm());
                    if(result.harm()>0)reply(seats[i],
                        new LanSound.CueEvent(LanSound.Cue.IMPACT,0,92,tick).frame());
                }
        // Announce only actual living-to-downed transitions to the hunter team.
        // Human ghosts never receive health, incapacitation or team-state telemetry.
        for(int i=0;i<HUNTERS;i++)if(wasAlive[i]&&!mission.alive(i))
            notifyHunters("HUNTER|DOWN|"+i);
    }
    /** Laser-space contact follows position, never a permission or evidence check. */
    private void illuminateDots(){
        for(LanDotsProjectors.Passage light:dots.illuminate(ghostPose.pose(),tick))
            for(int i=0;i<HUNTERS;i++){
                Peer hunter=seats[i];
                if(hunter==null||!hunter.worldMode)continue;
                LanWorld.Body body=world.body(i);
                boolean visible=LanApparition.lineOfSight(map,body.x(),body.z(),
                    light.x(),light.z());
                if(!visible)for(LanVideoCameras.Camera camera:cameras.all())
                    if(equipment[camera.owner()].powered("VIDEO_CAMERA")
                            &&LanApparition.lineOfSight(map,camera.x(),camera.z(),
                                light.x(),light.z())){visible=true;break;}
                if(visible)reply(hunter,light.frame());
            }
    }
    /** AI and human origins both enter this exact damage/telegraph pipeline. */
    private void resolveGhostAction(GhostDomain.Resolution result){
        if(!result.applied())return;
        int eventPower=switch(result.action()){
            case WHISPER->3;case DISTURB->8;case MANIFEST->9;
            case STRIKE,SIGNATURE->10;case DRIFT->0;
        };
        if(eventPower>0){
            writingBook.witness(20261018L,tick,result,ghostType);
            lastEvidenceEventTick=tick;
            lastEvidenceEventRoom=result.room();
            lastEvidenceEventPower=eventPower;
            lastEvidenceEventAction=result.action();
        }
        if(result.action()==GhostDomain.Action.DRIFT)broadcastGhostSound(LanSound.Cue.GHOST_DRIFT);
        if(result.action()==GhostDomain.Action.MANIFEST)animation.manifested(tick);
        RoomLighting.Interference disruption=switch(result.action()){
            case WHISPER->RoomLighting.Interference.MINOR;
            case DISTURB->RoomLighting.Interference.MODERATE;
            case MANIFEST->RoomLighting.Interference.MODERATE;
            case STRIKE->RoomLighting.Interference.DANGEROUS;
            case SIGNATURE->RoomLighting.Interference.SIGNATURE;
            default->null;
        };
        if(disruption!=null && result.room()<HouseMap.INDOOR_ROOMS){
            lights.pulse(result.room(),disruption,tick);
            int expires=tick+switch(disruption){
                case MINOR->22;case MODERATE->42;case DANGEROUS->70;case SIGNATURE->100;};
            notifyHunters("LIGHTFX|"+result.room()+"|"+disruption+"|"+tick+"|"+expires);
        }
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
            case SIGNATURE->LanSound.Cue.SIGNATURE;
            default->null;
        };
        if(cue!=null)broadcastGhostSound(cue);
        // These are explicitly sound-only variants of *real* accepted haunts:
        // no fabricated evidence packets, no fake footsteps, no guessed ghost coordinates.
        if((result.action()==GhostDomain.Action.DISTURB
                ||result.action()==GhostDomain.Action.MANIFEST
                ||result.action()==GhostDomain.Action.SIGNATURE)
                &&tick-lastHorrorStingTick>=115
                &&(result.action()==GhostDomain.Action.SIGNATURE
                    ||Math.floorMod(tick*11+result.room()*7+ghostType.ordinal(),4)==0)){
            lastHorrorStingTick=tick;
            LanSound.Cue[] stings={LanSound.Cue.HORROR_STING_A,
                LanSound.Cue.HORROR_STING_B,LanSound.Cue.HORROR_STING_C};
            int pick=Math.floorMod(tick+result.room()*17+ghostType.ordinal()*29,stings.length);
            broadcastGhostSound(stings[pick]);
        }
        if(result.action()!=GhostDomain.Action.STRIKE){distributeEffect(result);return;}
        // An ordinary telegraphed strike is not a Frenzy and never seals the exits.
        boolean[] acquired=strikeVictims(),immediate=new boolean[HUNTERS];
        int target=-1;
        for(int i=0;i<HUNTERS;i++)if(acquired[i]){
            if((seats[i]!=null&&seats[i].worldMode)
                    ||(reserved[i]!=null&&reserved[i].worldMode))target=i;
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
    /** Small private action menu, never copied to the hunter journal. */
    private void sendGhostPrompt(){
        Peer player=seats[GHOST_SEAT];
        if(player!=null&&running&&player.ghostWorldMode){
            if(frenzy.phase()!=GhostFrenzy.Phase.CALM)
                reply(player,"GPROMPT|"+tick+"|"+actionCadence.dueTick()+"|"+ghost.room());
            else reply(player,actionCadence.prompt(ghost.observe()));
        }
    }
    /**
     * A human ghost cannot veto every encounter by remaining idle. At a missed
     * deadline apply an ordinary real, legal spectral action from its actual pose.
     * Wards/cooldowns/energy still win; if nothing is legal, retry on future ticks.
     */
    private void enforceGhostDeadline(){
        if(frenzy.phase()!=GhostFrenzy.Phase.CALM||!actionCadence.due(tick))return;
        GhostDomain.Observation state=ghost.observe();
        GhostDomain.Action action=actionCadence.fallback(state,
            LanSpatialCombat.any(strikeVictims()));
        if(action==null)return;
        int before=ghost.room();
        GhostDomain.Resolution result=ghost.dispatch(new GhostDomain.Command(
            action,state.room(),++hostGhostActionSequence,GhostDomain.Source.AI));
        if(!result.applied())return;
        actionCadence.completed(tick,result);
        ghostPose.syncRoom(ghost.room());
        onGhostTravel(before,ghost.room());
        resolveGhostAction(result);
        broadcastApparitions();
        Peer player=seats[GHOST_SEAT];
        if(player!=null&&player.ghostWorldMode){
            reply(player,"GFORCED|"+action+"|"+result.room()+"|"+tick);
            sendGhostPrompt();
        }
    }
    private void resolvePendingStrike(){
        LanTelegraphedStrike.Pending pending=pendingStrike;
        if(pending==null||!pending.due(tick))return;
        pendingStrike=null;
        animation.impact(tick);
        boolean[] connected=new boolean[HUNTERS],spatial=new boolean[HUNTERS];
        for(int i=0;i<HUNTERS;i++)if(mission.alive(i)){
            if(seats[i]!=null){connected[i]=true;spatial[i]=seats[i].worldMode;}
            else if(reserved[i]!=null){connected[i]=true;spatial[i]=reserved[i].worldMode;}
        }
        int near=0;
        for(int i=0;i<HUNTERS;i++)if(connected[i]&&hunterRooms[i]==pending.room())near++;
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
    private boolean anyHunterInSite(){
        for(int i=0;i<HUNTERS;i++)
            if((seats[i]!=null||reserved[i]!=null)&&mission.alive(i)
                    &&hunterRooms[i]<HouseMap.EXTRACTION_ROOM)return true;
        return false;
    }
    private int averageSanity(){
        int sum=0,count=0;
        for(int i=0;i<HUNTERS;i++)
            if((seats[i]!=null||reserved[i]!=null)&&mission.alive(i)){
                sum+=100-mission.stress(i);count++;
            }
        return count==0?100:sum/count;
    }
    private String frenzyFrame(){
        return "FRENZY|"+frenzy.phase()+"|"+frenzy.remaining(tick)+"|"+frenzy.cause();
    }
    private void onFrenzyTransition(){
        world.setExitSealed(frenzy.sealed());
        notifyAllPeers(frenzyFrame());
        if(frenzy.warning())broadcastGhostSound(LanSound.Cue.TENSION_BUILD);
        if(frenzy.raging()){
            ghost.reveal(30);
            broadcastGhostSound(LanSound.Cue.MANIFEST);
            broadcastApparitions();
        }
        if(frenzy.phase()==GhostFrenzy.Phase.RECOVERY)
            notifyHunters("FIELD|GHOST FRENZY ENDED - EXITS UNSEALED");
    }
    private boolean startFrenzy(GhostFrenzy.Cause cause){
        if(!frenzy.begin(tick,ghost,anyHunterInSite(),cause))return false;
        lastHumanFrenzyAttackTick=tick;
        if(pendingStrike!=null){
            notifyHunters("THREAT|EVADED|"+pendingStrike.targetSeat());
            pendingStrike=null;
        }
        onFrenzyTransition();
        return true;
    }
    /** The AI hunts only host-visible targets, never a leaked client coordinate feed. */
    private LanGhostPursuit.Impulse frenzyChaseImpulse(){
        LanGhostSpatial.Pose pos=ghostPose.pose();
        int closest=-1;double best=Double.POSITIVE_INFINITY;
        for(int i=0;i<HUNTERS;i++){
            if((seats[i]==null&&reserved[i]==null)||!mission.alive(i)||world.hidden(i)
                    ||hunterRooms[i]!=pos.room())continue;
            LanWorld.Body body=world.body(i);
            double d=Math.hypot(body.x()-pos.x(),body.z()-pos.z());
            if(d<best&&d<12&&map.clearLineOfSight(pos.x(),pos.z(),body.x(),body.z())){
                best=d;closest=i;
            }
        }
        if(closest<0)return null;
        LanWorld.Body seen=world.body(closest);
        double dx=seen.x()-pos.x(),dz=seen.z()-pos.z();
        if(Math.hypot(dx,dz)<.30)return null;
        return new LanGhostPursuit.Impulse((int)Math.round(
            Math.max(-100,Math.min(100,dx*100))),
            (int)Math.round(Math.max(-100,Math.min(100,dz*100))));
    }
    /** Host-authorized contact requires an actual spatial body, sight and reach. */
    /** Selects one host-observed 3D target; hiding, wards and walls win.
     * The client only submits the attack enum, never victim coordinates/seat. */
    private int frenzyTarget(GhostFrenzy.Attack attack){
        LanGhostSpatial.Pose pose=ghostPose.pose();
        int bestSeat=-1;double best=Double.POSITIVE_INFINITY;
        double range=attack==GhostFrenzy.Attack.CLAW?LanSpatialCombat.STRIKE_RANGE:5.0;
        for(int i=0;i<HUNTERS;i++){
            if((seats[i]==null&&reserved[i]==null)||!mission.alive(i)||world.hidden(i)
                    ||hunterRooms[i]!=pose.room())continue;
            boolean spatial=seats[i]!=null?seats[i].worldMode:reserved[i].worldMode;
            if(!spatial)continue;
            LanWorld.Body body=world.body(i);
            if(counters.wardsAt(body.x(),body.z(),tick))continue;
            double distance=Math.hypot(body.x()-pose.x(),body.z()-pose.z());
            if(distance>range||distance>=best)continue;
            boolean reachable=attack==GhostFrenzy.Attack.CLAW
                ?LanSpatialCombat.canStrike(map,world,pose,i)
                :map.clearLineOfSight(pose.x(),pose.z(),body.x(),body.z());
            if(!reachable)continue;
            best=distance;bestSeat=i;
        }
        return bestSeat;
    }
    /** Species-specific attacks spend energy only after a host-confirmed target. */
    private boolean performFrenzyAttack(GhostFrenzy.Attack attack){
        if(!frenzy.available(attack,tick,ghost))return false;
        int seat=frenzyTarget(attack);
        if(seat<0)return false;
        GhostDomain.Resolution effect=frenzy.attack(attack,tick,seat,ghost.room(),ghost);
        if(effect==null)return false;
        boolean[] one=new boolean[HUNTERS];one[seat]=true;
        distributeEffect(effect,one);
        broadcastGhostSound(attack==GhostFrenzy.Attack.CLAW
            ?LanSound.Cue.STRIKE:LanSound.Cue.WHISPER);
        if(seats[seat]!=null)reply(seats[seat],"FIELD|"+
            (attack==GhostFrenzy.Attack.CLAW
                ?"FRENZY: VIOLENT IMPACT - EVADE":"FRENZY: SUPERNATURAL DREAD - FIND SHELTER"));
        return true;
    }
    private void applyFrenzyContacts(){
        if(!frenzy.raging())return;
        // The AI is bound by exactly the same reach, price and attack cooldowns
        // as the human ghost. Connected ghost players must choose their attacks.
        if(seats[GHOST_SEAT]==null){
            if(!performFrenzyAttack(GhostFrenzy.Attack.CLAW))
                performFrenzyAttack(GhostFrenzy.Attack.DREAD);
        }else if(tick-lastHumanFrenzyAttackTick>=45){
            // A human ghost cannot start a Frenzy and then freeze the encounter.
            // Real host reach, sight, wards, cooldown and energy still apply.
            boolean forced=performFrenzyAttack(GhostFrenzy.Attack.CLAW)
                ||performFrenzyAttack(GhostFrenzy.Attack.DREAD);
            if(forced){
                lastHumanFrenzyAttackTick=tick;
                if(seats[GHOST_SEAT].ghostWorldMode)
                    reply(seats[GHOST_SEAT],"FIELD|FRENZY INSTINCT FORCED AN ATTACK");
            }
        }
        if(!anyHunterInSite()&&frenzy.repel(tick))onFrenzyTransition();
    }
    private void finishIfComplete(){
        if(mission.outcome()==LanCase.Outcome.ACTIVE)return;
        running=false;
        world.setExitSealed(false);
        notifyAllPeers("RESULT|"+mission.outcome());
        broadcastProgress();
    }
    private static String safeReason(String s){return s==null?"invalid command":s.replaceAll("[^A-Za-z0-9 ._-]","").substring(0,Math.min(85,s.replaceAll("[^A-Za-z0-9 ._-]","").length()));}
    private void tickSafely(){if(closed)return; synchronized(mutex){
        if(!running)return;
        try{tick++;
            if(weather.advance(tick)){
                mission.updateEvidenceWeather(weather.state().weather(),weather.state().intensity());
                notifyAllPeers(weather.state().packet());
            }
            expireDisconnectedSeats();
            if(!running)return;
            world.advanceStamina(tick);
            ghostPose.advanceStamina(tick);
            if(frenzy.advance(tick)){
                onFrenzyTransition();
            }
            if(frenzy.active()&&tick%10==0)notifyAllPeers(frenzyFrame());
            int audible=-1,occupants=0;
            for(int i=0;i<HUNTERS;i++)if((seats[i]!=null||reserved[i]!=null)&&mission.alive(i)
                    &&hunterRooms[i]==ghost.room()){audible=hunterRooms[i];occupants++;}
            ghost.advance(tick,audible,occupants);
            if(frenzy.raging()){
                ghost.reveal(12);
                if(tick%10==0&&ghost.room()<HouseMap.INDOOR_ROOMS){
                    // Pulses are the genuine shared room-lighting system, not a HUD-only flag.
                    lights.pulse(ghost.room(),RoomLighting.Interference.DANGEROUS,tick);
                    notifyHunters("LIGHTFX|"+ghost.room()+"|DANGEROUS|"+tick+"|"+(tick+22));
                }
            }
            if(frenzy.phase()==GhostFrenzy.Phase.CALM && frenzy.consider(
                    tick,ghost,anyHunterInSite(),averageSanity()))onFrenzyTransition();
            if(tick%12==0)monitor.sample(tick,ghost.energy());
            // Cumulative room psychology is deliberately slower than active ghost attacks.
            // A flashlight/firelight offsets darkness without pretending the room circuit is on.
            int[] present=new int[HouseMap.ROOM_COUNT];
            for(int i=0;i<HUNTERS;i++)
                if((seats[i]!=null||reserved[i]!=null)&&mission.alive(i)
                        &&hunterRooms[i]>=0&&hunterRooms[i]<HouseMap.ROOM_COUNT)
                    present[hunterRooms[i]]++;
            for(int i=0;i<HUNTERS;i++){
                if((seats[i]==null&&reserved[i]==null)||!mission.alive(i)){
                    ambientSanity.reset(i);continue;
                }
                int room=hunterRooms[i];
                boolean indoor=room>=0&&room<HouseMap.INDOOR_ROOMS;
                boolean hasLight=indoor&&(lights.brightness(room,tick)>.32
                    ||equipment[i].powered("FLASHLIGHT")
                    ||equipment[i].powered("FIRELIGHT"));
                int amount=ambientSanity.advance(i,indoor,present[room],hasLight,
                    room==ghost.room(),GhostTraits.of(ghostType).charge());
                if(amount>0)mission.drainSanity(i,amount);
            }
            int drain=GhostTraits.passiveFear(ghostType,tick,occupants);
            if(drain>0)for(int i=0;i<HUNTERS;i++)if((seats[i]!=null||reserved[i]!=null)&&hunterRooms[i]==ghost.room()
                    &&mission.drainSanity(i,drain)&&seats[i]!=null)reply(seats[i],"FEED|SANITY DRAIN");
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
                if(frenzy.repel(tick))onFrenzyTransition();
                notifyHunters("FIELD|CROSS REPELLED THE ENTITY");
                broadcastApparitions();
            }
            if(seats[GHOST_SEAT]==null){GhostDomain.Observation seen=ghost.observe();
                LanGhostPursuit.Impulse impulse=frenzy.raging()?frenzyChaseImpulse():null;
                if(impulse==null)impulse=ai.approach(seen,ghostPose.pose());
                if(impulse!=null){try{
                    boolean burst=frenzy.raging()||ai.memory(tick)!=null;
                    ghostPose.step(impulse.dx(),impulse.dz(),tick,burst);
                    broadcastApparitions();
                    if(ghost.manifested()&&tick%5==0)broadcastGhostSound(LanSound.Cue.FOOTFALL);}
                    catch(IllegalArgumentException blocked){ /* Same physical rejection as a human ghost. */ }}
                GhostDomain.Command choice=ai.decide(seen,LanSpatialCombat.any(strikeVictims()));
                if(frenzy.phase()!=GhostFrenzy.Phase.CALM && choice!=null
                        &&choice.action()!=GhostDomain.Action.DRIFT)choice=null;
                if(choice!=null){
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
                        actionCadence.completed(tick,result);
                        resolveGhostAction(result);broadcastApparitions();
                    }
                }
            }}
            // Runs even with a connected human ghost; without a human it is the
            // safety floor beneath AI's normal behavior scheduler.
            enforceGhostDeadline();
            resolvePendingStrike();
            applyFrenzyContacts();
            LanCase.RitualAdvance ritual=mission.advance(hunterRooms);
            if(ritual==LanCase.RitualAdvance.CLEANSED)
                for(int i=0;i<HUNTERS;i++)if(seats[i]!=null&&seats[i].worldMode)
                    reply(seats[i],new LanSound.CueEvent(LanSound.Cue.RITUAL_END,0,85,tick).frame());
            if(ritual==LanCase.RitualAdvance.PAUSED
                    ||ritual==LanCase.RitualAdvance.RESUMED
                    ||ritual==LanCase.RitualAdvance.BROKEN){
                notifyHunters("RITUAL|"+ritual);
                broadcastProgress();
            }
            if(animation.animating(tick)||pendingStrike!=null)broadcastApparitions();
            illuminateDots();
            for(int seat=0;seat<HUNTERS;seat++){
                for(String drained:equipment[seat].advancePower(tick)){
                    if(seats[seat]!=null)
                        reply(seats[seat],"GEARPOWER|"+drained+"|0|0");
                    if(drained.equals("FLASHLIGHT")||drained.equals("HEAD_GEAR")
                            ||drained.equals("FIRELIGHT"))
                        notifyHunters("GEARFX|"+seat+"|"+drained+"|0");
                    if(drained.equals("VIDEO_CAMERA"))
                        notifyHunters("CAMERA|POWER|"+seat+"|0");
                    if(drained.equals("SOUND_RECORDER")&&recorders[seat].recording())
                        stopRecording(seat);
                }
                if(recorders[seat].due(tick))stopRecording(seat);
                if(tick%10==0&&recorders[seat].recording())sendRecorderState(seat);
            }
            // Powered device gauges receive real host charge updates once per second.
            if(tick%10==0)for(int seat=0;seat<HUNTERS;seat++)if(seats[seat]!=null)
                for(String id:FieldEquipment.workingTools())
                    if(equipment[seat].powered(id))
                        reply(seats[seat],"GEARPOWER|"+id+"|"+
                            equipment[seat].batterySecondsLeft(id)+"|1");
            if(tick%2==0){
                broadcastCounters();
                for(int i=0;i<HUNTERS;i++)if(seats[i]!=null&&seats[i].worldMode)
                    reply(seats[i],world.staminaFrame(i,tick));
                if(seats[GHOST_SEAT]!=null&&seats[GHOST_SEAT].ghostWorldMode)
                    reply(seats[GHOST_SEAT],ghostPose.staminaFrame(tick));
            }
            if(tick%5==0){broadcastState();broadcastApparitions();broadcastProgress();broadcastWorld();
                if(seats[GHOST_SEAT]!=null&&seats[GHOST_SEAT].ghostWorldMode){
                    reply(seats[GHOST_SEAT],ghostPose.frame(tick));
                    sendGhostPrompt();
                }}
            maintainPeerHealth();
            finishIfComplete();
        }catch(RuntimeException ex){running=false;notifyAllPeers("INFO|host simulation stopped");System.err.println("LAN tick failure: "+ex.getMessage());}
    }}
    /** 5-second heartbeat and 20-second stale-link cutoff; never trust player clocks.
     * A dead TCP peer enters the normal bounded seat-recovery flow when serve() exits.
     */
    private void maintainPeerHealth(){
        for(Peer peer:seats)if(peer!=null){
            if(tick-peer.lastPongTick>200){
                peer.outbound.stop();
            }else if(tick%50==0){
                peer.expectedPongTick=tick;
                peer.pingSentNanos=System.nanoTime();
                reply(peer,"PING|"+tick);
            }
        }
    }
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
        notifyHunters("VANDOOR|"+(map.van().cargoDoorClosed()?1:0));
        // A disconnected hunter remains physically present and vulnerable for the
        // entire reservation window, not invisible until the UI reconnects.
        for(int i=0;i<HUNTERS;i++)if((seats[i]!=null||reserved[i]!=null)&&mission.alive(i))
            notifyHunters(world.bodyFrame(i,tick));
    }
    private void broadcastState(){
        GhostDomain.Observation o=ghost.observe();
        StringBuilder team=new StringBuilder("TEAMMAP");
        for(int i=0;i<HUNTERS;i++)team.append('|')
            .append(seats[i]==null&&reserved[i]==null?-1:hunterRooms[i]);
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
    private static void reply(Peer peer,String event){peer.outbound.offer(event);}
    @Override public void close(){closed=true;voice.close();try{listener.close();}catch(IOException ignored){}
        synchronized(mutex){for(Peer peer:seats)if(peer!=null){try{peer.socket.close();}catch(IOException ignored){}}}
        clock.shutdownNow();workers.shutdownNow();
    }
    private static final class Reservation {
        final String name,token,previousToken;
        final long expiresNanos,lastActionSequence,lastPoseSequence;
        final boolean worldMode;
        Reservation(Peer p,long expires){
            name=p.name;token=p.resumeToken;previousToken=p.previousResumeToken;
            expiresNanos=expires;
            lastActionSequence=p.lastGhostActionSequence;
            lastPoseSequence=p.lastGhostPoseSequence;
            worldMode=p.worldMode;
        }
    }
    private static final class Peer{
        final Socket socket;final Reader input;final Writer output;final int slot;final String name;
        final LanOutboundQueue outbound;
        final String resumeToken=newResumeToken();
        String previousResumeToken; // erased after client confirms durable replacement
        long unconfirmedResumeDeadlineNanos; // no unlimited grace via failed reconnect loop
        boolean ready,worldMode,ghostWorldMode,intentionalLeave;
        long lastGhostPoseSequence=-1,lastGhostActionSequence=-1;
        long pingSentNanos;
        int expectedPongTick=-1,lastPongTick;
        int lastMonitorTick=-100000,lastChatTick=-100000,lastLightTick=-100000;
        long lastLobbyChatNanos;
        Peer(Socket s,Reader in,Writer out,int slot,String name){
            socket=s;input=in;output=out;this.slot=slot;this.name=name;
            outbound=new LanOutboundQueue(out,()->{
                try{s.close();}catch(IOException ignored){}
            });
        }
    }
}
