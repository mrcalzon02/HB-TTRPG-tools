package org.beckenburg;

/** Regression for every equipment-tier and authored physical-state import.
 * Unknown names remain rejected even though the build copies a Blender subset.
 */
public final class EquipmentModelCatalogTest {
    public static void main(String[] args) {
        if(EquipmentModelCatalog.stageCount()!=129 ||EquipmentModelCatalog.variantCount()!=44
                ||EquipmentModelCatalog.canonicalModelCount()!=113||EquipmentModelCatalog.variantModelCount()!=40
                ||EquipmentModelCatalog.approvedModels().size()!=153)
            throw new AssertionError("Catalog stages/states incomplete");
        int count=0;
        for(EquipmentTiers.Plan plan:EquipmentTiers.all()) {
            for(EquipmentTiers.Tier tier:EquipmentTiers.Tier.values()) {
                String chosen=EquipmentModelCatalog.model(plan.id(),tier);
                if(!EquipmentModelCatalog.approved(chosen))
                    throw new AssertionError("Unapproved physical tier "+chosen);
                if(!EquipmentTierVisuals.prefab(plan.id(),tier).modelName().equals(chosen))
                    throw new AssertionError("Wrong physical tier "+plan.id()+"/"+tier);
                if(GlbProps.model(chosen).triangles().isEmpty())
                    throw new AssertionError("No mesh triangles "+chosen);
                count++;
            }
        }
        for(EquipmentTiers.Tier tier:EquipmentTiers.Tier.values()) {
            String deployed=EquipmentModelCatalog.variant("DOTS_PROJECTOR",tier,"deployed");
            if(!EquipmentModelCatalog.approved(deployed)||GlbProps.model(deployed).triangles().isEmpty())
                throw new AssertionError("Missing deployed projector "+tier);
        }
        for(FieldSupplies.Tier tier:FieldSupplies.Tier.values()){
            String health=EquipmentModelCatalog.supplyModel(FieldSupplies.Kind.HEALTH,tier);
            String sanity=EquipmentModelCatalog.supplyModel(FieldSupplies.Kind.SANITY,tier);
            if(health.equals(sanity)||!EquipmentModelCatalog.approved(health)||GlbProps.model(health).triangles().isEmpty())
                throw new AssertionError("Health supplies incorrectly assigned "+tier);
        }
        for(String fixed:new String[]{"COMPUTER","SANITY_MONITOR","SITE_ACTIVITY_MONITOR","SOUND_MONITOR","SITE_MAP","CLIPBOARDS","OBJECTIVE_BOARD"}){
            String first=EquipmentModelCatalog.model(fixed,EquipmentTiers.Tier.I);
            for(EquipmentTiers.Tier tier:EquipmentTiers.Tier.values())if(!first.equals(EquipmentModelCatalog.model(fixed,tier)))
                throw new AssertionError("Fixed fixture gained an upgrade model: "+fixed);
        }
        for(String resource:EquipmentModelCatalog.approvedModels())
            if(GlbProps.model(resource).triangles().isEmpty())throw new AssertionError("Empty delivered GLB "+resource);
        for(String forbidden:new String[]{"blender_unreviewed_3","blender_emf_reader_4",
                "blender_dots_projector_1_remote","../blender_dots_projector_1","blender_computer_2","blender_site_map_3"}) {
            if(EquipmentModelCatalog.approved(forbidden))
                throw new AssertionError("Unreviewed asset admitted: "+forbidden);
            try { GlbProps.model(forbidden);throw new AssertionError("Loader admitted "+forbidden); }
            catch(IllegalArgumentException expected) { /* strict rejection */ }
        }
        if(count!=126)throw new AssertionError("Wrong model count "+count);
        System.out.println("PASS: 126 equipment slots +3 health slots, 44 state aliases /40 meshes, 7 fixed fixtures, 153-file allowlist");
    }
}
