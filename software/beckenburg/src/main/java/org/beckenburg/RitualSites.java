package org.beckenburg;
import java.util.*;
/** Authored, accessible ritual sockets shared by the host and rendered installation. */
public final class RitualSites {
 private RitualSites(){}
 public record Site(GhostIdentity.Rite rite,int room,String name,double x,double y,double z){
  public Site(GhostIdentity.Rite rite,int room,String name,double x,double z){this(rite,room,name,x,0,z);}
  public boolean near(LanWorld.Body body){return body!=null&&body.room()==room&&Math.abs(body.y()-y)<.5&&Math.hypot(body.x()-x,body.z()-z)<=2;}
 }
 public static Site site(HouseMap map,GhostIdentity.Rite rite){
  Objects.requireNonNull(map);Objects.requireNonNull(rite);
  String style=rite.name().toLowerCase(Locale.ROOT);
  var socket=map.level().sockets().stream().filter(s->s.type().equals("ritual")&&s.style().equals(style)).findFirst()
      .orElseThrow(()->new IllegalStateException("missing authored ritual "+style));
  String name=switch(rite){case BANISHMENT->"Sealed Iron Circle";case CLEANSING->"Purification Font";case ABSOLUTION->"Memorial Lectern";};
  return new Site(rite,socket.room(),name,socket.x(),socket.y(),socket.z());
 }
 public static List<Site> all(HouseMap map){return Arrays.stream(GhostIdentity.Rite.values()).map(x->site(map,x)).toList();}
 public static boolean valid(HouseMap map){var sites=all(map);return sites.stream().map(Site::room).distinct().count()==3
   &&sites.stream().allMatch(x->map.roomAt(x.x(),x.y(),x.z())==x.room()&&map.traversable(x.x(),x.y(),x.z()));}
}
