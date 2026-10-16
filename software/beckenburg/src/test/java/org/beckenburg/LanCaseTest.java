package org.beckenburg;

/** Headless isolated LAN mission rules, including source-based evidence and contested rite. */
public final class LanCaseTest {
    private static void check(boolean yes,String why){if(!yes)throw new AssertionError(why);}
    private static void rejects(Runnable call){try{call.run();throw new AssertionError("invalid role accepted");}catch(IllegalArgumentException expected){}}
    public static void main(String[] args) {
        LanCase mission=new LanCase(4);
        rejects(()->mission.health(3));rejects(()->mission.scan(-1,LanCase.Tool.EMF,4,4));
        check(mission.scan(0,LanCase.Tool.EMF,3,3).message().startsWith("INCONCLUSIVE"),"ghost activity should not auto-confirm an anchor");
        check(mission.evidenceCount()==0,"no evidence leakage");
        check(!mission.cleanse(1,4).accepted(),"unsolved cleanse rejected");
        for(LanCase.Tool t:LanCase.Tool.values())check(mission.scan(0,t,4,0).message().startsWith("CONFIRMED"),"actual anchor confirms clue");
        check(mission.evidenceCount()==3,"team shares three clues");
        check(!mission.cleanse(0,4).accepted(),"cannot cleanse without ward");
        check(mission.ward(0,4).accepted(),"anchor ward");
        check(mission.wardPrepared(),"ward persisted");
        check(mission.cleanse(2,4).accepted(),"teammate can begin rite");
        check(!mission.cleanse(1,4).accepted(),"double ritual rejected");
        for(int i=0;i<15;i++)mission.advance();
        int[] rooms={4,4,14};
        GhostDomain.Resolution attack=new GhostDomain.Resolution(true,"ok",GhostDomain.Action.STRIKE,4,50,6,12,true);
        mission.applyGhostEffect(4,rooms,attack);
        check(mission.health(0)==96&&mission.health(1)==96&&mission.health(2)==100,"ward-protected incremental injury for only present hunters");
        GhostDomain.Resolution disturb=new GhostDomain.Resolution(true,"ok",GhostDomain.Action.DISTURB,4,40,1,0,true);
        mission.applyGhostEffect(4,rooms,disturb);
        check(mission.ritualProgress()==3,"ghost disturbance delays but does not erase ritual");
        for(int i=0;i<42;i++)mission.advance();
        check(mission.outcome()==LanCase.Outcome.CLEANSED,"ritual resolves deterministically");
        check(!mission.ward(0,4).accepted(),"finished case rejects commands");
        check(mission.privateState(0).startsWith("PROGRESS|96|"),"individual health in private projection");
        LanCase escape=new LanCase(4);
        check(!escape.extract(0,11).accepted(),"extraction requires staging");
        check(escape.extract(0,HouseMap.EXTRACTION_ROOM).accepted()&&escape.outcome()==LanCase.Outcome.RETREATED,"legal withdrawal");
        System.out.println("PASS: LAN case role boundaries, three instruments, shared evidence, ward, harm, contested cleansing and retreat");
    }
}
