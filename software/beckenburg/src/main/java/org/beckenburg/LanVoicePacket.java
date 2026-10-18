package org.beckenburg;

import java.nio.ByteBuffer;
import java.util.Locale;

/** Binary, bounded LAN voice datagrams, entirely separate from ASCII game frames.
 * Session keys prevent casual forged UDP injection; this is NOT encrypted transport.
 */
public final class LanVoicePacket {
    public static final int MAGIC=0x424b5651, VERSION=1;
    public static final int HELLO=0, AUDIO=1, ACK=2, ANONYMOUS=255;
    public static final int SAMPLE_RATE=8000, SAMPLES=160, HEADER=31;
    public static final int MAX_BYTES=HEADER+SAMPLES;
    private LanVoicePacket(){ }
    public record Frame(int kind,int seat,LanChat.Channel channel,int sequence,
                        long tokenHi,long tokenLo,int gain,byte[] samples) {
        public Frame {
            if(kind<HELLO||kind>ACK||seat<0||(seat>5&&seat!=ANONYMOUS)
                ||channel==null||sequence<0||gain<0||gain>100
                ||samples==null||samples.length!=(kind==AUDIO?SAMPLES:0))
                throw new IllegalArgumentException("invalid voice datagram");
            samples=samples.clone();
        }
        @Override public byte[] samples(){return samples.clone();}
        public byte[] wire(){
            ByteBuffer b=ByteBuffer.allocate(HEADER+samples.length);
            b.putInt(MAGIC).put((byte)VERSION).put((byte)kind).put((byte)seat)
                .put((byte)channel.ordinal()).putInt(sequence)
                .putLong(tokenHi).putLong(tokenLo).put((byte)gain)
                .putShort((short)samples.length).put(samples);
            return b.array();
        }
    }
    public static Frame decode(byte[] wire,int offset,int length){
        if(wire==null||offset<0||length<HEADER||length>MAX_BYTES
            ||offset>wire.length-length)throw new IllegalArgumentException("invalid voice packet size");
        ByteBuffer b=ByteBuffer.wrap(wire,offset,length);
        if(b.getInt()!=MAGIC||Byte.toUnsignedInt(b.get())!=VERSION)
            throw new IllegalArgumentException("invalid voice protocol");
        int kind=Byte.toUnsignedInt(b.get()),seat=Byte.toUnsignedInt(b.get());
        int channel=Byte.toUnsignedInt(b.get());
        if(channel>=LanChat.Channel.values().length)
            throw new IllegalArgumentException("invalid voice channel");
        int sequence=b.getInt();
        long hi=b.getLong(),lo=b.getLong();
        int gain=Byte.toUnsignedInt(b.get()),size=Short.toUnsignedInt(b.getShort());
        if(size!=b.remaining())throw new IllegalArgumentException("invalid voice payload length");
        byte[] payload=new byte[size];b.get(payload);
        return new Frame(kind,seat,LanChat.Channel.values()[channel],
            sequence,hi,lo,gain,payload);
    }
    public static String token(long hi,long lo){
        return String.format(Locale.ROOT,"%016x%016x",hi,lo);
    }
    public static long[] parseToken(String value){
        if(value==null||!value.matches("[0-9a-f]{32}"))
            throw new IllegalArgumentException("invalid voice session key");
        return new long[]{Long.parseUnsignedLong(value.substring(0,16),16),
                          Long.parseUnsignedLong(value.substring(16),16)};
    }
}
