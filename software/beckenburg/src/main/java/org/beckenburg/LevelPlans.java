package org.beckenburg;

import java.util.ArrayList;
import java.util.List;
import org.beckenburg.LevelDefinition.*;

/** Authored metre-based buildings; no room-grid inference or random source stretching. */
public final class LevelPlans {
    private LevelPlans() { }
    public static LevelDefinition build(HouseMap.Site site) {
        return switch(site.name()) {
            case "HOUSE" -> house();
            case "MANSION" -> wing("mansion","Blackthorn Manor",10,20,26,38,3.6,
                new String[]{"Grand staircase hall","Library","Dining hall","Scullery","Ballroom","Drawing room","Morning room","Upper gallery","Master suite","Servants corridor","Attic archive","Wine cellar"},"parquet","estate");
            case "PRISON" -> wing("prison","Beckenburg Penitentiary",8,20,27,39,3.4,
                new String[]{"Main cell block","Intake lobby","Guard station","Mess hall","Secondary cell block","Infirmary","Chapel visitation","Cell gallery","Isolation wing","Records office","Upper cells","Boiler maintenance"},"concrete","prison");
            case "ASYLUM" -> wing("asylum","St. Dymphna Hospital",9,21,27,40,3.4,
                new String[]{"Central ward corridor","Admission reception","Day room","Dining ward","Patient ward","Treatment theatre","Hydrotherapy room","Upper ward gallery","Records office","Seclusion ward","Chapel","Basement boiler"},"institutional","ward");
            case "SCHOOL" -> school();
            case "FARMHOUSE" -> farm();
            case "ACADEMY" -> wing("academy","St. Alban Academy",10,21,27,39,3.6,
                new String[]{"Cloister passage","Reception hall","Lecture room","Laboratory study","Dining hall","Headmaster office","Library","Upper cloister","Dormitory west","Dormitory east","Restricted stacks","Basement archive"},"stone","academy");
            case "COLLEGE" -> wing("college","Beckenburg College",7,22,29,45,3.6,
                new String[]{"Campus concourse","Administration","Seminar classroom","Laboratory","Student union cafe","Lecture theatre","Library reading room","Upper campus bridge","Library stacks","Dormitory corridor","Tutorial room","Maintenance tunnels"},"tile","college");
            case "CHURCH" -> church();
            default -> throw new IllegalArgumentException("No authored site "+site);
        };
    }

    private static LevelDefinition house() {
        B b=new B("house","The Briar House","residential");
        b.r("Foyer",18,21,24,24,0,3,"plaster");
        b.r("Living room",12,17,18,24,0,3,"parquet");
        b.r("Family kitchen",12,10,18,17,0,3,"tile");
        b.r("Dining nook",18,10,24,15,0,3,"parquet");
        b.r("Main hall and stair",18,15,24,21,0,3,"plaster",21,18);
        b.r("Upper landing",18,15,24,24,3,3,"parquet",20,21);
        b.r("Master bedroom",12,17,18,24,3,3,"wallpaper");
        b.r("Child bedroom",12,10,18,17,3,3,"wallpaper");
        b.r("Bathroom",18,10,24,15,3,3,"tile");
        b.r("Cellar stair landing",18,15,24,24,-3,3,"brick",21,22);
        b.r("Boiler and breaker room",18,10,24,15,-3,3,"brick");
        b.r("Cellar storage",12,10,18,24,-3,3,"concrete");
        b.outdoors(6,2,30,24,30,42,"Rear yard and patio","Front porch and approach");
        b.door(0,1,18,0,22,1.15,false); b.door(1,2,15,0,17,1.15,true);
        b.door(2,3,18,0,12.5,1.15,false); b.door(3,4,21,0,15,1.15,true);
        b.door(4,0,21,0,21,1.4,true); b.door(1,4,18,0,20.5,1.1,false);
        b.door(5,6,18,3,21.5,1.1,false); b.door(5,7,18,3,16,1.1,false);
        b.door(5,8,20,3,15,1.05,true); b.door(6,7,15,3,17,1.05,true);
        b.door(9,10,20,-3,15,1.1,true); b.door(9,11,18,-3,21,1.1,false);
        b.door(10,11,18,-3,12.5,1.05,false);
        b.door(0,13,21,0,24,1.2,true); b.door(2,12,15,0,10,1.1,true);
        b.flight(4,5,22.5,15.6,22.5,20.4,0,3);
        // Keep the basement guard clear of the living-room door's approach.
        b.flight(9,4,19.8,20.4,19.8,15.6,-3,0);
        b.window(1,12,12,0,20,false); b.window(2,12,12,0,13,false);
        b.window(3,12,21,0,10,true); b.window(0,13,23,0,24,true);
        b.window(6,12,12,3,20,false); b.window(7,12,15,3,10,true);
        b.window(8,12,21,3,10,true);
        b.window(6,13,15,3,24,true);b.window(5,13,21,3,24,true);
        b.furnish();
        b.sockets.removeIf(s->s.type().equals("hide")&&s.room()==1);
        b.socket("hide",1,14.5,0,23.2,0,"behind-armchair");
        b.floorProp("level_fireplace",1,12.5,22.4,1,Math.PI/2,.775,.471,2.88);
        b.colliders.add(new Collider(18.3,0,26.6,.1,.1,2.6,0));
        b.colliders.add(new Collider(23.7,0,26.6,.1,.1,2.6,0));
        b.colliders.add(new Collider(13.4,0,29.5,6.4,.09,.85,0));
        b.colliders.add(new Collider(25.6,0,29.5,3.4,.09,.85,0));
        return b.finish(10,4);
    }

