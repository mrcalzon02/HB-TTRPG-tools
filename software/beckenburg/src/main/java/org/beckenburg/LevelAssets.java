package org.beckenburg;

import java.util.Set;

/** Curated architectural scenery, separate from owned investigation equipment. */
public final class LevelAssets {
    private LevelAssets(){}
    public static final Set<String> MODELS=Set.of(
        "bed_4","bed_5","bed_1","bed_2","bedside_table_1","toilet_mp_1","carpet_mp_1",
        "photo_frame_mp_1","painting_1","clock_1","wooden_crate_1","pipe_1","book_mp_2","plate_mp_1",
        "lamp_1_on","lamp_1_off","lamp_2_on","lamp_2_off","lamp_5_on","lamp_5_off",
        "ceiling_lamp_2_on","ceiling_lamp_2_off","ceiling_lamp_mp_1_on","ceiling_lamp_mp_1_off",
        "level_kitchen_counter","level_bath_basin","level_bathtub","level_domestic_light",
        "level_wall_sconce","level_utility_light","level_fireplace","level_bedding_double","level_bedding_single","level_table_lamp",
        "level_hay_bale","level_stall","level_corn","level_blackboard","level_student_desk","level_lockers","level_basketball_hoop");
    public static boolean approved(String id){return MODELS.contains(id);}
}
