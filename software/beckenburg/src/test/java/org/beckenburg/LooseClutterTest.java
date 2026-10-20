package org.beckenburg;
import java.util.*;
import org.beckenburg.LevelDefinition.*;
/** Ownership, actual flight/contact, floor support, walls, elevation and redacted replication. */
public final class LooseClutterTest {
    static void check(boolean yes,String why){if(!yes)throw new AssertionError(why);}
    static void rejects(Runnable action){try{action.run();throw new AssertionError("invalid action accepted");}catch(IllegalArgumentException expected){}}
    static String row(int id,LooseClutter.Kind kind,double x,double y,double z){return id+","+kind+","+Math.round(x*1000)+","+Math.round(y*1000)+","+Math.round(z*1000)+",0,0,-1";}
    static LooseClutter.Observer aim(int seat,Vec eyeFeet,LooseClutter.State object){double dx=object.x()-eyeFeet.x(),dz=object.z()-eyeFeet.z();return new LooseClutter.Observer(seat,eyeFeet.x(),eyeFeet.y(),eyeFeet.z(),Math.atan2(dx,dz),Math.atan2(object.y()-eyeFeet.y()-1.62,Math.hypot(dx,dz)),true);}
    static GhostDomain.Resolution event(GhostDomain.Action action){return new GhostDomain.Resolution(true,"accepted",action,3,80,5,0,true);}
    static int barrage(LooseClutter c,LooseClutter.Observer victim){return c.haunt(GhostIdentity.Type.POLTERGEIST,event(GhostDomain.Action.DISTURB),List.of(victim),100);}
    public static void main(String[] args)throws Exception{
        for(var site:AuthoredTestSupport.SITES){
            var map=new HouseMap(site);var c=map.clutter();check(c.states().size()>=6,"missing independent scatter "+site);
            for(var s:c.states()){
                check(!GlbProps.model(s.kind().mesh()).triangles().isEmpty(),"missing actual loose-object mesh");
                check(map.roomAt(s.x(),s.y(),s.z())>=0,"scatter outside room volumes");
            }
            for(String packet:c.snapshot(false).substring(8).split(";"))LanProtocol.parts("CLUTTER|"+packet);
            System.out.println("PASS "+site+" scattered "+c.states().size()+" independent full-mesh objects");
        }
        HouseMap map=new HouseMap();var c=map.clutter();var feet=map.spawn(3);
        Vec source=null,target=null;
        var room=map.level().room(3);
        outer:for(double x=room.x0()+1;x<room.x1()-1;x+=.3)for(double z=room.z0()+1;z<room.z1()-1;z+=.3)
            if(map.traversable(x,room.y(),z)&&map.traversable(x+2.5,room.y(),z)&&map.clearObjectPath(x,room.y()+1,z,x+2.5,room.y()+1,z,.15,.16)){
                source=new Vec(x,room.y(),z);target=new Vec(x+2.5,room.y(),z);break outer;
            }
        check(source!=null,"no real open throwing lane");
        c.accept(row(1,LooseClutter.Kind.MUG,source.x()+.7,source.y()+1.1,source.z()));
        var view=aim(0,source,c.states().get(0));c.action("TAKE",1,view,1);
        check(c.held(0)==1,"pickup");check(c.states().get(0).x()>source.x()+.5,"held object must appear ahead of the +X-facing game camera");var other=aim(1,source,c.states().get(0));rejects(()->c.action("TAKE",1,other,2));
        String redacted=c.snapshot(true);check(redacted.contains(",0,0,0,")&&redacted.endsWith(",-2"),"ghost must not receive held coordinates or owner");
        c.action("ROTATE",1,view,2);check(c.states().get(0).roll()!=0,"examine rotation");
        c.action("DROP",1,view,3);for(int t=0;t<80;t++)c.advance(List.of());
        check(Math.abs(c.states().get(0).y()-source.y()-LooseClutter.Kind.MUG.half)<.03,"dropped object must settle on actual floor");
        check(!c.drainNoises().isEmpty(),"real impacts must create sounds");
        c.accept(row(1,LooseClutter.Kind.TIN,source.x(),source.y()+1,source.z()));
        var victim=new LooseClutter.Observer(1,target.x(),target.y(),target.z(),0,0,true);
        check(barrage(c,victim)==1,"poltergeist must use an existing unheld object");
        List<LooseClutter.Hit> hits=new ArrayList<>();for(int t=0;t<25;t++)hits.addAll(c.advance(List.of(victim)));
        check(hits.size()==1&&hits.get(0).seat()==1&&hits.get(0).damage()>0,"damage requires one real swept projectile contact");
        c.accept(row(1,LooseClutter.Kind.TIN,source.x(),source.y()+1,source.z()));
        check(barrage(c,new LooseClutter.Observer(1,target.x(),target.y(),target.z(),0,0,false))==0,"hidden hunter cannot be acquired");
        check(barrage(c,victim)==1,"dodge setup");for(int t=0;t<40;t++)check(c.advance(List.of()).isEmpty(),"missed projectile causes damage");
        // Every species can scatter during sanity events; real body contact remains harmless.
        for(var type:GhostIdentity.Type.values()){
            var domain=new GhostDomain(map,3,type);domain.advance(1,3);
            var disturb=domain.dispatch(new GhostDomain.Command(GhostDomain.Action.DISTURB,3,1,GhostDomain.Source.HUMAN));
            check(disturb.applied()&&disturb.harm()==0,"disturbance bypasses projectile authority: "+type);
            for(var action:List.of(GhostDomain.Action.DISTURB,GhostDomain.Action.MANIFEST,GhostDomain.Action.SIGNATURE)){
                if(action==GhostDomain.Action.DISTURB&&type.baseType()==GhostIdentity.Type.POLTERGEIST)continue;
                String initial=row(1,LooseClutter.Kind.TIN,source.x(),source.y()+1,source.z());
                c.accept(initial);var control=new HouseMap().clutter();control.accept(initial);
                var near=new LooseClutter.Observer(1,source.x()+.1,source.y(),source.z(),0,0,true);
                check(c.haunt(type,event(action),List.of(near),100)==1,"sanity event failed to fling: "+type+" "+action);
                check(control.haunt(type,event(action),List.of(),100)==1,"scatter requires a player target");
                check(c.advance(List.of(near)).isEmpty(),"sanity fling injured player: "+type+" "+action);
                control.advance(List.of());
                var bounced=c.states().get(0);var free=control.states().get(0);
                check(Math.hypot(bounced.x()-free.x(),bounced.z()-free.z())>.01,"test must exercise actual body contact");
                for(int t=0;t<25;t++)check(c.advance(List.of(near)).isEmpty(),"delayed sanity projectile damage");
            }
        }
        c.accept(row(1,LooseClutter.Kind.TIN,source.x(),source.y()+1,source.z()));
        var rejected=new GhostDomain.Resolution(false,"cooldown",GhostDomain.Action.DISTURB,3,80,0,0,false);
        check(c.haunt(GhostIdentity.Type.POLTERGEIST,rejected,List.of(victim),100)==0,"rejected event launched object");
        check(c.sanityScatter(3,101)==1,"frenzy DREAD needs harmless environmental flings");
        for(int t=0;t<25;t++)check(c.advance(List.of(victim)).isEmpty(),"DREAD scatter armed damage");
        check(!map.clearObjectPath(source.x(),source.y()+1,source.z(),room.x0()-.5,source.y()+1,source.z(),.1,.1),"solid wall sweep");
        check(!map.clearObjectPath(source.x(),source.y()+1,source.z(),source.x(),room.y()+room.height()+.2,source.z(),.1,.1),"solid ceiling sweep");
        var upper=map.spawn(6);c.accept(row(1,LooseClutter.Kind.MUG,upper.x(),upper.y()+1,upper.z()));
        for(int t=0;t<80;t++)c.advance(List.of());check(Math.abs(c.states().get(0).y()-upper.y()-LooseClutter.Kind.MUG.half)<.03,"upper deck support");
        c.accept(row(1,LooseClutter.Kind.MUG,source.x()+.7,source.y()+1.1,source.z()));
        c.action("TAKE",1,view,10);c.action("THROW",1,view,11);
        double before=c.states().get(0).x();check(c.advance(List.of(victim)).isEmpty(),"hunter throw must not apply ghost damage");
        check(Math.abs(c.states().get(0).x()-before)>.1,"throw needs genuine travel");
        var remote=new HouseMap().clutter();for(String packet:c.snapshot(false).substring(8).split(";"))remote.acceptOne(packet);
        check(Math.abs(remote.states().get(0).x()-c.states().get(0).x())<.001,"quantized authoritative replication");
        rejects(()->remote.acceptOne("1,MUG,NaN,0,0,0,0,-1"));
        System.out.println("PASS pickup/examination/ownership, throw/drop/gravity, impact sound, swept walls/ceilings, upper floors, physical poltergeist hits/misses, ghost privacy and bounded replication");
    }
}
