package org.beckenburg;

import java.util.EnumSet;
import java.util.HashSet;
import java.util.Set;

/** A ghost can only be eliminated by manually ticking an actually possible signal. */
public final class GhostEvidenceMatrixTest {
    static void ok(boolean condition,String why){if(!condition)throw new AssertionError(why);}
    public static void main(String[] args){
        var rows=GhostEvidenceMatrix.all();
        ok(rows.size()==GhostIdentity.Type.values().length,"all thirteen source ghosts represented");
        Set<GhostIdentity.Type> unique=EnumSet.noneOf(GhostIdentity.Type.class);
        int suppressed=0,freezing=0,writers=0,uv=0,orbs=0,camera=0;
        for(var row:rows){
            ok(unique.add(row.type()),"one catalog row per ghost");
            ok(row.rite()==row.type().rite()&&row.behavior()==row.type().behavior(),
                "ritual and behavioral identity retained for "+row.type());
            ok(GhostFieldGuide.possible(row.type(),row.emf())
               &&GhostFieldGuide.possible(row.type(),row.temperature()),
               "environmental candidate markings agree with generator for "+row.type());
            ok(GhostEvidenceProfile.emfSuppressed(row.type())
               ==(row.emf()==GhostFieldGuide.Clue.EMF_SUPPRESSION),
               "zero EMF is only produced by suppressed species");
            ok((GhostEvidenceProfile.thermal(row.type())==EvidenceSignals.Polarity.COLD)
               ==(row.temperature()==GhostFieldGuide.Clue.EXTREME_COLD),
               "temperature evidence matches actual thermal producer");
            ok(row.uv()==GhostTraits.of(row.type()).leavesUv(),
               "UV entries match live trait producer");
            ok(row.optical()==GhostTraits.of(row.type()).sight(),
               "optical evidence agrees with actual sight behavior");
            ok(row.writing().size()==GhostEvidenceProfile.availableWriting(row.type()).length,
               "writing list is derived from actual writer");
            for(var style:row.writing())
                ok(GhostEvidenceProfile.writing(row.type(),style),
                   "every listed writing style can actually be authored");
            for(var proposed:row.future()){
                ok(!EquipmentRegistry.couldDetect(proposed).isEmpty(),
                   "each future phenomenon has an indexed detector");
                ok(!proposed.equals(EquipmentRegistry.Evidence.HIGH_EMF)
                   &&!proposed.equals(EquipmentRegistry.Evidence.FREEZING),
                   "no invented duplicate thermometer or EMF codes");
            }
            // Independently distinct sources: EMF, temperature, and at least one
            // non-environmental piece of evidence available by intended design.
            ok(!row.writing().isEmpty()||row.uv()
               ||row.optical()==GhostTraits.Sight.ORBS
               ||row.optical()==GhostTraits.Sight.CAMERA_ONLY
               ||!row.future().isEmpty(),
               "no ghost is limited to the two environmental instruments");
            if(row.emf()==GhostFieldGuide.Clue.EMF_SUPPRESSION)suppressed++;
            if(row.temperature()==GhostFieldGuide.Clue.EXTREME_COLD)freezing++;
            if(!row.writing().isEmpty())writers++;
            if(row.uv())uv++;
            if(row.optical()==GhostTraits.Sight.ORBS)orbs++;
            if(row.optical()==GhostTraits.Sight.CAMERA_ONLY)camera++;
        }
        ok(suppressed==3&&freezing==7&&writers==9&&uv==8&&orbs==3&&camera==2,
            "source demographic counts remain stable");
        ok(GhostEvidenceMatrix.forGhost(GhostIdentity.Type.SHADE).emf()
            ==GhostFieldGuide.Clue.EMF_SUPPRESSION,"Shade provides zero field");
        ok(GhostEvidenceMatrix.forGhost(GhostIdentity.Type.HANTU).optical()
            ==GhostTraits.Sight.ORBS,"Hantu produces optical orbs");
        ok(GhostEvidenceMatrix.forGhost(GhostIdentity.Type.DEMON).writing().contains(
            GhostWriting.Style.RITUAL_CIRCLES),"Demon can draw actual ritual circles");
        System.out.println("PASS: 13 ghost evidence rows match live producers; future gear not called implemented");
    }
}
