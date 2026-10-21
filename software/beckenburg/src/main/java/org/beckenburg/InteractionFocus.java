package org.beckenburg;
import java.awt.*;
import java.util.*;
import java.util.List;

/** One centre-ray target shared by the prompt and authoritative interaction. */
public final class InteractionFocus {
    private InteractionFocus(){}
    public enum Kind { CLUTTER,FIXTURE,RACK,INTERFACE,SWITCH,BREAKER,DOOR,WINDOW,VAN_DOOR }
    public record Target(Kind kind,String id,String name,double distance){}
    private record Mesh(List<GlbProps.Triangle> triangles,VanInteriorLayout.Bounds bounds){}
    private static final Map<String,Mesh> meshes=new HashMap<>();
    private static List<VanRackStock.Entry> lastStock=List.of();private static List<VanRackStock.Placed> lastPlaced=List.of();
    public static synchronized List<VanRackStock.Placed> placements(List<VanRackStock.Entry> stock){
        if(!stock.equals(lastStock)){lastPlaced=VanRackStock.place(stock);lastStock=List.copyOf(stock);}return lastPlaced;
    }
    private static synchronized Mesh mesh(String id){return meshes.computeIfAbsent(id,key->{
        var triangles=GlbProps.model(key).triangles();
        if(key.equals("monitoring_screen_mp_1"))triangles=triangles.stream().map(t->new GlbProps.Triangle(VanInteriorLayout.vertex(key,t.a()),VanInteriorLayout.vertex(key,t.b()),VanInteriorLayout.vertex(key,t.c()),t.material())).toList();
        return new Mesh(triangles,VanInteriorLayout.bounds(key));});}
    private static double[] ray(LooseClutter.Observer o){return new double[]{o.x(),o.y()+1.62,o.z(),Math.sin(o.yaw())*Math.cos(o.pitch()),Math.sin(o.pitch()),Math.cos(o.yaw())*Math.cos(o.pitch())};}
    private static double box(double[] r,VanInteriorLayout.Bounds b){
        double near=0,far=2.05;double[] lo={b.x0(),b.y0(),b.z0()},hi={b.x1(),b.y1(),b.z1()};
        for(int n=0;n<3;n++){if(Math.abs(r[n+3])<1e-10){if(r[n]<lo[n]||r[n]>hi[n])return Double.POSITIVE_INFINITY;}
            else {double a=(lo[n]-r[n])/r[n+3],c=(hi[n]-r[n])/r[n+3];near=Math.max(near,Math.min(a,c));far=Math.min(far,Math.max(a,c));if(far<near)return Double.POSITIVE_INFINITY;}}
        return near;
    }
    private static double triangle(double[] r,GlbProps.Vertex a,GlbProps.Vertex b,GlbProps.Vertex c){
        double ex=b.x()-a.x(),ey=b.y()-a.y(),ez=b.z()-a.z(),fx=c.x()-a.x(),fy=c.y()-a.y(),fz=c.z()-a.z();
        double px=r[4]*fz-r[5]*fy,py=r[5]*fx-r[3]*fz,pz=r[3]*fy-r[4]*fx,det=ex*px+ey*py+ez*pz;
        if(Math.abs(det)<1e-10)return Double.POSITIVE_INFINITY;double inv=1/det,tx=r[0]-a.x(),ty=r[1]-a.y(),tz=r[2]-a.z();
        double u=(tx*px+ty*py+tz*pz)*inv;if(u<0||u>1)return Double.POSITIVE_INFINITY;
        double qx=ty*ez-tz*ey,qy=tz*ex-tx*ez,qz=tx*ey-ty*ex,v=(r[3]*qx+r[4]*qy+r[5]*qz)*inv;
        if(v<0||u+v>1)return Double.POSITIVE_INFINITY;double t=(fx*qx+fy*qy+fz*qz)*inv;return t>.025?t:Double.POSITIVE_INFINITY;
    }
    private static double[] local(double[] r,double x,double y,double z,double yaw,double sx,double sy,double sz,double roll,double half){
        double[] q=new double[6];double co=Math.cos(yaw),sn=Math.sin(yaw),cr=Math.cos(roll),sr=Math.sin(roll);
        for(int n=0;n<2;n++){double dx=r[n*3]-(n==0?x:0),dy=r[n*3+1]-(n==0?y:0),dz=r[n*3+2]-(n==0?z:0),rx=dx*co+dz*sn;
            q[n*3]=(rx*cr+dy*sr)/sx;q[n*3+1]=(-rx*sr+dy*cr)/sy+(n==0?half:0);q[n*3+2]=(-dx*sn+dz*co)/sz;}
        return q;
    }
    private static double hit(String id,double[] r,double x,double y,double z,double yaw,double sx,double sy,double sz,double roll,double half){
        if(Math.hypot(r[0]-x,r[2]-z)>5)return Double.POSITIVE_INFINITY;
        Mesh m=mesh(id);double[] q=local(r,x,y,z,yaw,sx,sy,sz,roll,half);
        if(!Double.isFinite(box(q,m.bounds)))return Double.POSITIVE_INFINITY;double distance=Double.POSITIVE_INFINITY;
        for(var t:m.triangles)distance=Math.min(distance,triangle(q,t.a(),t.b(),t.c()));return distance;
    }
    private static double hit(String id,double[] r,double x,double y,double z,double yaw,double scale){return hit(id,r,x,y,z,yaw,scale,scale,scale,0,0);}
    private static String label(String id){String s=id.replace('_',' ').toLowerCase(Locale.ROOT);return Character.toUpperCase(s.charAt(0))+s.substring(1);}
    private static void candidate(List<Target> list,Kind kind,String id,String name,double distance){if(distance<=2.0)list.add(new Target(kind,id,name,distance));}
    public static Target pick(HouseMap map,LooseClutter.Observer observer,List<VanRackStock.Entry> stock){
        if(!observer.exposed()||!Double.isFinite(observer.x()+observer.y()+observer.z()+observer.yaw()+observer.pitch())||Math.abs(observer.pitch())>1.4)return null;
        double[] r=ray(observer);List<Target> targets=new ArrayList<>();double blocker=Double.POSITIVE_INFINITY;
        for(var item:map.clutter().states())if(item.holder()==-1&&map.clutter().held(observer.seat())<0)candidate(targets,Kind.CLUTTER,""+item.id(),label(item.kind().name()),hit(item.kind().mesh(),r,item.x(),item.y(),item.z(),item.yaw(),1,1,1,item.roll(),item.kind().half));
        for(var f:map.fixtures().states())if(f.kind().mesh()!=null)candidate(targets,Kind.FIXTURE,""+f.id(),label(f.kind().name()),hit(f.kind().mesh(),r,f.x(),f.y(),f.z(),f.yaw(),1));
        for(var prop:map.level().props()){
            double distance=hit(prop.mesh(),r,prop.x(),prop.y(),prop.z(),prop.yaw(),prop.scale());blocker=Math.min(blocker,distance);
            for(var f:map.fixtures().states())if(f.kind().mesh()==null&&f.room()==prop.room()&&((f.kind()==HauntedFixtures.Kind.SINK_BATH&&prop.mesh().equals("level_bath_basin"))||(f.kind()==HauntedFixtures.Kind.SINK_KITCHEN&&prop.mesh().equals("level_kitchen_counter")))){
                if(distance<2&&Math.hypot(r[0]+r[3]*distance-f.x(),r[2]+r[5]*distance-f.z())<.48)candidate(targets,Kind.FIXTURE,""+f.id(),f.kind()==HauntedFixtures.Kind.SINK_BATH?"Bathroom sink":"Kitchen sink",distance);
            }
        }
        for(var socket:map.level().sockets()){
            if(socket.type().equals("switch"))candidate(targets,Kind.SWITCH,""+socket.room(),map.roomName(socket.room())+" light switch",hit("light_switch_1",r,socket.x(),socket.y(),socket.z(),-socket.yaw(),1));
            if(socket.type().equals("breaker")){double[] q=local(r,socket.x(),socket.y(),socket.z(),-socket.yaw(),1,1,1,0,0);candidate(targets,Kind.BREAKER,socket.id(),"Electrical breaker",box(q,new VanInteriorLayout.Bounds(-.24,-.38,0,.24,.38,.19)));}
            if(socket.type().equals("hide")&&LevelClosets.available(map.level(),socket.room(),map.hidingDensity()))blocker=Math.min(blocker,hit("level_hiding_cupboard_worn",r,socket.x(),socket.y(),socket.z(),socket.yaw(),1));
        }
        for(var p:map.level().portals())if(p.door()){
            double angle=p.alongX()?0:Math.PI/2,hx=p.x()+(p.alongX()?p.width()/2:0),hz=p.z()+(p.alongX()?0:p.width()/2),leaf=p.width()>1.5?p.width()/2:p.width();
            double t=hit("door_1_loose",r,hx,p.y(),hz,angle+(map.doorOpen(p.id())?Math.PI/2:0),leaf,2.28/2.1,1,0,0);
            if(p.width()>1.5)t=Math.min(t,hit("door_1_loose",r,p.x()-(p.alongX()?p.width()/2:0),p.y(),p.z()-(p.alongX()?0:p.width()/2),angle+Math.PI-(map.doorOpen(p.id())?Math.PI/2:0),leaf,2.28/2.1,1,0,0));
            candidate(targets,Kind.DOOR,""+p.id(),map.doorOpen(p.id())?"Close door":"Open door",t);
        }else if(p.kind().equals("window")){
            double angle=(p.alongX()?0:Math.PI/2)+(map.windowOpen(p.id())?.95:0),x=p.x()-(p.alongX()?p.width()/2:0),z=p.z()-(p.alongX()?0:p.width()/2);
            double[] q=local(r,x,p.y()+1.02,z,angle,1,1,1,0,0);double t=Double.POSITIVE_INFINITY;
            for(double bar:new double[]{0,p.width()/2,p.width()})t=Math.min(t,box(q,new VanInteriorLayout.Bounds(bar-.018,0,-.018,bar+.018,1.31,.018)));
            for(double bar:new double[]{0,.655,1.31})t=Math.min(t,box(q,new VanInteriorLayout.Bounds(0,bar-.018,-.018,p.width(),bar+.018,.018)));
            candidate(targets,Kind.WINDOW,""+p.id(),map.windowOpen(p.id())?"Close window":"Open window",t);
        }
        var van=map.van();var button=van.doorButton();candidate(targets,Kind.VAN_DOOR,"cargo",van.cargoDoorClosed()?"Open van doors":"Close van doors",hit("button_12",r,button.x(),VanStaging.FLOOR_Y+1.2,button.z(),van.placement().yaw()+Math.PI/2,.30));
        for(var f:VanInteriorLayout.FIXTURES){var p=van.world(f.localX(),f.localZ());double t=hit(f.mesh(),r,p.x(),f.y(),p.z(),van.placement().yaw()+f.yaw(),f.scale());
            if(f.mount()==VanInteriorLayout.Mount.WALL||f.mount()==VanInteriorLayout.Mount.BULKHEAD||f.purpose().equals("desk keyboard")){
                String id=f.purpose().contains("board")?"BRIEFING":f.purpose().equals("site map")?"MAP":f.purpose().contains("command")||f.purpose().equals("desk keyboard")?"COMPUTER":"RELAY";
                candidate(targets,Kind.INTERFACE,id,label(f.purpose()),t);
            }else blocker=Math.min(blocker,t);
        }
        double[] vr=local(r,van.placement().x(),0,van.placement().z(),van.placement().yaw(),1,1,1,0,0);
        for(var item:placements(stock)){
            var b=item.bounds();double t=Double.POSITIVE_INFINITY;
            // Test the actual rotated model; the bounds only reject unrelated shelf units.
            double[] sizes={b.x1()-b.x0(),b.y1()-b.y0(),b.z1()-b.z0()};
            var volume=new VanInteriorLayout.Bounds(item.x()-sizes[item.axisX()]/2,item.y()-sizes[item.axisY()]/2,item.z()-sizes[item.axisZ()]/2,item.x()+sizes[item.axisX()]/2,item.y()+sizes[item.axisY()]/2,item.z()+sizes[item.axisZ()]/2);
            if(Double.isFinite(box(vr,volume)))for(var face:GlbProps.model(item.entry().model()).triangles())t=Math.min(t,triangle(vr,item.vertex(face.a()),item.vertex(face.b()),item.vertex(face.c())));
            blocker=Math.min(blocker,t);
            if(FieldEquipment.functional(item.entry().id())||item.entry().id().equals("HEALTH_SUPPLIES")||item.entry().id().equals("SANITY_MEDICATION"))candidate(targets,Kind.RACK,item.entry().id()+":"+item.entry().tier()+":"+item.unit(),label(item.entry().id())+" "+item.entry().tier(),t);
        }
        for(int row=0;row<6;row++){double y=VanStaging.FLOOR_Y+.14+row*.33,t=Math.max(0,(y+.315-VanStaging.ROOF_SHOULDER_Y)/(VanInteriorLayout.ROOF_Y-VanStaging.ROOF_SHOULDER_Y)),back=-VanStaging.INTERIOR_HALF_WIDTH+t*(VanStaging.INTERIOR_HALF_WIDTH-VanStaging.INTERIOR_ROOF_HALF_WIDTH)+.025;blocker=Math.min(blocker,box(vr,new VanInteriorLayout.Bounds(back,y-.025,-1.94,-.51,y,1.54)));}
        final double obstruction=blocker;
        return targets.stream().filter(t->t.distance<=obstruction+.015).sorted(Comparator.comparingDouble(Target::distance)).filter(t->{double d=Math.max(0,t.distance-.045);return map.clearInteractionSight(r[0],r[1],r[2],r[0]+r[3]*d,r[1]+r[4]*d,r[2]+r[5]*d,t.kind==Kind.DOOR?Integer.parseInt(t.id):-1);}).findFirst().orElse(null);
    }
    /** Draw a small vector hand so the prompt does not depend on an emoji font. */
    public static void draw(Graphics2D graphics,int width,int height,Target target){
        if(target==null)return;Graphics2D g=(Graphics2D)graphics.create();try{
            int x=width/2+17,y=height/2+19;g.setFont(new Font(Font.SANS_SERIF,Font.BOLD,14));int w=g.getFontMetrics().stringWidth(target.name)+73;
            if(x+w>width-8)x=Math.max(8,width-w-8);g.setColor(new Color(8,13,17,225));g.fillRoundRect(x-7,y-17,w,34,8,8);
            g.setColor(new Color(239,227,199));g.setStroke(new BasicStroke(2));g.drawRoundRect(x+3,y-10,4,15,3,3);g.drawRoundRect(x+8,y-8,4,13,3,3);g.drawRoundRect(x+13,y-5,4,10,3,3);g.drawArc(x-2,y-1,22,16,180,180);g.drawLine(x-2,y+6,x-5,y+1);
            g.drawRoundRect(x+27,y-11,21,22,4,4);g.drawString("E",x+33,y+5);g.drawString(target.name,x+56,y+5);
        }finally{g.dispose();}
    }
}
