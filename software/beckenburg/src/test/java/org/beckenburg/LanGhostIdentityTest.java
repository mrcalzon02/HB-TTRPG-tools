package org.beckenburg;
import java.util.*;
/** Ghost behaviors, raw tool measurements and ritual sites without an auto-confirmation gate. */
public final class LanGhostIdentityTest {
 static void ok(boolean v,String why){if(!v)throw new AssertionError(why);}
 public static void main(String[] args){
  var map=new HouseMap();ok(RitualSites.valid(map),"all 3 ritual sites reachable");
  ok(GhostIdentity.Type.values().length==23,"13 originals and 10 Ancient variants");
  Set<GhostIdentity.Behavior> behaviors=new HashSet<>();
  Set<GhostIdentity.Rite> rites=EnumSet.noneOf(GhostIdentity.Rite.class);
  for(var type:GhostIdentity.Type.values()){
   if(!type.ancient())ok(behaviors.add(type.behavior()),"distinct original behavior "+type);
   else ok(type.behavior()==type.baseType().behavior(),
       "Ancient behavior must match its parent "+type);
   rites.add(type.rite());
   // Ghost identity and ritual readiness are investigator choices, not scan quotas.
   var unaided=new LanCase(4);unaided.configure(type,true);
   ok(unaided.identify(0,type,1).accepted(),"deduction needs no confirmation counter "+type);
   ok(unaided.ward(0,4).accepted(),"physical ward still required "+type);
   var unaidedSite=RitualSites.site(map,type.rite());
   ok(unaided.performRite(0,type.rite(),unaidedSite.room(),true).accepted(),
        "ritual does not require auto-awarded readings "+type);
   var mission=new LanCase(4);mission.configure(type,true);
   for(var tool:LanCase.Tool.values()){
    ok(mission.scan(0,tool,3,0).message().startsWith("READING "),"ordinary room reading");
    ok(mission.scan(0,tool,4,0).message().startsWith("READING "),"sample recorded "+type+" "+tool);
   }
   ok(mission.evidenceCount()==0&&mission.testedCount()==0,"measurements never automatically award evidence");
   ok(!mission.cleanse(0,4).accepted(),"identify first "+type);
   var wrong=type==GhostIdentity.Type.SPIRIT?GhostIdentity.Type.WRAITH:GhostIdentity.Type.SPIRIT;
   ok(!mission.identify(0,wrong,1).accepted(),"wrong guess");
   ok(!mission.identify(0,type,2).accepted(),"no guessing spam");
   ok(mission.identify(1,type,31).accepted(),"correct deduction");
   ok(mission.ward(0,4).accepted(),"anchor ward");
   var site=RitualSites.site(map,type.rite());
   var other=type.rite()==GhostIdentity.Rite.BANISHMENT?GhostIdentity.Rite.CLEANSING:GhostIdentity.Rite.BANISHMENT;
   ok(!mission.performRite(0,other,site.room(),true).accepted(),"wrong rite denied");
   ok(!mission.performRite(0,type.rite(),(site.room()+1)%12,true).accepted(),"wrong site denied");
   ok(!mission.performRite(0,type.rite(),site.room(),false).accepted(),"outside circle denied");
   ok(mission.performRite(0,type.rite(),site.room(),true).accepted(),"right rite at correct site");
   int[] guard={site.room(),14,14};
   int required=(type.rite()==GhostIdentity.Rite.BANISHMENT?55:
       type.rite()==GhostIdentity.Rite.ABSOLUTION?60:45)*(type.ancient()?2:1);
   ok(mission.requiredRitualTicks()==required,"Ancient rituals take exactly twice as long "+type);
   for(int i=0;i<required-1;i++)mission.advance(guard);
   ok(mission.outcome()==LanCase.Outcome.ACTIVE,"cannot auto-complete early");
   ok(mission.advance(guard)==LanCase.RitualAdvance.CLEANSED,"fully defended rite");
   var terminal=type.rite()==GhostIdentity.Rite.BANISHMENT?LanCase.Outcome.BANISHED
           :type.rite()==GhostIdentity.Rite.CLEANSING?LanCase.Outcome.CLEANSED:LanCase.Outcome.ABSOLVED;
   ok(mission.outcome()==terminal,"distinct ritual outcome "+type);
  }
  ok(rites.size()==3,"all three ritual categories used");
  var legacy=new LanCase(4);
  for(var tool:LanCase.Tool.values())legacy.scan(0,tool,4,0);
  ok(legacy.ward(0,4).accepted()&&legacy.cleanse(0,4).accepted(),"legacy compatibility");
  System.out.println("PASS: 23 ghost profiles, raw measurements, no confirmation gate, ritual paths");
 }
}
