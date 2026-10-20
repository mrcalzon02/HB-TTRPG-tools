package org.beckenburg;

import javax.sound.sampled.*;

/** Quiet architectural ambience, independent of hidden ghost state and mission music.
 * Weather remains in WeatherSoundscape. Mechanical beds reuse the packaged electrical
 * recording; sparse wood, pipe and building resonances are original procedural Foley. */
public final class LevelSoundscape implements AutoCloseable {
    private static final int RATE=16000;
    private static final AudioFormat FORMAT=new AudioFormat(RATE,16,1,true,false);
    private static final byte[] ELECTRICAL=RecordedSfx.render(
        new LanSound.CueEvent(LanSound.Cue.ELECTRIC_HUM,0,100,0),100);
    private volatile HouseMap map;
    private volatile int room=HouseMap.EXTRACTION_ROOM;
    private volatile boolean powered=true,active,closed;
    private final Thread worker;
    private volatile SourceDataLine line;
    public LevelSoundscape(HouseMap map){
        this.map=java.util.Objects.requireNonNull(map);
        worker=new Thread(this::run,"beckenburg-building-ambience");
        worker.setDaemon(true);worker.start();
    }
    public void setMap(HouseMap value){map=java.util.Objects.requireNonNull(value);}
    public void setContext(int room,boolean powered){this.room=room;this.powered=powered;}
    public void setActive(boolean value){active=value&&!closed;}
    private static double noise(long n){
        long h=n*0x9e3779b97f4a7c15L;h^=h>>>29;h*=0xbf58476d1ce4e5b9L;
        return ((h>>>40)&0xffffff)/8388607.5-1;
    }
    private static double electrical(long frame){
        if(ELECTRICAL==null||ELECTRICAL.length<16)return Math.sin(frame*2*Math.PI*60/RATE)*.25;
        int frames=ELECTRICAL.length/4;
        int p=(int)(frame%frames)*4;
        short value=(short)((ELECTRICAL[p]&255)|(ELECTRICAL[p+1]<<8));
        // Fade the seam of the short archived motor loop instead of introducing clicks.
        double edge=Math.min(frame%frames,frames-frame%frames)/320d;
        return value/32768d*Math.min(1,edge);
    }
    /** Stable bounded samples allow review on machines without an audio device. */
    public static short sample(LevelDefinition level,int room,boolean powered,long frame){
        if(level==null||room<0||room>=level.rooms().size()||frame<0)return 0;
        LevelDefinition.Room space=level.room(room);
        if(space.outside())return 0; // the exterior weather bed already owns these zones
        String site=level.id().toLowerCase(java.util.Locale.ROOT);
        String acoustic=space.acoustic().toLowerCase(java.util.Locale.ROOT);
        double t=frame/(double)RATE;
        int seed=level.id().hashCode()+room*197;
        boolean institutional=site.contains("prison")||site.contains("asylum")
            ||site.contains("school")||site.contains("college");
        boolean monumental=site.contains("church")||site.contains("academy");
        boolean soft=acoustic.contains("carpet")||acoustic.contains("soft");
        double base=powered?electrical(frame+Math.floorMod(seed,13000))
            *(institutional?.035:.012):0;
        // Unpowered buildings retain only their natural structural/pipe sounds.
        double period=monumental?31:institutional?23:37;
        double phase=(t+Math.floorMod(seed,1700)/100d)%period;
        double event=0;
        if(phase<1.8){
            if(institutional){
                double impact=Math.exp(-phase*8);
                event=(Math.sin(2*Math.PI*173*phase)+.35*Math.sin(2*Math.PI*311*phase))
                    *impact*.016;
                if(phase>.36)event+=Math.sin(2*Math.PI*173*(phase-.36))
                    *Math.exp(-(phase-.36)*9)*.005;
            }else if(monumental){
                event=noise(frame/7+seed)*Math.sin(Math.PI*phase/1.8)*.007;
            }else{
                double bend=55+13*Math.sin(phase*3.4);
                event=(Math.sin(2*Math.PI*bend*phase)*.006
                    +noise(frame+seed)*.002)*Math.pow(Math.sin(Math.PI*phase/1.8),2);
            }
        }
        double roomGain=soft?.55:acoustic.contains("stone")||acoustic.contains("tile")?1.1:1;
        return (short)Math.round(Math.max(-.06,Math.min(.06,(base+event)*roomGain))*32767);
    }
    private void run(){
        long frame=0;double fade=0;
        try{
            while(!closed){
                if(!active||Boolean.getBoolean("beckenburg.audio.mute")||LanAudio.effectsVolume()==0){
                    if(line!=null){line.stop();line.flush();}
                    Thread.sleep(100);continue;
                }
                if(line==null){line=AudioSystem.getSourceDataLine(FORMAT);line.open(FORMAT,4096);}
                if(!line.isRunning())line.start();
                HouseMap current=map;int area=room;boolean electricity=powered;
                byte[] block=new byte[2048];
                double volume=LanAudio.effectsVolume()/100d;
                for(int i=0;i<block.length;i+=2){
                    fade=Math.min(1,fade+1d/4000);
                    short value=(short)Math.round(sample(current.level(),area,electricity,frame++)*volume*fade);
                    block[i]=(byte)value;block[i+1]=(byte)(value>>8);
                }
                line.write(block,0,block.length);
            }
        }catch(LineUnavailableException|IllegalArgumentException|SecurityException unavailable){
            // Quiet fallback preserves investigation and all captioned event audio.
        }catch(InterruptedException stopped){Thread.currentThread().interrupt();}
        finally{SourceDataLine open=line;line=null;if(open!=null){open.stop();open.flush();open.close();}}
    }
    @Override public void close(){
        closed=true;active=false;worker.interrupt();
        SourceDataLine open=line;if(open!=null){open.stop();open.flush();}
    }
}
