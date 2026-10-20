package org.beckenburg;

/** Host-side spectral contact rules: no room-wide damage for physically separated hunters. */
public final class LanSpatialCombatTest {
    private static void check(boolean value,String message){if(!value)throw new AssertionError(message);}
    public static void main(String[] args) {
        HouseMap map=new HouseMap();LanWorld world=new LanWorld(map);
        LanGhostSpatial pose=new LanGhostSpatial(map,3);
        world.setRoom(0,3);world.setRoom(1,3);world.setRoom(2,HouseMap.EXTRACTION_ROOM);
        int[] rooms={3,3,HouseMap.EXTRACTION_ROOM};
        boolean[] connected={true,true,true},spatial={true,true,true};
        boolean[] hit=LanSpatialCombat.victims(map,world,pose.pose(),rooms,connected,spatial);
        check(hit[0]&&!hit[1]&&!hit[2],"3D contact selects a single deterministic victim");

        var origin=map.spawn(3);
        // Dressing can occupy old fixture coordinates; choose a real clear
        // position outside strike range without changing the range rule.
        LevelDefinition.Vec distant=null;var room=map.level().room(3);
        for(double x=room.x0()+.4;x<room.x1()-.3&&distant==null;x+=.2)
            for(double z=room.z0()+.4;z<room.z1()-.3;z+=.2)
                if(Math.hypot(x-origin.x(),z-origin.z())>2.4&&map.traversable(x,origin.y(),z)){
                    distant=new LevelDefinition.Vec(x,origin.y(),z);break;
                }
        check(distant!=null,"authored room needs a clear position beyond contact reach");
        AuthoredTestSupport.place(map,world,0,distant);
        hit=LanSpatialCombat.victims(map,world,pose.pose(),rooms,connected,spatial);
        check(!hit[0]&&hit[1]&&!hit[2],"hunter outside reach is not damaged");
        world.setRoom(1,HouseMap.EXTRACTION_ROOM);rooms[1]=HouseMap.EXTRACTION_ROOM;
        hit=LanSpatialCombat.victims(map,world,pose.pose(),rooms,connected,spatial);
        check(!LanSpatialCombat.any(hit),"distant hunter cannot be hit across room");

        // Legacy room-only simulations retain their previously tested, abstract encounter rules.
        rooms[1]=3;spatial[1]=false;
        hit=LanSpatialCombat.victims(map,world,pose.pose(),rooms,connected,spatial);
        check(!hit[0]&&hit[1],"legacy room client remains targetable without coordinates");
        var door=AuthoredTestSupport.door(map,3,4);var a=AuthoredTestSupport.side(map,door,3,.7);var b=AuthoredTestSupport.side(map,door,4,.7);
        check(!LanSpatialCombat.lineOfSight(map,a.x(),a.z(),b.x(),b.z()),"closed door blocks spectral line of sight");
        check(map.toggleNearestDoor(a.x(),a.y(),a.z()),"door exists at test threshold");
        check(LanSpatialCombat.lineOfSight(map,a.x(),a.z(),b.x(),b.z()),"opened door restores sight");
        check(!LanSpatialCombat.lineOfSight(map,a.x()-8,a.z(),b.x(),b.z()),"six meter attempt is out of range");

        LanCase mission=new LanCase(4);
        GhostDomain.Resolution strike=new GhostDomain.Resolution(true,"ok",GhostDomain.Action.STRIKE,4,45,6,12,true);
        mission.applyGhostEffect(4,new int[]{4,4,4},strike,new boolean[]{false,true,false});
        check(mission.health(0)==100&&mission.health(1)==88&&mission.health(2)==100,
                "selected victim alone receives health damage");
        check(!LanSpatialCombat.any(new boolean[3]),"empty target set detected");
        System.out.println("PASS: spatial ghost strike range, single-target damage, door LOS, legacy compatibility");
    }
}
