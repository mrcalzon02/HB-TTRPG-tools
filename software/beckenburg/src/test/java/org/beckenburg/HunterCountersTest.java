package org.beckenburg;
public final class HunterCountersTest {
 private static void ok(boolean b,String why){if(!b)throw new AssertionError(why);}
 public static void main(String[] args){
  HouseMap map=new HouseMap();HunterCounters traps=new HunterCounters();
  LanWorld.Body hunter=new LanWorld.Body(12.5,9.5,0,4);
  GhostDomain spirit=new GhostDomain(map,4,GhostIdentity.Type.SPIRIT);
  LanGhostSpatial.Pose pose=new LanGhostSpatial.Pose(4,12.5,9.5,0);
  traps.launch(0,HunterCounters.Kind.SALT,hunter,map,12);
  ok(traps.charges(0,HunterCounters.Kind.SALT)==2,"finite salt");
  ok(traps.advance(map,GhostIdentity.Type.SPIRIT,spirit,pose,13).saltTrack(),"walker triggered salt");
  ok(spirit.manifested(),"salt reveals walker");
  HunterCounters air=new HunterCounters();air.launch(0,HunterCounters.Kind.SALT,hunter,map,12);
  ok(!air.advance(map,GhostIdentity.Type.WRAITH,spirit,pose,13).saltTrack(),"floating ghost ignores salt");
  HunterCounters throwables=new HunterCounters();throwables.launch(0,HunterCounters.Kind.WARD,hunter,map,20);
  for(int tick=21;tick<34;tick++)throwables.advance(map,GhostIdentity.Type.WRAITH,spirit,pose,tick);
  ok(throwables.snapshot(34).size()==1,"thrown ward persists in world");
  ok(throwables.charges(0,HunterCounters.Kind.WARD)==1,"ward ammunition tracked");
  try{throwables.launch(0,HunterCounters.Kind.CROSS,hunter,map,21);throw new AssertionError("cooldown ignored");}
  catch(IllegalArgumentException expected){}
  traps.leaveUv(4,14);ok(traps.recentUv(4,15),"fresh UV trace");
  ok(!traps.recentUv(4,111),"old UV expires");
  System.out.println("PASS: finite throws, ward persistence, salt grounding and cooldown enforcement");
 }
}