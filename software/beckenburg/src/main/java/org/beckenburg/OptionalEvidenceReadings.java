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
            case TWINS -> List.of(
                t(EquipmentRegistry.Evidence.SEISMIC_IMPACT,"SEISMIC_RECORDER",
                  "Paired knocks: peaks in mm/s and inter-event gap in ms",
                  "Ghost emits two genuine spatially separated knocks"),
                t(EquipmentRegistry.Evidence.RESONANCE,"RESONANCE_TUNER",
                  "Dual echoes: two Hz bands and phase delay",
                  "Paired real spectral vocal signals occur"));
        };
    }
}
