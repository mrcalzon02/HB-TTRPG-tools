package org.beckenburg;
import java.util.*;
/** Compact domestic concept: 12m by 14m, three actual storeys and source furnishings. */
public final class VictorianHouseArchitectureTest {
 public static void main(String[] args){
  HouseMap map=new HouseMap();var rooms=map.level().rooms().stream().filter(r->!r.outside()).toList();
  double x0=rooms.stream().mapToDouble(LevelDefinition.Room::x0).min().orElseThrow(),x1=rooms.stream().mapToDouble(LevelDefinition.Room::x1).max().orElseThrow();
  double z0=rooms.stream().mapToDouble(LevelDefinition.Room::z0).min().orElseThrow(),z1=rooms.stream().mapToDouble(LevelDefinition.Room::z1).max().orElseThrow();
  AuthoredTestSupport.check(x1-x0==12&&z1-z0==14,"approved compact house footprint");
  AuthoredTestSupport.check(rooms.stream().map(LevelDefinition.Room::y).collect(java.util.stream.Collectors.toSet()).equals(Set.of(-3.0,0.0,3.0)),"true basement/ground/upper decks");
  AuthoredTestSupport.check(map.roomName(2).toLowerCase().contains("kitchen")&&map.roomName(6).toLowerCase().contains("master")&&map.roomName(10).toLowerCase().contains("boiler"),"domestic and service room purposes");
  AuthoredTestSupport.check(map.level().stairs().size()==2&&map.level().voids().size()>=2,"two continuous flights with deck openings");
  AuthoredTestSupport.check(map.level().props().size()>=35,"substantial original source furnishings");
  for(var r:rooms){var p=r.spawn();AuthoredTestSupport.check(map.roomAt(p.x(),p.y(),p.z())==r.id()&&map.traversable(p.x(),p.y(),p.z()),"owned clear room spawn "+r.name());}
  for(var p:map.level().portals())if(p.door())map.openDoorBetweenRooms(p.a(),p.b());
  HouseMap peer=new HouseMap();peer.applyDoorSnapshot(map.doorSnapshot());AuthoredTestSupport.check(peer.doorSnapshot().equals(map.doorSnapshot()),"door synchronization");
  AuthoredTestSupport.check(map.valid()&&RitualSites.valid(map),"room and ritual validity");
  // Swept capsule flood is the physical reachability gate, including stairs and furniture.
  AuthoredLevelReachabilityTest.main(new String[]{"HOUSE"});
  System.out.println("PASS compact concept house, three storeys, source furnishings, swept van routes and peer doors");
 }
}
