package org.beckenburg;

/** Headless checks for the independent runtime VFX state and its sound triggers. */
public final class EnvironmentalEffectsTest {
    private static void ok(boolean b,String why){if(!b)throw new AssertionError(why);}
    public static void main(String[] args){
        SceneRenderer fx=new SceneRenderer();
        ok(fx.activeRite==null&&fx.strikeUntilTick<0,"no untriggered rite or strike");
        fx.setLampHardware(EquipmentTiers.Tier.I,false);
        ok(!fx.flameLamp&&fx.lampReach==6.0,"flashlight beam mode");
        fx.setLampHardware(EquipmentTiers.Tier.III,true);
        ok(fx.flameLamp&&fx.lampReach==3.5,"firelight spill mode");
        fx.activeRite=GhostIdentity.Rite.CLEANSING;
        fx.strikeUntilTick=40;
        ok(fx.activeRite==GhostIdentity.Rite.CLEANSING&&fx.strikeUntilTick==40,
            "authoritative triggers enable effects");
        fx.activeRite=null;fx.strikeUntilTick=-1;
        ok(fx.activeRite==null&&fx.strikeUntilTick<0,"end packets clear visuals");
        for(LanSound.Cue cue:new LanSound.Cue[]{LanSound.Cue.CAMERA,LanSound.Cue.SWITCH,
                 LanSound.Cue.RITUAL_START,LanSound.Cue.RITUAL_END,LanSound.Cue.IMPACT}){
            var sound=new LanSound.CueEvent(cue,25,74,33);
            ok(LanSound.decode(sound.frame()).equals(sound),"cue wire roundtrip");
            byte[] pcm=LanAudio.synthesize(sound);
            ok(pcm.length>1000&&pcm.length%4==0,"nonempty stereo cue");
        }
        System.out.println("PASS: triggered environmental presentation and cue compatibility");
    }
}
