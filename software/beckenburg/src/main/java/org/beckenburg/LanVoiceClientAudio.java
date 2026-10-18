package org.beckenburg;

import javax.sound.sampled.*;
import java.io.IOException;
import java.net.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;

/** JavaSound mic capture and playback, 20ms G.711 packets over host-bound LAN UDP.
 * Push-to-talk opens capture only while pressed. Ghost seats are receive-only.
 * Mic/voice is disabled on closed/untrusted networks until encrypted media arrives.
 */
public final class LanVoiceClientAudio implements AutoCloseable {
    private static final AudioFormat FORMAT=new AudioFormat(
        LanVoicePacket.SAMPLE_RATE,16,1,true,false);
    private final DatagramSocket udp;
    private final InetSocketAddress server;
    private final long hi,lo;
    private final int seat;
    private final Consumer<String> status;
    private final Thread receiver,capture,playback;
    private final AtomicInteger sequence=new AtomicInteger();
    private final Object pushLock=new Object(),queueLock=new Object();
    private final Map<Integer,ArrayDeque<LanVoicePacket.Frame>> buffers=new HashMap<>();
    private final int[] lastHeard=new int[256];
    private volatile LanChat.Channel transmit;
    private volatile boolean closed,connected,muted;
    private volatile int playbackVolume=80;
    private volatile Mixer.Info selectedMicrophone;
    public static java.util.List<Mixer.Info> microphones(){
        var compatible=new java.util.ArrayList<Mixer.Info>();
        DataLine.Info requirement=new DataLine.Info(TargetDataLine.class,FORMAT);
        for(Mixer.Info device:AudioSystem.getMixerInfo()){
            try{if(AudioSystem.getMixer(device).isLineSupported(requirement))
                compatible.add(device);}
            catch(IllegalArgumentException|SecurityException ignored){/* Device disappeared. */}
        }
        return java.util.List.copyOf(compatible);
    }
    public void selectMicrophone(Mixer.Info device){
        if(device==null){selectedMicrophone=null;return;}
        for(Mixer.Info available:microphones()){
            if(available.getName().equals(device.getName())
                &&available.getVendor().equals(device.getVendor())
                &&available.getVersion().equals(device.getVersion())){
                selectedMicrophone=available;return;
            }
        }
        throw new IllegalArgumentException("microphone no longer available");
    }
    public Mixer.Info selectedMicrophone(){return selectedMicrophone;}
    private volatile TargetDataLine microphone;
    private volatile SourceDataLine speaker;
    private long lastHelloNanos;

