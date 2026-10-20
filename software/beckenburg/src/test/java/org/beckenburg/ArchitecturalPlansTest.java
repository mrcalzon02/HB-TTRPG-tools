package org.beckenburg;
import java.util.*;
/** Authored topology drives collision, ownership, door acoustics and peer state. */
public final class ArchitecturalPlansTest {
 public static void main(String[] args){
  for(var site:AuthoredTestSupport.SITES){
   HouseMap map=new HouseMap(site);AuthoredTestSupport.check(map.authoredArchitecture()&&map.valid()&&RitualSites.valid(map),"complete authored geometry "+site);
   Set<Integer> seen=new HashSet<>();ArrayDeque<Integer> pending=new ArrayDeque<>();pending.add(14);
   while(!pending.isEmpty()){int room=pending.remove();if(seen.add(room))pending.addAll(map.adjacentRooms(room));}
   AuthoredTestSupport.check(seen.size()==15,"all room/outdoor graph nodes connected");
   AuthoredTestSupport.check(map.ghostExits(14).isEmpty(),"ghost-safe van");
   for(int room=0;room<14;room++)AuthoredTestSupport.check(!map.ghostExits(room).contains(14),"no ghost edge into van");
   int doors=0,windows=0;
   for(var p:map.level().portals()){
    if(p.kind().equals("window")){windows++;AuthoredTestSupport.check(!map.adjacentRooms(p.a()).contains(p.b())||map.level().portals().stream().anyMatch(q->q.joins(p.a(),p.b())&&!q.kind().equals("window")),"glazing alone is not a walk edge");}
    if(!p.door())continue;doors++;
    var a=AuthoredTestSupport.side(map,p,p.a(),.6);var b=AuthoredTestSupport.side(map,p,p.b(),.6);
    AuthoredTestSupport.check(map.resolveMove(a,b.x(),b.z())==null,"closed door collision "+p.id());
    int closed=LanAcoustics.physicalEdgeCost(map,p.a(),p.b());map.openDoorBetweenRooms(p.a(),p.b());
    AuthoredTestSupport.check(map.resolveMove(a,b.x(),b.z())!=null,"open door traversal "+p.id());
    AuthoredTestSupport.check(LanAcoustics.physicalEdgeCost(map,p.a(),p.b())<=closed-2,"real door changes acoustic loss "+p.id());
   }
   AuthoredTestSupport.check(doors>=10&&windows>=4,"authored doors and glazed apertures");
   HouseMap peer=new HouseMap(site);peer.applyDoorSnapshot(map.doorSnapshot());AuthoredTestSupport.check(peer.doorSnapshot().equals(map.doorSnapshot()),"shared physical portal state");
   AuthoredTestSupport.check(!map.traversable(.5,0,.5),"outside map support rejected");
  }
  System.out.println("PASS authored rooms, real threshold collision/acoustics, glazing exclusion and peer replay");
 }
}
