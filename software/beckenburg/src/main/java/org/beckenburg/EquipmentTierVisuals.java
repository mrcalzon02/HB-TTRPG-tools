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
        // The vetted source inventory owns each tier's default physical mesh.
        // Never silently substitute the older generalized synthesized housing.
        String selected=EquipmentModelCatalog.model(id,tier);
        return new Prefab(id,tier,selected,
            !EquipmentModelCatalog.original(id,tier),shelf(plan));
    }
    public static GlbProps.Model model(String id,EquipmentTiers.Tier tier){
        return GlbProps.model(prefab(id,tier).modelName());
    }
}
