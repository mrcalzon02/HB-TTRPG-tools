package org.beckenburg;
import org.beckenburg.LevelDefinition.*;
/** Mission geometry acceptance: real height, walls, portal state and continuous stairs. */
public final class AuthoredLevelPhysicsTest {
 private static int failures;
 public static void main(String[] args){
  for(HouseMap.Site site:new HouseMap.Site[]{HouseMap.Site.HOUSE,HouseMap.Site.FARMHOUSE,HouseMap.Site.SCHOOL}){
   HouseMap map=new HouseMap(site);
   LanWorld world=new LanWorld(map);
   for(int seat=0;seat<6;seat++){
    var body=world.body(seat);var local=map.van().local(body.x(),body.z());
    check(body.room()==14&&Math.abs(local.x())<VanStaging.HALF_WIDTH-.22&&local.z()>VanStaging.FRONT+.22&&local.z()<VanStaging.REAR-.22,site+" van spawn pad "+seat);
   }
   for(Room r:map.level().rooms()){
    Vec p=r.spawn();check(map.roomAt(p.x(),p.y(),p.z())==r.id(),site+" spawn owner "+r.id());
    check(map.traversable(p.x(),p.y(),p.z()),site+" blocked spawn "+r.id());
   }
   for(Portal p:map.level().portals())if(p.door()&&args.length==0){
    double dx=p.alongX()?0:.6,dz=p.alongX()?.6:0;
    Vec a=new Vec(p.x()-dx,p.y(),p.z()-dz);
    check(map.resolveMove(a,p.x()+dx,p.z()+dz)==null,site+" closed door crossed "+p.id());
    map.openDoorBetweenRooms(p.a(),p.b());
    check(map.resolveMove(a,p.x()+dx,p.z()+dz)!=null,site+" open door blocked "+p.id());
   }
   for(Stair stair:map.level().stairs()){
    Vec at=new Vec(stair.x0(),stair.y0(),stair.z0());
    check(map.traversable(at.x(),at.y(),at.z()),site+" stair start "+stair.id());
    check(landing(map,at),site+" stair bottom entry/exit "+stair.id());
    for(int i=1;i<=120;i++){
     double t=i/120.0;Vec next=map.resolveMove(at,stair.x0()+(stair.x1()-stair.x0())*t,stair.z0()+(stair.z1()-stair.z0())*t);
     check(next!=null,site+" stair ascent "+stair.id()+" t="+t+" from="+at);if(next==null)break;at=next;
    }
    check(Math.abs(at.y()-stair.y1())<.02,site+" incorrect top height");
    check(landing(map,at),site+" stair top entry/exit "+stair.id());
    for(int i=119;i>=0;i--){double t=i/120.0;Vec next=map.resolveMove(at,stair.x0()+(stair.x1()-stair.x0())*t,stair.z0()+(stair.z1()-stair.z0())*t);check(next!=null,site+" stair descent "+stair.id()+" t="+t);if(next==null)break;at=next;}
   }
   // Every indoor edge away from openings is a physical wall, including overlapped exterior.
   Room r=map.level().room(1);Vec edge=new Vec(r.x0()+.35,r.y(),r.z0()+.3);
   check(map.resolveMove(edge,r.x0()-.35,edge.z())==null,site+" perimeter wall bypass");
   System.out.println(site+" XYZ geometry checked");
  }
  if(failures>0)throw new AssertionError(failures+" geometry failures");
 }
 private static boolean landing(HouseMap map,Vec end){
  java.util.ArrayDeque<Vec> queue=new java.util.ArrayDeque<>();java.util.Set<String> seen=new java.util.HashSet<>();queue.add(end);
  while(!queue.isEmpty()){
   Vec at=queue.remove();
   int room=map.roomAt(at.x(),at.y(),at.z());
   boolean onFlight=map.level().stairs().stream().anyMatch(s->s.contains(at.x(),at.z(),-.23));
   if(!onFlight&&room>=0&&Math.abs(map.floorY(room)-at.y())<.02&&Math.hypot(at.x()-end.x(),at.z()-end.z())>.65)return true;
   for(double[] d:new double[][]{{.1,0},{-.1,0},{0,.1},{0,-.1}}){
    Vec next=map.resolveMove(at,at.x()+d[0],at.z()+d[1]);if(next==null||Math.abs(next.y()-end.y())>.02||Math.hypot(next.x()-end.x(),next.z()-end.z())>1.6)continue;
    String key=Math.round((next.x()-end.x())*10)+":"+Math.round((next.z()-end.z())*10);if(seen.add(key))queue.add(next);
   }
  }
  return false;
 }
 private static void check(boolean value,String message){if(!value){failures++;System.out.println("FAIL "+message);}}
}
