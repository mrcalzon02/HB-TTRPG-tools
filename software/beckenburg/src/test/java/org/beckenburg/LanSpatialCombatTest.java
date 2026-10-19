package org.beckenburg;

/** Host-side spectral contact rules: no room-wide damage for physically separated hunters. */
public final class LanSpatialCombatTest {
    private static void check(boolean value,String message){if(!value)throw new AssertionError(message);}
    public static void main(String[] args) {
        HouseMap map=new HouseMap();LanWorld world=new LanWorld(map);
        LanGhostSpatial pose=new LanGhostSpatial(map,4);
        world.setRoom(0,4);world.setRoom(1,4);world.setRoom(2,HouseMap.EXTRACTION_ROOM);
        int[] rooms={4,4,HouseMap.EXTRACTION_ROOM};
        boolean[] connected={true,true,true},spatial={true,true,true};
        boolean[] hit=LanSpatialCombat.victims(map,world,pose.pose(),rooms,connected,spatial);
        check(hit[0]&&!hit[1]&&!hit[2],"3D contact selects a single deterministic victim");

        for(int tick=1;tick<=9;tick++)world.move(0,100,0,tick);
        hit=LanSpatialCombat.victims(map,world,pose.pose(),rooms,connected,spatial);
        check(!hit[0]&&hit[1]&&!hit[2],"hunter outside reach is not damaged");
        world.setRoom(1,HouseMap.EXTRACTION_ROOM);rooms[1]=HouseMap.EXTRACTION_ROOM;
        hit=LanSpatialCombat.victims(map,world,pose.pose(),rooms,connected,spatial);
        check(!LanSpatialCombat.any(hit),"distant hunter cannot be hit across room");

        // Legacy room-only simulations retain their previously tested, abstract encounter rules.
        rooms[1]=4;spatial[1]=false;
        hit=LanSpatialCombat.victims(map,world,pose.pose(),rooms,connected,spatial);
        check(!hit[0]&&hit[1],"legacy room client remains targetable without coordinates");
        check(!LanSpatialCombat.lineOfSight(map,17.5,16.5,19.5,16.5),"closed door blocks spectral line of sight");
        check(map.toggleNearestDoor(17.5,16.5),"door exists at test threshold");
        check(LanSpatialCombat.lineOfSight(map,17.5,16.5,19.5,16.5),"opened door restores sight");
        check(!LanSpatialCombat.lineOfSight(map,4.5,16.5,12.5,16.5),"six meter attempt is out of range");

        LanCase mission=new LanCase(4);
        GhostDomain.Resolution strike=new GhostDomain.Resolution(true,"ok",GhostDomain.Action.STRIKE,4,45,6,12,true);
        mission.applyGhostEffect(4,new int[]{4,4,4},strike,new boolean[]{false,true,false});
        check(mission.health(0)==100&&mission.health(1)==88&&mission.health(2)==100,
                "selected victim alone receives health damage");
        check(!LanSpatialCombat.any(new boolean[3]),"empty target set detected");
        System.out.println("PASS: spatial ghost strike range, single-target damage, door LOS, legacy compatibility");
    }
}
