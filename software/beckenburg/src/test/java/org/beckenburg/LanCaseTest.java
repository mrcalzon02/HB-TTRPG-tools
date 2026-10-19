package org.beckenburg;

/** Headless isolated LAN mission rules, including source-based evidence and contested rite. */
public final class LanCaseTest {
    private static void check(boolean yes,String why){if(!yes)throw new AssertionError(why);}
    private static void rejects(Runnable call){try{call.run();throw new AssertionError("invalid role accepted");}catch(IllegalArgumentException expected){}}
    public static void main(String[] args) {
        LanCase mission=new LanCase(4);
        check(mission.health(3)==100,"fourth hunter socket exists for six-player parties");
        rejects(()->mission.health(6));rejects(()->mission.scan(-1,LanCase.Tool.EMF,4,4));
        check(mission.scan(0,LanCase.Tool.EMF,3,3).message().startsWith("READING"),"instrument always reports ambient value without auto-confirming an anchor");
        check(mission.evidenceCount()==0,"no evidence leakage");
        check(!mission.cleanse(1,4).accepted(),"unsolved cleanse rejected");
        for(LanCase.Tool t:LanCase.Tool.values())check(mission.scan(0,t,4,0).message().startsWith("READING"),"each instrument reports the real environment at the anchor");
        check(mission.evidenceCount()==0,"manual investigation never silently verifies three clues");
        check(!mission.cleanse(0,4).accepted(),"cannot cleanse without ward");
        check(mission.ward(0,4).accepted(),"anchor ward");
        check(mission.wardPrepared(),"ward persisted");
        check(mission.cleanse(2,4).accepted(),"teammate can begin rite");
        check(!mission.cleanse(1,4).accepted(),"double ritual rejected");
        int[] rooms={4,4,14};
        for(int i=0;i<15;i++)mission.advance(rooms);
        GhostDomain.Resolution attack=new GhostDomain.Resolution(true,"ok",GhostDomain.Action.STRIKE,4,50,6,12,true);
        mission.applyGhostEffect(4,rooms,attack);
        check(mission.health(0)==96&&mission.health(1)==96&&mission.health(2)==100,"ward-protected incremental injury for only present hunters");
        GhostDomain.Resolution disturb=new GhostDomain.Resolution(true,"ok",GhostDomain.Action.DISTURB,4,40,1,0,true);
        mission.applyGhostEffect(4,rooms,disturb);
        check(mission.ritualProgress()==3,"ghost disturbance delays but does not erase ritual");
        for(int i=0;i<42;i++)mission.advance(rooms);
        check(mission.outcome()==LanCase.Outcome.CLEANSED,"ritual resolves deterministically");
        check(!mission.ward(0,4).accepted(),"finished case rejects commands");
        check(mission.privateState(0).startsWith("PROGRESS|96|"),"individual health in private projection");
        // All six seats receive non-strike effects without failing the authoritative LAN tick.
        LanCase six=new LanCase(4);six.configureHunters(6);
        int[] allRooms={4,4,HouseMap.EXTRACTION_ROOM,4,HouseMap.EXTRACTION_ROOM,4};
        six.applyGhostEffect(4,allRooms,new GhostDomain.Resolution(true,"ok",
            GhostDomain.Action.WHISPER,4,80,5,0,true));
        check(six.stress(0)>0&&six.stress(1)>0&&six.stress(3)>0&&six.stress(5)>0,
            "all four nearby seats receive whisper stress");
        check(six.stress(2)==0&&six.stress(4)==0,
            "distant hunters unaffected by whisper");
        LanCase escape=new LanCase(4);
        check(!escape.extract(0,11).accepted(),"extraction requires staging");
        check(escape.extract(0,HouseMap.EXTRACTION_ROOM).accepted()&&escape.outcome()==LanCase.Outcome.RETREATED,"legal withdrawal");
        System.out.println("PASS: LAN case role boundaries, three instruments, shared evidence, ward, harm, contested cleansing and retreat");
    }
}
