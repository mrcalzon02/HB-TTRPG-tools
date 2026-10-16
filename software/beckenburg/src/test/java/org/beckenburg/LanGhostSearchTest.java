package org.beckenburg;

import java.util.List;

/** AI must search finite stale sound tiles rather than magically learning target coordinates. */
public final class LanGhostSearchTest {
    static void check(boolean pass,String why){if(!pass)throw new AssertionError(why);}
    private static GhostDomain.Observation observation(int tick,int room,HouseMap map,boolean hearing) {
        return new GhostDomain.Observation(tick,room,4,100,false,hearing,
                map.ghostExits(room),List.of(GhostDomain.Action.DRIFT,GhostDomain.Action.WHISPER,
                GhostDomain.Action.MANIFEST,GhostDomain.Action.STRIKE));
    }
    public static void main(String[] args) {
        HouseMap map=new HouseMap();LanGhostPursuit brain=new LanGhostPursuit(map,182);
        brain.heard(4,5,20.4,9.1,LanGhostPursuit.Sound.EQUIPMENT,2);
        LanGhostPursuit.Echo fresh=brain.memory(2);
        check(fresh!=null,"sound noticed");
        int expired=fresh.expiryTick();
        check(brain.memory(expired)==null,"no fresh sound after expiry");
        LanGhostPursuit.Search search=brain.search(expired);
        check(search!=null && search.room()==5 && search.expiryTick()==expired+24,
                "limited follow-up sweep anchored only at last-known tile");
        GhostDomain.Command command=brain.decide(observation(expired,4,map,true),true);
        check(command!=null&&command.action()==GhostDomain.Action.DRIFT&&command.targetRoom()==5,
                "search can choose a legal transition toward stale clue");
        GhostDomain.Command noAttack=brain.decide(new GhostDomain.Observation(expired+1,5,4,100,false,true,
                map.ghostExits(5),List.of(GhostDomain.Action.STRIKE)),true);
        check(noAttack==null,"stale sound cannot trigger a strike even with presence and legal actions");
        LanGhostSpatial pose=new LanGhostSpatial(map,5);
        LanGhostPursuit.Impulse first=brain.approach(observation(expired,5,map,true),pose.pose());
        LanGhostPursuit.Impulse second=brain.approach(observation(expired+7,5,map,true),pose.pose());
        check(first!=null&&second!=null,"search makes physical exploration impulses");
        check(Math.abs(first.dx())<=100&&Math.abs(first.dz())<=100&&
                Math.abs(second.dx())<=100&&Math.abs(second.dz())<=100,
                "search never bypasses human movement input limits");
        check(first.dx()!=second.dx()||first.dz()!=second.dz(),"search changes physical waypoints");
        check(brain.search(expired+24)==null,"search expires, no persistent hunter trail");
        check(brain.approach(observation(expired+25,5,map,true),pose.pose())==null,
                "search stops when the trace ends");
        brain.heard(4,5,20.4,9.1,LanGhostPursuit.Sound.EQUIPMENT,expired+25);
        check(brain.memory(expired+25)!=null && brain.search(expired+25)==null,
                "a new event overrides stale searching");
        brain.forget();
        check(brain.memory(expired+25)==null && brain.search(expired+25)==null,
                "explicit reset removes both evidence and search");
        System.out.println("PASS: bounded ghost last-sound search and no omniscient attacks");
    }
}
