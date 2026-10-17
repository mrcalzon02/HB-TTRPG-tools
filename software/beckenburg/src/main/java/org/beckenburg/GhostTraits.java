package org.beckenburg;

import java.util.Objects;

/** Authoritative species rules shared by solo and LAN simulation. */
public final class GhostTraits {
    private GhostTraits() { }
    public enum Locomotion { WALK, FLOAT }
    public enum Passage { DOORS, WALLS }
    public enum Sight { VISIBLE, CAMERA_ONLY, ORBS }
    public enum Charge { AMBIENT, ISOLATION, PRESENCE }
    public record Profile(Locomotion locomotion, Passage passage, Sight sight, Charge charge,
                          int chargePeriod, int fearPercent, int harmPercent,
                          boolean huntsSolitary, boolean leavesUv, String clue) {
        public Profile {
            Objects.requireNonNull(locomotion);Objects.requireNonNull(passage);
            Objects.requireNonNull(sight);Objects.requireNonNull(charge);
            Objects.requireNonNull(clue);
            if(chargePeriod<1||fearPercent<0||harmPercent<0||clue.isBlank())
                throw new IllegalArgumentException("invalid species profile");
        }
        public boolean grounded(){return locomotion==Locomotion.WALK;}
        public boolean canPhase(){return passage==Passage.WALLS;}
    }
    public static Profile of(GhostIdentity.Type type) {
        return switch(Objects.requireNonNull(type)) {
            case POSSESSIVE -> new Profile(Locomotion.WALK,Passage.DOORS,Sight.VISIBLE,Charge.ISOLATION,4,115,60,true,true,"Moves objects near its attachment; waits for isolation");
            case POLTERGEIST -> new Profile(Locomotion.WALK,Passage.DOORS,Sight.VISIBLE,Charge.PRESENCE,3,90,125,false,true,"Violent object storms and ordinary door passage");
            case DEMON -> new Profile(Locomotion.WALK,Passage.DOORS,Sight.VISIBLE,Charge.AMBIENT,2,90,160,false,false,"Hard strikes; relatively little fear for the harm");
            case YOKAI -> new Profile(Locomotion.FLOAT,Passage.DOORS,Sight.ORBS,Charge.PRESENCE,3,150,40,false,false,"Floating voice-chaser that still opens doors");
            case BANSHEE -> new Profile(Locomotion.FLOAT,Passage.DOORS,Sight.VISIBLE,Charge.ISOLATION,3,180,65,true,false,"Wails and picks out isolated investigators");
            case WRAITH -> new Profile(Locomotion.FLOAT,Passage.WALLS,Sight.VISIBLE,Charge.ISOLATION,4,115,95,false,true,"Floats directly through walls without opening doors");
            case SHADE -> new Profile(Locomotion.FLOAT,Passage.WALLS,Sight.CAMERA_ONLY,Charge.ISOLATION,2,160,0,true,true,"Camera apparition when no investigator is watching");
            case SPECTER -> new Profile(Locomotion.FLOAT,Passage.WALLS,Sight.CAMERA_ONLY,Charge.AMBIENT,3,125,0,false,true,"Camera-only figure and spectral wall traces");
            case SPIRIT -> new Profile(Locomotion.WALK,Passage.DOORS,Sight.VISIBLE,Charge.AMBIENT,3,100,100,false,true,"Footsteps, opened doors, and ordinary traces");
            case HANTU -> new Profile(Locomotion.FLOAT,Passage.DOORS,Sight.ORBS,Charge.ISOLATION,3,165,70,false,false,"Cold orbs moving through open doorways");
            case DEVIL -> new Profile(Locomotion.WALK,Passage.DOORS,Sight.VISIBLE,Charge.PRESENCE,2,185,90,true,true,"Feeds on a lone investigator's sanity");
            case MIMIC -> new Profile(Locomotion.WALK,Passage.DOORS,Sight.VISIBLE,Charge.PRESENCE,4,135,75,false,true,"Repeats voices and gains strength from nearby listeners");
            case TWINS -> new Profile(Locomotion.FLOAT,Passage.DOORS,Sight.ORBS,Charge.AMBIENT,2,135,65,false,false,"Twin orbs and paired knocks, never wall-phases");
        };
    }
    /** Periodic energy only if the species has the conditions it needs. */
    public static int gained(GhostIdentity.Type type,int tick,int occupants){
        if(tick<0||occupants<0)throw new IllegalArgumentException("invalid energy context");
        Profile p=of(type);
        boolean allowed=switch(p.charge()){
            case AMBIENT->true; case ISOLATION->occupants==0; case PRESENCE->occupants>0;
        };
        return allowed&&tick%p.chargePeriod()==0?1:0;
    }
    /** Slow but perceptible drain; only feeding species with a living target in the room. */
    public static int passiveFear(GhostIdentity.Type type,int tick,int occupants){
        if(tick<0||occupants<0)throw new IllegalArgumentException("invalid sanity context");
        Profile p=of(type);
        return p.charge()==Charge.PRESENCE&&occupants>0&&tick%18==0?1:0;
    }
    public static int fear(GhostIdentity.Type type,int baseline){
        return Math.max(0,(baseline*of(type).fearPercent()+50)/100);
    }
    public static int harm(GhostIdentity.Type type,int baseline){
        return Math.max(0,(baseline*of(type).harmPercent()+50)/100);
    }
    /** Physical tracks and slowing salt affect walkers only, never floating species. */
    public static boolean saltAffects(GhostIdentity.Type type){return of(type).grounded();}
}