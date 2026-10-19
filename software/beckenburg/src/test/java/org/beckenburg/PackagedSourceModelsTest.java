package org.beckenburg;

/** Every packaged conversion, including roadside models, must load with its own textures. */
public final class PackagedSourceModelsTest {
    public static void main(String[] args)throws Exception {
        var directory=java.nio.file.Path.of("assets/runtime/models");
        int count=0;
        try(var paths=java.nio.file.Files.list(directory)){
            for(var file:paths.filter(p->p.toString().endsWith(".glb")).toList()){
                String name=file.getFileName().toString().replace(".glb","");
                var model=GlbProps.model(name);
                if(model.triangles().isEmpty())throw new AssertionError(name);
                for(var tri:model.triangles())
                    GlbProps.sample(tri.material(),tri.a().u(),tri.a().v());
                count++;
            }
        }
        if(count<189)throw new AssertionError("missing original/Blender source models: "+count);
        if(EquipmentModelCatalog.stageCount()!=126 ||
                EquipmentModelCatalog.variantCount()!=36)
            throw new AssertionError("incomplete physical equipment model map");
        for(EquipmentTiers.Plan plan:EquipmentTiers.all())
            for(EquipmentTiers.Tier tier:EquipmentTiers.Tier.values()){
                var prefab=EquipmentTierVisuals.prefab(plan.id(),tier);
                if(!EquipmentModelCatalog.approved(prefab.modelName()))
                    throw new AssertionError("missing approved default: "+prefab);
            }
        System.out.println("PASS: "+count+" packaged source GLBs, real triangles and embedded textures");
    }
}
