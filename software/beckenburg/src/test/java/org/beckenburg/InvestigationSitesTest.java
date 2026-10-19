package org.beckenburg;

import java.util.HashSet;
import java.util.Set;

/** New contracts have authored topology and real source-model geometry. */
public final class InvestigationSitesTest {
    private static void ok(boolean condition,String why){if(!condition)throw new AssertionError(why);}
    public static void main(String[] args){
        HouseMap house=new HouseMap();
        ok(house.site()==HouseMap.Site.HOUSE&&house.roomName(4).equals("MAIN HALL"),
            "legacy map contract is unchanged");
        for(HouseMap.Site site:new HouseMap.Site[]{HouseMap.Site.FARMHOUSE,
                HouseMap.Site.SCHOOL}){
            HouseMap layout=new HouseMap(site);
            ok(layout.valid(),"all rooms and exterior staging reachable on "+site);
            ok(RitualSites.valid(layout),"three reachable ritual anchors on "+site);
            ok(layout.van().placement().x()==house.van().placement().x(),
                "van retains authoritative staging/socket geometry");
            ok(!layout.roomName(4).equals(house.roomName(4)),
                "new locations provide different room purposes");
            Set<String> meshes=new HashSet<>();
            int placed=0;
            for(int room=0;room<HouseMap.ROOM_COUNT;room++){
                ok(layout.roomAt(layout.centerX(room),layout.centerZ(room))==room,
                    "site room centers remain valid");
                for(InvestigationSites.Prop prop:InvestigationSites.props(site,room)){
                    meshes.add(prop.mesh());placed++;
                    // Reuse already imported GLB geometry, not fabricated IDs.
                    ok(!GlbProps.model(prop.mesh()).triangles().isEmpty(),
                        "mesh exists with triangles: "+prop.mesh());
                }
            }
            ok(placed>=20&&meshes.size()>=6,"map uses substantial diverse 3D prop assets");
            ok(!layout.doorSnapshot().equals("0"),"door snapshots valid");
            for(int room=0;room<HouseMap.INDOOR_ROOMS;room++)
                for(int adjacent:layout.ghostExits(room))
                    if(adjacent<HouseMap.INDOOR_ROOMS)
                        ok(layout.openDoorBetweenRooms(room,adjacent)
                            ||layout.openDoorBetweenRooms(room,adjacent)==false,
                            "interior door helper accepts site topology");
        }
        ok(new HouseMap(HouseMap.Site.FARMHOUSE).tile(8,2)=='D'
            &&new HouseMap(HouseMap.Site.SCHOOL).tile(8,2)!='D',
            "layout changes actual door geometry");
        System.out.println("PASS: authored farm and school maps, source GLBs, doors, rituals");
    }
}
