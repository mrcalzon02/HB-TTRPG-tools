package org.beckenburg;

import java.net.InetAddress;
import java.util.concurrent.*;

/** Full media client handshake and microphone privacy without sound hardware. */
public final class LanVoiceClientHandshakeTest {
    private static void ok(boolean x,String msg){if(!x)throw new AssertionError(msg);}
    public static void main(String[] args)throws Exception{
        InetAddress loop=InetAddress.getLoopbackAddress();
        try(LanVoiceRelay relay=new LanVoiceRelay(loop,0,(seat,frame)->{})){
            String hunterKey=relay.register(0,loop);
            BlockingQueue<String> status=new LinkedBlockingQueue<>();
            try(LanVoiceClientAudio client=new LanVoiceClientAudio(loop,relay.port(),hunterKey,0,status::offer)){
                long limit=System.nanoTime()+TimeUnit.SECONDS.toNanos(5);
                while(!client.connected()&&System.nanoTime()<limit)Thread.sleep(25);
                ok(client.connected()&&relay.ready(0),"client voice negotiated via session token");
                client.setMuted(true);
                client.setPushToTalk(LanChat.Channel.LOCAL);
                ok(!client.transmitting(),"muted microphone never transmits");
                client.setPushToTalk(null);
                client.setPlaybackVolume(27);
                ok(client.playbackVolume()==27,"volume retained");
                ok(!status.isEmpty(),"connection or missing hardware status reported");
            }
            String ghostKey=relay.register(6,loop);
            try(LanVoiceClientAudio ghost=new LanVoiceClientAudio(loop,relay.port(),ghostKey,6,status::offer)){
                try{ghost.setPushToTalk(LanChat.Channel.RADIO);
                    throw new AssertionError("ghost opened hunter radio");
                }catch(IllegalArgumentException expected){}
            }
            System.out.println("PASS: real voice client UDP handshake, mute, volume and spectral TX lock");
        }
    }
}
