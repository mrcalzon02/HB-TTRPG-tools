package org.beckenburg;
import java.util.*;
import org.beckenburg.LevelDefinition.*;
/** Authored event fixtures. Only accepted host events or physical player use change state. */
public final class HauntedFixtures {
    public enum Kind { PHONE,ALARM_CLOCK,FIRE_ALARM,RADIO,BOOM_BOX,SINK_BATH,SINK_KITCHEN;
        public String mesh(){return name().startsWith("SINK")?null:"level_event_"+name().toLowerCase(Locale.ROOT)+"_worn";}
        public LanSound.Cue cue(){return switch(this){case PHONE->LanSound.Cue.PHONE_RING;case ALARM_CLOCK->LanSound.Cue.ALARM_BELL;case FIRE_ALARM->LanSound.Cue.FIRE_BELL;case RADIO,BOOM_BOX->LanSound.Cue.RADIO_PLAY;default->LanSound.Cue.RUNNING_WATER;};}
    }
    public record State(int id,Kind kind,int room,double x,double y,double z,double yaw,boolean active,int water,int until,int revision){}
    public record Sound(State source,LanSound.Cue cue){}
    private static final class Fixture {int id,room,water,until,revision;Kind kind;double x,y,z,yaw;boolean active;
        State state(){return new State(id,kind,room,x,y,z,yaw,active,water,until,revision);}}
    private final HouseMap map;private final List<Fixture> fixtures=new ArrayList<>();
    private void add(Kind kind,int room,double x,double y,double z,double yaw){var f=new Fixture();f.id=fixtures.size()+1;f.kind=kind;f.room=room;f.x=x;f.y=y;f.z=z;f.yaw=yaw;fixtures.add(f);}
    public HauntedFixtures(HouseMap map){this.map=map;
        if(map.site()!=HouseMap.Site.HOUSE&&map.site()!=HouseMap.Site.FARMHOUSE&&map.site()!=HouseMap.Site.SCHOOL)return;
        for(var s:map.level().sockets())if(s.type().equals("device"))add(Kind.valueOf(s.style()),s.room(),s.x(),s.y(),s.z(),s.yaw());
        for(var p:map.level().props()){
            if(p.mesh().equals("bedside_table_1")){
                double x=p.x()+Math.cos(p.yaw())*.22-Math.sin(p.yaw())*.20,z=p.z()+Math.sin(p.yaw())*.22+Math.cos(p.yaw())*.20;
                add(Kind.ALARM_CLOCK,p.room(),x,p.y()+.644,z,p.yaw());
            }
            if(p.mesh().equals("level_bath_basin"))add(Kind.SINK_BATH,p.room(),p.x(),p.y()+.86,p.z(),p.yaw());
            if(p.mesh().equals("level_kitchen_counter"))add(Kind.SINK_KITCHEN,p.room(),p.x()-Math.cos(p.yaw())*.6,p.y()+.92,p.z()-Math.sin(p.yaw())*.6,p.yaw());
        }
        for(var s:map.level().sockets())if(s.type().equals("switch")){
            var r=map.level().room(s.room());double x=s.x(),z=s.z(),yaw;
            if(Math.abs(x-r.x0())<.2){x=r.x0()+.108;yaw=-Math.PI/2;}
            else if(Math.abs(x-r.x1())<.2){x=r.x1()-.108;yaw=Math.PI/2;}
            else if(Math.abs(z-r.z0())<.2){z=r.z0()+.108;yaw=0;}
            else{z=r.z1()-.108;yaw=Math.PI;}
            double best=Double.POSITIVE_INFINITY,bx=x,bz=z,byaw=yaw;
            for(int side=0;side<4;side++)for(double along=.5;along<(side<2?r.z1()-r.z0():r.x1()-r.x0())-.4;along+=.4){
                double cx=side==0?r.x0()+.108:side==1?r.x1()-.108:r.x0()+along;
                double cz=side==2?r.z0()+.108:side==3?r.z1()-.108:r.z0()+along;
                double angle=side==0?-Math.PI/2:side==1?Math.PI/2:side==2?0:Math.PI;
                boolean clear=true;
                for(var p:map.level().portals())if(!p.kind().equals("stair")&&Math.abs(p.y()-r.y())<.2&&(p.a()==r.id()||p.b()==r.id())){
                    if(p.alongX()?Math.abs(cz-p.z())<.2&&Math.abs(cx-p.x())<p.width()/2+.2:Math.abs(cx-p.x())<.2&&Math.abs(cz-p.z())<p.width()/2+.2)clear=false;
                }
                double reachX=cx-Math.sin(angle)*.8,reachZ=cz+Math.cos(angle)*.8;
                if(!map.traversable(reachX,r.y(),reachZ)||!map.clearLineOfSight(reachX,r.y()+1.62,reachZ,cx,r.y()+2.1,cz))clear=false;
                double score=Math.hypot(cx-s.x(),cz-s.z());if(clear&&score<best){best=score;bx=cx;bz=cz;byaw=angle;}
            }
            if(!Double.isFinite(best))throw new IllegalStateException("No mounted reachable fire alarm: "+map.site()+" "+r.name());
            add(Kind.FIRE_ALARM,s.room(),bx,r.y()+2.0,bz,byaw);
        }
    }
    public synchronized List<State> states(){return fixtures.stream().map(Fixture::state).toList();}
    private Fixture get(int id){return fixtures.stream().filter(f->f.id==id).findFirst().orElseThrow(()->new IllegalArgumentException("unknown fixture"));}
    public synchronized State state(int id){return get(id).state();}
    public synchronized State aimed(double x,double y,double z,double yaw,double pitch){
        State result=null;double best=1.9;
        for(var f:fixtures){double dx=f.x-x,dz=f.z-z,dy=f.y+.10-y-1.62,d=Math.sqrt(dx*dx+dy*dy+dz*dz);
            double dot=dx*(Math.sin(yaw)*Math.cos(pitch))+dy*Math.sin(pitch)+dz*Math.cos(yaw)*Math.cos(pitch);
            if(d<best&&dot>0&&dot/d>.88&&map.clearLineOfSight(x,y+1.62,z,f.x,f.y+.10,f.z)){result=f.state();best=d;}}
        return result;
    }
    public synchronized void toggle(int id,LooseClutter.Observer o,int tick){
        if(!o.exposed())throw new IllegalArgumentException("cannot use fixture now");
        var aimed=aimed(o.x(),o.y(),o.z(),o.yaw(),o.pitch());if(aimed==null||aimed.id!=id)throw new IllegalArgumentException("aim at fixture within reach");
        Fixture f=get(id);f.active=!f.active;f.until=f.active?tick+200:0;f.revision++;
    }
    public synchronized void activate(int id,int room,int tick){Fixture f=get(id);if(f.room!=room)throw new IllegalArgumentException("fixture is in another room");f.active=true;f.until=tick+200;f.revision++;}
    public synchronized void witness(GhostDomain.Resolution event,int tick,int requested){
        if(!event.applied()||!(event.action()==GhostDomain.Action.DISTURB||event.action()==GhostDomain.Action.MANIFEST||event.action()==GhostDomain.Action.SIGNATURE))return;
        if(requested>0){activate(requested,event.room(),tick);return;}
        var local=fixtures.stream().filter(f->f.room==event.room()).toList();if(local.isEmpty())return;
        activate(local.get(Math.floorMod(tick+event.room(),local.size())).id,event.room(),tick);
    }
    public synchronized List<Sound> advance(int tick){
        List<Sound> sounds=new ArrayList<>();
        for(var f:fixtures){
            if(f.active&&tick>=f.until){f.active=false;f.revision++;}
            if(f.kind.name().startsWith("SINK")){int before=f.water;f.water=Math.max(0,Math.min(1000,f.water+(f.active?6:-10)));if(f.water!=before)f.revision++;}
            int cadence=switch(f.kind){case ALARM_CLOCK->8;case PHONE,FIRE_ALARM->10;default->6;};
            if(f.active&&tick%cadence==0)sounds.add(new Sound(f.state(),f.kind.cue()));
        }return sounds;
    }
    public synchronized List<String> frames(){return fixtures.stream().map(f->"FIXTURE|"+f.id+"|"+(f.active?1:0)+"|"+f.water+"|"+f.until+"|"+f.revision).toList();}
    public synchronized void accept(List<String> p){if(p.size()!=6)throw new IllegalArgumentException("bad fixture frame");Fixture f=get(LanProtocol.integer(p.get(1),1,100));
        int revision=LanProtocol.integer(p.get(5),0,99999999);if(revision<f.revision)return;
        boolean active=LanProtocol.integer(p.get(2),0,1)==1;int water=LanProtocol.integer(p.get(3),0,1000),until=LanProtocol.integer(p.get(4),0,99999999);
        f.active=active;f.water=water;f.until=until;f.revision=revision;
    }
}
