package org.beckenburg;

import java.util.Objects;

/** Eight authoritative 100 ms ticks between accepting a 3D strike and applying harm.
 * A strike locks its original target: turning, movement, doors and room shifts are
 * revalidated at impact; it never retargets a different nearby investigator.
 */
public final class LanTelegraphedStrike {
    public static final int WINDUP_TICKS = 8;
    private LanTelegraphedStrike() { }
    public record Pending(int targetSeat, int room, int impactTick, GhostDomain.Resolution effect) {
        public Pending {
            if(targetSeat<0||targetSeat>2||room<0||room>=HouseMap.INDOOR_ROOMS||impactTick<0)
                throw new IllegalArgumentException("invalid windup target");
            if(!Objects.requireNonNull(effect).applied()||effect.action()!=GhostDomain.Action.STRIKE||effect.room()!=room)
                throw new IllegalArgumentException("windup requires accepted strike");
        }
        public boolean due(int tick){return tick>=impactTick;}
        public boolean hits(HouseMap map,LanWorld world,LanGhostSpatial.Pose ghost,
                            int[] rooms, boolean[] connected, boolean[] spatial){
            Objects.requireNonNull(map);Objects.requireNonNull(world);Objects.requireNonNull(ghost);
            if(rooms.length!=3||connected.length!=3||spatial.length!=3)
                throw new IllegalArgumentException("three hunter seats required");
            return connected[targetSeat]&&spatial[targetSeat]&&rooms[targetSeat]==room
                    &&ghost.room()==room&&LanSpatialCombat.canStrike(map,world,ghost,targetSeat);
        }
    }
    public static Pending begin(int tick,int targetSeat,GhostDomain.Resolution effect){
        if(tick<0)throw new IllegalArgumentException("negative tick");
        return new Pending(targetSeat,effect.room(),tick+WINDUP_TICKS,effect);
    }
}
