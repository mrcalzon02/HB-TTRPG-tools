package org.beckenburg;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

/**
 * Private per-hunter equipment rack/loadout, controlled exclusively by LanHost.
 * Source catalog plans do NOT make an instrument functional: only ENABLED tools
 * have a real world-event or environmental measurement implementation.
 */
public final class FieldEquipment {
    public static final int SLOTS=4;
    private static final String[] START={"EMF_READER","THERMOMETER",
        "SPIRIT_BOX","UV_LIGHT"};
    private static final java.util.Set<String> ENABLED=java.util.Set.of(
        "EMF_READER","THERMOMETER","SPIRIT_BOX","UV_LIGHT",
        "GHOST_WRITING_BOOK","DOTS_PROJECTOR","FLASHLIGHT","PHOTO_CAMERA",
        "VIDEO_CAMERA","HEAD_GEAR","FIRELIGHT","IGNITER","INCENSE");
    private final Map<String,EquipmentTiers.Tier> owned=new HashMap<>();
    private final String[] slots=START.clone();
    private int current;
    private final Map<String,Integer> lastSampleTick=new HashMap<>();
    private final Map<String,Boolean> powered=new HashMap<>();
    private final Map<String,Integer> remaining=new HashMap<>();
    private final Map<String,Integer> batteryTicks=new HashMap<>();
    private int lastBatteryTick=-1;
    /** Battery-draining equipment uses tick-based, host-owned power. */
    private static final java.util.Set<String> BATTERY_TOOLS=java.util.Set.of(
        "FLASHLIGHT","HEAD_GEAR","VIDEO_CAMERA","EMF_READER",
        "THERMOMETER","SPIRIT_BOX","UV_LIGHT","DOTS_PROJECTOR");

