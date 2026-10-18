package org.beckenburg;

/** Host slot ownership, tier economics and genuine instrument response windows. */
public final class FieldEquipmentTest {
    static void ok(boolean v,String message){if(!v)throw new AssertionError(message);}
    public static void main(String[] args){
        FieldEquipment gear=new FieldEquipment();
        FieldSupplies wallet=new FieldSupplies();
        ok(gear.at(0).equals("EMF_READER")&&gear.at(1).equals("THERMOMETER")
            &&gear.at(2).equals("SPIRIT_BOX")&&gear.at(3).equals("UV_LIGHT"),
            "all four default slots contain actual functional tools");
        ok(gear.owned("GHOST_WRITING_BOOK")==EquipmentTiers.Tier.I,
            "writing book is issued but not carried until equipped");
        ok(!FieldEquipment.functional("RESONANCE_TUNER"),
            "planned, non-playable instruments cannot silently be purchased");
        boolean denied=false;
        try{gear.upgradePrice("EMF_READER",EquipmentTiers.Tier.III);}
        catch(IllegalArgumentException expected){denied=true;}
        ok(denied,"cannot skip Tier II");
        int price=gear.upgradePrice("EMF_READER",EquipmentTiers.Tier.II);
        int initial=wallet.credits();
        ok(wallet.spend(price),"host wallet buys real equipment");
        gear.upgrade("EMF_READER",EquipmentTiers.Tier.II);
        ok(wallet.credits()==initial-price,"tier purchase debits same medicine wallet");
        wallet.purchase(FieldSupplies.Kind.SANITY,FieldSupplies.Tier.BASIC);
        ok(wallet.credits()==initial-price-FieldSupplies.Tier.BASIC.price,
            "medicine and equipment cannot duplicate credits");
        int second=gear.upgradePrice("EMF_READER",EquipmentTiers.Tier.III);
        ok(wallet.spend(second),"Tier III is affordable once Tier II owned");
        gear.upgrade("EMF_READER",EquipmentTiers.Tier.III);
        ok(gear.stage("EMF_READER").reachCm()>EquipmentTiers.stage("EMF_READER",
            EquipmentTiers.Tier.I).reachCm(),"true Tier III spatial reach");
        ok(gear.ready("EMF_READER",20),"first use ready");
        gear.sampled("EMF_READER",20);
        ok(!gear.ready("EMF_READER",21),"continuous polling respects physical refresh");
        ok(gear.ready("EMF_READER",20+gear.stage("EMF_READER").intervalTicks()),
            "host sampling refreshes after tier-specific delay");
        denied=false;
        try{gear.equip(0,"THERMOMETER");}
        catch(IllegalArgumentException expected){denied=true;}
        ok(denied,"one item cannot occupy two slots");
        gear.equip(3,"GHOST_WRITING_BOOK");
        gear.selectSlot(3);
        ok(gear.active().equals("GHOST_WRITING_BOOK"),"real writing equipment is held");
        ok(gear.frame(wallet.credits()).startsWith("GEARSTATE|"),
            "reconnect snapshot contains carried tiered state");
        ok(!gear.inventoryFrame().contains("RESONANCE_TUNER"),
            "planned devices not represented as owned");
        System.out.println("PASS: working tiered inventory, shared credits, range, cooldown and duplicate-slot rejection");
    }
}
