package org.beckenburg;

/** Three evidence signatures, negative observations, hypothesis and ritual gates. */
public final class LanGhostIdentityTest {
    static void ok(boolean value,String message){if(!value)throw new AssertionError(message);}
    public static void main(String[] args){
        for(GhostIdentity.Type type:GhostIdentity.Type.values()){
            LanCase mission=new LanCase(4);
            mission.configure(type,true);
            ok(!mission.cleanse(0,4).accepted(),"cannot skip evidence "+type);
            int positives=0;
            for(LanCase.Tool tool:LanCase.Tool.values()){
                LanCase.Report reading=mission.scan(0,tool,4,0);
                if(type.signature(tool)){ok(reading.message().startsWith("CONFIRMED"),"signature tool "+type+" "+tool);positives++;}
                else ok(reading.message().startsWith("INCONCLUSIVE"),"negative anchor evidence "+type+" "+tool);
            }
            ok(positives==mission.evidenceCount()&&positives==type.signatureCount(),"signature count "+type);
            ok(mission.testedCount()==3,"three independent instrument readings "+type);
            ok(!mission.cleanse(0,4).accepted(),"no ritual before correct hypothesis");
            GhostIdentity.Type wrong=type==GhostIdentity.Type.SPIRIT?GhostIdentity.Type.WRAITH:GhostIdentity.Type.SPIRIT;
            ok(!mission.identify(0,wrong,1).accepted(),"incorrect guess penalized");
            ok(mission.stress(0)==15,"bad identification costs fear");
            ok(!mission.identify(0,type,2).accepted(),"cannot spam identities");
            ok(mission.identify(1,type,31).accepted(),"correct collaborative deduction");
            ok(mission.identified()==type,"confirmed identity stored");
            ok(mission.ward(0,4).accepted()&&mission.cleanse(1,4).accepted(),"matched signature and rite succeed");
        }
        LanCase incomplete=new LanCase(4);
        incomplete.configure(GhostIdentity.Type.WRAITH,true);
        incomplete.scan(0,LanCase.Tool.SPIRIT_BOX,4,0);
        ok(!incomplete.identify(0,GhostIdentity.Type.WRAITH,5).accepted(),"one clue cannot reveal species");
        LanCase legacy=new LanCase(4);
        for(var tool:LanCase.Tool.values())legacy.scan(0,tool,4,0);
        ok(legacy.ward(0,4).accepted()&&legacy.cleanse(0,4).accepted(),
                "existing default Spirit scenario remains backwards compatible");
        System.out.println("PASS: three distinct ghost signature cases, deduction penalties and legacy rite");
    }
}
