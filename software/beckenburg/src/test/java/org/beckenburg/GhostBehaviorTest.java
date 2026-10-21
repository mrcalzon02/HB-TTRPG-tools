package org.beckenburg;
import java.util.*;
/** Same command stream must have identical effects regardless of AI or human attribution. */
public final class GhostBehaviorTest {
 static void ok(boolean a,String m){if(!a)throw new AssertionError(m);}
 public static void main(String[] args){
  var profiles=new HashSet<String>();
  for(var type:GhostIdentity.Type.values()){
   var p=GhostBehavior.profile(type);
   if(!type.ancient())ok(profiles.add(p.toString()),"duplicate ordinary/Elder pattern "+type);
   else ok(p.equals(GhostBehavior.profile(type.baseType())),
       "Ancient behavior must inherit original action/energy/cooldown profile");
   var human=new GhostDomain(new HouseMap(),4,type);
   var ai=new GhostDomain(new HouseMap(),4,type);
   for(int tick=1;tick<=190;tick++){
    human.advance(tick,4);ai.advance(tick,4);
    if(tick%23==0){
     var act=p.favored()==GhostDomain.Action.DRIFT?GhostDomain.Action.WHISPER:p.favored();
     long seq=tick;
     var h=human.dispatch(new GhostDomain.Command(act,4,seq,GhostDomain.Source.HUMAN));
     var a=ai.dispatch(new GhostDomain.Command(act,4,seq,GhostDomain.Source.AI));
     ok(h.equals(a),"human/AI shared effect mismatch "+type+" "+tick);
    }
   }
   ok(human.energy()==ai.energy(),"identical final energy "+type);
  }
  ok(profiles.size()==16,"thirteen originals plus three Elder profiles unique");
  System.out.println("PASS: 16 original/Elder behavior patterns shared by 26 ghosts, host energy/cooldowns and AI-human action parity");
 }
}
