package org.beckenburg;
import java.util.*;
/** Real mounted devices, event authorization, filling/draining and distinct positional cue sources. */
public final class HauntedFixturesTest {
    static LooseClutter.Observer operator(HouseMap map,HauntedFixtures.State f){
        var r=map.level().room(f.room());
        for(double d:new double[]{.7,1,1.4})for(int n=0;n<24;n++){
            double x=f.x()+Math.cos(n*Math.PI/12)*d,z=f.z()+Math.sin(n*Math.PI/12)*d;
            if(map.roomAt(x,r.y(),z)!=r.id()||!map.traversable(x,r.y(),z))continue;
            double dx=f.x()-x,dz=f.z()-z;
            var o=new LooseClutter.Observer(0,x,r.y(),z,Math.atan2(-dx,dz),Math.atan2(f.y()+.1-r.y()-1.62,Math.hypot(dx,dz)),true);
            var aimed=map.fixtures().aimed(x,r.y(),z,o.yaw(),o.pitch());if(aimed!=null&&aimed.id()==f.id())return o;
        }throw new AssertionError("No real reachable operating point: "+map.site()+" "+f.kind()+" room "+r.name());
    }
    public static void main(String[] args){
        for(var site:AuthoredTestSupport.SITES){
            var map=new HouseMap(site);var fixtures=map.fixtures();
            LooseClutterTest.check(fixtures.states().stream().filter(f->f.kind()==HauntedFixtures.Kind.FIRE_ALARM).count()==12,"each indoor room needs an individually placed alarm");
            for(var f:fixtures.states()){
                if(f.kind().mesh()!=null)LooseClutterTest.check(!GlbProps.model(f.kind().mesh()).triangles().isEmpty(),"missing actual fixture mesh");
                var o=operator(map,f);fixtures.toggle(f.id(),o,1);LooseClutterTest.check(fixtures.state(f.id()).active(),"player activation");fixtures.toggle(f.id(),o,2);
                if(f.kind()==HauntedFixtures.Kind.FIRE_ALARM){
                    var room=map.level().room(f.room());LooseClutterTest.check(Math.abs(f.y()-room.y()-2)<.001,"wall alarm mount elevation");
                    for(var p:map.level().portals())if(!p.kind().equals("stair")&&Math.abs(p.y()-room.y())<.1&&(p.a()==f.room()||p.b()==f.room()))
                        LooseClutterTest.check(!(p.alongX()?Math.abs(f.z()-p.z())<.2&&Math.abs(f.x()-p.x())<p.width()/2+.15:Math.abs(f.x()-p.x())<.2&&Math.abs(f.z()-p.z())<p.width()/2+.15),"alarm floats in a window/door opening");
                }
            }
            var stable=fixtures.states();map.configureHiding(0);for(var door:map.level().portals())if(door.door())map.openDoorBetweenRooms(door.a(),door.b());LooseClutterTest.check(stable.equals(fixtures.states()),"door/difficulty changes must not relocate fixtures");map.configureHiding(100);for(var f:fixtures.states())operator(map,f);
            for(String frame:fixtures.frames())LanProtocol.parts(frame);
            System.out.println("PASS "+site+": "+fixtures.states().size()+" physically mounted and reachable devices, including 12 room alarms");
        }
        var map=new HouseMap();var fx=map.fixtures();var sink=fx.states().stream().filter(f->f.kind()==HauntedFixtures.Kind.SINK_BATH).findFirst().orElseThrow();
        var rejected=new GhostDomain.Resolution(false,"cooldown",GhostDomain.Action.DISTURB,sink.room(),0,0,0,false);
        fx.witness(rejected,1,sink.id());LooseClutterTest.check(!fx.state(sink.id()).active(),"rejected ghost event must not activate fixture");
        fx.activate(sink.id(),sink.room(),1);
        int waterSounds=0;for(int tick=2;tick<=101;tick++)for(var s:fx.advance(tick))if(s.cue()==LanSound.Cue.RUNNING_WATER)waterSounds++;
        LooseClutterTest.check(fx.state(sink.id()).water()==600&&waterSounds>0,"running tap must audibly fill real basin over time");
        fx.toggle(sink.id(),operator(map,sink),102);for(int tick=103;tick<=180;tick++)fx.advance(tick);
        LooseClutterTest.check(!fx.state(sink.id()).active()&&fx.state(sink.id()).water()==0,"player stops tap and basin drains");
        LooseClutterTest.rejects(()->fx.activate(sink.id(),(sink.room()+1)%12,200));
        LooseClutterTest.rejects(()->fx.toggle(sink.id(),new LooseClutter.Observer(0,0,0,0,0,0,true),200));
        for(var source:GhostDomain.Source.values()){
            var domain=new GhostDomain(map,sink.room(),GhostIdentity.Type.SPIRIT);domain.advance(1,sink.room(),1);
            var accepted=domain.dispatch(new GhostDomain.Command(GhostDomain.Action.DISTURB,sink.room(),1,source));
            LooseClutterTest.check(accepted.applied(),"accepted common ghost dispatch");fx.witness(accepted,200,sink.id());LooseClutterTest.check(fx.state(sink.id()).active(),"both AI and human ghost events activate fixture");
        }
        fx.advance(401);LooseClutterTest.check(!fx.state(sink.id()).active(),"bounded event duration");
        var remote=new HouseMap().fixtures();for(String frame:fx.frames())remote.accept(LanProtocol.parts(frame));
        LooseClutterTest.check(remote.states().equals(fx.states()),"late-join authoritative fixture replay");
        Set<Integer> hashes=new HashSet<>();for(var cue:new LanSound.Cue[]{LanSound.Cue.PHONE_RING,LanSound.Cue.ALARM_BELL,LanSound.Cue.FIRE_BELL,LanSound.Cue.RADIO_PLAY,LanSound.Cue.RUNNING_WATER}){
            byte[] pcm=LanAudio.synthesize(new LanSound.CueEvent(cue,0,80,10));LooseClutterTest.check(pcm.length>4000,"actual generated audio");hashes.add(Arrays.hashCode(pcm));}
        LooseClutterTest.check(hashes.size()==5,"device types need distinct audio");
        System.out.println("PASS authorized AI/human activation, manual switches, rejected events/reach, timed ringing, water filling/draining, bounded replication and five distinct soundscapes");
    }
}
