package org.beckenburg;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

/** Compares actual runtime lookup results against the independently delivered asset manifest. */
@SuppressWarnings("unchecked")
public final class EquipmentAssetAssignmentsTest {
    private static void check(boolean yes,String why){if(!yes)throw new AssertionError(why);}
    private static String name(Map<String,Object> asset){
        return Path.of((String)asset.get("model")).getFileName().toString().replaceFirst("\\.glb$","");
    }
    public static void main(String[] args)throws Exception{
        Path file=Path.of(args.length==0?"development/assets/equipment-catalog/equipment-assets.json":args[0]);
        // Reuse the existing production JSON reader for fixture decoding only;
        // the catalog itself contains explicit mappings and never parses this manifest.
        Class<?> parser=Class.forName("org.beckenburg.GlbProps$Json");
        var constructor=parser.getDeclaredConstructor(String.class);constructor.setAccessible(true);
        var read=parser.getDeclaredMethod("read");read.setAccessible(true);
        Map<String,Object> manifest=(Map<String,Object>)read.invoke(constructor.newInstance(Files.readString(file)));
        Set<String> canonical=new HashSet<>(),states=new HashSet<>(),all=new HashSet<>();
        int slots=0,stateSlots=0,families=0;
        for(Object item:(List<Object>)manifest.get("items")){
            Map<String,Object> family=(Map<String,Object>)item;
            String id=(String)family.get("id");families++;
            for(Object encoded:(List<Object>)family.get("stages")){
                Map<String,Object> stage=(Map<String,Object>)encoded;
                var tier=EquipmentTiers.Tier.values()[((Number)stage.get("tier")).intValue()-1];
                String expected=name(stage),actual=EquipmentModelCatalog.model(id,tier);
                check(actual.equals(expected),id+"/"+tier+" assigned "+actual+" instead of delivered "+expected);
                check(EquipmentModelCatalog.original(id,tier)==Boolean.TRUE.equals(stage.get("existing_unchanged")),id+"/"+tier+" provenance classification");
                canonical.add(expected);all.add(expected);slots++;
                Map<String,Object> variants=(Map<String,Object>)stage.getOrDefault("variants",Map.of());
                for(var entry:variants.entrySet()){
                    String state=entry.getKey(),model=name((Map<String,Object>)entry.getValue());
                    check(EquipmentModelCatalog.variant(id,tier,state).equals(model),id+"/"+tier+"/"+state+" state mapping");
                    states.add(model);all.add(model);stateSlots++;
                }
            }
        }
        check(families==43&&slots==129&&stateSlots==44,"manifest family/alias coverage changed");
        check(canonical.size()==113&&states.size()==40&&all.size()==153,"unique delivered GLB coverage changed");
        check(EquipmentModelCatalog.stageCount()==slots&&EquipmentModelCatalog.variantCount()==stateSlots,"extra or missing runtime slots");
        check(EquipmentModelCatalog.approvedModels().equals(all),"runtime allowlist differs from delivered resources");
        for(FieldSupplies.Tier tier:FieldSupplies.Tier.values()){
            check(EquipmentModelCatalog.supplyModel(FieldSupplies.Kind.HEALTH,tier)
                .equals(EquipmentModelCatalog.model("HEALTH_SUPPLIES",EquipmentTiers.Tier.values()[tier.ordinal()])),"medical progression mapping "+tier);
        }
        System.out.println("PASS runtime assignments match manifest: 43 families, 129 stage aliases, 44 states, 153 unique resources");
    }
}
