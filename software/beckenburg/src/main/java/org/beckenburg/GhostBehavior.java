package org.beckenburg;
import java.util.Objects;

/** Mechanical patterns all routed through the same AI/human GhostDomain authority. */
public final class GhostBehavior {
 private GhostBehavior(){}
 public record Profile(GhostDomain.Action favored,int energyDiscount,int cooldownDiscount,
                       int extraFear,int extraHarm,int manifestTicks,int aiPeriod,String tell) {
  public Profile {
   Objects.requireNonNull(favored);Objects.requireNonNull(tell);
   if(tell.length()>76||energyDiscount<0||cooldownDiscount<0||aiPeriod<4)
    throw new IllegalArgumentException("invalid ghost behavior contract");
  }
 }
 public static Profile profile(GhostIdentity.Type type){
  return switch(Objects.requireNonNull(type).baseType()){
   case POSSESSIVE ->new Profile(GhostDomain.Action.DISTURB,3,11,1,0,0,31,"Small keepsakes shift toward a single object");
   case POLTERGEIST->new Profile(GhostDomain.Action.DISTURB,5,18,2,0,0,17,"Several unsecured objects rattle in sequence");
   case DEMON->new Profile(GhostDomain.Action.STRIKE,4,13,2,4,0,24,"An aggressive impact shakes the nearest threshold");
   case YOKAI->new Profile(GhostDomain.Action.WHISPER,2,9,2,0,0,19,"A familiar voice repeats from the wrong room");
   case BANSHEE->new Profile(GhostDomain.Action.WHISPER,3,18,5,0,0,27,"A rising wail fills the corridor");
   case WRAITH->new Profile(GhostDomain.Action.DRIFT,1,18,0,0,0,21,"Footfall echoes shift to the far side of a wall");
   case SHADE->new Profile(GhostDomain.Action.MANIFEST,5,11,1,0,0,39,"An outline holds still in the darkest corner");
   case SPECTER->new Profile(GhostDomain.Action.MANIFEST,6,19,0,0,18,33,"An apparition lingers after the movement ends");
   case SPIRIT->new Profile(GhostDomain.Action.WHISPER,0,0,0,0,0,29,"A faint voice carries through the old rooms");
   case HANTU->new Profile(GhostDomain.Action.DISTURB,2,9,3,0,0,23,"A sudden cold draft brushes past the investigators");
   case DEVIL->new Profile(GhostDomain.Action.WHISPER,3,12,4,0,0,37,"A soft voice offers an unsettling promise");
   case MIMIC->new Profile(GhostDomain.Action.WHISPER,1,8,2,0,0,41,"The last call repeats with a slight delay");
   case TWINS->new Profile(GhostDomain.Action.DRIFT,1,13,1,0,0,25,"Two knocks answer from neighboring rooms");
   default->throw new AssertionError("Unexpected base ghost: "+type);
  };
 }
 public static int cost(GhostIdentity.Type type,GhostDomain.Action action,int base){
  Profile p=profile(type);
  return Math.max(1,base-(p.favored()==action?p.energyDiscount():0));
 }
 public static int cooldown(GhostIdentity.Type type,GhostDomain.Action action,int base){
  Profile p=profile(type);
  return Math.max(5,base-(p.favored()==action?p.cooldownDiscount():0));
 }
 public static int fear(GhostIdentity.Type type,GhostDomain.Action action,int base){
  Profile p=profile(type);
  return Math.max(0,base+(p.favored()==action&&base>0?p.extraFear():0));
 }
 public static int harm(GhostIdentity.Type type,GhostDomain.Action action,int base){
  Profile p=profile(type);
  return Math.max(0,base+(p.favored()==action&&base>0?p.extraHarm():0));
 }
}
