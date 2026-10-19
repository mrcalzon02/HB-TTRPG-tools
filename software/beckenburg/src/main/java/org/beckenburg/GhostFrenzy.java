package org.beckenburg;

import java.util.Objects;

/**
 * Host-owned high-intensity state above standard ghost actions. Species define the
 * entrance price and separate allowed physical/mental attacks. No hunter secrets
 * are exposed to human ghost clients and no client chooses damage or victim.
 */
public final class GhostFrenzy {
    public enum Phase { CALM, WARNING, RAGING, RECOVERY }
    public enum Cause { ACCUMULATION, PROVOCATION, GHOST_PLAYER }
    public enum Attack { CLAW, DREAD }
    /** All times in 100 ms authoritative simulation ticks. A zero claw cost
     * identifies ghosts whose frenzy does not cause direct physical damage.
     */
    public record Profile(int energyCost,int sanityThreshold,int earliestTick,
            int warningTicks,int ragingTicks,int recoveryTicks,
            int clawCost,int clawHarm,int clawFear,int clawCooldown,
            int dreadCost,int dreadFear,int dreadCooldown) {
        public Profile {
            if(energyCost<10||energyCost>100||sanityThreshold<0||sanityThreshold>100
                    ||earliestTick<100||warningTicks<10||ragingTicks<50||recoveryTicks<60
                    ||clawCost<0||clawCost>40||clawHarm<0||clawHarm>45||clawFear<0
                    ||clawCooldown<10||dreadCost<1||dreadCost>40||dreadFear<1
                    ||dreadCooldown<10||(clawCost==0&&clawHarm!=0))
                throw new IllegalArgumentException("invalid species frenzy profile");
        }
        public boolean permits(Attack attack){
            return attack==Attack.DREAD||clawCost>0;
        }
        public int cost(Attack attack){
            return attack==Attack.CLAW?clawCost:dreadCost;
        }
        public int cooldown(Attack attack){
            return attack==Attack.CLAW?clawCooldown:dreadCooldown;
        }
    }
    /** Species-specific dynamics, balanced alongside GhostTraits' recharge rates.
     * Demon: ~3.8 seconds worth of ambient recharge, but a 15-second recovery.
     * Shade/Specter: cannot apply physical damage in Frenzy, only DREAD.
     */
    public static Profile profile(GhostIdentity.Type type){
        return switch(Objects.requireNonNull(type).baseType()){
            case DEMON       ->new Profile(38,95,130,22,190,150,5,14,8,24,8,12,35);
            case DEVIL       ->new Profile(58,78,180,27,210,270,8,11,14,33,7,25,28);
            case POLTERGEIST ->new Profile(64,68,230,25,210,330,10,16,9,30,8,17,30);
            case BANSHEE     ->new Profile(70,68,210,30,230,300,0,0,0,30,8,28,32);
            case WRAITH      ->new Profile(73,65,220,27,230,350,8,16,12,28,9,18,34);
            case HANTU       ->new Profile(67,72,225,28,200,310,7,10,12,33,8,22,31);
            case YOKAI       ->new Profile(72,72,220,27,205,310,0,0,0,32,8,23,31);
            case SHADE       ->new Profile(82,48,280,35,175,430,0,0,0,40,10,27,42);
            case SPECTER     ->new Profile(78,56,255,31,190,400,0,0,0,38,10,26,39);
            case POSSESSIVE  ->new Profile(75,58,255,30,190,370,9,10,12,38,8,21,34);
            case MIMIC       ->new Profile(72,72,230,25,195,340,8,12,14,32,9,19,32);
            case TWINS       ->new Profile(69,67,220,28,220,345,9,12,12,31,8,19,33);
            case SPIRIT      ->new Profile(78,60,250,28,210,390,9,18,13,33,10,16,40);
        };
    }
    private final GhostIdentity.Type type;
    private final Profile traits;
    private Phase phase=Phase.CALM;
    private Cause cause=Cause.ACCUMULATION;
    private int endTick=-1,agitation,attempts,contacts,lastGlobalAttack=-10000;
    private int lastClaw=-10000,lastDread=-10000;
    private final int[] lastVictim={-10000,-10000,-10000,-10000,-10000,-10000};
    private boolean provoked;
    public GhostFrenzy(GhostIdentity.Type type){
        this.type=Objects.requireNonNull(type);
        traits=profile(type);
    }
    public Profile traits(){return traits;}
    public Phase phase(){return phase;}
    public Cause cause(){return cause;}
    public int agitation(){return agitation;}
    public int attempts(){return attempts;}
    public int contacts(){return contacts;}
    public boolean warning(){return phase==Phase.WARNING;}
    public boolean raging(){return phase==Phase.RAGING;}
    public boolean active(){return warning()||raging();}
    public boolean sealed(){return active();}
    public int remaining(int tick){return phase==Phase.CALM?0:Math.max(0,endTick-tick);}
    public boolean canStart(int tick,GhostDomain ghost,boolean hunterInSite){
        return tick>=traits.earliestTick()&&hunterInSite&&phase==Phase.CALM
            &&ghost!=null&&!ghost.suppressed()&&ghost.energy()>=traits.energyCost();
    }
    public boolean begin(int tick,GhostDomain ghost,boolean hunterInSite,Cause source){
        Objects.requireNonNull(source);
        if(!canStart(tick,ghost,hunterInSite)
                ||!ghost.spendFrenzyEnergy(traits.energyCost()))return false;
        cause=source;phase=Phase.WARNING;endTick=tick+traits.warningTicks();
        agitation=0;provoked=false;attempts++;
        return true;
    }
    /** No client can directly submit an arbitrary provocation strength. */
    public void provoke(int strength){
        if(strength<1||strength>35)throw new IllegalArgumentException("invalid frenzy provocation");
        agitation=Math.min(100,agitation+strength);
        if(agitation>=42)provoked=true;
    }
    /** A naturally aggressive species starts at higher sanity and pays less energy. */
    public boolean consider(int tick,GhostDomain ghost,boolean hunterInSite,int averageSanity){
        if(averageSanity<0||averageSanity>100)throw new IllegalArgumentException("average sanity");
        if(phase!=Phase.CALM||tick%25!=type.ordinal()%25)return false;
        if(!canStart(tick,ghost,hunterInSite))return false;
        if(!provoked&&averageSanity>traits.sanityThreshold())return false;
        return begin(tick,ghost,hunterInSite,
            provoked?Cause.PROVOCATION:Cause.ACCUMULATION);
    }
    /** Phase changes use one authoritative clock regardless of rendering/network FPS. */
    public boolean advance(int tick){
        if(tick<0)throw new IllegalArgumentException("negative tick");
        if(tick%20==0&&agitation>0)agitation--;
        if(phase==Phase.CALM||tick<endTick)return false;
        if(phase==Phase.WARNING){phase=Phase.RAGING;endTick=tick+traits.ragingTicks();}
        else if(phase==Phase.RAGING){phase=Phase.RECOVERY;endTick=tick+traits.recoveryTicks();}
        else {phase=Phase.CALM;endTick=-1;}
        return true;
    }
    /** Crosses interrupt the threat and guarantee a recovery window. */
    public boolean repel(int tick){
        if(!active())return false;
        phase=Phase.RECOVERY;endTick=tick+traits.recoveryTicks();
        return true;
    }
    public boolean available(Attack attack,int tick,GhostDomain ghost){
        Objects.requireNonNull(attack);
        if(!raging()||!traits.permits(attack)||ghost==null||ghost.suppressed()
                ||ghost.energy()<traits.cost(attack))return false;
        return tick-lastGlobalAttack>=10
            &&tick-(attack==Attack.CLAW?lastClaw:lastDread)>=traits.cooldown(attack);
    }
    /** One real target at a time. Costs and cooldowns are shared by AI and human ghosts. */
    public GhostDomain.Resolution attack(Attack attack,int tick,int seat,int room,GhostDomain ghost){
        if(seat<0||seat>=lastVictim.length||room<0||room>=HouseMap.INDOOR_ROOMS)
            throw new IllegalArgumentException("invalid frenzy target");
        if(!available(attack,tick,ghost)||tick-lastVictim[seat]<18
                ||!ghost.spendFrenzyEnergy(traits.cost(attack)))return null;
        lastVictim[seat]=tick;lastGlobalAttack=tick;contacts++;
        if(attack==Attack.CLAW)lastClaw=tick;else lastDread=tick;
        return new GhostDomain.Resolution(true,"frenzy "+attack,
            attack==Attack.CLAW?GhostDomain.Action.STRIKE:GhostDomain.Action.WHISPER,
            room,ghost.energy(),
            attack==Attack.CLAW?traits.clawFear():traits.dreadFear(),
            attack==Attack.CLAW?traits.clawHarm():0,true);
    }
}
