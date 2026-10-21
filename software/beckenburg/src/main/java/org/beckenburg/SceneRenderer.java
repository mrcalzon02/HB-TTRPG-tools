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
    private int renderWidth=W,renderHeight=H;
    private double nativeFocal=153; // fixed vertical lens; widescreen adds peripheral geometry
    private double focal=nativeFocal;
    public void setFieldOfView(double degrees){
        if(!Double.isFinite(degrees)||degrees<35||degrees>135)
            throw new IllegalArgumentException("unsupported optical field of view");
        nativeFocal=(W*.5)/Math.tan(Math.toRadians(degrees/2));
        focal=nativeFocal*renderHeight/H;
    }
    public double fieldOfView(){return Math.toDegrees(2*Math.atan((W*.5)/nativeFocal));}
    public int width(){return renderWidth;}
    public int height(){return renderHeight;}
    /** Real render-target resizing, with bounded CPU/memory cost. */
    public void setRenderSize(int width,int height){
        if(width<160||height<120||width>1920||height>1080||(long)width*height>1500000)
            throw new IllegalArgumentException("software render size out of range");
        if(width==renderWidth&&height==renderHeight)return;
        renderWidth=width;renderHeight=height;
        frame=new BufferedImage(width,height,BufferedImage.TYPE_INT_RGB);
        pixels=((DataBufferInt)frame.getRaster().getDataBuffer()).getData();
        depths=new double[width*height];
        focal=nativeFocal*height/H;
    }
    private static final int[] BAYER={0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5};
    private record Point(double x,double y,double z) { }
    private record Vertex(Point p,double u,double v) { }
    private record Face(Point a,Point b,Point c,int color,int material,
                        double au,double av,double bu,double bv,double cu,double cv,int room) {
        Face(Point a,Point b,Point c,int color,int material,double au,double av,double bu,double bv,double cu,double cv){this(a,b,c,color,material,au,av,bu,bv,cu,cv,-1);}
        Face owned(int id){return new Face(a,b,c,color,material,au,av,bu,bv,cu,cv,id);}
    }
    private BufferedImage frame = new BufferedImage(W,H,BufferedImage.TYPE_INT_RGB);
    private int[] pixels=((DataBufferInt)frame.getRaster().getDataBuffer()).getData();
    private double[] depths=new double[W*H];
    private PsxPipeline.Preset psxPreset=PsxPipeline.selected();
    public PsxPipeline.Preset psxPreset(){return psxPreset;}
    public void setPsxPreset(PsxPipeline.Preset preset){
        psxPreset=java.util.Objects.requireNonNull(preset,"PSX preset");
    }
    /** The architectural plan is authored in world metres, independent of the tile renderer. */
    public double x=20.5,z=27.5,yaw=-Math.PI/2,pitch=-.09;
    /** Actual current eye elevation in world space; supports real stair ascent. */
    public double eyeHeight=1.62;
    public boolean lamp=true;
    public double lampReach=7.5,lampIntensity=.72;
    public boolean flameLamp;
    /** Cosmetic effects follow received authority, never determine paranormal evidence. */
    public GhostIdentity.Rite activeRite;
    public int strikeUntilTick=-1;
    /** Real tier optics controls actual in-world illumination, not a HUD indicator. */
    public void setLampHardware(EquipmentTiers.Tier tier,boolean flameOnly){
        if(tier==null)throw new IllegalArgumentException("flashlight tier required");
        flameLamp=flameOnly;
        lampReach=flameOnly?3.5:switch(tier){
            case I->6.0;case II->9.0;case III->12.0;
        };
        lampIntensity=flameOnly?.30:switch(tier){
            case I->.58;case II->.76;case III->.94;
        };
    }
    /** Solo environment presets; default multipliers retain legacy LAN lighting. */
    public double environmentLight=1.0,fogDensity=1.0;
    private EvidenceSignals.Weather weatherKind=EvidenceSignals.Weather.CLEAR;
    private int weatherIntensity=1;
    public void setWeather(MissionWeather.State state){
        if(state==null)throw new IllegalArgumentException("weather state");
        weatherKind=state.weather();weatherIntensity=state.intensity();
    }
    public boolean environmentPowerOn=true;
    /** Authoritative book-deployment signal; all investigator views share its room. */
    public int placedWritingBookRoom=-1;
    public double writingBookX,writingBookY,writingBookZ;
    public boolean writingBookHasPosition;
    public EquipmentTiers.Tier writingBookTier=EquipmentTiers.Tier.I;
    public final java.util.Map<Integer,VanTripods.Stand> tripods=new java.util.HashMap<>();
    public final java.util.Map<Integer,LanVideoCameras.Camera> videoCameras=
        new java.util.HashMap<>();
    public final java.util.Map<Integer,VanSensorStations.Station> sensorPositions=
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
    public int hidingDensity=70;
    /** Empty until an authoritative loadout/profile explicitly supplies owned gear.
     * Never implicitly manufacture free tools as map scenery.
     */
    public java.util.Set<EquipmentLoadout.Item> rackStock=java.util.Set.of();
    /** Host-issued inventory only: do not spawn unpurchased instruments. */
    public java.util.Map<String,EquipmentTiers.Tier> rackToolTiers=java.util.Map.of();
    public java.util.List<VanRackStock.Entry> rackInventory;
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
    private static void looseClutter(List<Face> out,HouseMap map){
        for(var item:map.clutter().states()){
            if(item.holder()==-2)continue;
            double cy=Math.cos(item.yaw()),sy=Math.sin(item.yaw()),cr=Math.cos(item.roll()),sr=Math.sin(item.roll());
            for(var t:GlbProps.model(item.kind().mesh()).triangles()){
                var vertices=new GlbProps.Vertex[]{t.a(),t.b(),t.c()};Point[] points=new Point[3];
                for(int i=0;i<3;i++){var v=vertices[i];double vx=v.x(),vy=v.y()-item.kind().half;
                    double rx=vx*cr-vy*sr,ry=vx*sr+vy*cr;
                    points[i]=new Point(item.x()+rx*cy-v.z()*sy,item.y()+ry,item.z()+rx*sy+v.z()*cy);}
                out.add(new Face(points[0],points[1],points[2],0xffffff,t.material(),t.a().u(),t.a().v(),t.b().u(),t.b().v(),t.c().u(),t.c().v()));
            }
        }
    }
    private static Point fixturePoint(HauntedFixtures.State f,double x,double y,double z){return new Point(f.x()+x*Math.cos(f.yaw())-z*Math.sin(f.yaw()),f.y()+y,f.z()+x*Math.sin(f.yaw())+z*Math.cos(f.yaw()));}
    private void eventFixtures(List<Face> out,HouseMap map){
        for(var f:map.fixtures().states()){
            String mesh=f.kind().mesh();
            if(mesh!=null)imported(out,mesh,f.x(),f.y(),f.z(),1,f.yaw()+(f.active()&&f.kind()==HauntedFixtures.Kind.ALARM_CLOCK?Math.sin(roomLightTick*2)*.018:0));
            if(f.active()&&(f.kind()==HauntedFixtures.Kind.FIRE_ALARM||f.kind()==HauntedFixtures.Kind.RADIO||f.kind()==HauntedFixtures.Kind.BOOM_BOX)){
                double y=f.kind()==HauntedFixtures.Kind.FIRE_ALARM?.27:f.kind()==HauntedFixtures.Kind.RADIO?.164:.197;
                int color=f.kind()==HauntedFixtures.Kind.FIRE_ALARM&&roomLightTick%8<4?0xffefd0:0xc29f4c;
                quad(out,fixturePoint(f,-.038,y-.010,.088),fixturePoint(f,.038,y-.010,.088),fixturePoint(f,.038,y+.010,.088),fixturePoint(f,-.038,y+.010,.088),color);
            }
            if(f.water()>0){
                double rx=f.kind()==HauntedFixtures.Kind.SINK_KITCHEN?.32:.175,rz=f.kind()==HauntedFixtures.Kind.SINK_KITCHEN?.145:.13;
                double y=-.20+.155*f.water()/1000.0;Point center=fixturePoint(f,0,y,0);
                for(int n=0;n<24;n++){double a=n*Math.PI/12,b=(n+1)*Math.PI/12;
                    Point p=fixturePoint(f,Math.cos(a)*rx,y,Math.sin(a)*rz),q=fixturePoint(f,Math.cos(b)*rx,y,Math.sin(b)*rz);
                    out.add(new Face(center,q,p,n%3==0?0x55757b:0x45656b,-1,0,0,0,0,0,0,f.room()));}
                if(f.active()){
                    Point top=fixturePoint(f,0,.11,-.03),bottom=fixturePoint(f,0,y,-.03);
                    box(out,top.x-.004,bottom.y,top.z-.004,.008,top.y-bottom.y,.008,0x72969d);
                }
            }
        }
    }
    private static void imported(List<Face> out,String id,
            double x,double y,double z,double scale,double yaw){
        imported(out,id,x,y,z,scale,scale,scale,yaw);
    }
    /** Source triangles with independent axis scales for medieval wall modules. */
    private static void imported(List<Face> out,String id,
            double x,double y,double z,double sx,double sy,double sz,double yaw){
        final double cos=Math.cos(yaw),sin=Math.sin(yaw);
        for(GlbProps.Triangle t:GlbProps.model(id).triangles()){
            GlbProps.Vertex[] vv={t.a(),t.b(),t.c()};
            Point[] pp=new Point[3];
            for(int i=0;i<3;i++){
                GlbProps.Vertex v=vv[i];
                pp[i]=new Point(x+sx*v.x()*cos-sz*v.z()*sin,
                    y+sy*v.y(),z+sx*v.x()*sin+sz*v.z()*cos);
            }
            out.add(new Face(pp[0],pp[1],pp[2],0xffffff,t.material(),
                vv[0].u(),vv[0].v(),vv[1].u(),vv[1].v(),
                vv[2].u(),vv[2].v()));
        }
    }
    /** Original mesh triangles retain source UVs and material indices. Their
     * source pivots are NOT assumed to be at the wall/ceiling attachment point.
     * Anchoring to measured source bounds prevents half-embedded floating GLBs.
     */
    private static void mountedLamp(List<Face> out,CastleHubDecor.Light fixture,boolean on){
        String mesh=on?fixture.on():fixture.off();
        GlbProps.Model model=GlbProps.model(mesh);
        double minX=Double.POSITIVE_INFINITY,minY=minX,minZ=minX;
        double maxX=Double.NEGATIVE_INFINITY,maxY=maxX,maxZ=maxX;
        for(GlbProps.Triangle t:model.triangles())for(GlbProps.Vertex v:
                new GlbProps.Vertex[]{t.a(),t.b(),t.c()}){
            minX=Math.min(minX,v.x());maxX=Math.max(maxX,v.x());
            minY=Math.min(minY,v.y());maxY=Math.max(maxY,v.y());
            minZ=Math.min(minZ,v.z());maxZ=Math.max(maxZ,v.z());
        }
        double ox=(minX+maxX)*.5,oz=(minZ+maxZ)*.5;
        double oy=fixture.mount()==CastleHubDecor.Mount.CEILING?maxY:(minY+maxY)*.5;
        double s=fixture.scale(),cy=Math.cos(fixture.yaw()),sy=Math.sin(fixture.yaw());
        // Wall sconces receive a visible real mounting plate against the wall
        // face, never a free-floating pole in the centre of the room.
        if(fixture.mount()==CastleHubDecor.Mount.WALL){
            if(Math.abs(sy)>.5)
                box(out,fixture.x()-.055,fixture.y()-.20,fixture.z()-.15,
                    .11,.40,.30,0x635447);
            else
                box(out,fixture.x()-.15,fixture.y()-.20,fixture.z()-.055,
                    .30,.40,.11,0x635447);
        }
        for(GlbProps.Triangle t:model.triangles()){
            GlbProps.Vertex[] vv={t.a(),t.b(),t.c()};
            Point[] pp=new Point[3];
            for(int i=0;i<3;i++){
                GlbProps.Vertex v=vv[i];
                double xx=(v.x()-ox)*s,zz=(v.z()-oz)*s;
                pp[i]=new Point(fixture.x()+xx*cy-zz*sy,
                    fixture.y()+(v.y()-oy)*s,
                    fixture.z()+xx*sy+zz*cy);
            }
            out.add(new Face(pp[0],pp[1],pp[2],0xffffff,t.material(),
                vv[0].u(),vv[0].v(),vv[1].u(),vv[1].v(),
                vv[2].u(),vv[2].v()));
        }
    }
    /** All investigation locations use placed, licensed scenery GLBs with
     * matching host-side collision. No purchasable tools occur in map furnishings.
     */
    private static void furniture(List<Face> out,int room,HouseMap map){
        double cx=map.centerX(room),cz=map.centerZ(room);
        for(InvestigationSites.Prop prop:InvestigationSites.props(map.site(),room))
            imported(out,prop.mesh(),cx+prop.dx(),prop.y(),cz+prop.dz(),
                prop.scale(),prop.yaw());
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
        Point a0=new Point(a.x(),VanStaging.FLOOR_Y,a.z()),a1=new Point(a.x(),VanStaging.ROOF_Y-.12,a.z());
        Point b0=new Point(b.x(),VanStaging.FLOOR_Y,b.z()),b1=new Point(b.x(),VanStaging.ROOF_Y-.12,b.z());
        Point c0=new Point(c.x(),VanStaging.FLOOR_Y,c.z()),c1=new Point(c.x(),VanStaging.ROOF_Y-.12,c.z());
        Point d0=new Point(d.x(),VanStaging.FLOOR_Y,d.z()),d1=new Point(d.x(),VanStaging.ROOF_Y-.12,d.z());
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
        quad(faces,new Point(p.x(),1.68,p.z()),new Point(q.x(),1.68,q.z()),
             new Point(q.x(),2.28,q.z()),new Point(p.x(),2.28,p.z()),0x344856);
        // Door handles remain readable when shut or fully open.
        VanStaging.Position handle=van.world(hingeX+(endX-hingeX)*.88,
                                             front+(endZ-front)*.88);
        box(faces,handle.x()-.045,.96,handle.z()-.04,.09,.13,.08,0xd8c9a1);
    }

    /** Low-poly vehicle tyres are outside the cargo shell, never visible
     * through the internal equipment and computer walls.
     */
    private static void vanWheel(List<Face> out,VanStaging van,
                                 double x,double z){
        int sides=12;
        int tyre=0x25282b,hub=0x959895;
        for(int i=0;i<sides;i++){
            double a=i*Math.PI*2/sides,b=(i+1)*Math.PI*2/sides;
            var ca=van.world(x,z);
            var pa=van.world(x,z+.34*Math.cos(a));
            var pb=van.world(x,z+.34*Math.cos(b));
            var ha=van.world(x+(x<0?-.018:.018),z+.15*Math.cos(a));
            var hb=van.world(x+(x<0?-.018:.018),z+.15*Math.cos(b));
            Point center=new Point(ca.x(),.36,ca.z());
            Point outerA=new Point(pa.x(),.36+.34*Math.sin(a),pa.z());
            Point outerB=new Point(pb.x(),.36+.34*Math.sin(b),pb.z());
            Point hubCenter=new Point(ca.x()+(x<0?-.021:.021),.36,ca.z());
            Point hubA=new Point(ha.x(),.36+.15*Math.sin(a),ha.z());
            Point hubB=new Point(hb.x(),.36+.15*Math.sin(b),hb.z());
            out.add(new Face(center,outerA,outerB,tyre,-1,0,0,0,0,0,0));
            out.add(new Face(hubCenter,hubA,hubB,hub,-1,0,0,0,0,0,0));
        }
    }
    /** A real sloped roof section in the van's local coordinate system.
     * The inner roof loses 10% of its horizontal span as it rises from the
     * shoulder line; the outer sheet-metal shell sits beyond that surface.
     */
    private static void vanSlope(List<Face> out,VanStaging van,
                                 double xBottom,double yBottom,
                                 double xTop,double yTop,
                                 double zFront,double zRear,int material){
        var a=van.world(xBottom,zFront);var b=van.world(xBottom,zRear);
        var cc=van.world(xTop,zRear);var d=van.world(xTop,zFront);
        double len=zRear-zFront;
        texturedQuad(out,new Point(a.x(),yBottom,a.z()),
            new Point(b.x(),yBottom,b.z()),
            new Point(cc.x(),yTop,cc.z()),
            new Point(d.x(),yTop,d.z()),material,
            0,0,len,0,len,yTop-yBottom,0,yTop-yBottom,0xffffff);
    }
    /** One complete reusable VAN, shared by solo and network world renderers.
     * Architectural shell, floor, supports and socket data are all local to
     * this module. No Car08 wheel/grille triangles remain inside the cargo.
     */
    private VanStaging cachedVan;
    private boolean cachedVanDoors;
    private java.util.Set<EquipmentLoadout.Item> cachedVanStock=java.util.Set.of();
    private java.util.Map<String,EquipmentTiers.Tier> cachedVanTiers=java.util.Map.of();
    private List<Face> cachedVanFaces=List.of();
    private java.util.List<VanRackStock.Entry> cachedVanInventory;
    private void vanModel(List<Face> faces,VanStaging van,
                          java.util.Set<EquipmentLoadout.Item> stock){
        // The 42-position geometry is expensive to decode and transform.
        // Reuse the actual built mesh until the authoritative cargo doors,
        // purchased stock or upgraded LAN equipment changes.
        if(cachedVan==van&&cachedVanDoors==van.cargoDoorClosed()&&
                cachedVanStock.equals(stock)&&cachedVanTiers.equals(rackToolTiers)&&java.util.Objects.equals(cachedVanInventory,rackInventory)){
            faces.addAll(cachedVanFaces);
            return;
        }
        List<Face> constructed=new ArrayList<>();
        buildVanModel(constructed,van,stock);
        cachedVan=van;
        cachedVanDoors=van.cargoDoorClosed();
        cachedVanStock=java.util.Set.copyOf(stock);
        cachedVanTiers=java.util.Map.copyOf(rackToolTiers);
        cachedVanInventory=rackInventory==null?null:java.util.List.copyOf(rackInventory);
        cachedVanFaces=List.copyOf(constructed);
        faces.addAll(cachedVanFaces);
    }
    private void buildVanModel(List<Face> faces,VanStaging van,
                               java.util.Set<EquipmentLoadout.Item> stock){
        double w=VanStaging.HALF_WIDTH,f=VanStaging.FRONT,r=VanStaging.REAR;
        double floor=VanStaging.FLOOR_Y,h=VanStaging.ROOF_Y,iw=VanStaging.INTERIOR_HALF_WIDTH;
        double ir=VanStaging.INTERIOR_ROOF_HALF_WIDTH,shoulder=VanStaging.ROOF_SHOULDER_Y;
        // Raised van deck and a supported fold-out loading ramp share the movement surface.
        vanBox(faces,van,-w,floor-.13,f,w*2,.13,r-f,MaterialAtlas.IRON);
        vanBox(faces,van,-.50,floor+.001,f+.08,1,.012,r-f-.20,MaterialAtlas.IRON);
        for(double z=f+.3;z<r-.2;z+=.35)vanBox(faces,van,-.49,floor+.014,z,.98,.006,.018,MaterialAtlas.IRON);
        var ra=van.world(-VanStaging.RAMP_HALF_WIDTH,f-VanStaging.RAMP_LENGTH);
        var rb=van.world(VanStaging.RAMP_HALF_WIDTH,f-VanStaging.RAMP_LENGTH);
        VanStaging.Position rc=van.world(VanStaging.RAMP_HALF_WIDTH,f),rd=van.world(-VanStaging.RAMP_HALF_WIDTH,f);
        texturedQuad(faces,new Point(ra.x(),0,ra.z()),new Point(rd.x(),floor,rd.z()),new Point(rc.x(),floor,rc.z()),new Point(rb.x(),0,rb.z()),MaterialAtlas.IRON,0,0,0,1.5,1.32,1.5,1.32,0,0xffffff);
        for(int n=1;n<10;n++){double z=f-VanStaging.RAMP_LENGTH+n*VanStaging.RAMP_LENGTH/10;
            vanBox(faces,van,-.65,floor*n/10+.006,z,1.30,.012,.025,MaterialAtlas.IRON);}
        // Original online body profile is retained with measured wall thickness and roof shoulders.
        vanBox(faces,van,-w,floor,f,w-iw,shoulder-floor,r-f,MaterialAtlas.IRON);
        vanBox(faces,van,iw,floor,f,w-iw,shoulder-floor,r-f,MaterialAtlas.IRON);
        vanBox(faces,van,-iw,floor+.02,f+.08,.025,shoulder-floor-.03,r-f-.16,MaterialAtlas.AGED_WOOD);
        vanBox(faces,van,iw-.025,floor+.02,f+.08,.025,shoulder-floor-.03,r-f-.16,MaterialAtlas.AGED_WOOD);
        vanSlope(faces,van,-w,shoulder,-ir-.10,h,f,r,MaterialAtlas.IRON);
        vanSlope(faces,van,w,shoulder,ir+.10,h,f,r,MaterialAtlas.IRON);
        vanSlope(faces,van,-iw+.025,shoulder,-ir,h-.095,f+.08,r-.08,MaterialAtlas.CEILING);
        vanSlope(faces,van,iw-.025,shoulder,ir,h-.095,f+.08,r-.08,MaterialAtlas.CEILING);
        vanBox(faces,van,-ir-.10,h-.04,f,(ir+.10)*2,.11,r-f,MaterialAtlas.IRON);
        vanBox(faces,van,-ir,h-.095,f+.08,ir*2,.025,r-f-.16,MaterialAtlas.CEILING);
        vanBox(faces,van,-w,floor,r-.08,w*2,h-floor,.08,MaterialAtlas.IRON);
        // Cab, sloped windscreen, bonnet, lamps and mirrors are at road-vehicle scale.
        double nose=r+VanStaging.CAB_LENGTH;
        vanBox(faces,van,-w+.04,.40,r,w*2-.08,1.02,VanStaging.CAB_LENGTH-.16,MaterialAtlas.IRON);
        vanBox(faces,van,-w+.04,1.43,r,w*2-.08,.83,.85,MaterialAtlas.IRON);
        VanStaging.Position wa=van.world(-w+.08,r+.85),wb=van.world(w-.08,r+.85);
        VanStaging.Position wc=van.world(w-.08,r+1.64),wd=van.world(-w+.08,r+1.64);
        quad(faces,new Point(wa.x(),2.27,wa.z()),new Point(wb.x(),2.27,wb.z()),new Point(wc.x(),1.44,wc.z()),new Point(wd.x(),1.44,wd.z()),0x344856);
        // Side glazing is inset on both cab doors.
        for(double side:new double[]{-w-.006,w+.006}){
            VanStaging.Position a=van.world(side,r+.15),bb=van.world(side,r+.77),c=van.world(side,r+1.27);
            quad(faces,new Point(a.x(),1.52,a.z()),new Point(bb.x(),1.52,bb.z()),new Point(bb.x(),2.13,bb.z()),new Point(a.x(),2.13,a.z()),0x344856);
            quad(faces,new Point(bb.x(),1.52,bb.z()),new Point(c.x(),1.52,c.z()),new Point(bb.x(),2.13,bb.z()),new Point(bb.x(),1.52,bb.z()),0x344856);
            vanBox(faces,van,side-.015,1.02,r+.32,.03,.06,.17,MaterialAtlas.IRON);
            vanBox(faces,van,side<0?-1.235:1.095,1.38,r+.76,.14,.24,.10,MaterialAtlas.IRON);
            vanBox(faces,van,side<0?-1.10:w,1.48,r+.81,.09,.025,.04,MaterialAtlas.IRON);
        }
        vanBox(faces,van,-w-.02,.35,nose-.16,w*2+.04,.22,.16,MaterialAtlas.IRON);
        vanBox(faces,van,-.55,.62,nose+.002,1.10,.25,.025,MaterialAtlas.CONCRETE);
        for(double side:new double[]{-.88,.65})vanBox(faces,van,side,.96,nose-.15,.23,.18,.035,MaterialAtlas.WINDOW);
        for(double side:new double[]{-w-.035,w+.035})for(double axle:new double[]{f+1.05,r+1.28})vanWheel(faces,van,side,axle);
        // Rear wheel housings are inside the fitted wall volumes, leaving the aisle clear.
        for(double x:new double[]{-iw,iw-.19})vanBox(faces,van,x,floor,f+.65,.19,.25,.84,MaterialAtlas.IRON);
        for(double side:new double[]{-w-.01,w-.015})vanBox(faces,van,side,.32,f+.10,.025,.10,r-f-.2,MaterialAtlas.IRON);
        for(double z=f+.35;z<r-.15;z+=.65){
            for(double x:new double[]{-iw+.025,iw-.055})vanBox(faces,van,x,floor+.03,z,.03,shoulder-floor-.05,.035,MaterialAtlas.IRON);
            vanBox(faces,van,-ir,h-.13,z,ir*2,.025,.035,MaterialAtlas.IRON);
        }
        vanBox(faces,van,-iw+.03,floor+.05,-1.91,.035,1.93,3.45,MaterialAtlas.IRON);
        for(int row=0;row<6;row++){
            double y=floor+.14+row*.33,top=y+.315;
            double t=Math.max(0,(top-VanStaging.ROOF_SHOULDER_Y)/(VanInteriorLayout.ROOF_Y-VanStaging.ROOF_SHOULDER_Y));
            double back=-iw+t*(iw-ir)+.025;
            vanBox(faces,van,back,y-.025,-1.94,-.51-back,.025,3.48,MaterialAtlas.AGED_WOOD);
        }
        for(double z:new double[]{-1.2,-.2,.8})
            vanBox(faces,van,.85,floor+1.36,z-.10,.04,.14,.20,MaterialAtlas.IRON);
        for(VanInteriorLayout.Fixture fixture:VanInteriorLayout.FIXTURES){
            if(!VanInteriorLayout.insideShell(fixture))throw new IllegalStateException("VAN furniture outside cabin: "+fixture.purpose());
            var p=van.world(fixture.localX(),fixture.localZ());
            if(fixture.mesh().equals("monitoring_screen_mp_1")){
                double angle=van.placement().yaw()+fixture.yaw();
                for(var t:GlbProps.model(fixture.mesh()).triangles()){
                    Point[] pp=new Point[3];var vv=new GlbProps.Vertex[]{t.a(),t.b(),t.c()};
                    for(int i=0;i<3;i++){var v=VanInteriorLayout.vertex(fixture.mesh(),vv[i]);pp[i]=new Point(p.x()+fixture.scale()*(v.x()*Math.cos(angle)-v.z()*Math.sin(angle)),fixture.y()+v.y()*fixture.scale(),p.z()+fixture.scale()*(v.x()*Math.sin(angle)+v.z()*Math.cos(angle)));}
                    boolean screen=t.material()==VanInteriorLayout.screenMaterial();
                    int material=screen&&fixture.purpose().equals("main command monitor")
                        ?GlbProps.VAN_MAP_MATERIAL:t.material();
                    faces.add(new Face(pp[0],pp[1],pp[2],0xffffff,material,t.a().u(),screen?1-t.a().v():t.a().v(),t.b().u(),screen?1-t.b().v():t.b().v(),t.c().u(),screen?1-t.c().v():t.c().v()));
                }
            }else imported(faces,fixture.mesh(),p.x(),fixture.y(),p.z(),fixture.scale(),van.placement().yaw()+fixture.yaw());
        }
        vanBox(faces,van,.40,floor+.742,1.47,.07,.035,.11,MaterialAtlas.IRON);
        for(double z:new double[]{-1.48,-.10,1.16})vanBox(faces,van,-.10,h-.13,z,.20,.035,.30,MaterialAtlas.WINDOW);
        var button=van.doorButton();imported(faces,"button_12",button.x(),floor+1.2,button.z(),.30,van.placement().yaw()+Math.PI/2);
        java.util.List<VanRackStock.Entry> inventory=rackInventory;
        if(inventory==null){
            inventory=new ArrayList<>();
            if(!rackToolTiers.isEmpty())for(var entry:new java.util.TreeMap<>(rackToolTiers).entrySet())inventory.add(new VanRackStock.Entry(entry.getKey(),entry.getValue(),1));
            else for(var item:stock){String id=switch(item){case EMF->"EMF_READER";case THERMOMETER->"THERMOMETER";case SPIRIT_BOX->"SPIRIT_BOX";case UV_LAMP->"UV_LIGHT";case PHOTO_CAMERA->"PHOTO_CAMERA";case SALT->"SALT";};inventory.add(new VanRackStock.Entry(id,EquipmentTiers.Tier.I,1));}
        }
        for(var item:VanRackStock.place(inventory)){
            for(var triangle:GlbProps.model(item.entry().model()).triangles()){
                var vv=new GlbProps.Vertex[]{triangle.a(),triangle.b(),triangle.c()};Point[] pp=new Point[3];
                for(int n=0;n<3;n++){var v=item.vertex(vv[n]);var position=van.world(v.x(),v.z());pp[n]=new Point(position.x(),v.y(),position.z());}
                faces.add(new Face(pp[0],pp[1],pp[2],0xffffff,triangle.material(),triangle.a().u(),triangle.a().v(),triangle.b().u(),triangle.b().v(),triangle.c().u(),triangle.c().v()));
            }
        }
        cargoDoorLeaf(faces,van,true);cargoDoorLeaf(faces,van,false);
    }

    /** Actual masonry, pitched roof and recessed window details from curated
     * Kenney meshes. Each home is a single measured architectural parcel.
     */
    private static void streetResidence(List<Face> out,VanStaging van,
                                        VanStreetHouses.House home){
        double start=home.buildingStartX(),end=home.buildingEndX();
        double z0=home.frontageStartZ(),z1=home.frontageEndZ();
        double height=home.wallHeight();
        vanBox(out,van,start,.04,z0,end-start,height,home.frontage(),home.masonry());
        double centreX=(start+end)*.5;
        vanSlope(out,van,start-.12,height,centreX,height+home.roofRise(),
            z0-.18,z1+.18,home.roof());
        vanSlope(out,van,end+.12,height,centreX,height+home.roofRise(),
            z0-.18,z1+.18,home.roof());
        // Physical eaves face the road, while the corner uprights hide wall
        // joints. Windows and doors are mounted a little in front of masonry.
        double face=home.streetFace(),direction=-home.side();
        for(double zz:new double[]{home.frontageZ()-1.25,
                                    home.frontageZ()+1.25}){
            var window=van.world(face+direction*.14,zz);
            imported(out,"kenney_medieval_wall_pane_wood_window",
                window.x(),1.30,window.z(),.73,
                van.placement().yaw()+home.side()*Math.PI/2);
            var upstairs=van.world(face+direction*.14,zz);
            imported(out,"kenney_medieval_wall_pane_wood_window",
                upstairs.x(),height-1.15,upstairs.z(),.62,
                van.placement().yaw()+home.side()*Math.PI/2);
        }
        var door=van.world(face+direction*.17,home.frontageZ());
        imported(out,"door_1_loose",door.x(),.05,door.z(),1.08,
            van.placement().yaw()+home.side()*Math.PI/2);
        for(double zz:new double[]{z0+.24,z1-.24}){
            vanBox(out,van,home.side()>0?start:start+.03,.05,zz,
                .13,height-.08,.13,MaterialAtlas.AGED_WOOD);
        }
        var light=van.world(face+direction*.23,home.frontageZ()+.7);
        imported(out,"kenney_detail_light_single",light.x(),2.42,light.z(),
            .54,van.placement().yaw()+home.side()*Math.PI/2);
    }
    private static void streetTerminus(List<Face> out,VanStaging van){
        var terminal=VanStreetHouses.TERMINUS;
        double start=-terminal.width()*.5,z=terminal.centreZ();
        vanBox(out,van,start,.04,z-terminal.depth()*.5,terminal.width(),
            terminal.height(),terminal.depth(),MaterialAtlas.STONE);
        double half=terminal.width()*.5;
        // Paired gables raise a credible skyline at the closed street end.
        vanSlope(out,van,-half-.15,terminal.height(),0,terminal.height()+1.35,
            z-terminal.depth()*.5-.2,z+terminal.depth()*.5+.2,MaterialAtlas.AGED_WOOD);
        vanSlope(out,van,half+.15,terminal.height(),0,terminal.height()+1.35,
            z-terminal.depth()*.5-.2,z+terminal.depth()*.5+.2,MaterialAtlas.AGED_WOOD);
        for(double xx:new double[]{-3.65,-1.25,1.25,3.65}){
            var point=van.world(xx,z+terminal.depth()*.5+.14);
            imported(out,"kenney_medieval_wall_pane_wood_window",point.x(),
                2.25,point.z(),.77,van.placement().yaw());
            imported(out,"kenney_medieval_wall_pane_wood_window",point.x(),
                4.10,point.z(),.77,van.placement().yaw());
        }
        var doorway=van.world(0,z+terminal.depth()*.5+.17);
        imported(out,"door_1_loose",doorway.x(),0,doorway.z(),1.08,
            van.placement().yaw());
    }
    /** Actual measured outdoor street built from original Kenney diffuse
     * materials rather than the mixed-height prefabs. Those prefabs include
     * wide white concrete endcaps and a single asphalt centre panel, and when
     * stretched they produced the awful bright-dark striped checkerboard.
     */
    private VanStaging cachedRoadSite;
    private List<Face> cachedRoadFaces=List.of();
    private static void roadSurface(List<Face> out,VanStaging van,
                                    VanArrivalStreet.RoadTile tile,
                                    int sourceMaterial){
        double halfX=tile.scaleX()*.5,halfZ=tile.scaleZ()*.5;
        double xa=tile.x()-halfX,xb=tile.x()+halfX;
        double za=tile.z()-halfZ,zb=tile.z()+halfZ;
        boolean sidewalk=VanArrivalStreet.sidewalk(tile);
        double height=sidewalk?.119:.049;
        VanStaging.Position a=van.world(xa,za),b=van.world(xb,za),
            cc=van.world(xb,zb),d=van.world(xa,zb);
        // Continuity in UV space is defined by physical metres, not every
        // prefab's independent UV origin. Both source albedos repeat at the
        // same density across adjacent faces.
        double u0=xa*.48,v0=za*.48,u1=xb*.48,v1=zb*.48;
        texturedQuad(out,new Point(a.x(),height,a.z()),
            new Point(b.x(),height,b.z()),
            new Point(cc.x(),height,cc.z()),
            new Point(d.x(),height,d.z()),sourceMaterial,
            u0,v0,u1,v0,u1,v1,u0,v1,sidewalk?0xd8d2cb:0xe0e0e0);
    }
    private void roadsideModels(List<Face> out,HouseMap map){
        VanStaging van=map.van();
        if(cachedRoadSite==van){
            out.addAll(cachedRoadFaces);
            return;
        }
        List<Face> road=new ArrayList<>();
        int asphalt=VanArrivalStreet.surfaceMaterial(false),
            pavement=VanArrivalStreet.surfaceMaterial(true);
        if(asphalt==pavement)
            throw new IllegalStateException("Mixed Kenney road surface materials not separated");
        for(VanArrivalStreet.RoadTile tile:VanArrivalStreet.tiles())
            roadSurface(road,van,tile,
                VanArrivalStreet.sidewalk(tile)?pavement:asphalt);

        // True upstanding kerbs separate the road from pedestrian pavement.
        // Strip top and outward vertical faces stay entirely beside the
        // carriageway, instead of being stretched across the road.
        for(int side:new int[]{-1,1}){
            double curb=side<0?-VanArrivalStreet.ROAD_HALF_WIDTH-.13:
                VanArrivalStreet.ROAD_HALF_WIDTH+.02;
            vanBox(road,van,curb,.049,VanArrivalStreet.ROAD_END,
                .11,.071,VanArrivalStreet.ROAD_START-VanArrivalStreet.ROAD_END,
                MaterialAtlas.CONCRETE);
            // Faint road-edge white line, parallel with travel direction.
            double edge=side<0?-VanArrivalStreet.ROAD_HALF_WIDTH+.20:
                VanArrivalStreet.ROAD_HALF_WIDTH-.27;
            vanBox(road,van,edge,.052,VanArrivalStreet.ROAD_END+.20,
                .07,.006,VanArrivalStreet.ROAD_START-VanArrivalStreet.ROAD_END-.4,
                MaterialAtlas.CERAMIC);
        }
        // Real sidewalk slab joints, every two metres. They do not cross
        // asphalt, and can be checked independently of road texture seams.
        for(int step=1;step<8;step++){
            double zz=VanArrivalStreet.ROAD_START-step*2.0;
            for(int side:new int[]{-1,1}){
                double left=side<0?-VanArrivalStreet.ROAD_HALF_WIDTH-2.05:
                    VanArrivalStreet.ROAD_HALF_WIDTH+.13;
                vanBox(road,van,left,.120,zz-.023,1.96,.004,.046,
                    MaterialAtlas.CONCRETE);
            }
        }
        // Narrow road paint is recessed to asphalt scale. Dashed centre
        // markings recur at realistic intervals; no huge cream slabs.
        for(double centre=VanArrivalStreet.ROAD_START-1.8;
                centre>VanArrivalStreet.ROAD_END+1;centre-=4.0)
            vanBox(road,van,-.052,.051,centre-.80,.104,.007,1.60,
                MaterialAtlas.CERAMIC);
        vanBox(road,van,-1.15,.048,VanArrivalStreet.ROAD_START,
            2.30,.025,VanStaging.FRONT-VanArrivalStreet.ROAD_START,
            MaterialAtlas.CONCRETE);

        // The roadway sits inside a real block of homes, not an infinite
        // void or a random solid boundary. Medieval Kenney window elements
        // are used only as dimensioned facade details.
        for(VanStreetHouses.House home:VanStreetHouses.HOMES)
            streetResidence(road,van,home);
        streetTerminus(road,van);
        // Original GGBot parked cars, all clear of the rear-door walking path.
        for(VanArrivalStreet.RoadObject vehicle:VanArrivalStreet.parkedVehicles()){
            VanStaging.Position p=van.world(vehicle.x(),vehicle.z());
            imported(road,vehicle.mesh(),p.x(),.065,p.z(),vehicle.scale(),
                van.placement().yaw()+vehicle.yaw());
        }
        cachedRoadSite=van;
        cachedRoadFaces=List.copyOf(road);
        out.addAll(cachedRoadFaces);
    }

    /** Three visually distinct small PS-era rite installations at fixed room sockets. */
    private static void ritualInstallation(List<Face> out,RitualSites.Site site,
                                            double clock,boolean energized){
        double x=site.x(),y=site.y()+.012,z=site.z();
        int color=energized?0xc3b99b:0x786c57;
        // Faded, physically laid floor markings identify a rite socket without
        // inventing furniture or blocking the room's circulation route.
        for(int k=0;k<20;k++){
            double a=k*Math.PI/10,b=(k+1)*Math.PI/10,r=.72;
            quad(out,new Point(x+Math.cos(a)*r,y,z+Math.sin(a)*r),new Point(x+Math.cos(b)*r,y,z+Math.sin(b)*r),
                new Point(x+Math.cos(b)*(r-.018),y,z+Math.sin(b)*(r-.018)),new Point(x+Math.cos(a)*(r-.018),y,z+Math.sin(a)*(r-.018)),color);
        }
        int strokes=site.rite().ordinal()+3;
        for(int k=0;k<strokes;k++){
            double a=k*Math.PI*2/strokes;
            quad(out,new Point(x+Math.cos(a)*.36,y,z+Math.sin(a)*.36),new Point(x+Math.cos(a+.05)*.36,y,z+Math.sin(a+.05)*.36),
                new Point(x+Math.cos(a+.05)*.61,y,z+Math.sin(a+.05)*.61),new Point(x+Math.cos(a)*.61,y,z+Math.sin(a)*.61),color);
        }
    }

    /** Exterior glazing stays collision-solid. The window's thickness and
     * sash are actual PSX geometry, not imported investigative equipment.
     */
    private static void architecturalWindow(List<Face> out,int xx,int zz,
            int side,double ceiling){
        final double sill=1.02,head=Math.min(2.24,ceiling-.45);
        int masonry=0x82766d,sash=0x514339;
        if(side<=1){
            double wallX=side==0?xx-.055:xx+.99;
            box(out,wallX,0,zz,.06,sill,1.0,masonry);
            box(out,wallX,head,zz,.06,ceiling-head,1.0,masonry);
            box(out,wallX,sill,zz,.06,head-sill,.10,sash);
            box(out,wallX,sill,zz+.90,.06,head-sill,.10,sash);
            box(out,wallX,sill,zz+.10,.06,head-sill,.80,0x42647a);
            box(out,wallX+.008,sill+.57,zz+.10,.045,.055,.80,sash);
            box(out,wallX+.008,sill,zz+.47,.045,head-sill,.055,sash);
        }else{
            double wallZ=side==2?zz-.055:zz+.99;
            box(out,xx,0,wallZ,1.0,sill,.06,masonry);
            box(out,xx,head,wallZ,1.0,ceiling-head,.06,masonry);
            box(out,xx,sill,wallZ,.10,head-sill,.06,sash);
            box(out,xx+.90,sill,wallZ,.10,head-sill,.06,sash);
            box(out,xx+.10,sill,wallZ,.80,head-sill,.06,0x42647a);
            box(out,xx+.10,sill+.57,wallZ,.80,.055,.05,sash);
            box(out,xx+.47,sill,wallZ,.055,head-sill,.05,sash);
        }
    }
    /** Overhead masonry and timberwork: actual pitched roof planes create
     * recognisable gables and wings, not a fake outline on the HUD.
     */
    private static void pitchedRoof(List<Face> out,double x0,double x1,
            double z0,double z1,double wallTop,double ridgeRise,int material){
        double middle=(x0+x1)/2.0,edge=wallTop+.12,ridge=edge+ridgeRise;
        texturedQuad(out,new Point(x0,edge,z0),new Point(middle,ridge,z0),
            new Point(middle,ridge,z1),new Point(x0,edge,z1),
            material,0,0,x1-x0,0,x1-x0,z1-z0,0,z1-z0,0x9b9794);
        texturedQuad(out,new Point(middle,ridge,z0),new Point(x1,edge,z0),
            new Point(x1,edge,z1),new Point(middle,ridge,z1),
            material,0,0,x1-x0,0,x1-x0,z1-z0,0,z1-z0,0x8c8583);
        // Closed triangular gable faces preserve a substantial exterior silhouette.
        Point a=new Point(x0,edge,z0),b=new Point(middle,ridge,z0),c=new Point(x1,edge,z0);
        out.add(new Face(a,b,c,0x544b49,material,0,0,1,0,2,0));
        a=new Point(x1,edge,z1);b=new Point(middle,ridge,z1);c=new Point(x0,edge,z1);
        out.add(new Face(a,b,c,0x544b49,material,0,0,1,0,2,0));
    }
    private void siteRoof(List<Face> out,HouseMap map){
        if(!map.authoredArchitecture())return;
        double y=map.ceilingHeight();
        if(map.site()==HouseMap.Site.HOUSE){
            // Asymmetric Victorian slate gables follow the real three-part
            // footprint. Roof planes are high enough not to block the ground
            // camera, and remain strictly environmental architecture.
            if(Math.hypot(x-11,z-38)<43)
                pitchedRoof(out,3,18,11,69,y,2.35,MaterialAtlas.STONE);
            if(Math.hypot(x-37,z-38)<43)
                pitchedRoof(out,29,45,11,69,y,2.45,MaterialAtlas.STONE);
            if(Math.hypot(x-23,z-38)<43)
                pitchedRoof(out,18,29,11,66,y,2.95,MaterialAtlas.AGED_WOOD);
            if(Math.hypot(x-23,z-69)<14)
                pitchedRoof(out,19,28,65,72,y-.35,1.55,MaterialAtlas.STONE);
        }else if(map.site()==HouseMap.Site.FARMHOUSE){
            if(Math.hypot(x-11,z-31)<46)
                pitchedRoof(out,2,20,2,57,y,2.1,MaterialAtlas.AGED_WOOD);
            if(Math.hypot(x-43,z-31)<46)
                pitchedRoof(out,34,54,2,57,y,2.1,MaterialAtlas.AGED_WOOD);
            if(Math.hypot(x-27,z-30)<46)
                pitchedRoof(out,20,34,2,60,y,2.7,MaterialAtlas.STONE);
        }else if(map.site()==HouseMap.Site.SCHOOL){
            if(Math.hypot(x-14,z-38)<51)
                pitchedRoof(out,2,27,3,69,y,2.4,MaterialAtlas.STONE);
            if(Math.hypot(x-55,z-38)<51)
                pitchedRoof(out,42,68,3,69,y,2.4,MaterialAtlas.STONE);
            if(Math.hypot(x-34,z-35)<52)
                pitchedRoof(out,27,43,1,70,y,3.6,MaterialAtlas.STONE);
        }
    }
    private List<Face> scene(HouseMap map,int ghostRoom,boolean ghostVisible,int wardRoom,int hunterRoom,
            double clock,List<RemoteBody> others,Apparition apparition,List<WorldMark> marks) {
        List<Face> out=new ArrayList<>(2000);
        levelArchitecture(out,map);
        looseClutter(out,map);
        eventFixtures(out,map);
        for(RitualSites.Site site:RitualSites.all(map))
            if(Math.hypot(site.x()-x,site.z()-z)<14)
                ritualInstallation(out,site,clock,activeRite==site.rite());
        if(apparition!=null&&strikeUntilTick>=roomLightTick
                &&Math.hypot(apparition.x()-x,apparition.z()-z)<14){
            // Telegraph only at a host-disclosed apparition; do not expose invisible ghost positions.
            double age=Math.max(0,Math.min(1,
                1-(strikeUntilTick-roomLightTick)/(double)LanTelegraphedStrike.WINDUP_TICKS));
            for(int k=0;k<12;k++){
                double a=k*Math.PI/6+clock*3.8;
                double r=.40+.45*age;
                box(out,apparition.x()+Math.cos(a)*r-.032,
                    .14+.22*(1+Math.sin(clock*9+k)),
                    apparition.z()+Math.sin(a)*r-.032,
                    .065,.11,.065,k%2==0?0xea5e69:0xffb782);
            }
        }
        if(Math.hypot(map.van().placement().x()-x,map.van().placement().z()-z)<14)
            vanModel(out,map.van(),rackStock);
        // Road and traffic props are exterior-only. Nearby rooms never instantiate
        // a second duplicate set of these global world objects.
        if(Math.hypot(x-map.van().placement().x(),z-map.van().placement().z())<20)
            roadsideModels(out,map);
        // Tripods are real placed supports, never decor dropped by the map loader.
        for(VanTripods.Stand stand:tripods.values())
            if(Math.hypot(stand.x()-x,stand.z()-z)<13.5)
                imported(out,stand.mesh(),stand.x(),stand.y(),stand.z(),1.0,0);
        // Video cameras are actual mounted viewports; their footage is rendered
        // from this replicated camera location in the hunter's van monitor.
        for(LanVideoCameras.Camera camera:videoCameras.values())
            if(Math.hypot(camera.x()-x,camera.z()-z)<13.5)
                imported(out,"exploration_photo_camera",
                    camera.x(),camera.y()+.14,camera.z(),1.05,
                    Math.toRadians(camera.heading()));
        // An ignited incense bundle stays physically present for its burn duration.
        // These wisps are light/smoke only and never fabricate spectral evidence.
        incense.removeIf(b->b.untilTick()<roomLightTick);
        for(IncenseSmoke burn:incense){
            if(Math.hypot(burn.x()-x,burn.z()-z)>13.5)continue;
            double floor=map.floorY(burn.room());
            imported(out,EquipmentModelCatalog.variant("INCENSE",
                EquipmentTiers.Tier.I,"burning"),burn.x(),floor+.045,
                burn.z(),.7,0);
            double phase=clock*1.7+burn.x();
            // Last embers dissipate instead of cutting a full column off instantly.
            int density=Math.max(1,Math.min(8,(burn.untilTick()-roomLightTick+1)/2));
            for(int i=0;i<density;i++){
                double rise=.2+i*.22;
                double sway=Math.sin(phase+i*.8)*(.04+rise*.07);
                double px=burn.x()+sway,pz=burn.z()+Math.cos(phase+i*.45)*.07;
                double spread=.05+i*.009;
                box(out,px-spread*.5,floor+rise,pz-spread*.5,spread,.04+i*.004,spread,
                    i%2==0?0x6e8888:0x8f9d96);
            }
        }
        // Physical array models appear only for host-authorized placed nodes.
        for(VanSensorStations.Station node:sensorPositions.values()){
            if(Math.hypot(node.x()-x,node.z()-z)>13.5)continue;
            imported(out,node.model(),node.x(),map.floorY(node.room())+.04,
                node.z(),1.0,0);
        }
        // This device exists ONLY after an owner physically deploys it.
        // Projected light is a physical effect, not an evidence qualification check.
        for(LanDotsProjectors.Placement placement:dotsPositions.values()){
            if(Math.hypot(placement.x()-x,placement.z()-z)>13.5)continue;
            imported(out,"vape_mp_1",placement.x(),placement.y()+.10,placement.z(),2.0,0);
            double radius=EquipmentTiers.stage(
                "DOTS_PROJECTOR",placement.tier()).reachCm()/100.0;
            // Tier I: narrow sparse volume; Tier II: broad static array;
            // Tier III: wide motorized sweep. Beams alone never count as evidence.
            int limit=placement.tier()==EquipmentTiers.Tier.I?3:5;
            for(int gx=-limit;gx<=limit;gx+=2)for(int gz=-limit;gz<=limit;gz+=2){
                double px=placement.x()+gx*radius/(limit+1.0),
                    pz=placement.z()+gz*radius/(limit+1.0);
                if(Math.hypot(px-placement.x(),pz-placement.z())>radius
                        ||map.roomAt(px,placement.y(),pz)!=placement.room())continue;
                if(placement.tier()==EquipmentTiers.Tier.III){
                    double angle=Math.atan2(pz-placement.z(),px-placement.x());
                    double center=Math.sin(clock*1.4)*1.25;
                    if(Math.abs(Math.atan2(Math.sin(angle-center),Math.cos(angle-center)))>1.05)
                        continue;
                }
                int layers=placement.tier()==EquipmentTiers.Tier.I?2:3;
                for(int layer=0;layer<layers;layer++){
                    double yy=placement.y()+.08+layer*.67;
                    box(out,px-.025,yy,pz-.025,.05,.035,.05,0x73d99e);
                }
            }
        }
        if(dotsPassRoom>=0&&dotsPassUntil>=roomLightTick
                &&Math.hypot(dotsPassX-x,dotsPassZ-z)<13.5){
            for(int layer=0;layer<10;layer++){
                double y=map.floorY(dotsPassRoom)+.19+layer*.135;
                double span=.14+Math.sin(Math.PI*layer/10.0)*.17;
                for(int dot=-2;dot<=2;dot++)
                    box(out,dotsPassX+dot*span/3-.02,y,dotsPassZ-.03,
                        .04,.028,.04,0x98edbb);
            }
        }
        if(placedWritingBookRoom>=0&&placedWritingBookRoom<HouseMap.INDOOR_ROOMS){
            double bx=writingBookHasPosition?writingBookX:map.centerX(placedWritingBookRoom)-.5;
            double bz=writingBookHasPosition?writingBookZ:map.centerZ(placedWritingBookRoom)-.35;
            double by=writingBookHasPosition?writingBookY+.075:map.floorY(placedWritingBookRoom)+.075;
            if(Math.hypot(bx-x,bz-z)<14)
                imported(out,writingBookHasPosition
                    ?EquipmentModelCatalog.variant("GHOST_WRITING_BOOK",writingBookTier,"open")
                    :"open_book_mp_1",bx,by,bz,writingBookHasPosition?1.0:1.65,0);
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
                    // A purchased and actually deployed salt pouch receives its
                    // approved ground-state mesh at the host's real floor height.
                    imported(out,EquipmentModelCatalog.variant("SALT",
                        EquipmentTiers.Tier.I,"deployed"),mx,yy,mz,1.0,0);
                }
            }
        }
        return out;
    }
    private final java.util.Map<HouseMap.Site,List<Face>> levelShells=new java.util.EnumMap<>(HouseMap.Site.class);
    private boolean exportFullLevel;

    private static void own(List<Face> out,List<Face> faces,int room){for(Face f:faces)out.add(f.owned(room));}
    private static boolean nearPlane(double a,double b){return Math.abs(a-b)<.12;}
    private static void levelWallPatch(List<Face> out,LevelDefinition.Room r,boolean alongX,double plane,
            double from,double to,double bottom,double top,int material){
        if(to-from<.005||top-bottom<.005)return;
        // Each height band owns its surface. Timber never overlays a plaster face.
        if(LevelMaterials.panelled(r)){
            levelWallPatchPlain(out,alongX,plane,from,to,Math.max(bottom,r.y()),Math.min(top,r.y()+.15),LevelMaterials.WOOD);
            levelWallPatchPlain(out,alongX,plane,from,to,Math.max(bottom,r.y()+.15),Math.min(top,r.y()+.88),LevelMaterials.WOOD);
            levelWallPatchPlain(out,alongX,plane,from,to,Math.max(bottom,r.y()+.88),Math.min(top,r.y()+.925),LevelMaterials.WOOD);
            levelWallPatchPlain(out,alongX,plane,from,to,Math.max(bottom,r.y()+.925),top,material);
        }else levelWallPatchPlain(out,alongX,plane,from,to,bottom,top,material);
        if(bottom<=r.y()+.01){
            double length=to-from,xx=alongX?from:plane-.025,zz=alongX?plane-.025:from;
            texturedBox(out,xx,r.y()+.02,zz,alongX?length:.05,.13,alongX?.05:length,LevelMaterials.WOOD);
            if(LevelMaterials.panelled(r)){
                texturedBox(out,xx,r.y()+.88,zz,alongX?length:.06,.045,alongX?.06:length,LevelMaterials.WOOD);
                for(double t=from+.15;t<to-.10;t+=.62){
                    double x=alongX?t:plane-.03,z=alongX?plane-.03:t;
                    texturedBox(out,x,r.y()+.16,z,alongX?.035:.06,.70,alongX?.06:.035,LevelMaterials.WOOD);
                }
            }
        }
        if(top>=r.y()+r.height()-.05){double len=to-from;
            texturedBox(out,alongX?from:plane-.045,top-.12,alongX?plane-.045:from,
                alongX?len:.09,.09,alongX?.09:len,LevelMaterials.WOOD);
        }
    }
    private static void levelWallPatchPlain(List<Face> out,boolean ax,double plane,double a,double b,double y0,double y1,int mat){
        if(y1<=y0)return;
        texturedQuad(out,new Point(ax?a:plane,y0,ax?plane:a),new Point(ax?b:plane,y0,ax?plane:b),
            new Point(ax?b:plane,y1,ax?plane:b),new Point(ax?a:plane,y1,ax?plane:a),mat,
            a/2,0,b/2,0,b/2,(y1-y0),a/2,(y1-y0),0xffffff);
    }
    private static void levelWall(List<Face> out,LevelDefinition level,LevelDefinition.Room r,boolean alongX,double plane,double from,double to){
        // An open hayloft is a deck inside the barn volume, not another set
        // of coplanar enclosing walls painted over the barn's existing walls.
        if(r.name().toLowerCase().contains("loft")){
            var parent=level.rooms().stream().filter(p->!p.outside()&&p.id()!=r.id()&&p.y()<r.y()
                &&p.y()+p.height()>=r.y()+r.height()-.05&&p.x0()<=r.x0()&&p.x1()>=r.x1()&&p.z0()<=r.z0()&&p.z1()>=r.z1()).findFirst().orElse(null);
            if(parent!=null){
                boolean perimeter=alongX?(nearPlane(plane,parent.z0())||nearPlane(plane,parent.z1())):(nearPlane(plane,parent.x0())||nearPlane(plane,parent.x1()));
                if(!perimeter)levelRail(out,alongX?from:plane,r.y(),alongX?plane:from,alongX?to:plane,r.y(),alongX?plane:to);
                return;
            }
        }
        var openings=level.portals().stream().filter(p->!p.kind().equals("stair")&&p.alongX()==alongX
            &&(p.a()==r.id()||p.b()==r.id())&&nearPlane(p.y(),r.y())
            &&nearPlane(alongX?p.z():p.x(),plane)).sorted(java.util.Comparator.comparingDouble(p->alongX?p.x():p.z())).toList();
        double direction=nearPlane(plane,alongX?r.z0():r.x0())?1:-1;
        double facePlane=plane+direction*LevelDefinition.WALL_HALF_THICKNESS;
        double at=from;int mat=LevelMaterials.wall(r);
        for(var p:openings){
            double mid=alongX?p.x():p.z(),lo=Math.max(from,mid-p.width()/2),hi=Math.min(to,mid+p.width()/2);
            if(hi<=from||lo>=to)continue;
            levelWallPatch(out,r,alongX,facePlane,at,lo,r.y(),r.y()+r.height()-.04,mat);
            boolean window=p.kind().equals("window");double sill=window?r.y()+1.0:r.y();double head=window?r.y()+2.35:r.y()+2.32;
            if(window)levelWallPatch(out,r,alongX,facePlane,lo,hi,r.y(),sill,mat);
            levelWallPatch(out,r,alongX,facePlane,lo,hi,head,r.y()+r.height()-.04,mat);
            if(p.a()==r.id()){
            double xx=alongX?lo-.055:plane-.11,zz=alongX?plane-.11:lo-.055;
            texturedBox(out,xx,sill,zz,alongX?.07:.22,head-sill,alongX?.22:.07,LevelMaterials.WOOD);
            texturedBox(out,alongX?hi-.015:plane-.11,sill,alongX?plane-.11:hi-.015,
                alongX?.07:.22,head-sill,alongX?.22:.07,LevelMaterials.WOOD);
            texturedBox(out,xx,head-.045,zz,alongX?hi-lo+.11:.22,.09,alongX?.22:hi-lo+.11,LevelMaterials.WOOD);
            if(window)texturedBox(out,xx,sill-.045,zz,alongX?hi-lo+.11:.22,.07,alongX?.22:hi-lo+.11,LevelMaterials.WOOD);
            }
            at=Math.max(at,hi);
        }
        levelWallPatch(out,r,alongX,facePlane,at,to,r.y(),r.y()+r.height()-.04,mat);
    }
    private static void levelRail(List<Face> out,double x0,double y0,double z0,double x1,double y1,double z1){
        double length=Math.hypot(x1-x0,z1-z0);int count=Math.max(1,(int)Math.ceil(length/.24));
        for(int i=0;i<=count;i++){
            double t=i/(double)count,xx=x0+(x1-x0)*t,zz=z0+(z1-z0)*t,yy=y0+(y1-y0)*t;
            texturedBox(out,xx-.022,yy,zz-.022,.044,.92,.044,LevelMaterials.WOOD);
        }
        double dx=x1-x0,dz=z1-z0,ex=-dz/length*.045,ez=dx/length*.045;
        quad(out,new Point(x0+ex,y0+.96,z0+ez),new Point(x1+ex,y1+.96,z1+ez),new Point(x1-ex,y1+.96,z1-ez),new Point(x0-ex,y0+.96,z0-ez),0x96764e);
        quad(out,new Point(x0+ex,y0+.90,z0+ez),new Point(x1+ex,y1+.90,z1+ez),new Point(x1+ex,y1+.96,z1+ez),new Point(x0+ex,y0+.96,z0+ez),0x685035);
    }
    private static void levelDeck(List<Face> out,LevelDefinition level,LevelDefinition.Room r,boolean ceiling){
        double deck=ceiling?r.y()+r.height():r.y(),surface=ceiling?deck-.04:deck;
        java.util.TreeSet<Double> xs=new java.util.TreeSet<>(),zs=new java.util.TreeSet<>();
        xs.add(r.x0());xs.add(r.x1());zs.add(r.z0());zs.add(r.z1());
        for(double x=Math.ceil(r.x0()/2)*2;x<r.x1();x+=2)xs.add(x);
        for(double z=Math.ceil(r.z0()/2)*2;z<r.z1();z+=2)zs.add(z);
        for(var v:level.voids())if(Math.abs(v.y()-deck)<.05){
            if(v.x0()>r.x0()&&v.x0()<r.x1())xs.add(v.x0());if(v.x1()>r.x0()&&v.x1()<r.x1())xs.add(v.x1());
            if(v.z0()>r.z0()&&v.z0()<r.z1())zs.add(v.z0());if(v.z1()>r.z0()&&v.z1()<r.z1())zs.add(v.z1());
        }
        if(r.outside())for(var indoor:level.rooms())if(indoor.id()!=r.id()&&Math.abs(indoor.y()-deck)<.05&&(!indoor.outside()
                ||(indoor.x1()-indoor.x0())*(indoor.z1()-indoor.z0())<(r.x1()-r.x0())*(r.z1()-r.z0()))){
            if(indoor.x0()>r.x0()&&indoor.x0()<r.x1())xs.add(indoor.x0());if(indoor.x1()>r.x0()&&indoor.x1()<r.x1())xs.add(indoor.x1());
            if(indoor.z0()>r.z0()&&indoor.z0()<r.z1())zs.add(indoor.z0());if(indoor.z1()>r.z0()&&indoor.z1()<r.z1())zs.add(indoor.z1());
        }
        var xx=new ArrayList<>(xs);var zz=new ArrayList<>(zs);
        for(int i=0;i<xx.size()-1;i++)for(int j=0;j<zz.size()-1;j++){
            double x0=xx.get(i),x1=xx.get(i+1),z0=zz.get(j),z1=zz.get(j+1),mx=(x0+x1)/2,mz=(z0+z1)/2;
            if(level.floorVoid(mx,deck,mz))continue;
            if(r.outside()&&level.rooms().stream().anyMatch(in->in.id()!=r.id()&&Math.abs(in.y()-deck)<.05&&mx>in.x0()&&mx<in.x1()&&mz>in.z0()&&mz<in.z1()
                &&(!in.outside()||(in.x1()-in.x0())*(in.z1()-in.z0())<(r.x1()-r.x0())*(r.z1()-r.z0()))))continue;
            if(ceiling&&level.rooms().stream().anyMatch(in->!in.outside()&&in.id()!=r.id()&&Math.abs(in.y()+in.height()-deck)<.05
                &&in.x0()<=r.x0()&&in.x1()>=r.x1()&&in.z0()<=r.z0()&&in.z1()>=r.z1()
                &&((in.x1()-in.x0())*(in.z1()-in.z0())>(r.x1()-r.x0())*(r.z1()-r.z0())+.01||in.id()<r.id())))continue;
            int mat=ceiling?LevelMaterials.CEILING:LevelMaterials.floor(r);
            if(ceiling)texturedQuad(out,new Point(x0,surface,z0),new Point(x1,surface,z0),new Point(x1,surface,z1),new Point(x0,surface,z1),mat,x0/4,z0/4,x1/4,z0/4,x1/4,z1/4,x0/4,z1/4,0xffffff);
            else texturedQuad(out,new Point(x0,surface,z1),new Point(x1,surface,z1),new Point(x1,surface,z0),new Point(x0,surface,z0),mat,x0/4,z1/4,x1/4,z1/4,x1/4,z0/4,x0/4,z0/4,0xffffff);
        }
    }
    private static List<Face> buildLevelShell(HouseMap map){
        LevelDefinition level=map.level();List<Face> out=new ArrayList<>();
        for(var r:level.rooms()){
            List<Face> part=new ArrayList<>();
            levelDeck(part,level,r,false);
            if(!r.outside())levelDeck(part,level,r,true);
            if(!r.outside()){
                levelWall(part,level,r,true,r.z0(),r.x0(),r.x1());
                levelWall(part,level,r,true,r.z1(),r.x0(),r.x1());
                levelWall(part,level,r,false,r.x0(),r.z0(),r.z1());
                levelWall(part,level,r,false,r.x1(),r.z0(),r.z1());
            }
            own(out,part,r.id());
        }
        for(var p:level.props()){
            List<Face> part=new ArrayList<>();imported(part,p.mesh(),p.x(),p.y(),p.z(),p.scale(),p.yaw());own(out,part,p.room());
        }
        for(var s:level.stairs()){
            List<Face> part=new ArrayList<>();double dx=(s.x1()-s.x0())/s.steps(),dz=(s.z1()-s.z0())/s.steps(),rise=(s.y1()-s.y0())/s.steps();
            for(int i=0;i<s.steps();i++){
                double xx=s.x0()+dx*i,zz=s.z0()+dz*i,yy=s.y0()+rise*(i+1);
                double x0=Math.min(xx,xx+dx)-(Math.abs(dz)>.001?s.width()/2:0),z0=Math.min(zz,zz+dz)-(Math.abs(dx)>.001?s.width()/2:0);
                double x1=x0+(Math.abs(dx)>.001?Math.abs(dx):s.width()),z1=z0+(Math.abs(dz)>.001?Math.abs(dz):s.width());
                if(i==s.steps()-1)for(var hole:level.voids())if(Math.abs(hole.y()-s.y1())<.02&&hole.contains((x0+x1)/2,(z0+z1)/2)){
                    x0=Math.max(x0,hole.x0());x1=Math.min(x1,hole.x1());z0=Math.max(z0,hole.z0());z1=Math.min(z1,hole.z1());
                }
                if(x1>x0&&z1>z0)texturedBox(part,x0,yy-rise,z0,x1-x0,rise,z1-z0,LevelMaterials.WOOD);
            }
            double length=Math.hypot(s.x1()-s.x0(),s.z1()-s.z0()),ox=-(s.z1()-s.z0())/length*s.width()/2,oz=(s.x1()-s.x0())/length*s.width()/2;
            levelRail(part,s.x0()+ox,s.y0(),s.z0()+oz,s.x1()+ox,s.y1(),s.z1()+oz);
            levelRail(part,s.x0()-ox,s.y0(),s.z0()-oz,s.x1()-ox,s.y1(),s.z1()-oz);
            own(out,part,s.a());
        }
        for(var guard:level.guards()){
            List<Face> part=new ArrayList<>();
            levelRail(part,guard.x0(),guard.y(),guard.z0(),guard.x1(),guard.y(),guard.z1());
            int owner=map.roomAt((guard.x0()+guard.x1())/2,guard.y(),(guard.z0()+guard.z1())/2);
            own(out,part,owner<0?4:owner);
        }
        if(map.site()==HouseMap.Site.HOUSE)houseExterior(out,level);
        else {
        // Roofs follow the actual upper footprint; pitched planes meet at a ridge.
        for(var r:level.rooms())if(!r.outside()&&r.y()>=0&&level.rooms().stream().noneMatch(up->!up.outside()&&up.y()>r.y()
                &&up.y()+up.height()>r.y()+r.height()+.05&&up.x0()<r.x1()&&up.x1()>r.x0()&&up.z0()<r.z1()&&up.z1()>r.z0())
                &&level.rooms().stream().noneMatch(parent->!parent.outside()&&parent.id()!=r.id()&&parent.y()<r.y()
                    &&parent.y()+parent.height()>=r.y()+r.height()-.05&&parent.x0()<=r.x0()&&parent.x1()>=r.x1()&&parent.z0()<=r.z0()&&parent.z1()>=r.z1())){
            double yy=r.y()+r.height(),mid=(r.x0()+r.x1())/2,peak=yy+Math.min(2,(r.x1()-r.x0())*.30);
            // Eaves end at a taller adjoining volume, never through its interior wall.
            double x0=r.x0()-(roofNeighbour(level,r,false,r.x0(),yy)?0:.28),x1=r.x1()+(roofNeighbour(level,r,false,r.x1(),yy)?0:.28);
            double z0=r.z0()-(roofNeighbour(level,r,true,r.z0(),yy)?0:.3),z1=r.z1()+(roofNeighbour(level,r,true,r.z1(),yy)?0:.3);
            List<Face> roof=new ArrayList<>();
            texturedQuad(roof,new Point(x0,yy,z0),new Point(mid,peak,z0),new Point(mid,peak,z1),new Point(x0,yy,z1),LevelMaterials.WOOD,0,0,1,0,1,3,0,3,0x9b9990);
            texturedQuad(roof,new Point(mid,peak,z0),new Point(x1,yy,z0),new Point(x1,yy,z1),new Point(mid,peak,z1),LevelMaterials.WOOD,0,0,1,0,1,3,0,3,0x797e86);
            quad(roof,new Point(r.x0(),yy,r.z0()),new Point(mid,peak,r.z0()),new Point(r.x1(),yy,r.z0()),new Point(r.x1(),yy,r.z0()),0x67645c);
            quad(roof,new Point(r.x1(),yy,r.z1()),new Point(mid,peak,r.z1()),new Point(r.x0(),yy,r.z1()),new Point(r.x0(),yy,r.z1()),0x67645c);
            own(out,roof,r.id());
        }
        }
        return List.copyOf(out);
    }
    private static boolean roofNeighbour(LevelDefinition level,LevelDefinition.Room r,boolean alongX,double plane,double y){
        return level.rooms().stream().anyMatch(n->!n.outside()&&n.id()!=r.id()&&n.y()<y+.01&&n.y()+n.height()>y+.05
            &&(alongX?((nearPlane(n.z0(),plane)||nearPlane(n.z1(),plane))&&n.x0()<r.x1()&&n.x1()>r.x0()):
                ((nearPlane(n.x0(),plane)||nearPlane(n.x1(),plane))&&n.z0()<r.z1()&&n.z1()>r.z0())));
    }
    private void levelArchitecture(List<Face> out,HouseMap map){
        for(Face f:levelShells.computeIfAbsent(map.site(),s->buildLevelShell(map))){
            double cx=(f.a.x+f.b.x+f.c.x)/3,cz=(f.a.z+f.b.z+f.c.z)/3;
            out.add(f); // Opaque distant architecture must still occlude the night sky.
        }
        for(var s:map.level().sockets())if(s.type().equals("hide")&&LevelClosets.available(map.level(),s.room(),map.hidingDensity())){
            List<Face> closet=new ArrayList<>();imported(closet,"level_hiding_cupboard_worn",s.x(),s.y(),s.z(),1,s.yaw());own(out,closet,s.room());
        }
        for(var p:map.level().portals()){
            if(!exportFullLevel&&Math.hypot(p.x()-x,p.z()-z)>24)continue;
            List<Face> part=new ArrayList<>();
            if(p.door()){
                double angle=p.alongX()?0:Math.PI/2;
                double hx=p.x()+(p.alongX()?p.width()/2:0),hz=p.z()+(p.alongX()?0:p.width()/2);
                double leaf=p.width()>1.5?p.width()/2:p.width();
                imported(part,"door_1_loose",hx,p.y(),hz,leaf,2.28/2.1,1,angle+(map.doorOpen(p.id())?Math.PI/2:0));
                if(p.width()>1.5)imported(part,"door_1_loose",p.x()-(p.alongX()?p.width()/2:0),p.y(),p.z()-(p.alongX()?0:p.width()/2),leaf,2.28/2.1,1,angle+Math.PI-(map.doorOpen(p.id())?Math.PI/2:0));
                if(p.kind().equals("gate"))for(double t=-p.width()/2;t<=p.width()/2;t+=.15)
                    box(part,p.x()+(p.alongX()?t:0)-.015,p.y(),p.z()+(p.alongX()?0:t)-.015,.03,2.3,.03,0x77797a);
            }else if(p.kind().equals("window")){
                double a=p.width()/2,dx=p.alongX()?a:0,dz=p.alongX()?0:a;
                // Hinged sash opens into the room; clear aperture exposes the actual night exterior.
                double angle=map.windowOpen(p.id())?.95:0,c=Math.cos(angle),sn=Math.sin(angle);
                double x0=p.x()-dx,z0=p.z()-dz,x1=x0+(2*dx*c-2*dz*sn),z1=z0+(2*dx*sn+2*dz*c);
                levelRailWindow(part,x0,z0,x1,z1,p.y()+1.02,p.y()+2.33);
            }
            own(out,part,p.a());
        }
        for(var s:map.level().sockets()){
            if(!exportFullLevel&&Math.hypot(s.x()-x,s.z()-z)>20)continue;
            List<Face> part=new ArrayList<>();
            if(s.type().equals("switch"))imported(part,"light_switch_1",s.x(),s.y(),s.z(),1,-s.yaw());
            if(s.type().equals("light")){
                String mesh=s.style().contains("utility")||s.style().contains("industrial")?"level_utility_light":s.style().contains("sconce")||s.style().contains("porch")?"level_wall_sconce":"level_domestic_light";
                imported(part,mesh,s.x(),s.y(),s.z(),1,-s.yaw());
            }
            if(s.type().equals("breaker")){
                List<Face> local=new ArrayList<>();
                box(local,-.24,-.38,0,.48,.76,.12,0x63676a);
                box(local,-.19,-.32,.121,.38,.63,.025,0x353b40);
                for(int i=0;i<6;i++)box(local,-.12+(i%2)*.15,-.22+(i/2)*.16,.15,.075,.065,.04,environmentPowerOn?0x9fba9b:0xa87369);
                for(Face f:local)part.add(new Face(mountPoint(f.a,s),mountPoint(f.b,s),mountPoint(f.c,s),f.color,f.material,f.au,f.av,f.bu,f.bv,f.cu,f.cv));
            }
            own(out,part,s.room());
        }
    }
    private static Point mountPoint(Point p,LevelDefinition.Socket s){
        double c=Math.cos(-s.yaw()),sn=Math.sin(-s.yaw());
        return new Point(s.x()+p.x*c-p.z*sn,s.y()+p.y,s.z()+p.x*sn+p.z*c);
    }
    private static void houseExterior(List<Face> out,LevelDefinition level){
        List<Face> skin=new ArrayList<>();
        // Individual overlapping weatherboards on the outer wall, with holes
        // cut from the same doors/windows used by collision and interaction.
        for(boolean alongX:new boolean[]{true,false})for(double plane:alongX?new double[]{10,24}:new double[]{12,24}){
            double from=alongX?12:10,to=24,offset=(plane==(alongX?10:12)?-.045:.045);
            for(double y=0;y<6-.01;y+=.18){
                double bottom=y,top=Math.min(6,y+.18),at=from;
                var cuts=level.portals().stream().filter(p->!p.kind().equals("stair")&&p.alongX()==alongX
                    &&nearPlane(alongX?p.z():p.x(),plane)&&p.y()<top&&p.y()+2.35>bottom
                    &&(!p.kind().equals("window")||p.y()+1<top)).sorted(java.util.Comparator.comparingDouble(p->alongX?p.x():p.z())).toList();
                for(var p:cuts){double mid=alongX?p.x():p.z(),lo=mid-p.width()/2,hi=mid+p.width()/2;
                    levelWallPatchPlain(skin,alongX,plane+offset,at,lo,y,top,LevelMaterials.CLADDING);at=Math.max(at,hi);}
                levelWallPatchPlain(skin,alongX,plane+offset,at,to,y,top,LevelMaterials.CLADDING);
                // Thin lap edge is visible geometry, avoiding painted fake board joints.
                double length=to-from;
                // Edges respect the aperture spans as well.
                at=from;
                for(var p:cuts){double mid=alongX?p.x():p.z();clapEdge(skin,alongX,plane+offset,at,mid-p.width()/2,y);at=mid+p.width()/2;}
                clapEdge(skin,alongX,plane+offset,at,to,y);
            }
        }
        for(double xx:new double[]{11.96,23.96})for(double zz:new double[]{9.96,23.96})
            texturedBox(skin,xx,0,zz,.09,6,.09,LevelMaterials.CLADDING);
        for(double zz:new double[]{9.92,23.99})texturedBox(skin,11.92,-.18,zz,12.16,.30,.09,LevelMaterials.STONE);
        for(double xx:new double[]{11.92,24.00})texturedBox(skin,xx,-.18,9.92,.08,.30,14.16,LevelMaterials.STONE);
        // One roof with a continuous ridge rather than one gable per room.
        double eave=6.05,peak=8.25,mid=18;
        texturedQuad(skin,new Point(11.65,eave,9.65),new Point(mid,peak,9.65),new Point(mid,peak,24.4),new Point(11.65,eave,24.4),LevelMaterials.STONE,0,0,2,0,2,5,0,5,0x555b65);
        texturedQuad(skin,new Point(mid,peak,9.65),new Point(24.35,eave,9.65),new Point(24.35,eave,24.4),new Point(mid,peak,24.4),LevelMaterials.STONE,0,0,2,0,2,5,0,5,0x6b6b6b);
        for(double zz:new double[]{9.98,24.02}){
            texturedQuad(skin,new Point(12,6,zz),new Point(18,peak,zz),new Point(24,6,zz),new Point(24,6,zz),LevelMaterials.CLADDING,0,0,1,1,2,0,2,0,0xffffff);
            texturedBox(skin,11.7,5.9,zz-.08,12.6,.15,.16,LevelMaterials.WOOD);
        }
        texturedBox(skin,13.4,6.5,13.7,.72,2.05,.72,LevelMaterials.STONE);
        texturedBox(skin,13.32,8.5,13.62,.88,.13,.88,LevelMaterials.STONE);
        // Covered porch: deck, real corner posts, beam and shallow roof.
        texturedBox(skin,18.0,-.10,24.03,6,.12,2.8,LevelMaterials.FLOOR);
        for(double xx:new double[]{18.25,23.75}){
            texturedBox(skin,xx-.08,0,26.55,.16,2.60,.16,LevelMaterials.WOOD);
            texturedBox(skin,xx-.13,0,26.50,.26,.16,.26,LevelMaterials.CLADDING);
            texturedBox(skin,xx-.13,2.44,26.50,.26,.16,.26,LevelMaterials.CLADDING);
        }
        texturedBox(skin,18.1,2.55,26.48,5.8,.18,.27,LevelMaterials.WOOD);
        texturedQuad(skin,new Point(17.9,2.70,26.95),new Point(24.1,2.70,26.95),new Point(24.1,3.15,23.98),new Point(17.9,3.15,23.98),LevelMaterials.STONE,0,0,2,0,2,1,0,1,0x7c7770);
        // Rear patio, walk, low boundary fencing, and gate opening align with navigation.
        texturedBox(skin,13.4,-.04,6.6,3.2,.06,3.3,LevelMaterials.STONE);
        texturedBox(skin,20.35,-.015,26.8,1.3,.035,3.2,LevelMaterials.STONE);
        for(double xx=7;xx<=29;xx+=.40)if(xx<19.8||xx>22.2){
            texturedBox(skin,xx-.035,0,29.5,.07,.85,.055,LevelMaterials.CLADDING);
        }
        for(double zz:new double[]{29.48})for(double yy:new double[]{.22,.62}){
            texturedBox(skin,7,yy,zz,12.8,.06,.055,LevelMaterials.WOOD);
            texturedBox(skin,22.2,yy,zz,6.8,.06,.055,LevelMaterials.WOOD);
        }
        own(out,skin,13);
    }
    private static void clapEdge(List<Face> out,boolean ax,double plane,double from,double to,double y){
        if(to<=from)return;
        texturedBox(out,ax?from:plane-.008,y,ax?plane-.008:from,ax?to-from:.016,.009,ax?.016:to-from,LevelMaterials.WOOD);
    }
    private static void levelRailWindow(List<Face> out,double x0,double z0,double x1,double z1,double y0,double y1){
        for(double t:new double[]{0,.5,1}){double xx=x0+(x1-x0)*t,zz=z0+(z1-z0)*t;box(out,xx-.018,y0,zz-.018,.036,y1-y0,.036,0x8b806a);}
        for(double y:new double[]{y0,(y0+y1)/2,y1})quad(out,new Point(x0,y-.018,z0),new Point(x1,y-.018,z1),new Point(x1,y+.018,z1),new Point(x0,y+.018,z0),0x8b806a);
    }

    private double cachedViewYaw=Double.NaN,cachedViewPitch=Double.NaN,viewCosYaw,viewSinYaw,viewCosPitch,viewSinPitch;
    private Point camera(Point p){
        if(cachedViewYaw!=yaw||cachedViewPitch!=pitch){
            cachedViewYaw=yaw;cachedViewPitch=pitch;viewCosYaw=Math.cos(yaw);viewSinYaw=Math.sin(yaw);
            viewCosPitch=Math.cos(pitch);viewSinPitch=Math.sin(pitch);
        }
        double dx=p.x-x,dy=p.y-eyeHeight,dz=p.z-z;
        double cy=viewCosYaw,sy=viewSinYaw,xc=-dx*cy+dz*sy,zc=dx*sy+dz*cy;
        double cp=viewCosPitch,sp=viewSinPitch;
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
    public record RemoteBody(double x,double y,double z,int slot,int heading) {
        public RemoteBody(double x,double z,int slot,int heading){this(x,0,z,slot,heading);}
        public RemoteBody(double x,double z,int slot){this(x,z,slot,0);}
        public RemoteBody {
            if(!Double.isFinite(x)||!Double.isFinite(y)||!Double.isFinite(z)||slot<0||slot>=6||heading<0||heading>=360)
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
        if(!map.clearLineOfSight(x,eyeHeight,z,teammate.x(),teammate.y()+1.35,teammate.z()))return null;
        Point torso=camera(new Point(teammate.x(),teammate.y()+1.35,teammate.z()));
        Point head=camera(new Point(teammate.x(),teammate.y()+1.95,teammate.z()));
        if(torso.z<NEAR||torso.z>14.0||head.z<NEAR)return null;
        double cx=renderWidth*.5+torso.x/torso.z*focal;
        double cy=renderHeight*.5-torso.y/torso.z*focal;
        double labelX=renderWidth*.5+head.x/head.z*focal;
        double labelY=renderHeight*.5-head.y/head.z*focal-5;
        if(!Double.isFinite(cx)||!Double.isFinite(cy)||
            !Double.isFinite(labelX)||!Double.isFinite(labelY))return null;
        int px=(int)Math.round(cx),py=(int)Math.round(cy);
        if(px<3||px>=renderWidth-3||py<3||py>=renderHeight-3||
            labelX<8||labelX>=renderWidth-8||labelY<4||labelY>=renderHeight-5)return null;
        // The teammate must occupy at least one nearby torso Z pixel. Nearby
        // foreground geometry or another sprite covering them hides the label.
        boolean depthVisible=false;
        for(int dy=-2;dy<=2&&!depthVisible;dy++)
            for(int dx=-2;dx<=2&&!depthVisible;dx++){
                double d=depths[(py+dy)*renderWidth+px+dx];
                if(d>=torso.z-.45&&d<=torso.z+.55)depthVisible=true;
            }
        return depthVisible?new Nameplate((int)Math.round(labelX),(int)Math.round(labelY)):null;
    }
    public record Apparition(double x,double y,double z,LanGhostAnimation.Phase phase,int heading,int progress,boolean orb,boolean greenTint,String appearance) {
        public Apparition(double x,double z,LanGhostAnimation.Phase phase,int heading,int progress,boolean orb,boolean greenTint,String appearance){this(x,0,z,phase,heading,progress,orb,greenTint,appearance);}
        public Apparition(double x,double z,LanGhostAnimation.Phase phase,int heading,int progress,boolean orb,boolean greenTint){
            this(x,z,phase,heading,progress,orb,greenTint,"banshee");
        }
        public Apparition(double x,double z){this(x,z,LanGhostAnimation.Phase.LURK,0,0,false,false,"banshee");}
        public Apparition(double x,double z,LanGhostAnimation.Phase phase,int heading,int progress){
            this(x,z,phase,heading,progress,false,false);
        }
        public Apparition(double x,double z,LanGhostAnimation.Phase phase,int heading,int progress,boolean orb){
            this(x,z,phase,heading,progress,orb,false);
        }
        public Apparition {
            if(!Double.isFinite(x)||!Double.isFinite(y)||!Double.isFinite(z)||phase==null||heading<0||heading>=360
                    ||progress<0||progress>100||appearance==null
                    ||!appearance.matches("[a-z_]{3,32}"))
                throw new IllegalArgumentException("invalid apparition");
        }
    }
    private static void architecturalWall(List<Face> out,CastleHubArchitecturalPlan.Wall wall){
        if(wall.hasDoor())return; // opening is intentional absence of geometry
        double x0=wall.x0(),x1=wall.x1(),z0=wall.z0(),z1=wall.z1();
        double y0=wall.bottom(),y1=wall.top();
        double length=wall.length(),height=y1-y0;
        texturedQuad(out,new Point(x0,y0,z0),new Point(x1,y0,z1),
            new Point(x1,y1,z1),new Point(x0,y1,z0),wall.material(),
            0,y0,length,y0,length,y1,0,y1,0xffffff);
        // Reverse surface prevents invisible reverse sides when renderer
        // evolves toward one-sided rasterization.
        texturedQuad(out,new Point(x1,y0,z1),new Point(x0,y0,z0),
            new Point(x0,y1,z0),new Point(x1,y1,z1),wall.material(),
            0,y0,length,y0,length,y1,0,y1,0xc8c2ba);
    }
    private void castleShell(List<Face> out){
        for(CastleHubArchitecturalPlan.Wall wall:CastleHubArchitecturalPlan.walls()){
            if(wall.hasDoor()){
                // Full-height 2.7m portals, 2.5m clear spans, real jambs and
                // stone lintels at the architecturally authored wall plane.
                double left=wall.horizontal()?wall.x0():wall.z0();
                double right=wall.horizontal()?wall.x1():wall.z1();
                double y0=wall.bottom(),y1=y0+CastleHubArchitecturalPlan.DOOR_HEIGHT;
                if(wall.horizontal()){
                    box(out,left-.085,y0,wall.z0()-.16,.17,y1-y0,.32,0x786c5b);
                    box(out,right-.085,y0,wall.z0()-.16,.17,y1-y0,.32,0x786c5b);
                    box(out,left-.12,y1-.13,wall.z0()-.18,right-left+.24,.19,.36,0x9b8970);
                }else{
                    box(out,wall.x0()-.16,y0,left-.085,.32,y1-y0,.17,0x786c5b);
                    box(out,wall.x0()-.16,y0,right-.085,.32,y1-y0,.17,0x786c5b);
                    box(out,wall.x0()-.18,y1-.13,left-.12,.36,.19,right-left+.24,0x9b8970);
                }
            }else architecturalWall(out,wall);
        }
        for(var deck:CastleHubArchitecturalPlan.decks()){
            texturedQuad(out,
                new Point(deck.x0(),deck.height(),deck.z0()),
                new Point(deck.x1(),deck.height(),deck.z0()),
                new Point(deck.x1(),deck.height(),deck.z1()),
                new Point(deck.x0(),deck.height(),deck.z1()),
                deck.material(),deck.x0(),deck.z0(),deck.x1(),deck.z0(),
                deck.x1(),deck.z1(),deck.x0(),deck.z1(),0xffffff);
        }
        // Real 10m stair ascent to a 3.4m upper landing; never an
        // interaction-only teleport or a staircase prop with no floor.
        for(int step=0;step<20;step++){
            double south=32-step*.5,north=south-.5;
            double top=(step+1)*CastleHubArchitecturalPlan.GROUND_CEILING/20.0;
            texturedQuad(out,new Point(16.0,top,north),
                new Point(19.0,top,north),new Point(19.0,top,south),
                new Point(16.0,top,south),MaterialAtlas.STONE,
                16,north,19,north,19,south,16,south,0xffffff);
            texturedQuad(out,new Point(16.0,0,north),
                new Point(19.0,0,north),new Point(19.0,top,north),
                new Point(16.0,top,north),MaterialAtlas.STONE,
                16,0,19,0,19,top,16,top,0xddd4cb);
        }
        // Railings follow both stair and balcony edges, with a real
        // continuous parapet over the courtyard underpass.
        for(int side=0;side<2;side++){
            double edge=side==0?16.0:19.0;
            for(int step=0;step<10;step++){
                double za=32-step,zb=za-1;
                double ha=step*.34+.14,hb=(step+1)*.34+.14;
                texturedQuad(out,new Point(edge,ha,za),
                    new Point(edge,hb,zb),new Point(edge,hb+.83,zb),
                    new Point(edge,ha+.83,za),MaterialAtlas.AGED_WOOD,
                    0,0,1,0,1,1,0,1,0xffffff);
            }
            texturedQuad(out,new Point(edge,3.42,10.8),
                new Point(edge,3.42,22.0),new Point(edge,4.39,22.0),
                new Point(edge,4.39,10.8),MaterialAtlas.AGED_WOOD,
                0,0,11.2,0,11.2,.97,0,.97,0xffffff);
        }
        for(var trim:CastleHubArchitecturalPlan.trims()){
            if(Math.hypot(trim.x()-x,trim.z()-z)>18.0)continue;
            imported(out,trim.mesh(),trim.x(),trim.y(),trim.z(),
                trim.sx(),trim.sy(),trim.sz(),trim.yaw());
        }
    }
    /** Castle hub renders with the same perspective, clipping and textured depth buffer as missions. */
    public void drawCastle(CastleHubMap map,double clock){drawCastle(map,clock,true);}
    public void drawCastle(CastleHubMap map,double clock,boolean lightsOn){
        environmentLight=lightsOn?1.0:.40;
        paintSky(clock);
        Arrays.fill(depths,Double.POSITIVE_INFINITY);
        List<Face> castle=new ArrayList<>();
        for(int zz=1;zz<CastleHubMap.HEIGHT-1;zz++)for(int xx=1;xx<CastleHubMap.WIDTH-1;xx++){
            if(map.solid(xx,zz)||Math.hypot(xx+.5-x,zz+.5-z)>16)continue;
            int stone=map.floorMaterial(xx+.5,zz+.5);
            texturedQuad(castle,new Point(xx,0,zz),new Point(xx+1,0,zz),
                new Point(xx+1,0,zz+1),new Point(xx,0,zz+1),stone,
                xx,zz,xx+1,zz,xx+1,zz+1,xx,zz+1,0xffffff);
            if(!map.outside(xx+.5,zz+.5))texturedQuad(castle,
                new Point(xx,3.4,zz+1),new Point(xx+1,3.4,zz+1),
                new Point(xx+1,3.4,zz),new Point(xx,3.4,zz),
                MaterialAtlas.CEILING,xx,zz+1,xx+1,zz+1,xx+1,zz,xx,zz,0xe0d8c8);
            // The solid tile modules now supply textured wall and window geometry.
            // Primitive quads would falsely close the real windows and gate openings.
        }
        // The real continuous, authored stonework and second floor replace
        // per-cell fortress blocks. Doors have full-width jambs and lintels.
        castleShell(castle);
        for(CastleHubDecor.Light fixture:CastleHubDecor.LIGHTS)
            if(Math.hypot(fixture.x()-x,fixture.z()-z)<14)
                mountedLamp(castle,fixture,lightsOn);
        for(CastleHubDecor.Switch sw:CastleHubDecor.SWITCHES)
            if(Math.hypot(sw.x()-x,sw.z()-z)<14)
                mountedLamp(castle,new CastleHubDecor.Light("light_switch_1",
                    "light_switch_1",sw.x(),sw.y(),sw.z(),.85,sw.yaw(),
                    CastleHubDecor.Mount.WALL),true);
        // Each station is a distinct source-backed room fixture, NOT a
        // uniformly duplicated, untextured beige box. Their source mesh sizes
        // and height offsets match the authored physical interaction sockets.
        for(CastleHubMap.Station station:CastleHubMap.Station.values()){
            if(Math.hypot(station.x-x,station.z-z)>16)continue;
            double px=station.x,pz=station.z;
            switch(station){
                case ARMORY_UV -> {
                    imported(castle,"display_cabinet_mp_2",px,0,pz,.72,0);
                    imported(castle,"blender_uv_light_1",px,1.03,pz,.53,0);
                }
                case ARMORY_SALT -> {
                    imported(castle,"display_cabinet_mp_2",px,0,pz,.72,0);
                    imported(castle,"blender_salt_1",px,1.03,pz,.53,0);
                }
                case ROLE -> imported(castle,"wardrobe_mp_1",px,0,pz,.9,Math.PI);
                case CONTRACT -> {
                    imported(castle,"dinner_table_1",px,0,pz,.74,0);
                    imported(castle,"open_book_mp_1",px,.67,pz,.48,0);
                }
                case EXPEDITION -> {
                    imported(castle,"tv_table_1_4",px,0,pz,.82,0);
                    imported(castle,"handheld_tablet_1",px,.62,pz,.60,0);
                }
                case MULTIPLAYER -> {
                    // A properly dimensioned desk supports all visible
                    // peripherals; the computer tower rests on the floor.
                    imported(castle,"tv_table_1_4",px,0,pz,.83,0);
                    imported(castle,"pc_mp_1",px-.55,.02,pz-.16,.80,0);
                    imported(castle,"monitoring_screen_mp_1",px+.14,.82,pz-.10,.70,0);
                    imported(castle,"pc_keyboard_mp_1",px-.06,.615,pz+.18,.58,0);
                    box(castle,px+.42,.62,pz+.23,.10,.052,.16,0x373942);
                }
                case SPECTRAL -> {
                    imported(castle,"display_cabinet_mp_2",px,0,pz,.78,0);
                    imported(castle,"cross_mp_2",px,1.06,pz,.65,0);
                }
            }
        }
        // Purchased source-backed fixtures occupy authored locations and match hub collision.
        for(CastleHubMap.Furnishing item:CastleHubMap.furnishings())
            if(Math.hypot(item.x()-x,item.z()-z)<16)
                imported(castle,item.mesh(),item.x(),0,item.z(),item.scale(),item.yaw());
        for(CastleHubMap.Furnishing item:CastleHubDecor.UPPER_FURNISHINGS)
            if(Math.hypot(item.x()-x,item.z()-z)<16)
                imported(castle,item.mesh(),item.x(),
                    CastleHubArchitecturalPlan.GROUND_CEILING,item.z(),
                    item.scale(),item.yaw());
        for(CastleHubDecor.Accent a:CastleHubDecor.ACCENTS)
            if(Math.hypot(a.x()-x,a.z()-z)<12)
                imported(castle,a.mesh(),a.x(),a.y(),a.z(),a.scale(),a.yaw());
        // Castle entrance arch; courtyard remains open to the procedural sky.
        box(castle,12.75,0,11.20,.40,3.0,.38,0x625c60);
        box(castle,14.10,0,11.20,.40,3.0,.38,0x625c60);
        box(castle,12.75,2.9,11.20,1.75,.36,.38,0xa69178);
        for(Face face:castle){
            List<Vertex> points=clip(new Vertex(camera(face.a),face.au,face.av),
                new Vertex(camera(face.b),face.bu,face.bv),new Vertex(camera(face.c),face.cu,face.cv));
            for(int i=1;i<points.size()-1;i++)triangle(points.get(0),points.get(i),points.get(i+1),face.color,face.material);
        }
        PsxPipeline.finishFrame(pixels,renderWidth,renderHeight,psxPreset);
        GraphicsEffects.apply(pixels,renderWidth,renderHeight,GraphicsOptions.current(),clock);
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
        paintSky(clock);
        Arrays.fill(depths,Double.POSITIVE_INFINITY);
        for(Face face:scene(map,ghostRoom,visibleGhost,wardRoom,hunterRoom,clock,others,apparition,markers)){
            List<Vertex> pts=clip(new Vertex(camera(face.a),face.au,face.av),
                new Vertex(camera(face.b),face.bu,face.bv),new Vertex(camera(face.c),face.cu,face.cv));
            int room=face.room>=0?face.room:map.roomAt((face.a.x+face.b.x+face.c.x)/3,
                (face.a.y+face.b.y+face.c.y)/3,(face.a.z+face.b.z+face.c.z)/3);
            double lighting=roomLights==null?1:roomLights.brightness(room,roomLightTick);
            for(int i=1;i<pts.size()-1;i++)triangle(pts.get(0),pts.get(i),pts.get(i+1),
                face.color,face.material,lighting);
        }
        renderCharacterSprites(map,ghostRoom,visibleGhost,hunterRoom,clock,others,apparition);
        PsxPipeline.finishFrame(pixels,renderWidth,renderHeight,psxPreset);
        GraphicsEffects.apply(pixels,renderWidth,renderHeight,GraphicsOptions.current(),clock);
    }
    /** Paint the world-fixed night panorama behind all world geometry, even indoors.
     * Real window apertures and depth-tested castle stonework occlude the background.
     * The sky never writes depth, and has no copyright-dependent source images.
     */
    void paintSky(double clock){
        final int horizon=(int)Math.round(renderHeight*.51+Math.tan(pitch)*focal);
        for(int sy=0;sy<renderHeight;sy++){
            double t=sy/(double)renderHeight;
            boolean upper=sy<horizon;
            int red=upper?(int)(13+18*t):(int)(18+18*t);
            int green=upper?(int)(23+18*t):(int)(27+19*t);
            int blue=upper?(int)(41+31*t):(int)(32+16*t);
            int cloud=weatherKind==EvidenceSignals.Weather.THUNDERSTORM?weatherIntensity*5:
                      weatherKind==EvidenceSignals.Weather.FOG?weatherIntensity*3:
                      weatherKind==EvidenceSignals.Weather.RAIN
                          ||weatherKind==EvidenceSignals.Weather.SNOW?weatherIntensity*2:0;
            red=Math.max(4,red-cloud);
            green=Math.max(9,green-cloud/2);
            blue=Math.max(16,blue-cloud/2);
            Arrays.fill(pixels,sy*renderWidth,(sy+1)*renderWidth,(red<<16)|(green<<8)|blue);
        }
        // Dim cloud bands drift across world bearings, visible through castle windows.
        for(int sx=0;sx<renderWidth;sx++){
            double bearing=yaw-Math.atan2(sx-renderWidth*.5,focal);
            int top=horizon-38+(int)(7*Math.sin(bearing*2.7+clock*.012)
                +3*Math.sin(bearing*7.4-clock*.008));
            for(int j=0;j<5;j++){
                int sy=top+j;
                if(sy<0||sy>=renderHeight)continue;
                int k=sy*renderWidth+sx,c=pixels[k];
                int r=Math.min(255,((c>>16)&255)+3),g=Math.min(255,((c>>8)&255)+4),
                    bl=Math.min(255,(c&255)+7);
                pixels[k]=(r<<16)|(g<<8)|bl;
            }
        }
        boolean overcast=weatherKind==EvidenceSignals.Weather.THUNDERSTORM
            ||weatherKind==EvidenceSignals.Weather.RAIN
            ||weatherKind==EvidenceSignals.Weather.SNOW
            ||weatherKind==EvidenceSignals.Weather.FOG;
        for(int star=0;star<(overcast?0:110);star++){
            double bearing=-Math.PI+(star*2.399963229728653)%(2*Math.PI);
            double diff=Math.atan2(Math.sin(bearing-yaw),Math.cos(bearing-yaw));
            if(Math.abs(diff)>1.1)continue;
            int sx=(int)Math.round(renderWidth*.5-Math.tan(diff)*focal);
            int sy=horizon-19-(star*37%54);
            if(sx>=0&&sx<renderWidth&&sy>=0&&sy<renderHeight)pixels[sy*renderWidth+sx]=0x8096ac;
        }
        for(int sx=0;sx<renderWidth;sx++){
            double bearing=yaw-Math.atan2(sx-renderWidth*.5,focal);
            int hills=horizon+(int)(13*Math.sin(bearing*2.1)+8*Math.sin(bearing*5.7)
                    +5*Math.sin(bearing*13.2));
            for(int sy=Math.max(0,hills);sy<renderHeight;sy++)pixels[sy*renderWidth+sx]=0x18202a;
        }
        double diff=Math.atan2(Math.sin(-1.2-yaw),Math.cos(-1.2-yaw));
        int mx=(int)Math.round(renderWidth*.5-Math.tan(diff)*focal),my=horizon-43;
        if(!overcast&&Math.abs(diff)<1.1)for(int dy=-5;dy<=5;dy++)for(int dx=-5;dx<=5;dx++){
            int px=mx+dx,py=my+dy;
            if(px>=0&&px<renderWidth&&py>=0&&py<renderHeight&&dx*dx+dy*dy<25)pixels[py*renderWidth+px]=0xb8c8d5;
        }
        // Precipitation is a low-cost background layer; masonry/windows occlude it.
        if(weatherKind==EvidenceSignals.Weather.RAIN
                ||weatherKind==EvidenceSignals.Weather.THUNDERSTORM
                ||weatherKind==EvidenceSignals.Weather.SNOW){
            boolean snow=weatherKind==EvidenceSignals.Weather.SNOW;
            int drops=weatherIntensity*(snow?90:165);
            long phase=(long)(clock*(snow?8:25));
            for(int i=0;i<drops;i++){
                int sx=Math.floorMod(i*6173+(int)(phase*(snow?2:5)),renderWidth);
                int sy=Math.floorMod(i*3781+(int)(phase*(snow?2:8)),renderHeight);
                int count=snow?1:2+weatherIntensity;
                for(int j=0;j<count&&sy+j<renderHeight;j++){
                    int k=(sy+j)*renderWidth+sx;
                    pixels[k]=snow?0x8c99a8:0x56657b;
                }
            }
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
                renderSpiritOrb(gx,gz,(apparition==null?map.floorY(ghostRoom):apparition.y())+.98+.18*Math.sin(clock*4),clock,apparition.greenTint());
            }else{
                DirectionalSprites.draw(pixels,depths,x,z,yaw,pitch,gx,gz,
                    apparition==null?0:apparition.heading(),
                    apparition==null?"banshee":apparition.appearance(),1.95*stature,1.16,
                    (apparition==null?map.floorY(ghostRoom):apparition.y())-(eyeHeight-1.62)+.09*Math.sin(clock*3)+lift,alpha,lamp,renderWidth,renderHeight,focal,
                    apparition!=null&&apparition.greenTint(),phase,
                    Math.floorMod((int)Math.floor(clock*10),4));
            }
        }
        if(hunterRoom>=0){
            DirectionalSprites.draw(pixels,depths,x,z,yaw,pitch,
                map.centerX(hunterRoom)-1.25,map.centerZ(hunterRoom)+2.0,
                0,"observer",1.75,1.04,map.floorY(hunterRoom)-(eyeHeight-1.62),255,lamp,renderWidth,renderHeight,focal);
        }
        for(RemoteBody person:others){
            double distance=Math.hypot(person.x()-x,person.z()-z);
            if(distance>14||distance<1.35)continue;
            DirectionalSprites.draw(pixels,depths,x,z,yaw,pitch,person.x(),person.z(),
                person.heading(),"observer",1.75,1.04,person.y()-(eyeHeight-1.62),255,lamp,renderWidth,renderHeight,focal);
        }
    }
    /** A real luminous orb in perspective, occluded by walls and the existing Z-buffer. */
    private void renderSpiritOrb(double gx,double gz,double bob,double clock,boolean greenTint){
        Point p=camera(new Point(gx,bob,gz));
        if(p.z<NEAR||p.z>17)return;
        int cx=(int)Math.round(renderWidth*.5+p.x/p.z*focal),cy=(int)Math.round(renderHeight*.5-p.y/p.z*focal);
        int radius=Math.min(29,Math.max(2,(int)Math.round(focal*.19/p.z)));
        for(int sy=Math.max(0,cy-radius);sy<=Math.min(renderHeight-1,cy+radius);sy++)
            for(int sx=Math.max(0,cx-radius);sx<=Math.min(renderWidth-1,cx+radius);sx++){
                double distance=Math.hypot(sx-cx,sy-cy)/(double)radius;
                if(distance>1)continue;
                int at=sy*renderWidth+sx;
                if(p.z>=depths[at])continue;
                double glow=(1-distance*distance)*(.85+.15*Math.sin(clock*7));
                int red=(int)(greenTint?18+44*glow:65+90*glow),
                    green=(int)(greenTint?110+144*glow:85+160*glow),
                    blue=(int)(greenTint?24+44*glow:115+140*glow);
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
        double x0=PsxPipeline.snap(renderWidth*.5+a.x/a.z*focal,psxPreset),y0=PsxPipeline.snap(renderHeight*.5-a.y/a.z*focal,psxPreset);
        double x1=PsxPipeline.snap(renderWidth*.5+b.x/b.z*focal,psxPreset),y1=PsxPipeline.snap(renderHeight*.5-b.y/b.z*focal,psxPreset);
        double x2=PsxPipeline.snap(renderWidth*.5+c.x/c.z*focal,psxPreset),y2=PsxPipeline.snap(renderHeight*.5-c.y/c.z*focal,psxPreset);
        double denom=(y1-y2)*(x0-x2)+(x2-x1)*(y0-y2);
        if(Math.abs(denom)<1e-8)return;
        int lowX=Math.max(0,(int)Math.floor(Math.min(x0,Math.min(x1,x2))));
        int highX=Math.min(renderWidth-1,(int)Math.ceil(Math.max(x0,Math.max(x1,x2))));
        int lowY=Math.max(0,(int)Math.floor(Math.min(y0,Math.min(y1,y2))));
        int highY=Math.min(renderHeight-1,(int)Math.ceil(Math.max(y0,Math.max(y1,y2))));
        for(int py=lowY;py<=highY;py++)for(int px=lowX;px<=highX;px++){
            double xx=px+.5,yy=py+.5;
            double u=((y1-y2)*(xx-x2)+(x2-x1)*(yy-y2))/denom;
            double v=((y2-y0)*(xx-x2)+(x0-x2)*(yy-y2))/denom,w=1-u-v;
            if(u<0||v<0||w<0)continue;
            double inv=u/a.z+v/b.z+w/c.z,d=1/inv;int k=py*renderWidth+px;
            if(d>=depths[k])continue;
            depths[k]=d;
            if(material>=0) {
                // Perspective-correct material lookup. Screen-space UV interpolation
                // distorts strongly at PS-era FOV and is unsuitable for room walls.
                double uu=PsxPipeline.uv((u*va.u/a.z + v*vb.u/b.z + w*vc.u/c.z)/inv,
                    u*va.u+v*vb.u+w*vc.u,psxPreset);
                double vv=PsxPipeline.uv((u*va.v/a.z + v*vb.v/b.z + w*vc.v/c.z)/inv,
                    u*va.v+v*vb.v+w*vc.v,psxPreset);
                int texel=material>=GlbProps.TEXTURE_BASE
                    ?GlbProps.sample(material,uu,vv)
                    :material>=LevelMaterials.BASE?LevelMaterials.sample(material,uu,vv):MaterialAtlas.sample(material,uu,vv);
                int tr=(texel>>16)&255,tg=(texel>>8)&255,tb=texel&255;
                color=((tr*((tint>>16)&255)/255)<<16) |
                    ((tg*((tint>>8)&255)/255)<<8) |
                     (tb*(tint&255)/255);
            }
            // Flashlight is a bounded near-field additive beam; turning room lights off
            // genuinely darkens distant geometry instead of only tinting a HUD icon.
            // Flashlight illuminates a forward-facing cone; flames instead spill locally.
            double aim=Math.hypot((px+.5-renderWidth*.5)/focal,
                                  (py+.5-renderHeight*.5)/focal);
            double cone=flameLamp?1.0:Math.max(0,1-aim/.44);
            double beam=lamp?lampIntensity*Math.max(0,1-d/lampReach)*cone:0;
            double light=(.075+.98*roomLevel+beam)*environmentLight*Math.max(.22,1-d/26.0);
            double lightingDither=psxPreset==PsxPipeline.Preset.OFF?0:
                (BAYER[(px&3)+((py&3)<<2)]-7.5)/140.0;
            light=Math.max(.1,Math.min(1.45,light+lightingDither));
            int red=(int)(((color>>16)&255)*light),green=(int)(((color>>8)&255)*light),blue=(int)((color&255)*light);
            double fog=Math.min(.92,Math.max(0,(d-5)/15)*fogDensity);
            red=(int)(red*(1-fog)+18*fog);green=(int)(green*(1-fog)+21*fog);blue=(int)(blue*(1-fog)+30*fog);
            pixels[k]=(Math.min(255,red)<<16)|(Math.min(255,green)<<8)|Math.min(255,blue);
        }
    }
}
