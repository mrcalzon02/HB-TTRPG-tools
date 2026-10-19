package org.beckenburg;

import java.awt.image.BufferedImage;
import java.awt.image.DataBufferInt;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/** True perspective-triangle software rasterizer, depth tested at a period-appropriate 320x200. */
public final class SceneRenderer {
    public static final int W=320,H=200;
    private static final double NEAR=.065;
    private double focal=153; // player default ~93deg; video lens is hardware-specific
    public void setFieldOfView(double degrees){
        if(!Double.isFinite(degrees)||degrees<35||degrees>135)
            throw new IllegalArgumentException("unsupported optical field of view");
        focal=(W*.5)/Math.tan(Math.toRadians(degrees/2));
    }
    public double fieldOfView(){return Math.toDegrees(2*Math.atan((W*.5)/focal));}
    private static final int[] BAYER={0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5};
    private record Point(double x,double y,double z) { }
    private record Vertex(Point p,double u,double v) { }
    private record Face(Point a,Point b,Point c,int color,int material,
                        double au,double av,double bu,double bv,double cu,double cv) { }
    private final BufferedImage frame = new BufferedImage(W,H,BufferedImage.TYPE_INT_RGB);
    private final int[] pixels=((DataBufferInt)frame.getRaster().getDataBuffer()).getData();
    private final double[] depths=new double[W*H];
    public double x=20.5,z=27.5,yaw=-Math.PI/2,pitch=-.09;
    public boolean lamp=true;
    /** Solo environment presets; default multipliers retain legacy LAN lighting. */
    public double environmentLight=1.0,fogDensity=1.0;
    public boolean environmentPowerOn=true;
    /** Authoritative book-deployment signal; all investigator views share its room. */
    public int placedWritingBookRoom=-1;
    public final java.util.Map<Integer,LanVideoCameras.Camera> videoCameras=
        new java.util.HashMap<>();
    public final java.util.Map<Integer,LanDotsProjectors.Placement> dotsPositions=
        new java.util.HashMap<>();
    public record IncenseSmoke(int room,double x,double z,int untilTick){
        public IncenseSmoke{
            if(room<0||room>=HouseMap.ROOM_COUNT||!Double.isFinite(x)
                    ||!Double.isFinite(z)||untilTick<0)
                throw new IllegalArgumentException("invalid burning item");
        }
    }
    public final java.util.List<IncenseSmoke> incense=new java.util.ArrayList<>();
    public int dotsPassRoom=-1,dotsPassUntil=-1;
    public double dotsPassX,dotsPassZ;
    public RoomLighting roomLights;
    public int roomLightTick;
    public int hidingDensity;
    /** The solo profile supplies purchased gear; LAN host inventory will populate later. */
    public java.util.Set<EquipmentLoadout.Item> rackStock=java.util.EnumSet.allOf(EquipmentLoadout.Item.class);
    public BufferedImage image(){return frame;}
    public int[] pixels(){return pixels;}
    public double[] depths(){return depths;}
    private static int shade(int c,double k){return (Math.min(255,(int)(((c>>16)&255)*k))<<16) |
        (Math.min(255,(int)(((c>>8)&255)*k))<<8) | Math.min(255,(int)((c&255)*k));}
    private static void quad(List<Face> out,Point a,Point b,Point c,Point d,int col) {
        out.add(new Face(a,b,c,col,-1,0,0,0,0,0,0));
        out.add(new Face(a,c,d,col,-1,0,0,0,0,0,0));
    }
    private static void texturedQuad(List<Face> out,Point a,Point b,Point c,Point d,
            int material,double au,double av,double bu,double bv,
            double cu,double cv,double du,double dv,int tint) {
        out.add(new Face(a,b,c,tint,material,au,av,bu,bv,cu,cv));
        out.add(new Face(a,c,d,tint,material,au,av,cu,cv,du,dv));
    }
    private static void texturedBox(List<Face> out,double x,double y,double z,
            double sx,double sy,double sz,int material) {
        Point a=new Point(x,y,z),b=new Point(x+sx,y,z),c=new Point(x+sx,y+sy,z),d=new Point(x,y+sy,z);
        Point e=new Point(x,y,z+sz),f=new Point(x+sx,y,z+sz),g=new Point(x+sx,y+sy,z+sz),h=new Point(x,y+sy,z+sz);
        texturedQuad(out,a,b,c,d,material,0,0,sx,0,sx,sy,0,sy,0xffffff);
        texturedQuad(out,f,e,h,g,material,0,0,sx,0,sx,sy,0,sy,0xd4d4d4);
        texturedQuad(out,e,a,d,h,material,0,0,sz,0,sz,sy,0,sy,0xd0d0d0);
        texturedQuad(out,b,f,g,c,material,0,0,sz,0,sz,sy,0,sy,0xffffff);
        texturedQuad(out,d,c,g,h,material,0,0,sx,0,sx,sz,0,sz,0xffffff);
        texturedQuad(out,e,f,b,a,material,0,0,sx,0,sx,sz,0,sz,0xbebebe);
    }
    private static void box(List<Face> out,double x,double y,double z,double sx,double sy,double sz,int col){
        Point a=new Point(x,y,z),b=new Point(x+sx,y,z),c=new Point(x+sx,y+sy,z),d=new Point(x,y+sy,z);
        Point e=new Point(x,y,z+sz),f=new Point(x+sx,y,z+sz),g=new Point(x+sx,y+sy,z+sz),h=new Point(x,y+sy,z+sz);
        quad(out,a,b,c,d,shade(col,.72));quad(out,f,e,h,g,shade(col,.87));
        quad(out,e,a,d,h,shade(col,.8));quad(out,b,f,g,c,shade(col,.92));
        quad(out,d,c,g,h,shade(col,1.12));quad(out,e,f,b,a,shade(col,.5));
    }

