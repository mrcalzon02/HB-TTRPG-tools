package org.beckenburg;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/** Bounded version-2 XYZ LAN frames, intentionally not Java object deserialization. */
public final class LanProtocol {
    public static final int VERSION=2, DEFAULT_PORT=27717, MAX_FRAME=512;
    private LanProtocol() { }
    public static List<String> parts(String frame) {
        if (frame==null || frame.length()>MAX_FRAME || frame.indexOf('\r')>=0 || frame.indexOf('\n')>=0)
            throw new IllegalArgumentException("invalid frame");
        String[] raw=frame.split("\\|",-1);
        if(raw.length>10)throw new IllegalArgumentException("too many fields");
        List<String> out=new ArrayList<>(raw.length);
        for(String v:raw) { if(v.length()>96)throw new IllegalArgumentException("field too large"); out.add(v); }
        return List.copyOf(out);
    }
    public static int integer(String value,int min,int max) {
        if(value==null||!value.matches("-?[0-9]{1,8}"))throw new IllegalArgumentException("invalid integer");
        int number=Integer.parseInt(value);
        if(number<min||number>max)throw new IllegalArgumentException("integer outside bounds");
        return number;
    }
    public static long sequence(String value) {
        if(value==null||!value.matches("[0-9]{1,15}"))throw new IllegalArgumentException("invalid sequence");
        return Long.parseLong(value);
    }
    public static String cleanName(String name){
        if(name==null||!name.matches("[A-Za-z0-9 _-]{1,24}")||name.trim().isEmpty())
            throw new IllegalArgumentException("name must be 1-24 simple characters");
        return name.trim();
    }
    /** Does not allocate arbitrarily long lines from an untrusted remote peer. */
    public static String read(Reader source)throws IOException {
        StringBuilder out=new StringBuilder();
        while(true){int c=source.read();if(c<0)return out.length()==0?null:throwTruncation();
            if(c=='\n')return out.toString();
            if(c<' '||c>126||out.length()==MAX_FRAME)throw new IOException("invalid or oversized LAN frame");
            out.append((char)c);
        }
    }
    private static String throwTruncation() throws IOException {throw new IOException("truncated frame");}
    public static Reader reader(InputStream stream){return new InputStreamReader(stream,StandardCharsets.US_ASCII);}
    public static Writer writer(OutputStream stream){return new OutputStreamWriter(stream,StandardCharsets.US_ASCII);}
    public static void write(Writer out,String frame)throws IOException {
        parts(frame);
        out.write(frame);out.write('\n');out.flush();
    }
}
