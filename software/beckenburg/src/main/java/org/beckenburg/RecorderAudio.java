package org.beckenburg;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import javax.sound.sampled.*;

/** Reconstruct the same deterministic PCM heard in-game, with original gaps and pan. */
public final class RecorderAudio implements AutoCloseable {
    private EquipmentTiers.Tier incomingTier;
    private int duration;
    private final List<FieldSoundRecorder.Sample> incoming=new ArrayList<>();
    public FieldSoundRecorder.Clip accept(String frame){
        List<String> p=LanProtocol.parts(frame);
        if(!p.get(0).equals("RECAUDIO"))throw new IllegalArgumentException("recording packet");
        if(p.size()==4&&p.get(1).equals("BEGIN")){
            incomingTier=EquipmentTiers.Tier.valueOf(p.get(2));
            duration=LanProtocol.integer(p.get(3),1,FieldSoundRecorder.durationTicks(incomingTier));
            incoming.clear();return null;
        }
        if(incomingTier==null)throw new IllegalArgumentException("recording header required");
        if(p.size()==6&&p.get(1).equals("CUE")){
            if(incoming.size()>=FieldSoundRecorder.eventCapacity(incomingTier))
                throw new IllegalArgumentException("recording event budget");
            incoming.add(new FieldSoundRecorder.Sample(LanProtocol.integer(p.get(2),0,duration-1),
                LanSound.Cue.valueOf(p.get(3)),LanProtocol.integer(p.get(4),-100,100),
                LanProtocol.integer(p.get(5),1,100)));return null;
        }
        if(p.size()==2&&p.get(1).equals("END")){
            FieldSoundRecorder.Clip clip=new FieldSoundRecorder.Clip(incomingTier,duration,incoming);
            incomingTier=null;incoming.clear();return clip;
        }
        throw new IllegalArgumentException("recording packet");
    }
    public synchronized void play(FieldSoundRecorder.Clip clip,LanAudio audio){
        audio.playRecording(clip);
    }
    public static byte[] pcm(FieldSoundRecorder.Clip clip){
        int channels=clip.tier()==EquipmentTiers.Tier.I?1:2;
        int frames=clip.duration()*LanAudio.SAMPLE_RATE/10;
        int[] mixed=new int[frames*channels];
        for(var event:clip.samples()){
            byte[] raw=LanAudio.synthesize(event.sound());
            int start=event.offset()*LanAudio.SAMPLE_RATE/10;
            for(int i=0;i<raw.length/4&&start+i<frames;i++){
                int at=i*4;
                short left=(short)((raw[at]&255)|(raw[at+1]<<8));
                short right=(short)((raw[at+2]&255)|(raw[at+3]<<8));
                if(channels==1)mixed[start+i]+=(left+right)/2;
                else{mixed[(start+i)*2]+=left;mixed[(start+i)*2+1]+=right;}
            }
        }
        byte[] bytes=new byte[mixed.length*2];
        for(int i=0;i<mixed.length;i++){
            int value=Math.max(Short.MIN_VALUE,Math.min(Short.MAX_VALUE,mixed[i]));
            bytes[i*2]=(byte)value;bytes[i*2+1]=(byte)(value>>8);
        }
        return bytes;
    }
    public static Path save(FieldSoundRecorder.Clip clip,Path directory)throws IOException{
        Files.createDirectories(directory);
        Path file=Files.createTempFile(directory,"field-recording-",".wav");
        int channels=clip.tier()==EquipmentTiers.Tier.I?1:2;
        byte[] pcm=pcm(clip);
        AudioFormat format=new AudioFormat(LanAudio.SAMPLE_RATE,16,channels,true,false);
        try(AudioInputStream stream=new AudioInputStream(new ByteArrayInputStream(pcm),format,pcm.length/(2*channels))){
            AudioSystem.write(stream,AudioFileFormat.Type.WAVE,file.toFile());
        }
        return file;
    }
    @Override public synchronized void close(){
        incomingTier=null;incoming.clear();
    }
}