    /** Cross-wing institutions have public ground rooms, actual upper wings and a service cellar. */
    private static LevelDefinition wing(String id,String title,double left,double hall0,double hall1,double right,
            double rise,String[] names,String finish,String ambience) {
        B b=new B(id,title,ambience);
        double front=id.equals("college")?38:id.equals("mansion")?32:34;
        double back=id.equals("academy")?8:10;
        double cut1=back+(front-back)/3,cut2=back+2*(front-back)/3;
        b.r(names[0],hall0,back,hall1,front,0,rise,finish,hall0+3,front-2);
        b.r(names[1],left,cut2,hall0,front,0,rise,finish);
        b.r(names[2],left,cut1,hall0,cut2,0,rise,finish);
        b.r(names[3],left,back,hall0,cut1,0,rise,id.equals("mansion")?"tile":finish);
        b.r(names[4],hall1,cut2,right,front,0,rise,finish);
        b.r(names[5],hall1,cut1,right,cut2,0,rise,finish);
        b.r(names[6],hall1,back,right,cut1,0,rise,finish);
        b.r(names[7],hall0,back,hall1,front,rise,3,finish,hall0+3,front-2);
        b.r(names[8],left,(back+front)/2,hall0,front,rise,3,finish);
        b.r(names[9],left,back,hall0,(back+front)/2,rise,3,finish);
        b.r(names[10],hall1,back,right,front,rise,3,finish);
        b.r(names[11],left,back,right,front,-3,3,"brick",hall1+2,front-3);
        b.outdoors(left-4,back-7,right+4,front,front+7,front+19,
            id.equals("prison")?"Exercise yard":id.equals("school")?"Rear playground":id.equals("mansion")?"Rear garden terrace":"Rear quadrangle",
            id.equals("school")?"School steps and bus loop":"Front court and entrance");
        double[] zs={(cut2+front)/2,(cut1+cut2)/2,(back+cut1)/2};
        for(int i=0;i<3;i++){b.door(0,1+i,hall0,0,zs[i],1.35,false);b.door(0,4+i,hall1,0,zs[i],1.35,false);}
        b.door(1,2,(left+hall0)/2,0,cut2,1.2,true);
        b.door(2,3,(left+hall0)/2,0,cut1,1.2,true);
        b.door(4,5,(hall1+right)/2,0,cut2,1.2,true);
        b.door(5,6,(hall1+right)/2,0,cut1,1.2,true);
        b.door(7,8,hall0,rise,front-4,1.2,false);
        b.door(7,9,hall0,rise,back+4,1.2,false);
        b.door(7,10,hall1,rise,(back+front)/2,1.35,false);
        b.door(8,9,(left+hall0)/2,rise,(back+front)/2,1.1,true);
        b.door(0,13,(hall0+hall1)/2,0,front,1.8,true);
        b.door(0,12,(hall0+hall1)/2,0,back,1.4,true);
        b.flight(0,7,hall0+1.25,back+2,hall0+1.25,back+6.8,0,rise);
        b.flight(11,0,hall1-1.25,front-2,hall1-1.25,front-6.8,-3,0);
        for(int i=1;i<=3;i++)b.window(i,12,left,0,zs[i-1],false);
        for(int i=4;i<=6;i++)b.window(i,12,right,0,zs[i-4],false);
        b.window(8,12,left,rise,front-4,false);b.window(9,12,left,rise,back+4,false);
        b.window(10,12,right,rise,(back+front)/2,false);
        b.furnish();return b.finish(11,0);
    }