    // Meshes supplied by the owner: true indexed 3D geometry with embedded
    // albedo PNGs. No primitive substitution or image-card stand-ins.
    private static void imported(List<Face> out,String id,
            double x,double y,double z,double scale,double yaw){
        final double cos=Math.cos(yaw),sin=Math.sin(yaw);
        for(GlbProps.Triangle t:GlbProps.model(id).triangles()){
            GlbProps.Vertex[] vv={t.a(),t.b(),t.c()};
            Point[] pp=new Point[3];
            for(int i=0;i<3;i++){
                GlbProps.Vertex v=vv[i];
                pp[i]=new Point(x+scale*(v.x()*cos-v.z()*sin),
                    y+scale*v.y(),z+scale*(v.x()*sin+v.z()*cos));
            }
            out.add(new Face(pp[0],pp[1],pp[2],0xffffff,t.material(),
                vv[0].u(),vv[0].v(),vv[1].u(),vv[1].v(),
                vv[2].u(),vv[2].v()));
        }
    }
    private static void furniture(List<Face> out,int room,HouseMap map){
        double cx=map.centerX(room),cz=map.centerZ(room);
        // Props deliberately have actual 3D volumes and distinctive silhouettes.
        switch(room) {
            case 0 -> { // bathroom: bath basin, sink, mirror
                box(out,cx-1.65,0,cz-1.45,2.2,.55,.85,0xb1a9a1);
                box(out,cx-1.42,.55,cz-1.25,1.77,.09,.48,0x5b6d76);
                box(out,cx+1.7,0,cz-.9,.6,.93,.6,0xa5a5a5);
                box(out,cx+1.7,.92,cz-.9,.6,.10,.6,0xe2d4bc);
                box(out,cx+1.71,1.2,cz-.86,.05,.68,.5,0x6d8b98);
            }
            case 1 -> { // master bedroom: bed and chest
                box(out,cx-1.7,0,cz-1.6,2.55,.53,1.65,0x594031);
                box(out,cx-1.6,.54,cz-1.5,2.35,.16,1.48,0x8c7671);
                box(out,cx-1.7,.66,cz-1.5,2.35,.42,.14,0x614336);
                box(out,cx+1.65,0,cz+1.15,.75,1.5,.6,0x544437);
            }
            case 2 -> {box(out,cx-1.7,0,cz-1.7,2,.6,1.1,0x5b4140);
                box(out,cx-1.65,.62,cz-1.66,1.9,.18,.96,0x82736b);
                box(out,cx+1.6,0,cz+1.1,.6,1.25,.6,0x76593a);}
            case 3 -> { // living room: couch and low coffee table
                box(out,cx-1.75,0,cz-1.55,3.1,.55,.86,0x52413d);
                box(out,cx-1.75,.52,cz-1.55,3.1,.59,.22,0x6b5351);
                box(out,cx-.95,0,cz+1.0,1.75,.45,.8,0x694c38);
                box(out,cx+1.9,0,cz-.8,.66,1.5,.55,0x4e463f);
            }
            case 4 -> {box(out,cx-1.0,0,cz-1.25,2,.7,1.3,0x584333);
                box(out,cx-1.02,.7,cz-1.25,2.05,.09,1.35,0x8e6247);
                box(out,cx+.45,.79,cz-.8,.2,.27,.2,0xd3a865);}
            case 5 -> { // kitchen: counters, sink and stove
                box(out,cx-2.5,0,cz-1.45,2.45,.95,.7,0x66615d);
                box(out,cx-2.46,.96,cz-1.4,2.4,.1,.63,0xa7a09a);
                box(out,cx+1.5,0,cz-.85,1.0,1.18,.7,0x454b51);
                box(out,cx+1.6,1.18,cz-.79,.79,.05,.54,0xaaa59d);
                box(out,cx+1.53,1.26,cz-.75,.08,.18,.08,0xc7bca0);
            }
            case 6 -> { // real licensed wood shelf and reader's table
                imported(out,"shelf_mp_6",cx-2.20,0,cz-.45,2.15,Math.PI/2);
                imported(out,"shelf_mp_6",cx-2.20,0,cz+.75,2.15,Math.PI/2);
                box(out,cx-.2,0,cz+1.0,1.7,.82,.85,0x5e4938);
            }
            case 7 -> { // dining room: table and four seats
                box(out,cx-1.1,0,cz-.7,2.15,.74,1.35,0x574337);
                box(out,cx-1.15,.76,cz-.72,2.25,.09,1.41,0x97734e);
                imported(out,"chair_mp_5",cx-1.1,0,cz-1.54,1.0,0);
                imported(out,"chair_mp_5",cx+.71,0,cz+1.22,1.0,Math.PI);
            }
            case 8 -> {box(out,cx-1.45,0,cz-1.1,2.4,.82,1.1,0x6a5140);
                box(out,cx+1.7,0,cz-.85,.65,1.5,1.25,0x473d3b);
                box(out,cx-1.2,.88,cz-.95,.63,.1,.53,0x8e7757);}
            case 9 -> {box(out,cx-1.3,0,cz-.9,2,.75,1.1,0x4e3e36);box(out,cx+1.7,0,cz-1.6,.7,1.9,1.1,0x5d605d);}
            case 10 -> {box(out,cx-1.5,0,cz-.9,1.8,.88,.65,0x70513c);box(out,cx+1.8,0,cz+.4,.8,1.6,.7,0x564c42);}
            case 11 -> {box(out,cx-1.4,0,cz-1.5,1.2,1.8,.8,0x58615b);box(out,cx+1.7,0,cz+.8,1,.8,.9,0x5c4a39);}
            case 12 -> { // rear garden: fence, garden bench and planting bed
                box(out,cx-2,0,cz-1.5,.2,1.25,.2,0x554f3c);
                box(out,cx+2,0,cz-1.5,.2,1.25,.2,0x554f3c);
                box(out,cx-.8,0,cz+.8,1.6,.43,.35,0x6a5643);
                box(out,cx+1.7,.01,cz+.3,.65,.16,1.2,0x59664d);
            }
            case 13 -> {box(out,cx+1.3,0,cz-1,.85,1,.85,0x64503e);}
            case 14 -> { /* Full operational van is instanced once from VanStaging below. */ }
            default -> { }
        }
    }
    /** Standard van shell and service fixtures. Reused unchanged on every location. */
    private static void vanBox(List<Face> faces,VanStaging van,
            double lx,double y,double lz,double sx,double sy,double sz,int material){
        // Translate all eight corners, preserving van yaw (including ninety-degree sites).
        VanStaging.Position a=van.world(lx,lz),b=van.world(lx+sx,lz),
            c=van.world(lx+sx,lz+sz),d=van.world(lx,lz+sz);
        Point p0=new Point(a.x(),y,a.z()),p1=new Point(b.x(),y,b.z()),
            p2=new Point(c.x(),y,c.z()),p3=new Point(d.x(),y,d.z());
        Point p4=new Point(a.x(),y+sy,a.z()),p5=new Point(b.x(),y+sy,b.z()),
            p6=new Point(c.x(),y+sy,c.z()),p7=new Point(d.x(),y+sy,d.z());
        texturedQuad(faces,p0,p1,p5,p4,material,0,0,sx,0,sx,sy,0,sy,0xffffff);
        texturedQuad(faces,p3,p0,p4,p7,material,0,0,sz,0,sz,sy,0,sy,0xd4d4d4);
        texturedQuad(faces,p1,p2,p6,p5,material,0,0,sz,0,sz,sy,0,sy,0xf1f1f1);
        texturedQuad(faces,p2,p3,p7,p6,material,0,0,sx,0,sx,sy,0,sy,0xdadada);
        texturedQuad(faces,p4,p5,p6,p7,material,0,0,sx,0,sx,sz,0,sz,0xffffff);
        texturedQuad(faces,p3,p2,p1,p0,material,0,0,sx,0,sx,sz,0,sz,0xbebebe);
    }
    /** Two independent cargo leaves pivot around the outer rear jambs.
     * Host collision remains authoritative in VanStaging: shut leaves seal
     * the doorway and opened leaves swing beyond the rear cargo entrance.
     */
    private static void cargoDoorLeaf(List<Face> faces,VanStaging van,boolean left){
        double w=VanStaging.HALF_WIDTH,front=VanStaging.FRONT;
        double hingeX=left?-w+.09:w-.09;
        double inward=left?1:-1;
        double span=w-.09;
        // A proper pair of outward-opening rear doors, not an opaque sliding block.
        double swing=van.cargoDoorClosed()?0:(left?-Math.toRadians(99):Math.toRadians(99));
        double endX=hingeX+inward*span*Math.cos(swing);
        double endZ=front+inward*span*Math.sin(swing);
        // Two parallel surfaces make the door visible both inside and outside.
        double nx=-(endZ-front)/span*.035,nz=(endX-hingeX)/span*.035;
        VanStaging.Position a=van.world(hingeX+nx,front+nz);
        VanStaging.Position b=van.world(endX+nx,endZ+nz);
        VanStaging.Position c=van.world(endX-nx,endZ-nz);
        VanStaging.Position d=van.world(hingeX-nx,front-nz);
        Point a0=new Point(a.x(),.07,a.z()),a1=new Point(a.x(),2.19,a.z());
        Point b0=new Point(b.x(),.07,b.z()),b1=new Point(b.x(),2.19,b.z());
        Point c0=new Point(c.x(),.07,c.z()),c1=new Point(c.x(),2.19,c.z());
        Point d0=new Point(d.x(),.07,d.z()),d1=new Point(d.x(),2.19,d.z());
        quad(faces,a0,b0,b1,a1,left?0x78838b:0x707b83);
        quad(faces,c0,d0,d1,c1,0x596770);
        quad(faces,a0,d0,d1,a1,0x48565d);
        quad(faces,b0,c0,c1,b1,0x616e77);
        quad(faces,a1,b1,c1,d1,0x9ca3a5);
        // A visible inset window is mounted in each door's upper half.
        double u0=.20,u1=.83;
        VanStaging.Position p=van.world(hingeX+(endX-hingeX)*u0+nx*.15,
                                      front+(endZ-front)*u0+nz*.15);
        VanStaging.Position q=van.world(hingeX+(endX-hingeX)*u1+nx*.15,
                                      front+(endZ-front)*u1+nz*.15);
        quad(faces,new Point(p.x(),1.53,p.z()),new Point(q.x(),1.53,q.z()),
             new Point(q.x(),1.96,q.z()),new Point(p.x(),1.96,p.z()),0x344856);
        // Door handles remain readable when shut or fully open.
        VanStaging.Position handle=van.world(hingeX+(endX-hingeX)*.88,
                                             front+(endZ-front)*.88);
        box(faces,handle.x()-.045,.96,handle.z()-.04,.09,.13,.08,0xd8c9a1);
    }