    public LanVoiceClientAudio(InetAddress host,int port,String token,int seat,
                                Consumer<String> status)throws SocketException{
        if(port<1||port>65535||seat<0||seat>6)
            throw new IllegalArgumentException("invalid voice connection");
        this.seat=seat;this.status=Objects.requireNonNull(status);
        long[] key=LanVoicePacket.parseToken(token);hi=key[0];lo=key[1];
        server=new InetSocketAddress(Objects.requireNonNull(host),port);
        udp=new DatagramSocket();
        udp.setSoTimeout(250);
        Arrays.fill(lastHeard,-1);
        receiver=thread("beckenburg-voice-recv",this::receiveLoop);
        capture=thread("beckenburg-voice-microphone",this::captureLoop);
        playback=thread("beckenburg-voice-playback",this::playbackLoop);
        receiver.start();capture.start();playback.start();
    }
    private static Thread thread(String name,Runnable action){
        Thread t=new Thread(action,name);t.setDaemon(true);return t;
    }
    public boolean connected(){return connected&&!closed;}
    public boolean transmitting(){return transmit!=null&&!muted&&connected&&!closed;}
    public void setMuted(boolean value){
        muted=value;if(value)setPushToTalk(null);
    }
    public boolean muted(){return muted;}
    public void setPlaybackVolume(int percent){
        if(percent<0||percent>100)throw new IllegalArgumentException("voice volume 0-100");
        playbackVolume=percent;
    }
    public int playbackVolume(){return playbackVolume;}
    public void setPushToTalk(LanChat.Channel channel){
        if(seat==6&&channel!=null)throw new IllegalArgumentException("ghost cannot transmit hunter voice");
        synchronized(pushLock){
            transmit=muted||closed?null:channel;
            pushLock.notifyAll();
        }
        if(channel==null){
            TargetDataLine line=microphone;
            if(line!=null)line.stop();
        }
    }
    private int wireSeat(){return seat==6?LanVoicePacket.ANONYMOUS:seat;}
    private void send(LanVoicePacket.Frame f)throws IOException{
        byte[] bytes=f.wire();
        udp.send(new DatagramPacket(bytes,bytes.length,server));
    }
    private void hello(){
        try{
            send(new LanVoicePacket.Frame(LanVoicePacket.HELLO,wireSeat(),
                LanChat.Channel.LOCAL,0,hi,lo,100,new byte[0]));
        }catch(IOException ignored){/* UDP is retryable. */}
    }
    private void receiveLoop(){
        byte[] raw=new byte[LanVoicePacket.MAX_BYTES+1];
        while(!closed){
            if(!connected&&System.nanoTime()-lastHelloNanos>750_000_000L){
                lastHelloNanos=System.nanoTime();hello();
            }
            try{
                DatagramPacket packet=new DatagramPacket(raw,raw.length);
                udp.receive(packet);
                if(!server.getAddress().equals(packet.getAddress())||
                   server.getPort()!=packet.getPort())continue;
                LanVoicePacket.Frame frame;
                try{frame=LanVoicePacket.decode(raw,packet.getOffset(),packet.getLength());}
                catch(IllegalArgumentException invalid){continue;}
                if(frame.tokenHi()!=hi||frame.tokenLo()!=lo)continue;
                if(frame.kind()==LanVoicePacket.ACK){
                    if(!connected){connected=true;status.accept("VOICE LINK READY (LOCAL LAN)");}
                    continue;
                }
                if(!connected||frame.kind()!=LanVoicePacket.AUDIO||
                   frame.seat()==seat)continue;
                synchronized(queueLock){
                    if(frame.sequence()<=lastHeard[frame.seat()])continue;
                    lastHeard[frame.seat()]=frame.sequence();
                    ArrayDeque<LanVoicePacket.Frame> queue=
                        buffers.computeIfAbsent(frame.seat(),id->new ArrayDeque<>(4));
                    if(queue.size()==4)queue.pollFirst();
                    queue.addLast(frame);
                }
            }catch(SocketTimeoutException ignored){ /* Handshake and receive continue. */ }
            catch(SocketException closedSocket){break;}
            catch(IOException error){if(!closed)status.accept("VOICE UDP: "+error.getMessage());}
        }
    }
    private void captureLoop(){
        while(!closed){
            LanChat.Channel mode;
            synchronized(pushLock){
                while(!closed&&(transmit==null||!connected)){
                    try{pushLock.wait(100);}catch(InterruptedException ex){if(closed)return;}
                }
                if(closed)return;
                mode=transmit;
            }
            TargetDataLine line=null;
            try{
                Mixer.Info configured=selectedMicrophone;
                line=configured==null?AudioSystem.getTargetDataLine(FORMAT):
                    AudioSystem.getTargetDataLine(FORMAT,configured);
                line.open(FORMAT,LanVoicePacket.SAMPLES*2*6);
                microphone=line;
                line.start();
                byte[] pcm=new byte[LanVoicePacket.SAMPLES*2];
                while(!closed&&connected&&!muted&&transmit==mode){
                    int used=0;
                    while(used<pcm.length&&!closed&&transmit==mode){
                        int count=line.read(pcm,used,pcm.length-used);
                        if(count<=0)break;
                        used+=count;
                    }
                    if(used!=pcm.length||closed||transmit!=mode)continue;
                    int seq=sequence.incrementAndGet();
                    if(seq<0){sequence.set(1);seq=1;}
                    send(new LanVoicePacket.Frame(LanVoicePacket.AUDIO,seat,mode,
                        seq,hi,lo,100,LanVoiceCodec.encodePcm(pcm)));
                }
            }catch(LineUnavailableException|IllegalArgumentException|SecurityException missing){
                status.accept("VOICE MICROPHONE UNAVAILABLE: "+missing.getMessage());
                setPushToTalk(null);
            }catch(IOException io){
                if(!closed)status.accept("VOICE CAPTURE STOPPED: "+io.getMessage());
            }finally{
                microphone=null;
                if(line!=null){line.stop();line.close();}
            }
        }
    }
    private void playbackLoop(){
        SourceDataLine output=null;
        try{
            output=AudioSystem.getSourceDataLine(FORMAT);
            output.open(FORMAT,LanVoicePacket.SAMPLES*2*8);
            speaker=output;
            output.start();
            byte[] mixed=new byte[LanVoicePacket.SAMPLES*2];
            while(!closed){
                int[] sums=new int[LanVoicePacket.SAMPLES];
                synchronized(queueLock){
                    for(ArrayDeque<LanVoicePacket.Frame> q:buffers.values()){
                        LanVoicePacket.Frame packet=q.pollFirst();
                        if(packet==null)continue;
                        byte[] samples=packet.samples();
                        int gain=packet.gain()*playbackVolume/100;
                        for(int i=0;i<samples.length;i++)
                            sums[i]+=LanVoiceCodec.decode(samples[i])*gain/100;
                    }
                }
                for(int i=0;i<sums.length;i++){
                    int value=Math.max(Short.MIN_VALUE,Math.min(Short.MAX_VALUE,sums[i]));
                    mixed[i*2]=(byte)value;mixed[i*2+1]=(byte)(value>>8);
                }
                output.write(mixed,0,mixed.length);
            }
        }catch(LineUnavailableException|IllegalArgumentException|SecurityException missing){
            if(!closed)status.accept("VOICE SPEAKER UNAVAILABLE: "+missing.getMessage());
        }finally{
            speaker=null;
            if(output!=null){output.stop();output.close();}
        }
    }
    @Override public void close(){
        if(closed)return;
        closed=true;transmit=null;
        synchronized(pushLock){pushLock.notifyAll();}
        udp.close();
        TargetDataLine mic=microphone;
        if(mic!=null){mic.stop();mic.close();}
        SourceDataLine out=speaker;
        if(out!=null){out.stop();out.close();}
        receiver.interrupt();capture.interrupt();playback.interrupt();
        synchronized(queueLock){buffers.clear();}
    }
}
