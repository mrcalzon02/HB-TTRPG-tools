package org.beckenburg;

import java.io.*;
import java.net.*;
import java.util.Objects;
import java.util.function.Consumer;

/** Client connection for the bounded LAN lobby/room-simulation protocol. */
public final class LanClient implements AutoCloseable {
    private final Socket socket=new Socket();
    private final Reader in;
    private final Writer out;
    private final Consumer<String> observer;
    private final Thread reader;
    private final String seat;
    private volatile boolean closed;
    private volatile boolean leaving;
    private volatile LanVoiceClientAudio voice;
    private volatile long sequence;
    private final String connectAddress;
    private final int connectPort;
    private volatile String resumeKey;
    private volatile int latencyMillis=-1;

    /** A reconnect capability, not an identity or proof of ownership outside this match. */
    public record ResumeTicket(String seat,String token,long nextSequence) { }

    public ResumeTicket resumeTicket() {
        String key=resumeKey;
        return key==null?null:new ResumeTicket(seat,key,sequence);
    }
    /** Confirm a rotated resume credential ONLY after storing it durably on disk.
     * A failed write must leave the older reserved credential recoverable.
     */
    public synchronized void acknowledgeStoredResume() throws IOException {
        if(resumeKey==null)throw new IOException("host did not issue recovery capability");
        send("RESUMEACK|"+resumeKey);
    }
    public String address() {return connectAddress;}
    public int port() {return connectPort;}
    /** Last host-measured TCP heartbeat round-trip; -1 until sampled. */
    public int latencyMillis(){return latencyMillis;}

