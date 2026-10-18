package org.beckenburg;

import java.net.*;
import java.util.concurrent.*;

/** Real datagram sockets, without relying on microphone or playback hardware. */
public final class LanVoiceRelayTest {
    static void ok(boolean good,String why){if(!good)throw new AssertionError(why);}
    static void send(DatagramSocket socket,int port,LanVoicePacket.Frame frame)throws Exception{
        byte[] data=frame.wire();
        socket.send(new DatagramPacket(data,data.length,InetAddress.getLoopbackAddress(),port));
    }
    static LanVoicePacket.Frame read(DatagramSocket socket)throws Exception{
        byte[] bytes=new byte[LanVoicePacket.MAX_BYTES+1];
        DatagramPacket p=new DatagramPacket(bytes,bytes.length);socket.receive(p);
        return LanVoicePacket.decode(p.getData(),p.getOffset(),p.getLength());
    }
    static LanVoicePacket.Frame frame(int kind,int seat,long[] key,int sequence,byte[] sound){
        return new LanVoicePacket.Frame(kind,seat,LanChat.Channel.LOCAL,
            sequence,key[0],key[1],100,sound);
    }
    public static void main(String[] args)throws Exception{
        InetAddress loop=InetAddress.getLoopbackAddress();
        BlockingQueue<LanVoicePacket.Frame> inbound=new LinkedBlockingQueue<>();
        try(LanVoiceRelay host=new LanVoiceRelay(loop,0,(seat,frame)->{
                if(seat==0)inbound.offer(frame);
            });
            DatagramSocket speaker=new DatagramSocket();
            DatagramSocket listener=new DatagramSocket();
            DatagramSocket ghost=new DatagramSocket()){
            speaker.setSoTimeout(1200);listener.setSoTimeout(1200);ghost.setSoTimeout(1200);
            long[] first=LanVoicePacket.parseToken(host.register(0,loop));
            long[] second=LanVoicePacket.parseToken(host.register(1,loop));
            long[] spectral=LanVoicePacket.parseToken(host.register(6,loop));
            send(speaker,host.port(),frame(LanVoicePacket.HELLO,0,first,0,new byte[0]));
            ok(read(speaker).kind()==LanVoicePacket.ACK,"valid speaker handshake");
            send(listener,host.port(),frame(LanVoicePacket.HELLO,1,second,0,new byte[0]));
            ok(read(listener).kind()==LanVoicePacket.ACK,"valid recipient handshake");
            send(ghost,host.port(),frame(LanVoicePacket.HELLO,255,spectral,0,new byte[0]));
            ok(read(ghost).kind()==LanVoicePacket.ACK,"anonymous ghost playback handshake");
            byte[] audio=new byte[LanVoicePacket.SAMPLES];
            java.util.Arrays.fill(audio,(byte)0xa7);
            send(speaker,host.port(),frame(LanVoicePacket.AUDIO,0,
                new long[]{first[0],first[1]+1},1,audio));
            ok(inbound.poll(140,TimeUnit.MILLISECONDS)==null,"wrong token cannot inject audio");
            send(speaker,host.port(),frame(LanVoicePacket.AUDIO,0,first,2,audio));
            var valid=inbound.poll(1200,TimeUnit.MILLISECONDS);
            ok(valid!=null&&valid.sequence()==2,"real speaker audio routed");
            host.forward(1,0,valid,68);
            var received=read(listener);
            ok(received.kind()==LanVoicePacket.AUDIO&&received.seat()==0&&
                received.gain()==68&&java.util.Arrays.equals(received.samples(),audio),
                "legitimate hunter hears routed frame");
            ok(received.tokenHi()==second[0]&&received.tokenLo()==second[1],
                "recipient-specific UDP session key");
            host.forward(6,0,valid,48);
            var anonymized=read(ghost);
            ok(LanVoicePacket.ghostStream(anonymized.seat())&&anonymized.gain()==48,
                "spectral receiver gets pseudonymous audio, not real hunter seat");
            host.forward(6,1,valid,41);
            var secondVoice=read(ghost);
            ok(LanVoicePacket.ghostStream(secondVoice.seat())
                &&secondVoice.seat()!=anonymized.seat(),
                "two investigators use distinct anonymous mixer streams");
            send(speaker,host.port(),frame(LanVoicePacket.AUDIO,0,first,2,audio));
            ok(inbound.poll(200,TimeUnit.MILLISECONDS)==null,"sequence replay rejected");
            send(ghost,host.port(),frame(LanVoicePacket.AUDIO,255,spectral,1,audio));
            ok(inbound.poll(200,TimeUnit.MILLISECONDS)==null,"ghost cannot inject hunter voice");
            host.unregister(1);
            ok(!host.ready(1),"disconnect revokes voice session");
            System.out.println("PASS: real UDP handshake, spoof/replay protection and ghost anonymity");
        }
    }
}
