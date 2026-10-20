package org.beckenburg;
import java.nio.file.*;
import javax.imageio.ImageIO;
/** Actual placed-device and filling-water views; no concept-image substitutes. */
public final class HauntedFixturesCapture {
    static void capture(HouseMap map,HauntedFixtures.Kind kind,String label,boolean active,int waterTicks)throws Exception{
        var f=map.fixtures().states().stream().filter(s->s.kind()==kind).findFirst().orElseThrow();
        var o=HauntedFixturesTest.operator(map,f);
        // Prefer the authored front, rather than the first reachable side of a radio cabinet.
        front:for(double distance:new double[]{1.1,1.4,.85})for(double offset:new double[]{0,.35,-.35,.7,-.7}){
            double x=f.x()-Math.sin(f.yaw()+offset)*distance,z=f.z()+Math.cos(f.yaw()+offset)*distance;
            double feet=map.floorY(f.room());
            if(map.roomAt(x,feet,z)!=f.room()||!map.traversable(x,feet,z))continue;
            double yaw=Math.atan2(f.x()-x,f.z()-z),pitch=Math.atan2(f.y()+.1-feet-1.62,distance);
            var aimed=map.fixtures().aimed(x,feet,z,yaw,pitch);
            if(aimed!=null&&aimed.id()==f.id()){o=new LooseClutter.Observer(0,x,feet,z,yaw,pitch,true);break front;}
        }
        if(active)map.fixtures().activate(f.id(),f.room(),1);
        for(int tick=2;tick<=waterTicks+1;tick++)map.fixtures().advance(tick);
        var scene=new SceneRenderer();scene.setRenderSize(960,600);scene.setPsxPreset(PsxPipeline.Preset.OFF);scene.roomLights=new RoomLighting();scene.environmentLight=1;scene.lamp=true;
        scene.x=o.x();scene.z=o.z();scene.eyeHeight=o.y()+1.62;scene.yaw=o.yaw();scene.pitch=o.pitch();scene.roomLightTick=100;
        scene.drawNetwork(map,java.util.List.of(),-1,0);
        ImageIO.write(scene.image(),"PNG",Path.of("development/levels/previews/runtime",map.level().id()+"-"+label+".png").toFile());
        System.out.println("CAPTURE "+kind+" active="+active+" fill="+map.fixtures().state(f.id()).water());
    }
    public static void main(String[] args)throws Exception{
        LevelVisualCapture.inspection();
        capture(new HouseMap(),HauntedFixtures.Kind.PHONE,"20-event-telephone-idle",false,0);
        capture(new HouseMap(),HauntedFixtures.Kind.ALARM_CLOCK,"21-bedside-alarm-clock",true,0);
        capture(new HouseMap(),HauntedFixtures.Kind.SINK_BATH,"22-running-and-filling-sink",true,150);
        capture(new HouseMap(),HauntedFixtures.Kind.FIRE_ALARM,"23-room-fire-alarm",true,0);
        capture(new HouseMap(HouseMap.Site.SCHOOL),HauntedFixtures.Kind.BOOM_BOX,"16-cassette-boom-box",true,0);
        capture(new HouseMap(HouseMap.Site.FARMHOUSE),HauntedFixtures.Kind.RADIO,"15-inherited-radio",true,0);
    }
}
