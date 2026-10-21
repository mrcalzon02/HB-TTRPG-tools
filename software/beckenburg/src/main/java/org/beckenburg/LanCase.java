package org.beckenburg;

import java.util.EnumSet;

/** Room-level LAN case rules. All changes are made by LanHost, never by peer-supplied damage or evidence. */
public final class LanCase {
    public enum Outcome { ACTIVE, CLEANSED, BANISHED, ABSOLVED, RETREATED, LOST }
    /** Detection falls off within the actual 3D room; the room-mode demo remains abstract. */
    public enum Tool {
        EMF(2.6), THERMOMETER(3.4), SPIRIT_BOX(2.1);
        private final double sensingRadius;
        Tool(double radius){sensingRadius=radius;}
        public double sensingRadius(){return sensingRadius;}
    }
    public record Report(boolean accepted, String message) { }
    private static final int RITUAL_TICKS = 45, ABANDON_GRACE_TICKS = 20;
    private int riteTicks(){
        int normal=!identificationRequired?RITUAL_TICKS:switch(selectedRite==null?archetype.rite():selectedRite){
            case BANISHMENT->55;
            case CLEANSING->45;
            case ABSOLUTION->60;
        };
        return normal*(archetype.elder()?4:archetype.ancient()?2:1);
    }
    public int requiredRitualTicks(){return riteTicks();}
    public enum RitualAdvance { NONE, PAUSED, RESUMED, BROKEN, CLEANSED }
    private final int anchor;
    private final HouseMap missionMap;
    private final EnumSet<Tool> evidence=EnumSet.noneOf(Tool.class), tested=EnumSet.noneOf(Tool.class);
    private GhostIdentity.Type archetype=GhostIdentity.Type.SPIRIT, identified;
    private GhostEvidenceProfile.EmfBand evidenceEmfBand=
        GhostEvidenceProfile.emfBand(GhostIdentity.Type.SPIRIT);
    private HardEvidenceQuota hardEvidence=new HardEvidenceQuota(
        GhostIdentity.Type.SPIRIT,HardEvidenceQuota.Level.EASY,0);
    /** Host-selected evidence scarcity applies to producers, not benign readings. */
    public void configureHardEvidence(HardEvidenceQuota.Level difficulty,long caseSeed){
        if(outcome!=Outcome.ACTIVE||ritualProgress>=0)
            throw new IllegalStateException("active case cannot change evidence quota");
        hardEvidence=new HardEvidenceQuota(archetype,difficulty,caseSeed);
    }
    public boolean allowsEvidence(HardEvidenceQuota.Family type){
        return hardEvidence.permits(type);
    }
    public HardEvidenceQuota.Level evidenceDifficulty(){return hardEvidence.level();}
    public int guaranteedEvidenceCount(){return hardEvidence.allowance();}
    /** Host-only selector; never serialized to a client or a casefile frame. */
    public HardEvidenceQuota hardEvidenceQuota(){return hardEvidence;}
    private boolean identificationRequired;
    private int lastGuessTick=-1000;
    private final int[] health={100,100,100,100,100,100},stress=new int[6],wards={2,2,2,2,2,2};
    private final boolean[] active={true,true,true,false,false,false};
    private int sanityDrainRate=100,partyThreat;
    public void configurePartyThreat(int bonus){
        if(bonus<1||bonus>6)throw new IllegalArgumentException("party difficulty must be +1..+6");
        partyThreat=bonus;
    }
    private final int[] drainRemainder=new int[6];
    public void configureSanityDrain(int percentage){
        if(percentage<0||percentage>200)throw new IllegalArgumentException("invalid sanity loss");
        sanityDrainRate=percentage;
    }
    /** Called before a hosted match. Tests using the legacy three-seat case remain unchanged. */
    public void configureHunters(int count){
        if(count<1||count>6||outcome!=Outcome.ACTIVE)throw new IllegalArgumentException("1-6 hunters required");
        for(int i=0;i<6;i++)active[i]=i<count;
    }
    public void setStartingSanity(int value){
        if(value<0||value>100)throw new IllegalArgumentException("invalid starting sanity");
        for(int i=0;i<6;i++)stress[i]=100-value;
    }
    public boolean heal(int seat,int amount){
        hunter(seat);if(amount<1||amount>100||!alive(seat)||health[seat]==100)return false;
        health[seat]=Math.min(100,health[seat]+amount);return true;
    }
    public boolean calm(int seat,int amount){
        hunter(seat);if(amount<1||amount>100||!alive(seat)||stress[seat]==0)return false;
        stress[seat]=Math.max(0,stress[seat]-amount);return true;
    }
    private int wardRoom=-1,ritualProgress=-1,unguardedTicks,ritualRoom=-1;
    private GhostIdentity.Rite selectedRite;
    private Outcome outcome=Outcome.ACTIVE;

