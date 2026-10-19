package org.beckenburg;

import java.util.ArrayDeque;
import java.util.HashSet;
import java.util.Set;

/** Architectural acceptance: a real domestic ground floor, not a 3x5 cube grid. */
public final class VictorianHouseArchitectureTest {
    private static void ok(boolean good,String why){
        if(!good)throw new AssertionError(why);
    }
    public static void main(String[] args){
        HouseMap map=new HouseMap(HouseMap.Site.HOUSE);
        ok(map.authoredArchitecture()&&map.width()==48&&map.height()==84,
            "the residential house has a large authored Victorian footprint");
        ok(map.valid()&&RitualSites.valid(map),"all rooms and ritual markers are accessible");
        ok(map.ceilingHeight()>3,"drawing rooms have genuine Victorian ceiling volume");
        ok(map.roomName(4).equals("STAIR HALL")&&map.roomName(1).equals("DRAWING ROOM")
            &&map.roomName(11).equals("SCULLERY"),
            "rooms follow ground-floor domestic architecture, not bedrooms painted onto cubes");
        ok(!map.roomName(9).equals("STORAGE CELLAR"),"unbuilt basement is not mislabeled as a floor");
        ArchitecturalPlans.Plan plan=ArchitecturalPlans.build(HouseMap.Site.HOUSE);
        ok(plan.portals.size()==20,"twenty authored physical thresholds");
        int floors=0,windows=0;
        for(int z=0;z<map.height();z++)for(int x=0;x<map.width();x++){
            if(map.tile(x,z)=='W'){
                windows++;
                ok(map.solid(x,z)&&!map.traversable(x+.5,z+.5),
                    "glazed masonry is not a pass-through wall");
            }else if(map.tile(x,z)=='.'||map.tile(x,z)=='o')floors++;
        }
        ok(windows>=20&&floors>2000,
            "original-looking Victorian bays, domestic wings and actual interior area");
        ok(map.tile(18,30)=='D'&&map.tile(29,30)=='D'&&map.tile(23,66)=='D',
            "parlour, kitchen and entrance doors match architectural wall positions");
        ok(map.doorBetweenRooms(4,9)==null,
            "hall cannot tunnel directly through private dining into the cellar stair");
        int furniture=0;
        Set<String> distinct=new HashSet<>();
        for(int room=0;room<HouseMap.ROOM_COUNT;room++){
            ok(map.roomAt(map.centerX(room),map.centerZ(room))==room,
                "every named room is owned by real floor geometry");
            ok(map.traversable(map.centerX(room),map.centerZ(room)),
                "room centers are clear for player movement and ghost placement");
            for(InvestigationSites.Prop prop:InvestigationSites.props(map.site(),room)){
                furniture++;
                distinct.add(prop.mesh());
                ok(InvestigationSites.permittedScenery(prop.mesh())
                        &&!EquipmentModelCatalog.approved(prop.mesh()),
                    "scenery is domestic furnishings, never free investigation gear");
                double x=map.centerX(room)+prop.dx(),z=map.centerZ(room)+prop.dz();
                ok(map.roomAt(x,z)==room,"authored furniture stays in its intended room");
                ok(!map.traversable(x,z),"model occupies actual host-collidable space");
            }
        }
        ok(furniture>=40&&distinct.size()>=6,"furnished from varied licensed source GLBs");
        // Open every real threshold; a walkable, capsule-safe path must exist
        // through actual collision geometry from the van to every room.
        for(ArchitecturalPlans.Portal door:plan.portals)
            ok(map.openDoorBetweenRooms(door.a(),door.b()),"authoritative door can open");
        HouseMap replica=new HouseMap(HouseMap.Site.HOUSE);
        replica.applyDoorSnapshot(map.doorSnapshot());
        ok(replica.doorSnapshot().equals(map.doorSnapshot()),"host door state replays to peers");
        int w=map.width(),h=map.height();
        boolean[][] seen=new boolean[h][w];
        ArrayDeque<int[]> queue=new ArrayDeque<>();
        queue.add(new int[]{(int)map.van().placement().x(),(int)map.van().placement().z()});
        while(!queue.isEmpty()){
            int[] cell=queue.removeFirst();int x=cell[0],z=cell[1];
            if(x<0||z<0||x>=w||z>=h||seen[z][x]
                    ||!map.traversable(x+.5,z+.5))continue;
            seen[z][x]=true;
            queue.add(new int[]{x+1,z});queue.add(new int[]{x-1,z});
            queue.add(new int[]{x,z+1});queue.add(new int[]{x,z-1});
        }
        for(int r=0;r<HouseMap.ROOM_COUNT;r++)
            ok(seen[(int)map.centerZ(r)][(int)map.centerX(r)],
                "every physical room and exterior zone reached from van: "+map.roomName(r));
        LanWorld hunters=new LanWorld(map);
        for(int seat=0;seat<6;seat++)
            ok(map.traversable(hunters.body(seat).x(),hunters.body(seat).z()),
                "six separate hunter van spawn pads still work");
        ok(!map.ghostExits(13).contains(HouseMap.EXTRACTION_ROOM)
            &&map.ghostExits(HouseMap.EXTRACTION_ROOM).isEmpty(),
            "ghost cannot enter safe van from the front portico");
        System.out.println("PASS: Victorian architecture, room assignment, collision, portals, GLBs, van and peer synchronization");
    }
}