    private static LevelDefinition farm() {
        B b=new B("farmhouse","Hollowmere Farm","farm");
        b.r("Mudroom",20,22,26,27,0,3,"wood");
        b.r("Farm parlour",12,19,20,27,0,3,"parquet");
        b.r("Farm kitchen",12,12,20,19,0,3,"tile");
        b.r("Family dining room",20,12,26,15,0,3,"wood");
        b.r("Central stair passage",20,15,26,22,0,3,"wood",23,21);
        b.r("Upper farm landing",20,12,26,27,3,3,"wood",23,23);
        b.r("Parents bedroom",12,19,20,27,3,3,"wallpaper");
        b.r("Child bedroom",12,12,20,19,3,3,"wallpaper");
        b.r("Barn hayloft",31,16,43,24,3,3,"wood",36,22);
        b.r("Root cellar",12,12,26,27,-3,3,"brick",21,24);
        b.r("Barn interior",31,9,43,24,0,6,"wood",35,12);
        b.r("Tool shed",31,24,39,31,0,3,"wood");
        b.outdoors(5,2,48,31,37,47,"Orchard and ritual field","Farmyard and dirt lane");
        b.door(0,1,20,0,24,1.1,false);b.door(1,2,16,0,19,1.1,true);
        b.door(2,3,20,0,13.5,1.1,false);b.door(3,4,21.5,0,15,1.1,true);
        b.door(4,0,21.5,0,22,1.25,true);b.door(5,6,20,3,23,1.05,false);
        b.door(5,7,20,3,18.2,1.05,false);
        b.door(0,12,23,0,27,1.2,true);b.door(2,12,16,0,12,1.1,true);
        b.door(10,12,31,0,16,2.4,false);b.door(11,12,31,0,27,1.3,false);
        b.flight(4,5,24.5,16.1,24.5,20.9,0,3);
        b.flight(9,4,21.5,20.9,21.5,16.1,-3,0);
        b.flight(10,8,41.3,16.7,41.3,21.5,0,3);
        b.window(1,12,12,0,23,false);b.window(2,12,12,0,15,false);
        b.window(6,12,12,3,23,false);b.window(7,12,12,3,15,false);
        b.furnish();b.floorProp("level_bath_basin",5,25.4,13.5,1,-Math.PI/2,.325,.25,.86);
        b.floorProp("level_stall",10,35,14,1,0,1.415,.095,1.32);
        b.floorProp("level_stall",10,35,20,1,0,1.415,.095,1.32);
        for(double x:new double[]{33,34.5})b.floorProp("level_hay_bale",10,x,10.6,1,0,.6,.39,.69);
        for(double x:new double[]{33.2,34.7})b.floorProp("level_hay_bale",8,x,18,1,0,.6,.39,.69);
        b.floorProp("level_hay_bale",11,37.8,25.4,1,Math.PI/2,.6,.39,.69);
        for(double x:new double[]{44.5,46.2})for(double z:new double[]{4.5,6.6})
            b.floorProp("level_corn",12,x,z,1,0,.82,.795,2.243);
        return b.finish(9,4);
    }

    private static LevelDefinition school(){
        B b=new B("school","Ravenshade School","school");
        b.r("Front office and foyer",20,32,28,38,0,3.6,"tile");
        b.r("Main school corridor",20,12,28,32,0,3.6,"tile",24,21);
        b.r("Classroom A",10,24,20,38,0,3.6,"wood");
        b.r("Science classroom",10,12,20,24,0,3.6,"tile");
        b.r("Cafeteria",28,24,40,38,0,3.6,"tile");
        b.r("Nurse office",28,18,34,24,0,3.6,"tile");
        b.r("Gymnasium",34,8,46,24,0,7.2,"wood",40,15);
        b.r("Upper locker corridor",20,12,28,38,3.6,3.6,"tile",24,28);
        b.r("School library",10,24,20,38,3.6,3.6,"wood");
        b.r("Classroom B",10,12,20,24,3.6,3.6,"wood");
        b.r("Assembly hall",28,24,40,38,3.6,4.5,"wood");
        b.r("Boiler and electrical room",10,12,34,38,-3,3,"brick",30,34);
        b.outdoors(5,1,51,38,45,58,"Rear playground and blacktop","School steps and bus loop");
        b.door(0,1,24,0,32,1.8,true);b.door(0,2,20,0,35,1.35,false);
        b.door(0,4,28,0,35,1.35,false);b.door(1,2,20,0,28,1.35,false);
        b.door(1,3,20,0,18,1.35,false);b.door(1,5,28,0,21,1.2,false);
        b.door(2,3,15,0,24,1.2,true);b.door(4,5,31,0,24,1.2,true);
        b.door(4,6,37,0,24,1.8,true);b.door(5,6,34,0,21,1.35,false);
        b.door(7,8,20,3.6,31,1.35,false);b.door(7,9,20,3.6,20,1.35,false);
        b.door(7,10,28,3.6,31,1.8,false);b.door(8,9,15,3.6,24,1.2,true);
        b.door(0,13,24,0,38,1.8,true);b.door(3,12,15,0,12,1.2,true);
        b.door(6,12,40,0,8,1.8,true);
        b.flight(1,7,21.5,13.3,21.5,18.1,0,3.6);
        b.flight(11,1,26.5,30.1,26.5,25.3,-3,0);
        b.window(2,12,10,0,29,false);b.window(2,13,15,0,38,true);
        b.window(3,12,10,0,17,false);b.window(4,13,35,0,38,true);
        b.window(6,12,46,0,15,false);b.window(8,13,15,3.6,38,true);
        b.window(9,12,10,3.6,17,false);b.window(10,13,35,3.6,38,true);
        b.furnish();
        // Real teaching furniture replaces the generic dining-table placeholders.
        b.props.removeIf(p->(p.room()==2||p.room()==3||p.room()==9)&&
            (p.mesh().equals("dinner_table_1")||p.mesh().equals("chair_mp_5")||p.mesh().equals("book_mp_1")));
        for(int ri:new int[]{2,9}){
            double[] columns=ri==2?new double[]{29.5,32,34.5}:new double[]{15.5,18,20.5};
            for(int row=0;row<3;row++)for(int col=0;col<3;col++){
                if(ri==9&&row==1&&col==1)continue; // Keeps the authored central spawn aisle clear.
                double x=13.2+row*2,z=columns[col];
                b.floorProp("level_student_desk",ri,x,z,1,Math.PI/2,.55,.325,.74);
                b.floorProp("chair_mp_5",ri,x+.76,z,1,Math.PI/2,.258,.281,1.01);
            }
            b.prop("level_blackboard",ri,10.015,b.rooms.get(ri).y()+.8,ri==2?34:21,1,-Math.PI/2,1.26,.11,1.35,"wall");
        }
        for(double x:new double[]{13.3,16.8})for(double z:new double[]{14.5,21}){
            b.floorProp("level_student_desk",3,x,z,1,Math.PI/2,.55,.325,.74);
            b.floorProp("chair_mp_5",3,x+.76,z,1,Math.PI/2,.258,.281,1.01);
        }
        b.prop("level_blackboard",3,10.015,.8,21,1,-Math.PI/2,1.26,.11,1.35,"wall");
        for(double z:new double[]{23,26.3,34.6})b.floorProp("level_lockers",7,20.33,z,1,-Math.PI/2,1.213,.285,1.868);
        for(double z:new double[]{16,22,35})b.floorProp("level_lockers",7,27.67,z,1,Math.PI/2,1.213,.285,1.868);
        b.prop("level_basketball_hoop",6,45.985,3.4,16,1,Math.PI/2,0,0,1.295,"wall");
        b.colliders.add(new Collider(45.535,2.63,16,.9,.45,1.295,Math.PI/2));
        for(int row=0;row<3;row++)for(int col=0;col<4;col++)
            b.floorProp("chair_mp_5",10,30+col*2.0,27+row*2.2,1,0,.258,.281,1.01);
        b.socket("ambient",6,40,.015,16,0,"basketball-court");
        b.socket("ambient",10,34,3.62,26,0,"assembly-speaker-position");
        return b.finish(11,1);
    }

