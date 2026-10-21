package org.beckenburg;

import java.awt.image.BufferedImage;
import java.io.IOException;
import java.util.EnumSet;
import java.util.List;
import java.util.Objects;
import javax.imageio.ImageIO;

/**
 * Read-only encyclopaedia entry used by the same field logbook in solo/LAN.
 * All evidence is species-capable information from the published field guide;
 * it NEVER reads the true active ghost or marks a case observation as verified.
 */
public final class GhostArchive {
    private GhostArchive(){}
    public record Entry(GhostIdentity.Type type,String description,
                        List<HardEvidenceQuota.Family> signature,
                        String behavior,String movement,String rite,
                        BufferedImage portrait){
        public Entry {
            Objects.requireNonNull(type);Objects.requireNonNull(portrait);
            signature=List.copyOf(signature);
            if(signature.size()!=3||description.isBlank()||behavior.isBlank())throw new IllegalArgumentException("incomplete archive entry");
        }
    }
    public static Entry entry(GhostIdentity.Type type){
        Objects.requireNonNull(type);
        var signature=HardEvidenceQuota.signature(type);
        GhostTraits.Profile p=GhostTraits.of(type);
        return new Entry(type,description(type),List.copyOf(signature),
            GhostFieldGuide.hint(type)+" "+GhostBehavior.profile(type).tell(),
            (p.grounded()?"Grounded":"Floating")+", "+(p.canPhase()?"passes solid walls":"uses doors")+
                ", "+(p.leavesUv()?"can leave UV traces":"not normally UV-traceable"),
            type.rite().name(),portrait(type));
    }
    private static String description(GhostIdentity.Type type){
        if(type.ancient())return description(type.baseType())+
            " This Ancient manifestation retains its lineage's movement and habits, but has a distinct evidence signature and a longer rite.";
        return switch(type){
            case POSSESSIVE -> "Attached to favored possessions. Its activity is often concentrated around particular objects, and isolation can intensify its fixation.";
            case POLTERGEIST -> "A violently kinetic presence known for agitating several objects in succession. Expect a physical struggle rather than a quiet vigil.";
            case DEMON -> "An aggressive predatory spirit whose manifestations favor direct injury and pressure. Its strength makes an exposed ritual especially dangerous.";
            case YOKAI -> "An elusive voice-chaser. It lures investigators with familiar sounds but still must use real passages between rooms.";
            case BANSHEE -> "A dreadful wailing entity which may repeatedly stalk an isolated victim. Distinguish the pattern from incidental room acoustics.";
            case WRAITH -> "A wall-phasing spectral hunter. Its movement can bypass ordinary doors, changing where a ritual perimeter is safe.";
            case SHADE -> "A hidden watcher strongest when no one observes it. A remote camera can reveal movement invisible to a crowded room.";
            case SPECTER -> "A lingering apparition that moves through solid boundaries. Its extended manifestations can make an apparently empty room unsafe.";
            case SPIRIT -> "A comparatively familiar haunting of voices, footsteps and opened doors. Ordinary appearances can still conceal significant danger.";
            case HANTU -> "A cold-associated floating entity constrained by doorways. Cold air alone is not sufficient to establish its identity.";
            case DEVIL -> "A tempting presence that exploits conversation, proximity and uncertainty. Lone investigators are particularly vulnerable to its pressure.";
            case MIMIC -> "A deliberate imitator which repeats calls and observed behavior. Apparent familiarity should not replace careful measurements.";
            case TWINS -> "A paired phenomenon associated with answering knocks and apparent activity in neighboring rooms. Correlate observations by time and place.";
            case ELDER_BLADE_DEMON -> "An enormous executioner armed with a colossal blade. Heavy footfalls telegraph pursuit, charging rushes and broad weapon strikes.";
            case ELDER_PLAGUE_DEMON -> "A bloated, bell-bearing Elder whose presence fills rooms with miasma. Watch for spreading atmospheric disturbances and corrosive residue.";
            case ELDER_NOTHIC -> "A reclusive, massive dark Elder that guards its territory. Low charges and earth-shaking slams make confined routes particularly hazardous.";
            default -> throw new IllegalStateException("Unexpected archive type "+type);
        };
    }
    public static BufferedImage portrait(GhostIdentity.Type type){
        Objects.requireNonNull(type);
        if(type.elder())return ElderArchivePortrait.front(type);
        String name=type.name().toLowerCase(java.util.Locale.ROOT);
        // Approved first-facing frame, including the authored Ancient green tint.
        BufferedImage frame=GhostSpriteAtlas.frame(name,0,"idle",0);
        if(frame==null)throw new IllegalStateException("Missing portrait for "+name);
        return frame;
    }
}
