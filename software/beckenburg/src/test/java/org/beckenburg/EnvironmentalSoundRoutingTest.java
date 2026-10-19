package org.beckenburg;

import java.util.Arrays;

/** Dedicated equipment sounds are host-selected from actual game actions. */
public final class EnvironmentalSoundRoutingTest {
    private static void ok(boolean b,String why){if(!b)throw new AssertionError(why);}
    public static void main(String[] args){
        LanSound.Cue[] cues={
            LanSound.Cue.DOTS_MOTOR,LanSound.Cue.DOTS_STOP,
            LanSound.Cue.SPARK,LanSound.Cue.INCENSE_BURN,
            LanSound.Cue.FIRELIGHT_IGNITE,LanSound.Cue.FIRELIGHT_OUT
        };
        for(LanSound.Cue cue:cues){
            ok(cue.tier()==LanSound.Tier.AMBIENT,"device cue is not a ghost attack");
            var event=new LanSound.CueEvent(cue,-25,80,73);
            ok(LanSound.decode(event.frame()).equals(event),"bounded wire event");
            byte[] sample=LanAudio.synthesize(event);
            ok(sample.length>=1600*4&&sample.length%4==0,"stereo generated");
            boolean heard=false;for(byte b:sample)if(b!=0){heard=true;break;}
            ok(heard,"nonzero waveform");
            ok(Arrays.equals(sample,LanAudio.synthesize(event)),"deterministic audio");
        }
        ok(!Arrays.equals(LanAudio.synthesize(new LanSound.CueEvent(cues[0],0,80,73)),
                LanAudio.synthesize(new LanSound.CueEvent(cues[1],0,80,73))),
                "projector start and stop sound distinct");
        System.out.println("PASS: specific environment sounds, triggering metadata and no empty audio");
    }
}