    private static LevelDefinition church() {
        B b=new B("church","St. Brigid Parish","church");
        b.r("Nave",18,12,26,34,0,6,"stone",23,30);
        b.r("Vestibule",18,34,26,39,0,3,"stone");
        b.r("Parish office",10,26,18,34,0,3,"wood");
        b.r("Confessional chamber",10,18,18,26,0,3,"wood");
        b.r("Chancel and altar",18,6,26,12,0,5,"stone");
        b.r("Side chapel",26,14,34,26,0,4,"stone");
        b.r("Vestry",26,6,34,14,0,3,"wood");
        b.r("Choir loft",18,26,26,34,3,3,"wood",23,32);
        b.r("Bell tower stair chamber",10,26,18,34,3,3,"stone",11.5,32);
        b.r("Organ archive",26,26,34,34,3,3,"wood");
        b.r("Belfry",10,26,18,34,6,3,"stone",11.5,32);
        b.r("Crypt",10,6,34,34,-3,3,"brick",27,30);
        b.outdoors(4,0,40,39,45,56,"Graveyard and rectory garden","Churchyard gate and steps");
        b.door(0,1,22,0,34,1.8,true);b.door(0,2,18,0,30,1.1,false);
        b.door(0,3,18,0,22,1.1,false);b.door(0,4,22,0,12,2,true);
        b.door(0,5,26,0,20,1.5,false);b.door(5,6,30,0,14,1.1,true);
        b.door(4,6,26,0,9,1.1,false);b.door(2,3,14,0,26,1.1,true);
        b.door(7,8,18,3,31,1.05,false);b.door(7,9,26,3,31,1.05,false);
        b.door(1,13,22,0,39,1.8,true);b.door(6,12,34,0,10,1.1,false);
        b.flight(0,7,19.2,27,19.2,31.8,0,3);
        b.flight(11,0,24.8,22.8,24.8,18,-3,0);
        b.flight(8,10,16.7,27,16.7,31.8,3,6);
        b.window(0,12,18,0,16,false);b.window(0,12,26,0,28,false);
        b.window(4,12,22,0,6,true);b.window(5,12,34,0,20,false);
        b.window(10,12,10,6,30,false);b.furnish();return b.finish(11,0);
    }

