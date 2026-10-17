package org.beckenburg;

/** Defenders must remain at the anchor; abandoned rites cannot self-complete. */
public final class LanRitualDefenseTest {
    static void ok(boolean condition,String label){if(!condition)throw new AssertionError(label);}
    public static void main(String[] args){
        LanCase caseFile=new LanCase(4);
        for(LanCase.Tool tool:LanCase.Tool.values())
            ok(caseFile.scan(0,tool,4,4).accepted(),"collect evidence");
        ok(caseFile.ward(0,4).accepted(),"anchor ward");
        ok(caseFile.cleanse(0,4).accepted(),"begin ritual");
        int[] guarded={4,14,14},empty={5,14,14};
        for(int i=0;i<10;i++)caseFile.advance(guarded);
        ok(caseFile.ritualProgress()==10,"ten guarded ticks");
        ok(caseFile.advance(empty)==LanCase.RitualAdvance.PAUSED,"first unattended tick pauses");
        for(int i=0;i<5;i++)ok(caseFile.advance(empty)==LanCase.RitualAdvance.NONE,"no unattended progress");
        ok(caseFile.ritualProgress()==10,"vacant circle cannot win");
        ok(caseFile.advance(guarded)==LanCase.RitualAdvance.RESUMED,"defender restores channel");
        ok(caseFile.ritualProgress()==11,"resume does not jump ahead");
        for(int i=0;i<19;i++)caseFile.advance(empty);
        ok(caseFile.outcome()==LanCase.Outcome.ACTIVE&&caseFile.ritualProgress()==11,"grace is finite");
        ok(caseFile.advance(empty)==LanCase.RitualAdvance.BROKEN,"twentieth unattended tick breaks rite");
        ok(caseFile.ritualProgress()==-1&&caseFile.outcome()==LanCase.Outcome.ACTIVE,"broken does not falsely cleanse");
        for(int i=0;i<65;i++)ok(caseFile.advance(guarded)==LanCase.RitualAdvance.NONE,"broken ritual cannot autonomously restart");
        ok(caseFile.cleanse(0,4).accepted(),"must explicitly restart failed rite");
        for(int i=0;i<44;i++)caseFile.advance(guarded);
        ok(caseFile.outcome()==LanCase.Outcome.ACTIVE,"not early");
        ok(caseFile.advance(guarded)==LanCase.RitualAdvance.CLEANSED,"forty-five guarded ticks complete");
        ok(caseFile.outcome()==LanCase.Outcome.CLEANSED,"host outcome cleansed");
        try{caseFile.advance(new int[]{4,14});throw new AssertionError("bad room snapshot accepted");}
        catch(IllegalArgumentException expected){}
        LanCase abandoned=new LanCase(4);
        abandoned.depart(0);abandoned.depart(1);abandoned.depart(2);
        ok(abandoned.outcome()==LanCase.Outcome.LOST,"empty team cannot win a rite");
        System.out.println("PASS: host ritual defense, pause, finite abandonment, explicit restart and guarded cleansing");
    }
}
