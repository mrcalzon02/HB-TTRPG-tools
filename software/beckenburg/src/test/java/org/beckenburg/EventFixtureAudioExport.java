package org.beckenburg;
import java.nio.file.*;
import javax.sound.sampled.*;
import java.io.*;
/** Export only our original procedural device tones; no sampled/source-pack audio. */
public final class EventFixtureAudioExport {
    public static void main(String[] args)throws Exception{
        Path out=Path.of("development/levels/event-audio");Files.createDirectories(out);
        for(var cue:new LanSound.Cue[]{LanSound.Cue.PHONE_RING,LanSound.Cue.ALARM_BELL,LanSound.Cue.FIRE_BELL,LanSound.Cue.RADIO_PLAY,LanSound.Cue.RUNNING_WATER}){
            byte[] pcm=LanAudio.synthesize(new LanSound.CueEvent(cue,0,80,10));
            try(var stream=new AudioInputStream(new ByteArrayInputStream(pcm),new AudioFormat(16000,16,2,true,false),pcm.length/4)){
                AudioSystem.write(stream,AudioFileFormat.Type.WAVE,out.resolve(cue.name().toLowerCase(java.util.Locale.ROOT)+".wav").toFile());
            }
            System.out.println("ORIGINAL_CC0_SOUND "+cue+" "+pcm.length+" PCM bytes");
        }
    }
}
