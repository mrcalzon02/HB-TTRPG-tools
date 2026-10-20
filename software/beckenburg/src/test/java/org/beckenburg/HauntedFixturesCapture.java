package org.beckenburg;
import java.nio.file.*;
import javax.imageio.ImageIO;
/** Actual placed-device and filling-water views; no concept-image substitutes. */
public final class HauntedFixturesCapture {
    static void capture(HouseMap map,HauntedFixtures.Kind kind,String label,boolean active,int waterTicks)throws Exception{
        var f=map.fixtures().states().stream().filter(s->s.kind()==kind).findFirst().orElseThrow();
        var o=HauntedFixturesTest.operator(map,f);
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
