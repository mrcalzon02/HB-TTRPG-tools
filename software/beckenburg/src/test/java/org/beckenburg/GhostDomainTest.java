package org.beckenburg;

import java.util.List;

/** AI/human ghost commands must have exactly the same server-authoritative effects. */
public final class GhostDomainTest {
    private static void ok(boolean result, String why) { if(!result) throw new AssertionError(why); }
    private static GhostDomain.Resolution submit(GhostDomain a, GhostDomain b, GhostDomain.Action action,
            int room, long sequence) {
        GhostDomain.Resolution ai = a.dispatch(new GhostDomain.Command(action,room,sequence,GhostDomain.Source.AI));
        GhostDomain.Resolution human = b.dispatch(new GhostDomain.Command(action,room,sequence,GhostDomain.Source.HUMAN));
        ok(ai.equals(human),"controller origin changed mechanics for " + action + " at " + a.tickCount());
        return ai;
    }
    public static void main(String[] args) {
        GhostDomain a=new GhostDomain(4), b=new GhostDomain(4);
        ok(a.observe().legalActions().contains(GhostDomain.Action.DRIFT),"initial exits available");
        ok(!submit(a,b,GhostDomain.Action.STRIKE,4,1).applied(),"first-contact strike blocked");
        ok(!submit(a,b,GhostDomain.Action.DRIFT,0,2).applied(),"no diagonal teleport");
        ok(!submit(a,b,GhostDomain.Action.DRIFT,4,3).applied(),"cannot drift in place");
        ok(submit(a,b,GhostDomain.Action.DRIFT,5,4).applied(),"valid adjacent travel");
        ok(a.room()==5,"changed room");
        ok(!submit(a,b,GhostDomain.Action.DRIFT,4,5).applied(),"drift cooldown");
        ok(!submit(a,b,GhostDomain.Action.WHISPER,4,6).applied(),"wrong target rejected");
        ok(submit(a,b,GhostDomain.Action.WHISPER,5,7).applied(),"whisper legal");
        ok(!submit(a,b,GhostDomain.Action.WHISPER,5,7).applied(),"duplicate sequence rejected");
        GhostDomain.Observation o = a.observe();
        ok(!o.hearsHunter(),"sensing does not reveal remote hunter");
        ok(o.exits().equals(List.of(2,8,4)),"adjacency as authored");
        try{o.exits().add(1);throw new AssertionError("mutable observation");}
        catch(UnsupportedOperationException expected){}
        ok(!a.observe().legalActions().contains(GhostDomain.Action.STRIKE),"no premature strike affordance");
        int hitCount=0;
        for(int tick=1;tick<=720;tick++) {
            a.advance(tick,5);b.advance(tick,5);
            ok(a.observe().equals(b.observe()),"observation disparity tick " + tick);
            if(tick==80) ok(submit(a,b,GhostDomain.Action.MANIFEST,5,8).applied(),"manifestation legal after warning window");
            if(tick==81) ok(!submit(a,b,GhostDomain.Action.MANIFEST,5,9).applied(),"manifestation replay denied");
            if(tick==161) {
                ok(!submit(a,b,GhostDomain.Action.STRIKE,5,10).applied(),"no strike after manifestation expires");
                ok(submit(a,b,GhostDomain.Action.MANIFEST,5,11).applied(),"second manifestation");
            }
            if(tick==162) {
                var r=submit(a,b,GhostDomain.Action.STRIKE,5,12);
                ok(r.applied() && r.harm()==12 && r.fear()==6,"incremental strike effects");
                hitCount++;
            }
            if(tick==163) ok(!submit(a,b,GhostDomain.Action.STRIKE,5,13).applied(),"no strike spam");
        }
        ok(hitCount==1,"exactly one deliberate hit");
        ok(a.energy()==b.energy() && a.room()==b.room(),"matched final state");
        var ai = new GhostDomain.AiController(14L);
        var test = new GhostDomain(2);
        boolean moved=false, manifested=false;
        for (int t=1;t<=520;t++) {
            int playerRoom = t<100?8:test.room(); // AI learns only locally, not via omniscient position
            test.advance(t,playerRoom);
            GhostDomain.Command cmd=ai.decide(test.observe());
            if (cmd!=null) {
                var result=test.dispatch(cmd);
                ok(result.applied(),"AI attempted illegal command " + cmd + " / " + result.reason());
                moved|=cmd.action()==GhostDomain.Action.DRIFT;
                manifested|=cmd.action()==GhostDomain.Action.MANIFEST;
            }
        }
        ok(moved && manifested,"AI uses shared movement and manifestation commands");
        System.out.println("PASS: ghost AI/human command parity, reachability, action energy/cooldowns, observation filtering, escalating strike safety, replay protection");
    }
}