    private static final class B {
        final String id,title,ambience;
        final List<Room> rooms=new ArrayList<>(); final List<Portal> portals=new ArrayList<>();
        final List<Stair> stairs=new ArrayList<>(); final List<LevelDefinition.Void> voids=new ArrayList<>();
        final List<Prop> props=new ArrayList<>();final List<Socket> sockets=new ArrayList<>();
        final List<Collider> colliders=new ArrayList<>();
        B(String id,String title,String ambience){this.id=id;this.title=title;this.ambience=ambience;}
        void r(String n,double x0,double z0,double x1,double z1,double y,double h,String f){r(n,x0,z0,x1,z1,y,h,f,(x0+x1)/2,(z0+z1)/2);}
        void r(String n,double x0,double z0,double x1,double z1,double y,double h,String f,double sx,double sz){
            int i=rooms.size(); rooms.add(new Room(i,n,x0,z0,x1,z1,y,h,f,f.equals("parquet")||f.equals("wood")?"timber":f.equals("wallpaper")?"carpet":f.equals("plaster")?"timber":f.equals("brick")?"stone":f,new Vec(sx,y,sz)));
        }
        void outdoors(double x0,double z0,double x1,double front,double apron,double end,String rear,String entry){
            r(rear,x0,z0,x1,front,0,12,"earth",x0+2,z0+3);
            double vanX=Math.max(22,(x0+x1)/2);
            // The shared road extends twenty metres behind the cargo sill.
            // Ground support is exterior approach, not the van's ghost-safe interior.
            r(entry,Math.min(x0,vanX-21),front,x1,Math.max(end,apron+13.4),0,12,"stone",(x0+x1)/2,(front+apron)/2);
            r("Van cargo interior",vanX+VanStaging.FRONT,apron+6-VanStaging.INTERIOR_HALF_WIDTH,
                vanX+VanStaging.REAR,apron+6+VanStaging.INTERIOR_HALF_WIDTH,0,VanStaging.INTERIOR_HEIGHT,"asphalt",vanX,apron+6);
            portal(12,13,x0+2,0,front,3,true,"open");
            portal(13,14,vanX+VanStaging.FRONT,0,apron+6,VanStaging.INTERIOR_HALF_WIDTH*2-.3,false,"open");
        }
        void portal(int a,int b,double x,double y,double z,double w,boolean alongX,String kind){
            portals.add(new Portal(portals.size(),a,b,x,y,z,w,alongX,kind,kind.equals("window")?3:kind.equals("stair")?1.2:1));
        }
        void door(int a,int b,double x,double y,double z,double w,boolean alongX){portal(a,b,x,y,z,w,alongX,"door");}
        void window(int a,int b,double x,double y,double z,boolean alongX){portal(a,b,x,y,z,1.25,alongX,"window");}
        void flight(int a,int b,double x0,double z0,double x1,double z1,double y0,double y1){
            stairs.add(new Stair(stairs.size(),a,b,x0,z0,x1,z1,1.5,y0,y1,18));
            double ex=Math.abs(x1-x0)<.01?.86:.10,ez=Math.abs(z1-z0)<.01?.86:.10;
            voids.add(new LevelDefinition.Void(y1,Math.min(x0,x1)-ex,Math.min(z0,z1)+ez,Math.max(x0,x1)+ex,Math.max(z0,z1)-ez));
            portal(a,b,x0,y0,z0,1.5,Math.abs(x1-x0)<.01,"stair");
        }
        void socket(String type,int room,double x,double y,double z,double yaw,String style){
            if(type.equals("switch")||type.equals("breaker")){
                Room r=rooms.get(room);double inset=LevelDefinition.WALL_HALF_THICKNESS+.005;
                if(Math.abs(x-r.x0())<.15)x=r.x0()+inset;else if(Math.abs(x-r.x1())<.15)x=r.x1()-inset;
                if(Math.abs(z-r.z0())<.15)z=r.z0()+inset;else if(Math.abs(z-r.z1())<.15)z=r.z1()-inset;
            }
            if(style.equals("porch")&&id.equals("house"))z=24.12;
            sockets.add(new Socket(id+"-"+type+"-"+room+"-"+sockets.size(),type,room,x,y,z,yaw,style));
        }
        void prop(String mesh,int r,double x,double y,double z,double s,double yaw,double hx,double hz,double h,String support){
            if(support.equals("wall")){
                Room wall=rooms.get(r);double inset=LevelDefinition.WALL_HALF_THICKNESS+.005;
                if(Math.abs(x-wall.x0())<.15)x=wall.x0()+inset;else if(Math.abs(x-wall.x1())<.15)x=wall.x1()-inset;
                if(Math.abs(z-wall.z0())<.15)z=wall.z0()+inset;else if(Math.abs(z-wall.z1())<.15)z=wall.z1()-inset;
            }
            if(mesh.equals("carpet_mp_1"))y+=.008;
            props.add(new Prop(mesh,r,x,y,z,s,yaw,hx,hz,h,support));
        }
        void floorProp(String mesh,int ri,double x,double z,double s,double yaw,double hx,double hz,double h){prop(mesh,ri,x,rooms.get(ri).y(),z,s,yaw,hx,hz,h,"floor");}
        void furnish(){
            for(int i=0;i<12;i++){
                Room r=rooms.get(i);String n=r.name().toLowerCase(); double y=r.y(),x=r.x0()+1.2,z=r.z0()+1.2;
                socket("spawn",i,r.cx(),y,r.cz(),0,"standing");
                socket("light",i,(r.x0()+r.x1())/2,y+r.height()-.025,(r.z0()+r.z1())/2,0,
                    n.contains("barn")||n.contains("shed")||n.contains("boiler")||n.contains("cellar")||n.contains("maintenance")?"utility":ambience.equals("residential")||ambience.equals("farm")||ambience.equals("church")||ambience.equals("academy")||ambience.equals("estate")?"domestic":"utility");
                socket("evidence",i,r.cx(),y+.025,r.cz(),0,"floor-inspection");
                socket("hide",i,r.x0()+.65,y,r.z1()-.65,Math.PI/2,"recess");
                if(n.contains("living")||n.contains("parlour")||n.contains("drawing")||n.contains("day room")){
                    floorProp("sofa_1",i,x+1,z+1.2,1,0,1.3,.5025,1.16);floorProp("armchair_1",i,x,z+3.2,1,Math.PI/2,.747,.495,1.067);
                    floorProp("carpet_mp_1",i,x+1.5,z+2.4,1,0,0,0,.01);
                    floorProp("tv_table_1_4",i,x+1,z+3,.8,0,.656,.216,.592);
                    prop("book_mp_2",i,x+1,y+.592,z+3,1,0,0,0,.05,"tv_table_1_4");
                    prop("photo_frame_mp_1",i,x+1.35,y+.592,z+3,.8,0,0,0,.20,"tv_table_1_4");
                    prop("painting_1",i,r.x0()+.025,y+1.65,r.z0()+1.25,1,-Math.PI/2,0,0,.684,"wall");
                    prop("clock_1",i,r.x1()-1.2,y+2.15,r.z1()-.025,1,Math.PI,0,0,.4,"wall");
                }else if(n.contains("bedroom")||n.contains("suite")||n.contains("dormitory")||n.contains("ward")||n.contains("infirmary")||n.contains("nurse")){
                    floorProp(n.contains("child")?"bed_5":"bed_4",i,x+.4,z+.2,.82,0,1.13,.95,.8);
                    floorProp("bedside_table_1",i,r.x1()-1,z,1,0,.4,.4,.65);
                    floorProp("wardrobe_mp_1",i,r.x1()-1,r.z1()-1,.9,0,.7,.45,1.9);
                }else if(n.contains("bath")||n.contains("washroom")||n.contains("hydrotherapy")){
                    prop("toilet_mp_1",i,x,y+.235,z,1,0,.29,.45,.8,"floor-plumbing");
                    floorProp("level_bath_basin",i,r.x1()-.5,r.z0()+1.5,1,-Math.PI/2,.325,.25,.86);
                    floorProp("level_bathtub",i,r.x1()-1.1,r.z1()-.6,1,0,.8,.375,.6);
                }else if(n.contains("boiler")||n.contains("cellar")||n.contains("maintenance")||n.contains("shed")||n.contains("barn")){
                    floorProp("shelf_mp_6",i,r.x0()+1.5,r.z0()+.16,1,0,.41,.11,1.29);
                    floorProp("wooden_crate_1",i,r.x1()-1,r.z0()+1,1,0,.5,.5,1);
                }else if(n.contains("hall")||n.contains("corridor")||n.contains("passage")||n.contains("landing")||n.contains("gallery")||n.contains("concourse")||n.contains("cloister")||n.contains("nave")||n.contains("tower")||n.contains("belfry")){
                    floorProp("chair_mp_5",i,r.x0()+.55,r.z1()-1,1,Math.PI/2,.32,.34,.95);
                }else{
                    floorProp("dinner_table_1",i,x+.5,z+.5,1,0,.85,.55,.86);
                    floorProp("chair_mp_5",i,x+.5,z+1.5,1,0,.32,.34,.95);
                    prop("book_mp_2",i,x+.5,y+.87,z+.5,1,0,0,0,.1,"dinner_table_1");
                    if(n.contains("library")||n.contains("archive")||n.contains("stacks")||n.contains("office"))
                        floorProp("shelf_mp_6",i,r.x1()-1.5,r.z0()+.16,1,0,.41,.11,1.29);
                }
                if(n.contains("kitchen")||n.contains("scullery")){
                    floorProp("level_kitchen_counter",i,r.x1()-1.5,r.z0()+.4,1,0,1.2,.325,.92);
                    prop("plate_mp_1",i,x+.5,y+.87,z+.5,1,0,0,0,.03,"dinner_table_1");
                }
            }
            for(int i=12;i<15;i++){Room r=rooms.get(i);socket("spawn",i,r.cx(),0,r.cz(),0,"exterior");}
            Room rear=rooms.get(12);socket("ambient",12,rear.x0()+1,2,rear.z0()+1,0,"night-wind");
            Room entry=rooms.get(13);socket("light",13,entry.cx(),2.5,entry.z0()+.15,0,"porch");
        }
        LevelDefinition finish(int breaker,int main){
            clearCirculation();
            List<Prop> furnishingOverlays=new ArrayList<>();
            for(Prop p:props){
                if(p.mesh().equals("bed_4")||p.mesh().equals("bed_5"))
                    furnishingOverlays.add(new Prop(p.mesh().equals("bed_4")?"level_bedding_double":"level_bedding_single",p.room(),p.x(),p.y(),p.z(),p.scale(),p.yaw(),0,0,.64*p.scale(),p.mesh()));
                if(p.mesh().equals("bedside_table_1"))
                    furnishingOverlays.add(new Prop("level_table_lamp",p.room(),p.x(),p.y()+.64*p.scale(),p.z()-.08*p.scale(),1,0,0,0,.495,p.mesh()));
            }
            props.addAll(furnishingOverlays);
            for(int i=0;i<12;i++)installSwitch(i);
            Room utility=rooms.get(breaker);socket("breaker",breaker,utility.x0()+.035,utility.y()+1.35,utility.z0()+2,Math.PI/2,"electrical-panel");
            int[] ritualRooms={main,(main+3)%12,12};String[] rites={"banishment","cleansing","absolution"};
            for(int i=0;i<3;i++){Room r=rooms.get(ritualRooms[i]);socket("ritual",r.id(),r.cx(),r.y(),r.cz(),0,rites[i]);}
            for(Prop p:props)if(p.halfX()>0&&p.halfZ()>0){double off=originOffsetZ(p);colliders.add(new Collider(p.x()-Math.sin(p.yaw())*off,p.y(),p.z()+Math.cos(p.yaw())*off,p.halfX(),p.halfZ(),p.height(),p.yaw()));}
            Room van=rooms.get(14);return new LevelDefinition(id,"production-2026-10-19",title,rooms,portals,stairs,voids,props,sockets,colliders,new Dock(van.cx(),0,van.cz(),-Math.PI/2),ambience);
        }
        private boolean circulation(Prop p,double x,double z){
            Room r=rooms.get(p.room());double hx=Math.abs(Math.cos(p.yaw()))*p.halfX()+Math.abs(Math.sin(p.yaw()))*p.halfZ();
            double hz=Math.abs(Math.sin(p.yaw()))*p.halfX()+Math.abs(Math.cos(p.yaw()))*p.halfZ();
            x-=Math.sin(p.yaw())*originOffsetZ(p);z+=Math.cos(p.yaw())*originOffsetZ(p);
            double wallMargin=p.mesh().equals("level_lockers")?.005:.08;
            if(x-hx<r.x0()+wallMargin||x+hx>r.x1()-wallMargin||z-hz<r.z0()+wallMargin||z+hz>r.z1()-wallMargin)return false;
            if(Math.abs(x-r.cx())<hx+.4&&Math.abs(z-r.cz())<hz+.4)return false;
            for(Portal a:portals)if(!a.kind().equals("window")&&!a.kind().equals("stair")&&Math.abs(a.y()-p.y())<.4){
                if(a.alongX()?Math.abs(x-a.x())<hx+a.width()/2+.25&&Math.abs(z-a.z())<hz+1.0:
                    Math.abs(z-a.z())<hz+a.width()/2+.25&&Math.abs(x-a.x())<hx+1.0)return false;
            }
            for(Stair s:stairs)if(p.y()<s.y1()+2&&p.y()+p.height()>s.y0()-.05){
                if(Math.abs(s.x1()-s.x0())<.01){if(Math.abs(x-s.x0())<hx+s.width()/2+.3&&z+hz>s.z0()-.65&&z-hz<s.z1()+.65 || Math.abs(x-s.x0())<hx+s.width()/2+.3&&z+hz>Math.min(s.z0(),s.z1())-.65&&z-hz<Math.max(s.z0(),s.z1())+.65)return false;}
                else if(Math.abs(z-s.z0())<hz+s.width()/2+.3&&x+hx>Math.min(s.x0(),s.x1())-.65&&x-hx<Math.max(s.x0(),s.x1())+.65)return false;
            }
            return true;
        }
        /** Stable nearest-valid furnishing placement preserves the native mesh scale and support groups. */
        private void clearCirculation(){
            List<Prop> result=new ArrayList<>();
            for(Prop p:props){
                if(p.support().equals("wall")){result.add(p);continue;} // Authored back mounting plane stays flush.
                if(p.support().equals("wall")||p.halfX()==0||p.halfZ()==0){result.add(p);continue;}
                Prop chosen=p;
                if(!circulation(p,p.x(),p.z())||overlap(p,result)){
                    Room r=rooms.get(p.room());double distance=Double.MAX_VALUE;Prop candidate=null;
                    for(double x=r.x0()+.5;x<r.x1()-.4;x+=.4)for(double z=r.z0()+.5;z<r.z1()-.4;z+=.4){
                        Prop q=new Prop(p.mesh(),p.room(),x,p.y(),z,p.scale(),p.yaw(),p.halfX(),p.halfZ(),p.height(),p.support());
                        double d=Math.hypot(x-p.x(),z-p.z());if(d<distance&&circulation(q,x,z)&&!overlap(q,result)){candidate=q;distance=d;}
                    }
                    if(candidate==null)continue;chosen=candidate;
                }
                result.add(chosen);
            }
            // Small books/dishes follow the actual supporting table if it moved.
            for(int i=0;i<result.size();i++){Prop p=result.get(i);if(p.halfX()>0||p.support().equals("floor"))continue;
                Prop parent=result.stream().filter(q->q.room()==p.room()&&q.mesh().equals(p.support())).findFirst().orElse(null);
                if(parent!=null)result.set(i,new Prop(p.mesh(),p.room(),parent.x()+(p.mesh().startsWith("photo_frame")?.3:0),p.y(),parent.z(),p.scale(),p.yaw(),0,0,p.height(),p.support()));
            }
            result.removeIf(p->p.halfX()==0&&!p.support().equals("floor")&&!p.support().equals("wall")&&
                result.stream().noneMatch(q->q.room()==p.room()&&q.mesh().equals(p.support())));
            props.clear();props.addAll(result);
        }
        private boolean overlap(Prop p,List<Prop> placed){
            double hx=Math.abs(Math.cos(p.yaw()))*p.halfX()+Math.abs(Math.sin(p.yaw()))*p.halfZ(),hz=Math.abs(Math.sin(p.yaw()))*p.halfX()+Math.abs(Math.cos(p.yaw()))*p.halfZ();
            for(Prop q:placed)if(q.halfX()>0&&Math.abs(q.y()-p.y())<.3){
                double qx=Math.abs(Math.cos(q.yaw()))*q.halfX()+Math.abs(Math.sin(q.yaw()))*q.halfZ(),qz=Math.abs(Math.sin(q.yaw()))*q.halfX()+Math.abs(Math.cos(q.yaw()))*q.halfZ();
                if(Math.abs(q.x()-Math.sin(q.yaw())*originOffsetZ(q)-p.x()+Math.sin(p.yaw())*originOffsetZ(p))<hx+qx+.12&&Math.abs(q.z()+Math.cos(q.yaw())*originOffsetZ(q)-p.z()-Math.cos(p.yaw())*originOffsetZ(p))<hz+qz+.12)return true;
            }return false;
        }
        private double originOffsetZ(Prop p){return switch(p.mesh()){
            case "sofa_1"->.4975*p.scale();case "armchair_1"->.495*p.scale();
            case "tv_table_1_4"->-.05*p.scale();case "level_blackboard"->.11*p.scale();
            case "level_lockers"->.045*p.scale();default->0;};}

