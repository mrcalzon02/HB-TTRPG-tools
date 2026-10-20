package org.beckenburg;

import java.nio.file.*;
import javax.imageio.ImageIO;

/** Actual software-renderer acceptance views; no concept-image substitutions. */
public final class LevelVisualCapture {
    static void inspection()throws Exception{
        // Inspection captures must not inherit the user's CRT/grain preferences.
        // Change this process only; never save over their preferences.
        var preferences=GraphicsOptions.current();
        var active=GraphicsOptions.class.getDeclaredField("active");active.setAccessible(true);
        active.set(null,new GraphicsOptions(preferences.mode(),preferences.display(),preferences.detail(),
            preferences.aspect(),preferences.upscale(),GraphicsOptions.Antialias.OFF,preferences.fieldOfView(),
            0,0,false,false,false,false));
    }
    public static void main(String[] args)throws Exception{
        inspection();
        Path out=Path.of(args.length>0?args[0]:"development/levels/previews/runtime");Files.createDirectories(out);
        HouseMap map=new HouseMap(args.length>1?HouseMap.Site.valueOf(args[1]):HouseMap.Site.HOUSE);
        SceneRenderer scene=new SceneRenderer();scene.setRenderSize(960,600);scene.setPsxPreset(PsxPipeline.Preset.OFF);
        scene.roomLights=new RoomLighting();scene.environmentLight=1.0;scene.rackStock=java.util.Set.of();
        for(var p:map.level().portals())if(p.door())map.openDoorBetweenRooms(p.a(),p.b());
        if(map.site()==HouseMap.Site.HOUSE){
            capture(scene,map,out,"01-exterior",25,0,31,20,3,18);
            capture(scene,map,out,"02-foyer",20,0,22.8,22,1.3,17);
            capture(scene,map,out,"03-living",16.6,0,23,13.7,1.1,18);
            capture(scene,map,out,"04-kitchen",16.8,0,15.3,13.3,1.0,10.5);
            capture(scene,map,out,"05-dining",23,0,14,19.2,1.0,11);
            capture(scene,map,out,"06-upper-landing",20,3,22,22.5,3.8,17);
            capture(scene,map,out,"07-master",16,3,21.7,13.7,3.8,18);
            capture(scene,map,out,"08-bathroom",19.2,3,14,22.5,3.5,11.5);
            capture(scene,map,out,"09-cellar",20,-3,22,16,-2,17);
            capture(scene,map,out,"10-main-stair",21,0,15.8,22.5,1.5,19.3);
            capture(scene,map,out,"11-cellar-stair",21,-3,22.3,19.8,-1.4,18.6);
            var child=map.spawn(7);
            capture(scene,map,out,"12-child-bedroom",child.x(),child.y(),child.z(),13.5,3.8,11.5);
        }else for(int i=0;i<12;i++){
            var r=map.level().room(i);double xx=r.x1()-.65,zz=r.z1()-.65;
            if(!map.traversable(xx,r.y(),zz)){xx=r.spawn().x();zz=r.spawn().z();}
            capture(scene,map,out,String.format("%02d-%s",i,r.name().toLowerCase().replaceAll("[^a-z0-9]+","-")),xx,r.y(),zz,r.x0()+1,r.y()+.8,r.z0()+1);
        }
        System.out.println("Runtime views saved to "+out.toAbsolutePath());
    }
    static void capture(SceneRenderer s,HouseMap map,Path out,String name,double x,double feet,double z,double tx,double ty,double tz)throws Exception{
        int room=map.roomAt(x,feet,z);
        var cupboard=map.level().socket("hide",room);
        boolean insideCupboard=cupboard!=null&&LevelClosets.available(map.level(),room,map.hidingDensity())
            &&Math.hypot(x-cupboard.x(),z-cupboard.z())<1.6;
        if(room>=0&&(!map.traversable(x,feet,z)||insideCupboard)){
            var clear=map.spawn(room);x=clear.x();z=clear.z();feet=clear.y();
        }
        s.x=x;s.z=z;s.eyeHeight=feet+1.62;s.yaw=Math.atan2(tx-x,tz-z);
        s.pitch=Math.atan2(ty-s.eyeHeight,Math.hypot(tx-x,tz-z));s.lamp=true;
        long start=System.nanoTime();s.drawNetwork(map,java.util.List.of(),-1,0);
        ImageIO.write(s.image(),"PNG",out.resolve(map.level().id()+"-"+name+".png").toFile());
        System.out.println(name+" "+((System.nanoTime()-start)/1_000_000)+"ms");
    }
}
