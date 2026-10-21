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
        RoomAcousticPresets.Type preset=RoomAcousticPresets.forRoom(level,room);
        double time=frame/(double)RATE;
        int seed=level.id().hashCode()+room*197;
        double electrical=powered
            ?electrical(frame+Math.floorMod(seed,13000))*preset.powerGain:0;
        // Site-wide packaged beds remain independent. Room beds only use the
        // mapped acoustic template and natural, deterministic building sounds.
        double machine=preset.frequency>0&&powered
            ?Math.sin(2*Math.PI*preset.frequency*time+.32*seed)
                *preset.powerGain*.050:0;
        double phase=(time+Math.floorMod(seed,1200)/100d)%preset.period;
        double movement=0;
        if(phase<1.8){
            double envelope=Math.exp(-phase*(preset==RoomAcousticPresets.Type.STONE_HALL
                ||preset==RoomAcousticPresets.Type.CORRIDOR?2.0:5.7));
            double tap=Math.sin(2*Math.PI*(42+preset.frequency*.55)*phase);
            movement=(tap*.011+noise(frame/13+seed)*.005)
                *envelope*preset.transientGain;
        }
        double dropPhase=(time+Math.floorMod(seed,500)/100d)%11.1;
        double droplets=dropPhase<.23
            ?preset.drip*Math.sin(2*Math.PI*890*dropPhase)
                *Math.exp(-dropPhase*24)*.017:0;
        double fabric=noise(frame/9+seed)*.0018*preset.gain;
        double output=(electrical+machine+movement+droplets+fabric)*preset.gain;
        return (short)Math.round(Math.max(-.06,Math.min(.06,output))*32767);
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
