package org.beckenburg;
import java.awt.*;
import java.util.*;
/** Authored site plan; floor paging never reveals ghost or concealed players. */
public final class SiteMapView {
 private SiteMapView(){}
 public static double[] floors(HouseMap map){return map.level().rooms().stream().filter(r->!r.outside()&&r.id()!=HouseMap.EXTRACTION_ROOM).mapToDouble(LevelDefinition.Room::y).distinct().sorted().toArray();}
 public static void draw(Graphics2D graphics,int width,int height,HouseMap map,int page,double px,double py,double pz){
  Graphics2D g=(Graphics2D)graphics.create();try{
   double[] floors=floors(map);double floor=floors[Math.floorMod(page,floors.length)];
   var rooms=map.level().rooms().stream().filter(r->!r.outside()&&r.id()!=HouseMap.EXTRACTION_ROOM&&Math.abs(r.y()-floor)<.1).toList();
   double x0=rooms.stream().mapToDouble(LevelDefinition.Room::x0).min().orElse(0),x1=rooms.stream().mapToDouble(LevelDefinition.Room::x1).max().orElse(1),z0=rooms.stream().mapToDouble(LevelDefinition.Room::z0).min().orElse(0),z1=rooms.stream().mapToDouble(LevelDefinition.Room::z1).max().orElse(1);
   int left=30,top=120;double scale=Math.min((width-90)/(x1-x0),(height-190)/(z1-z0));scale=Math.max(1,scale);
   g.setColor(new Color(10,17,23,248));g.fillRoundRect(16,85,width-32,height-110,12,12);g.setFont(new Font(Font.MONOSPACED,Font.BOLD,14));g.setColor(new Color(228,209,166));
   g.drawString(map.site()+" SITE MAP / "+(floor<-.1?"CELLAR":floor<.1?"GROUND":"UPPER "+floor+"m")+" / PAGE UP-DOWN / ESC CLOSE",left,108);
   g.setFont(new Font(Font.SANS_SERIF,Font.PLAIN,11));
   for(var r:rooms){int x=left+(int)((r.x0()-x0)*scale),z=top+(int)((r.z0()-z0)*scale),w=(int)((r.x1()-r.x0())*scale),h=(int)((r.z1()-r.z0())*scale);g.setColor(new Color(47,59,61));g.fillRect(x,z,w,h);g.setColor(new Color(184,181,155));g.drawRect(x,z,w,h);String name=r.name();while(name.length()>2&&g.getFontMetrics().stringWidth(name)>w-6)name=name.substring(0,name.length()-1);g.drawString(name,x+3,z+14);}
   for(var p:map.level().portals())if(Math.abs(p.y()-floor)<.1){int x=left+(int)((p.x()-x0)*scale),z=top+(int)((p.z()-z0)*scale),half=Math.max(2,(int)(p.width()*scale/2));g.setColor(p.kind().equals("window")?new Color(117,181,205):p.door()&&!map.doorOpen(p.id())?new Color(189,133,84):new Color(142,193,145));if(p.alongX())g.fillRect(x-half,z-2,2*half,4);else g.fillRect(x-2,z-half,4,2*half);}
   if(Math.abs(py-floor)<.2){g.setColor(new Color(241,210,117));g.fillOval(left+(int)((px-x0)*scale)-4,top+(int)((pz-z0)*scale)-4,8,8);}
  }finally{g.dispose();}
 }
}
