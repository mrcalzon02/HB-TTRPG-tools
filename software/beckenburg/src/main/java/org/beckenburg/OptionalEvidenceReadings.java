package org.beckenburg;

import java.util.List;
import java.util.Objects;

/**
 * Planned, observable instrument output shapes for additional equipment.
 * These are concrete acceptance specifications, NOT current generated readings.
 * Event-linked detectors must be built before any of them enter the logbook.
 */
public final class OptionalEvidenceReadings {
    private OptionalEvidenceReadings(){}
    public record Target(EquipmentRegistry.Evidence family,String deviceId,
                         String displayedReading,String physicalSource){
        public Target{
            Objects.requireNonNull(family);Objects.requireNonNull(deviceId);
            if(displayedReading==null||displayedReading.isBlank()
                ||physicalSource==null||physicalSource.isBlank())
                throw new IllegalArgumentException("missing instrument response");
            if(!EquipmentRegistry.get(deviceId).candidateReadings().contains(family))
                throw new IllegalArgumentException("device cannot inspect that phenomenon");
        }
    }
    private static Target t(EquipmentRegistry.Evidence family,String device,
                             String displayed,String cause){
        return new Target(family,device,displayed,cause);
    }
    public static List<Target> planned(GhostIdentity.Type ghost){
        Objects.requireNonNull(ghost);
        return switch(ghost){
            case POSSESSIVE -> List.of(
                t(EquipmentRegistry.Evidence.OBJECT_IMPRINT,"OBJECT_IMPRINT_SCANNER",
                  "Handled keepsake: luminous imprint strength 1–10",
                  "Ghost actually moves its favored physical object"),
                t(EquipmentRegistry.Evidence.ECTOPLASM,"ECTOPLASM_SAMPLER",
                  "Adhesive residue: mass in mg / sample viability",
                  "Ghost touches its bound keepsake"));
            case POLTERGEIST -> List.of(
                t(EquipmentRegistry.Evidence.SEISMIC_IMPACT,"SEISMIC_RECORDER",
                  "Clustered impacts: mm/s peak and impacts/min",
                  "Ghost physically rattles and throws multiple objects"),
                t(EquipmentRegistry.Evidence.OBJECT_IMPRINT,"OBJECT_IMPRINT_SCANNER",
                  "Object impact: new spectral surface-contact pattern",
                  "A moving object collides with an actual surface"));
            case DEMON -> List.of(
                t(EquipmentRegistry.Evidence.RESONANCE,"RESONANCE_TUNER",
                  "Low harmonic: frequency in Hz, amplitude in dB",
                  "Ghost performs a real aggressive voiced action"),
                t(EquipmentRegistry.Evidence.ATMOSPHERIC_REVERSAL,"BAROMETRIC_PROBE",
                  "Pressure drop: relative hPa and event duration",
                  "Ghost strikes a doorway and displaces interior air"));
            case YOKAI -> List.of(
                t(EquipmentRegistry.Evidence.RESONANCE,"RESONANCE_TUNER",
                  "Reply harmonics: Hz bands and response delay in ms",
                  "Ghost reacts to an actual audible hunter voice"),
                t(EquipmentRegistry.Evidence.SEISMIC_IMPACT,"SEISMIC_RECORDER",
                  "Door impulses: mm/s peak and knock timing",
                  "Ghost interacts with its door during a sound reaction"));
            case BANSHEE -> List.of(
                t(EquipmentRegistry.Evidence.ECTOPLASM,"ECTOPLASM_SAMPLER",
                  "Mist residue: collected mg and sample decay time",
                  "Wailing ghost leaves a physical deposit at its manifestation"),
                t(EquipmentRegistry.Evidence.RESONANCE,"RESONANCE_TUNER",
                  "Sustained wail: Hz pitch curve and duration",
                  "Actual wail emitted by ghost signature event"));
            case WRAITH -> List.of(
                t(EquipmentRegistry.Evidence.STRUCTURED_LIGHT,"LASER_GRID",
                  "Beam crossing: occlusion count and path through wall",
                  "Wraith crosses a real solid partition"),
                t(EquipmentRegistry.Evidence.ATMOSPHERIC_REVERSAL,"BAROMETRIC_PROBE",
                  "Wall displacement: differential hPa and duration",
                  "Ghost passes through a sealed partition"));
            case SHADE -> List.of(
                t(EquipmentRegistry.Evidence.SPECTRAL_SHADOW,"SPECTRAL_PRISM",
                  "Camera silhouette: affected frame area and seconds visible",
                  "Actual camera-only apparition holds its position"),
                t(EquipmentRegistry.Evidence.ATMOSPHERIC_REVERSAL,"BAROMETRIC_PROBE",
                  "Stagnant-air pocket: hPa difference and settling time",
                  "Ghost lingers motionless in its haunted room"));
            case SPECTER -> List.of(
                t(EquipmentRegistry.Evidence.SPECTRAL_SHADOW,"SPECTRAL_PRISM",
                  "Persistent shadow: camera mask area and afterimage time",
                  "Actual camera-only apparition persists after moving"),
                t(EquipmentRegistry.Evidence.RESONANCE,"RESONANCE_TUNER",
                  "Lingering spectral hum: Hz peak and fade time",
                  "Ghost manifestation emits a real persistent sound"));
            case SPIRIT -> List.of(
                t(EquipmentRegistry.Evidence.OBJECT_IMPRINT,"OBJECT_IMPRINT_SCANNER",
                  "Touched handle: spectral contact location and strength",
                  "Spirit opens a door or handles a physical object"),
                t(EquipmentRegistry.Evidence.SEISMIC_IMPACT,"SEISMIC_RECORDER",
                  "Footfalls: pace in steps/min and mm/s peak",
                  "Actual grounded spirit walks across sensor range"));
            case HANTU -> List.of(
                t(EquipmentRegistry.Evidence.ATMOSPHERIC_REVERSAL,"BAROMETRIC_PROBE",
                  "Cold front: hPa change correlated with real thermal drop",
                  "Hantu moves cold air through a doorway"),
                t(EquipmentRegistry.Evidence.ECTOPLASM,"ECTOPLASM_SAMPLER",
                  "Frost-associated deposit: viable material mass in mg",
                  "Ghost physically leaves residue in the chilled room"));
            case DEVIL -> List.of(
                t(EquipmentRegistry.Evidence.RESONANCE,"RESONANCE_TUNER",
                  "Coherent whisper: Hz bands and utterance duration",
                  "Ghost performs an actual bargain-like vocal event"),
                t(EquipmentRegistry.Evidence.OBJECT_IMPRINT,"OBJECT_IMPRINT_SCANNER",
                  "Marked bargaining object: spectral contact score",
                  "Ghost interacts with the item it is addressing"));
            case MIMIC -> List.of(
                t(EquipmentRegistry.Evidence.OBJECT_IMPRINT,"OBJECT_IMPRINT_SCANNER",
                  "Repeated object mark: displacement direction and intensity",
                  "Ghost reuses a truly disturbed object"),
                t(EquipmentRegistry.Evidence.RESONANCE,"RESONANCE_TUNER",
                  "Copied voice: recorded waveform correlation and delay",
                  "Ghost audibly imitates an actually captured voice"));
            case ANCIENT_POSSESSIVE, ANCIENT_POLTERGEIST, ANCIENT_DEMON, ANCIENT_YOKAI, ANCIENT_BANSHEE, ANCIENT_WRAITH, ANCIENT_SHADE, ANCIENT_SPECTER, ANCIENT_HANTU, ANCIENT_TWINS -> ancientPlan(ghost);
            case TWINS -> List.of(
                t(EquipmentRegistry.Evidence.SEISMIC_IMPACT,"SEISMIC_RECORDER",
                  "Paired knocks: peaks in mm/s and inter-event gap in ms",
                  "Ghost emits two genuine spatially separated knocks"),
                t(EquipmentRegistry.Evidence.RESONANCE,"RESONANCE_TUNER",
                  "Dual echoes: two Hz bands and phase delay",
                  "Paired real spectral vocal signals occur"));
        };
    }
    /**
     * Ancient variants retain their parent's authored detector physics wherever
     * their new evidence matrix selects that family. Variant-only families must
     * still describe a concrete observable event, never an invented reading.
     */
    private static List<Target> ancientPlan(GhostIdentity.Type ghost){
        List<Target> inherited=planned(ghost.baseType());
        return GhostEvidenceMatrix.forGhost(ghost).future().stream().map(family->
            inherited.stream().filter(existing->existing.family()==family)
                .findFirst().orElseGet(()->ancientExtra(ghost,family))).toList();
    }
    private static Target ancientExtra(GhostIdentity.Type ghost,EquipmentRegistry.Evidence family){
        return switch(ghost){
            case ANCIENT_POSSESSIVE -> switch(family){
                case SPECTRAL_SHADOW -> t(family,"SPECTRAL_PRISM",
                    "Keepsake silhouette: spectral area and persistence time",
                    "Ancient possessive manifests a camera-visible silhouette at its claimed object");
                default -> throw new IllegalArgumentException("Unspecified ancient possessive detector: "+family);
            };
            case ANCIENT_POLTERGEIST -> switch(family){
                case STRUCTURED_LIGHT -> t(family,"LASER_GRID",
                    "Disrupted beam pattern: occlusions and crossing speed",
                    "Ancient poltergeist moves a real thrown object across the active grid");
                case RESONANCE -> t(family,"RESONANCE_TUNER",
                    "Impact harmonics: frequency peaks and decay time",
                    "Ancient poltergeist's actual object barrage excites resonant room surfaces");
                default -> throw new IllegalArgumentException("Unspecified ancient poltergeist detector: "+family);
            };
            case ANCIENT_DEMON -> switch(family){
                case ECTOPLASM -> t(family,"ECTOPLASM_SAMPLER",
                    "Aggression deposit: recovered mass in mg and decay time",
                    "Ancient demon leaves physical residue at a genuine attack manifestation");
                default -> throw new IllegalArgumentException("Unspecified ancient demon detector: "+family);
            };
            case ANCIENT_YOKAI -> switch(family){
                case OBJECT_IMPRINT -> t(family,"OBJECT_IMPRINT_SCANNER",
                    "Voice-reaction imprint: affected surface and contact strength",
                    "Ancient yokai touches an actual door or object in response to hunter speech");
                default -> throw new IllegalArgumentException("Unspecified ancient yokai detector: "+family);
            };
            case ANCIENT_BANSHEE -> switch(family){
                case ATMOSPHERIC_REVERSAL -> t(family,"BAROMETRIC_PROBE",
                    "Wail pressure front: differential hPa and duration",
                    "Ancient banshee emits an actual wail that displaces air near the probe");
                case SPECTRAL_SHADOW -> t(family,"SPECTRAL_PRISM",
                    "Wailing apparition: camera silhouette area and visible seconds",
                    "Ancient banshee manifests visibly to a camera during an actual wail");
                default -> throw new IllegalArgumentException("Unspecified ancient banshee detector: "+family);
            };
            case ANCIENT_WRAITH -> switch(family){
                case SPECTRAL_SHADOW -> t(family,"SPECTRAL_PRISM",
                    "Partition silhouette: camera occlusion and persistence",
                    "Ancient wraith visibly phases through a real room partition");
                default -> throw new IllegalArgumentException("Unspecified ancient wraith detector: "+family);
            };
            case ANCIENT_SHADE -> switch(family){
                case OBJECT_IMPRINT -> t(family,"OBJECT_IMPRINT_SCANNER",
                    "Quiet contact mark: location and lingering strength",
                    "Ancient shade touches a real object during its lurking event");
                case ECTOPLASM -> t(family,"ECTOPLASM_SAMPLER",
                    "Lurking deposit: collected mass and sample lifetime",
                    "Ancient shade leaves a physical deposit at its stationary manifestation");
                default -> throw new IllegalArgumentException("Unspecified ancient shade detector: "+family);
            };
            case ANCIENT_SPECTER -> switch(family){
                case STRUCTURED_LIGHT -> t(family,"LASER_GRID",
                    "Afterimage crossing: interrupted rays and duration",
                    "Ancient specter's genuine moving apparition crosses an active laser grid");
                default -> throw new IllegalArgumentException("Unspecified ancient specter detector: "+family);
            };
            case ANCIENT_HANTU -> switch(family){
                case SEISMIC_IMPACT -> t(family,"SEISMIC_RECORDER",
                    "Cold-room footfall: measured velocity and impact timing",
                    "Ancient hantu actually walks across a floor within recorder range");
                default -> throw new IllegalArgumentException("Unspecified ancient hantu detector: "+family);
            };
            case ANCIENT_TWINS -> switch(family){
                case OBJECT_IMPRINT -> t(family,"OBJECT_IMPRINT_SCANNER",
                    "Paired marks: separate contact points and relative strengths",
                    "Ancient twins disturb two real objects during a paired ghost event");
                default -> throw new IllegalArgumentException("Unspecified ancient twins detector: "+family);
            };
            default -> throw new IllegalArgumentException("Not an ancient variant: "+ghost);
        };
    }

}
