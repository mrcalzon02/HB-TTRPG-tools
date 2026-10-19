package org.beckenburg;

import java.util.HashSet;

/** Customer-visible shop copy is consistent with authoritative hardware. */
public final class EquipmentStoreDescriptionsTest {
    static void ok(boolean yes,String why){if(!yes)throw new AssertionError(why);}
    public static void main(String[] args){
        var ids=new HashSet<String>();
        int stages=0,working=0;
        for(var gear:EquipmentRegistry.all()){
            ok(ids.add(gear.id()),"every catalog id unique");
            for(var line:EquipmentStoreDescriptions.tiers(gear.id())){
                var stage=EquipmentTiers.stage(gear.id(),line.tier());
                ok(line.price()==stage.creditCost(),"actual purchase price for "+gear.id());
                ok(line.name().equals(gear.name()),"real catalog label for "+gear.id());
                ok(!line.effect().isBlank(),"customer receives a specific tier benefit for "+gear.id());
                if(!FieldEquipment.functional(gear.id()))
                    ok(line.effect().equals(stage.effect()),
                        "planned devices display planning-only description");
                else
                    ok(!line.effect().contains("not-yet-built"),
                        "live purchase copy cannot advertise missing implementation");
                ok(line.currentlyPlayable()==FieldEquipment.functional(gear.id()),
                    "future instrument must not be advertised as purchasable");
                ok(line.details().contains(line.specificationLine()),"show exact capabilities");
                ok(line.tooltipHtml().startsWith("<html>")&&
                    line.tooltipHtml().contains(line.effect().replace("&","&amp;")),
                    "mouseover describes same item");
                ok(line.compactLabel().contains("£"+stage.creditCost()),
                    "price shown before purchase");
                stages++;
            }
            ok(EquipmentStoreDescriptions.comparativeDescription(gear.id(),
                EquipmentTiers.Tier.I).contains("T3"),"complete three-tier comparison");
            if(FieldEquipment.functional(gear.id()))working++;
        }
        ok(ids.size()==42&&stages==126,"all forty-two devices and 126 stages documented");
        ok(working==13,"the 29 unimplemented items remain labelled not purchasable");

        var instant=EquipmentStoreDescriptions.describe("PHOTO_CAMERA",EquipmentTiers.Tier.I);
        var standard=EquipmentStoreDescriptions.describe("PHOTO_CAMERA",EquipmentTiers.Tier.II);
        var expert=EquipmentStoreDescriptions.describe("PHOTO_CAMERA",EquipmentTiers.Tier.III);
        ok(instant.specificationLine().contains("1 exposure")&&
            instant.specificationLine().contains("160×160"),"instant single square exposure");
        ok(standard.specificationLine().contains("6 exposures")&&
            standard.specificationLine().contains("320×200"),"six normal images");
        ok(expert.specificationLine().contains("12 exposures")&&
            expert.specificationLine().contains("640×400")&&
            expert.specificationLine().contains("resampled"),
            "twelve enlarged outputs, no misleading claim of native detail");
        ok(EquipmentStoreDescriptions.describe("VIDEO_CAMERA",EquipmentTiers.Tier.I)
                .specificationLine().contains("65°"),"narrow actual lens");
        ok(EquipmentStoreDescriptions.describe("VIDEO_CAMERA",EquipmentTiers.Tier.II)
                .specificationLine().contains("93°"),"mid actual lens");
        ok(EquipmentStoreDescriptions.describe("VIDEO_CAMERA",EquipmentTiers.Tier.III)
                .specificationLine().contains("120°"),"wide actual lens");
        for(int t=0;t<3;t++){
            var tier=EquipmentTiers.Tier.values()[t];
            var flashlight=EquipmentStoreDescriptions.describe("FLASHLIGHT",tier);
            ok(flashlight.specificationLine().contains(new String[]{"280s","420s","630s"}[t]),
                "battery time is actual host-owned power runtime");
            ok(flashlight.specificationLine().contains(new String[]{"6m","9m","12m"}[t]),
                "readout matches the actual 3D lighting beam");
        }
        ok(EquipmentStoreDescriptions.describe("UV_LIGHT",EquipmentTiers.Tier.III)
            .effect().contains("160 host ticks"),
            "Tier III UV spec reflects genuine source trace lifetime, not fake reading");
        ok(EquipmentStoreDescriptions.describe("GHOST_WRITING_BOOK",EquipmentTiers.Tier.III)
            .specificationLine().contains("One actual deployed book"),
            "upgraded writing book does not claim a nonexistent second placement");
        ok(EquipmentStoreDescriptions.describe("FIRELIGHT",EquipmentTiers.Tier.III)
            .effect().contains("270 seconds"),
            "firelight copy reflects genuine tiered burn duration");
        ok(!EquipmentStoreDescriptions.describe("RESONANCE_TUNER",EquipmentTiers.Tier.III)
            .currentlyPlayable(),"planned sensor is explicitly not in live shop");
        System.out.println("PASS: store names, live prices, 42x3 tier facts, optics, batteries, hover copy, no invented capabilities");
    }
}
