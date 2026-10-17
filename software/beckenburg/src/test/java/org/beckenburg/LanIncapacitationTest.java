package org.beckenburg;

/** A downed hunter cannot remain a phantom combat target or an immortal survivor. */
public final class LanIncapacitationTest {
    static void ok(boolean yes,String why){if(!yes)throw new AssertionError(why);}
    public static void main(String[] args){
        HouseMap map=new HouseMap();
        LanCase mission=new LanCase(4);
        LanWorld world=new LanWorld(map);
        LanGhostSpatial.Pose ghost=new LanGhostSpatial(map,4).pose();
        int[] positions={4,4,HouseMap.EXTRACTION_ROOM};
        GhostDomain.Resolution lethal=new GhostDomain.Resolution(true,"hit",
                GhostDomain.Action.STRIKE,4,30,6,100,true);
        ok(mission.alive(0)&&mission.alive(1)&&mission.alive(2),"initial investigators alive");
        mission.applyGhostEffect(4,positions,lethal,new boolean[]{true,false,false});
        ok(!mission.alive(0)&&mission.health(0)==0,"first hunter incapacitated");
        ok(mission.alive(1)&&mission.health(1)==100,"second hunter unharmed");
        ok(!mission.scan(0,LanCase.Tool.EMF,4,4).accepted(),"downed cannot collect evidence");
        ok(!mission.ward(0,4).accepted(),"downed cannot place wards");
        ok(!mission.cleanse(0,4).accepted(),"downed cannot start ritual");
        ok(!mission.extract(0,HouseMap.EXTRACTION_ROOM).accepted(),"downed cannot extract");
        boolean[] living={mission.alive(0),mission.alive(1),mission.alive(2)};
        boolean[] selected=LanSpatialCombat.victims(map,world,ghost,positions,
                living,new boolean[]{false,false,false});
        ok(!selected[0]&&selected[1]&&!selected[2],
                "combat targeting filters incapacitated and out-of-room hunters");
        ok(mission.outcome()==LanCase.Outcome.ACTIVE,"teammates keep mission alive");
        mission.depart(1);
        ok(mission.alive(2)&&mission.outcome()==LanCase.Outcome.ACTIVE,
                "living survivor keeps game in progress");
        mission.depart(2);
        ok(mission.outcome()==LanCase.Outcome.LOST,
                "departure of last living hunter loses even if a downed seat stays connected");
        System.out.println("PASS: incapacitation, disallowed field actions, ghost victim filtering, last living survivor exit");
    }
}