        private void installSwitch(int ri){
            Room r=rooms.get(ri);double best=-1;double[] selected=null;
            // The foyer jamb is reached below the upper flight (2.86m head clearance).
            if(id.equals("house")&&ri==4){socket("switch",ri,22.2,1.2,20.975,Math.PI,"wall-rocker");return;}
            for(int side=0;side<4;side++)for(double t=.7;t<(side<2?r.z1()-r.z0():r.x1()-r.x0())-.5;t+=.5){
                double x=side==0?r.x0()+.025:side==1?r.x1()-.025:r.x0()+t;
                double z=side==2?r.z0()+.025:side==3?r.z1()-.025:r.z0()+t;
                double sx=x+(side==0?.8:side==1?-.8:0),sz=z+(side==2?.8:side==3?-.8:0);
                boolean clear=true;
                for(Portal p:portals)if(Math.abs(p.y()-r.y())<.1&&(p.a()==ri||p.b()==ri)&&Math.hypot(p.x()-x,p.z()-z)<p.width()/2+.15)clear=false;
                for(LevelDefinition.Void v:voids)if(Math.abs(v.y()-r.y())<.1&&(v.contains(sx,sz)||v.contains(x, z)))clear=false;
                for(Stair s:stairs)if(r.y()>=s.y0()-.1&&r.y()<=s.y1()+.1&&s.contains(sx,sz,-.22)&&s.yAt(sx,sz)-r.y()<1.9)clear=false;
                for(Prop p:props)if(p.room()==ri&&p.halfX()>0&&Math.hypot(sx-p.x(),sz-p.z())<Math.max(p.halfX(),p.halfZ())+.5)clear=false;
                double score=-Math.hypot(sx-r.cx(),sz-r.cz());
                if(clear&&(selected==null||score>best)){best=score;selected=new double[]{x,z,side==0?Math.PI/2:side==1?-Math.PI/2:side==2?0:Math.PI};}
            }
            if(selected==null)throw new IllegalStateException(id+" has no accessible switch in "+r.name());
            socket("switch",ri,selected[0],r.y()+1.2,selected[1],selected[2],"wall-rocker");
        }
    }
}
