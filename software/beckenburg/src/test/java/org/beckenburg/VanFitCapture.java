package org.beckenburg;
import java.nio.file.*;
import java.util.*;
import javax.imageio.ImageIO;
/** Fully stocked, real game-camera review of the measured van and retained street. */
public final class VanFitCapture {
    static final Path OUT=Path.of("development/levels/previews/van");
    static void view(SceneRenderer s,HouseMap map,String name,double x,double y,double z,double tx,double ty,double tz)throws Exception{
        var p=map.van().world(x,z);var target=map.van().world(tx,tz);
        s.x=p.x();s.z=p.z();s.eyeHeight=y;s.yaw=Math.atan2(target.x()-p.x(),target.z()-p.z());
        s.pitch=Math.atan2(ty-y,Math.hypot(tx-x,tz-z));
        s.drawNetwork(map,List.of(),-1,0);
        ImageIO.write(s.image(),"PNG",OUT.resolve(name+".png").toFile());
        System.out.println("CAPTURE "+name);
    }
    public static void main(String[]args)throws Exception{
        LevelVisualCapture.inspection();Files.createDirectories(OUT);var map=new HouseMap();
        var s=new SceneRenderer();s.setRenderSize(960,600);s.setPsxPreset(PsxPipeline.Preset.OFF);
        s.environmentLight=1;s.lamp=true;s.roomLights=new RoomLighting();
        var gear=new FieldEquipment[6];var medicine=new FieldSupplies[6];boolean[] present={true,true,true,true,true,true};
        for(int seat=0;seat<6;seat++){
            gear[seat]=new FieldEquipment();medicine[seat]=new FieldSupplies();medicine[seat].reward(5000);
            for(String id:FieldEquipment.workingTools()){gear[seat].upgrade(id,EquipmentTiers.Tier.II);gear[seat].upgrade(id,EquipmentTiers.Tier.III);}
            medicine[seat].purchase(FieldSupplies.Kind.HEALTH,FieldSupplies.Tier.ADVANCED);medicine[seat].purchase(FieldSupplies.Kind.HEALTH,FieldSupplies.Tier.ADVANCED);medicine[seat].purchase(FieldSupplies.Kind.SANITY,FieldSupplies.Tier.IMPROVED);
        }
        s.rackInventory=VanRackStock.aggregate(gear,medicine,new HunterCounters(),present);
        Files.writeString(OUT.resolve("stock.json"),LevelSceneSource.json(s.rackInventory));
        System.out.println("ACTUAL_REVIEW_STOCK "+s.rackInventory.stream().mapToInt(VanRackStock.Entry::count).sum()+" native-sized meshes; carried instruments excluded");
        GlbProps.updateVanCrt(new VanTelemetry.Display(100,4,new int[]{100,94,87,99,80,96}));
        view(s,map,"01-street-and-van",4.5,1.62,-8,0,1.25,.1);
        view(s,map,"02-cargo-and-clear-aisle",0,VanStaging.FLOOR_Y+1.62,-1.84,0,1.55,1.65);
        view(s,map,"03-full-equipment-wall",.25,VanStaging.FLOOR_Y+1.62,-.35,-.70,1.55,-.35);
        view(s,map,"04-monitors-and-boards",-.25,VanStaging.FLOOR_Y+1.62,-.2,.85,1.60,-.2);
        view(s,map,"05-command-workstation",0,VanStaging.FLOOR_Y+1.62,.70,0,1.45,1.85);
        view(s,map,"06-loading-ramp",.2,1.62,-4.5,0,1.45,-.5);
        view(s,map,"07-roadside-scale",4.7,1.62,5,0,1.1,1);
    }
}
