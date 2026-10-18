package org.beckenburg;

import java.util.EnumSet;
import java.util.HashSet;

/** Extra gear must offer real, differentiated event-bound readouts, not fake readings. */
public final class OptionalEvidenceReadingsTest {
    private static void ok(boolean condition,String message){
        if(!condition)throw new AssertionError(message);
    }
    public static void main(String[] args){
        int count=0;
        for(GhostIdentity.Type type:GhostIdentity.Type.values()){
            var targets=OptionalEvidenceReadings.planned(type);
            var planned=GhostEvidenceMatrix.forGhost(type).future();
            ok(targets.size()==2&&planned.size()==2,"two optional families for "+type);
            var seen=EnumSet.noneOf(EquipmentRegistry.Evidence.class);
            for(int i=0;i<targets.size();i++){
                var signal=targets.get(i);
                ok(seen.add(signal.family()),"distinct categories for "+type);
                ok(planned.get(i)==signal.family(),"future ghost matrix agrees with readout");
                var item=EquipmentRegistry.get(signal.deviceId());
                ok(item.candidateReadings().contains(signal.family()),
                    "proper sensor measures category");
                ok(!signal.physicalSource().isBlank()&&!signal.displayedReading().isBlank(),
                    "every planned readout has a genuine physical-world cause");
                ok(EquipmentTiers.stages(signal.deviceId()).size()==3,
                    "optional detector has upgraded versions");
                count++;
            }
        }
        ok(count==26,"all 26 extra instrument readings are fully specified");
        System.out.println("PASS: 13 types x 2 different proposed device readouts with 3-tier instruments");
    }
}
