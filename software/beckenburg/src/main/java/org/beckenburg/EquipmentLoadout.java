package org.beckenburg;

import java.util.EnumSet;
import java.util.Objects;

/** Four carried instruments; replacements and refills are performed at the expedition van. */
public final class EquipmentLoadout {
    public static final int SLOTS=4;
    public enum Item {
        EMF("EMF reader", "Measures field disturbances"),
        THERMOMETER("Thermometer", "Checks unnatural cold"),
        SPIRIT_BOX("Spirit box", "Tests for a verbal reply"),
        UV_LAMP("UV lamp", "Reveals recent spectral residue"),
        PHOTO_CAMERA("Photo camera", "Photographs a visible apparition; six exposures"),
        SALT("Salt pouch", "Tracks ghost passage; three pouches");
        public final String label,description;
        Item(String label,String description){this.label=label;this.description=description;}
        public boolean evidence(){return this==EMF||this==THERMOMETER||this==SPIRIT_BOX;}
        @Override public String toString(){return label;}
    }
    private final Item[] slots={Item.EMF,Item.THERMOMETER,Item.SPIRIT_BOX,Item.PHOTO_CAMERA};
    private int active,film=6,salt=3;
    public Item at(int slot){checkSlot(slot);return slots[slot];}
    public int activeSlot(){return active;}
    public Item equipped(){return slots[active];}
    public void select(int slot){checkSlot(slot);active=slot;}
    public int usesLeft(Item item){Objects.requireNonNull(item);return switch(item){
        case PHOTO_CAMERA->film;case SALT->salt;default->-1;
    };}
    public boolean consume(Item item){Objects.requireNonNull(item);return switch(item){
        case PHOTO_CAMERA->{if(film==0)yield false;film--;yield true;}
        case SALT->{if(salt==0)yield false;salt--;yield true;}
        default->true;
    };}
    public void refill(){film=6;salt=3;}
    /** Atomic rack transaction: duplicate gear cannot silently occupy two physical slots. */
    public void replaceAtRack(Item[] selected){
        if(selected==null||selected.length!=SLOTS)throw new IllegalArgumentException("four item slots required");
        EnumSet<Item> seen=EnumSet.noneOf(Item.class);
        for(Item item:selected)if(item==null||!seen.add(item))
            throw new IllegalArgumentException("one distinct instrument per slot");
        System.arraycopy(selected,0,slots,0,SLOTS);
        refill();
    }
    private static void checkSlot(int slot){if(slot<0||slot>=SLOTS)throw new IllegalArgumentException("slot 1-4 required");}
}