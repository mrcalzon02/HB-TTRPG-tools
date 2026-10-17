package org.beckenburg;
import java.util.*;
/** Guaranteed three positives + uniquely identifiable triple + correct ritual site for each ghost. */
public final class LanGhostIdentityTest {
 static void ok(boolean v,String why){if(!v)throw new AssertionError(why);}
 public static void main(String[] args){
  var map=new HouseMap();ok(RitualSites.valid(map),"all 3 ritual sites reachable");
  ok(GhostIdentity.Type.values().length==13,"13 ghost archetypes");
  Set<String> triples=new HashSet<>();Set<GhostIdentity.Behavior> behaviors=new HashSet<>();
  Set<GhostIdentity.Rite> rites=EnumSet.noneOf(GhostIdentity.Rite.class);
  for(var type:GhostIdentity.Type.values()){
   ok(type.signatureCount()>=3&&triples.add(type.signatureKey()),"three unique evidence states "+type);
   ok(behaviors.add(type.behavior()),"distinct assigned behavior "+type);
   rites.add(type.rite());
   var mission=new LanCase(4);mission.configure(type,true);
   for(var tool:LanCase.Tool.values()){
    ok(mission.scan(0,tool,3,0).message().startsWith("INCONCLUSIVE"),"outside anchor negative");
    ok(mission.scan(0,tool,4,0).message().startsWith("CONFIRMED"),"anchor positive "+type+" "+tool);
   }
   ok(mission.evidenceCount()==3&&mission.testedCount()==3,"positive evidence count "+type);
   ok(!mission.cleanse(0,4).accepted(),"identify first "+type);
   var wrong=type==GhostIdentity.Type.SPIRIT?GhostIdentity.Type.WRAITH:GhostIdentity.Type.SPIRIT;
   ok(!mission.identify(0,wrong,1).accepted(),"wrong guess");
   ok(!mission.identify(0,type,2).accepted(),"no guessing spam");
   ok(mission.identify(1,type,31).accepted(),"correct deduction");
   ok(mission.ward(0,4).accepted(),"anchor ward");
   var site=RitualSites.site(map,type.rite());
   var other=type.rite()==GhostIdentity.Rite.BANISHMENT?GhostIdentity.Rite.CLEANSING:GhostIdentity.Rite.BANISHMENT;
   ok(!mission.performRite(0,other,site.room(),true).accepted(),"wrong rite denied");
   ok(!mission.performRite(0,type.rite(),4,true).accepted(),"wrong site denied");
   ok(!mission.performRite(0,type.rite(),site.room(),false).accepted(),"outside circle denied");
   ok(mission.performRite(0,type.rite(),site.room(),true).accepted(),"right rite at correct site");
   int[] guard={site.room(),14,14};
   int required=type.rite()==GhostIdentity.Rite.BANISHMENT?55:type.rite()==GhostIdentity.Rite.ABSOLUTION?60:45;
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
  System.out.println("PASS: 13 unique triples; 3 positive states each; 3 valid ritual sites; correct rite gates");
 }
}
