package org.beckenburg;

import java.util.ArrayDeque;
import java.util.List;
import java.util.Objects;
import java.util.Random;

/** Bounded, host-side sound tracking for an AI ghost. Does not accept private hunter bodies,
 * notebook entries, health, or a continuously updated hunter transform. The same GhostDomain
 * dispatcher and LanGhostSpatial step method remain the only ways to move/affect the world.
 */
public final class LanGhostPursuit {
    public enum Sound { FOOTSTEP(1, 25), DOOR(4, 55), EQUIPMENT(4, 55), RITUAL(8, 85);
        final int budget, lifetime;
        Sound(int budget, int lifetime) { this.budget=budget;this.lifetime=lifetime; }
    }
    public record Echo(int room, double approximateX, double approximateZ, int heardTick,
                       int expiryTick, Sound source) { }
    public record Impulse(int dx, int dz) { }
    /** Short search at the last audible location, with no future body updates. */
    public record Search(int room, double approximateX, double approximateZ, int startedTick, int expiryTick) { }
    private final HouseMap map;
    private final GhostIdentity.Type archetype;
    private final Random random;
    private Echo memory;
    private Search search;
    private long sequence;
    private int eventFrequency=100;
    public void configureFrequency(int percent){
        if(percent<50||percent>200)throw new IllegalArgumentException("invalid event rate");
        eventFrequency=percent;
    }

    public LanGhostPursuit(HouseMap map,long seed){this(map,seed,GhostIdentity.Type.SPIRIT);}
    public LanGhostPursuit(HouseMap map,long seed,GhostIdentity.Type type) {
        this.map=Objects.requireNonNull(map);
        this.archetype=Objects.requireNonNull(type);
        random=new Random(seed);
    }
    /** World-authorized events only. Coarse 2m cells intentionally discard exact positions. */
    public void heard(int ghostRoom, int sourceRoom, double x, double z, Sound kind, int tick) {
        Objects.requireNonNull(kind);
        if(ghostRoom<0||ghostRoom>=HouseMap.EXTRACTION_ROOM
                ||sourceRoom<0||sourceRoom>=HouseMap.EXTRACTION_ROOM
                ||!Double.isFinite(x)||!Double.isFinite(z)||tick<0
                ||map.roomAt(x,z)!=sourceRoom)return;
        int attenuation = LanAcoustics.cost(map,ghostRoom,sourceRoom);
        if(attenuation > kind.budget)return;
        // Doors, masonry and wind shorten each finite-lived acoustic clue.
        int lifetime=kind.lifetime-attenuation*5;
        if(lifetime<=0)return;
        // Tile-centred estimate, not an exact hunter body position.
        double cx=2*Math.floor(x/2)+1,cz=2*Math.floor(z/2)+1;
        Echo candidate=new Echo(sourceRoom,cx,cz,tick,tick+lifetime,kind);
        if(memory==null || tick>=memory.expiryTick() || kind.ordinal()>=memory.source().ordinal()
                || memory.heardTick()+10<tick) { memory=candidate; search=null; }
    }
    /** Time-limited immutable ghost observation, not a feed of all hunter locations. */
    public Echo memory(int tick) {
        if(memory!=null && tick>=memory.expiryTick()) {
            // Searching uses the expired clue, not a live position subscription.
            Echo ended=memory;
            memory=null;
            search=new Search(ended.room(),ended.approximateX(),ended.approximateZ(),
                    ended.expiryTick(),ended.expiryTick()+24);
        }
        if(search!=null && tick>=search.expiryTick())search=null;
        return memory;
    }
    public Search search(int tick) { memory(tick);return search; }
    public void forget(){memory=null;search=null;}

