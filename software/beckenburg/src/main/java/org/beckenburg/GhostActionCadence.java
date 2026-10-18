package org.beckenburg;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Repeating, host-authoritative action deadline shared by human and AI ghosts.
 * It does not generate evidence directly: only the ordinary GhostDomain dispatcher
 * can apply an actual event (sound, disturbance, manifestation or signature).
 */
public final class GhostActionCadence {
    /** 100ms host tick; 10-15s per event depending on spectral behavior. */
    public static final int MIN_PERIOD=100,MAX_PERIOD=150;
    private final GhostIdentity.Type species;
    private int dueTick;
    private int successfulEvents;
    public GhostActionCadence(GhostIdentity.Type species){
        this.species=Objects.requireNonNull(species);
        dueTick=period();
    }
    public int period(){
        int bias=GhostBehavior.profile(species).aiPeriod();
        return Math.max(MIN_PERIOD,Math.min(MAX_PERIOD,70+bias*2));
    }
    public int dueTick(){return dueTick;}
    public int successfulEvents(){return successfulEvents;}
    /** DRIFT chooses a destination but cannot substitute for a haunting event. */
    public void completed(int tick,GhostDomain.Resolution result){
        if(tick<0||result==null)throw new IllegalArgumentException("invalid action result");
        if(result.applied()&&result.action()!=GhostDomain.Action.DRIFT){
            successfulEvents++;
            dueTick=tick+period();
        }
    }
    /** Countdown does not stall on client rendering, and cannot be reset by movement. */
    public boolean due(int tick){return tick>=dueTick;}
    /** Small public selection list; never exposes private hunter coordinates. */
    public List<GhostDomain.Action> choices(GhostDomain.Observation state){
        Objects.requireNonNull(state);
        List<GhostDomain.Action> result=new ArrayList<>();
        var legal=state.legalActions();
        var favored=GhostBehavior.profile(species).favored();
        if(favored!=GhostDomain.Action.DRIFT&&legal.contains(favored))result.add(favored);
        for(var action:List.of(GhostDomain.Action.DISTURB,GhostDomain.Action.WHISPER,
                GhostDomain.Action.MANIFEST,GhostDomain.Action.SIGNATURE,
                GhostDomain.Action.STRIKE))
            if(legal.contains(action)&&!result.contains(action)&&result.size()<3)
                result.add(action);
        return List.copyOf(result);
    }
    /**
     * At the deadline, pick one legal event. Do not manufacture fake world evidence
     * and do not degrade to DRIFT, which could let a player evade activity forever.
     * If warded/empty of energy, wait for an actual legal event on later host ticks.
     */
    public GhostDomain.Action fallback(GhostDomain.Observation state,boolean hasStrikeVictim){
        Objects.requireNonNull(state);
        List<GhostDomain.Action> available=choices(state);
        for(var action:available)
            if(action!=GhostDomain.Action.STRIKE||hasStrikeVictim)return action;
        return null;
    }
    public String prompt(GhostDomain.Observation state){
        Objects.requireNonNull(state);
        StringBuilder out=new StringBuilder("GPROMPT|").append(state.tick())
            .append('|').append(dueTick).append('|').append(state.room());
        for(var action:choices(state))out.append('|').append(action);
        return out.toString();
    }
}
