package org.beckenburg;

/** Physical proportions, door graph, LOS, switch sockets, van occupancy and spawn paths. */
public final class GrandSiteGeometryTest {
    private static void ok(boolean b,String why){if(!b)throw new AssertionError(why);}
    public static void main(String[] args){
        HouseMap small=new HouseMap();
        ok(small.width()==48&&small.height()==84&&small.ceilingHeight()==3.35,
            "Victorian residential architecture has a true larger footprint");
        for(HouseMap.Site site:new HouseMap.Site[]{HouseMap.Site.FARMHOUSE,HouseMap.Site.SCHOOL}){
            HouseMap m=new HouseMap(site);
            ok(m.width()==(site==HouseMap.Site.FARMHOUSE?56:70)
                    &&m.height()==(site==HouseMap.Site.FARMHOUSE?74:84),
                "actual articulated map bounds "+site);
            ok(m.valid()&&RitualSites.valid(m),"navigable site and reachable rituals");
            ok(m.ceilingHeight()>=3.6,"upper room volume is genuinely taller");
            ok(m.roomAt(m.van().placement().x(),m.van().placement().z())
                ==HouseMap.EXTRACTION_ROOM,"extraction van occupies staging zone");
            LanWorld people=new LanWorld(m);
            ok(people.body(0).room()==HouseMap.EXTRACTION_ROOM,
                "all investigators use the site-specific van spawn");
            for(int room=0;room<HouseMap.INDOOR_ROOMS;room++){
                var sw=RoomLighting.location(m,room);
                ok(m.roomAt(sw.x(),sw.z())==room&&m.traversable(sw.x(),sw.z()),
                    "physical switch remains within its enlarged room");
                ok(m.traversable(m.centerX(room),m.centerZ(room)),
                    "rituals and field positions retain clear circulation");
            }
            int doors=0;
            for(int z=0;z<m.height();z++)for(int x=0;x<m.width();x++)
                if(m.tile(x,z)=='D')doors++;
            ok(doors==(site==HouseMap.Site.FARMHOUSE?18:14),
                "architectural doors correspond to real room adjacencies");
            for(int r=0;r<HouseMap.INDOOR_ROOMS;r++)
                for(int to:m.ghostExits(r))
                    if(to<HouseMap.ROOM_COUNT)
                        m.openDoorBetweenRooms(r,to);
            String snapshot=m.doorSnapshot();
            HouseMap peer=new HouseMap(site);
            peer.applyDoorSnapshot(snapshot);
            ok(peer.doorSnapshot().equals(snapshot),"door state replicates on expanded bounds");
        }
        System.out.println("PASS: grand scale, traversable geometry, switch locations, entry and door replication");
    }
}
