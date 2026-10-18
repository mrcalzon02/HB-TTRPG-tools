package org.beckenburg;

public final class LanVoiceCodecTest {
    static void ok(boolean yes,String why){if(!yes)throw new AssertionError(why);}
    static void rejects(Runnable call){
        try{call.run();throw new AssertionError("invalid audio accepted");}
        catch(IllegalArgumentException expected){}
    }
    public static void main(String[] args){
        byte[] sound=new byte[LanVoicePacket.SAMPLES*2];
        for(int i=0;i<LanVoicePacket.SAMPLES;i++){
            short value=(short)(16000*Math.sin(i*Math.PI*2*220/LanVoicePacket.SAMPLE_RATE));
            sound[i*2]=(byte)value;sound[i*2+1]=(byte)(value>>8);
        }
        byte[] encoded=LanVoiceCodec.encodePcm(sound),decoded=LanVoiceCodec.decodePcm(encoded);
        ok(encoded.length==LanVoicePacket.SAMPLES&&decoded.length==sound.length,
            "20ms codec framing");
        long squared=0,total=0;
        for(int i=0;i<LanVoicePacket.SAMPLES;i++){
            short original=(short)((sound[i*2]&255)|(sound[i*2+1]<<8));
            short recovered=(short)((decoded[i*2]&255)|(decoded[i*2+1]<<8));
            int delta=original-recovered;
            squared+=(long)delta*delta;total+=(long)original*original;
        }
        ok(squared*100<total*10,"speech codec should reproduce a test tone");
        byte[] empty=new byte[LanVoicePacket.SAMPLES];
        var raw=new LanVoicePacket.Frame(LanVoicePacket.AUDIO,5,LanChat.Channel.RADIO,
            97,-1L,0x105L,62,encoded);
        byte[] bits=raw.wire();
        var back=LanVoicePacket.decode(bits,0,bits.length);
        ok(back.kind()==LanVoicePacket.AUDIO&&back.seat()==5&&
            back.gain()==62&&back.sequence()==97&&back.channel()==LanChat.Channel.RADIO,
            "voice network header round trip");
        ok(java.util.Arrays.equals(back.samples(),encoded),"codec payload retained");
        encoded[0]^=17;
        ok(back.samples()[0]!=encoded[0],"packet ownership must copy the samples");
        long[] token=LanVoicePacket.parseToken(LanVoicePacket.token(-1,0x105));
        ok(token[0]==-1&&token[1]==0x105L,"unsigned session key round trip");
        rejects(()->LanVoicePacket.parseToken("short"));
        rejects(()->LanVoicePacket.decode(new byte[6],0,6));
        rejects(()->LanVoicePacket.decode(bits,0,bits.length-1));
        byte[] invalid=bits.clone();invalid[0]=1;
        rejects(()->LanVoicePacket.decode(invalid,0,invalid.length));
        rejects(()->new LanVoicePacket.Frame(LanVoicePacket.AUDIO,6,
            LanChat.Channel.LOCAL,1,0,0,100,empty));
        System.out.println("PASS: G.711 audio, bounded UDP frames, tokens and parser rejection");
    }
}
