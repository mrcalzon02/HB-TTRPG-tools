package org.beckenburg;

/** Gated severity sound path; no media device or third-party sound asset needed. */
public final class GhostSoundTierTest {
    private static void check(boolean yes,String why){if(!yes)throw new AssertionError(why);}
    public static void main(String[] args){
        check(LanSound.Cue.WHISPER.tier()==LanSound.Tier.MINOR,"minor whisper event");
        check(LanSound.Cue.DISTURB.tier()==LanSound.Tier.MODERATE,"moderate event");
        check(LanSound.Cue.MANIFEST.tier()==LanSound.Tier.MODERATE,"manifest event");
        check(LanSound.Cue.STRIKE.tier()==LanSound.Tier.DANGEROUS,"death-dangerous sound");
        check(LanSound.Cue.SIGNATURE.tier()==LanSound.Tier.SIGNATURE,"signature sound tier");
        int sampleCount=0;int different=0;
        byte[] moderate=LanAudio.synthesize(new LanSound.CueEvent(LanSound.Cue.DISTURB,0,70,1));
        byte[] signature=LanAudio.synthesize(new LanSound.CueEvent(LanSound.Cue.SIGNATURE,0,70,1));
        check(signature.length>moderate.length,"signature event has a longer audio envelope");
        for(int i=0;i<moderate.length;i+=4){
            if(signature[i]!=moderate[i])different++;
        }
        check(different>100,"signature waveform differs from generic disturbance");
        long sum=0,maximum=0;
        for(int i=0;i<32000;i+=5){
            short value=AtmosphereAudio.sample(AtmosphereAudio.Scene.CASTLE,i);
            sum+=Math.abs(value);maximum=Math.max(maximum,Math.abs(value));sampleCount++;
        }
        check(sum>50000&&maximum<10000,"original ambience is audible but sufficiently quiet");
        check(AtmosphereAudio.sample(AtmosphereAudio.Scene.CASTLE,50000)!=
            AtmosphereAudio.sample(AtmosphereAudio.Scene.FIELD,50000),"castle and field beds distinct");
        System.out.println("PASS severity tiers, signature audio, two quiet original ambience beds");
    }
}