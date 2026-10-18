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
    private volatile LanVoiceClientAudio voice;
    private long sequence;

    public LanClient(String address,int port,boolean ghost,String nickname,Consumer<String> observer)throws IOException {
        this.observer=Objects.requireNonNull(observer);
        if(port<1||port>65535)throw new IllegalArgumentException("port out of bounds");
        LanProtocol.cleanName(nickname);
        Reader input=null;Writer output=null;String assigned=null;
        try{
            socket.connect(new InetSocketAddress(address,port),3000);
            socket.setTcpNoDelay(true);socket.setSoTimeout(5000);
            input=LanProtocol.reader(socket.getInputStream());output=LanProtocol.writer(socket.getOutputStream());
            LanProtocol.write(output,"JOIN|1|"+(ghost?"GHOST":"HUNTER")+"|"+nickname);
            String response=LanProtocol.read(input);
            var parts=LanProtocol.parts(response);
            if(parts.size()!=3||!parts.get(0).equals("WELCOME"))throw new IOException("join failed: "+response);
            assigned=parts.get(1);
            if(!(assigned.equals("GHOST")||assigned.matches("H[1-6]")))throw new IOException("invalid host seat");
            socket.setSoTimeout(0);
        }catch(Exception error){try{socket.close();}catch(IOException ignored){}if(error instanceof IOException ioe)throw ioe;throw new IOException("invalid join response",error);}
        in=input;out=output;seat=assigned;
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
    public synchronized void light()throws IOException {send("LIGHT|"+(++sequence));}
    public synchronized void power()throws IOException {send("POWER|"+(++sequence));}
    public synchronized void scan(LanCase.Tool tool)throws IOException {
        Objects.requireNonNull(tool);send("SCAN|"+tool+"|"+(++sequence));
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
    public synchronized void ward()throws IOException {send("WARD|"+(++sequence));}
    public synchronized void cleanse()throws IOException {send("CLEANSE|"+(++sequence));}
    public synchronized void extract()throws IOException {send("EXTRACT|"+(++sequence));}
    public synchronized void ghost(GhostDomain.Action action,int room)throws IOException {
        Objects.requireNonNull(action);send("GHOST|"+action+"|"+room+"|"+(++sequence));
    }
    public synchronized void send(String message)throws IOException {
        if(closed)throw new IOException("LAN connection closed");LanProtocol.write(out,message);
    }
    private void readLoop(){
        try{
            while(!closed){
                String line=LanProtocol.read(in);
                if(line==null)break; // Clean remote EOF still ends the connection.
                LanProtocol.parts(line);
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
            if(!closed){
                try{observer.accept("INFO|network connection ended");}
                catch(RuntimeException ignored){ /* A failing UI callback cannot prevent socket cleanup. */ }
            }
            close();
        }
    }
    @Override public void close(){
        if(closed)return;closed=true;
        LanVoiceClientAudio media=voice;voice=null;
        if(media!=null)media.close();
        try{socket.close();}catch(IOException ignored){}
    }
}