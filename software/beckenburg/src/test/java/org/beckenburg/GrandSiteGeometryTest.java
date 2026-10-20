package org.beckenburg;
/** Physical volumes, floor-aware sockets, van occupancy and explicit portal replay. */
public final class GrandSiteGeometryTest {
 public static void main(String[] args){
  for(var site:AuthoredTestSupport.SITES){
   HouseMap map=new HouseMap(site);AuthoredTestSupport.check(map.valid()&&RitualSites.valid(map),"valid architecture "+site);
   AuthoredTestSupport.check(map.level().rooms().stream().map(LevelDefinition.Room::y).distinct().count()>=3,"real cellar and upper decks "+site);
   LanWorld world=new LanWorld(map);for(int seat=0;seat<6;seat++){var p=world.body(seat);AuthoredTestSupport.check(p.room()==14&&map.traversable(p.x(),p.y(),p.z()),"physical van spawn "+seat);}
   for(int room=0;room<12;room++){
    var sw=RoomLighting.location(map,room);AuthoredTestSupport.check(Math.abs(sw.y()-map.floorY(room)-1.2)<.1,"switch elevation "+room);
    var p=map.spawn(room);AuthoredTestSupport.check(map.traversable(p.x(),p.y(),p.z()),"clear circulation "+room);
   }
   int count=0;for(var p:map.level().portals())if(p.door()){AuthoredTestSupport.check(map.openDoorBetweenRooms(p.a(),p.b()),"real door opens "+p.id());count++;}
   AuthoredTestSupport.check(count>=10,"substantial authored door network");
   HouseMap peer=new HouseMap(site);peer.applyDoorSnapshot(map.doorSnapshot());
   for(var p:map.level().portals())if(p.door())AuthoredTestSupport.check(peer.doorOpen(p.id()),"stable portal ID replay "+p.id());
  }
  System.out.println("PASS measured multilevel volumes, floor-aware sockets, six van bodies and portal-ID replication");
 }
}
