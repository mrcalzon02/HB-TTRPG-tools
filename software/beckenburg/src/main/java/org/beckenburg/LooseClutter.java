package org.beckenburg;
import java.util.*;
import org.beckenburg.LevelDefinition.*;

/** Bounded 10 Hz host simulation, swept at 200 Hz. Clients submit intent only. */
public final class LooseClutter {
    public enum Kind {
        MUG(.10,.056,.35,"A chipped earthenware mug; tea stains mark the rim."),
        BOTTLE(.052,.14,.75,"A corked stoneware bottle with an old faded label."),
        BOOK(.14,.022,.55,"A clothbound household ledger with foxed, uneven pages."),
        TIN(.065,.085,.30,"A dented tea canister with a removable-looking fitted lid."),
        BOWL(.10,.041,.45,"A blue pottery bowl, worn around the foot and rim."),
        TOY(.105,.08,.18,"A small wooden locomotive with four carved wheels."),
        FRAME(.11,.111,.40,"An inherited easel frame containing a faded blank mount."),
        CANDLESTICK(.067,.165,.85,"A tarnished brass candlestick and an unlit wax stump.");
        final double radius,half,mass;public final String description;
        Kind(double radius,double half,double mass,String description){this.radius=radius;this.half=half;this.mass=mass;this.description=description;}
        public String mesh(){return "level_loose_"+name().toLowerCase(Locale.ROOT)+"_worn";}
    }
    public record Observer(int seat,double x,double y,double z,double yaw,double pitch,boolean exposed){}
    public record State(int id,Kind kind,double x,double y,double z,double yaw,double roll,int holder){}
    public record Hit(int seat,int damage,int object){}
    public record Noise(double x,double y,double z,double speed){}
    private final List<Noise> noises=new ArrayList<>();
    public synchronized List<Noise> drainNoises(){var result=List.copyOf(noises);noises.clear();return result;}
    private void noise(Item i,double speed){if(speed>1.2&&noises.size()<8)noises.add(new Noise(i.x,i.y,i.z,speed));}
    private static final class Item {
        int id,holder=-1,immunity,thrower=-1;Kind kind;double x,y,z,vx,vy,vz,yaw,roll,spin;boolean armed;
        Item(int id,Kind kind,double x,double bottom,double z,double yaw){this.id=id;this.kind=kind;this.x=x;this.y=bottom+kind.half;this.z=z;this.yaw=yaw;}
        State state(){return new State(id,kind,x,y,z,yaw,roll,holder);}
        double extent(){return Math.abs(Math.cos(roll))*kind.half+Math.abs(Math.sin(roll))*kind.radius;}
    }
    private final HouseMap map;private final List<Item> items=new ArrayList<>();
    private final int[] last={-1000,-1000,-1000,-1000,-1000,-1000};
    public LooseClutter(HouseMap map){this.map=Objects.requireNonNull(map);seed();}
    private void seed(){
        if(map.site()!=HouseMap.Site.HOUSE&&map.site()!=HouseMap.Site.FARMHOUSE&&map.site()!=HouseMap.Site.SCHOOL)return;
        int n=0;
        for(Prop p:map.level().props()){
            double top=switch(p.mesh()){case "dinner_table_1"->.86;case "bedside_table_1"->.64;case "coffee_table_1"->.66;case "wooden_crate_2"->1.09;default->-1;};
            if(top<0||p.room()>=12)continue;
            int count=p.mesh().equals("bedside_table_1")?1:p.mesh().equals("wooden_crate_2")?3:4;
            for(int i=0;i<count;i++){
                Kind k=count==1?Kind.MUG:count==3?(i==0?Kind.TIN:i==1?Kind.BOTTLE:Kind.BOWL):Kind.values()[n++%Kind.values().length];
                double side=count==1?-.19:count==3?-.29+i*.29:(i<2?-.63:.63),depth=count==1?.18:count==3?(i==1?-.24:.23):(i%2==0?-.32:.32);
                double x=p.x()+Math.cos(p.yaw())*side-Math.sin(p.yaw())*depth;
                double z=p.z()+Math.sin(p.yaw())*side+Math.cos(p.yaw())*depth;
                items.add(new Item(items.size()+1,k,x,p.y()+top*p.scale()+.004,z,p.yaw()+.17*i));
            }
        }
        for(Prop p:map.level().props())if(LivedAssets.base(p.mesh()).equals("level_lived_shelf")){
            for(int side:new int[]{-1,1}){
                double x=p.x()+Math.cos(p.yaw())*side*.43-Math.sin(p.yaw())*.68;
                double z=p.z()+Math.sin(p.yaw())*side*.43+Math.cos(p.yaw())*.68;
                var room=map.level().room(p.room());boolean clear=map.traversable(x,room.y(),z)&&Math.hypot(x-room.spawn().x(),z-room.spawn().z())>.75;
                for(var s:map.level().sockets())if(s.type().equals("hide")&&Math.hypot(x-s.x(),z-s.z())<1.6)clear=false;
                for(var door:map.level().portals())if(door.door()&&Math.abs(door.y()-room.y())<.2&&Math.hypot(x-door.x(),z-door.z())<1.1)clear=false;
                if(clear)items.add(new Item(items.size()+1,side<0?Kind.BOOK:room.name().toLowerCase(Locale.ROOT).contains("child")?Kind.TOY:Kind.BOTTLE,x,room.y()+.004,z,side*.35));
            }
        }
        // Toys and displaced books accumulate beside bedroom furniture, off the room route.
        for(Room room:map.level().rooms())if(room.name().toLowerCase(Locale.ROOT).contains("bedroom")){
            for(Prop p:map.level().props())if(p.room()==room.id()&&p.mesh().startsWith("bed_")){
                for(double side:new double[]{-1,1}){
                    double x=p.x()+side*1.4,z=p.z()+.7;
                    if(map.traversable(x,room.y(),z))items.add(new Item(items.size()+1,side<0?Kind.TOY:Kind.BOOK,x,room.y()+.004,z,.4));
                }break;
            }
        }
    }
    public synchronized List<State> states(){return items.stream().map(Item::state).toList();}
    private Item item(int id){return items.stream().filter(i->i.id==id).findFirst().orElseThrow(()->new IllegalArgumentException("unknown clutter object"));}
    public synchronized int held(int seat){return items.stream().filter(i->i.holder==seat).mapToInt(i->i.id).findFirst().orElse(-1);}
    public synchronized State aimed(Observer o){
        double best=2.0;State result=null;
        for(Item i:items)if(i.holder==-1){
            double dx=i.x-o.x,dy=i.y-o.y-1.62,dz=i.z-o.z,d=Math.sqrt(dx*dx+dy*dy+dz*dz);
            double dot=dx*(-Math.sin(o.yaw)*Math.cos(o.pitch))+dy*Math.sin(o.pitch)+dz*Math.cos(o.yaw)*Math.cos(o.pitch);
            if(d<best&&dot>0&&dot/d>.91&&map.clearLineOfSight(o.x,o.y+1.62,o.z,i.x,i.y,i.z)){best=d;result=i.state();}
        }return result;
    }
    public synchronized void action(String action,int id,Observer o,int tick){
        if(o.seat<0||o.seat>=6||!o.exposed||!Double.isFinite(o.pitch)||Math.abs(o.pitch)>1.4)throw new IllegalArgumentException("cannot handle clutter now");
        if(tick<=last[o.seat])throw new IllegalArgumentException("object action cooling down");
        Item i=item(id);
        if(action.equals("TAKE")){
            State aimed=aimed(o);if(held(o.seat)>=0||aimed==null||aimed.id!=id)throw new IllegalArgumentException("aim at an unheld object within two metres");
            i.holder=o.seat;i.armed=false;i.vx=i.vy=i.vz=i.spin=0;carry(i,o);
        }else{
            if(i.holder!=o.seat)throw new IllegalArgumentException("object is not in your hand");
            if(action.equals("ROTATE")){i.yaw+=.35;i.roll+=.20;}
            else if(action.equals("DROP")||action.equals("THROW")){
                carry(i,o);i.holder=-1;i.thrower=o.seat;i.immunity=5;i.armed=false;
                double speed=action.equals("THROW")?6:0;
                i.vx=-Math.sin(o.yaw)*Math.cos(o.pitch)*speed;i.vz=Math.cos(o.yaw)*Math.cos(o.pitch)*speed;i.vy=Math.sin(o.pitch)*speed;
                i.spin=action.equals("THROW")?4:0;
            }else throw new IllegalArgumentException("invalid clutter action");
        }last[o.seat]=tick;
    }
    private void carry(Item i,Observer o){
        double x=o.x-Math.sin(o.yaw)*.62,z=o.z+Math.cos(o.yaw)*.62,y=o.y+1.35;
        if(map.clearLineOfSight(o.x,o.y+1.35,o.z,x,y,z)){i.x=x;i.y=y;i.z=z;}
        else{i.x=o.x;i.y=y;i.z=o.z;}
    }
    /** Accepted DISTURB only. Held possessions are never stolen; no object means no projectile. */
    public synchronized int barrage(int room,List<Observer> observers){
        int count=0;
        for(Item i:items)if(i.holder==-1&&!i.armed&&map.roomAt(i.x,i.y-i.extent(),i.z)==room){
            Observer target=null;double distance=Double.POSITIVE_INFINITY;
            for(Observer o:observers)if(o.exposed&&map.roomAt(o.x,o.y,o.z)==room){
                double d=Math.hypot(i.x-o.x,i.z-o.z);if(d<distance&&d>.45&&d<12&&map.clearLineOfSight(i.x,i.y,i.z,o.x,o.y+1,o.z)){target=o;distance=d;}
            }
            if(target==null)continue;
            double flight=Math.max(.18,distance/7),dx=target.x-i.x,dz=target.z-i.z;
            i.vx=dx/flight;i.vz=dz/flight;i.vy=(target.y+1.0-i.y+4.9*flight*flight)/flight;
            i.armed=true;i.thrower=-1;i.immunity=0;i.spin=5;
            if(++count==3)break;
        }return count;
    }
    private double support(Item i,double before,double after){
        double best=-100;
        for(Room r:map.level().rooms())if(i.x>=r.x0()&&i.x<=r.x1()&&i.z>=r.z0()&&i.z<=r.z1()
                &&!map.level().floorVoid(i.x,r.y(),i.z)&&r.y()<=before+.01&&r.y()>=after-.02)best=Math.max(best,r.y());
        for(Stair s:map.level().stairs())if(s.contains(i.x,i.z,0)){double y=s.yAt(i.x,i.z);if(y<=before+.01&&y>=after-.02)best=Math.max(best,y);}
        for(Collider c:map.level().colliders()){
            double dx=i.x-c.x(),dz=i.z-c.z(),x=dx*Math.cos(c.yaw())+dz*Math.sin(c.yaw()),z=-dx*Math.sin(c.yaw())+dz*Math.cos(c.yaw());
            double y=c.y()+c.height();if(Math.abs(x)<c.halfX()&&Math.abs(z)<c.halfZ()&&y<=before+.01&&y>=after-.02)best=Math.max(best,y);
        }return best;
    }
    public synchronized List<Hit> advance(List<Observer> observers){
        List<Hit> hits=new ArrayList<>();
        for(Item i:items){
            if(i.holder>=0){Observer o=observers.stream().filter(p->p.seat==i.holder&&p.exposed).findFirst().orElse(null);
                if(o==null){i.holder=-1;i.vy=0;}else{carry(i,o);continue;}}
            if(i.immunity>0)i.immunity--;
            for(int step=0;step<20;step++){
                double dt=.005,extent=i.extent(),ox=i.x,oy=i.y,oz=i.z;
                i.vy-=9.8*dt;double nx=ox+i.vx*dt,ny=oy+i.vy*dt,nz=oz+i.vz*dt;
                double floor=support(i,oy-extent,ny-extent);
                if(i.vy<0&&floor>-99){noise(i,Math.abs(i.vy));ny=floor+extent+.001;i.vy=Math.abs(i.vy)<.8?0:-i.vy*.24;i.vx*=.78;i.vz*=.78;i.spin*=.75;}
                if(!map.clearObjectPath(ox,oy,oz,nx,oy,oz,i.kind.radius,extent)){noise(i,Math.abs(i.vx));i.vx*=-.3;nx=ox;}
                if(!map.clearObjectPath(nx,oy,oz,nx,oy,nz,i.kind.radius,extent)){noise(i,Math.abs(i.vz));i.vz*=-.3;nz=oz;}
                if(ny>oy&&!map.clearObjectPath(ox,oy,oz,nx,ny,nz,i.kind.radius,extent)){noise(i,Math.abs(i.vy));i.vy*=-.25;ny=oy;}
                i.x=nx;i.y=ny;i.z=nz;
                double speed=Math.sqrt(i.vx*i.vx+i.vy*i.vy+i.vz*i.vz);
                if(speed>2)for(Observer o:observers)if(o.exposed&&!(i.immunity>0&&o.seat==i.thrower)&&i.y>o.y+.15&&i.y<o.y+1.8
                        &&Math.hypot(i.x-o.x,i.z-o.z)<i.kind.radius+.25){
                    if(i.armed)hits.add(new Hit(o.seat,Math.min(15,Math.max(1,(int)Math.round(i.kind.mass*speed*1.8))),i.id));
                    i.armed=false;i.vx*=-.2;i.vz*=-.2;i.vy*=.2;break;
                }
                if(speed>.35)i.roll+=i.spin*dt;else{i.spin=0;i.roll*=.92;}
                i.vx*=.999;i.vz*=.999;
                if(i.y< -20){i.holder=-2;i.armed=false;i.vx=i.vy=i.vz=0;break;}
            }
        }
        // Inelastic contact between independent loose bodies.
        for(int a=0;a<items.size();a++)for(int b=a+1;b<items.size();b++){
            Item i=items.get(a),j=items.get(b);if(i.holder!=-1||j.holder!=-1||Math.abs(i.y-j.y)>i.extent()+j.extent())continue;
            double dx=i.x-j.x,dz=i.z-j.z,d=Math.hypot(dx,dz),r=i.kind.radius+j.kind.radius;
            if(d>.001&&d<r){double push=Math.min(.015,(r-d)*.25),ux=dx/d,uz=dz/d;
                if(map.clearObjectPath(i.x,i.y,i.z,i.x+ux*push,i.y,i.z+uz*push,i.kind.radius,i.extent())){i.x+=ux*push;i.z+=uz*push;}
                if(map.clearObjectPath(j.x,j.y,j.z,j.x-ux*push,j.y,j.z-uz*push,j.kind.radius,j.extent())){j.x-=ux*push;j.z-=uz*push;}
                double impulse=((i.vx-j.vx)*dx+(i.vz-j.vz)*dz)/d;
                if(impulse<0){double q=-(1.25)*impulse/(1/i.kind.mass+1/j.kind.mass);i.vx+=q*dx/d/i.kind.mass;i.vz+=q*dz/d/i.kind.mass;j.vx-=q*dx/d/j.kind.mass;j.vz-=q*dz/d/j.kind.mass;}}
        }return hits;
    }
    public synchronized String snapshot(boolean ghostView){
        StringJoiner rows=new StringJoiner(";");for(Item i:items){boolean hide=ghostView&&i.holder>=0;
            rows.add(i.id+","+i.kind+","+Math.round((hide?0:i.x)*1000)+","+Math.round((hide?0:i.y)*1000)+","+Math.round((hide?0:i.z)*1000)+","+Math.round(i.yaw*1000)+","+Math.round(i.roll*1000)+","+(hide?-2:i.holder));}
        return "CLUTTER|"+rows;
    }
    public synchronized void accept(String encoded){
        if(encoded.length()>48000)throw new IllegalArgumentException("clutter snapshot too large");
        List<Item> next=new ArrayList<>();Set<Integer> ids=new HashSet<>();
        if(!encoded.isEmpty())for(String row:encoded.split(";")){
            String[] v=row.split(",");if(v.length!=8)throw new IllegalArgumentException("invalid clutter state");
            int id=LanProtocol.integer(v[0],1,500);if(!ids.add(id))throw new IllegalArgumentException("duplicate object");
            Kind kind=Kind.valueOf(v[1]);Item i=new Item(id,kind,LanProtocol.integer(v[2],-1000000,1000000)/1000.0,0,LanProtocol.integer(v[4],-1000000,1000000)/1000.0,0);
            i.y=LanProtocol.integer(v[3],-100000,100000)/1000.0;i.yaw=LanProtocol.integer(v[5],-100000000,100000000)/1000.0;i.roll=LanProtocol.integer(v[6],-100000000,100000000)/1000.0;i.holder=LanProtocol.integer(v[7],-2,5);next.add(i);
        }items.clear();items.addAll(next);
    }
    public synchronized void acceptOne(String row){
        var old=new ArrayList<>(items);accept(row);Item incoming=items.get(0);items.clear();items.addAll(old);
        for(int n=0;n<items.size();n++)if(items.get(n).id==incoming.id){items.set(n,incoming);return;}
        if(items.size()>=120)throw new IllegalArgumentException("too many objects");items.add(incoming);
    }
    public synchronized String hint(Observer o){int id=held(o.seat);State s=id>=0?item(id).state():aimed(o);
        return s==null?"F5 pick up clutter / F12 throw":s.kind.description+"  [F5 "+(id>=0?"drop / ] rotate / F12 throw":"pick up")+"]";}
}