    public FieldEquipment(){
        for(String id:ENABLED)owned.put(id,EquipmentTiers.Tier.I);
        for(String id:ENABLED)if(EquipmentTiers.stage(id,EquipmentTiers.Tier.I).capacity()>0)
            remaining.put(id,EquipmentTiers.stage(id,EquipmentTiers.Tier.I).capacity());
        for(String id:BATTERY_TOOLS)
            batteryTicks.put(id,stage(id).batterySeconds()*10);
    }
    public static boolean functional(String id){
        return id!=null&&ENABLED.contains(id);
    }
    public static java.util.List<String> workingTools(){
        return ENABLED.stream().sorted().toList();
    }
    public int activeSlot(){return current;}
    public void selectSlot(int slot){
        if(slot<0||slot>=SLOTS)throw new IllegalArgumentException("invalid gear slot");
        current=slot;
    }
    public String active(){return slots[current];}
    public String at(int slot){
        if(slot<0||slot>=SLOTS)throw new IllegalArgumentException("invalid gear slot");
        return slots[slot];
    }
    public EquipmentTiers.Tier owned(String id){
        Objects.requireNonNull(id);
        return owned.get(id);
    }
    public EquipmentTiers.Stage stage(String id){
        EquipmentTiers.Tier tier=owned(id);
        if(tier==null)throw new IllegalArgumentException("equipment not owned");
        return EquipmentTiers.stage(id,tier);
    }
    /** A working tool can be held in only one physical equipment slot. */
    public void equip(int slot,String id){
        if(!functional(id)||owned(id)==null)
            throw new IllegalArgumentException("equipment not available");
        if(slot<0||slot>=SLOTS)throw new IllegalArgumentException("invalid gear slot");
        for(int i=0;i<SLOTS;i++)if(i!=slot&&slots[i].equals(id))
            throw new IllegalArgumentException("device already equipped in another slot");
        slots[slot]=id;current=slot;
    }
    /** Existing medicine and equipment draw from the SAME host credit wallet. */
    public int upgradePrice(String id,EquipmentTiers.Tier tier){
        if(!functional(id))throw new IllegalArgumentException("not a functional item");
        if(tier==EquipmentTiers.Tier.I)
            throw new IllegalArgumentException("starter model already issued");
        EquipmentTiers.Tier old=owned(id);
        if(old==null||tier.ordinal()!=old.ordinal()+1)
            throw new IllegalArgumentException("purchase preceding tier first");
        return EquipmentTiers.stage(id,tier).creditCost();
    }
    public void upgrade(String id,EquipmentTiers.Tier tier){
        upgradePrice(id,tier);
        owned.put(id,tier);
        lastSampleTick.remove(id);
        if(stage(id).capacity()>0){
            int previously=remaining.getOrDefault(id,0);
            remaining.put(id,Math.max(previously,stage(id).capacity()));
        }
        if(BATTERY_TOOLS.contains(id))
            batteryTicks.put(id,Math.max(batteryTicks.getOrDefault(id,0),
                stage(id).batterySeconds()*10));
    }
    /** On/off has no clue validity semantics and does not consume a sensor sample. */
    public boolean toggle(String id){
        if(!id.equals(active())||!ENABLED.contains(id))
            throw new IllegalArgumentException("switch must be held");
        if(!java.util.Set.of("FLASHLIGHT","VIDEO_CAMERA","HEAD_GEAR","FIRELIGHT")
                .contains(id))
            throw new IllegalArgumentException("item has no on/off switch");
        boolean next=!powered.getOrDefault(id,false);
        if(next&&BATTERY_TOOLS.contains(id)&&batteryTicks.getOrDefault(id,0)==0)
            throw new IllegalArgumentException("battery empty, recharge at the van");
        powered.put(id,next);
        return next;
    }
    public boolean powered(String id){return powered.getOrDefault(id,false);}
    public void setPower(String id,boolean enabled){
        if(!BATTERY_TOOLS.contains(id))throw new IllegalArgumentException("not powered equipment");
        if(enabled&&batteryTicks.getOrDefault(id,0)==0)
            throw new IllegalArgumentException("battery empty, recharge at the van");
        powered.put(id,enabled);
    }
    public int batterySecondsLeft(String id){
        if(!BATTERY_TOOLS.contains(id))return -1;
        return (batteryTicks.getOrDefault(id,0)+9)/10;
    }
    /**
     * Advances real powered device runtime at the host's 10Hz game tick.
     * Switches turn themselves off when drained, never when evidence is absent.
     * Tick gaps cannot recharge a battery.
     */
    public java.util.List<String> advancePower(int tick){
        if(tick<0)throw new IllegalArgumentException("invalid host tick");
        if(lastBatteryTick<0){lastBatteryTick=tick;return java.util.List.of();}
        int elapsed=Math.max(0,tick-lastBatteryTick);
        lastBatteryTick=tick;
        if(elapsed==0)return java.util.List.of();
        java.util.List<String> ended=new java.util.ArrayList<>();
        for(String id:BATTERY_TOOLS)if(powered(id)){
            int left=Math.max(0,batteryTicks.getOrDefault(id,0)-elapsed);
            batteryTicks.put(id,left);
            if(left==0){powered.put(id,false);ended.add(id);}
        }
        return java.util.List.copyOf(ended);
    }
    /**
     * Accessible only through host-authenticated van rack action. Polaroid
     * receives exactly one fresh sheet; Tier II/III get their actual magazines.
     */
    public void rechargeAtVan(){
        for(String id:BATTERY_TOOLS){
            batteryTicks.put(id,stage(id).batterySeconds()*10);
        }
        remaining.put("PHOTO_CAMERA",stage("PHOTO_CAMERA").capacity());
    }
    /** Real shutter/supply charge; never evaluated against the ghost identity. */
    public int expend(String id){
        if(!id.equals(active())||!ENABLED.contains(id))
            throw new IllegalArgumentException("item must be held");
        if(stage(id).capacity()<=0)throw new IllegalArgumentException("not a consumable");
        int count=remaining.getOrDefault(id,0);
        if(count<=0)throw new IllegalArgumentException("out of physical charges");
        remaining.put(id,count-1);
        return count-1;
    }
    public int remaining(String id){
        return stage(id).capacity()<=0?-1:remaining.getOrDefault(id,0);
    }
    /** Response time is tied to the equipped hardware; failures do not consume it. */
    public boolean ready(String id,int tick){
        if(!functional(id)||!id.equals(active())||tick<0)
            throw new IllegalArgumentException("tool not held");
        int interval=stage(id).intervalTicks();
        int previous=lastSampleTick.getOrDefault(id,-100000);
        return tick-previous>=interval;
    }
    public void sampled(String id,int tick){
        if(!ready(id,tick))throw new IllegalArgumentException("device is refreshing");
        lastSampleTick.put(id,tick);
    }
    public String frame(int credits){
        StringBuilder b=new StringBuilder("GEARSTATE|").append(credits)
            .append('|').append(current);
        for(String id:slots)b.append('|').append(id).append(':').append(owned(id));
        return b.toString();
    }
    public String inventoryFrame(){
        StringBuilder b=new StringBuilder("GEAROWNED");
        for(String id:ENABLED)b.append('|').append(id).append(':').append(owned(id));
        return b.toString();
    }
}