    public LanCase(int anchor) {this(anchor,new HouseMap());}
    public LanCase(int anchor,HouseMap map) {
        missionMap=java.util.Objects.requireNonNull(map);
        if(anchor<0||anchor>=HouseMap.INDOOR_ROOMS)throw new IllegalArgumentException("invalid anchor");
        this.anchor=anchor;
    }
    private static void hunter(int seat){if(seat<0||seat>=6)throw new IllegalArgumentException("hunter seat required");}
    public Outcome outcome(){return outcome;}
    public int evidenceCount(){return evidence.size();}
    public int testedCount(){return tested.size();}
    public GhostIdentity.Type type(){return archetype;}
    public GhostIdentity.Type identified(){return identified;}
    public boolean correctlyIdentified(){return identified==archetype;}
    /** Call only before a session; selection belongs to the host, not remote scan packets. */
    public void configure(GhostIdentity.Type type,boolean requireIdentification){
        if(outcome!=Outcome.ACTIVE||!evidence.isEmpty()||!tested.isEmpty()||ritualProgress>=0)
            throw new IllegalStateException("cannot change an active investigation");
        archetype=java.util.Objects.requireNonNull(type);
        evidenceEmfBand=GhostEvidenceProfile.emfBand(archetype);
        hardEvidence=new HardEvidenceQuota(archetype,HardEvidenceQuota.Level.EASY,0);
        identificationRequired=requireIdentification;
        identified=null;
    }
    public Report identify(int seat,GhostIdentity.Type guess,int tick){
        hunter(seat);
        java.util.Objects.requireNonNull(guess);
        if(outcome!=Outcome.ACTIVE||!alive(seat))return new Report(false,"identification unavailable");
        if(!identificationRequired)return new Report(false,"identity dossier not enabled");
        if(identified!=null&&hardEvidence.level()!=HardEvidenceQuota.Level.DEATH_WISH)
            return new Report(false,"entity already identified");
        if(tick<0||tick-lastGuessTick<30)return new Report(false,"allow the entity to settle before another deduction");
        lastGuessTick=tick;
        // Death Wish records an unverified hypothesis rather than offering
        // an oracle for testing all thirteen ghosts via rejected guesses.
        if(hardEvidence.level()==HardEvidenceQuota.Level.DEATH_WISH){
            identified=guess;
            return new Report(true,"ENTITY HYPOTHESIS RECORDED "+guess);
        }
        if(guess!=archetype){
            stress[seat]=Math.min(100,stress[seat]+15);
            return new Report(false,"evidence contradicts that entity; investigator fear increases");
        }
        identified=guess;
        return new Report(true,"ENTITY IDENTIFIED "+guess);
    }
    public int health(int seat){hunter(seat);return health[seat];}
    /** Single host-owned predicate for participation, pursuit and strike eligibility. */
    public boolean alive(int seat){
        hunter(seat);return active[seat]&&health[seat]>0;
    }
    public int stress(int seat){hunter(seat);return stress[seat];}
    /** Host-only, bounded, individual slow sanity drain from presence-feeding ghosts. */
    public boolean drainSanity(int seat,int amount){
        hunter(seat);
        if(amount<0||amount>3)throw new IllegalArgumentException("invalid sanity drain");
        if(outcome!=Outcome.ACTIVE||!alive(seat)||amount==0)return false;
        drainRemainder[seat]+=amount*sanityDrainRate*(100+partyThreat*10);
        int actual=drainRemainder[seat]/10000;
        drainRemainder[seat]%=10000;
        if(actual==0)return false;
        stress[seat]=Math.min(100,stress[seat]+actual);
        return true;
    }
    public int wards(int seat){hunter(seat);return wards[seat];}
    public boolean wardPrepared(){return wardRoom==anchor;}
    public int ritualProgress(){return ritualProgress;}
    public int ritualRoom(){return ritualRoom;}
    public GhostIdentity.Rite requiredRite(){return archetype.rite();}
    public GhostIdentity.Rite activeRite(){return selectedRite;}
    public boolean identificationRequired(){return identificationRequired;}
    public int remainingHunters(){
        int count=0;for(boolean connected:active)if(connected)count++;
        return count;
    }
    /** Only the host can retire a departing seat; no reconnect/seat reuse in this alpha. */
    public void depart(int seat){
        hunter(seat);
        if(!active[seat])return;
        active[seat]=false;
        // Vacant and incapacitated seats cannot keep an already lost case active.
        boolean survivor=false;
        for(int i=0;i<6;i++)if(alive(i))survivor=true;
        if(outcome==Outcome.ACTIVE&&!survivor)outcome=Outcome.LOST;
    }
    public String privateState(int seat) {
        hunter(seat);
        return "PROGRESS|"+health[seat]+"|"+stress[seat]+"|"+wards[seat]+"|"+evidence.size()+"|"+(wardPrepared()?1:0)+"|"+Math.max(0,ritualProgress)+"|"+outcome;
    }
    /** Compatibility entry point for room-only callers: always return a measured
     * value. Old fixed species-specific EMF/thermal/voice subtype codes are retired.
     */
    public Report scan(int seat,Tool tool,int room,int ghostRoom){
        return scanMeasured(seat,tool,room,ghostRoom,0,-1,0);
    }
    /** A host-owned body determines which real room can be measured. */
    public Report scanSpatial(int seat,Tool tool,LanWorld.Body body,int ghostRoom,HouseMap map){
        return scanSpatialMeasured(seat,tool,body,ghostRoom,map,0,-1,0);
    }
    /**
     * Expanded-evidence measurement path. Unlike the legacy fixed signature path,
     * EMF is a 1-10 environmental event measurement and room temperatures follow
     * season, weather and a genuine hot/cold haunting. Other evidence families
     * still require the later equipment/ghost-matrix integration.
     */
    private EvidenceSignals.Season evidenceSeason=EvidenceSignals.Season.AUTUMN;
    private EvidenceSignals.Weather evidenceWeather=EvidenceSignals.Weather.CLEAR;
    private int evidenceWeatherIntensity=1;
    private EvidenceSignals.Polarity evidenceThermal=EvidenceSignals.Polarity.COLD;
    private int evidenceHour=14;
    private boolean evidenceHeating=true;
    public void configureEvidenceClimate(EvidenceSignals.Season season,
            EvidenceSignals.Weather weather,int hour,boolean heating,
            EvidenceSignals.Polarity thermalPolarity){
        if(outcome!=Outcome.ACTIVE||hour<0||hour>23)
            throw new IllegalArgumentException("invalid evidence climate");
        evidenceSeason=java.util.Objects.requireNonNull(season);
        evidenceWeather=java.util.Objects.requireNonNull(weather);
        evidenceThermal=java.util.Objects.requireNonNull(thermalPolarity);
        evidenceHour=hour;evidenceHeating=heating;
    }
    /** Host updates conditions between readings without resetting case evidence. */
    public void setEvidenceHeating(boolean heating){evidenceHeating=heating;}
    public void updateEvidenceWeather(EvidenceSignals.Weather weather,int intensity){
        if(intensity<1||intensity>3)throw new IllegalArgumentException("weather intensity");
        evidenceWeather=java.util.Objects.requireNonNull(weather);
        evidenceWeatherIntensity=intensity;
    }
    public Report scanMeasured(int seat,Tool tool,int room,int ghostRoom,
            int tick,int eventRoom,int eventStrength){
        return scanMeasured(seat,tool,room,ghostRoom,tick,eventRoom,eventStrength,false);
    }
    public Report scanMeasured(int seat,Tool tool,int room,int ghostRoom,
            int tick,int eventRoom,int eventStrength,boolean emfSilence){
        hunter(seat);
        if(outcome!=Outcome.ACTIVE||!alive(seat))
            return new Report(false,"investigation unavailable");
        if(tool==null||room<0||room>=HouseMap.ROOM_COUNT||tick<0
                ||eventStrength<0||eventStrength>10)
            return new Report(false,"invalid environmental scan context");
        String reading;
        switch(tool){
            case EMF -> {
                boolean spectral=allowsEvidence(HardEvidenceQuota.Family.EMF);
                EvidenceSignals.Electromagnetic sample=EvidenceSignals.emf(
                    0xB3CC3BL,tick,room,spectral?eventRoom:-1,
                    spectral?eventStrength:0,evidenceEmfBand,
                    evidenceWeather,evidenceWeatherIntensity);
                reading="EMF "+sample.level()+"/10";
            }
            case THERMOMETER -> {
                boolean inside=room<HouseMap.INDOOR_ROOMS;
                EvidenceSignals.Location place=new EvidenceSignals.Location(
                    evidenceSeason,evidenceWeather,evidenceHour,room,inside,evidenceHeating);
                boolean spectral=allowsEvidence(HardEvidenceQuota.Family.TEMPERATURE);
                EvidenceSignals.Temperature sample=EvidenceSignals.temperature(
                    0xA11CE5L,tick,place,spectral?evidenceThermal:EvidenceSignals.Polarity.NONE,
                    spectral&&room==anchor,spectral?eventStrength:0,
                    evidenceWeatherIntensity);
                reading="Air "+sample.displayText(EvidenceSignals.Unit.CELSIUS)
                    +" / "+sample.displayText(EvidenceSignals.Unit.FAHRENHEIT);
            }
            case SPIRIT_BOX -> reading=allowsEvidence(HardEvidenceQuota.Family.SPIRIT_BOX)
                    &&room==ghostRoom&&room==eventRoom&&eventStrength>0
                ?"Voice response detected":"No response detected";
            default -> throw new AssertionError(tool);
        }
        return new Report(true,"READING "+tool+" in "+room+" - "+reading);
    }
    public Report scanSpatialMeasured(int seat,Tool tool,LanWorld.Body body,
            int ghostRoom,HouseMap map,int tick,int eventRoom,int eventStrength){
        return scanSpatialMeasured(seat,tool,body,ghostRoom,map,tick,eventRoom,eventStrength,false);
    }
    public Report scanSpatialMeasured(int seat,Tool tool,LanWorld.Body body,
            int ghostRoom,HouseMap map,int tick,int eventRoom,int eventStrength,boolean emfSilence){
        hunter(seat);
        if(outcome!=Outcome.ACTIVE||!alive(seat))
            return new Report(false,"investigation unavailable");
        if(tool==null||body==null||map==null
                ||!Double.isFinite(body.x())||!Double.isFinite(body.z())
                ||map.roomAt(body.x(),body.y(),body.z())!=body.room())
            return new Report(false,"invalid instrument or host body");
        int room=body.room();
        // All probes continue reading the room's ordinary physical environment.
        // Reach only controls pickup of a *distant* ghost event: it must never
        // suppress an ordinary measurement or announce evidence validity.
        boolean ghostEventNearby=eventRoom==room&&
            Math.hypot(body.x()-map.centerX(eventRoom),
                       body.z()-map.centerZ(eventRoom))<=tool.sensingRadius();
        return scanMeasured(seat,tool,room,ghostRoom,tick,
            ghostEventNearby?eventRoom:-1,
            ghostEventNearby?eventStrength:0,emfSilence);
    }