    private static void vanModel(List<Face> faces,VanStaging van,java.util.Set<EquipmentLoadout.Item> stock){
        double w=VanStaging.HALF_WIDTH,f=VanStaging.FRONT,r=VanStaging.REAR;
        // CC0 GGBot Car 08 is the physical van body. Its integrated rear closure
        // was removed from the converted mesh, leaving the actual cargo opening.
        // Interior collision, stations and hinged doors remain VanStaging-owned.
        imported(faces,"ggbot_car08_van_shell",van.placement().x(),.005,
            van.placement().z(),1.0,van.placement().yaw());
        vanBox(faces,van,-w,0,r-.16,w*2,2.27,.16,MaterialAtlas.AGED_WOOD);
        vanBox(faces,van,-w,.015,f,w*2,.04,r-f,MaterialAtlas.CONCRETE);
        // Side-mounted lockers, distinct coloured monitor/briefing boards and ramps.
        vanBox(faces,van,-1.90,.20,-1.25,.30,1.45,1.00,MaterialAtlas.AGED_WOOD);
        vanBox(faces,van,1.60,.20,-1.25,.28,1.45,1.00,MaterialAtlas.IRON);
        vanBox(faces,van,-1.90,.68,.28,.32,.95,1.0,MaterialAtlas.WINDOW);
        vanBox(faces,van,1.55,.7,.28,.36,.9,.95,MaterialAtlas.RITUAL);
        vanBox(faces,van,-.55,.10,r-.28,1.1,.5,.18,MaterialAtlas.AGED_WOOD);
        vanBox(faces,van,-w+.1,.05,f-.3,w*2-.2,.08,.3,MaterialAtlas.IRON);
        // Actual owner-supplied display and physical computer assemblies replace
        // arbitrary color slabs; the panel face is independently authorable.
        VanStaging.Position console=van.world(-1.68,.62);
        imported(faces,"monitoring_screen_mp_1",console.x(),1.24,console.z(),
            2.0,van.placement().yaw()+Math.PI/2);
        VanStaging.Position computer=van.world(-1.36,-.9);
        imported(faces,"pc_mp_1",computer.x(),.83,computer.z(),
            1.35,van.placement().yaw());
        VanStaging.Position button=van.doorButton();
        imported(faces,"button_12",button.x(),1.15,button.z(),
            .48,van.placement().yaw());
        cargoDoorLeaf(faces,van,true);
        cargoDoorLeaf(faces,van,false);
        // Built-in flashlight rests on a real van shelf; F switches the carried lamp.
        VanStaging.Position torch=van.world(-1.52,-1.53);
        imported(faces,"flashlight_mp_1",torch.x(),.83,torch.z(),2.2,van.placement().yaw());
        // Visible equipment shelf: six distinct physical sockets. Items can be aimed at and taken.
        for(double lz : new double[]{-1.18,.18}) {
            VanStaging.Position p=van.world(1.50,lz);
            VanStaging.Position right=van.world(2.50,lz);
            double yaw=Math.atan2(right.z()-p.z(),right.x()-p.x());
            imported(faces,"shelf_mp_6",p.x(),.36,p.z(),1.35,yaw);
        }
        for(EquipmentLoadout.Item item:EquipmentLoadout.Item.values()){
            if(!stock.contains(item))continue;
            double lz=-1.58+item.ordinal()*.52;
            int finish=switch(item){
                case EMF->0x517d73; case THERMOMETER->0xaaa99b;
                case SPIRIT_BOX->0x49535f;case UV_LAMP->0x8a70b1;
                case PHOTO_CAMERA->0x3b4553;case SALT->0xd1c49d;
            };
            VanStaging.Position v=van.world(1.48,lz);
            String source=switch(item){
                case EMF->"exploration_emf_detector";
                case THERMOMETER->"exploration_thermometer";
                case SPIRIT_BOX->"exploration_spirit_box";
                case UV_LAMP->"exploration_flashlight_poquet";
                case PHOTO_CAMERA->"exploration_photo_camera";
                default->null;
            };
            if(source!=null)
                imported(faces,source,v.x(),.85,v.z(),1.65,van.placement().yaw());
            else {
                box(faces,v.x()-.11,.65,v.z()-.09,.21,.50,.18,finish);
                box(faces,v.x()-.09,1.12,v.z()-.07,.17,.08,.14,0xa1aab4);
            }
        }
        VanStaging.Position book=van.world(1.48,1.05);
        imported(faces,"book_mp_1",book.x(),1.00,book.z(),2.1,van.placement().yaw());
        // A D.O.T.S. Tier I shell is present in the kit; actual projected dots
        // only appear in the world when a working deployed sensor is activated.
        VanStaging.Position projector=van.world(.87,-1.4);
        imported(faces,"vape_mp_1",projector.x(),.89,projector.z(),1.9,van.placement().yaw());
    }

    /** Minimal real CC0 streetscape. Geometry is deliberately deterministic:
     * noninteractive scenery never becomes a ghost evidence source.
     */
    private static void roadsideModels(List<Face> out,HouseMap map){
        // Road runs east/west across the open south edge; leave the van's access clear.
        for(int i=0;i<5;i++){
            double mx=3.1+i*4.6;
            imported(out,i==2?"kenney_road_asphalt_damaged":
                "kenney_road_asphalt_straight",mx,.012,28.1,
                i==2?4.35:2.30,Math.PI/2);
        }
        imported(out,"ggbot_car01",5.1,.08,28.1,1,Math.PI/2);
        imported(out,"ggbot_car07",12.2,.08,28.1,1,-Math.PI/2);
        imported(out,"kenney_detail_light_single",3.2,.08,24.9,2.25,0);
        imported(out,"kenney_detail_dumpster_closed",14.2,.06,24.7,1.65,0);
        imported(out,"kenney_detail_bench",9.1,.07,25.1,1.75,Math.PI/2);
        imported(out,"kenney_detail_barrier_type_a",7.8,.06,26.0,1.3,0);
    }

