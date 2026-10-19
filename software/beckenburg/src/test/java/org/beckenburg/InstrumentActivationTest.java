package org.beckenburg;

import java.awt.image.BufferedImage;
import java.nio.file.Files;

/**
 * Activating a tool operates its physical function whether ghosts are visible
 * or not. Film, switches and camera poses are not supernatural verdicts.
 */
public final class InstrumentActivationTest {
    static void check(boolean condition,String message){
        if(!condition)throw new AssertionError(message);
    }
    public static void main(String[] args)throws Exception{
        FieldEquipment gear=new FieldEquipment();
        check(FieldEquipment.workingTools().contains("PHOTO_CAMERA"),"photo camera issued");
        check(FieldEquipment.workingTools().contains("VIDEO_CAMERA"),"video camera issued");
        check(FieldEquipment.workingTools().contains("INCENSE"),"incense issued");
        gear.equip(3,"PHOTO_CAMERA");gear.selectSlot(3);
        int total=gear.stage("PHOTO_CAMERA").capacity();
        check(total>0,"physical film supply");
        for(int i=0;i<total;i++){
            check(gear.remaining("PHOTO_CAMERA")==total-i,"actual film count");
            gear.expend("PHOTO_CAMERA"); // No ghost state or evidence question.
        }
        boolean empty=false;
        try{gear.expend("PHOTO_CAMERA");}catch(IllegalArgumentException expected){empty=true;}
        check(empty,"exposure stops only when real film is exhausted");
        gear.upgrade("PHOTO_CAMERA",EquipmentTiers.Tier.II);
        check(gear.remaining("PHOTO_CAMERA")>0,"higher tier refills larger film stock");

        gear.equip(3,"FLASHLIGHT");
        check(gear.toggle("FLASHLIGHT"),"lamp switches on in empty room");
        check(gear.powered("FLASHLIGHT"),"lamp stays on until toggled");
        check(!gear.toggle("FLASHLIGHT"),"lamp switches off");
        gear.equip(3,"HEAD_GEAR");
        check(gear.toggle("HEAD_GEAR"),"night vision switches on");
        check(!gear.toggle("HEAD_GEAR"),"night vision switches off");
        gear.equip(3,"FIRELIGHT");
        check(gear.toggle("FIRELIGHT"),"firelight ignites without ghost");
        check(!gear.toggle("FIRELIGHT"),"firelight extinguishes");
        gear.equip(3,"INCENSE");
        check(gear.expend("INCENSE")>=0,"incense physically burns one bundle");

        BufferedImage view=new BufferedImage(48,32,BufferedImage.TYPE_INT_RGB);
        view.setRGB(7,9,0x28425a);
        BufferedImage shot=HunterPhotography.snapshot(view);
        view.setRGB(7,9,0x7f0000);
        check((shot.getRGB(7,9)&0xffffff)==0x28425a,
            "shutter captures actual pixels at time of exposure");
        var temp=Files.createTempDirectory("beckenburg-photo-");
        var file=HunterPhotography.save(shot,temp,0,1);
        check(Files.isRegularFile(file)&&Files.size(file)>0,
            "empty-room photo is actually saved as a PNG file");
        var decoded=javax.imageio.ImageIO.read(file.toFile());
        check(decoded!=null&&decoded.getWidth()==48&&decoded.getHeight()==32
                &&(decoded.getRGB(7,9)&0xffffff)==0x28425a,
            "saved PNG decodes to the original shutter pixels and dimensions");
        check((NightVisionFilter.apply(shot).getRGB(7,9)&255)<100,
            "night vision transforms actual photons, not ghost identity");
        Files.delete(file);Files.delete(temp);

        HouseMap map=new HouseMap();
        LanVideoCameras video=new LanVideoCameras();
        var local=new LanWorld.Body(map.centerX(4),map.centerZ(4),90,4);
        var placed=video.placeOrRetrieve(0,local,EquipmentTiers.Tier.I);
        check(placed.x()==local.x()&&placed.heading()==90,
            "camera station faithfully records its world view");
        check(placed.frame().startsWith("CAMERA|PLACE|0|4|"),
            "station can stream positional footage to investigators");
        check(video.placeOrRetrieve(0,local,EquipmentTiers.Tier.I)==null,
            "physical camera can be retrieved and feed stops");
        check(video.all().isEmpty(),"stopped feed has no ghost data");
        System.out.println("PASS: physical exposures, saved photos, switches, night vision, consumables and video stations");
    }
}
