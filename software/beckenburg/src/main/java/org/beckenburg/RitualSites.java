package org.beckenburg;
import java.util.*;
/** Three physical ritual installations already integrated into the house's authored rooms. */
public final class RitualSites {
 private RitualSites(){}
 public record Site(GhostIdentity.Rite rite,int room,String name,double x,double z){
  public boolean near(LanWorld.Body body){return body!=null&&body.room()==room&&Math.hypot(body.x()-x,body.z()-z)<=2;}
 }
 public static Site site(HouseMap map,GhostIdentity.Rite rite){
  Objects.requireNonNull(map);Objects.requireNonNull(rite);
  int room=switch(rite){case BANISHMENT->9;case CLEANSING->6;case ABSOLUTION->10;};
  String name=switch(rite){case BANISHMENT->"Sealed Iron Circle";case CLEANSING->"Purification Font";case ABSOLUTION->"Memorial Lectern";};
  return new Site(rite,room,name,map.centerX(room),map.centerZ(room));
 }
 public static List<Site> all(HouseMap map){return Arrays.stream(GhostIdentity.Rite.values()).map(x->site(map,x)).toList();}
 public static boolean valid(HouseMap map){var sites=all(map);return sites.stream().map(Site::room).distinct().count()==3
   &&sites.stream().allMatch(x->map.roomAt(x.x(),x.z())==x.room()&&map.traversable(x.x(),x.z()));}
}
