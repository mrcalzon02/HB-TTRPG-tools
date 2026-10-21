package org.beckenburg;
import java.util.*;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.nio.file.*;
import javax.imageio.ImageIO;
/** Visible exact triangles, aim selection and occlusion, not proximity. */
public final class InteractionFocusTest {
    static void check(boolean yes,String why){if(!yes)throw new AssertionError(why);}
    static LooseClutter.Observer aim(double x,double y,double z,double tx,double ty,double tz){return new LooseClutter.Observer(0,x,y,z,Math.atan2(tx-x,tz-z),Math.atan2(ty-y-1.62,Math.hypot(tx-x,tz-z)),true);}
    static LooseClutter.Observer find(HouseMap map,double x,double y,double z,InteractionFocus.Kind kind,String id,java.util.List<VanRackStock.Entry> stock){
        for(double radius:new double[]{.55,.85,1.15,1.45})for(int a=0;a<24;a++){
            double px=x+Math.sin(a*Math.PI/12)*radius,pz=z+Math.cos(a*Math.PI/12)*radius;
            int room=map.roomAt(x,y,z);if(room<0)continue;double floor=map.floorY(room);
            if(!map.traversable(px,floor,pz))continue;
            var observer=aim(px,floor,pz,x,y,z);var target=InteractionFocus.pick(map,observer,stock);
            if(target!=null&&target.kind()==kind&&target.id().equals(id))return observer;
        }return null;
    }
    public static void main(String[]args)throws Exception{
        for(var site:AuthoredTestSupport.SITES){
            var map=new HouseMap(site);var stock=java.util.List.<VanRackStock.Entry>of();int objects=0,switches=0,fixtures=0;
            for(var item:map.clutter().states())if(find(map,item.x(),item.y(),item.z(),InteractionFocus.Kind.CLUTTER,""+item.id(),stock)!=null)objects++;
            for(var f:map.fixtures().states())if(f.kind().mesh()!=null){var b=VanInteriorLayout.bounds(f.kind().mesh());if(find(map,f.x(),f.y()+(b.y0()+b.y1())/2,f.z(),InteractionFocus.Kind.FIXTURE,""+f.id(),stock)!=null)fixtures++;}
            for(var socket:map.level().sockets())if(socket.type().equals("switch")&&find(map,socket.x(),socket.y(),socket.z(),InteractionFocus.Kind.SWITCH,""+socket.room(),stock)!=null)switches++;
            int doors=0,windows=0;
            for(var portal:map.level().portals()){
                if(portal.door()&&find(map,portal.x(),portal.y()+1.15,portal.z(),InteractionFocus.Kind.DOOR,""+portal.id(),stock)!=null)doors++;
                if(portal.kind().equals("window")&&find(map,portal.x(),portal.y()+1.675,portal.z(),InteractionFocus.Kind.WINDOW,""+portal.id(),stock)!=null)windows++;
            }
            check(doors>=3,"cannot point at door leaves "+site+" "+doors);check(windows>=2,"cannot point at window frames "+site+" "+windows);
            System.out.println("PASS "+site+" exact door/window meshes: "+doors+" doors, "+windows+" windows");
            check(objects>=4,"cannot point at visible clutter "+site+" "+objects);check(switches>=3,"cannot point at switches "+site+" "+switches);check(fixtures>=3,"cannot point at event fixtures "+site+" "+fixtures);
            var loose=map.clutter().states().stream().filter(o->find(map,o.x(),o.y(),o.z(),InteractionFocus.Kind.CLUTTER,""+o.id(),stock)!=null).findFirst().orElseThrow();
            var o=find(map,loose.x(),loose.y(),loose.z(),InteractionFocus.Kind.CLUTTER,""+loose.id(),stock);
            var away=new LooseClutter.Observer(0,o.x(),o.y(),o.z(),o.yaw()+Math.PI,o.pitch(),true);
            var target=InteractionFocus.pick(map,away,stock);check(target==null||!target.id().equals(""+loose.id())||target.kind()!=InteractionFocus.Kind.CLUTTER,"nearby object selected behind player");
            check(InteractionFocus.pick(map,new LooseClutter.Observer(0,o.x(),o.y(),o.z(),o.yaw(),o.pitch(),false),stock)==null,"hidden body can interact");
            System.out.println("PASS "+site+" exact visible meshes: "+objects+" clutter, "+fixtures+" fixtures, "+switches+" switches");
        }
        var map=new HouseMap();var stock=java.util.List.of(new VanRackStock.Entry("FLASHLIGHT",EquipmentTiers.Tier.I,3));int visible=0;
        for(var unit:VanRackStock.place(stock)){var p=map.van().world(unit.x(),unit.z());if(find(map,p.x(),unit.y(),p.z(),InteractionFocus.Kind.RACK,"FLASHLIGHT:I:"+unit.unit(),stock)!=null)visible++;}
        check(visible>0,"rack physical mesh must be selectable");
        System.out.println("PASS rack units individually targeted");
        Path out=Path.of("development/levels/previews/ui");Files.createDirectories(out);
        String[] kinds={"EMF","THERMOMETER","SPIRIT_BOX","SOUND_RECORDER","FLASHLIGHT","PHOTO_CAMERA","VIDEO_CAMERA","BAROMETRIC_PROBE"};
        var sheet=new BufferedImage(4*300,6*300,BufferedImage.TYPE_INT_RGB);var g=sheet.createGraphics();g.setColor(new Color(24,29,32));g.fillRect(0,0,sheet.getWidth(),sheet.getHeight());
        int i=0;for(String kind:kinds)for(var tier:EquipmentTiers.Tier.values()){
            var base=HeldInstrumentMesh.image(kind,tier);String reading=kind.equals("SOUND_RECORDER")?"REC 4.2s / PEAK 6":kind.equals("THERMOMETER")?"Air 14.2 C / 57.6 F":kind.equals("BAROMETRIC_PROBE")?"1004 hPa / -3 hPa":kind.equals("EMF")?"EMF 4/10":"READY";
            var live=HeldInstrumentMesh.image(kind,tier,reading);int x=(i%4)*300,y=(i/4)*300;g.drawImage(live,x+30,y+26,null);g.setColor(Color.WHITE);g.drawString(kind+" "+tier,x+10,y+17);i++;
        }
        g.dispose();ImageIO.write(sheet,"PNG",out.resolve("held-device-faces.png").toFile());
    }
}
