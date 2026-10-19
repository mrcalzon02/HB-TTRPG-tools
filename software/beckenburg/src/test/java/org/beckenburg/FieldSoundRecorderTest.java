package org.beckenburg;

import java.nio.file.*;
import java.util.Arrays;
import javax.sound.sampled.AudioSystem;

public final class FieldSoundRecorderTest {
    static void check(boolean pass,String message){if(!pass)throw new AssertionError(message);}
    public static void main(String[] args)throws Exception {
        int previousDuration=0,previousCapacity=0,previousReach=0;
        for(var tier:EquipmentTiers.Tier.values()){
            var stage=EquipmentTiers.stage("SOUND_RECORDER",tier);
            check(stage.reachCm()>previousReach,"tier improves actual capture range");
            check(stage.capacity()>previousCapacity,"tier increases actual stored clip count");
            check(FieldSoundRecorder.durationTicks(tier)>previousDuration,"longer real recordings");
            previousDuration=FieldSoundRecorder.durationTicks(tier);previousCapacity=stage.capacity();previousReach=stage.reachCm();
            var recorder=new FieldSoundRecorder();recorder.start(tier,100);
            check(!recorder.capture(null,0),"no sound is invented in an empty room");
            check(!recorder.capture(new LanSound.CueEvent(LanSound.Cue.DOOR,100,75,110),stage.reachCm()/100.0+.01),
                "out of range source is never captured");
            var actual=new LanSound.CueEvent(LanSound.Cue.DOOR,100,75,110);
            check(recorder.capture(actual,1),"real nearby door sound captured");
            var clip=recorder.stop(130);
            check(clip.samples().size()==1&&clip.samples().get(0).offset()==10,"original timing retained");
            check(clip.samples().get(0).pan()==(tier==EquipmentTiers.Tier.I?0:100),"mono versus actual stereo pan");
            byte[] pcm=RecorderAudio.pcm(clip);
            int channels=tier==EquipmentTiers.Tier.I?1:2;
            int start=LanAudio.SAMPLE_RATE*channels*2;
            check(Arrays.equals(Arrays.copyOf(pcm,start),new byte[start]),"one second of actual silence before source sound");
            check(!Arrays.equals(pcm,new byte[pcm.length]),"recorded audible event produces real PCM");
            if(channels==2){
                for(int i=start;i<pcm.length;i+=4)
                    check(pcm[i]==0&&pcm[i+1]==0,"hard-right source remains silent in left channel");
            }
            try(var decoder=new RecorderAudio()){
                FieldSoundRecorder.Clip received=null;
                for(String packet:clip.frames()){
                    LanProtocol.parts(packet);var decoded=decoder.accept(packet);if(decoded!=null)received=decoded;
                }
                check(clip.equals(received),"bounded protocol round-trip retains actual audio data");
            }
            Path folder=Files.createTempDirectory("beckenburg-recorder-");
            Path file=RecorderAudio.save(clip,folder);
            try(var decoded=AudioSystem.getAudioInputStream(file.toFile())){
                check(decoded.getFormat().getChannels()==channels,"WAV exports actual mono/stereo hardware");
                check(Arrays.equals(decoded.readAllBytes(),pcm),"saved WAV is exact recorded PCM");
            }
            Files.delete(file);Files.delete(folder);
            for(int i=0;i<stage.capacity()+2;i++){
                recorder.start(tier,200+i*500);
                check(recorder.due(200+i*500+FieldSoundRecorder.durationTicks(tier)),"automatic stop deadline");
                recorder.stop(200+i*500+FieldSoundRecorder.durationTicks(tier));
            }
            check(recorder.clipCount()==stage.capacity(),"clip history is physically bounded");
            check(Arrays.equals(RecorderAudio.pcm(recorder.latest()),new byte[RecorderAudio.pcm(recorder.latest()).length]),
                "silent room records silence rather than a fabricated voice");
            var budget=new FieldSoundRecorder();budget.start(tier,0);
            for(int i=0;i<200;i++)budget.capture(new LanSound.CueEvent(LanSound.Cue.FOOTFALL,0,50,1),0);
            check(budget.stop(2).samples().size()==FieldSoundRecorder.eventCapacity(tier),"bounded memory during event storms");
        }
        var gear=new FieldEquipment();gear.equip(3,"SOUND_RECORDER");gear.setPower("SOUND_RECORDER",true);
        gear.advancePower(0);gear.selectSlot(0);gear.advancePower(2400);
        check(!gear.powered("SOUND_RECORDER")&&gear.batterySecondsLeft("SOUND_RECORDER")==0,
            "host-owned recording power drains across equipment switching");
        gear.rechargeAtVan();check(gear.batterySecondsLeft("SOUND_RECORDER")==240,"van services recorder battery");
        System.out.println("PASS: all three recorder tiers, real timed audio, mono/stereo WAV, silence, range, storage, memory and power");
    }
}