    public LanClient(String address,int port,boolean ghost,String nickname,Consumer<String> observer)throws IOException {
        this(address,port,ghost,nickname,null,"","",observer);
    }
    /** LAN-only join password is sent over plaintext until an encrypted transport is implemented. */
    public LanClient(String address,int port,boolean ghost,String nickname,String password,Consumer<String> observer)throws IOException {
        this(address,port,ghost,nickname,null,password,"",observer);
    }
    /** Strict local host admission: only the in-process launcher gets this secret. */
    public LanClient(String address,int port,boolean ghost,String nickname,
            String password,String ownerCredential,Consumer<String> observer)throws IOException {
        this(address,port,ghost,nickname,null,password,ownerCredential,observer);
    }
    public LanClient(String address,int port,ResumeTicket ticket,Consumer<String> observer)throws IOException {
        this(address,port,"GHOST".equals(Objects.requireNonNull(ticket).seat()),"",ticket,"","",observer);
    }
    private LanClient(String address,int port,boolean ghost,String nickname,ResumeTicket ticket,String password,String ownerCredential,Consumer<String> observer)throws IOException {
        this.observer=Objects.requireNonNull(observer);
        this.connectAddress=Objects.requireNonNull(address);
        this.connectPort=port;
        if(port<1||port>65535)throw new IllegalArgumentException("port out of bounds");
        if(ticket==null)LanProtocol.cleanName(nickname);
        else if(!ticket.seat().matches("GHOST|H[1-6]") || !ticket.token().matches("[0-9a-f]{48}")
                || ticket.nextSequence()<0)
            throw new IllegalArgumentException("invalid reconnect ticket");
        if(password==null||password.length()>64||password.indexOf('|')>=0
                ||password.chars().anyMatch(ch->ch<32||ch>126))
            throw new IllegalArgumentException("password must be at most 64 printable ASCII characters");
        if(ownerCredential==null||(!ownerCredential.isEmpty()
                && !ownerCredential.matches("[0-9a-f]{48}")))
            throw new IllegalArgumentException("invalid local host credential");
        Reader input=null;Writer output=null;String assigned=null;long hostSequence=0;
        try{
            socket.connect(new InetSocketAddress(address,port),3000);
            socket.setTcpNoDelay(true);socket.setSoTimeout(5000);
            input=LanProtocol.reader(socket.getInputStream());output=LanProtocol.writer(socket.getOutputStream());
            LanProtocol.write(output,ticket==null
                    ?"JOIN|1|"+(ghost?"GHOST":"HUNTER")+"|"+nickname+(ownerCredential.isEmpty()?(password.isEmpty()?"":"|"+password):"|"+password+"|"+ownerCredential)
                    :"RESUME|1|"+ticket.seat()+"|"+ticket.token());
            String response=LanProtocol.read(input);
            var parts=LanProtocol.parts(response);
            if((parts.size()!=3&&parts.size()!=4&&parts.size()!=5)||!parts.get(0).equals("WELCOME"))
                throw new IOException("join failed: "+response);
            if(parts.size()>=4){
                if(!parts.get(3).matches("[0-9a-f]{48}"))throw new IOException("invalid session credential");
                resumeKey=parts.get(3); // Never send this secret to the UI event log.
                if(parts.size()==5)hostSequence=LanProtocol.sequence(parts.get(4));
            }
            assigned=parts.get(1);
            if(!(assigned.equals("GHOST")||assigned.matches("H[1-6]")))throw new IOException("invalid host seat");
            if(ticket!=null&&!assigned.equals(ticket.seat()))throw new IOException("reconnect seat mismatch");
            if(ticket!=null&&resumeKey==null)throw new IOException("server did not accept reconnect credentials");
            socket.setSoTimeout(0);
        }catch(Exception error){try{socket.close();}catch(IOException ignored){}if(error instanceof IOException ioe)throw ioe;throw new IOException("invalid join response",error);}
        in=input;out=output;seat=assigned;
        sequence=Math.max(ticket==null?0:ticket.nextSequence(),hostSequence);
        reader=new Thread(this::readLoop,"beckenburg-client-events");reader.setDaemon(true);reader.start();
    }
    public String seat(){return seat;}
    public LanVoiceClientAudio voice(){return voice;}
    private void setupVoice(String packet){
        var fields=LanProtocol.parts(packet);
        if(fields.size()!=3)throw new IllegalArgumentException("bad voice offer");
        int port=LanProtocol.integer(fields.get(1),1,65535);
        int position=seat.equals("GHOST")?6:Integer.parseInt(seat.substring(1))-1;
        try{
            LanVoiceClientAudio active=new LanVoiceClientAudio(socket.getInetAddress(),
                port,fields.get(2),position,observer);
            LanVoiceClientAudio previous=voice;
            voice=active;
            if(previous!=null)previous.close();
        }catch(SocketException|IllegalArgumentException error){
            observer.accept("INFO|Voice link unavailable: "+error.getMessage());
        }
    }
    public synchronized void ready()throws IOException {send("READY");}
    public synchronized void lobbyChat(String message)throws IOException{
        send("LOBBYCHAT|"+LanChat.clean(message));
    }
    public synchronized void start()throws IOException {send("START");}
    public synchronized void move(int room)throws IOException {send("MOVE|"+room+"|"+(++sequence));}
    public synchronized void view3D()throws IOException {send("VIEW3D");}
    public synchronized void viewGhost3D()throws IOException {send("GVIEW3D");}
    public synchronized void ghostStep(int dx,int dz)throws IOException {send("GSTEP|"+dx+"|"+dz+"|"+(++sequence));}
    public synchronized void ghostTurn(int degrees)throws IOException {send("GTURN|"+degrees+"|"+(++sequence));}
    public synchronized void step(int dx,int dz)throws IOException {step(dx,dz,false);}
    public synchronized void step(int dx,int dz,boolean running)throws IOException {
        send("STEP|"+dx+"|"+dz+"|"+(running?1:0)+"|"+(++sequence));
    }
    public synchronized void vanMonitor()throws IOException {send("VANMON|"+(++sequence));}
    public synchronized void hide()throws IOException {send("HIDE|"+(++sequence));}
    public synchronized void purchaseSupply(FieldSupplies.Kind kind,FieldSupplies.Tier tier)throws IOException{
        Objects.requireNonNull(kind);Objects.requireNonNull(tier);
        send("BUY|"+kind+"|"+tier+"|"+(++sequence));
    }
    public synchronized void useSupply(FieldSupplies.Kind kind,FieldSupplies.Tier tier)throws IOException{
        Objects.requireNonNull(kind);Objects.requireNonNull(tier);
        send("USESUPPLY|"+kind+"|"+tier+"|"+(++sequence));
    }
    public synchronized void turn(int degrees)throws IOException {send("TURN|"+degrees+"|"+(++sequence));}
    public synchronized void door()throws IOException {send("DOOR|"+(++sequence));}
    public synchronized void vanDoor()throws IOException {send("VANDOOR|"+(++sequence));}
    public synchronized void light()throws IOException {send("LIGHT|"+(++sequence));}
    public synchronized void power()throws IOException {send("POWER|"+(++sequence));}
    public synchronized void scan(LanCase.Tool tool)throws IOException {
        Objects.requireNonNull(tool);send("SCAN|"+tool+"|"+(++sequence));
    }
    /** Private equipment rack transactions; the host alone owns stock/tier and funds. */
    public synchronized void equipmentState()throws IOException{send("GEARSTATE");}
    public synchronized void serviceEquipment()throws IOException{
        send("GEARREFILL|"+(++sequence));
    }
    public synchronized void buyEquipment(String id,EquipmentTiers.Tier tier)throws IOException{
        EquipmentRegistry.get(id);Objects.requireNonNull(tier);
        send("GEARBUY|"+id+"|"+tier+"|"+(++sequence));
    }
    public synchronized void equipAt(int slot,String id)throws IOException{
        EquipmentRegistry.get(id);
        if(slot<0||slot>=FieldEquipment.SLOTS)throw new IllegalArgumentException("slot 1-4");
        send("GEAREQUIP|"+slot+"|"+id+"|"+(++sequence));
    }
    public synchronized void selectGearSlot(int slot)throws IOException{
        if(slot<0||slot>=FieldEquipment.SLOTS)throw new IllegalArgumentException("slot 1-4");
        send("GEARSLOT|"+slot+"|"+(++sequence));
    }
    public synchronized void useHeldEquipment()throws IOException{
        send("GEARUSE|"+(++sequence));
    }
    public synchronized void playRecording()throws IOException{
        send("RECPLAY|"+(++sequence));
    }
    public synchronized void journal()throws IOException {send("JOURNAL");}
    public synchronized void say(LanChat.Channel channel,String message)throws IOException{
        Objects.requireNonNull(channel);
        send("SAY|"+channel+"|"+LanChat.clean(message)+"|"+(++sequence));
    }
    public synchronized void note(GhostFieldGuide.Clue clue,FieldJournal.Status status)throws IOException{
        Objects.requireNonNull(clue);Objects.requireNonNull(status);
        send("NOTE|"+clue+"|"+status+"|"+(++sequence));
    }
    public synchronized void identify(GhostIdentity.Type type)throws IOException{
        Objects.requireNonNull(type);send("IDENTIFY|"+type+"|"+(++sequence));
    }
    public synchronized void banish()throws IOException {send("BANISH|"+(++sequence));}
    public synchronized void absolve()throws IOException {send("ABSOLVE|"+(++sequence));}
    /** Only a kind name and replay-protected sequence cross the wire; trajectory is host-owned. */
    public synchronized void deploy(HunterCounters.Kind kind)throws IOException {
        Objects.requireNonNull(kind);send("DEPLOY|"+kind+"|"+(++sequence));
    }
    public synchronized void scanUv()throws IOException {send("UVSCAN|"+(++sequence));}
    public synchronized void placeBook()throws IOException {send("PLACEBOOK|"+(++sequence));}
    public synchronized void readBook()throws IOException {send("READBOOK|"+(++sequence));}
    public synchronized void takeBook()throws IOException {send("TAKEBOOK|"+(++sequence));}
    public synchronized void ward()throws IOException {send("WARD|"+(++sequence));}
    public synchronized void cleanse()throws IOException {send("CLEANSE|"+(++sequence));}
    public synchronized void extract()throws IOException {send("EXTRACT|"+(++sequence));}
    public synchronized void ghost(GhostDomain.Action action,int room)throws IOException {
        Objects.requireNonNull(action);send("GHOST|"+action+"|"+room+"|"+(++sequence));
    }
    public synchronized void send(String message)throws IOException {
        if(closed||leaving)throw new IOException("LAN connection closed");LanProtocol.write(out,message);
    }
    private void readLoop(){
        try{
            while(!closed){
                String line=LanProtocol.read(in);
                if(line==null)break; // Clean remote EOF still ends the connection.
                if(leaving)continue; // Drain pending host bytes until its acknowledged TCP EOF.
                LanProtocol.parts(line);
                if(line.startsWith("PING|")){
                    var fields=LanProtocol.parts(line);
                    if(fields.size()!=2)throw new IOException("invalid host heartbeat");
                    int challenge=LanProtocol.integer(fields.get(1),0,99999999);
                    synchronized(this){if(!leaving)send("PONG|"+challenge);}
                    continue;
                }
                if(line.startsWith("NETSTATS|")){
                    var fields=LanProtocol.parts(line);
                    if(fields.size()!=2)throw new IOException("invalid connection telemetry");
                    latencyMillis=LanProtocol.integer(fields.get(1),0,60000);
                    continue;
                }
                if(line.startsWith("VOICEKEY|")){
                    // The UDP key is secret protocol control data, never a UI/log packet.
                    setupVoice(line);
                    continue;
                }
                observer.accept(line);
            }
        }catch(Exception ex){
            // Truncated, malformed or interrupted input shares the same terminal event.
        }finally{
            if(!closed&&!leaving){
                try{observer.accept("INFO|network connection ended");}
                catch(RuntimeException ignored){ /* A failing UI callback cannot prevent socket cleanup. */ }
            }
            cleanup(false);
        }
    }
    @Override public void close(){cleanup(true);}
    private synchronized void cleanup(boolean intentional){
        if(closed)return;
        // A normal UI Exit is different from an unexpected EOF: deliberate departure
        // frees the seat; network failure leaves a time-limited host reservation.
        if(intentional){
            if(leaving)return;
            leaving=true;
            try{
                LanProtocol.write(out,"LEAVE");
                socket.shutdownOutput();
                LanVoiceClientAudio media=voice;voice=null;
                if(media!=null)media.close();
                // The reader drains unread updates so Windows cannot reset the
                // connection and discard LEAVE. Unresponsive hosts are bounded.
                java.util.concurrent.CompletableFuture.delayedExecutor(1,
                    java.util.concurrent.TimeUnit.SECONDS).execute(()->cleanup(false));
                return;
            }catch(IOException ignored){ /* Broken transports still close immediately. */ }
        }
        closed=true;
        LanVoiceClientAudio media=voice;voice=null;
        if(media!=null)media.close();
        try{socket.close();}catch(IOException ignored){}
    }
}
