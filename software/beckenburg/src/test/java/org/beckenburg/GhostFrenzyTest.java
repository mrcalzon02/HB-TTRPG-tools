package org.beckenburg;

/** Species-by-species Frenzy matrix, lifecycle and AI/human attack budget parity. */
public final class GhostFrenzyTest {
    private static void ok(boolean b,String reason){if(!b)throw new AssertionError(reason);}
    private static GhostDomain charged(GhostIdentity.Type type,int ticks){
        GhostDomain ghost=new GhostDomain(new HouseMap(),4,type);
        for(int t=1;t<=ticks;t++)ghost.advance(t,-1,0);
        return ghost;
    }
    public static void main(String[] args){
        for(GhostIdentity.Type type:GhostIdentity.Type.values()){
            GhostFrenzy.Profile p=GhostFrenzy.profile(type);
            ok(p.energyCost()>0&&p.energyCost()<=100,"entry price "+type);
            ok(p.dreadFear()>0&&p.dreadCost()>0,"fear attack "+type);
            if(GhostTraits.of(type).harmPercent()==0)
                ok(p.clawCost()==0,"nonphysical type cannot claw "+type);
        }
        var demon=GhostFrenzy.profile(GhostIdentity.Type.DEMON);
        var spirit=GhostFrenzy.profile(GhostIdentity.Type.SPIRIT);
        var shade=GhostFrenzy.profile(GhostIdentity.Type.SHADE);
        ok(demon.energyCost()<spirit.energyCost()&&demon.energyCost()<shade.energyCost(),
            "Demon enters Frenzy more cheaply");
        ok(demon.recoveryTicks()<spirit.recoveryTicks(),
            "Demon recovers faster");
        ok(demon.sanityThreshold()>spirit.sanityThreshold(),
            "Demon begins threatening at higher sanity");
        GhostDomain active=charged(GhostIdentity.Type.DEMON,130);
        GhostFrenzy rage=new GhostFrenzy(GhostIdentity.Type.DEMON);
        ok(rage.canStart(130,active,true),"Demon ready early");
        ok(rage.begin(130,active,true,GhostFrenzy.Cause.GHOST_PLAYER),
            "Ghost player uses species-priced entrance");
        ok(active.energy()==100-demon.energyCost(),"entrance spends real energy");
        ok(rage.warning()&&rage.sealed(),"warning phase seals extraction");
        ok(!rage.available(GhostFrenzy.Attack.CLAW,131,active),
            "warning never causes contact damage");
        ok(!rage.begin(131,active,true,GhostFrenzy.Cause.GHOST_PLAYER),
            "no overlapping Frenzies");
        ok(rage.advance(152)&&rage.raging(),"warning advances to rage");
        GhostDomain.Resolution claw=rage.attack(GhostFrenzy.Attack.CLAW,152,0,4,active);
        ok(claw!=null&&claw.harm()==14&&claw.fear()==8,
            "Demon CLAW moderates HP and sanity damage");
        ok(active.energy()==100-demon.energyCost()-demon.clawCost(),
            "claw attack also pays species-specific energy");
        ok(rage.attack(GhostFrenzy.Attack.CLAW,153,0,4,active)==null,
            "claw cooldown and repeat-hit immunity");
        ok(rage.attack(GhostFrenzy.Attack.DREAD,165,1,4,active)!=null,
            "Demon psychic damage becomes available during rage");
        ok(rage.attack(GhostFrenzy.Attack.DREAD,165,2,4,active)==null,
            "global action interval prevents multi-victim burst");
        ok(rage.repel(166)&&rage.phase()==GhostFrenzy.Phase.RECOVERY,
            "cross repels into mandatory recovery");
        ok(!rage.available(GhostFrenzy.Attack.CLAW,167,active),
            "no attacks during recovery");
        ok(!rage.canStart(200,active,true),"recovery prevents immediate repeat");
        ok(rage.advance(166+demon.recoveryTicks())
            &&rage.phase()==GhostFrenzy.Phase.CALM,
            "frenzy eventually resets");
        GhostDomain shadow=charged(GhostIdentity.Type.SHADE,350);
        GhostFrenzy spectral=new GhostFrenzy(GhostIdentity.Type.SHADE);
        ok(spectral.begin(350,shadow,true,GhostFrenzy.Cause.PROVOCATION),
            "shade can start a nonphysical frenzy");
        ok(spectral.advance(350+shade.warningTicks()),"shade warning ends");
        ok(!spectral.available(GhostFrenzy.Attack.CLAW,390,shadow),
            "shade has no health-damaging claw");
        GhostDomain.Resolution dread=spectral.attack(GhostFrenzy.Attack.DREAD,390,0,4,shadow);
        ok(dread!=null&&dread.harm()==0&&dread.fear()==shade.dreadFear(),
            "shade frenzy attacks sanity but not physical health");
        GhostDomain measured=charged(GhostIdentity.Type.SPIRIT,258);
        GhostFrenzy reactive=new GhostFrenzy(GhostIdentity.Type.SPIRIT);
        ok(!reactive.consider(258,measured,true,90),
            "calm high-sanity party avoids ordinary spirit frenzy");
        reactive.provoke(35);reactive.provoke(10);
        ok(reactive.consider(258,measured,true,90)
                &&reactive.cause()==GhostFrenzy.Cause.PROVOCATION,
            "multiple host events can trigger early provoked frenzy");
        GhostDomain none=charged(GhostIdentity.Type.DEMON,130);
        GhostFrenzy isolation=new GhostFrenzy(GhostIdentity.Type.DEMON);
        ok(!isolation.begin(130,none,false,GhostFrenzy.Cause.GHOST_PLAYER),
            "ghost cannot frenzy an empty investigation site");
        ok(none.energy()==100,"rejected frenzy does not charge energy");
        System.out.println("PASS species-priced Demon Frenzy, phased attacks, sanity-only entities, provocation and cooldowns");
    }
}
