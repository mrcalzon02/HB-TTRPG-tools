package org.beckenburg;

import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/** Complete reference equipment baseline plus original Beckenburg candidates.
 * Registry is authoritative for planning/status, not evidence award or player inventory.
 * PARTIAL_SOURCE means code exists, NOT a verified playable implementation.
 */
public final class EquipmentRegistry {
    private EquipmentRegistry() { }
    public enum Origin { STARTER, OPTIONAL, TRUCK, ORIGINAL }
    public enum Purpose { EVIDENCE, SURVEY, COUNTER, CONSUMABLE, MONITOR, RITUAL }
    public enum State { ABSENT, PARTIAL_SOURCE }
    public enum Evidence { HIGH_EMF, FREEZING, EXTREME_HEAT, SPIRIT_REPLY,
        UV_MARKS, GHOST_WRITING, SPIRIT_ORBS, STRUCTURED_LIGHT, ECTOPLASM,
        RESONANCE, SEISMIC_IMPACT, ATMOSPHERIC_REVERSAL, SPECTRAL_SHADOW, OBJECT_IMPRINT }
    public record Tool(String id, String name, Origin origin, Purpose purpose,
                       State solo, State lan, Set<Evidence> candidateReadings) {
        public Tool {
            if(id==null||!id.matches("[A-Z][A-Z0-9_]*")||name==null||name.isBlank())
                throw new IllegalArgumentException("invalid item identifier");
            Objects.requireNonNull(origin);Objects.requireNonNull(purpose);
            Objects.requireNonNull(solo);Objects.requireNonNull(lan);
            candidateReadings=Set.copyOf(candidateReadings);
        }
    }
    private static Tool entry(String id,String name,Origin origin,Purpose purpose,
                              State solo,State lan,Evidence... evidence) {
        Set<Evidence> readings=EnumSet.noneOf(Evidence.class);
        for(Evidence signal:evidence)readings.add(signal);
        return new Tool(id,name,origin,purpose,solo,lan,readings);
    }
    private static final List<Tool> ALL = List.of(
        entry("DOTS_PROJECTOR","Pattern projector",Origin.STARTER,Purpose.EVIDENCE,State.ABSENT,State.ABSENT,Evidence.STRUCTURED_LIGHT),
        entry("EMF_READER","EMF reader (1–10)",Origin.STARTER,Purpose.EVIDENCE,State.PARTIAL_SOURCE,State.PARTIAL_SOURCE,Evidence.HIGH_EMF),
        entry("FLASHLIGHT","Flashlight",Origin.STARTER,Purpose.SURVEY,State.PARTIAL_SOURCE,State.PARTIAL_SOURCE),
        entry("GHOST_WRITING_BOOK","Ghost writing book",Origin.STARTER,Purpose.EVIDENCE,State.ABSENT,State.ABSENT,Evidence.GHOST_WRITING),
        entry("SPIRIT_BOX","Spirit box",Origin.STARTER,Purpose.EVIDENCE,State.PARTIAL_SOURCE,State.PARTIAL_SOURCE,Evidence.SPIRIT_REPLY),
        entry("THERMOMETER","Thermometer (°C/°F)",Origin.STARTER,Purpose.EVIDENCE,State.PARTIAL_SOURCE,State.PARTIAL_SOURCE,Evidence.FREEZING,Evidence.EXTREME_HEAT),
        entry("UV_LIGHT","UV light",Origin.STARTER,Purpose.EVIDENCE,State.PARTIAL_SOURCE,State.PARTIAL_SOURCE,Evidence.UV_MARKS),
        entry("VIDEO_CAMERA","Video camera / remote feed",Origin.STARTER,Purpose.EVIDENCE,State.ABSENT,State.ABSENT,Evidence.SPIRIT_ORBS,Evidence.SPECTRAL_SHADOW),
        entry("CRUCIFIX","Protective cross",Origin.OPTIONAL,Purpose.COUNTER,State.PARTIAL_SOURCE,State.PARTIAL_SOURCE),
        entry("FIRELIGHT","Firelight / candle",Origin.OPTIONAL,Purpose.SURVEY,State.ABSENT,State.ABSENT),
        entry("HEAD_GEAR","Head camera / helmet light",Origin.OPTIONAL,Purpose.SURVEY,State.ABSENT,State.ABSENT,Evidence.SPIRIT_ORBS),
        entry("IGNITER","Igniter",Origin.OPTIONAL,Purpose.SURVEY,State.ABSENT,State.ABSENT),
        entry("INCENSE","Incense / smoke dispersal",Origin.OPTIONAL,Purpose.COUNTER,State.ABSENT,State.ABSENT),
        entry("MOTION_SENSOR","Motion sensor",Origin.OPTIONAL,Purpose.SURVEY,State.ABSENT,State.ABSENT),
        entry("PARABOLIC_MICROPHONE","Parabolic microphone",Origin.OPTIONAL,Purpose.SURVEY,State.ABSENT,State.ABSENT),
        entry("PHOTO_CAMERA","Photo camera",Origin.OPTIONAL,Purpose.SURVEY,State.PARTIAL_SOURCE,State.ABSENT,Evidence.SPECTRAL_SHADOW),
        entry("SALT","Salt",Origin.OPTIONAL,Purpose.SURVEY,State.PARTIAL_SOURCE,State.PARTIAL_SOURCE,Evidence.UV_MARKS),
        entry("SANITY_MEDICATION","Sanity treatment",Origin.OPTIONAL,Purpose.CONSUMABLE,State.PARTIAL_SOURCE,State.PARTIAL_SOURCE),
        entry("SOUND_RECORDER","Sound recorder",Origin.OPTIONAL,Purpose.SURVEY,State.ABSENT,State.ABSENT,Evidence.SPIRIT_REPLY),
        entry("SOUND_SENSOR","Sound sensor",Origin.OPTIONAL,Purpose.SURVEY,State.ABSENT,State.ABSENT),
        entry("TRIPOD","Tripod / camera mount",Origin.OPTIONAL,Purpose.SURVEY,State.ABSENT,State.ABSENT),
        entry("CLIPBOARDS","Task clipboards",Origin.TRUCK,Purpose.MONITOR,State.ABSENT,State.ABSENT),
        entry("COMPUTER","Camera console",Origin.TRUCK,Purpose.MONITOR,State.ABSENT,State.ABSENT,Evidence.SPIRIT_ORBS),
        entry("OBJECTIVE_BOARD","Objective board",Origin.TRUCK,Purpose.MONITOR,State.PARTIAL_SOURCE,State.PARTIAL_SOURCE),
        entry("SANITY_MONITOR","Sanity monitor",Origin.TRUCK,Purpose.MONITOR,State.ABSENT,State.PARTIAL_SOURCE),
        entry("SITE_ACTIVITY_MONITOR","Site activity monitor",Origin.TRUCK,Purpose.MONITOR,State.ABSENT,State.PARTIAL_SOURCE),
        entry("SITE_MAP","Location map",Origin.TRUCK,Purpose.MONITOR,State.PARTIAL_SOURCE,State.PARTIAL_SOURCE),
        entry("SOUND_MONITOR","Sound monitor",Origin.TRUCK,Purpose.MONITOR,State.ABSENT,State.ABSENT),
        entry("ANCHOR_TRIANGULATOR","Anchor triangulator",Origin.ORIGINAL,Purpose.SURVEY,State.ABSENT,State.ABSENT),
        entry("ECTOPLASM_SAMPLER","Ectoplasm swab and assay",Origin.ORIGINAL,Purpose.EVIDENCE,State.ABSENT,State.ABSENT,Evidence.ECTOPLASM),
        entry("RESONANCE_TUNER","Resonance tuning forks",Origin.ORIGINAL,Purpose.EVIDENCE,State.ABSENT,State.ABSENT,Evidence.RESONANCE),
        entry("BAROMETRIC_PROBE","Barometric anomaly probe",Origin.ORIGINAL,Purpose.EVIDENCE,State.ABSENT,State.ABSENT,Evidence.ATMOSPHERIC_REVERSAL),
        entry("SEISMIC_RECORDER","Seismic floor recorder",Origin.ORIGINAL,Purpose.EVIDENCE,State.ABSENT,State.ABSENT,Evidence.SEISMIC_IMPACT),
        entry("SPECTRAL_PRISM","Spectral prism filter",Origin.ORIGINAL,Purpose.EVIDENCE,State.ABSENT,State.ABSENT,Evidence.SPECTRAL_SHADOW),
        entry("LASER_GRID","Lidar displacement grid",Origin.ORIGINAL,Purpose.EVIDENCE,State.ABSENT,State.ABSENT,Evidence.STRUCTURED_LIGHT),
        entry("EMF_ARRAY","Deployable EMF array",Origin.ORIGINAL,Purpose.SURVEY,State.ABSENT,State.ABSENT,Evidence.HIGH_EMF),
        entry("THERMAL_BEACON","Remote thermal probe array",Origin.ORIGINAL,Purpose.SURVEY,State.ABSENT,State.ABSENT,Evidence.FREEZING,Evidence.EXTREME_HEAT),
        entry("RITUAL_ANCHOR_METER","Ritual anchor meter",Origin.ORIGINAL,Purpose.RITUAL,State.ABSENT,State.ABSENT),
        entry("WARD_STABILITY_PROBE","Ward stability probe",Origin.ORIGINAL,Purpose.RITUAL,State.ABSENT,State.ABSENT),
        entry("OBJECT_IMPRINT_SCANNER","Anomalous object imprint kit",Origin.ORIGINAL,Purpose.EVIDENCE,State.ABSENT,State.ABSENT,Evidence.OBJECT_IMPRINT),
        entry("CHALK_SIGIL_KIT","Chalk and portable sigils",Origin.ORIGINAL,Purpose.RITUAL,State.ABSENT,State.ABSENT),
        entry("SPECTRAL_FREQUENCY_ANALYZER","Spectral frequency analyzer",Origin.ORIGINAL,Purpose.SURVEY,State.ABSENT,State.ABSENT,Evidence.RESONANCE)
    );
    static {
        Set<String> ids=new HashSet<>();
        for(Tool item:ALL)if(!ids.add(item.id()))
            throw new AssertionError("duplicate equipment id: "+item.id());
    }
    public static List<Tool> all(){return ALL;}
    public static Tool get(String id){
        Objects.requireNonNull(id);
        return ALL.stream().filter(x->x.id().equals(id)).findFirst()
            .orElseThrow(()->new IllegalArgumentException("unknown item: "+id));
    }
    public static List<Tool> byOrigin(Origin origin){
        Objects.requireNonNull(origin);
        return ALL.stream().filter(x->x.origin()==origin).toList();
    }
    /** Nonempty evidence associations are candidates, NOT implemented detection claims. */
    public static List<Tool> couldDetect(Evidence evidence){
        Objects.requireNonNull(evidence);
        return ALL.stream().filter(x->x.candidateReadings().contains(evidence)).toList();
    }
}
