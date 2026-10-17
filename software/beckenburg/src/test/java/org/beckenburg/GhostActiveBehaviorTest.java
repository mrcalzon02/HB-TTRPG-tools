package org.beckenburg;

/** Live GhostDomain behavior, not just a static species metadata test. */
public final class GhostActiveBehaviorTest {
    private static void ok(boolean value,String why){if(!value)throw new AssertionError(why);}
    public static void main(String[] args){
        HouseMap map=new HouseMap();
        GhostDomain shade=new GhostDomain(map,4,GhostIdentity.Type.SHADE);
        GhostDomain demon=new GhostDomain(map,4,GhostIdentity.Type.DEMON);
        GhostDomain banshee=new GhostDomain(map,4,GhostIdentity.Type.BANSHEE);
        for(int tick=1;tick<=140;tick++){
            shade.advance(tick,4,1);demon.advance(tick,4,1);banshee.advance(tick,4,2);
        }
        var noSolo=banshee.dispatch(new GhostDomain.Command(GhostDomain.Action.SIGNATURE,4,1,GhostDomain.Source.HUMAN));
        ok(!noSolo.applied(),"Banshee cannot attack a crowded room as solitary prey");
        var sh=shade.dispatch(new GhostDomain.Command(GhostDomain.Action.SIGNATURE,4,1,GhostDomain.Source.HUMAN));
        var de=demon.dispatch(new GhostDomain.Command(GhostDomain.Action.SIGNATURE,4,1,GhostDomain.Source.HUMAN));
        ok(sh.applied()&&sh.harm()==0&&sh.fear()>0,"Shade signature is fear-only");
        ok(de.applied()&&de.harm()>sh.harm(),"Demon signature causes genuine health harm");
        ok(demon.energy()<shade.energy()+55,"expensive signature has a real energy cost");
        banshee.advance(141,4,1);
        var alone=banshee.dispatch(new GhostDomain.Command(GhostDomain.Action.SIGNATURE,4,2,GhostDomain.Source.HUMAN));
        ok(alone.applied(),"Banshee may attack after the team leaves one isolated hunter");
        GhostDomain specter=new GhostDomain(map,4,GhostIdentity.Type.SPECTER);
        specter.advance(1,4,1);
        specter.reveal(22);ok(specter.manifested(),"host-scheduled reveal uses manifestation state");
        specter.suppress(12);
        var response=specter.dispatch(new GhostDomain.Command(GhostDomain.Action.WHISPER,4,1,GhostDomain.Source.AI));
        ok(!response.applied(),"cross/ward suppression prevents offensive spook");
        System.out.println("PASS: actual signature actions, isolated prey, sanity-only species, and suppression");
    }
}