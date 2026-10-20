package org.beckenburg;
import java.nio.file.*;
import javax.imageio.ImageIO;
/** Actual first-person held-object and examination-rotation captures. */
public final class LooseClutterCapture {
    public static void main(String[] args)throws Exception{
        LevelVisualCapture.inspection();var map=new HouseMap();for(var p:map.level().portals())if(p.door())map.openDoorBetweenRooms(p.a(),p.b());
        var clutter=map.clutter();LooseClutter.Observer view=null;int id=-1;
        search:for(var object:clutter.states())if(object.kind()==LooseClutter.Kind.MUG){
            int room=map.roomAt(object.x(),object.y(),object.z());double y=map.floorY(room);
            if(room!=3)continue;
            for(double distance:new double[]{.85,1.1,1.4})for(int a=0;a<16;a++){
                double x=object.x()+Math.cos(a*Math.PI/8)*distance,z=object.z()+Math.sin(a*Math.PI/8)*distance;
                if(map.roomAt(x,y,z)!=room||!map.traversable(x,y,z))continue;
                boolean doorClear=true;for(var door:map.level().portals())if(door.door()&&Math.abs(door.y()-y)<.1&&Math.hypot(x-door.x(),z-door.z())<1.8)doorClear=false;
                if(!doorClear)continue;
                var o=LooseClutterTest.aim(0,new LevelDefinition.Vec(x,y,z),object);var aimed=clutter.aimed(o);
                if(aimed!=null&&aimed.id()==object.id()){view=o;id=object.id();break search;}
            }
        }
        if(view==null)throw new AssertionError("no physically reachable mug to examine");
        var scene=new SceneRenderer();scene.setRenderSize(960,600);scene.setPsxPreset(PsxPipeline.Preset.OFF);scene.roomLights=new RoomLighting();scene.environmentLight=1;scene.lamp=true;
        scene.x=view.x();scene.z=view.z();scene.eyeHeight=view.y()+1.62;scene.yaw=view.yaw();scene.pitch=Math.atan2(-.27,.62);
        var path=Path.of("development/levels/previews/runtime");
        clutter.action("TAKE",id,view,1);scene.drawNetwork(map,java.util.List.of(),-1,0);ImageIO.write(scene.image(),"PNG",path.resolve("house-18-examined-loose-mug.png").toFile());
        for(int tick=2;tick<=5;tick++)clutter.action("ROTATE",id,view,tick);
        scene.drawNetwork(map,java.util.List.of(),-1,0);ImageIO.write(scene.image(),"PNG",path.resolve("house-19-rotated-loose-mug.png").toFile());
        System.out.println("PASS actual picked-up mug and examination rotation rendered from a reachable viewpoint");
    }
}
