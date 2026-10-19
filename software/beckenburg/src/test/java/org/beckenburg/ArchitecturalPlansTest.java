package org.beckenburg;

import java.util.HashSet;
import java.util.Set;

/** Floorplans must affect collision, room ownership, door acoustics and traversal. */
public final class ArchitecturalPlansTest {
    private static void ok(boolean pass,String reason){
        if(!pass)throw new AssertionError(reason);
    }
    public static void main(String[] args){
        HouseMap old=new HouseMap();
        ok(old.width()==25&&old.height()==31&&old.valid(),
            "original residential level preserved");
        for(HouseMap.Site site:new HouseMap.Site[]{
                HouseMap.Site.FARMHOUSE,HouseMap.Site.SCHOOL}){
            HouseMap map=new HouseMap(site);
            ArchitecturalPlans.Plan plan=ArchitecturalPlans.build(site);
            ok(map.authoredArchitecture()&&map.valid()&&RitualSites.valid(map),
                "authored rooms and ritual sockets load "+site);
            ok(map.width()==plan.width&&map.height()==plan.height,
                "render and host share actual level bounds");
            int floorCells=0,wallCells=0,windows=0;
            for(int z=1;z<map.height()-1;z++)for(int x=1;x<map.width()-1;x++){
                char material=map.tile(x,z);
                if(material=='#'||material=='W')wallCells++;else floorCells++;
                if(material=='W'){
                    windows++;
                    ok(map.solid(x,z)&&!map.traversable(x+.5,z+.5),
                        "real window panel is solid for human movement");
                }
            }
            ok(floorCells>(site==HouseMap.Site.SCHOOL?3500:2300),
                "large building contains extensive interior, service and exterior space");
            ok(wallCells>600,"building has actual partitions and articulated boundaries");
            ok(windows>(site==HouseMap.Site.SCHOOL?35:12),
                "exterior walls have substantial authored glazed openings");
            for(int room=0;room<HouseMap.ROOM_COUNT;room++){
                ok(map.roomAt(map.centerX(room),map.centerZ(room))==room,
                    "each room has physical geometry and a named center");
                ok(map.traversable(map.centerX(room),map.centerZ(room)),
                    "no architectural dead-end or furnishing obstructs center");
            }
            ok(!map.ghostExits(14).iterator().hasNext(),"van is ghost-free");
            for(int room=0;room<14;room++)
                ok(!map.ghostExits(room).contains(14),
                    "no unauthorized ghost edge into safe van");
            Set<Integer> reachable=new HashSet<>();
            java.util.ArrayDeque<Integer> queue=new java.util.ArrayDeque<>();
            reachable.add(14);queue.add(14);
            while(!queue.isEmpty())for(int neighbor:map.adjacentRooms(queue.removeFirst()))
                if(reachable.add(neighbor))queue.addLast(neighbor);
            ok(reachable.size()==HouseMap.ROOM_COUNT,
                "actual authored room and outdoor graph is entirely connected");
            for(ArchitecturalPlans.Portal door:plan.portals){
                ok(map.tile(door.x(),door.z())=='D',"door is a physical threshold");
                int[] socket=map.doorBetweenRooms(door.a(),door.b());
                ok(socket!=null&&socket[0]==door.x()&&socket[1]==door.z(),
                    "acoustic system and ghost movement use same physical doorway");
                ok(map.adjacentRooms(door.a()).contains(door.b()),
                    "door connects the two authored rooms");
            }
            int before=LanAcoustics.edgeCost(map,4,site==HouseMap.Site.FARMHOUSE?1:3);
            int[] socket=map.doorBetweenRooms(4,site==HouseMap.Site.FARMHOUSE?1:3);
            ok(before==3&&socket!=null,"closed architectural door muffles sound");
            ok(map.openDoorBetweenRooms(4,site==HouseMap.Site.FARMHOUSE?1:3),
                "ghost may open a real doorway");
            ok(LanAcoustics.edgeCost(map,4,site==HouseMap.Site.FARMHOUSE?1:3)==1,
                "open architectural door transmits sound");
            HouseMap other=new HouseMap(site);
            other.applyDoorSnapshot(map.doorSnapshot());
            ok(other.doorOpen(socket[0],socket[1]),
                "door state replays at correct authored coordinates");
            ok(!map.traversable(.5,.5),"outside building bounds remain solid");
            ok(InvestigationSites.props(site,4).stream().noneMatch(p->
                    EquipmentModelCatalog.approved(p.mesh())),
                "no free investigative equipment inserted into architectural geometry");
        }
        System.out.println("PASS: authored non-grid rooms, physical doors, host collision, acoustics and LAN replay");
    }
}
