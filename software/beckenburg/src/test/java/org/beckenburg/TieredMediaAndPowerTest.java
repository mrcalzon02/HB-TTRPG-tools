package org.beckenburg;

import java.awt.image.BufferedImage;

/**
 * Actual hardware progression, not price-only descriptions. Neither test
 * requests nor outcomes depend on whether a ghost is present or identified.
 */
public final class TieredMediaAndPowerTest {
    static void ok(boolean good,String message){
        if(!good)throw new AssertionError(message);
    }
    public static void main(String[] args){
        FieldEquipment kit=new FieldEquipment();
        kit.equip(3,"PHOTO_CAMERA");kit.selectSlot(3);
        var first=EquipmentTiers.stage("PHOTO_CAMERA",EquipmentTiers.Tier.I);
        var second=EquipmentTiers.stage("PHOTO_CAMERA",EquipmentTiers.Tier.II);
        var third=EquipmentTiers.stage("PHOTO_CAMERA",EquipmentTiers.Tier.III);
        ok(first.capacity()==1&&second.capacity()==6&&third.capacity()==12,
            "real photo magazines are 1 Polaroid, 6 standard and 12 advanced");
        ok(kit.remaining("PHOTO_CAMERA")==1,"instant camera starts with one sheet");
        ok(kit.expend("PHOTO_CAMERA")==0,"one exposure removes the only film");
        boolean refused=false;
        try{kit.expend("PHOTO_CAMERA");}catch(IllegalArgumentException expected){refused=true;}
        ok(refused,"camera cannot magically fire without film");
        kit.rechargeAtVan();
        ok(kit.remaining("PHOTO_CAMERA")==1,"van replaces one Polaroid sheet");

        kit.upgrade("PHOTO_CAMERA",EquipmentTiers.Tier.II);
        ok(kit.remaining("PHOTO_CAMERA")==6,"Tier II gets six genuine exposures");
        for(int i=0;i<6;i++)kit.expend("PHOTO_CAMERA");
        ok(kit.remaining("PHOTO_CAMERA")==0,"six-shot magazine depletes");
        kit.rechargeAtVan();
        ok(kit.remaining("PHOTO_CAMERA")==6,"van reloads standard camera");
        kit.upgrade("PHOTO_CAMERA",EquipmentTiers.Tier.III);
        ok(kit.remaining("PHOTO_CAMERA")==12,"Tier III has twelve photos");

        BufferedImage realRoom=new BufferedImage(320,200,BufferedImage.TYPE_INT_RGB);
        realRoom.setRGB(160,100,0x146c9b);
        var instant=HunterPhotography.snapshot(realRoom,EquipmentTiers.Tier.I);
        var standard=HunterPhotography.snapshot(realRoom,EquipmentTiers.Tier.II);
        var professional=HunterPhotography.snapshot(realRoom,EquipmentTiers.Tier.III);
        ok(instant.getWidth()==160&&instant.getHeight()==160,
            "low-detail square instant print");
        ok(standard.getWidth()==320&&standard.getHeight()==200,
            "mid-range full-width camera");
        ok(professional.getWidth()==640&&professional.getHeight()==400,
            "Tier III higher-resolution full-frame exported photograph");
        ok((standard.getRGB(160,100)&0xffffff)==0x146c9b,
            "photo derives from real scene pixels, no ghost data");
        ok(EquipmentOptics.forTier(EquipmentTiers.Tier.I).videoFieldOfView()==65
            &&EquipmentOptics.forTier(EquipmentTiers.Tier.II).videoFieldOfView()==93
            &&EquipmentOptics.forTier(EquipmentTiers.Tier.III).videoFieldOfView()==120,
            "real wider lenses replace static zoomed monitor");
        SceneRenderer lens=new SceneRenderer();
        lens.setFieldOfView(65);
        double narrow=lens.fieldOfView();
        lens.setFieldOfView(120);
        ok(lens.fieldOfView()>narrow+50,"renderer projection changes camera coverage");
        lens.setLampHardware(EquipmentTiers.Tier.I,false);
        double smallBeam=lens.lampReach,smallPower=lens.lampIntensity;
        lens.setLampHardware(EquipmentTiers.Tier.III,false);
        ok(lens.lampReach>smallBeam&&lens.lampIntensity>smallPower,
            "flashlight higher tier really illuminates farther and brighter");

        kit.equip(3,"FLASHLIGHT");kit.selectSlot(3);
        ok(kit.batterySecondsLeft("FLASHLIGHT")==280,"Tier I starts at 280 seconds");
        kit.advancePower(0);
        ok(kit.toggle("FLASHLIGHT"),"switch illuminates empty room");
        kit.advancePower(2799);
        ok(kit.powered("FLASHLIGHT")&&kit.batterySecondsLeft("FLASHLIGHT")==1,
            "battery nearly exhausted under continuous operation");
        var ended=kit.advancePower(2800);
        ok(ended.contains("FLASHLIGHT")&&!kit.powered("FLASHLIGHT"),
            "real battery exhaustion switches light off automatically");
        refused=false;
        try{kit.toggle("FLASHLIGHT");}catch(IllegalArgumentException expected){refused=true;}
        ok(refused,"exhausted torch cannot restart without van charging");
        kit.rechargeAtVan();
        ok(kit.batterySecondsLeft("FLASHLIGHT")==280,"van restores full charge");
        kit.upgrade("FLASHLIGHT",EquipmentTiers.Tier.II);
        int durationTwo=kit.batterySecondsLeft("FLASHLIGHT");
        kit.upgrade("FLASHLIGHT",EquipmentTiers.Tier.III);
        int durationThree=kit.batterySecondsLeft("FLASHLIGHT");
        ok(durationTwo==420&&durationThree==630,
            "larger batteries have actual 420 and 630 second lifetimes");

        kit.equip(3,"VIDEO_CAMERA");
        ok(kit.batterySecondsLeft("VIDEO_CAMERA")>0,"video battery starts charged");
        kit.setPower("VIDEO_CAMERA",true);
        ok(kit.powered("VIDEO_CAMERA"),"live video actually draws power");
        kit.setPower("VIDEO_CAMERA",false);
        ok(!kit.powered("VIDEO_CAMERA"),"camera retrieval switches feed off");
        System.out.println("PASS: Polaroid 1, cameras 6/12, photo output quality, video lens width, tiered beams, battery discharge/recharge");
    }
}
