package org.beckenburg;
/** Real status pixels remain on original surfaces; poses are rigid and optics face forward. */
public final class HeldDeviceReadoutTest {
 static int differences(java.awt.image.BufferedImage a,java.awt.image.BufferedImage b){int n=0;for(int y=0;y<a.getHeight();y++)for(int x=0;x<a.getWidth();x++){if(a.getRGB(x,y)!=b.getRGB(x,y))n++;if((a.getRGB(x,y)>>>24)!=(b.getRGB(x,y)>>>24))throw new AssertionError("readout leaves physical silhouette");}return n;}
 static void check(boolean yes,String why){if(!yes)throw new AssertionError(why);}
 public static void main(String[]args){
  for(String kind:new String[]{"EMF","THERMOMETER","SOUND_RECORDER"})for(var tier:EquipmentTiers.Tier.values()){
   String a=kind.equals("EMF")?"EMF 1/10":kind.equals("THERMOMETER")?"Air 5.0 C / 41.0 F":"REC 1.0s / PEAK 1";
   String b=kind.equals("EMF")?"EMF 9/10":kind.equals("THERMOMETER")?"Air 28.3 C / 83.0 F":"REC 9.0s / PEAK 9";
   int changed=differences(HeldInstrumentMesh.image(kind,tier,a),HeldInstrumentMesh.image(kind,tier,b));check(changed>0,"no on-device reading change "+kind+" "+tier);
   System.out.println("PASS "+kind+" "+tier+" actual display changes "+changed+" pixels");
  }
  for(String kind:FieldEquipment.workingTools())for(var tier:EquipmentTiers.Tier.values()){
   String name=HeldInstrumentMesh.source(kind,tier);var o=HeldInstrumentMesh.pose(name,new GlbProps.Vertex(0,0,0,0,0));double[][] m=new double[3][];
   for(int i=0;i<3;i++){var v=HeldInstrumentMesh.pose(name,new GlbProps.Vertex(i==0?1:0,i==1?1:0,i==2?1:0,0,0));m[i]=new double[]{v.x()-o.x(),v.y()-o.y(),v.z()-o.z()};}
   double determinant=m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])-m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])+m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);check(Math.abs(determinant-1)<1e-9,"reflected/scaled held tool "+kind);
  }
  for(String name:new String[]{"exploration_photo_camera","blender_photo_camera_3","blender_video_camera_3","blender_flashlight_3","exploration_thermometer"})check(HeldInstrumentMesh.pose(name,new GlbProps.Vertex(0,0,1,0,0)).z()<0,"optics point at the player "+name);
  check(HeldInstrumentMesh.pose("exploration_flashlight",new GlbProps.Vertex(0,0,-1,0,0)).z()<0,"starter torch reversed");
  var map=new HouseMap();var session=new InvestigationSession(map,InvestigationSession.Role.OBSERVER,1);var p=map.spawn(3);check(session.scan(InvestigationSession.Instrument.THERMOMETER,p.x(),p.y(),p.z()),"solo scan");check(session.deviceReading("THERMOMETER").contains("Air "),"solo screen lost numeric result");
  System.out.println("PASS rigid forward poses and retained real solo measurement");
 }
}
