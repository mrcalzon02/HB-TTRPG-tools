package org.beckenburg;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/** Host-owned recordings of real audible game cues. No spectral identity or source pose is stored. */
public final class FieldSoundRecorder {
    public static final int MAX_EVENTS=128;
    public record Sample(int offset,LanSound.Cue cue,int pan,int volume) {
        public Sample {
            if(offset<0||offset>320)throw new IllegalArgumentException("recording offset");
            new LanSound.CueEvent(cue,pan,volume,offset);
        }
        public LanSound.CueEvent sound(){return new LanSound.CueEvent(cue,pan,volume,offset);}
        public String frame(){return "RECAUDIO|CUE|"+offset+"|"+cue+"|"+pan+"|"+volume;}
    }
    public record Clip(EquipmentTiers.Tier tier,int duration,List<Sample> samples) {
        public Clip {
            Objects.requireNonNull(tier);samples=List.copyOf(samples);
            if(duration<1||duration>durationTicks(tier)||samples.size()>eventCapacity(tier))
                throw new IllegalArgumentException("recording budget");
            int previous=-1;
            for(Sample sample:samples){
                if(sample.offset()<previous||sample.offset()>=duration)
                    throw new IllegalArgumentException("recording chronology");
                previous=sample.offset();
            }
        }
        public List<String> frames(){
            List<String> frames=new ArrayList<>();
            frames.add("RECAUDIO|BEGIN|"+tier+"|"+duration);
            for(Sample sample:samples)frames.add(sample.frame());
            frames.add("RECAUDIO|END");return List.copyOf(frames);
        }
    }
    private final List<Clip> clips=new ArrayList<>();
    private final List<Sample> current=new ArrayList<>();
    private EquipmentTiers.Tier tier=EquipmentTiers.Tier.I;
    private int started=-1;
    public static int durationTicks(EquipmentTiers.Tier tier){return new int[]{80,160,320}[tier.ordinal()];}
    public static int eventCapacity(EquipmentTiers.Tier tier){return new int[]{32,64,128}[tier.ordinal()];}
    public boolean recording(){return started>=0;}
    public int clipCount(){return clips.size();}
    public List<Clip> clips(){return List.copyOf(clips);}
    public void start(EquipmentTiers.Tier selected,int tick){
        if(recording()||tick<0)throw new IllegalArgumentException("recorder already running");
        tier=Objects.requireNonNull(selected);started=tick;current.clear();
    }
    public boolean capture(LanSound.CueEvent cue,double distance){
        if(!recording()||cue==null||!Double.isFinite(distance)||distance<0
                ||distance>EquipmentTiers.stage("SOUND_RECORDER",tier).reachCm()/100.0)
            return false;
        int offset=cue.tick()-started;
        if(offset<0||offset>=durationTicks(tier)||current.size()>=eventCapacity(tier))return false;
        if(!current.isEmpty()&&offset<current.get(current.size()-1).offset())return false;
        current.add(new Sample(offset,cue.cue(),tier==EquipmentTiers.Tier.I?0:cue.pan(),cue.volume()));
        return true;
    }
    public Clip stop(int tick){
        if(!recording()||tick<started)throw new IllegalArgumentException("recorder is stopped");
        int duration=Math.max(1,Math.min(durationTicks(tier),tick-started+1));
        Clip clip=new Clip(tier,duration,current);
        clips.add(clip);
        int capacity=EquipmentTiers.stage("SOUND_RECORDER",tier).capacity();
        while(clips.size()>capacity)clips.remove(0);
        started=-1;current.clear();return clip;
    }
    public boolean due(int tick){return recording()&&tick-started>=durationTicks(tier);}
    public Clip latest(){
        if(clips.isEmpty())throw new IllegalArgumentException("no recorded clip; R starts recording");
        return clips.get(clips.size()-1);
    }
    public String status(int tick){
        int peak=current.stream().mapToInt(Sample::volume).max().orElse(0);
        return recording()?"REC "+Math.max(0,tick-started)/10.0+"s / PEAK "+peak+" / R stop":
            "STOP / "+clips.size()+" clips / R rec P play";
    }
}
