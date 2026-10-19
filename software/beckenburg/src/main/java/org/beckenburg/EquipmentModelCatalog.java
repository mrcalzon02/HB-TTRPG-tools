package org.beckenburg;

import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/** Strict code-side counterpart to the checked-in equipment-assets.json.
 * Source model filenames, physical tiers, and additional states are explicit;
 * no directory wildcard or unreviewed glTF file becomes runtime-approved.
 */
final class EquipmentModelCatalog {
    private EquipmentModelCatalog() { }
    private record Stage(String id, EquipmentTiers.Tier tier, String model, boolean original) { }
    private record Variant(String id, EquipmentTiers.Tier tier, String state, String model) { }
    private static final Stage[] SOURCE_STAGES = {
        new Stage("DOTS_PROJECTOR", EquipmentTiers.Tier.I, "blender_dots_projector_1", false),
        new Stage("DOTS_PROJECTOR", EquipmentTiers.Tier.II, "blender_dots_projector_2", false),
        new Stage("DOTS_PROJECTOR", EquipmentTiers.Tier.III, "blender_dots_projector_3", false),
        new Stage("EMF_READER", EquipmentTiers.Tier.I, "exploration_emf_detector", true),
        new Stage("EMF_READER", EquipmentTiers.Tier.II, "blender_emf_reader_2", false),
        new Stage("EMF_READER", EquipmentTiers.Tier.III, "blender_emf_reader_3", false),
        new Stage("FLASHLIGHT", EquipmentTiers.Tier.I, "exploration_flashlight_poquet", true),
        new Stage("FLASHLIGHT", EquipmentTiers.Tier.II, "exploration_flashlight", true),
        new Stage("FLASHLIGHT", EquipmentTiers.Tier.III, "blender_flashlight_3", false),
        new Stage("GHOST_WRITING_BOOK", EquipmentTiers.Tier.I, "book_mp_1", true),
        new Stage("GHOST_WRITING_BOOK", EquipmentTiers.Tier.II, "blender_ghost_writing_book_2", false),
        new Stage("GHOST_WRITING_BOOK", EquipmentTiers.Tier.III, "blender_ghost_writing_book_3", false),
        new Stage("SPIRIT_BOX", EquipmentTiers.Tier.I, "exploration_spirit_box", true),
        new Stage("SPIRIT_BOX", EquipmentTiers.Tier.II, "blender_spirit_box_2", false),
        new Stage("SPIRIT_BOX", EquipmentTiers.Tier.III, "blender_spirit_box_3", false),
        new Stage("THERMOMETER", EquipmentTiers.Tier.I, "exploration_thermometer", true),
        new Stage("THERMOMETER", EquipmentTiers.Tier.II, "blender_thermometer_2", false),
        new Stage("THERMOMETER", EquipmentTiers.Tier.III, "blender_thermometer_3", false),
        new Stage("UV_LIGHT", EquipmentTiers.Tier.I, "blender_uv_light_1", false),
        new Stage("UV_LIGHT", EquipmentTiers.Tier.II, "blender_uv_light_2", false),
        new Stage("UV_LIGHT", EquipmentTiers.Tier.III, "blender_uv_light_3", false),
        new Stage("VIDEO_CAMERA", EquipmentTiers.Tier.I, "blender_video_camera_1", false),
        new Stage("VIDEO_CAMERA", EquipmentTiers.Tier.II, "blender_video_camera_2", false),
        new Stage("VIDEO_CAMERA", EquipmentTiers.Tier.III, "blender_video_camera_3", false),
        new Stage("CRUCIFIX", EquipmentTiers.Tier.I, "cross_mp_2", true),
        new Stage("CRUCIFIX", EquipmentTiers.Tier.II, "blender_crucifix_2", false),
        new Stage("CRUCIFIX", EquipmentTiers.Tier.III, "blender_crucifix_3", false),
        new Stage("FIRELIGHT", EquipmentTiers.Tier.I, "blender_firelight_1", false),
        new Stage("FIRELIGHT", EquipmentTiers.Tier.II, "blender_firelight_2", false),
        new Stage("FIRELIGHT", EquipmentTiers.Tier.III, "blender_firelight_3", false),
        new Stage("HEAD_GEAR", EquipmentTiers.Tier.I, "blender_head_gear_1", false),
        new Stage("HEAD_GEAR", EquipmentTiers.Tier.II, "blender_head_gear_2", false),
        new Stage("HEAD_GEAR", EquipmentTiers.Tier.III, "blender_head_gear_3", false),
        new Stage("IGNITER", EquipmentTiers.Tier.I, "blender_igniter_1", false),
        new Stage("IGNITER", EquipmentTiers.Tier.II, "blender_igniter_2", false),
        new Stage("IGNITER", EquipmentTiers.Tier.III, "blender_igniter_3", false),
        new Stage("INCENSE", EquipmentTiers.Tier.I, "blender_incense_1", false),
        new Stage("INCENSE", EquipmentTiers.Tier.II, "blender_incense_2", false),
        new Stage("INCENSE", EquipmentTiers.Tier.III, "blender_incense_3", false),
        new Stage("MOTION_SENSOR", EquipmentTiers.Tier.I, "blender_motion_sensor_1", false),
        new Stage("MOTION_SENSOR", EquipmentTiers.Tier.II, "blender_motion_sensor_2", false),
        new Stage("MOTION_SENSOR", EquipmentTiers.Tier.III, "blender_motion_sensor_3", false),
        new Stage("PARABOLIC_MICROPHONE", EquipmentTiers.Tier.I, "blender_parabolic_microphone_1", false),
        new Stage("PARABOLIC_MICROPHONE", EquipmentTiers.Tier.II, "blender_parabolic_microphone_2", false),
        new Stage("PARABOLIC_MICROPHONE", EquipmentTiers.Tier.III, "blender_parabolic_microphone_3", false),
        new Stage("PHOTO_CAMERA", EquipmentTiers.Tier.I, "exploration_photo_camera", true),
        new Stage("PHOTO_CAMERA", EquipmentTiers.Tier.II, "blender_photo_camera_2", false),
        new Stage("PHOTO_CAMERA", EquipmentTiers.Tier.III, "blender_photo_camera_3", false),
        new Stage("SALT", EquipmentTiers.Tier.I, "blender_salt_1", false),
        new Stage("SALT", EquipmentTiers.Tier.II, "blender_salt_2", false),
        new Stage("SALT", EquipmentTiers.Tier.III, "blender_salt_3", false),
        new Stage("SANITY_MEDICATION", EquipmentTiers.Tier.I, "blender_sanity_medication_1", false),
        new Stage("SANITY_MEDICATION", EquipmentTiers.Tier.II, "blender_sanity_medication_2", false),
        new Stage("SANITY_MEDICATION", EquipmentTiers.Tier.III, "blender_sanity_medication_3", false),
        new Stage("SOUND_RECORDER", EquipmentTiers.Tier.I, "blender_sound_recorder_1", true),
        new Stage("SOUND_RECORDER", EquipmentTiers.Tier.II, "blender_sound_recorder_2", true),
        new Stage("SOUND_RECORDER", EquipmentTiers.Tier.III, "blender_sound_recorder_3", true),
        new Stage("SOUND_SENSOR", EquipmentTiers.Tier.I, "blender_sound_sensor_1", false),
        new Stage("SOUND_SENSOR", EquipmentTiers.Tier.II, "blender_sound_sensor_2", false),
        new Stage("SOUND_SENSOR", EquipmentTiers.Tier.III, "blender_sound_sensor_3", false),
        new Stage("TRIPOD", EquipmentTiers.Tier.I, "blender_tripod_1", false),
        new Stage("TRIPOD", EquipmentTiers.Tier.II, "blender_tripod_2", false),
        new Stage("TRIPOD", EquipmentTiers.Tier.III, "blender_tripod_3", false),
        new Stage("CLIPBOARDS", EquipmentTiers.Tier.I, "blender_clipboards_1", false),
        new Stage("CLIPBOARDS", EquipmentTiers.Tier.II, "blender_clipboards_2", false),
        new Stage("CLIPBOARDS", EquipmentTiers.Tier.III, "blender_clipboards_3", false),
        new Stage("COMPUTER", EquipmentTiers.Tier.I, "pc_mp_1", true),
        new Stage("COMPUTER", EquipmentTiers.Tier.II, "blender_computer_2", false),
        new Stage("COMPUTER", EquipmentTiers.Tier.III, "blender_computer_3", false),
        new Stage("OBJECTIVE_BOARD", EquipmentTiers.Tier.I, "blender_objective_board_1", false),
        new Stage("OBJECTIVE_BOARD", EquipmentTiers.Tier.II, "blender_objective_board_2", false),
        new Stage("OBJECTIVE_BOARD", EquipmentTiers.Tier.III, "blender_objective_board_3", false),
        new Stage("SANITY_MONITOR", EquipmentTiers.Tier.I, "monitoring_screen_mp_1", true),
        new Stage("SANITY_MONITOR", EquipmentTiers.Tier.II, "blender_sanity_monitor_2", false),
        new Stage("SANITY_MONITOR", EquipmentTiers.Tier.III, "blender_sanity_monitor_3", false),
        new Stage("SITE_ACTIVITY_MONITOR", EquipmentTiers.Tier.I, "monitoring_screen_mp_1", true),
        new Stage("SITE_ACTIVITY_MONITOR", EquipmentTiers.Tier.II, "blender_site_activity_monitor_2", false),
        new Stage("SITE_ACTIVITY_MONITOR", EquipmentTiers.Tier.III, "blender_site_activity_monitor_3", false),
        new Stage("SITE_MAP", EquipmentTiers.Tier.I, "blender_site_map_1", false),
        new Stage("SITE_MAP", EquipmentTiers.Tier.II, "blender_site_map_2", false),
        new Stage("SITE_MAP", EquipmentTiers.Tier.III, "blender_site_map_3", false),
        new Stage("SOUND_MONITOR", EquipmentTiers.Tier.I, "blender_sound_monitor_1", false),
        new Stage("SOUND_MONITOR", EquipmentTiers.Tier.II, "blender_sound_monitor_2", false),
        new Stage("SOUND_MONITOR", EquipmentTiers.Tier.III, "blender_sound_monitor_3", false),
        new Stage("ANCHOR_TRIANGULATOR", EquipmentTiers.Tier.I, "blender_anchor_triangulator_1", false),
        new Stage("ANCHOR_TRIANGULATOR", EquipmentTiers.Tier.II, "blender_anchor_triangulator_2", false),
        new Stage("ANCHOR_TRIANGULATOR", EquipmentTiers.Tier.III, "blender_anchor_triangulator_3", false),
        new Stage("ECTOPLASM_SAMPLER", EquipmentTiers.Tier.I, "blender_ectoplasm_sampler_1", false),
        new Stage("ECTOPLASM_SAMPLER", EquipmentTiers.Tier.II, "blender_ectoplasm_sampler_2", false),
        new Stage("ECTOPLASM_SAMPLER", EquipmentTiers.Tier.III, "blender_ectoplasm_sampler_3", false),
        new Stage("RESONANCE_TUNER", EquipmentTiers.Tier.I, "blender_resonance_tuner_1", false),
        new Stage("RESONANCE_TUNER", EquipmentTiers.Tier.II, "blender_resonance_tuner_2", false),
        new Stage("RESONANCE_TUNER", EquipmentTiers.Tier.III, "blender_resonance_tuner_3", false),
        new Stage("BAROMETRIC_PROBE", EquipmentTiers.Tier.I, "blender_barometric_probe_1", false),
        new Stage("BAROMETRIC_PROBE", EquipmentTiers.Tier.II, "blender_barometric_probe_2", false),
        new Stage("BAROMETRIC_PROBE", EquipmentTiers.Tier.III, "blender_barometric_probe_3", false),
        new Stage("SEISMIC_RECORDER", EquipmentTiers.Tier.I, "blender_seismic_recorder_1", false),
        new Stage("SEISMIC_RECORDER", EquipmentTiers.Tier.II, "blender_seismic_recorder_2", false),
        new Stage("SEISMIC_RECORDER", EquipmentTiers.Tier.III, "blender_seismic_recorder_3", false),
        new Stage("SPECTRAL_PRISM", EquipmentTiers.Tier.I, "blender_spectral_prism_1", false),
        new Stage("SPECTRAL_PRISM", EquipmentTiers.Tier.II, "blender_spectral_prism_2", false),
        new Stage("SPECTRAL_PRISM", EquipmentTiers.Tier.III, "blender_spectral_prism_3", false),
        new Stage("LASER_GRID", EquipmentTiers.Tier.I, "blender_laser_grid_1", false),
        new Stage("LASER_GRID", EquipmentTiers.Tier.II, "blender_laser_grid_2", false),
        new Stage("LASER_GRID", EquipmentTiers.Tier.III, "blender_laser_grid_3", false),
        new Stage("EMF_ARRAY", EquipmentTiers.Tier.I, "blender_emf_array_1", false),
        new Stage("EMF_ARRAY", EquipmentTiers.Tier.II, "blender_emf_array_2", false),
        new Stage("EMF_ARRAY", EquipmentTiers.Tier.III, "blender_emf_array_3", false),
        new Stage("THERMAL_BEACON", EquipmentTiers.Tier.I, "blender_thermal_beacon_1", false),
        new Stage("THERMAL_BEACON", EquipmentTiers.Tier.II, "blender_thermal_beacon_2", false),
        new Stage("THERMAL_BEACON", EquipmentTiers.Tier.III, "blender_thermal_beacon_3", false),
        new Stage("RITUAL_ANCHOR_METER", EquipmentTiers.Tier.I, "blender_ritual_anchor_meter_1", false),
        new Stage("RITUAL_ANCHOR_METER", EquipmentTiers.Tier.II, "blender_ritual_anchor_meter_2", false),
        new Stage("RITUAL_ANCHOR_METER", EquipmentTiers.Tier.III, "blender_ritual_anchor_meter_3", false),
        new Stage("WARD_STABILITY_PROBE", EquipmentTiers.Tier.I, "blender_ward_stability_probe_1", false),
        new Stage("WARD_STABILITY_PROBE", EquipmentTiers.Tier.II, "blender_ward_stability_probe_2", false),
        new Stage("WARD_STABILITY_PROBE", EquipmentTiers.Tier.III, "blender_ward_stability_probe_3", false),
        new Stage("OBJECT_IMPRINT_SCANNER", EquipmentTiers.Tier.I, "blender_object_imprint_scanner_1", false),
        new Stage("OBJECT_IMPRINT_SCANNER", EquipmentTiers.Tier.II, "blender_object_imprint_scanner_2", false),
        new Stage("OBJECT_IMPRINT_SCANNER", EquipmentTiers.Tier.III, "blender_object_imprint_scanner_3", false),
        new Stage("CHALK_SIGIL_KIT", EquipmentTiers.Tier.I, "blender_chalk_sigil_kit_1", false),
        new Stage("CHALK_SIGIL_KIT", EquipmentTiers.Tier.II, "blender_chalk_sigil_kit_2", false),
        new Stage("CHALK_SIGIL_KIT", EquipmentTiers.Tier.III, "blender_chalk_sigil_kit_3", false),
        new Stage("SPECTRAL_FREQUENCY_ANALYZER", EquipmentTiers.Tier.I, "blender_spectral_frequency_analyzer_1", false),
        new Stage("SPECTRAL_FREQUENCY_ANALYZER", EquipmentTiers.Tier.II, "blender_spectral_frequency_analyzer_2", false),
        new Stage("SPECTRAL_FREQUENCY_ANALYZER", EquipmentTiers.Tier.III, "blender_spectral_frequency_analyzer_3", false)
    };
    private static final Variant[] SOURCE_VARIANTS = {
        new Variant("DOTS_PROJECTOR", EquipmentTiers.Tier.I, "deployed", "blender_dots_projector_1_deployed"),
        new Variant("DOTS_PROJECTOR", EquipmentTiers.Tier.II, "deployed", "blender_dots_projector_2_deployed"),
        new Variant("DOTS_PROJECTOR", EquipmentTiers.Tier.III, "deployed", "blender_dots_projector_3_deployed"),
        new Variant("GHOST_WRITING_BOOK", EquipmentTiers.Tier.I, "open", "open_book_mp_1"),
        new Variant("GHOST_WRITING_BOOK", EquipmentTiers.Tier.II, "open", "blender_ghost_writing_book_2_open"),
        new Variant("GHOST_WRITING_BOOK", EquipmentTiers.Tier.III, "open", "blender_ghost_writing_book_3_open"),
        new Variant("FIRELIGHT", EquipmentTiers.Tier.I, "lit", "blender_firelight_1_lit"),
        new Variant("FIRELIGHT", EquipmentTiers.Tier.II, "lit", "blender_firelight_2_lit"),
        new Variant("FIRELIGHT", EquipmentTiers.Tier.III, "lit", "blender_firelight_3_lit"),
        new Variant("IGNITER", EquipmentTiers.Tier.I, "lit", "blender_igniter_1_lit"),
        new Variant("IGNITER", EquipmentTiers.Tier.II, "lit", "blender_igniter_2_lit"),
        new Variant("IGNITER", EquipmentTiers.Tier.III, "lit", "blender_igniter_3_lit"),
        new Variant("INCENSE", EquipmentTiers.Tier.I, "burning", "blender_incense_1_burning"),
        new Variant("INCENSE", EquipmentTiers.Tier.II, "burning", "blender_incense_2_burning"),
        new Variant("INCENSE", EquipmentTiers.Tier.III, "burning", "blender_incense_3_burning"),
        new Variant("SALT", EquipmentTiers.Tier.I, "deployed", "blender_salt_1_deployed"),
        new Variant("SALT", EquipmentTiers.Tier.II, "deployed", "blender_salt_2_deployed"),
        new Variant("SALT", EquipmentTiers.Tier.III, "deployed", "blender_salt_3_deployed"),
        new Variant("TRIPOD", EquipmentTiers.Tier.I, "folded", "blender_tripod_1_folded"),
        new Variant("TRIPOD", EquipmentTiers.Tier.II, "folded", "blender_tripod_2_folded"),
        new Variant("TRIPOD", EquipmentTiers.Tier.III, "folded", "blender_tripod_3_folded"),
        new Variant("ECTOPLASM_SAMPLER", EquipmentTiers.Tier.I, "open", "blender_ectoplasm_sampler_1_open"),
        new Variant("ECTOPLASM_SAMPLER", EquipmentTiers.Tier.II, "open", "blender_ectoplasm_sampler_2_open"),
        new Variant("ECTOPLASM_SAMPLER", EquipmentTiers.Tier.III, "open", "blender_ectoplasm_sampler_3_open"),
        new Variant("LASER_GRID", EquipmentTiers.Tier.I, "deployed", "blender_laser_grid_1_deployed"),
        new Variant("LASER_GRID", EquipmentTiers.Tier.II, "deployed", "blender_laser_grid_2_deployed"),
        new Variant("LASER_GRID", EquipmentTiers.Tier.III, "deployed", "blender_laser_grid_3_deployed"),
        new Variant("EMF_ARRAY", EquipmentTiers.Tier.I, "node", "blender_emf_array_1_node"),
        new Variant("EMF_ARRAY", EquipmentTiers.Tier.II, "node", "blender_emf_array_2_node"),
        new Variant("EMF_ARRAY", EquipmentTiers.Tier.III, "node", "blender_emf_array_3_node"),
        new Variant("THERMAL_BEACON", EquipmentTiers.Tier.I, "node", "blender_thermal_beacon_1_node"),
        new Variant("THERMAL_BEACON", EquipmentTiers.Tier.II, "node", "blender_thermal_beacon_2_node"),
        new Variant("THERMAL_BEACON", EquipmentTiers.Tier.III, "node", "blender_thermal_beacon_3_node"),
        new Variant("CHALK_SIGIL_KIT", EquipmentTiers.Tier.I, "deployed", "blender_chalk_sigil_kit_1_deployed"),
        new Variant("CHALK_SIGIL_KIT", EquipmentTiers.Tier.II, "deployed", "blender_chalk_sigil_kit_2_deployed"),
        new Variant("CHALK_SIGIL_KIT", EquipmentTiers.Tier.III, "deployed", "blender_chalk_sigil_kit_3_deployed")
    };
    private static final Map<String,Stage> STAGES;
    private static final Map<String,String> VARIANTS;
    private static final Set<String> ALLOWED;
    private static String key(String id, EquipmentTiers.Tier tier) {
        return id + "|" + tier.name();
    }
    static {
        Map<String,Stage> stages = new HashMap<>();
        Map<String,String> variants = new HashMap<>();
        Set<String> names = new HashSet<>();
        for (Stage stage : SOURCE_STAGES) {
            EquipmentTiers.get(stage.id());
            if (stages.putIfAbsent(key(stage.id(),stage.tier()),stage)!=null)
                throw new ExceptionInInitializerError("Duplicate tiered model: "+stage.id());
            names.add(stage.model());
        }
        for (Variant v : SOURCE_VARIANTS) {
            String k = key(v.id(),v.tier());
            if (!stages.containsKey(k) ||
                    variants.putIfAbsent(k+"|"+v.state(),v.model())!=null)
                throw new ExceptionInInitializerError("Invalid equipment physical state: "+k);
            names.add(v.model());
        }
        for (EquipmentTiers.Plan plan : EquipmentTiers.all())
            for (EquipmentTiers.Tier tier : EquipmentTiers.Tier.values())
                if (!stages.containsKey(key(plan.id(),tier)))
                    throw new ExceptionInInitializerError("Missing equipment tier: "+plan.id()+"/"+tier);
        if (stages.size()!=126 || variants.size()!=36)
            throw new ExceptionInInitializerError("Incomplete source equipment model inventory");
        STAGES = Collections.unmodifiableMap(stages);
        VARIANTS = Collections.unmodifiableMap(variants);
        ALLOWED = Collections.unmodifiableSet(names);
    }
    static String model(String id, EquipmentTiers.Tier tier) {
        Objects.requireNonNull(id);Objects.requireNonNull(tier);
        Stage value=STAGES.get(key(id,tier));
        if(value==null)throw new IllegalArgumentException("Unknown equipment model "+id+"/"+tier);
        return value.model();
    }
    static boolean original(String id,EquipmentTiers.Tier tier) {
        Stage value=STAGES.get(key(id,tier));
        if(value==null)throw new IllegalArgumentException("Unknown equipment model "+id+"/"+tier);
        return value.original();
    }
    static String variant(String id,EquipmentTiers.Tier tier,String state) {
        Objects.requireNonNull(state);
        String name=VARIANTS.get(key(id,tier)+"|"+state);
        if(name==null)throw new IllegalArgumentException("Unsupported model physical state "+id+"/"+tier+"/"+state);
        return name;
    }
    static boolean approved(String name) { return ALLOWED.contains(name); }
    static int stageCount() { return STAGES.size(); }
    static int variantCount() { return VARIANTS.size(); }
}
