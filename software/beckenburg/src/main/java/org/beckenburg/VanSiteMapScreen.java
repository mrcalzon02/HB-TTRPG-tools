package org.beckenburg;

import java.awt.Color;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.Graphics2D;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/** Large, readable, floor-accurate van map. The host supplies every station and reading. */
public final class VanSiteMapScreen {
    private VanSiteMapScreen(){}
    public record Reading(int tick,String text){
        public Reading {
            if(tick<0||text==null||text.isBlank()||text.length()>150
                    ||text.indexOf('|')>=0)
                throw new IllegalArgumentException("bad sensor reading");
        }
    }
    public static List<Double> floors(HouseMap map){
        return map.level().rooms().stream().filter(r->!r.outside())
            .map(LevelDefinition.Room::y).distinct().sorted().toList();
    }
    private static String fit(FontMetrics fm,String input,int pixels){
        if(fm.stringWidth(input)<=pixels)return input;
        String text=input;
        while(!text.isEmpty()&&fm.stringWidth(text+"...")>pixels)
            text=text.substring(0,text.length()-1);
        return text+"...";
    }
    public static void draw(Graphics2D g,int width,int height,HouseMap map,
            List<VanSensorStations.Station> source,Map<Integer,Reading> readings,
            int requestedFloor,int requestedScroll,int tick){
        List<Double> levels=floors(map);
        if(levels.isEmpty())return;
        int floor=Math.floorMod(requestedFloor,levels.size());
        double elevation=levels.get(floor);
        int x=20,y=64,w=Math.max(360,width-40),h=Math.max(250,height-86);
        int sidebar=Math.min(272,Math.max(180,w/3));
        int plotLeft=x+14,plotTop=y+55,plotWidth=w-sidebar-42,plotHeight=h-75;
        g.setColor(new Color(7,14,20,248));g.fillRoundRect(x,y,w,h,10,10);
        g.setColor(new Color(153,209,188));g.drawRoundRect(x,y,w,h,10,10);
        g.setFont(new Font(Font.MONOSPACED,Font.BOLD,15));
        g.drawString("SITE MAP / LIVE SENSOR NETWORK",x+15,y+25);
        g.setFont(new Font(Font.MONOSPACED,Font.PLAIN,12));
        g.drawString("M / ESC close    PAGE / LEFT-RIGHT floor    UP-DOWN probes",x+15,y+42);
        g.setFont(new Font(Font.MONOSPACED,Font.BOLD,12));
        g.drawString("FLOOR "+(floor+1)+"/"+levels.size()+"  ("+elevation+"m)",plotLeft,plotTop+10);
        List<LevelDefinition.Room> rooms=new ArrayList<>();
        for(var r:map.level().rooms())if(!r.outside()&&Math.abs(r.y()-elevation)<.01)
            rooms.add(r);
        if(rooms.isEmpty())return;
        double minX=rooms.stream().mapToDouble(LevelDefinition.Room::x0).min().orElse(0);
        double maxX=rooms.stream().mapToDouble(LevelDefinition.Room::x1).max().orElse(1);
        double minZ=rooms.stream().mapToDouble(LevelDefinition.Room::z0).min().orElse(0);
        double maxZ=rooms.stream().mapToDouble(LevelDefinition.Room::z1).max().orElse(1);
        double scale=Math.min((plotWidth-12.0)/Math.max(1,maxX-minX),
            (plotHeight-42.0)/Math.max(1,maxZ-minZ));
        int dx=plotLeft+6+(int)Math.max(0,(plotWidth-(maxX-minX)*scale)/2);
        int dz=plotTop+24+(int)Math.max(0,(plotHeight-35-(maxZ-minZ)*scale)/2);
        g.setFont(new Font(Font.MONOSPACED,Font.PLAIN,11));
        for(var room:rooms){
            int px=dx+(int)Math.round((room.x0()-minX)*scale);
            int pz=dz+(int)Math.round((room.z0()-minZ)*scale);
            int rw=Math.max(2,(int)Math.round((room.x1()-room.x0())*scale));
            int rh=Math.max(2,(int)Math.round((room.z1()-room.z0())*scale));
            g.setColor(new Color(32,50,55));g.fillRect(px,pz,rw,rh);
            g.setColor(new Color(135,164,169));g.drawRect(px,pz,rw,rh);
            g.setColor(new Color(218,226,216));
            String name=fit(g.getFontMetrics(),room.name(),Math.max(10,rw-8));
            if(rw>35&&rh>17)g.drawString(name,px+4,pz+14);
        }
        // Show the actual authored door/window portals so this is a navigable floor
        // plan, not a box of room names. Do not infer missing architectural openings.
        for(var portal:map.level().portals()){
            if(Math.abs(portal.y()-elevation)>.15)continue;
            int px=dx+(int)Math.round((portal.x()-minX)*scale);
            int pz=dz+(int)Math.round((portal.z()-minZ)*scale);
            int half=Math.max(2,(int)Math.round(portal.width()*scale/2));
            g.setColor(portal.kind().equals("window")?new Color(107,180,224)
                :portal.door()&&!map.doorOpen(portal.id())
                ?new Color(237,166,100):new Color(153,221,160));
            if(portal.alongX())g.fillRect(px-half,pz-3,half*2,6);
            else g.fillRect(px-3,pz-half,6,half*2);
        }
        var stations=source.stream().filter(s->rooms.stream().anyMatch(r->r.id()==s.room()))
            .sorted(Comparator.comparingInt(VanSensorStations.Station::id)).toList();
        for(var s:stations){
            int px=dx+(int)Math.round((s.x()-minX)*scale);
            int py=dz+(int)Math.round((s.z()-minZ)*scale);
            boolean thermal=s.tool().equals("THERMAL_BEACON");
            g.setColor(thermal?new Color(249,180,111):new Color(122,223,182));
            g.fillOval(px-6,py-6,12,12);
            g.setColor(Color.BLACK);g.drawOval(px-6,py-6,12,12);
            g.setColor(new Color(244,244,232));
            g.drawString((thermal?"T":"E")+s.id(),px+8,py-5);
        }
        int right=plotLeft+plotWidth+12;
        g.setColor(new Color(126,168,165));g.drawLine(right-6,plotTop,right-6,y+h-15);
        g.setColor(new Color(214,225,217));g.setFont(new Font(Font.MONOSPACED,Font.BOLD,12));
        g.drawString("DEPLOYED / FLOOR "+(floor+1),right,plotTop+10);
        g.setFont(new Font(Font.MONOSPACED,Font.PLAIN,12));
        int maxRows=Math.max(1,(h-114)/46);
        int start=Math.max(0,Math.min(requestedScroll,Math.max(0,stations.size()-maxRows)));
        if(stations.isEmpty())g.drawString("No probes on this floor",right,plotTop+38);
        for(int i=start;i<Math.min(stations.size(),start+maxRows);i++){
            var s=stations.get(i);Reading reading=readings.get(s.id());
            int yy=plotTop+37+(i-start)*46;
            g.setColor(s.tool().equals("THERMAL_BEACON")
                ?new Color(248,186,116):new Color(124,224,176));
            g.drawString((s.tool().equals("THERMAL_BEACON")?"T":"E")+s.id()
                +"  "+fit(g.getFontMetrics(),map.roomName(s.room()),sidebar-70),right,yy);
            g.setColor(new Color(218,227,219));
            String value=reading==null?"Awaiting first sample"
                :tick-reading.tick()>35?"Signal stale / no recent sample":reading.text();
            g.drawString(fit(g.getFontMetrics(),value,sidebar-12),right,yy+17);
        }
        g.setColor(new Color(142,173,171));
        g.drawString(stations.size()+" node(s) on selected floor",right,y+h-16);
    }
}
