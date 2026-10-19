package org.beckenburg;

import java.util.HashSet;
import java.util.Set;

/** Proof that numbered horror assets stay semantically separate from Foley and host world state. */
public final class HorrorAudioRoutingTest {
    private static void check(boolean condition,String message){
        if(!condition)throw new AssertionError(message);
    }
    public static void main(String[] args){
        check(LanSound.Cue.TENSION_BUILD.tier()==LanSound.Tier.DANGEROUS,
            "Frenzy buildup must not sound like a mundane device");
        check(LanSound.Cue.LOCKED_DOOR_RATTLE.tier()==LanSound.Tier.MODERATE,
            "Sealed door has a distinct mechanical/supernatural cue");
        Set<String> mapped=new HashSet<>();
        for(LanSound.Cue cue:new LanSound.Cue[]{
                LanSound.Cue.HORROR_STING_A,LanSound.Cue.HORROR_STING_B,
                LanSound.Cue.HORROR_STING_C}){
            for(int variation=0;variation<6;variation++){
                String path=RecordedSfx.variantName(cue,variation);
                check(mapped.add(path)&&path.endsWith("_"+variation+".wav"),
                    "Horror variant names must be unique and source-addressable");
                check(LanSound.decode(new LanSound.CueEvent(cue,0,80,124).frame()).cue()==cue,
                    "Horror cue must round-trip over host audio protocol");
            }
        }
        check(mapped.size()==18,"18 generic sounds should be available as three pools");
        boolean bad=false;
        try{RecordedSfx.variantName(LanSound.Cue.DOOR,0);}
        catch(IllegalArgumentException expected){bad=true;}
        check(bad,"Normal doors may never enter the generic horror pool");
        // The rattle is ONLY meaningful when the actual shared-world Frenzy seal
        // rejects movement. Ordinary traversable room boundaries stay silent.
        HouseMap map=new HouseMap();
        LanWorld world=new LanWorld(map);
        world.setRoom(0,13); // front porch, next to van staging (room 14)
        world.setExitSealed(true);
        int blockedTick=-1;
        for(int t=1;t<40;t++){
            try{world.move(0,100,0,t);}
            catch(IllegalArgumentException e){
                check("frenzy sealed the van extraction threshold".equals(e.getMessage()),
                    "Unexpected collision while approaching sealed threshold: "+e.getMessage());
                blockedTick=t;break;
            }
        }
        check(blockedTick>0&&world.body(0).room()==13,
            "sealed boundary must reject movement before an audio rattle is valid");
        world.setExitSealed(false);
        check(world.move(0,100,0,blockedTick+1)&&world.body(0).room()==14,
            "an unsealed threshold must remain a normal silent crossing");
        System.out.println("PASS HorrorAudioRoutingTest / 18 unique generic variants + authentic sealed door state");
    }
}