    public Report ward(int seat,int room) {
        hunter(seat);
        if(outcome!=Outcome.ACTIVE||!active[seat]||health[seat]<=0)return new Report(false,"cannot ward now");
        if(wards[seat]<=0)return new Report(false,"no wards remaining");
        wards[seat]--;
        stress[seat]=Math.max(0,stress[seat]-20);
        if(room==anchor)wardRoom=room;
        return new Report(true,room==anchor?"ANCHOR WARD PREPARED":"DEFENSIVE WARD PLACED");
    }
    public Report cleanse(int seat,int room){
        return performRite(seat,GhostIdentity.Rite.CLEANSING,room,true);
    }
    /** Both room mode and 3D mode are checked here against the site's host location. */
    public Report performRite(int seat,GhostIdentity.Rite rite,int room,boolean nearSite){
        hunter(seat);java.util.Objects.requireNonNull(rite);
        if(outcome!=Outcome.ACTIVE||!alive(seat))return new Report(false,"cannot perform rite");
        if(identificationRequired&&identified!=archetype)
            return new Report(false,hardEvidence.level()==HardEvidenceQuota.Level.DEATH_WISH
                ?"ritual cannot proceed with an uncertain hypothesis"
                :"identify the ghost before choosing its rite");
        if(identificationRequired){
            if(rite!=archetype.rite())return new Report(false,"incorrect rite for this ghost");
            var site=RitualSites.site(missionMap,rite);
            if(room!=site.room()||!nearSite)return new Report(false,"go to the correct ritual installation");
        }else if(rite!=GhostIdentity.Rite.CLEANSING||room!=anchor)
            return new Report(false,"legacy rite requires the haunting anchor");
        if(!wardPrepared())return new Report(false,"anchor ward required");
        if(ritualProgress>=0)return new Report(false,"ritual already underway");
        selectedRite=rite;ritualRoom=room;ritualProgress=0;unguardedTicks=0;
        return new Report(true,"RITUAL STARTED - "+rite+" - defend the prepared circle");
    }
    public Report extract(int seat,int room) {
        hunter(seat);
        if(outcome!=Outcome.ACTIVE||!active[seat]||health[seat]<=0)return new Report(false,"extraction unavailable");
        if(room!=HouseMap.EXTRACTION_ROOM)return new Report(false,"return to van staging");
        outcome=Outcome.RETREATED;
        return new Report(true,"TEAM WITHDREW - haunting unresolved");
    }
    public void applyGhostEffect(int room,int[] hunterRooms,GhostDomain.Resolution effect) {
        // Derive the legacy room-effect mask from the actual 3- or 6-seat snapshot.
        // Do not apply a 3-seat mask to the six-slot hosted simulation.
        if(hunterRooms==null||(hunterRooms.length!=3&&hunterRooms.length!=6))
            throw new IllegalArgumentException("three or six hunter positions required");
        boolean[] all=new boolean[hunterRooms.length];java.util.Arrays.fill(all,true);
        applyGhostEffect(room,hunterRooms,effect,all);
    }
    /** Host may narrow an actual spatial strike to eligible seats; never trust a client mask. */
    public void applyGhostEffect(int room,int[] hunterRooms,GhostDomain.Resolution effect,boolean[] affected) {
        if(hunterRooms.length!=affected.length||(hunterRooms.length!=3&&hunterRooms.length!=6))
            throw new IllegalArgumentException("matched 3 or 6 hunter positions required");
        if(outcome!=Outcome.ACTIVE||!effect.applied())return;
        for(int i=0;i<hunterRooms.length;i++)if(active[i]&&affected[i]&&hunterRooms[i]==room && health[i]>0){
            drainRemainder[i]+=effect.fear()*sanityDrainRate*(100+partyThreat*10);
            stress[i]=Math.min(100,stress[i]+drainRemainder[i]/10000);
            drainRemainder[i]%=10000;
            int physical=effect.harm()*(100+partyThreat*10)/100;
            if(physical>0)health[i]=Math.max(0,health[i]-
                Math.max(1,wardRoom==room?Math.min(4,physical):physical));
        }
        if(ritualProgress>=0 && room==ritualRoom
                &&(effect.action()==GhostDomain.Action.DISTURB
                   ||effect.action()==GhostDomain.Action.SIGNATURE)){
            ritualProgress=Math.max(0,ritualProgress-
                (effect.action()==GhostDomain.Action.SIGNATURE?18:12));
            // Interruptions are bounded; ghosts cannot trivially reset an entire ritual.
        }
        // Disconnected seats cannot become invulnerable phantom survivors.
        boolean survivor=false;
        for(int i=0;i<6;i++)if(active[i]&&health[i]>0)survivor=true;
        if(!survivor)outcome=Outcome.LOST;
    }
    /** Advance on the host's 100ms simulation clock, never on a client timer.
     * An investigator must be active, alive and physically in the anchor room.
     * A vacated circle pauses immediately and unravels after twenty unattended ticks.
     */
    public RitualAdvance advance(int[] hunterRooms) {
        if(hunterRooms==null||(hunterRooms.length!=3&&hunterRooms.length!=6))
            throw new IllegalArgumentException("three or six hunter room snapshots required");
        if(outcome!=Outcome.ACTIVE||ritualProgress<0)return RitualAdvance.NONE;
        boolean guarded=false;
        for(int seat=0;seat<hunterRooms.length;seat++)
            if(active[seat]&&health[seat]>0&&hunterRooms[seat]==ritualRoom)guarded=true;
        if(!guarded){
            if(++unguardedTicks>=ABANDON_GRACE_TICKS){
                ritualProgress=-1;
                unguardedTicks=0;
                return RitualAdvance.BROKEN;
            }
            return unguardedTicks==1?RitualAdvance.PAUSED:RitualAdvance.NONE;
        }
        boolean resumed=unguardedTicks>0;
        unguardedTicks=0;
        if(++ritualProgress>=riteTicks()){
            outcome=(!identificationRequired||selectedRite==GhostIdentity.Rite.CLEANSING)
                    ?Outcome.CLEANSED:selectedRite==GhostIdentity.Rite.BANISHMENT
                    ?Outcome.BANISHED:Outcome.ABSOLVED;
            return RitualAdvance.CLEANSED;
        }
        return resumed?RitualAdvance.RESUMED:RitualAdvance.NONE;
    }
}
