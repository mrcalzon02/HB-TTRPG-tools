package org.beckenburg;

import javax.sound.sampled.*;
import java.io.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.prefs.Preferences;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/** Authored Beckenburg recordings, converted to Java-compatible U-law WAV.
 * Offline classpath assets. Multiplayer cue authority remains exclusively with LanHost.
 */
public final class SoundtrackAudio implements AutoCloseable {
    public enum Layer { CASTLE, AMBIENT, RITUAL, HUNT }
    private static final String BASE="/org/beckenburg/music/";
    private static final AudioFormat OUTPUT=new AudioFormat(22050f,16,1,true,false);
    private static final String[] TRACKS={
        "castle-candlelit-shadows","ambient-cold-unresolved-drone","ambient-sombra-profunda",
        "ritual-of-ash","ritual-final-strike","hunt-final-surge"
    };
    private static final Preferences SETTINGS=Preferences.userNodeForPackage(SoundtrackAudio.class);
    private static final AtomicInteger NEXT=new AtomicInteger();
    private final Thread worker;
    private final boolean castle;
    private volatile boolean active,ritual,hunt,closed;
    private volatile SourceDataLine output;
    private volatile String current="";
    private int ambientIndex,ritualIndex;

    public SoundtrackAudio(boolean castle){
        this.castle=castle;
        this.ambientIndex=Math.floorMod(NEXT.getAndIncrement(),2);
        worker=new Thread(this::run,"beckenburg-score-"+(castle?"castle":"case"));
        worker.setDaemon(true);worker.start();
    }
    public static int volume(){return Math.max(0,Math.min(100,SETTINGS.getInt("music_volume",45)));}
    public static void volume(int percent){
        if(percent<0||percent>100)throw new IllegalArgumentException("music volume 0-100");
        SETTINGS.putInt("music_volume",percent);
    }
    public void setActive(boolean value){active=value&&!closed;}
    public void setHunt(boolean value){hunt=value&&!closed;}
    public void setRitual(boolean value){
        if(value&&!ritual)ritualIndex++;
        ritual=value&&!closed;
    }
    public Layer layer(){return select(castle,active,ritual,hunt);}
    public static Layer select(boolean castle,boolean active,boolean ritual,boolean hunt){
        if(!active)return null;
        if(castle)return Layer.CASTLE;
        if(hunt)return Layer.HUNT;
        if(ritual)return Layer.RITUAL;
        return Layer.AMBIENT;
    }
    private String trackFor(Layer layer){return switch(layer){
        case CASTLE->TRACKS[0];
        case AMBIENT->TRACKS[1+(ambientIndex&1)];
        case RITUAL->TRACKS[3+Math.floorMod(ritualIndex-1,2)];
        case HUNT->TRACKS[5];
    };}
    public String currentTrack(){return current;}

    /** Source zips above the connector blob limit are stored as sequential two-part resources. */
    static InputStream archive(String id){
        if(!java.util.Arrays.asList(TRACKS).contains(id))throw new IllegalArgumentException("unknown song "+id);
        InputStream single=SoundtrackAudio.class.getResourceAsStream(BASE+id+".zip");
        if(single!=null)return single;
        InputStream a=SoundtrackAudio.class.getResourceAsStream(BASE+id+".zip.0");
        InputStream b=SoundtrackAudio.class.getResourceAsStream(BASE+id+".zip.1");
        if(a==null||b==null){
            if(a!=null)try{a.close();}catch(IOException ignored){}
            if(b!=null)try{b.close();}catch(IOException ignored){}
            throw new IllegalStateException("Missing score package: "+id);
        }
        return new java.io.SequenceInputStream(a,b);
    }
    static byte[] wav(String id)throws IOException {
        try(InputStream file=archive(id);ZipInputStream zip=new ZipInputStream(new BufferedInputStream(file))){
            ZipEntry entry=zip.getNextEntry();
            if(entry==null||!entry.getName().equals(id+".wav")||entry.isDirectory())
                throw new IOException("Unexpected score ZIP entry for "+id);
            byte[] bytes=zip.readNBytes(8*1024*1024+1);
            if(bytes.length>8*1024*1024)throw new IOException("Score too large: "+id);
            if(zip.getNextEntry()!=null)throw new IOException("Unexpected extra song in "+id);
            return bytes;
        }
    }
    static AudioInputStream pcm(String id)throws Exception {
        AudioInputStream source=AudioSystem.getAudioInputStream(
            new BufferedInputStream(new ByteArrayInputStream(wav(id))));
        if(!AudioSystem.isConversionSupported(OUTPUT,source.getFormat())){
            source.close();throw new UnsupportedAudioFileException("U-law WAV conversion unavailable for "+id);
        }
        return AudioSystem.getAudioInputStream(OUTPUT,source);
    }
    private static void idle()throws InterruptedException{Thread.sleep(70);}
    private void run(){
        AudioInputStream song=null;
        SourceDataLine line=null;
        String playing="";
        int fade=0;
        byte[] buf=new byte[2048];
        try{
            while(!closed){
                Layer layer=select(castle,active,ritual,hunt);
                int gain=volume();
                if(layer==null||gain==0||Boolean.getBoolean("beckenburg.audio.mute")){
                    current="";
                    if(song!=null){song.close();song=null;playing="";}
                    if(line!=null){line.stop();line.flush();}
                    idle();continue;
                }
                String requested=trackFor(layer);
                if(!requested.equals(playing)){
                    if(song!=null){song.close();song=null;}
                    if(line!=null){line.stop();line.flush();}
                    song=pcm(requested);
                    if(line==null){
                        line=AudioSystem.getSourceDataLine(OUTPUT);
                        line.open(OUTPUT,4096);output=line;
                    }
                    line.start();playing=requested;current=requested;fade=0;
                }
                int read=song.read(buf,0,buf.length);
                if(read<0){
                    song.close();song=null;playing="";current="";
                    if(layer==Layer.AMBIENT)ambientIndex++;
                    continue;
                }
                // Apply independent volume and ~450ms soft entrance.
                for(int i=0;i+1<read;i+=2){
                    int value=(short)((buf[i]&255)|(buf[i+1]<<8));
                    double envelope=Math.min(1.,fade/9922.0);
                    int mixed=(int)Math.round(value*(gain/100.0)*envelope);
                    mixed=Math.max(Short.MIN_VALUE,Math.min(Short.MAX_VALUE,mixed));
                    buf[i]=(byte)mixed;buf[i+1]=(byte)(mixed>>8);fade++;
                }
                int count=read&~1;
                for(int at=0;at<count&&!closed;){
                    if(select(castle,active,ritual,hunt)!=layer)break;
                    int written=line.write(buf,at,count-at);
                    if(written<=0)break;
                    at+=written;
                }
            }
        }catch(LineUnavailableException|IllegalArgumentException|SecurityException unavailable){
            // Gameplay, captions and sound cues keep working without a music device.
        }catch(Exception invalid){
            System.err.println("Beckenburg soundtrack unavailable: "+invalid.getMessage());
        }finally{
            current="";output=null;
            if(song!=null)try{song.close();}catch(IOException ignored){}
            if(line!=null){line.stop();line.flush();line.close();}
        }
    }
    @Override public void close(){
        closed=true;active=false;worker.interrupt();
        SourceDataLine line=output;
        if(line!=null){line.stop();line.flush();}
    }
}
