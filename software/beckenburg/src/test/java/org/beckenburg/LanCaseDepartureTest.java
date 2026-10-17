package org.beckenburg;

/** Departing guest seats cannot block defeat or issue actions; remaining hunters can finish. */
public final class LanCaseDepartureTest {
    static void ok(boolean value,String message){if(!value)throw new AssertionError(message);}
    public static void main(String[] args){
        LanCase mission=new LanCase(4);
        ok(mission.remainingHunters()==3,"three hunters start active");
        mission.depart(1);mission.depart(1);
        ok(mission.remainingHunters()==2,"duplicate departure idempotent");
        ok(!mission.scan(1,LanCase.Tool.EMF,4,4).accepted(),"departed investigator cannot investigate");
        ok(!mission.ward(1,4).accepted(),"departed investigator cannot place wards");
        for(LanCase.Tool tool:LanCase.Tool.values())
            ok(mission.scan(0,tool,4,4).accepted(),"survivor can investigate");
        ok(mission.ward(0,4).accepted(),"survivor can place anchor ward");
        ok(mission.cleanse(2,4).accepted(),"remaining teammate can complete rite");
        for(int tick=0;tick<45;tick++)mission.advance(new int[]{4,14,4});
        ok(mission.outcome()==LanCase.Outcome.CLEANSED,"surviving team wins in progress");
        LanCase lost=new LanCase(4);
        lost.depart(1);lost.depart(2);
        GhostDomain.Resolution fatal=new GhostDomain.Resolution(true,"ok",
                GhostDomain.Action.STRIKE,4,30,0,100,true);
        lost.applyGhostEffect(4,new int[]{4,4,4},fatal);
        ok(lost.outcome()==LanCase.Outcome.LOST,"departed seats are not invulnerable survivors");
        LanCase empty=new LanCase(4);
        empty.depart(0);empty.depart(1);empty.depart(2);
        ok(empty.outcome()==LanCase.Outcome.LOST,"no live hunter remains");
        System.out.println("PASS: guest departure, disabled seat actions, solo survival, victory and defeat");
    }
}
