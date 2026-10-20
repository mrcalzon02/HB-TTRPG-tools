package org.beckenburg;
import java.util.*;
import org.beckenburg.LevelDefinition.*;
/** Physical navigation acceptance: flood actual swept capsule motion from the van, including ramps. */
public final class AuthoredLevelReachabilityTest {
 public static void main(String[] args){
  HouseMap.Site[] sites=args.length==0?new HouseMap.Site[]{HouseMap.Site.HOUSE,HouseMap.Site.FARMHOUSE,HouseMap.Site.SCHOOL}:new HouseMap.Site[]{HouseMap.Site.valueOf(args[0])};
  for(HouseMap.Site site:sites){
   HouseMap map=new HouseMap(site);for(Portal p:map.level().portals())if(p.door())map.openDoorBetweenRooms(p.a(),p.b());
   ArrayDeque<Vec> queue=new ArrayDeque<>();Set<String> seen=new HashSet<>();List<Vec> reachable=new ArrayList<>();
   Vec origin=map.spawn(14);queue.add(origin);seen.add(key(origin));
   while(!queue.isEmpty()){
    Vec p=queue.remove();reachable.add(p);
    for(double[] d:new double[][]{{.125,0},{-.125,0},{0,.125},{0,-.125}}){
     Vec next=map.resolveMove(p,p.x()+d[0],p.z()+d[1]);
     if(next!=null&&seen.add(key(next)))queue.add(next);
    }
    if(seen.size()>1000000)throw new AssertionError("unbounded traversal "+site);
   }
   System.out.println(site+" reached elevations "+reachable.stream().mapToDouble(Vec::y).min().orElse(0)+".."+reachable.stream().mapToDouble(Vec::y).max().orElse(0));
   int failures=0;
   for(Room room:map.level().rooms()){
    Vec goal=room.spawn();boolean reached=reachable.stream().anyMatch(p->Math.abs(p.y()-goal.y())<.2&&Math.hypot(p.x()-goal.x(),p.z()-goal.z())<.55);
    if(!reached){System.out.println("UNREACHABLE "+site+" room="+room.id()+" "+room.name());failures++;}
   }
   for(Socket socket:map.level().sockets())if(Set.of("switch","breaker","ritual","evidence","hide").contains(socket.type())){
    double floor=map.floorY(socket.room());
    boolean reached=reachable.stream().anyMatch(p->Math.abs(p.y()-floor)<.2&&map.roomAt(p.x(),p.y(),p.z())==socket.room()&&Math.hypot(p.x()-socket.x(),p.z()-socket.z())<(socket.type().equals("hide")?.8:1.45));
    if(!reached){System.out.println("UNREACHABLE SOCKET "+site+" "+socket.type()+" room="+socket.room());failures++;}
   }
   if(failures>0)throw new AssertionError(site+" "+failures+" unreachable goals, visited="+seen.size());
   System.out.println("PASS "+site+": swept van route reaches all15 zones and all functional sockets, "+seen.size()+" positions");
  }
 }
 private static String key(Vec p){return Math.round(p.x()*8)+":"+Math.round(p.y()*1000)+":"+Math.round(p.z()*8);}
}
