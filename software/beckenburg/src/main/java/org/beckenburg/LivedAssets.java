package org.beckenburg;
import java.util.Set;
/** Original CC0 libraries and separately licensed unchanged source props. */
public final class LivedAssets {
    private LivedAssets(){}
    public static final Set<String> ORIGINAL=Set.of("level_boiler_coal","level_boiler_oil","level_boiler_modern","level_expansion_vessel",
        "level_school_pipework","level_electrical_bank","level_workbench","level_radiator","level_hiding_cupboard","level_coal_bunker",
        "level_lived_shelf","level_lived_pantry","level_lived_curio","level_lived_sideboard","level_lived_card_table",
        "level_lived_ottoman","level_lived_trunk","level_lived_desk_clutter","level_lived_kitchenware","level_lived_toy_basket","level_lived_linen_press",
        "level_loose_mug","level_loose_bottle","level_loose_book","level_loose_tin","level_loose_bowl","level_loose_toy","level_loose_frame","level_loose_candlestick",
        "level_event_phone","level_event_alarm_clock","level_event_fire_alarm","level_event_radio","level_event_boom_box","level_event_side_table");
    public static final Set<String> SOURCED=Set.of("coffee_table_1","display_cabinet_mp_1","display_cabinet_mp_2_1","shelf_mp_4","table_large_2",
        "cardboard_box_1","cardboard_box_2","wooden_crate_2","metal_barrel_mp_1","book_mp_3","book_mp_4","book_mp_5","notebook_1","pencil_mp_1",
        "photo_frame_mp_2","clock_2","tv_remote_mp_1","planter_pot_mp_1_full","potted_cactus_mp_1","toy_brick_1","toy_brick_1_1","toy_brick_1_2",
        "vhs_tape_1","tin_can_mp_1_rusty","jerrycan_1","canned_food_mp_1","canned_food_mp_2");
    public static String base(String id){return id.endsWith("_worn")?id.substring(0,id.length()-5):id;}
    public static String worn(String id){return ORIGINAL.contains(id)?id+"_worn":id;}
    public static boolean approved(String id){return ORIGINAL.contains(base(id))||SOURCED.contains(id);}
}
