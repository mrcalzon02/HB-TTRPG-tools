package org.beckenburg;

import java.io.IOException;
import java.net.*;
import java.security.SecureRandom;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

/** Datagram relay for trusted LAN games. TCP-issued 128-bit random session tokens,
 * source-IP checks, pinned UDP endpoint, replay rejection and bounded payloads.
 * WARNING: tokens are not encryption. Do not expose this transport on untrusted WANs.
 */
public final class LanVoiceRelay implements AutoCloseable {
    public interface Router { void route(int hunterSeat,LanVoicePacket.Frame voice); }
    private static final class Session {
        final InetAddress ip;
        final long hi,lo;
        volatile InetSocketAddress endpoint;
        int lastSequence=-1;
        long lastFrameNanos;
        Session(InetAddress ip,long hi,long lo){this.ip=ip;this.hi=hi;this.lo=lo;}
    }
    private final DatagramSocket udp;
    private final ConcurrentHashMap<Integer,Session> sessions=new ConcurrentHashMap<>();
    private final SecureRandom random=new SecureRandom();
    private final Router router;
    private final Thread worker;
    private volatile boolean closed;

    public LanVoiceRelay(InetAddress bind,int port,Router route)throws SocketException {
        if(port<0||port>65535)throw new IllegalArgumentException("voice port out of range");
        router=Objects.requireNonNull(route);
        udp=new DatagramSocket(new InetSocketAddress(Objects.requireNonNull(bind),port));
        worker=new Thread(this::serve,"beckenburg-voice-udp");
        worker.setDaemon(true);worker.start();
    }
    public int port(){return udp.getLocalPort();}
    /** Called ONLY after the TCP peer has been authorized for a playable 3D view. */
    public String register(int seat,InetAddress ip){
        if(seat<0||seat>6)throw new IllegalArgumentException("invalid voice participant");
        long hi=random.nextLong(),lo=random.nextLong();
        sessions.put(seat,new Session(Objects.requireNonNull(ip),hi,lo));
        return LanVoicePacket.token(hi,lo);
    }
    public void unregister(int seat){sessions.remove(seat);}
    public boolean ready(int seat){
        Session s=sessions.get(seat);
        return s!=null&&s.endpoint!=null;
    }
    private void serve(){
        byte[] buffer=new byte[LanVoicePacket.MAX_BYTES+1];
        while(!closed){
            try{
                DatagramPacket p=new DatagramPacket(buffer,buffer.length);
                udp.receive(p);
                LanVoicePacket.Frame frame;
                try{frame=LanVoicePacket.decode(p.getData(),p.getOffset(),p.getLength());}
                catch(IllegalArgumentException invalid){continue;}
                int seat=frame.seat()==LanVoicePacket.ANONYMOUS?6:frame.seat();
                Session session=sessions.get(seat);
                if(session==null||!session.ip.equals(p.getAddress())
                    ||session.hi!=frame.tokenHi()||session.lo!=frame.tokenLo())continue;
                InetSocketAddress sender=new InetSocketAddress(p.getAddress(),p.getPort());
                if(frame.kind()==LanVoicePacket.HELLO){
                    session.endpoint=sender;
                    var ack=new LanVoicePacket.Frame(LanVoicePacket.ACK,frame.seat(),
                        LanChat.Channel.LOCAL,0,session.hi,session.lo,100,new byte[0]);
                    send(sender,ack);
                    continue;
                }
                if(frame.kind()!=LanVoicePacket.AUDIO||seat==6)continue;
                boolean permitted;
                synchronized(session){
                    long now=System.nanoTime();
                    permitted=sender.equals(session.endpoint)
                        &&frame.sequence()>session.lastSequence
                        &&(session.lastFrameNanos==0||now-session.lastFrameNanos>=8_000_000L);
                    if(permitted){
                        session.lastSequence=frame.sequence();
                        session.lastFrameNanos=now;
                    }
                }
                if(permitted)router.route(seat,frame);
            }catch(SocketException e){if(!closed)System.err.println("Voice UDP failure: "+e.getMessage());break;}
            catch(IOException | IllegalArgumentException e){if(!closed)System.err.println("Voice datagram dropped: "+e.getMessage());}
            catch(RuntimeException e){if(!closed)System.err.println("Voice routing rejected: "+e.getMessage());}
        }
    }
    /** Called only after authoritative recipient routing. No sender address is leaked. */
    public void forward(int destination,int source,LanVoicePacket.Frame voice,int gain){
        if(gain<=0||gain>100||source<0||source>=6)
            throw new IllegalArgumentException("invalid voice forwarding");
        Session target=sessions.get(destination);
        if(target==null||target.endpoint==null)return;
        int label=destination==6?LanVoicePacket.ANONYMOUS:source;
        var frame=new LanVoicePacket.Frame(LanVoicePacket.AUDIO,label,voice.channel(),
            voice.sequence(),target.hi,target.lo,gain,voice.samples());
        try{send(target.endpoint,frame);}catch(IOException e){/* Closed UDP endpoint: discard frame. */}
    }
    private void send(InetSocketAddress target,LanVoicePacket.Frame frame)throws IOException{
        byte[] bytes=frame.wire();
        udp.send(new DatagramPacket(bytes,bytes.length,target));
    }
    @Override public void close(){
        closed=true;sessions.clear();udp.close();worker.interrupt();
    }
}