    /** Three visually distinct small PS-era rite installations at fixed room sockets. */
    private static void ritualInstallation(List<Face> out,RitualSites.Site site){
        double x=site.x(),z=site.z();
        int trim=switch(site.rite()){
            case BANISHMENT->0x965d50;case CLEANSING->0x73a9ac;case ABSOLUTION->0xc0a66b;
        };
        // Square floor seals: simple triangles rather than high-polygon circles.
        box(out,x-1.05,.025,z-.9,2.1,.04,.12,trim);
        box(out,x-1.05,.025,z+.78,2.1,.04,.12,trim);
        box(out,x-1.05,.025,z-.78,.12,.04,1.56,trim);
        box(out,x+.93,.025,z-.78,.12,.04,1.56,trim);
        switch(site.rite()){
            case BANISHMENT->{
                // Iron containment seal: low altar, metal pylons and an unlit central spike.
                box(out,x-.42,.045,z-.4,.84,.16,.8,0x444448);
                for(int sx:new int[]{-1,1})for(int sz:new int[]{-1,1})
                    box(out,x+sx*.79-.08,.05,z+sz*.63-.08,.16,.6,.16,0x665b5a);
                box(out,x-.07,.22,z-.07,.14,.48,.14,0xd18165);
            }
            case CLEANSING->{
                // A shallow water font: obvious basin, blue-green interior and lip.
                box(out,x-.52,.05,z-.42,1.04,.75,.84,0x796e62);
                box(out,x-.45,.81,z-.35,.90,.055,.70,0x70a7ac);
                box(out,x-.57,.83,z-.46,1.14,.09,.10,0xe0c9a6);
                box(out,x-.57,.83,z+.36,1.14,.09,.10,0xe0c9a6);
            }
            case ABSOLUTION->{
                // Memorial lectern with a warm amber relief and paired candles.
                box(out,x-.45,.06,z-.3,.90,.96,.60,0x655247);
                box(out,x-.50,1.02,z-.35,1.00,.12,.70,0xb09873);
                box(out,x-.08,1.14,z-.20,.16,.38,.08,0xd9bf8e);
                box(out,x-.24,1.28,z-.20,.48,.08,.08,0xd9bf8e);
                box(out,x-.70,.95,z-.16,.1,.36,.1,0xefdfae);
                box(out,x+.60,.95,z-.16,.1,.36,.1,0xefdfae);
            }
        }
    }
    private List<Face> scene(HouseMap map,int ghostRoom,boolean ghostVisible,int wardRoom,int hunterRoom,
            double clock,List<RemoteBody> others,Apparition apparition,List<WorldMark> marks) {
        List<Face> out=new ArrayList<>(2000);
        for(int zz=1;zz<map.height()-1;zz++)for(int xx=1;xx<map.width()-1;xx++) {
            if(map.tile(xx,zz)=='#') continue;
            double mx=xx+.5,mz=zz+.5;
            // Far geometry may be skipped only when beyond near/far fog; clipping handles visibility.
            if(Math.hypot(mx-x,mz-z)>14)continue;
            int n=map.roomAt(mx,mz);
            int floor=MaterialAtlas.floor(n),wall=MaterialAtlas.wall(n);
            texturedQuad(out,new Point(xx,0,zz),new Point(xx+1,0,zz),new Point(xx+1,0,zz+1),new Point(xx,0,zz+1),
                floor,xx,zz,xx+1,zz,xx+1,zz+1,xx,zz+1,0xffffff);
            if(!map.outside(n))texturedQuad(out,new Point(xx,2.7,zz+1),new Point(xx+1,2.7,zz+1),new Point(xx+1,2.7,zz),new Point(xx,2.7,zz),
                MaterialAtlas.CEILING,xx,zz+1,xx+1,zz+1,xx+1,zz,xx,zz,0xffffff);
            if(map.solid(xx-1,zz)&&map.tile(xx-1,zz)!='D')texturedQuad(out,new Point(xx,0,zz+1),new Point(xx,0,zz),new Point(xx,2.7,zz),new Point(xx,2.7,zz+1),
                wall,zz+1,0,zz,0,zz,2.7,zz+1,2.7,0xd0d0d0);
            if(map.solid(xx+1,zz)&&map.tile(xx+1,zz)!='D')texturedQuad(out,new Point(xx+1,0,zz),new Point(xx+1,0,zz+1),new Point(xx+1,2.7,zz+1),new Point(xx+1,2.7,zz),
                wall,zz,0,zz+1,0,zz+1,2.7,zz,2.7,0xfafafa);
            if(map.solid(xx,zz-1)&&map.tile(xx,zz-1)!='D')texturedQuad(out,new Point(xx,0,zz),new Point(xx+1,0,zz),new Point(xx+1,2.7,zz),new Point(xx,2.7,zz),
                wall,xx,0,xx+1,0,xx+1,2.7,xx,2.7,0xe0e0e0);
            if(map.solid(xx,zz+1)&&map.tile(xx,zz+1)!='D')texturedQuad(out,new Point(xx+1,0,zz+1),new Point(xx,0,zz+1),new Point(xx,2.7,zz+1),new Point(xx+1,2.7,zz+1),
                wall,xx+1,0,xx,0,xx,2.7,xx+1,2.7,0xebebeb);
            if(map.tile(xx,zz)=='D'){
                // Door geometry must occupy the opening, not sit behind wallpaper faces.
                boolean eastWest=xx==8||xx==16;
                if(eastWest){
                    box(out,xx+.18,0,zz+.02,.64,2.45,.10,0x8f805e);
                    box(out,xx+.18,0,zz+.88,.64,2.45,.10,0x8f805e);
                    box(out,xx+.18,2.35,zz,.64,.11,1.0,0x8f805e);
                    if(!map.doorOpen(xx,zz)){
                        imported(out,"door_1_loose",xx+.50,0,zz+.90,1.05,Math.PI/2);
                    }
                }else{
                    box(out,xx+.02,0,zz+.18,.10,2.45,.64,0x8f805e);
                    box(out,xx+.88,0,zz+.18,.10,2.45,.64,0x8f805e);
                    box(out,xx,2.35,zz+.18,1,.11,.64,0x8f805e);
                    if(!map.doorOpen(xx,zz)){
                        imported(out,"door_1_loose",xx+.97,0,zz+.50,1.05,0);
                    }
                }
            }
        }
        // Every investigation room has a discoverable physical rocker and ceiling fixture.
        for(int r=0;r<HouseMap.INDOOR_ROOMS;r++){
            RoomLighting.Switch sw=RoomLighting.location(r);
            if(Math.hypot(sw.x()-x,sw.z()-z)>14)continue;
            double px=sw.x(),pz=sw.z();
            imported(out,"light_switch_1",px,1.30,pz,2.0,0);
            boolean lit=roomLights==null||roomLights.on(r);
            // A tiny functional state indicator stays connected to RoomLighting.
            box(out,px+.033,lit?1.34:1.25,pz+.023,.025,.055,.025,
                lit?0xdac67c:0x50505a);
            double cx=map.centerX(r),cz=map.centerZ(r);
            if(Math.hypot(cx-x,cz-z)<=7.5) {
                double energy=roomLights==null?1:roomLights.brightness(r,roomLightTick);
                imported(out,energy>.45?"ceiling_lamp_1_on":"ceiling_lamp_1_off",
                    cx,2.58,cz,.76,0);
                box(out,cx-.19,2.49,cz-.17,.38,.024,.34,
                    energy>.45?0xffe4a4:energy>.13?0x9c7b62:0x343c46);
            }
        }
        for(int r=0;r<map.roomCount();r++) if(Math.hypot(map.centerX(r)-x,map.centerZ(r)-z)<14) furniture(out,r,map);
        for(int r=0;r<HouseMap.INDOOR_ROOMS;r++){
            var pocket=map.hidingSpot(r,hidingDensity);
            if(pocket==null||Math.hypot(pocket.x()-x,pocket.z()-z)>14)continue;
            double px=pocket.x(),pz=pocket.z();
            // Original, small cupboard silhouette. Only enabled positions are drawn.
            box(out,px-.47,0,pz-.20,.94,1.68,.20,0x40444d);
            box(out,px-.47,0,pz-.20,.14,1.68,.67,0x555964);
            box(out,px+.33,0,pz-.20,.14,1.68,.67,0x555964);
            box(out,px-.47,1.55,pz-.20,.94,.13,.67,0x6c7278);
        }
        for(RitualSites.Site site:RitualSites.all(map))
            if(Math.hypot(site.x()-x,site.z()-z)<14)ritualInstallation(out,site);
        // A visible power breaker at the correct utility-room interaction socket.
        if(Math.hypot(map.centerX(11)-x,map.centerZ(11)-z)<14){
            double bx=map.centerX(11),bz=map.centerZ(11);
            box(out,bx+.47,0,bz-.85,.53,1.20,.36,0x4d5359);
            box(out,bx+.55,1.20,bz-.79,.37,.45,.21,0x343945);
            box(out,bx+.64,1.31,bz-.57,.15,.18,.045,
                environmentPowerOn?0x70c592:0xc66b62);
        }
        if(Math.hypot(map.van().placement().x()-x,map.van().placement().z()-z)<14)
            vanModel(out,map.van(),rackStock);
        // Road and traffic props are exterior-only. Nearby rooms never instantiate
        // a second duplicate set of these global world objects.
        if(z>20.0&&z<31.0)roadsideModels(out,map);
        // Video cameras are actual mounted viewports; their footage is rendered
        // from this replicated camera location in the hunter's van monitor.
        for(LanVideoCameras.Camera camera:videoCameras.values())
            if(Math.hypot(camera.x()-x,camera.z()-z)<13.5)
                imported(out,"exploration_photo_camera",
                    camera.x(),.14,camera.z(),1.05,
                    Math.toRadians(camera.heading()));
        // An ignited incense bundle stays physically present for its burn duration.
        // These wisps are light/smoke only and never fabricate spectral evidence.
        incense.removeIf(b->b.untilTick()<roomLightTick);
        for(IncenseSmoke burn:incense){
            if(Math.hypot(burn.x()-x,burn.z()-z)>13.5)continue;
            box(out,burn.x()-.06,.04,burn.z()-.06,.12,.07,.12,0xa88f72);
            double phase=clock*1.7+burn.x();
            for(int i=0;i<8;i++){
                double rise=.2+i*.22;
                double sway=Math.sin(phase+i*.8)*(.04+rise*.07);
                double px=burn.x()+sway,pz=burn.z()+Math.cos(phase+i*.45)*.07;
                box(out,px-.035,rise,pz-.032,.07,.046,.064,
                    i%2==0?0x6e8888:0x8f9d96);
            }
        }
        // Actual mounted PSX Tier I shell emits a visible grid. Empty projected
        // dots are normal equipment light; only host-authored PASS creates a ghost silhouette.
        for(LanDotsProjectors.Placement placement:dotsPositions.values()){
            if(Math.hypot(placement.x()-x,placement.z()-z)>13.5)continue;
            imported(out,"vape_mp_1",placement.x(),.10,placement.z(),2.0,0);
            double radius=Math.min(2.35,EquipmentTiers.stage(
                "DOTS_PROJECTOR",placement.tier()).reachCm()/100.0);
            for(int gx=-4;gx<=4;gx++)for(int gz=-4;gz<=4;gz++){
                double px=placement.x()+gx*radius/4.6,
                    pz=placement.z()+gz*radius/4.6;
                if(map.roomAt(px,pz)!=placement.room())continue;
                box(out,px-.028,.048,pz-.028,.056,.015,.056,0x76de9c);
            }
        }
        if(dotsPassRoom>=0&&dotsPassUntil>=roomLightTick
                &&Math.hypot(dotsPassX-x,dotsPassZ-z)<13.5){
            for(int layer=0;layer<10;layer++){
                double y=.19+layer*.135;
                double span=.14+Math.sin(Math.PI*layer/10.0)*.17;
                for(int dot=-2;dot<=2;dot++)
                    box(out,dotsPassX+dot*span/3-.02,y,dotsPassZ-.03,
                        .04,.028,.04,0x98edbb);
            }
        }
        if(placedWritingBookRoom>=0&&placedWritingBookRoom<HouseMap.INDOOR_ROOMS){
            double bx=map.centerX(placedWritingBookRoom),bz=map.centerZ(placedWritingBookRoom);
            if(Math.hypot(bx-x,bz-z)<14)
                imported(out,"open_book_mp_1",bx-.5,.075,bz-.35,1.65,0);
        }
        // Character bodies are rendered as directional alpha-masked sprites after geometry.
        if(wardRoom>=0){
            int r=wardRoom;double wx=map.centerX(r),wz=map.centerZ(r);
            // Visible prepared circle is constrained to the anchor room; it is not a magic menu flag.
            quad(out,new Point(wx-.8,.035,wz-.8),new Point(wx+.8,.035,wz-.8),new Point(wx+.8,.035,wz-.65),new Point(wx-.8,.035,wz-.65),0x9b85b8);
            quad(out,new Point(wx-.8,.035,wz+.65),new Point(wx+.8,.035,wz+.65),new Point(wx+.8,.035,wz+.8),new Point(wx-.8,.035,wz+.8),0x9b85b8);
        }
        for(WorldMark mark:marks) {
            double mx=mark.x(),mz=mark.z(),yy=mark.height();
            if(Math.hypot(mx-x,mz-z)>14)continue;
            switch(mark.kind()){
                case CROSS -> {
                    // Laid cross: original source geometry, not a hard-coded cruciform box.
                    imported(out,"cross_mp_2",mx,yy,mz,1.7,0);
                }
                case WARD -> {
                    // Ground seal remains visible even when the projectile has landed.
                    box(out,mx-.75,.038,mz-.75,1.50,.06,.095,0x7fc6bf);
                    box(out,mx-.75,.038,mz+.655,1.50,.06,.095,0x7fc6bf);
                    box(out,mx-.75,.038,mz-.65,.095,.06,1.30,0x7fc6bf);
                    box(out,mx+.655,.038,mz-.65,.095,.06,1.30,0x7fc6bf);
                    if(yy>.10)box(out,mx-.09,yy,mz-.09,.18,.20,.18,0x9bede0);
                }
                case SALT -> {
                    box(out,mx-.47,.042,mz-.42,.94,.035,.09,0xe0d9bd);
                    box(out,mx-.47,.042,mz+.33,.94,.035,.09,0xc7c3ad);
                }
            }
        }
        return out;
    }
    private Point camera(Point p){
        double dx=p.x-x,dy=p.y-1.62,dz=p.z-z;
        double cy=Math.cos(yaw),sy=Math.sin(yaw),xc=dx*cy-dz*sy,zc=dx*sy+dz*cy;
        double cp=Math.cos(pitch),sp=Math.sin(pitch);
        return new Point(xc,dy*cp-zc*sp,dy*sp+zc*cp);
    }
    private static List<Vertex> clip(Vertex a,Vertex b,Vertex c){
        List<Vertex> in=List.of(a,b,c),out=new ArrayList<>(4);
        for(int i=0;i<3;i++){
            Vertex first=in.get(i),next=in.get((i+1)%3);
            boolean front=first.p.z>=NEAR,following=next.p.z>=NEAR;
            if(front)out.add(first);
            if(front!=following){
                double t=(NEAR-first.p.z)/(next.p.z-first.p.z);
                Point v=new Point(first.p.x+(next.p.x-first.p.x)*t,
                    first.p.y+(next.p.y-first.p.y)*t,NEAR);
                out.add(new Vertex(v,first.u+(next.u-first.u)*t,
                    first.v+(next.v-first.v)*t));
            }
        }
        return out;
    }
    /** Physical counter objects share room geometry and participate in the same depth buffer. */
    public record WorldMark(double x,double z,double height,HunterCounters.Kind kind) {
        public WorldMark {
            if(!Double.isFinite(x)||!Double.isFinite(z)||!Double.isFinite(height)||kind==null)
                throw new IllegalArgumentException("invalid counter mark");
        }
    }
    /** First-person network rendering with low-poly teammate models and host-managed doors. */
    public record RemoteBody(double x,double z,int slot,int heading) {
        public RemoteBody(double x,double z,int slot){this(x,z,slot,0);}
        public RemoteBody {
            if(!Double.isFinite(x)||!Double.isFinite(z)||slot<0||slot>=6||heading<0||heading>=360)
                throw new IllegalArgumentException("invalid remote body");
        }
    }
    /** Screen position above a visible investigator. No ghost or text type is accepted. */
    public record Nameplate(int x,int y){ }
    public Nameplate teammateNameplate(HouseMap map,RemoteBody teammate){
        if(map==null||teammate==null)return null;
        double distance=Math.hypot(teammate.x()-x,teammate.z()-z);
        if(distance<1.35||distance>14.0)return null;
        // Closed doors and solid walls suppress labels even before the raster check.
        if(!map.clearLineOfSight(x,z,teammate.x(),teammate.z()))return null;
        Point torso=camera(new Point(teammate.x(),1.35,teammate.z()));
        Point head=camera(new Point(teammate.x(),1.95,teammate.z()));
        if(torso.z<NEAR||torso.z>14.0||head.z<NEAR)return null;
        double cx=W*.5+torso.x/torso.z*focal;
        double cy=H*.5-torso.y/torso.z*focal;
        double labelX=W*.5+head.x/head.z*focal;
        double labelY=H*.5-head.y/head.z*focal-5;
        if(!Double.isFinite(cx)||!Double.isFinite(cy)||
            !Double.isFinite(labelX)||!Double.isFinite(labelY))return null;
        int px=(int)Math.round(cx),py=(int)Math.round(cy);
        if(px<3||px>=W-3||py<3||py>=H-3||
            labelX<8||labelX>=W-8||labelY<4||labelY>=H-5)return null;
        // The teammate must occupy at least one nearby torso Z pixel. Nearby
        // foreground geometry or another sprite covering them hides the label.
        boolean depthVisible=false;
        for(int dy=-2;dy<=2&&!depthVisible;dy++)
            for(int dx=-2;dx<=2&&!depthVisible;dx++){
                double d=depths[(py+dy)*W+px+dx];
                if(d>=torso.z-.45&&d<=torso.z+.55)depthVisible=true;
            }
        return depthVisible?new Nameplate((int)Math.round(labelX),(int)Math.round(labelY)):null;
    }
    public record Apparition(double x,double z,LanGhostAnimation.Phase phase,int heading,int progress,boolean orb) {
        public Apparition(double x,double z){this(x,z,LanGhostAnimation.Phase.LURK,0,0,false);}
        public Apparition(double x,double z,LanGhostAnimation.Phase phase,int heading,int progress){
            this(x,z,phase,heading,progress,false);
        }
        public Apparition {
            if(!Double.isFinite(x)||!Double.isFinite(z)||phase==null||heading<0||heading>=360
                    ||progress<0||progress>100)throw new IllegalArgumentException("invalid apparition");
        }
    }
    /** Castle hub renders with the same perspective, clipping and textured depth buffer as missions. */
    public void drawCastle(CastleHubMap map,double clock){
        paintSky(map.outside(x,z));
        Arrays.fill(depths,Double.POSITIVE_INFINITY);
        List<Face> castle=new ArrayList<>();
        for(int zz=1;zz<CastleHubMap.HEIGHT-1;zz++)for(int xx=1;xx<CastleHubMap.WIDTH-1;xx++){
            if(map.solid(xx,zz)||Math.hypot(xx+.5-x,zz+.5-z)>16)continue;
            int stone=map.outside(xx+.5,zz+.5)?MaterialAtlas.STONE:MaterialAtlas.CARPET;
            texturedQuad(castle,new Point(xx,0,zz),new Point(xx+1,0,zz),
                new Point(xx+1,0,zz+1),new Point(xx,0,zz+1),stone,
                xx,zz,xx+1,zz,xx+1,zz+1,xx,zz+1,0xffffff);
            if(!map.outside(xx+.5,zz+.5))texturedQuad(castle,
                new Point(xx,3.4,zz+1),new Point(xx+1,3.4,zz+1),
                new Point(xx+1,3.4,zz),new Point(xx,3.4,zz),
                MaterialAtlas.CEILING,xx,zz+1,xx+1,zz+1,xx+1,zz,xx,zz,0xe0d8c8);
            if(map.solid(xx-1,zz))texturedQuad(castle,new Point(xx,0,zz+1),new Point(xx,0,zz),
                new Point(xx,3.4,zz),new Point(xx,3.4,zz+1),MaterialAtlas.STONE,
                zz+1,0,zz,0,zz,3.4,zz+1,3.4,0xbdb2b0);
            if(map.solid(xx+1,zz))texturedQuad(castle,new Point(xx+1,0,zz),new Point(xx+1,0,zz+1),
                new Point(xx+1,3.4,zz+1),new Point(xx+1,3.4,zz),MaterialAtlas.STONE,
                zz,0,zz+1,0,zz+1,3.4,zz,3.4,0xd4c5ba);
            if(map.solid(xx,zz-1))texturedQuad(castle,new Point(xx,0,zz),new Point(xx+1,0,zz),
                new Point(xx+1,3.4,zz),new Point(xx,3.4,zz),MaterialAtlas.STONE,
                xx,0,xx+1,0,xx+1,3.4,xx,3.4,0xd5c4ba);
            if(map.solid(xx,zz+1))texturedQuad(castle,new Point(xx+1,0,zz+1),new Point(xx,0,zz+1),
                new Point(xx,3.4,zz+1),new Point(xx+1,3.4,zz+1),MaterialAtlas.STONE,
                xx+1,0,xx,0,xx,3.4,xx+1,3.4,0xc8b4ab);
        }
        // Lit brass sconces serve as landmarks rather than flat screen decorations.
        for(int xx:new int[]{3,13,24})for(int zz:new int[]{2,10,14,20}){
            if(Math.hypot(xx-x,zz-z)>16)continue;
            box(castle,xx-.12,1.3,zz-.12,.24,.63,.24,0x947954);
            box(castle,xx-.09,1.92,zz-.09,.18,.37,.18,0xe4b667);
        }
        for(CastleHubMap.Station station:CastleHubMap.Station.values()){
            if(Math.hypot(station.x-x,station.z-z)>16)continue;
            double px=station.x,pz=station.z;
            int finish=switch(station){
                case ARMORY_UV->0x8c6eaf;case ARMORY_SALT->0xc5b78e;
                case ROLE->0x64545f;case CONTRACT->0x977049;
                case EXPEDITION->0x758d77;case MULTIPLAYER->0x5f8da4;
                case SPECTRAL->0x8266a1;
            };
            box(castle,px-.58,.06,pz-.40,1.16,.74,.80,0x473d37);
            box(castle,px-.60,.80,pz-.42,1.20,.10,.84,0x9b8160);
            box(castle,px-.43,.92,pz-.25,.86,.62,.20,finish);
            box(castle,px-.12,1.53,pz-.15,.24,.15,.13,0xc1ad80);
        }
        // Purchased source-backed fixtures occupy authored locations and match hub collision.
        for(CastleHubMap.Furnishing item:CastleHubMap.furnishings())
            if(Math.hypot(item.x()-x,item.z()-z)<16)
                imported(castle,item.mesh(),item.x(),0,item.z(),item.scale(),item.yaw());
        // Castle entrance arch; courtyard remains open to the procedural sky.
        box(castle,12.75,0,11.20,.40,3.0,.38,0x625c60);
        box(castle,14.10,0,11.20,.40,3.0,.38,0x625c60);
        box(castle,12.75,2.9,11.20,1.75,.36,.38,0xa69178);
        for(Face face:castle){
            List<Vertex> points=clip(new Vertex(camera(face.a),face.au,face.av),
                new Vertex(camera(face.b),face.bu,face.bv),new Vertex(camera(face.c),face.cu,face.cv));
            for(int i=1;i<points.size()-1;i++)triangle(points.get(0),points.get(i),points.get(i+1),face.color,face.material);
        }
    }
    /** Keep the legacy room-mode signature for old render regression tests. */
    public void drawNetwork(HouseMap map,List<RemoteBody> others,int visibleGhostRoom,double clock){
        render(map,visibleGhostRoom,visibleGhostRoom>=0,-1,-1,clock,others);
    }
    /** Render a 3D LAN apparition at its actual server-disclosed pose, never a guessed room center. */
    public void drawNetwork(HouseMap map,List<RemoteBody> others,Apparition apparition,double clock){
        render(map,-1,apparition!=null,-1,-1,clock,others,apparition);
    }
    public void drawNetwork(HouseMap map,List<RemoteBody> others,Apparition apparition,double clock,
            List<WorldMark> markers){
        render(map,-1,apparition!=null,-1,-1,clock,others,apparition,markers);
    }
    public void draw(HouseMap map,InvestigationSession session,double clock){
        render(map,session.ghostRoom(),session.outcome()==InvestigationSession.Outcome.ACTIVE && session.ghostManifesting(),
            session.wardPrepared()?session.anchorRoom():-1,-1,clock,List.of(),null,session.counterMarks());
    }
    /** Spectral viewpoint: only a room-local sensed hunter is rendered. */
    public void drawPractice(HouseMap map,int visibleHunterRoom,double clock){
        render(map,-1,false,-1,visibleHunterRoom,clock,List.of());
    }
    private void render(HouseMap map,int ghostRoom,boolean visibleGhost,int wardRoom,int hunterRoom,double clock,List<RemoteBody> others){
        render(map,ghostRoom,visibleGhost,wardRoom,hunterRoom,clock,others,null);
    }
    private void render(HouseMap map,int ghostRoom,boolean visibleGhost,int wardRoom,int hunterRoom,double clock,List<RemoteBody> others,Apparition apparition){
        render(map,ghostRoom,visibleGhost,wardRoom,hunterRoom,clock,others,apparition,List.of());
    }
    private void render(HouseMap map,int ghostRoom,boolean visibleGhost,int wardRoom,int hunterRoom,
            double clock,List<RemoteBody> others,Apparition apparition,List<WorldMark> markers){
        paintSky(map);
        Arrays.fill(depths,Double.POSITIVE_INFINITY);
        for(Face face:scene(map,ghostRoom,visibleGhost,wardRoom,hunterRoom,clock,others,apparition,markers)){
            List<Vertex> pts=clip(new Vertex(camera(face.a),face.au,face.av),
                new Vertex(camera(face.b),face.bu,face.bv),new Vertex(camera(face.c),face.cu,face.cv));
            int room=map.roomAt((face.a.x+face.b.x+face.c.x)/3,
                (face.a.z+face.b.z+face.c.z)/3);
            double lighting=roomLights==null?1:roomLights.brightness(room,roomLightTick);
            for(int i=1;i<pts.size()-1;i++)triangle(pts.get(0),pts.get(i),pts.get(i+1),
                face.color,face.material,lighting);
        }
        renderCharacterSprites(map,ghostRoom,visibleGhost,hunterRoom,clock,others,apparition);
    }
    /** Procedural sky gradient, distant hills and moving moon; only rendered through outdoor openings. */
    private void paintSky(HouseMap map){paintSky(map.outside(map.roomAt(x,z)));}
    private void paintSky(boolean outside){
        final int horizon=(int)Math.round(H*.51+Math.tan(pitch)*153);
        for(int sy=0;sy<H;sy++){
            double t=Math.max(0,Math.min(1,sy/(double)H));
            boolean upper=sy<horizon;
            int red=upper?(int)(13+18*t):(int)(18+18*t);
            int green=upper?(int)(23+18*t):(int)(27+19*t);
            int blue=upper?(int)(41+31*t):(int)(32+16*t);
            int packed=(red<<16)|(green<<8)|blue;
            Arrays.fill(pixels,sy*W,(sy+1)*W,packed);
        }
        if(!outside)return; // Interiors are covered by physical walls/ceilings.
        // World-fixed silhouette panorama with no repeated bitmap / no proprietary assets.
        for(int sx=0;sx<W;sx++){
            double bearing=yaw+Math.atan2(sx-W*.5,153.0);
            int hills=horizon+(int)(13*Math.sin(bearing*2.1)+8*Math.sin(bearing*5.7)
                    +5*Math.sin(bearing*13.2));
            for(int sy=Math.max(0,hills);sy<H;sy++)pixels[sy*W+sx]=0x18202a;
        }
        // No artificial moon inside the house; the exterior sky provides a navigation anchor.
        double moonBearing=-1.2;
        double diff=Math.atan2(Math.sin(moonBearing-yaw),Math.cos(moonBearing-yaw));
        int mx=(int)Math.round(W*.5+Math.tan(diff)*153),my=Math.max(13,horizon-43);
        if(Math.abs(diff)<.8)for(int dy=-5;dy<=5;dy++)for(int dx=-5;dx<=5;dx++){
            int px=mx+dx,py=my+dy;
            if(px>=0&&px<W&&py>=0&&py<H&&dx*dx+dy*dy<25)pixels[py*W+px]=0xb8c8d5;
        }
    }
    /** Billboards share the world Z-buffer, so room walls correctly hide hunter and ghost bodies.
     * Visibility, headings and phase remain projected from the host's simulation.
     */
    private void renderCharacterSprites(HouseMap map,int ghostRoom,boolean visibleGhost,
            int hunterRoom,double clock,List<RemoteBody> others,Apparition apparition){
        if(visibleGhost){
            double gx=apparition==null?map.centerX(ghostRoom):apparition.x();
            double gz=apparition==null?map.centerZ(ghostRoom):apparition.z();
            LanGhostAnimation.Phase phase=apparition==null?LanGhostAnimation.Phase.LURK:apparition.phase();
            int progress=apparition==null?0:apparition.progress();
            double stature=phase==LanGhostAnimation.Phase.MATERIALIZE
                    ?.45+.55*Math.min(1,progress/(double)LanGhostAnimation.MATERIALIZE_TICKS)
                    :phase==LanGhostAnimation.Phase.RECOVER?.84:1.0;
            double lift=phase==LanGhostAnimation.Phase.WINDUP?.13*Math.min(1,progress/8.0):0;
            int alpha=phase==LanGhostAnimation.Phase.MATERIALIZE
                    ?Math.max(45,(int)(255*progress/(double)LanGhostAnimation.MATERIALIZE_TICKS))
                    :phase==LanGhostAnimation.Phase.RECOVER?205:255;
            if(apparition!=null&&apparition.orb()){
                renderSpiritOrb(gx,gz,.98+.18*Math.sin(clock*4),clock);
            }else{
                DirectionalSprites.draw(pixels,depths,x,z,yaw,pitch,gx,gz,
                    apparition==null?0:apparition.heading(),"banshee",1.95*stature,1.16,
                    .09*Math.sin(clock*3)+lift,alpha,lamp);
            }
        }
        if(hunterRoom>=0){
            DirectionalSprites.draw(pixels,depths,x,z,yaw,pitch,
                map.centerX(hunterRoom)-1.25,map.centerZ(hunterRoom)+2.0,
                0,"observer",1.75,1.04,0,255,lamp);
        }
        for(RemoteBody person:others){
            double distance=Math.hypot(person.x()-x,person.z()-z);
            if(distance>14||distance<1.35)continue;
            DirectionalSprites.draw(pixels,depths,x,z,yaw,pitch,person.x(),person.z(),
                person.heading(),"observer",1.75,1.04,0,255,lamp);
        }
    }
    /** A real luminous orb in perspective, occluded by walls and the existing Z-buffer. */
    private void renderSpiritOrb(double gx,double gz,double bob,double clock){
        Point p=camera(new Point(gx,bob,gz));
        if(p.z<NEAR||p.z>17)return;
        int cx=(int)Math.round(W*.5+p.x/p.z*focal),cy=(int)Math.round(H*.5-p.y/p.z*focal);
        int radius=Math.min(29,Math.max(2,(int)Math.round(focal*.19/p.z)));
        for(int sy=Math.max(0,cy-radius);sy<=Math.min(H-1,cy+radius);sy++)
            for(int sx=Math.max(0,cx-radius);sx<=Math.min(W-1,cx+radius);sx++){
                double distance=Math.hypot(sx-cx,sy-cy)/(double)radius;
                if(distance>1)continue;
                int at=sy*W+sx;
                if(p.z>=depths[at])continue;
                double glow=(1-distance*distance)*(.85+.15*Math.sin(clock*7));
                int red=(int)(65+90*glow),green=(int)(85+160*glow),
                    blue=(int)(115+140*glow);
                pixels[at]=(Math.min(255,red)<<16)|(Math.min(255,green)<<8)|Math.min(255,blue);
                depths[at]=p.z;
            }
    }
    private void triangle(Vertex va,Vertex vb,Vertex vc,int tint,int material){
        triangle(va,vb,vc,tint,material,1);
    }
    private void triangle(Vertex va,Vertex vb,Vertex vc,int tint,int material,double roomLevel){
        Point a=va.p,b=vb.p,c=vc.p;
        int color=tint;
        double x0=W*.5+a.x/a.z*focal,y0=H*.5-a.y/a.z*focal;
        double x1=W*.5+b.x/b.z*focal,y1=H*.5-b.y/b.z*focal;
        double x2=W*.5+c.x/c.z*focal,y2=H*.5-c.y/c.z*focal;
        double denom=(y1-y2)*(x0-x2)+(x2-x1)*(y0-y2);
        if(Math.abs(denom)<1e-8)return;
        int lowX=Math.max(0,(int)Math.floor(Math.min(x0,Math.min(x1,x2))));
        int highX=Math.min(W-1,(int)Math.ceil(Math.max(x0,Math.max(x1,x2))));
        int lowY=Math.max(0,(int)Math.floor(Math.min(y0,Math.min(y1,y2))));
        int highY=Math.min(H-1,(int)Math.ceil(Math.max(y0,Math.max(y1,y2))));
        for(int py=lowY;py<=highY;py++)for(int px=lowX;px<=highX;px++){
            double xx=px+.5,yy=py+.5;
            double u=((y1-y2)*(xx-x2)+(x2-x1)*(yy-y2))/denom;
            double v=((y2-y0)*(xx-x2)+(x0-x2)*(yy-y2))/denom,w=1-u-v;
            if(u<0||v<0||w<0)continue;
            double inv=u/a.z+v/b.z+w/c.z,d=1/inv;int k=py*W+px;
            if(d>=depths[k])continue;
            depths[k]=d;
            if(material>=0) {
                // Perspective-correct material lookup. Screen-space UV interpolation
                // distorts strongly at PS-era FOV and is unsuitable for room walls.
                double uu=(u*va.u/a.z + v*vb.u/b.z + w*vc.u/c.z)/inv;
                double vv=(u*va.v/a.z + v*vb.v/b.z + w*vc.v/c.z)/inv;
                int texel=material>=GlbProps.TEXTURE_BASE
                    ?GlbProps.sample(material,uu,vv)
                    :MaterialAtlas.sample(material,uu,vv);
                int tr=(texel>>16)&255,tg=(texel>>8)&255,tb=texel&255;
                color=((tr*((tint>>16)&255)/255)<<16) |
                    ((tg*((tint>>8)&255)/255)<<8) |
                     (tb*(tint&255)/255);
            }
            // Flashlight is a bounded near-field additive beam; turning room lights off
            // genuinely darkens distant geometry instead of only tinting a HUD icon.
            double beam=lamp?.72*Math.max(0,1-d/7.5):0;
            double light=(.075+.98*roomLevel+beam)*environmentLight*Math.max(.22,1-d/26.0);
            light=Math.max(.1,Math.min(1.45,light+(BAYER[(px&3)+((py&3)<<2)]-7.5)/140.0));
            int red=(int)(((color>>16)&255)*light),green=(int)(((color>>8)&255)*light),blue=(int)((color&255)*light);
            double fog=Math.min(.92,Math.max(0,(d-5)/15)*fogDensity);
            red=(int)(red*(1-fog)+18*fog);green=(int)(green*(1-fog)+21*fog);blue=(int)(blue*(1-fog)+30*fog);
            pixels[k]=(Math.min(255,red)<<16)|(Math.min(255,green)<<8)|Math.min(255,blue);
        }
    }
}