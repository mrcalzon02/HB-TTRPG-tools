package org.beckenburg;

import javax.sound.sampled.*;

/** Low-volume procedural weather bed. Independent of ghost audio and soundtrack.
 * Every local client derives the same type/intensity from a host WEATHER frame.
 */
public final class WeatherSoundscape implements AutoCloseable {
    private static final int RATE=16000;
    private static final AudioFormat PCM=new AudioFormat(RATE,16,1,true,false);
    private volatile MissionWeather.State state;
    private volatile boolean outside,active,closed;
    private final Thread worker;
    private volatile SourceDataLine line;
    public WeatherSoundscape(){
        worker=new Thread(this::run,"beckenburg-weather-bed");
        worker.setDaemon(true);worker.start();
    }
    public void setWeather(MissionWeather.State weather){state=weather;}
    public void setOutside(boolean outdoor){outside=outdoor;}
    public void setActive(boolean showing){active=showing&&!closed;}
    /** Predictable, bounded samples for audio tests. Indoor shelter attenuates wind/rain.
     * Snow is deliberately quiet; thunderclaps are intermittent, never a ghost cue.
     */
    public static short sample(EvidenceSignals.Weather weather,int intensity,
            boolean outside,long sample){
        if(weather==null||intensity<1||intensity>3||sample<0)
            throw new IllegalArgumentException("invalid weather audio context");
        double t=sample/(double)RATE;
        int hash=(int)(sample*1103515245L+12345);
        hash^=hash>>>13;hash*=0x5bd1e995;hash^=hash>>>15;
        double noise=((hash&65535)/32767.5)-1;
        double gust=.5+.5*Math.sin(t*.31+Math.sin(t*.07));
        double low=Math.sin(t*2*Math.PI*39)*.16+Math.sin(t*2*Math.PI*73)*.10;
        double bed=switch(weather){
            case CLEAR ->.045*gust*noise;
            case FOG ->.045*noise+.1*gust*low;
            case WIND ->.23*gust*noise+.34*low;
            case RAIN ->.32*noise+.07*low;
            case SNOW ->.09*gust*noise+.13*low;
            case HEATWAVE ->.065*noise+.10*Math.sin(t*2*Math.PI*210)*Math.sin(t*7);
            case THUNDERSTORM ->{
                double cycle=t%17;
                double strike=cycle>11&&cycle<14?Math.exp(-(cycle-11)*1.6):0;
                yield .42*noise+.2*low+.45*strike*Math.sin(t*2*Math.PI*39);
            }
        };
        double gain=outside?1:.23;
        gain*=.055+intensity*.036;
        return (short)Math.round(Math.max(-1,Math.min(1,bed*gain))*32767);
    }
    private void run(){
        long offset=0;
        try{
            while(!closed){
                MissionWeather.State w=state;
                if(!active||w==null||Boolean.getBoolean("beckenburg.audio.mute")
                        ||LanAudio.effectsVolume()==0){
                    if(line!=null){line.stop();line.flush();}
                    Thread.sleep(100);continue;
                }
                if(line==null){
                    line=AudioSystem.getSourceDataLine(PCM);
                    line.open(PCM,4096);line.start();
                }else if(!line.isRunning())line.start();
                byte[] block=new byte[2048];
                int volume=LanAudio.effectsVolume();
                boolean exposed=outside;
                for(int i=0;i<block.length;i+=2){
                    short value=sample(w.weather(),w.intensity(),exposed,offset++);
                    value=(short)(value*volume/100);
                    block[i]=(byte)value;block[i+1]=(byte)(value>>8);
                }
                line.write(block,0,block.length);
            }
        }catch(LineUnavailableException|IllegalArgumentException|SecurityException ex){
            // Caption-only fallback: never interrupt investigation or spam sound device.
        }catch(InterruptedException ex){Thread.currentThread().interrupt();}
        finally{SourceDataLine open=line;line=null;if(open!=null){open.stop();open.flush();open.close();}}
    }
    @Override public void close(){
        closed=true;active=false;worker.interrupt();
        SourceDataLine open=line;if(open!=null){open.stop();open.flush();}
    }
}
