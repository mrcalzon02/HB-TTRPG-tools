package org.beckenburg;
import java.util.*;
/** Host-owned signature and required rite for every original ghost. */
public final class GhostIdentity {
 private GhostIdentity(){}
 public enum Rite { BANISHMENT, CLEANSING, ABSOLUTION }
 public enum Behavior { OBJECT_CLAIM, OBJECT_STORM, AGGRESSION, SOUND_REACTION, WAIL, PHASE_TRAVEL, LURK, APPARITION, RESTLESS, COLD_FEED, BARGAIN, IMITATION, PAIRED_ECHO }
 public enum Emf { FIELD_SURGE, TETHER, KINETIC, INTERFERENCE }
 public enum Thermal { ANCHOR_CHILL, COLD_SPOT, SHEAR, WALL_DRAFT }
 public enum Voice { DIRECT, ECHO, FRAGMENT, DISPLACED }
 public enum Type {
  POSSESSIVE(Emf.TETHER,Thermal.COLD_SPOT,Voice.ECHO,Rite.ABSOLUTION,Behavior.OBJECT_CLAIM),
  POLTERGEIST(Emf.KINETIC,Thermal.SHEAR,Voice.FRAGMENT,Rite.BANISHMENT,Behavior.OBJECT_STORM),
  DEMON(Emf.INTERFERENCE,Thermal.WALL_DRAFT,Voice.DISPLACED,Rite.BANISHMENT,Behavior.AGGRESSION),
  YOKAI(Emf.FIELD_SURGE,Thermal.COLD_SPOT,Voice.FRAGMENT,Rite.ABSOLUTION,Behavior.SOUND_REACTION),
  BANSHEE(Emf.TETHER,Thermal.SHEAR,Voice.DISPLACED,Rite.ABSOLUTION,Behavior.WAIL),
  WRAITH(Emf.KINETIC,Thermal.WALL_DRAFT,Voice.DIRECT,Rite.BANISHMENT,Behavior.PHASE_TRAVEL),
  SHADE(Emf.INTERFERENCE,Thermal.ANCHOR_CHILL,Voice.ECHO,Rite.CLEANSING,Behavior.LURK),
  SPECTER(Emf.FIELD_SURGE,Thermal.SHEAR,Voice.ECHO,Rite.CLEANSING,Behavior.APPARITION),
  SPIRIT(Emf.FIELD_SURGE,Thermal.ANCHOR_CHILL,Voice.DIRECT,Rite.ABSOLUTION,Behavior.RESTLESS),
  HANTU(Emf.TETHER,Thermal.WALL_DRAFT,Voice.FRAGMENT,Rite.CLEANSING,Behavior.COLD_FEED),
  DEVIL(Emf.KINETIC,Thermal.ANCHOR_CHILL,Voice.DISPLACED,Rite.BANISHMENT,Behavior.BARGAIN),
  MIMIC(Emf.INTERFERENCE,Thermal.COLD_SPOT,Voice.DIRECT,Rite.CLEANSING,Behavior.IMITATION),
  TWINS(Emf.FIELD_SURGE,Thermal.WALL_DRAFT,Voice.ECHO,Rite.ABSOLUTION,Behavior.PAIRED_ECHO),
  ANCIENT_POSSESSIVE(Emf.TETHER,Thermal.COLD_SPOT,Voice.ECHO,Rite.ABSOLUTION,Behavior.OBJECT_CLAIM),
  ANCIENT_POLTERGEIST(Emf.KINETIC,Thermal.SHEAR,Voice.FRAGMENT,Rite.BANISHMENT,Behavior.OBJECT_STORM),
  ANCIENT_DEMON(Emf.INTERFERENCE,Thermal.WALL_DRAFT,Voice.DISPLACED,Rite.BANISHMENT,Behavior.AGGRESSION),
  ANCIENT_YOKAI(Emf.FIELD_SURGE,Thermal.COLD_SPOT,Voice.FRAGMENT,Rite.ABSOLUTION,Behavior.SOUND_REACTION),
  ANCIENT_BANSHEE(Emf.TETHER,Thermal.SHEAR,Voice.DISPLACED,Rite.ABSOLUTION,Behavior.WAIL),
  ANCIENT_WRAITH(Emf.KINETIC,Thermal.WALL_DRAFT,Voice.DIRECT,Rite.BANISHMENT,Behavior.PHASE_TRAVEL),
  ANCIENT_SHADE(Emf.INTERFERENCE,Thermal.ANCHOR_CHILL,Voice.ECHO,Rite.CLEANSING,Behavior.LURK),
  ANCIENT_SPECTER(Emf.FIELD_SURGE,Thermal.SHEAR,Voice.ECHO,Rite.CLEANSING,Behavior.APPARITION),
  ANCIENT_HANTU(Emf.TETHER,Thermal.WALL_DRAFT,Voice.FRAGMENT,Rite.CLEANSING,Behavior.COLD_FEED),
  ANCIENT_TWINS(Emf.FIELD_SURGE,Thermal.WALL_DRAFT,Voice.ECHO,Rite.ABSOLUTION,Behavior.PAIRED_ECHO);
  private final Emf emf;private final Thermal thermal;private final Voice voice;
  private final Rite rite;private final Behavior behavior;
  Type(Emf e,Thermal t,Voice v,Rite r,Behavior b){emf=e;thermal=t;voice=v;rite=r;behavior=b;}
  public Emf emf(){return emf;}public Thermal thermal(){return thermal;}public Voice voice(){return voice;}
  public Rite rite(){return rite;}public Behavior behavior(){return behavior;}
  /** Stable original enum ordinals are preserved for existing save files. */
  public Type baseType(){
    return switch(this){
      case ANCIENT_POSSESSIVE->POSSESSIVE;
      case ANCIENT_POLTERGEIST->POLTERGEIST;
      case ANCIENT_DEMON->DEMON;
      case ANCIENT_YOKAI->YOKAI;
      case ANCIENT_BANSHEE->BANSHEE;
      case ANCIENT_WRAITH->WRAITH;
      case ANCIENT_SHADE->SHADE;
      case ANCIENT_SPECTER->SPECTER;
      case ANCIENT_HANTU->HANTU;
      case ANCIENT_TWINS->TWINS;
      default->this;
    };
  }
  public boolean ancient(){return baseType()!=this;}
  public boolean signature(LanCase.Tool tool){return tool!=null;}
  public int signatureCount(){return 3;}
  public String signatureKey(){return emf+"/"+thermal+"/"+voice;}
 }
 public static String reading(Type type,LanCase.Tool tool,boolean strong,int distance,boolean ghostPresent){
  Objects.requireNonNull(type);Objects.requireNonNull(tool);
  if(strong)return switch(tool){
   case EMF->switch(type.emf){case FIELD_SURGE->"EMF 5 - pulsing field surge";case TETHER->"EMF 5 - object tether resonance";case KINETIC->"EMF 5 - clustered kinetic spikes";case INTERFERENCE->"EMF 5 - patterned interference";};
   case THERMOMETER->switch(type.thermal){case ANCHOR_CHILL->"Unnatural cold 2C - anchor chill";case COLD_SPOT->"Cold pocket - 3C";case SHEAR->"Thermal shear - 4C";case WALL_DRAFT->"Cold seam along wall - 1C";};
   case SPIRIT_BOX->switch(type.voice){case DIRECT->"Clear spirit-box response";case ECHO->"Double-echo through static";case FRAGMENT->"Broken syllables - distant reply";case DISPLACED->"Voice arrives from the wrong direction";};
  };
  return switch(tool){case EMF->ghostPresent?"Transient EMF 3 - not anchor evidence":"EMF baseline";
   case THERMOMETER->distance==1?"Cool air 11C":"Ambient 19C";case SPIRIT_BOX->"No conclusive response";};
 }
 /** Deductions filter the observable triple, never consult a hidden host truth. */
 public static List<Type> candidates(Emf e,Thermal t,Voice v){
  return Arrays.stream(Type.values()).filter(x->e==null||x.emf==e)
   .filter(x->t==null||x.thermal==t).filter(x->v==null||x.voice==v).toList();
 }
}
