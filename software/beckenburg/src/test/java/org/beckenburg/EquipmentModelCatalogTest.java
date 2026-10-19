package org.beckenburg;

/** Regression for every equipment-tier and authored physical-state import.
 * Unknown names remain rejected even though the build copies a Blender subset.
 */
public final class EquipmentModelCatalogTest {
    public static void main(String[] args) {
        if(EquipmentModelCatalog.stageCount()!=126 ||
           EquipmentModelCatalog.variantCount()!=36)
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
        for(String forbidden:new String[]{"blender_unreviewed_3","blender_emf_reader_4",
                "blender_dots_projector_1_remote","../blender_dots_projector_1"}) {
            if(EquipmentModelCatalog.approved(forbidden))
                throw new AssertionError("Unreviewed asset admitted: "+forbidden);
            try { GlbProps.model(forbidden);throw new AssertionError("Loader admitted "+forbidden); }
            catch(IllegalArgumentException expected) { /* strict rejection */ }
        }
        if(count!=126)throw new AssertionError("Wrong model count "+count);
        System.out.println("PASS: 126 catalog-selected tier meshes, 36 authored states, strict source allowlist");
    }
}
