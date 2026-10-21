package org.beckenburg;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Objects;

/** In-game field guide: separates mechanically defined clues from non-exclusive behavioral hypotheses. */
public final class GhostFieldGuide {
    private GhostFieldGuide(){}
    public enum Category { EMF, TEMPERATURE, SPIRIT_BOX, WRITING, PHYSICAL, CAMERA, BEHAVIOR }
    public enum Clue {
        EMF_OVER_SIX(Category.EMF,"Ghost high EMF / 8–10",true),
        EMF_LOW_MID(Category.EMF,"Ghost low/mid EMF / 2–7",true),
        EMF_NORMAL(Category.EMF,"Ordinary EMF / 2–7",false),
        EMF_SUPPRESSION(Category.EMF,"EMF zero / suppressed field",true),
        WRITING_CHILD(Category.WRITING,"Childlike drawings",true),
        WRITING_SCRAWL(Category.WRITING,"Frantic scrawls",true),
        WRITING_RITUAL(Category.WRITING,"Ritual circles",true),
        EXTREME_COLD(Category.TEMPERATURE,"Freezing / below 0°C",true),
        EXTREME_HEAT(Category.TEMPERATURE,"Extreme heat / 90°F+",true),
        TEMPERATURE_NORMAL(Category.TEMPERATURE,"Variable ordinary temperature",false),
        SPIRIT_REPLY(Category.SPIRIT_BOX,"Spirit-box response",true),
        GHOST_WRITING(Category.WRITING,"Ghost writing",true),
        DOTS_PATTERN(Category.CAMERA,"D.O.T.S. light distortion",false),
        EMF_SURGE(Category.EMF,"EMF / pulsing field surge",false),
        EMF_TETHER(Category.EMF,"EMF / object tether resonance",false),
        EMF_KINETIC(Category.EMF,"EMF / clustered kinetic spikes",false),
        EMF_INTERFERENCE(Category.EMF,"EMF / patterned interference",false),
        COLD_ANCHOR(Category.TEMPERATURE,"Cold / anchor chill",false),
        COLD_POCKET(Category.TEMPERATURE,"Cold / isolated pocket",false),
        COLD_SHEAR(Category.TEMPERATURE,"Cold / thermal shear",false),
        COLD_DRAFT(Category.TEMPERATURE,"Cold / wall draft",false),
        VOICE_DIRECT(Category.SPIRIT_BOX,"Voice / clear direct reply",false),
        VOICE_ECHO(Category.SPIRIT_BOX,"Voice / double echo",false),
        VOICE_FRAGMENT(Category.SPIRIT_BOX,"Voice / fragmented syllables",false),
        VOICE_DISPLACED(Category.SPIRIT_BOX,"Voice / wrong-direction reply",false),
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
    /** Old EMF/temperature/voice subtype identifiers remain for save compatibility,
     * but are NOT actual evidence types and must not appear as active clues.
     */
    private static boolean retired(Clue clue){
        return switch(clue){
            case EMF_SURGE,EMF_TETHER,EMF_KINETIC,EMF_INTERFERENCE,
                 COLD_ANCHOR,COLD_POCKET,COLD_SHEAR,COLD_DRAFT,
                 VOICE_DIRECT,VOICE_ECHO,VOICE_FRAGMENT,VOICE_DISPLACED->true;
            default->false;
        };
    }
    public static Clue[] activeClues(){
        return java.util.Arrays.stream(Clue.values()).filter(c->!retired(c))
            .toArray(Clue[]::new);
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
        HINTS.put(GhostIdentity.Type.ELDER_BLADE_DEMON,"Dragging steel, heavy footfalls, a telegraphed executioner rush and sweeping weapon strikes.");
        HINTS.put(GhostIdentity.Type.ELDER_PLAGUE_DEMON,"A bell-bearing giant whose miasma, residue and pressure build around investigators.");
        HINTS.put(GhostIdentity.Type.ELDER_NOTHIC,"A territorial colossus whose charges end in shattering ground slams.");
        for(GhostIdentity.Type variant:GhostIdentity.Type.values())
            if(variant.ancient())
                HINTS.put(variant,HINTS.get(variant.baseType())+
                    " Older manifestation; green apparitions and an extended ritual.");
        if(HINTS.size()!=GhostIdentity.Type.values().length)throw new AssertionError("missing ghost guide entry");
    }
    public static String hint(GhostIdentity.Type type){return HINTS.get(Objects.requireNonNull(type));}
    public static String reference(GhostIdentity.Type type){
        Objects.requireNonNull(type);
        GhostTraits.Profile p=GhostTraits.of(type);
        return type.name().replace('_',' ') + "  /  " + type.rite().name()+"\n"
            +"EMF: "+switch(GhostEvidenceProfile.emfBand(type)){
                case HIGH->"HIGH (8–10)";
                case LOW_MID->"LOW/MID (2–7 ghost events)";
                case NONE->"NO EMF (0 at ghost events)";
            }
            +" | TEMP: "+switch(GhostEvidenceProfile.thermal(type)){
                case COLD->"FREEZING CAPABLE";
                case HOT->"EXTREME HEAT CAPABLE";
                case NONE->"VARIABLE ONLY";
            }+"\n"
            +"WRITING: "+java.util.Arrays.toString(GhostEvidenceProfile.availableWriting(type))+
            " | DOTS: "+(GhostEvidenceProfile.dotsVisible(type)?"YES":"NO")+"\n"
            +"ADDITIONAL INSTRUMENTS: "+GhostEvidenceMatrix.forGhost(type).future()+"\n"
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
            // Measurement categories no longer encode a specific ghost species.
            // Archive enum members only survive for old journal notes.
            case EMF_OVER_SIX,EMF_LOW_MID,EMF_NORMAL,EMF_SUPPRESSION,
                 EXTREME_COLD,EXTREME_HEAT,TEMPERATURE_NORMAL,
                 WRITING_CHILD,WRITING_SCRAWL,WRITING_RITUAL,
                 SPIRIT_REPLY,GHOST_WRITING,DOTS_PATTERN->GhostEvidenceProfile.compatible(type,clue);
            case EMF_SURGE,EMF_TETHER,EMF_KINETIC,EMF_INTERFERENCE,
                 COLD_ANCHOR,COLD_POCKET,COLD_SHEAR,COLD_DRAFT,
                 VOICE_DIRECT,VOICE_ECHO,VOICE_FRAGMENT,VOICE_DISPLACED->true;
            case FOOTPRINTS->p.grounded();
            case FLOATING->p.locomotion()==GhostTraits.Locomotion.FLOAT;
            case PHASE_WALL->p.canPhase();
            case DOOR_TO_TRAVEL->!p.canPhase();
            case UV_RESIDUE->p.leavesUv();
            case PHOTO_SHAPE->p.sight()==GhostTraits.Sight.VISIBLE;
            case REMOTE_EMPTY->p.sight()==GhostTraits.Sight.CAMERA_ONLY;
            case SPIRIT_ORBS->p.sight()==GhostTraits.Sight.ORBS;
            case SOLO_ATTACK->p.huntsSolitary();
            case SAME_TARGET->type.baseType()==GhostIdentity.Type.BANSHEE
                    ||type.baseType()==GhostIdentity.Type.POSSESSIVE
                    ||type.baseType()==GhostIdentity.Type.DEVIL;
            case PASSIVE_DRAIN->p.charge()==GhostTraits.Charge.PRESENCE;
            case GROUP_ATTACK->!p.huntsSolitary();
        };
    }
    /** Every selected checkmark is a player claim, never a server finding. */
    public static boolean remainsPossible(GhostIdentity.Type type,FieldJournal notes){
        Objects.requireNonNull(notes);Objects.requireNonNull(type);
        for(Clue clue:activeClues())
            if(clue.exclusionSafe&&notes.status(clue)==FieldJournal.Status.SEEN
                &&!possible(type,clue))return false;
        return true;
    }
    public static List<GhostIdentity.Type> shortlist(FieldJournal notes){
        Objects.requireNonNull(notes);
        List<GhostIdentity.Type> results=new ArrayList<>();
        for(GhostIdentity.Type type:GhostIdentity.Type.values()){
            if(remainsPossible(type,notes))results.add(type);
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