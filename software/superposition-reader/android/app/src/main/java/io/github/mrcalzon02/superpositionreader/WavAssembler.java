package io.github.mrcalzon02.superpositionreader;

import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.io.RandomAccessFile;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/** Stream compatible PCM WAV segments into a single ordinary RIFF/WAVE file. */
public final class WavAssembler {
    private static final long MAX_DATA = 3_800_000_000L;
    private WavAssembler() {}

    public static final class Header {
        public final int channels, sampleRate, bitsPerSample, byteRate, blockAlign;
        public final long dataOffset, dataLength;
        Header(int channels,int sampleRate,int bitsPerSample,int byteRate,int blockAlign,
               long dataOffset,long dataLength) {
            this.channels=channels;this.sampleRate=sampleRate;this.bitsPerSample=bitsPerSample;
            this.byteRate=byteRate;this.blockAlign=blockAlign;
            this.dataOffset=dataOffset;this.dataLength=dataLength;
        }
    }

    private static String ascii(RandomAccessFile in) throws IOException {
        byte[] raw=new byte[4];
        in.readFully(raw);
        return new String(raw,StandardCharsets.US_ASCII);
    }
    private static int u16(RandomAccessFile f) throws IOException {
        return f.readUnsignedByte() | f.readUnsignedByte()<<8;
    }
    private static long u32(RandomAccessFile f) throws IOException {
        return (long)f.readUnsignedByte() | (long)f.readUnsignedByte()<<8 |
                (long)f.readUnsignedByte()<<16 | (long)f.readUnsignedByte()<<24;
    }
    private static void put16(OutputStream out,int value) throws IOException {
        out.write(value&255);out.write(value>>>8&255);
    }
    private static void put32(OutputStream out,long value) throws IOException {
        for(int i=0;i<4;i++)out.write((int)(value>>>(8*i))&255);
    }
    private static void ascii(OutputStream out,String value) throws IOException {
        out.write(value.getBytes(StandardCharsets.US_ASCII));
    }

    public static Header inspect(File file) throws IOException {
        if(!file.isFile()||file.length()<44)
            throw new IOException("Missing or short WAV segment: "+file.getName());
        try(RandomAccessFile in=new RandomAccessFile(file,"r")){
            if(!ascii(in).equals("RIFF"))throw new IOException("Expected RIFF WAV");
            u32(in);
            if(!ascii(in).equals("WAVE"))throw new IOException("Expected WAVE data");
            int channels=0,rate=0,bits=0,byteRate=0,align=0,format=0;
            long offset=-1,length=0;
            while(in.getFilePointer()+8<=in.length()){
                String kind=ascii(in);
                long chunkLength=u32(in);
                long start=in.getFilePointer();
                if(chunkLength>in.length()-start)throw new IOException("Truncated WAV chunk");
                if(kind.equals("fmt ")){
                    if(chunkLength<16)throw new IOException("Invalid WAV format chunk");
                    format=u16(in);
                    channels=u16(in);
                    rate=(int)u32(in);
                    byteRate=(int)u32(in);
                    align=u16(in);
                    bits=u16(in);
                }else if(kind.equals("data")){
                    offset=start;length=chunkLength;
                }
                long next=start+chunkLength+(chunkLength&1);
                if(next>in.length())break;
                in.seek(next);
            }
            if(format!=1||channels<1||channels>2||rate<8000||bits!=16||
                    align!=channels*2||byteRate!=rate*align||
                    offset<0||length<=0||length%align!=0)
                throw new IOException("Android TTS output is not compatible PCM16 WAV");
            return new Header(channels,rate,bits,byteRate,align,offset,length);
        }
    }

    public static boolean isValid(File file) {
        try{inspect(file);return true;}catch(IOException e){return false;}
    }

    public static void combine(List<File> sources,OutputStream out) throws IOException {
        if(sources.isEmpty())throw new IOException("No narration segments to export");
        List<Header> headers=new ArrayList<>();
        Header first=null;
        long bytes=0;
        for(File source:sources){
            Header h=inspect(source);
            if(first==null)first=h;
            else if(h.channels!=first.channels||h.sampleRate!=first.sampleRate||
                    h.bitsPerSample!=first.bitsPerSample)
                throw new IOException("Chapter changes WAV format between passages");
            bytes+=h.dataLength;
            if(bytes>MAX_DATA)throw new IOException("Chapter exceeds WAV size limit");
            headers.add(h);
        }
        ascii(out,"RIFF");put32(out,36+bytes);ascii(out,"WAVE");
        ascii(out,"fmt ");put32(out,16);put16(out,1);
        put16(out,first.channels);put32(out,first.sampleRate);
        put32(out,first.byteRate);put16(out,first.blockAlign);
        put16(out,first.bitsPerSample);
        ascii(out,"data");put32(out,bytes);
        byte[] buffer=new byte[64*1024];
        for(int i=0;i<sources.size();i++){
            Header h=headers.get(i);
            try(RandomAccessFile in=new RandomAccessFile(sources.get(i),"r")){
                in.seek(h.dataOffset);
                long remaining=h.dataLength;
                while(remaining>0){
                    int count=(int)Math.min(remaining,buffer.length);
                    in.readFully(buffer,0,count);
                    out.write(buffer,0,count);
                    remaining-=count;
                }
            }
        }
        out.flush();
    }
}
