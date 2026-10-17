package org.beckenburg;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Objects;

/** In-game field guide: separates mechanically defined clues from non-exclusive behavioral hypotheses. */
public final class GhostFieldGuide {
    private GhostFieldGuide(){}
    public enum Category { EMF, TEMPERATURE, SPIRIT_BOX, PHYSICAL, CAMERA, BEHAVIOR }
    public enum Clue {
        EMF_SURGE(Category.EMF,"EMF / pulsing field surge",true),
        EMF_TETHER(Category.EMF,"EMF / object tether resonance",true),
        EMF_KINETIC(Category.EMF,"EMF / clustered kinetic spikes",true),
        EMF_INTERFERENCE(Category.EMF,"EMF / patterned interference",true),
        COLD_ANCHOR(Category.TEMPERATURE,"Cold / anchor chill",true),
        COLD_POCKET(Category.TEMPERATURE,"Cold / isolated pocket",true),
        COLD_SHEAR(Category.TEMPERATURE,"Cold / thermal shear",true),
        COLD_DRAFT(Category.TEMPERATURE,"Cold / wall draft",true),
        VOICE_DIRECT(Category.SPIRIT_BOX,"Voice / clear direct reply",true),
        VOICE_ECHO(Category.SPIRIT_BOX,"Voice / double echo",true),
        VOICE_FRAGMENT(Category.SPIRIT_BOX,"Voice / fragmented syllables",true),
        VOICE_DISPLACED(Category.SPIRIT_BOX,"Voice / wrong-direction reply",true),
        FOOTPRINTS(Category.PHYSICAL,"Salt / actual footprints",true),
        FLOATING(Category.PHYSICAL,"Movement / seen floating",true),
        PHASE_WALL(Category.PHYSICAL,"Movement / passes solid wall",true),
        DOOR_TO_TRAVEL(Category.PHYSICAL,"Movement / uses door to change room",true),
        UV_RESIDUE(Category.PHYSICAL,"UV / trace on passage",true),
        PHOTO_SHAPE(Category.CAMERA,"Photo / visible figure",true),
        REMOTE_EMPTY(Category.CAMERA,"Remote video / empty-room figure",true),
        SPIRIT_ORBS(Category.CAMERA,"Video / spirit orbs",true),
        SOLO_ATTACK(Category.BEHAVIOR,"Pattern / attacked isolated hunter",false),
        SAME_TARGET(Category.BEHAVIOR,"Pattern / repeatedly targeted one hunter",false),
        PASSIVE_DRAIN(Category.BEHAVIOR,"Pattern / steady sanity drain nearby",false),
        GROUP_ATTACK(Category.BEHAVIOR,"Pattern / attacked grouped hunters",false);
        public final Category category;
        public final String label;
        public final boolean exclusionSafe;
        Clue(Category category,String label,boolean exclusionSafe){this.category=category;this.label=label;this.exclusionSafe=exclusionSafe;}
    }
    private static final EnumMap<GhostIdentity.Type,String> HINTS=new EnumMap<>(GhostIdentity.Type.class);
    static {
        HINTS.put(GhostIdentity.Type.POSSESSIVE,"Moves favored objects; a fixation on possessions may identify it.");
        HINTS.put(GhostIdentity.Type.POLTERGEIST,"Multiple objects rattle in sequence; investigate kinetic EMF peaks.");
        HINTS.put(GhostIdentity.Type.DEMON,"Direct violent pressure and repeated attacks; prioritize protection.");
        HINTS.put(GhostIdentity.Type.YOKAI,"Repeats familiar voices; a floating entity restricted to door routes.");
        HINTS.put(GhostIdentity.Type.BANSHEE,"Audible wails, possible repeated attention to one hunter; verify over multiple events.");
        HINTS.put(GhostIdentity.Type.WRAITH,"A floating wall-phaser; a witnessed solid-wall crossing is a strong clue.");
        HINTS.put(GhostIdentity.Type.SHADE,"Lingers in dark rooms; check unattended camera footage.");
        HINTS.put(GhostIdentity.Type.SPECTER,"Long-lived apparition and solid-wall travel; remote camera may see it alone.");
        HINTS.put(GhostIdentity.Type.SPIRIT,"Ordinary footfall, direct replies and subdued whispers.");
        HINTS.put(GhostIdentity.Type.HANTU,"Cold drafts and floating movement, but door-bound.");
        HINTS.put(GhostIdentity.Type.DEVIL,"Persuasive voices and high threat; health damage may dominate.");
        HINTS.put(GhostIdentity.Type.MIMIC,"Delayed repetition of calls; cross-check its voice signature.");
        HINTS.put(GhostIdentity.Type.TWINS,"Answered knocks from neighboring rooms; paired signs can mislead.");
        if(HINTS.size()!=GhostIdentity.Type.values().length)throw new AssertionError("missing ghost guide entry");
    }
    public static String hint(GhostIdentity.Type type){return HINTS.get(Objects.requireNonNull(type));}
    public static String reference(GhostIdentity.Type type){
        Objects.requireNonNull(type);
        GhostTraits.Profile p=GhostTraits.of(type);
        return type.name().replace('_',' ') + "  /  " + type.rite().name()+"\n"
            +"EMF "+type.emf()+" | COLD "+type.thermal()+" | VOICE "+type.voice()+"\n"
            +(p.locomotion()==GhostTraits.Locomotion.FLOAT?"FLOATING":"WALKING")
            +" / "+(p.canPhase()?"WALL PHASING":"DOOR TRAVEL")
            +" / SALT "+(p.grounded()?"REACTIVE":"IMMUNE")+"\n"
            +"UV "+yes(p.leavesUv())+" | PHOTO "+yes(p.sight()==GhostTraits.Sight.VISIBLE)
            +" | EMPTY VIDEO "+yes(p.sight()==GhostTraits.Sight.CAMERA_ONLY)+" | ORBS "+yes(p.sight()==GhostTraits.Sight.ORBS)+"\n"
            +"ACTIVITY: "+GhostBehavior.profile(type).favored()+"; "+hint(type);
    }
    private static String yes(boolean value){return value?"YES":"NO";}
    /** Only authoritative identity/physical trait categories can exclude; anecdotes cannot. */
    public static boolean possible(GhostIdentity.Type type,Clue clue){
        Objects.requireNonNull(type);Objects.requireNonNull(clue);
        GhostTraits.Profile p=GhostTraits.of(type);
        return switch(clue){
            case EMF_SURGE->type.emf()==GhostIdentity.Emf.FIELD_SURGE;
            case EMF_TETHER->type.emf()==GhostIdentity.Emf.TETHER;
            case EMF_KINETIC->type.emf()==GhostIdentity.Emf.KINETIC;
            case EMF_INTERFERENCE->type.emf()==GhostIdentity.Emf.INTERFERENCE;
            case COLD_ANCHOR->type.thermal()==GhostIdentity.Thermal.ANCHOR_CHILL;
            case COLD_POCKET->type.thermal()==GhostIdentity.Thermal.COLD_SPOT;
            case COLD_SHEAR->type.thermal()==GhostIdentity.Thermal.SHEAR;
            case COLD_DRAFT->type.thermal()==GhostIdentity.Thermal.WALL_DRAFT;
            case VOICE_DIRECT->type.voice()==GhostIdentity.Voice.DIRECT;
            case VOICE_ECHO->type.voice()==GhostIdentity.Voice.ECHO;
            case VOICE_FRAGMENT->type.voice()==GhostIdentity.Voice.FRAGMENT;
            case VOICE_DISPLACED->type.voice()==GhostIdentity.Voice.DISPLACED;
            case FOOTPRINTS->p.grounded();
            case FLOATING->p.locomotion()==GhostTraits.Locomotion.FLOAT;
            case PHASE_WALL->p.canPhase();
            case DOOR_TO_TRAVEL->!p.canPhase();
            case UV_RESIDUE->p.leavesUv();
            case PHOTO_SHAPE->p.sight()==GhostTraits.Sight.VISIBLE;
            case REMOTE_EMPTY->p.sight()==GhostTraits.Sight.CAMERA_ONLY;
            case SPIRIT_ORBS->p.sight()==GhostTraits.Sight.ORBS;
            case SOLO_ATTACK->p.huntsSolitary();
            case SAME_TARGET->type==GhostIdentity.Type.BANSHEE || type==GhostIdentity.Type.POSSESSIVE || type==GhostIdentity.Type.DEVIL;
            case PASSIVE_DRAIN->p.charge()==GhostTraits.Charge.PRESENCE;
            case GROUP_ATTACK->!p.huntsSolitary();
        };
    }
    public static List<GhostIdentity.Type> shortlist(FieldJournal notes){
        Objects.requireNonNull(notes);
        List<GhostIdentity.Type> results=new ArrayList<>();
        for(GhostIdentity.Type type:GhostIdentity.Type.values()){
            boolean valid=true;
            for(Clue clue:Clue.values())if(clue.exclusionSafe
                &&notes.status(clue)==FieldJournal.Status.SEEN && !possible(type,clue)){
                valid=false;break;
            }
            if(valid)results.add(type);
        }
        return List.copyOf(results);
    }
    /** Low-confidence behavior observations alter ranking, not hard exclusions. */
    public static int suspicion(GhostIdentity.Type type,FieldJournal notes){
        int score=0;
        for(Clue clue:Clue.values())if(notes.status(clue)==FieldJournal.Status.SEEN)
            score+=clue.exclusionSafe?0:(possible(type,clue)?3:-1);
        return score;
    }
    public static List<GhostIdentity.Type> ordered(FieldJournal notes){
        List<GhostIdentity.Type> result=new ArrayList<>(shortlist(notes));
        result.sort(Comparator.comparingInt((GhostIdentity.Type t)->suspicion(t,notes)).reversed()
                .thenComparing(GhostIdentity.Type::name));
        return List.copyOf(result);
    }
}