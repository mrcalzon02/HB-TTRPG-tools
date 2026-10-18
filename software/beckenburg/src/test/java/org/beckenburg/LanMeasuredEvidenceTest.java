package org.beckenburg;

/** Live host-owned measurement entry point: instrument readouts are not ghost codes. */
public final class LanMeasuredEvidenceTest {
    static void ok(boolean v,String why){if(!v)throw new AssertionError(why);}
    public static void main(String[] args){
        LanCase mission=new LanCase(4);
        mission.configure(GhostIdentity.Type.WRAITH,true);
        mission.configureEvidenceClimate(EvidenceSignals.Season.WINTER,
            EvidenceSignals.Weather.SNOW,2,true,EvidenceSignals.Polarity.HOT);
        var emBase=mission.scanMeasured(0,LanCase.Tool.EMF,4,4,20,-1,0);
        ok(emBase.accepted()&&emBase.message().startsWith("READING ")
            &&emBase.message().contains("/10"),"ordinary EMF fluctuations remain inconclusive");
        var emFar=mission.scanMeasured(0,LanCase.Tool.EMF,4,4,21,6,10);
        ok(emFar.message().startsWith("READING "),"an event in another room is not local EMF");
        var emPeak=mission.scanMeasured(0,LanCase.Tool.EMF,4,4,22,4,10);
        ok(emPeak.message().startsWith("READING ")
            &&emPeak.message().contains("/10"),"real high EMF reading is logged, no confirmation");
        var thermal=mission.scanMeasured(0,LanCase.Tool.THERMOMETER,4,4,22,4,0);
        ok(thermal.message().startsWith("READING ")
            &&thermal.message().contains("°F"),"extreme hot room recognized in either unit");
        var remote=mission.scanMeasured(0,LanCase.Tool.THERMOMETER,12,4,22,4,0);
        ok(remote.message().startsWith("READING "),
            "outside air is not enough to confirm a haunting");
        var response=mission.scanMeasured(0,LanCase.Tool.SPIRIT_BOX,4,4,22,4,0);
        ok(response.message().startsWith("READING "),"direct ghost-room response");
        ok(mission.evidenceCount()==0,"measurements never auto-award evidence");
        var repeated=mission.scanMeasured(0,LanCase.Tool.EMF,4,4,22,4,10);
        ok(repeated.message().startsWith("READING ")&&mission.evidenceCount()==0,
            "repeat event cannot farm positive clues");
        ok(mission.identify(0,GhostIdentity.Type.WRAITH,32).accepted(),
            "identification is a player choice, not a reading-unlock");
        System.out.println("PASS: measured event EMF, dynamic winter heat, ghost presence, repeats");
    }
}
