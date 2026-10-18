package org.beckenburg;

import java.util.HashSet;
import java.util.Set;

/** Every source-indexed device has three genuine progression descriptions.
 * Proposed stages change reach, timeliness and usability, never paranormal truth.
 */
public final class EquipmentTiersTest {
    private static void ok(boolean good,String reason){if(!good)throw new AssertionError(reason);}
    public static void main(String[] args){
        ok(EquipmentTiers.all().size()==42,"all forty-two devices are tiered");
        Set<String> ids=new HashSet<>();
        for(var plan:EquipmentTiers.all()){
            ok(ids.add(plan.id()),"distinct progression for every device");
            EquipmentRegistry.Tool live=EquipmentRegistry.get(plan.id());
            var stages=EquipmentTiers.stages(plan.id());
            ok(stages.size()==3,"every tool has three stages");
            for(int i=0;i<3;i++){
                var step=stages.get(i);
                ok(step.tier()==EquipmentTiers.Tier.values()[i],
                    "tier order");
                ok(step.id().equals(live.id()),"referenced device exists");
                ok(step.effect()!=null&&!step.effect().isBlank(),"each tier has a unique visible feature");
                if(i>0){
                    var earlier=stages.get(i-1);
                    ok(step.creditCost()>=earlier.creditCost(),"gear gets dearer");
                    ok(step.reachCm()>=earlier.reachCm(),"reach never shrinks");
                    ok(step.intervalTicks()<=earlier.intervalTicks(),
                        "response interval never gets slower");
                    ok(step.capacity()>=earlier.capacity(),"capacity never shrinks");
                    ok(step.batterySeconds()>=earlier.batterySeconds(),
                        "battery duration never shrinks");
                    ok(step.displayScalePercent()>=earlier.displayScalePercent(),
                        "physical diegetic readout never shrinks");
                    ok(!step.effect().equals(earlier.effect()),
                        "each tier offers a distinct capability, not cosmetic renaming");
                }
            }
        }
        ok(EquipmentTiers.stage("EMF_READER",EquipmentTiers.Tier.I).reachCm()
            <EquipmentTiers.stage("EMF_READER",EquipmentTiers.Tier.III).reachCm(),
            "EMF detection reach increases");
        ok(EquipmentTiers.stage("THERMOMETER",EquipmentTiers.Tier.I).intervalTicks()
            >EquipmentTiers.stage("THERMOMETER",EquipmentTiers.Tier.III).intervalTicks(),
            "better thermometer reacts faster");
        ok(EquipmentTiers.stage("PHOTO_CAMERA",EquipmentTiers.Tier.III).capacity()
            >EquipmentTiers.stage("PHOTO_CAMERA",EquipmentTiers.Tier.I).capacity(),
            "larger film stock for upgraded camera");
        ok(EquipmentTiers.stage("SANITY_MEDICATION",EquipmentTiers.Tier.II).creditCost()
            ==FieldSupplies.Tier.IMPROVED.price,
            "medicine tier costs match existing host store, not a contradictory copy");
        System.out.println("PASS: 42 devices, 126 tier stages, reach, response, clarity and capacity");
    }
}
