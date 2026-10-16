package org.beckenburg;

import java.util.List;
import java.util.Random;

/** A genuine HUMAN-origin controller exercising the same local GhostDomain dispatcher as AI.
 * One scripted hunter is present solely to practice counterplay. NOT a network match or hunter AI.
 */
public final class GhostPracticeSession {
    public enum Outcome { ACTIVE, TWO_STRIKES }
    private final HouseMap map;
    private final GhostDomain ghost;
    private final Random patrol;
    private int tick, hunterRoom, strikes;
    private long sequence;
    private Outcome outcome=Outcome.ACTIVE;
    private String status="Listen for a nearby investigator. Haunt, manifest, then strike.";
    private GhostDomain.Resolution lastResolution;

    public GhostPracticeSession(HouseMap map, long seed) {
        this.map=java.util.Objects.requireNonNull(map);
        if (!map.valid()) throw new IllegalArgumentException("invalid practice map");
        int anchor=(int)Math.floorMod(seed, map.interiorRoomCount());
        ghost=new GhostDomain(map,anchor);
        hunterRoom=anchor;
        patrol=new Random(seed ^ 0x6245434b454e4255L);
    }
    public int tickCount(){return tick;}
    public int ghostRoom(){return ghost.room();}
    public int strikes(){return strikes;}
    public Outcome outcome(){return outcome;}
    public String status(){return status;}
    public GhostDomain.Observation observation(){return ghost.observe();}
    /** The simulated hunter's exact location is deliberately concealed unless the ghost senses them. */
    public int visibleHunterRoom(){return ghost.observe().hearsHunter()?hunterRoom:-1;}
    public GhostDomain.Resolution lastResolution(){return lastResolution;}

    public void tick(){
        if(outcome!=Outcome.ACTIVE)return;
        tick++;
        // Give newcomers time to learn the manifestation/strike window before a patrol begins.
        if(tick>320 && tick%140==0){
            List<Integer> exits=map.ghostExits(hunterRoom);
            if(!exits.isEmpty())hunterRoom=exits.get(patrol.nextInt(exits.size()));
        }
        ghost.advance(tick,hunterRoom);
    }
    public GhostDomain.Resolution act(GhostDomain.Action action,int targetRoom){
        if(action==null)throw new IllegalArgumentException("action");
        if(outcome!=Outcome.ACTIVE)return null;
        GhostDomain.Command input=new GhostDomain.Command(action,targetRoom,++sequence,GhostDomain.Source.HUMAN);
        GhostDomain.Resolution result=ghost.dispatch(input);
        lastResolution=result;
        if(!result.applied()){
            status="Rejected: "+result.reason()+".";
            return result;
        }
        if(result.harm()>0){
            strikes++;
            status="Strike registered ("+strikes+"/2). Energy "+result.energy()+".";
            if(strikes==2){outcome=Outcome.TWO_STRIKES;status="Ghost training complete. Two legal strikes registered.";}
        } else {
            status=switch(action){
                case DRIFT -> "Phased into "+map.roomName(result.room())+".";
                case WHISPER -> "Whisper emitted. Nearby investigator may hear it.";
                case DISTURB -> "Environmental disturbance released.";
                case MANIFEST -> "Manifestation active. Strike when the investigator is near.";
                case STRIKE -> "Strike resolved.";
            };
        }
        return result;
    }
}
