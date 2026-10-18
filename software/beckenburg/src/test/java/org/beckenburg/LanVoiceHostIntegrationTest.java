package org.beckenburg;

import java.io.*;
import java.net.*;
import java.util.concurrent.*;

/** Host-level routing using live TCP seats and synthetic UDP audio, no mic hardware needed. */
public final class LanVoiceHostIntegrationTest {
    private static void ok(boolean pass,String reason){if(!pass)throw new AssertionError(reason);}
    private static final class Peer implements AutoCloseable{
        final Socket tcp=new Socket();
        final Reader in;
        final Writer out;
        final BlockingQueue<String> inbox=new LinkedBlockingQueue<>();
        final Thread reader;
        final String seat;
        int sequence;
        Peer(int port,boolean ghost,String nick)throws Exception{
            tcp.connect(new InetSocketAddress("127.0.0.1",port),2000);
            tcp.setSoTimeout(3500);
            in=LanProtocol.reader(tcp.getInputStream());
            out=LanProtocol.writer(tcp.getOutputStream());
            LanProtocol.write(out,"JOIN|1|"+(ghost?"GHOST":"HUNTER")+"|"+nick);
            String welcome=LanProtocol.read(in);
            if(!welcome.startsWith("WELCOME|"))throw new IOException(welcome);
            seat=LanProtocol.parts(welcome).get(1);
            tcp.setSoTimeout(0);
            reader=new Thread(()->{
                try{String packet;while((packet=LanProtocol.read(in))!=null)inbox.offer(packet);}
                catch(IOException ignored){}
            },"voice-fixture-"+nick);
            reader.setDaemon(true);reader.start();
        }
        void send(String message)throws Exception{LanProtocol.write(out,message);}
        String await(String prefix)throws Exception{
            long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(8);
            while(System.nanoTime()<deadline){
                String data=inbox.poll(100,TimeUnit.MILLISECONDS);
                if(data!=null&&data.startsWith(prefix))return data;
            }
            throw new AssertionError(seat+" missed "+prefix);
        }
        @Override public void close(){try{tcp.close();}catch(IOException ignored){}}
    }
    private static final class AudioPeer implements AutoCloseable{
        final DatagramSocket udp=new DatagramSocket();
        final long hi,lo;
        final int seat,port;
        final InetAddress host=InetAddress.getLoopbackAddress();
        AudioPeer(Peer control,int destinationPort)throws Exception{
            String offer=control.await("VOICEKEY|");
            var fields=LanProtocol.parts(offer);
            port=LanProtocol.integer(fields.get(1),1,65535);
            ok(port==destinationPort,"UDP uses game host's numeric port");
            long[] key=LanVoicePacket.parseToken(fields.get(2));hi=key[0];lo=key[1];
            seat=control.seat.equals("GHOST")?255:Integer.parseInt(control.seat.substring(1))-1;
            udp.setSoTimeout(600);
            emit(LanVoicePacket.HELLO,0,LanChat.Channel.LOCAL,new byte[0]);
            ok(read().kind()==LanVoicePacket.ACK,"valid handshake");
        }
        void emit(int kind,int seq,LanChat.Channel channel,byte[] payload)throws Exception{
            var frame=new LanVoicePacket.Frame(kind,seat,channel,seq,hi,lo,100,payload);
            byte[] data=frame.wire();
            udp.send(new DatagramPacket(data,data.length,host,port));
        }
        LanVoicePacket.Frame read()throws Exception{
            byte[] bytes=new byte[LanVoicePacket.MAX_BYTES+1];
            DatagramPacket packet=new DatagramPacket(bytes,bytes.length);
            udp.receive(packet);
            return LanVoicePacket.decode(packet.getData(),packet.getOffset(),packet.getLength());
        }
        void empty()throws Exception{
            try{read();throw new AssertionError("unexpected private voice received");}
            catch(SocketTimeoutException expected){}
        }
        @Override public void close(){udp.close();}
    }
    public static void main(String[] args)throws Exception{
        try(LanHost host=new LanHost("127.0.0.1",0,GhostIdentity.Type.SPIRIT,
                    CustomContract.standard(2));
            Peer van=new Peer(host.port(),false,"Van");
            Peer house=new Peer(host.port(),false,"House");
            Peer ghost=new Peer(host.port(),true,"Mystery")){
            van.send("READY");house.send("READY");ghost.send("READY");
            van.send("START");van.await("INFO|mission started");
            for(int room:new int[]{11,8,5,4}){
                house.send("MOVE|"+room+"|"+(++house.sequence));
                house.await("ACCEPT|MOVE|"+room);
            }
            van.send("VIEW3D");house.send("VIEW3D");ghost.send("GVIEW3D");
            try(AudioPeer distant=new AudioPeer(van,host.port());
                AudioPeer speaker=new AudioPeer(house,host.port());
                AudioPeer spectral=new AudioPeer(ghost,host.port())){
                byte[] tone=new byte[LanVoicePacket.SAMPLES];
                java.util.Arrays.fill(tone,(byte)0x9d);
                distant.emit(LanVoicePacket.AUDIO,1,LanChat.Channel.LOCAL,tone);
                speaker.empty();spectral.empty();
                distant.emit(LanVoicePacket.AUDIO,2,LanChat.Channel.RADIO,tone);
                ok(speaker.read().seat()==0,"van radio reaches hunter in house");
                spectral.empty(); // The safe van has no physical ghost-hearing source.
                speaker.emit(LanVoicePacket.AUDIO,1,LanChat.Channel.LOCAL,tone);
                ok(spectral.read().seat()==255,"nearby ghost hears anonymous hunter speech");
                distant.empty();
                speaker.emit(LanVoicePacket.AUDIO,2,LanChat.Channel.RADIO,tone);
                ok(distant.read().seat()==1,"house radio reaches distant van");
                ok(spectral.read().seat()==255,"ghost nearby hears the physical radio speaker");
                spectral.emit(LanVoicePacket.AUDIO,1,LanChat.Channel.RADIO,tone);
                distant.empty();
            }
            ok(host.running(),"synthetic voice cannot interrupt game mission");
            System.out.println("PASS: actual game host, local/van/radio routing, anonymous ghost audio");
        }
    }
}
