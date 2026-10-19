package org.beckenburg;

import java.util.Objects;

/**
 * Authoritative artwork/prefab choice by *physical device category and tier*.
 * Keeps source-licensed GLBs intact and manufactures a tier-specific mesh where
 * an actual matching existing mesh is not present. This is visual metadata,
 * never a claim that an unimplemented instrument has gameplay functionality.
 *
 * Future mission manifest instances must resolve their own selected tier via
 * this method, not via whoever happens to pick them up.
 */
public final class EquipmentTierVisuals {
    private EquipmentTierVisuals(){}
    public record Prefab(String equipmentId,EquipmentTiers.Tier tier,
                         String modelName,boolean synthesized,
                         String shelfCategory){
        public Prefab {
            Objects.requireNonNull(equipmentId);Objects.requireNonNull(tier);
            if(modelName==null||modelName.isBlank()||shelfCategory==null
                    ||shelfCategory.isBlank())
                throw new IllegalArgumentException("physical prefab missing");
        }
    }
    private static String shelf(EquipmentTiers.Plan plan){
        return switch(plan.role()){
            case SENSOR,AUDIO,OPTICAL -> "EVIDENCE_HANDHELD";
            case PROJECTOR,DEPLOYABLE -> "DEPLOYABLE_RACK";
            case CONSUMABLE -> "MEDICAL_CONSUMABLE";
            case DEFENSE -> "PROTECTION_SUPPLIES";
            case MONITOR -> "MONITOR_MOUNTS";
            case RITUAL -> "RITUAL_MOUNTS";
            case UTILITY -> "UTILITY_SHELF";
        };
    }
    public static Prefab prefab(String id,EquipmentTiers.Tier tier){
        EquipmentTiers.Plan plan=EquipmentTiers.get(id);
        Objects.requireNonNull(tier);
        // Only match a real supplied model to a compatible role. Additional
        // quality tiers get a newly authored housing instead of scaled copies.
        String original=switch(id){
            case "EMF_READER" -> switch(tier){
                case I->"exploration_emf_detector";
                case II->"dosimeter_2";
                case III->"dosimeter_4";
            };
            case "SPIRIT_BOX"->switch(tier){
                case I->"exploration_spirit_box";
                case II->"walkie_talkie_2";
                case III->null;
            };
            case "THERMOMETER"->switch(tier){
                case I->"exploration_thermometer";
                case II->"handheld_tablet_1";
                case III->null;
            };
            case "FLASHLIGHT"->switch(tier){
                case I->"exploration_flashlight_poquet";
                case II->"exploration_flashlight";
                case III->null;
            };
            case "PHOTO_CAMERA"->tier==EquipmentTiers.Tier.I
                ?"exploration_photo_camera":null;
            case "GHOST_WRITING_BOOK"->tier==EquipmentTiers.Tier.I?"book_mp_1":null;
            case "DOTS_PROJECTOR"->tier==EquipmentTiers.Tier.I?"vape_mp_1":null;
            case "COMPUTER"->tier==EquipmentTiers.Tier.I?"pc_mp_1":null;
            case "SANITY_MONITOR","SITE_ACTIVITY_MONITOR"->tier==EquipmentTiers.Tier.I
                ?"monitoring_screen_mp_1":null;
            case "SOUND_RECORDER"->tier==EquipmentTiers.Tier.I
                ?"exploration_voice_recorder":null;
            default->null;
        };
        boolean synth=original==null;
        return new Prefab(id,tier,synth?TierModelForge.name(id,tier):original,
            synth,shelf(plan));
    }
    public static GlbProps.Model model(String id,EquipmentTiers.Tier tier){
        return GlbProps.model(prefab(id,tier).modelName());
    }
}
