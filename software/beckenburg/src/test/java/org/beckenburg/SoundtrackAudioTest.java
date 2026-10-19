package org.beckenburg;
import javax.sound.sampled.*;

/** Headless asset and score-policy regression: uses the final packaged classpath. */
public final class SoundtrackAudioTest {
    public static void main(String[] args) throws Exception {
        String[] tracks={"ambient-cold-unresolved-drone","ambient-sombra-profunda",
            "castle-candlelit-shadows","hunt-final-surge","ritual-final-strike","ritual-of-ash"};
        for(String track:tracks){
            byte[] wav=SoundtrackAudio.wav(track);
            if(wav.length<50000)throw new AssertionError("Truncated score "+track);
            try(AudioInputStream pcm=SoundtrackAudio.pcm(track)){
                byte[] sample=pcm.readNBytes(4096);
                if(sample.length!=4096||pcm.getFormat().getSampleSizeInBits()!=16)
                    throw new AssertionError("WAV to PCM decoder failed "+track);
            }
        }
        if(SoundtrackAudio.select(false,false,false,true)!=null)throw new AssertionError("hidden panel audible");
        if(SoundtrackAudio.select(true,true,true,true)!=SoundtrackAudio.Layer.CASTLE)
            throw new AssertionError("castle must not play hunt soundtrack");
        if(SoundtrackAudio.select(false,true,false,false)!=SoundtrackAudio.Layer.AMBIENT)
            throw new AssertionError("field should have ambient score");
        if(SoundtrackAudio.select(false,true,true,false)!=SoundtrackAudio.Layer.RITUAL)
            throw new AssertionError("accepted ritual needs ritual score");
        if(SoundtrackAudio.select(false,true,true,true)!=SoundtrackAudio.Layer.HUNT)
            throw new AssertionError("hunt must preempt ritual score");
        System.out.println("PASS six recorded tracks, U-law decoder, and music-state precedence");
    }
}
