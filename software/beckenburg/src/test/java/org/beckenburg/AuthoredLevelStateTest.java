package org.beckenburg;
import org.beckenburg.LevelDefinition.*;
/** Stateful portals must synchronize, preserve wall/sill collision and respect vertical reach. */
public final class AuthoredLevelStateTest {
 public static void main(String[] args){
  for(HouseMap.Site site:new HouseMap.Site[]{HouseMap.Site.HOUSE,HouseMap.Site.FARMHOUSE,HouseMap.Site.SCHOOL}){
   HouseMap map=new HouseMap(site),peer=new HouseMap(site);
   for(Portal portal:map.level().portals())if(portal.door()){
    double dx=portal.alongX()?0:.45,dz=portal.alongX()?.45:0;
    check(!map.clearLineOfSight(portal.x()-dx,portal.y()+1.3,portal.z()-dz,portal.x()+dx,portal.y()+1.3,portal.z()+dz),"closed door sight "+site+"/"+portal.id());
    map.openDoorBetweenRooms(portal.a(),portal.b());
   }
   peer.applyDoorSnapshot(map.doorSnapshot());for(Portal p:map.level().portals())if(p.door())check(peer.doorOpen(p.id()),"door snapshot");
   for(Portal p:map.level().portals())if(p.kind().equals("window")){
    check(!map.toggleNearestWindow(p.x(),p.y()+1.5,p.z()),"window reachable across storey");
    check(map.toggleNearestWindow(p.x(),p.y(),p.z())&&map.windowOpen(p.id()),"physical window open");
    peer.applyWindowSnapshot(map.windowSnapshot());check(peer.windowOpen(p.id()),"window snapshot");
    double dx=p.alongX()?0:.6,dz=p.alongX()?.6:0;
    check(map.resolveMove(new Vec(p.x()-dx,p.y(),p.z()-dz),p.x()+dx,p.z()+dz)==null,"window sill must stop body");
    check(map.toggleNearestWindow(p.x(),p.y(),p.z())&&!map.windowOpen(p.id()),"physical window close");
   }
   Vec from=map.spawn(1),same=map.resolveMove(from,from.x(),from.z());
   check(same!=null&&Math.abs(same.y()-from.y())<.001,"overlapping upper deck changed feet height");
   check(!map.clearLineOfSight(from.x(),from.y()+1.3,from.z(),from.x(),from.y()+4.3,from.z()),"floor slab allowed vertical sight");
   System.out.println("PASS "+site+": door/window state, XYZ reach, intact sills, slab occlusion and synchronized reconstruction");
  }
 }
 static void check(boolean value,String why){if(!value)throw new AssertionError(why);}
}
