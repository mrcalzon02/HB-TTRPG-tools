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
        "GHOST_WRITING_BOOK","DOTS_PROJECTOR");
    private final Map<String,EquipmentTiers.Tier> owned=new HashMap<>();
    private final String[] slots=START.clone();
    private int current;
    private final Map<String,Integer> lastSampleTick=new HashMap<>();

    public FieldEquipment(){
        for(String id:ENABLED)owned.put(id,EquipmentTiers.Tier.I);
    }
    public static boolean functional(String id){
        return id!=null&&ENABLED.contains(id);
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
