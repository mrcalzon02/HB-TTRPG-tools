package org.beckenburg;
/** The mission's selected authored site, rather than a default house, owns ritual eligibility. */
public final class AuthoredLevelRitualCaseTest {
 public static void main(String[] args){
  for(HouseMap.Site kind:new HouseMap.Site[]{HouseMap.Site.HOUSE,HouseMap.Site.FARMHOUSE,HouseMap.Site.SCHOOL}){
   HouseMap map=new HouseMap(kind);
   for(GhostIdentity.Rite rite:GhostIdentity.Rite.values()){
    GhostIdentity.Type type=java.util.Arrays.stream(GhostIdentity.Type.values()).filter(t->!t.ancient()&&t.rite()==rite).findFirst().orElseThrow();
    LanCase mission=new LanCase(4,map);mission.configure(type,true);
    check(mission.identify(0,type,1).accepted(),"correct identity");check(mission.ward(0,4).accepted(),"anchor prepared");
    RitualSites.Site site=RitualSites.site(map,rite);
    check(!mission.performRite(0,rite,(site.room()+1)%12,true).accepted(),"wrong room accepted");
    check(!mission.performRite(0,rite,site.room(),false).accepted(),"remote activation accepted");
    check(!site.near(new LanWorld.Body(site.x(),site.y()+3,site.z(),0,site.room())),"wrong storey accepted");
    check(mission.performRite(0,rite,site.room(),true).accepted(),kind+" correct authored "+rite+" denied");
   }
   System.out.println("PASS "+kind+": selected-site rituals accept correct sockets and reject wrong room/storey/proximity");
  }
 }
 static void check(boolean value,String why){if(!value)throw new AssertionError(why);}
}
