package org.beckenburg;

/** G.711 mu-law mono speech adapter: 8 kHz, 20 ms, 64 kbit/s.
 * Widely interoperable telephony format; no native DLL or third-party runtime.
 * Replace this isolated adapter with an Opus codec without changing host routing.
 */
public final class LanVoiceCodec {
    private static final int BIAS=0x84, CLIP=32635;
    private LanVoiceCodec(){ }
    public static byte encode(short value){
        int sample=value,sign=sample<0?0x80:0;
        if(sample<0)sample=-sample;
        sample=Math.min(CLIP,sample)+BIAS;
        int segment=7;
        for(int mask=0x4000;segment>0&&(sample&mask)==0;mask>>=1)segment--;
        int quantized=(sample>>(segment+3))&0xf;
        return (byte)(~(sign|(segment<<4)|quantized));
    }
    public static short decode(byte coded){
        int x=(~coded)&255;
        int sample=(((x&15)<<3)+BIAS)<<((x>>4)&7);
        return (short)((x&0x80)!=0?BIAS-sample:sample-BIAS);
    }
    public static byte[] encodePcm(byte[] littleEndian){
        if(littleEndian==null||littleEndian.length!=LanVoicePacket.SAMPLES*2)
            throw new IllegalArgumentException("20ms mono PCM required");
        byte[] ulaw=new byte[LanVoicePacket.SAMPLES];
        for(int i=0;i<ulaw.length;i++){
            int sample=(littleEndian[i*2]&255)|(littleEndian[i*2+1]<<8);
            ulaw[i]=encode((short)sample);
        }
        return ulaw;
    }
    public static byte[] decodePcm(byte[] ulaw){
        if(ulaw==null||ulaw.length!=LanVoicePacket.SAMPLES)
            throw new IllegalArgumentException("20ms G.711 speech required");
        byte[] pcm=new byte[ulaw.length*2];
        for(int i=0;i<ulaw.length;i++){
            short sample=decode(ulaw[i]);
            pcm[i*2]=(byte)sample;pcm[i*2+1]=(byte)(sample>>>8);
        }
        return pcm;
    }
}