    /** Choose room actions from legal host observations and a finite memory of audible events. */
    public GhostDomain.Command decide(GhostDomain.Observation seen, boolean hasSpatialVictim) {
        Objects.requireNonNull(seen);
        List<GhostDomain.Action> legal=seen.legalActions();
        GhostDomain.Action action=null;
        int target=seen.room();
        boolean locallyHeard=memory(seen.tick())!=null && memory.room()==seen.room();
        if(locallyHeard && seen.hearsHunter() && seen.tick()%211==0
                &&legal.contains(GhostDomain.Action.SIGNATURE))
            action=GhostDomain.Action.SIGNATURE;
        else if(locallyHeard && seen.hearsHunter() && hasSpatialVictim && legal.contains(GhostDomain.Action.STRIKE))
            action=GhostDomain.Action.STRIKE;
        else if(locallyHeard && seen.hearsHunter() && legal.contains(GhostDomain.Action.MANIFEST))
            action=GhostDomain.Action.MANIFEST;
        else if(legal.contains(GhostDomain.Action.DRIFT) && memory(seen.tick())!=null
                && memory.room()!=seen.room()) {
            int next=route(seen.room(),memory.room());
            if(next>=0 && seen.exits().contains(next)){
                action=GhostDomain.Action.DRIFT;target=next;
            }
        }
        // A fading sound buys only a brief local sweep. No post-expiry STRIKE or MANIFEST.
        Search sweep=search(seen.tick());
        if(action==null && sweep!=null && seen.room()!=sweep.room()
                && legal.contains(GhostDomain.Action.DRIFT)) {
            int next=route(seen.room(),sweep.room());
            if(next>=0 && seen.exits().contains(next)){action=GhostDomain.Action.DRIFT;target=next;}
        }
        // Species bias uses only filtered host observations; never private hunter positions.
        GhostBehavior.Profile bias=GhostBehavior.profile(archetype);
        if(action==null && bias.favored()!=GhostDomain.Action.DRIFT
                && seen.tick()%Math.max(6,bias.aiPeriod()*100/eventFrequency)==0
                && legal.contains(bias.favored()))
            action=bias.favored();
        if(action==null && seen.tick()%29==0 && legal.contains(GhostDomain.Action.WHISPER))
            action=GhostDomain.Action.WHISPER;
        if(action==null && seen.tick()%41==0 && legal.contains(GhostDomain.Action.DISTURB))
            action=GhostDomain.Action.DISTURB;
        // With no sound, patrol occasionally rather than knowing where the team is.
        if(action==null && seen.tick()%(bias.favored()==GhostDomain.Action.DRIFT?bias.aiPeriod():35)==0
                && legal.contains(GhostDomain.Action.DRIFT)
                && !seen.exits().isEmpty() && memory(seen.tick())==null && search(seen.tick())==null){
            action=GhostDomain.Action.DRIFT;
            target=seen.exits().get(random.nextInt(seen.exits().size()));
        }
        return action==null?null:new GhostDomain.Command(action,target,++sequence,GhostDomain.Source.AI);
    }
    /** Move toward an old approximate sound in the current room; the host applies this using
     * LanGhostSpatial.step, which enforces exactly the same walls and speed as a human ghost.
     */
    public Impulse approach(GhostDomain.Observation seen, LanGhostSpatial.Pose pose) {
        if(seen==null||pose==null||seen.room()!=pose.room())return null;
        Echo e=memory(seen.tick());
        double tx,tz;
        if(e!=null && e.room()==pose.room()) {tx=e.approximateX();tz=e.approximateZ();}
        else {
            Search sweep=search(seen.tick());
            if(sweep==null||sweep.room()!=pose.room())return null;
            int phase=((seen.tick()-sweep.startedTick())/6)%4;
            // Search nearby positions, using only the stale 2m acoustic cell.
            double[] ox={1.0,0,-1.0,0}, oz={0,1.0,0,-1.0};
            tx=sweep.approximateX()+ox[phase];tz=sweep.approximateZ()+oz[phase];
        }
        double dx=tx-pose.x(), dz=tz-pose.z();
        if(Math.hypot(dx,dz)<.55)return null;
        // A direction, not a teleport or arbitrary speed.
        return new Impulse((int)Math.round(Math.max(-100,Math.min(100,dx*100))),
                (int)Math.round(Math.max(-100,Math.min(100,dz*100))));
    }
    private int route(int from,int to){
        if(from==to)return from;
        boolean[] seen=new boolean[HouseMap.ROOM_COUNT];
        ArrayDeque<int[]> todo=new ArrayDeque<>();todo.add(new int[]{from,-1});seen[from]=true;
        while(!todo.isEmpty()){
            int[] at=todo.removeFirst();
            for(int next:map.ghostExits(at[0]))if(!seen[next]){
                int first=at[1]<0?next:at[1];
                if(next==to)return first;
                seen[next]=true;todo.addLast(new int[]{next,first});
            }
        }
        return -1;
    }
}
