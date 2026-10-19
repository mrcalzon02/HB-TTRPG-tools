package org.beckenburg;

import javax.sound.sampled.*;

/** Original algorithmic castle/field music bed, offline and license-independent.
 * 16kHz stereo quiet 16-bit PCM; one worker per visible view, no external codec requirement.
 */
public final class AtmosphereAudio implements AutoCloseable {
    public enum Scene { CASTLE, FIELD }
    private static final int RATE=16000;
    private static final AudioFormat FORMAT=new AudioFormat(RATE,16,2,true,false);
    private final SoundtrackAudio soundtrack;
    private final WeatherSoundscape weatherBed;
    public AtmosphereAudio(Scene scene){
        soundtrack=new SoundtrackAudio(java.util.Objects.requireNonNull(scene)==Scene.CASTLE);
        weatherBed=scene==Scene.FIELD?new WeatherSoundscape():null;
    }
    public void setActive(boolean visible){
        soundtrack.setActive(visible);
        if(weatherBed!=null)weatherBed.setActive(visible);
    }
    public void setWeather(MissionWeather.State weather){
        if(weatherBed!=null)weatherBed.setWeather(weather);
    }
    public void setOutside(boolean outside){
        if(weatherBed!=null)weatherBed.setOutside(outside);
    }
    public void setHunt(boolean value){soundtrack.setHunt(value);}
    public void setRitual(boolean value){soundtrack.setRitual(value);}
    /** Pure sample function is regression-testable without opening a sound device. */
    public static short sample(Scene scene,long index){
        if(scene==null||index<0)throw new IllegalArgumentException("invalid atmosphere position");
        double t=index/(double)RATE;
        // Retune original minor-chord beds. Quiet background never masks ghost-event cues.
        double[] notes=scene==Scene.CASTLE?new double[]{55.0,65.41,82.41,110.0}:
                                              new double[]{41.20,49.00,61.74,82.41};
        double shift=(Math.floor(t/28)%4)*.028;
        double sum=0;
        for(int i=0;i<notes.length;i++){
            double pitch=notes[i]*(1+.0024*Math.sin(t*(.13+i*.07))+shift);
            double breath=.56+.44*Math.sin(2*Math.PI*(t/(13+i*4)+i*.21));
            sum+=Math.sin(2*Math.PI*pitch*t)*breath/(i+2);
        }
        double distantBell=0;
        double phase=t%11;
        if(phase<1.8){
            double bell=scene==Scene.CASTLE?261.63:196;
            distantBell=Math.sin(2*Math.PI*bell*t)*Math.exp(-phase*3.6)*.21;
        }
        double hiss=Math.sin(2*Math.PI*13*t)*Math.sin(2*Math.PI*41.23*t)*.04;
        double gain=scene==Scene.CASTLE?.085:.075;
        return (short)Math.max(Short.MIN_VALUE,Math.min(Short.MAX_VALUE,
            Math.round((sum+distantBell+hiss)*gain*32767)));
    }
    @Override public void close(){
        soundtrack.close();
        if(weatherBed!=null)weatherBed.close();
    }
}
