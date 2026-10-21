package org.beckenburg;
import java.awt.*;import java.awt.image.BufferedImage;import java.nio.file.*;import java.util.*;import java.util.List;import javax.imageio.ImageIO;
/** Review actual game camera, exact interaction target and real held display. */
public final class InteractionUiCapture {
 static final Path OUT=Path.of("development/levels/previews/ui");
 static void capture(HouseMap map,LooseClutter.Observer o,List<VanRackStock.Entry> stock,String name,String device,String reading)throws Exception{
  var scene=new SceneRenderer();scene.setRenderSize(960,600);scene.setPsxPreset(PsxPipeline.Preset.OFF);scene.roomLights=new RoomLighting();scene.environmentLight=1;scene.lamp=true;scene.rackInventory=stock;
  scene.x=o.x();scene.z=o.z();scene.eyeHeight=o.y()+1.62;scene.yaw=o.yaw();scene.pitch=o.pitch();scene.drawNetwork(map,List.of(),-1,0);
  var out=new BufferedImage(960,600,BufferedImage.TYPE_INT_RGB);var g=out.createGraphics();g.drawImage(scene.image(),0,0,null);HeldToolView.draw(g,960,600,device,1,false,true,reading,EquipmentTiers.Tier.III);g.setColor(new Color(230,220,190));g.drawLine(477,300,483,300);g.drawLine(480,297,480,303);InteractionFocus.draw(g,960,600,InteractionFocus.pick(map,o,stock));g.dispose();ImageIO.write(out,"PNG",OUT.resolve(name+".png").toFile());
 }
 public static void main(String[]args)throws Exception{
  LevelVisualCapture.inspection();Files.createDirectories(OUT);var map=new HouseMap();var empty=List.<VanRackStock.Entry>of();
  for(var item:map.clutter().states())if(item.kind()==LooseClutter.Kind.MUG){var o=InteractionFocusTest.find(map,item.x(),item.y(),item.z(),InteractionFocus.Kind.CLUTTER,""+item.id(),empty);if(o!=null){capture(map,o,empty,"01-point-at-cup","THERMOMETER","Air 14.2 C / 57.6 F");break;}}
  for(var f:map.fixtures().states())if(f.kind().mesh()!=null){var b=VanInteriorLayout.bounds(f.kind().mesh());var o=InteractionFocusTest.find(map,f.x(),f.y()+(b.y0()+b.y1())/2,f.z(),InteractionFocus.Kind.FIXTURE,""+f.id(),empty);if(o!=null){capture(map,o,empty,"02-point-at-event-device","SOUND_RECORDER","REC 4.2s / PEAK 6");break;}}
  var stock=List.of(new VanRackStock.Entry("FLASHLIGHT",EquipmentTiers.Tier.I,3),new VanRackStock.Entry("VIDEO_CAMERA",EquipmentTiers.Tier.III,1));
  for(var unit:VanRackStock.place(stock)){var p=map.van().world(unit.x(),unit.z());var o=InteractionFocusTest.find(map,p.x(),unit.y(),p.z(),InteractionFocus.Kind.RACK,unit.entry().id()+":"+unit.entry().tier()+":"+unit.unit(),stock);if(o!=null){capture(map,o,stock,"03-point-at-stock","EMF","EMF 4/10");break;}}
  var out=new BufferedImage(960,600,BufferedImage.TYPE_INT_RGB);var g=out.createGraphics();SiteMapView.draw(g,960,600,map,0,map.van().placement().x(),VanStaging.FLOOR_Y,map.van().placement().z());g.dispose();ImageIO.write(out,"PNG",OUT.resolve("04-site-map.png").toFile());
 }
}
