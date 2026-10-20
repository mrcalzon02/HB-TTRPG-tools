package org.beckenburg;
import java.nio.file.*;
import org.beckenburg.LevelDefinition.*;
/** Additional actual game views of plant eras, supported curios and cupboard difficulty. */
public final class LevelDressingCapture {
    private static final Path OUT=Path.of("development/levels/previews/runtime");
    private static SceneRenderer camera(){var s=new SceneRenderer();s.setRenderSize(960,600);s.setPsxPreset(PsxPipeline.Preset.OFF);s.roomLights=new RoomLighting();s.environmentLight=1;return s;}
    private static void kit(SceneRenderer s,HouseMap map,String mesh,int room,String label)throws Exception{
        Prop p=map.level().props().stream().filter(q->q.room()==room&&LivedAssets.base(q.mesh()).equals(mesh)).findFirst().orElseThrow();view(s,map,p,label);
    }
    private static void view(SceneRenderer s,HouseMap map,Prop p,String label)throws Exception{
        double x=map.spawn(p.room()).x(),z=map.spawn(p.room()).z();boolean found=false;
        for(double distance:new double[]{2.5,2.0,3.0,1.7}){
            for(double side:new double[]{0,.6,-.6,1.2,-1.2}){
                double xx=p.x()-Math.sin(p.yaw())*distance+Math.cos(p.yaw())*side;
                double zz=p.z()+Math.cos(p.yaw())*distance+Math.sin(p.yaw())*side;
                if(map.roomAt(xx,p.y(),zz)==p.room()&&map.traversable(xx,p.y(),zz)){x=xx;z=zz;found=true;break;}
            }
            if(found)break;
        }
        LevelVisualCapture.capture(s,map,OUT,label,x,map.floorY(p.room()),z,p.x(),p.y()+.9,p.z());
    }
    public static void main(String[] args)throws Exception{
        LevelVisualCapture.inspection();Files.createDirectories(OUT);
        HouseMap school=new HouseMap(HouseMap.Site.SCHOOL);SceneRenderer s=camera();
        for(var p:school.level().portals())if(p.door())school.openDoorBetweenRooms(p.a(),p.b());
        LevelVisualCapture.capture(s,school,OUT,"12-heating-plant-overview",28.5,-3,35,18,-1.4,24);
        LevelVisualCapture.capture(s,school,OUT,"13-retired-coal-boilers",29,-3,21,19,-1.5,16.5);
        LevelVisualCapture.capture(s,school,OUT,"14-modern-heating-plant",25,-3,35.5,18.5,-1.5,32.5);
        LevelVisualCapture.capture(s,school,OUT,"15-electrical-and-ventilation",28.5,-3,25,33,-1.7,18.5);
        HouseMap house=new HouseMap();s=camera();
        for(var p:house.level().portals())if(p.door())house.openDoorBetweenRooms(p.a(),p.b());
        kit(s,house,"level_lived_curio",1,"13-inherited-curio-display");
        kit(s,house,"level_lived_card_table",1,"14-card-table-corner");
        kit(s,house,"level_lived_pantry",11,"15-cellar-stores");
        var socket=house.level().socket("hide",6);house.configureHiding(100);
        var cupboard=new Prop("level_hiding_cupboard",6,socket.x(),socket.y(),socket.z(),1,socket.yaw(),.85,.70,2.3,"hide");
        view(s,house,cupboard,"16-cupboard-available-100");house.configureHiding(0);view(s,house,cupboard,"17-cupboard-absent-0");
        HouseMap farm=new HouseMap(HouseMap.Site.FARMHOUSE);s=camera();
        for(var p:farm.level().portals())if(p.door())farm.openDoorBetweenRooms(p.a(),p.b());
        kit(s,farm,"level_lived_pantry",2,"12-pantry-and-preserves");
        kit(s,farm,"level_workbench",10,"13-barn-workbench");
        kit(s,farm,"level_lived_pantry",9,"14-root-cellar-storage");
    }
}
