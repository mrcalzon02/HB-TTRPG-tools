package org.beckenburg;
import java.util.*;
/** Production sites use authored source furnishings without placing free investigation gear. */
public final class InvestigationSitesTest {
 public static void main(String[] args){
  for(String tool:new String[]{"exploration_emf_detector","exploration_flashlight","exploration_thermometer","exploration_photo_camera","blender_incense_1","blender_laser_grid_1","book_mp_1","cross_mp_2"}){
   AuthoredTestSupport.check(!InvestigationSites.permittedScenery(tool),"equipment is not scenery: "+tool);
   try{new InvestigationSites.Prop(3,tool,0,0,0,1,0);throw new AssertionError("equipment placement accepted");}catch(IllegalArgumentException expected){}
  }
  AuthoredTestSupport.check(new SceneRenderer().rackStock.isEmpty(),"no nonexistent van stock");
  Set<String> revisions=new HashSet<>();
  for(var site:AuthoredTestSupport.SITES){
   HouseMap map=new HouseMap(site);AuthoredTestSupport.check(map.valid()&&RitualSites.valid(map),"valid site and ritual sockets "+site);
   Set<String> meshes=new HashSet<>();
   for(var prop:map.level().props()){
    AuthoredTestSupport.check(!EquipmentModelCatalog.approved(prop.mesh()),"no free equipment in scenery "+prop.mesh());
    AuthoredTestSupport.check(!GlbProps.model(prop.mesh()).triangles().isEmpty(),"source mesh geometry "+prop.mesh());meshes.add(prop.mesh());
   }
   AuthoredTestSupport.check(map.level().props().size()>=20&&meshes.size()>=6,"diverse source furnishings "+site);
   for(var room:map.level().rooms()){var p=room.spawn();AuthoredTestSupport.check(map.roomAt(p.x(),p.y(),p.z())==room.id()&&map.traversable(p.x(),p.y(),p.z()),"clear owned spawn "+site+"/"+room.name());}
   var van=map.level().dock();AuthoredTestSupport.check(map.roomAt(van.x(),van.y(),van.z())==14,"site-specific extraction dock");
   AuthoredTestSupport.check(revisions.add(map.level().revision()),"distinct authored locations");
  }
  System.out.println("PASS production house/farm/school source furnishings, gear exclusion, owned spawns and ritual sockets");
 }
}
