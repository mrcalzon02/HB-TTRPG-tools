package org.beckenburg;

/** Real player-origin actions, filtered observation and encounter timing in the same ghost rules. */
public final class GhostPracticeTest {
    private static void ok(boolean b,String why){if(!b)throw new AssertionError(why);}
    public static void main(String[] args){
        GhostPracticeSession a=new GhostPracticeSession(new HouseMap(),20261015L);
        GhostPracticeSession b=new GhostPracticeSession(new HouseMap(),20261015L);
        ok(a.observation().tick()==0,"no false advanced ghost tick");
        ok(!a.observation().legalActions().contains(GhostDomain.Action.STRIKE),"early attack forbidden");
        ok(a.visibleHunterRoom()==-1,"never leak before a real sensed tick");
        for(int tick=1;tick<=161;tick++){a.tick();b.tick();}
        ok(a.observation().hearsHunter() && b.observation().hearsHunter(),"early training scout in anchor room");
        ok(a.visibleHunterRoom()==a.ghostRoom(),"nearby observation allowed");
        var pre=a.act(GhostDomain.Action.STRIKE,a.ghostRoom());
        ok(!pre.applied(),"strike requires manifestation");
        var apparent=a.act(GhostDomain.Action.MANIFEST,a.ghostRoom());
        ok(apparent.applied(),"manifest after warning phase");
        b.act(GhostDomain.Action.STRIKE,b.ghostRoom());
        var mimic=b.act(GhostDomain.Action.MANIFEST,b.ghostRoom());
        ok(apparent.energy()==mimic.energy(),"rejected action same energy behavior");
        a.tick();b.tick();
        ok(a.act(GhostDomain.Action.STRIKE,a.ghostRoom()).applied(),"first legal wound");
        ok(b.act(GhostDomain.Action.STRIKE,b.ghostRoom()).applied(),"repeat deterministic ability");
        ok(a.strikes()==1 && a.outcome()==GhostPracticeSession.Outcome.ACTIVE,"first strike remains incremental");
        ok(!a.act(GhostDomain.Action.STRIKE,a.ghostRoom()).applied(),"no instant second strike");
        for(int tick=163;tick<=245;tick++){a.tick();b.tick();}
        ok(a.act(GhostDomain.Action.MANIFEST,a.ghostRoom()).applied(),"manifest after cooldown");
        for(int tick=246;tick<=252;tick++){a.tick();b.tick();}
        ok(a.act(GhostDomain.Action.STRIKE,a.ghostRoom()).applied(),"second strike after cooldown");
        ok(a.strikes()==2 && a.outcome()==GhostPracticeSession.Outcome.TWO_STRIKES,"training completion");
        int stopped=a.tickCount();a.tick();
        ok(a.tickCount()==stopped && a.act(GhostDomain.Action.WHISPER,a.ghostRoom())==null,"finished match immutable");
        GhostPracticeSession dis=new GhostPracticeSession(new HouseMap(),20261015L);
        dis.tick();
        var invalid=dis.act(GhostDomain.Action.DRIFT,HouseMap.EXTRACTION_ROOM);
        ok(!invalid.applied(),"cannot teleport into hunter-only van");
        ok(dis.observation().exits().stream().allMatch(room -> room>=0 && room<HouseMap.EXTRACTION_ROOM),"legal room graph excludes van");
        System.out.println("PASS: local human-ghost practice, no hunter-information leak, shared action gates and two incremental strikes");
    }
}
