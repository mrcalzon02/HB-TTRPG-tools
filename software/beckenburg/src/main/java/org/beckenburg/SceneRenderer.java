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
                        double au,double av,double bu,double bv,double cu,double cv) { }
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
    /** Empty until an authoritative loadout/profile explicitly supplies owned gear.
     * Never implicitly manufacture free tools as map scenery.
     */
    public java.util.Set<EquipmentLoadout.Item> rackStock=java.util.Set.of();
    /** Host-issued inventory only: do not spawn unpurchased instruments. */
    public java.util.Map<String,EquipmentTiers.Tier> rackToolTiers=java.util.Map.of();
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
    /** Fit an approved GLB into an actually mounted tool holder. Position is
     * the centre of the bracket, not the source GLB's inconsistent origin.
     * Uniform fitting preserves original shape and source material/UV data.
     */
    private static void vanMountedTool(List<Face> out,String mesh,VanStaging van,
                                       double localX,double y,double localZ,
                                       double maximumWidth,double maximumHeight,
                                       double maximumDepth){
        GlbProps.Model model=GlbProps.model(mesh);
        double minX=Double.POSITIVE_INFINITY,minY=minX,minZ=minX;
        double maxX=Double.NEGATIVE_INFINITY,maxY=maxX,maxZ=maxX;
        for(GlbProps.Triangle t:model.triangles())
            for(GlbProps.Vertex v:new GlbProps.Vertex[]{t.a(),t.b(),t.c()}){
                minX=Math.min(minX,v.x());maxX=Math.max(maxX,v.x());
                minY=Math.min(minY,v.y());maxY=Math.max(maxY,v.y());
                minZ=Math.min(minZ,v.z());maxZ=Math.max(maxZ,v.z());
            }
        double s=Math.min(1.8,Math.min(maximumWidth/Math.max(.001,maxX-minX),
            Math.min(maximumHeight/Math.max(.001,maxY-minY),
                maximumDepth/Math.max(.001,maxZ-minZ))));
        double ox=(minX+maxX)*.5,oy=(minY+maxY)*.5,oz=(minZ+maxZ)*.5;
        // Source X is horizontal along the shelving; source Z points outward.
        double angle=van.placement().yaw()+Math.PI/2;
        double ca=Math.cos(angle),sa=Math.sin(angle);
        VanStaging.Position base=van.world(localX,localZ);
        for(GlbProps.Triangle t:model.triangles()){
            GlbProps.Vertex[] vv={t.a(),t.b(),t.c()};
            Point[] p=new Point[3];
            for(int k=0;k<3;k++){
                GlbProps.Vertex v=vv[k];
                double xx=(v.x()-ox)*s,zz=(v.z()-oz)*s;
                p[k]=new Point(base.x()+xx*ca-zz*sa,
                    y+(v.y()-oy)*s,base.z()+xx*sa+zz*ca);
            }
            out.add(new Face(p[0],p[1],p[2],0xffffff,t.material(),
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
        Point a0=new Point(a.x(),.10,a.z()),a1=new Point(a.x(),2.91,a.z());
        Point b0=new Point(b.x(),.10,b.z()),b1=new Point(b.x(),2.91,b.z());
        Point c0=new Point(c.x(),.10,c.z()),c1=new Point(c.x(),2.91,c.z());
        Point d0=new Point(d.x(),.10,d.z()),d1=new Point(d.x(),2.91,d.z());
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
        quad(faces,new Point(p.x(),2.18,p.z()),new Point(q.x(),2.18,q.z()),
             new Point(q.x(),2.68,q.z()),new Point(p.x(),2.68,p.z()),0x344856);
        // Door handles remain readable when shut or fully open.
        VanStaging.Position handle=van.world(hingeX+(endX-hingeX)*.88,
                                             front+(endZ-front)*.88);
        box(faces,handle.x()-.045,.96,handle.z()-.04,.09,.13,.08,0xd8c9a1);
    }

    /** One complete reusable VAN, shared by solo and network world renderers.
     * Architectural shell, floor, supports and socket data are all local to
     * this module. No Car08 wheel/grille triangles remain inside the cargo.
     */
    private void vanModel(List<Face> faces,VanStaging van,
                          java.util.Set<EquipmentLoadout.Item> stock){
        double w=VanStaging.HALF_WIDTH,f=VanStaging.FRONT,r=VanStaging.REAR;
        double h=VanStaging.INTERIOR_HEIGHT;

        // True cargo floor plus an anti-slip centre aisle and an exterior sill.
        vanBox(faces,van,-w,.00,f,w*2,.12,r-f,MaterialAtlas.CONCRETE);
        vanBox(faces,van,-.85,.125,f+.18,1.70,.018,r-f-.45,MaterialAtlas.IRON);
        for(double tz=f+.46;tz<r-.50;tz+=.90)
            vanBox(faces,van,-.86,.144,tz,1.72,.018,.055,MaterialAtlas.IRON);
        vanBox(faces,van,-w,.04,f-.18,w*2,.08,.19,MaterialAtlas.IRON);

        // Load-bearing van side panels and headliner have physical thickness.
        // Inner lining is offset from exterior skin, preventing see-through
        // wheels and exterior diffuse textures from leaking into cargo space.
        vanBox(faces,van,-w,.10,f,.15,h-.02,r-f,MaterialAtlas.IRON);
        vanBox(faces,van,w-.15,.10,f,.15,h-.02,r-f,MaterialAtlas.IRON);
        vanBox(faces,van,-w+.15,.17,f+.12,.07,h-.29,r-f-.24,MaterialAtlas.AGED_WOOD);
        vanBox(faces,van,w-.22,.17,f+.12,.07,h-.29,r-f-.24,MaterialAtlas.AGED_WOOD);
        vanBox(faces,van,-w,.10,r-.17,w*2,h-.02,.17,MaterialAtlas.IRON);
        vanBox(faces,van,-w-.025,h-.02,f-.05,w*2+.05,.15,r-f+.10,MaterialAtlas.IRON);
        vanBox(faces,van,-w+.22,h-.11,f+.14,w*2-.44,.035,r-f-.28,
            MaterialAtlas.CEILING);
        // Sidewall trim, tie-down channels and crossmembers are attached to
        // the surface, not free-standing equipment placed in arbitrary cells.
        for(double tz=f+.47;tz<r-.40;tz+=.87){
            for(double wallX:new double[]{-w+.12,w-.20}){
                vanBox(faces,van,wallX,.19,tz,.075,h-.34,.055,MaterialAtlas.IRON);
                vanBox(faces,van,wallX,.30,tz-.10,.10,.11,.18,MaterialAtlas.IRON);
            }
            vanBox(faces,van,-w+.18,h-.15,tz,w*2-.36,.035,.055,MaterialAtlas.IRON);
        }
        // Left pegboard: a complete seven-column/six-row instrument storage
        // system. Brackets have a load-bearing backing and a visible rail.
        vanBox(faces,van,-w+.22,.21,f+.43,.085,2.72,r-f-.93,MaterialAtlas.IRON);
        for(int row=0;row<VanInteriorLayout.TOOL_ROWS;row++){
            double yy=.27+row*.45;
            vanBox(faces,van,-w+.29,yy,f+.59,.32,.042,r-f-1.19,
                MaterialAtlas.AGED_WOOD);
            for(int col=0;col<VanInteriorLayout.TOOL_COLUMNS;col++){
                double zz=-2.76+col*VanInteriorLayout.TOOL_COLUMN_PITCH;
                vanBox(faces,van,-w+.30,yy+.07,zz-.09,.29,.065,.17,
                    MaterialAtlas.IRON);
            }
        }
        // Right-hand mounted monitor rail, real workstation power shelf,
        // map and assignment boards; side installation leaves a clear aisle.
        vanBox(faces,van,w-.38,.78,-2.57,.22,.12,4.72,MaterialAtlas.AGED_WOOD);
        for(double zz:new double[]{-1.71,-.21,1.29}){
            vanBox(faces,van,w-.35,1.45,zz-.53,.11,.95,1.06,MaterialAtlas.IRON);
            vanBox(faces,van,w-.39,1.26,zz-.53,.20,.08,1.06,MaterialAtlas.IRON);
        }
        // Driver bulkhead and floor-supported command table.
        vanBox(faces,van,-1.60,.42,r-.32,3.10,1.88,.08,MaterialAtlas.AGED_WOOD);
        for(VanInteriorLayout.Fixture fixture:VanInteriorLayout.FIXTURES){
            if(!VanInteriorLayout.insideShell(fixture))
                throw new IllegalStateException("VAN furniture outside cabin: "+fixture.purpose());
            VanStaging.Position p=van.world(fixture.localX(),fixture.localZ());
            imported(faces,fixture.mesh(),p.x(),fixture.y(),p.z(),
                fixture.scale(),van.placement().yaw()+fixture.yaw());
        }
        // Visible command desk keyboard and physical mouse, not a text-only UI.
        vanBox(faces,van,.52,.775,2.66,.12,.052,.17,MaterialAtlas.IRON);
        // Ceiling lighting flush to headliner with explicit metal carriers.
        for(double zz:new double[]{-2.40,-.72,.98,2.64}){
            vanBox(faces,van,-.12,h-.15,zz-.18,.24,.095,.40,MaterialAtlas.WINDOW);
            vanBox(faces,van,-1.67,h-.13,zz-.22,.18,.085,.45,MaterialAtlas.WINDOW);
            vanBox(faces,van,1.49,h-.13,zz-.22,.18,.085,.45,MaterialAtlas.WINDOW);
        }
        var doorControl=van.doorButton();
        imported(faces,"button_12",doorControl.x(),1.22,doorControl.z(),
            .48,van.placement().yaw()+Math.PI/2);

        // LAN: 28 genuinely functional types (and reserved mounting sockets
        // for all 42 catalog families), using host-issued owned tiers.
        // Solo: render only the six items purchased by this player's profile.
        if(!rackToolTiers.isEmpty()){
            for(var socket:VanInteriorLayout.toolSockets()){
                EquipmentTiers.Tier tier=rackToolTiers.get(socket.equipment());
                if(tier==null)continue;
                vanMountedTool(faces,EquipmentModelCatalog.model(socket.equipment(),tier),
                    van,socket.x(),socket.y(),socket.z(),.34,.31,.28);
            }
        }else{
            for(EquipmentLoadout.Item item:stock){
                String id=switch(item){
                    case EMF->"EMF_READER";case THERMOMETER->"THERMOMETER";
                    case SPIRIT_BOX->"SPIRIT_BOX";case UV_LAMP->"UV_LIGHT";
                    case PHOTO_CAMERA->"PHOTO_CAMERA";case SALT->"SALT";
                };
                var socket=VanEquipmentRack.socket(van,item);
                var local=van.local(socket.x(),socket.z());
                vanMountedTool(faces,EquipmentModelCatalog.model(id,EquipmentTiers.Tier.I),
                    van,local.x(),1.10,local.z(),.39,.43,.33);
            }
        }
        cargoDoorLeaf(faces,van,true);
        cargoDoorLeaf(faces,van,false);
    }

    /** Minimal real CC0 streetscape. Geometry is deliberately deterministic:
     * noninteractive scenery never becomes a ghost evidence source.
     */
    private static void roadsideModels(List<Face> out,HouseMap map){
        // Road and parked traffic translate with the actual site van.
        double dx=map.van().placement().x()-20.5,dz=map.van().placement().z()-27.5;
        for(int i=0;i<5;i++){
            double mx=3.1+i*4.6;
            imported(out,i==2?"kenney_road_asphalt_damaged":
                "kenney_road_asphalt_straight",mx+dx,.012,28.1+dz,
                i==2?4.35:2.30,Math.PI/2);
        }
        imported(out,"ggbot_car01",5.1+dx,.08,28.1+dz,1,Math.PI/2);
        imported(out,"ggbot_car07",12.2+dx,.08,28.1+dz,1,-Math.PI/2);
        imported(out,"kenney_detail_light_single",3.2+dx,.08,24.9+dz,2.25,0);
        imported(out,"kenney_detail_dumpster_closed",14.2+dx,.06,24.7+dz,1.65,0);
        imported(out,"kenney_detail_bench",9.1+dx,.07,25.1+dz,1.75,Math.PI/2);
        imported(out,"kenney_detail_barrier_type_a",7.8+dx,.06,26.0+dz,1.3,0);
    }

    /** Three visually distinct small PS-era rite installations at fixed room sockets. */
    private static void ritualInstallation(List<Face> out,RitualSites.Site site,
                                            double clock,boolean energized){
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
        if(energized){
            // The authentic rite lights its physical seal; inactive sites stay inert.
            int glow=switch(site.rite()){
                case BANISHMENT->0xef8f71;
                case CLEANSING->0x8ae6dd;
                case ABSOLUTION->0xffdd8a;
            };
            for(int k=0;k<12;k++){
                double a=k*Math.PI/6+clock*.42;
                double r=.66+.09*Math.sin(clock*2+k);
                double elevation=.20+.24*(1+Math.sin(clock*2.2+k*.8));
                box(out,x+Math.cos(a)*r-.035,elevation,
                    z+Math.sin(a)*r-.035,.07,.09,.07,glow);
            }
            for(int k=0;k<4;k++)
                box(out,x-.026,.16+k*.34,z-.026,.052,.08,.052,glow);
            if(site.rite()==GhostIdentity.Rite.ABSOLUTION){
                for(double offset:new double[]{-.65,.65}){
                    double flicker=.12+.045*Math.sin(clock*13+offset*3);
                    box(out,x+offset-.035,1.30,z-.195,.07,flicker,.07,0xffb84a);
                    box(out,x+offset-.016,1.33,z-.175,.032,flicker*.65,.032,0xffedb1);
                }
            }
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
        double ceiling=map.ceilingHeight();
        for(int zz=1;zz<map.height()-1;zz++)for(int xx=1;xx<map.width()-1;xx++) {
            if(map.tile(xx,zz)=='#'||map.tile(xx,zz)=='W')continue;
            double mx=xx+.5,mz=zz+.5;
            // Far geometry may be skipped only when beyond near/far fog; clipping handles visibility.
            if(Math.hypot(mx-x,mz-z)>14)continue;
            int n=map.roomAt(mx,mz);
            int floor=MaterialAtlas.floor(map.site(),n),
                wall=MaterialAtlas.wall(map.site(),n);
            texturedQuad(out,new Point(xx,0,zz),new Point(xx+1,0,zz),new Point(xx+1,0,zz+1),new Point(xx,0,zz+1),
                floor,xx,zz,xx+1,zz,xx+1,zz+1,xx,zz+1,0xffffff);
            if(!map.outside(n))texturedQuad(out,new Point(xx,ceiling,zz+1),new Point(xx+1,ceiling,zz+1),
                new Point(xx+1,ceiling,zz),new Point(xx,ceiling,zz),
                MaterialAtlas.CEILING,xx,zz+1,xx+1,zz+1,xx+1,zz,xx,zz,0xffffff);
            if(map.tile(xx-1,zz)=='W')architecturalWindow(out,xx,zz,0,ceiling);
            else if(map.solid(xx-1,zz)&&map.tile(xx-1,zz)!='D')texturedQuad(out,new Point(xx,0,zz+1),new Point(xx,0,zz),new Point(xx,ceiling,zz),new Point(xx,ceiling,zz+1),
                wall,zz+1,0,zz,0,zz,2.7,zz+1,2.7,0xd0d0d0);
            if(map.tile(xx+1,zz)=='W')architecturalWindow(out,xx,zz,1,ceiling);
            else if(map.solid(xx+1,zz)&&map.tile(xx+1,zz)!='D')texturedQuad(out,new Point(xx+1,0,zz),new Point(xx+1,0,zz+1),new Point(xx+1,ceiling,zz+1),new Point(xx+1,ceiling,zz),
                wall,zz,0,zz+1,0,zz+1,2.7,zz,2.7,0xfafafa);
            if(map.tile(xx,zz-1)=='W')architecturalWindow(out,xx,zz,2,ceiling);
            else if(map.solid(xx,zz-1)&&map.tile(xx,zz-1)!='D')texturedQuad(out,new Point(xx,0,zz),new Point(xx+1,0,zz),new Point(xx+1,ceiling,zz),new Point(xx,ceiling,zz),
                wall,xx,0,xx+1,0,xx+1,2.7,xx,2.7,0xe0e0e0);
            if(map.tile(xx,zz+1)=='W')architecturalWindow(out,xx,zz,3,ceiling);
            else if(map.solid(xx,zz+1)&&map.tile(xx,zz+1)!='D')texturedQuad(out,new Point(xx+1,0,zz+1),new Point(xx,0,zz+1),new Point(xx,ceiling,zz+1),new Point(xx+1,ceiling,zz+1),
                wall,xx+1,0,xx,0,xx,2.7,xx+1,2.7,0xebebeb);
            if(map.tile(xx,zz)=='D'){
                // Door geometry must occupy the opening, not sit behind wallpaper faces.
                boolean eastWest=map.doorwayAlongX(xx,zz);
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
                if(ceiling>2.7)
                    box(out,xx,2.50,zz,1,ceiling-2.50,1,
                        map.site()==HouseMap.Site.SCHOOL?0x817c72:0x65564b);
            }
        }
        siteRoof(out,map);
        // Every investigation room has a discoverable physical rocker and ceiling fixture.
        for(int r=0;r<HouseMap.INDOOR_ROOMS;r++){
            RoomLighting.Switch sw=RoomLighting.location(map,r);
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
                    cx,ceiling-.12,cz,.76,0);
                box(out,cx-.19,ceiling-.21,cz-.17,.38,.024,.34,
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
        if(Math.hypot(x-map.van().placement().x(),z-map.van().placement().z())<20)
            roadsideModels(out,map);
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
            // Last embers dissipate instead of cutting a full column off instantly.
            int density=Math.max(1,Math.min(8,(burn.untilTick()-roomLightTick+1)/2));
            for(int i=0;i<density;i++){
                double rise=.2+i*.22;
                double sway=Math.sin(phase+i*.8)*(.04+rise*.07);
                double px=burn.x()+sway,pz=burn.z()+Math.cos(phase+i*.45)*.07;
                double spread=.05+i*.009;
                box(out,px-spread*.5,rise,pz-spread*.5,spread,.04+i*.004,spread,
                    i%2==0?0x6e8888:0x8f9d96);
            }
        }
        // This device exists ONLY after an owner physically deploys it.
        // Projected light is a physical effect, not an evidence qualification check.
        for(LanDotsProjectors.Placement placement:dotsPositions.values()){
            if(Math.hypot(placement.x()-x,placement.z()-z)>13.5)continue;
            imported(out,"vape_mp_1",placement.x(),.10,placement.z(),2.0,0);
            double radius=EquipmentTiers.stage(
                "DOTS_PROJECTOR",placement.tier()).reachCm()/100.0;
            // Tier I: narrow sparse volume; Tier II: broad static array;
            // Tier III: wide motorized sweep. Beams alone never count as evidence.
            int limit=placement.tier()==EquipmentTiers.Tier.I?3:5;
            for(int gx=-limit;gx<=limit;gx+=2)for(int gz=-limit;gz<=limit;gz+=2){
                double px=placement.x()+gx*radius/(limit+1.0),
                    pz=placement.z()+gz*radius/(limit+1.0);
                if(Math.hypot(px-placement.x(),pz-placement.z())>radius
                        ||map.roomAt(px,pz)!=placement.room())continue;
                if(placement.tier()==EquipmentTiers.Tier.III){
                    double angle=Math.atan2(pz-placement.z(),px-placement.x());
                    double center=Math.sin(clock*1.4)*1.25;
                    if(Math.abs(Math.atan2(Math.sin(angle-center),Math.cos(angle-center)))>1.05)
                        continue;
                }
                int layers=placement.tier()==EquipmentTiers.Tier.I?2:3;
                for(int layer=0;layer<layers;layer++){
                    double yy=.08+layer*.67;
                    box(out,px-.025,yy,pz-.025,.05,.035,.05,0x73d99e);
                }
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
        double dx=p.x-x,dy=p.y-eyeHeight,dz=p.z-z;
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
    public record Apparition(double x,double z,LanGhostAnimation.Phase phase,int heading,int progress,boolean orb,boolean greenTint,String appearance) {
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
            if(!Double.isFinite(x)||!Double.isFinite(z)||phase==null||heading<0||heading>=360
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
            int room=map.roomAt((face.a.x+face.b.x+face.c.x)/3,
                (face.a.z+face.b.z+face.c.z)/3);
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
            double bearing=yaw+Math.atan2(sx-renderWidth*.5,focal);
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
            int sx=(int)Math.round(renderWidth*.5+Math.tan(diff)*focal);
            int sy=horizon-19-(star*37%54);
            if(sx>=0&&sx<renderWidth&&sy>=0&&sy<renderHeight)pixels[sy*renderWidth+sx]=0x8096ac;
        }
        for(int sx=0;sx<renderWidth;sx++){
            double bearing=yaw+Math.atan2(sx-renderWidth*.5,focal);
            int hills=horizon+(int)(13*Math.sin(bearing*2.1)+8*Math.sin(bearing*5.7)
                    +5*Math.sin(bearing*13.2));
            for(int sy=Math.max(0,hills);sy<renderHeight;sy++)pixels[sy*renderWidth+sx]=0x18202a;
        }
        double diff=Math.atan2(Math.sin(-1.2-yaw),Math.cos(-1.2-yaw));
        int mx=(int)Math.round(renderWidth*.5+Math.tan(diff)*focal),my=horizon-43;
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
                renderSpiritOrb(gx,gz,.98+.18*Math.sin(clock*4),clock,apparition.greenTint());
            }else{
                DirectionalSprites.draw(pixels,depths,x,z,yaw,pitch,gx,gz,
                    apparition==null?0:apparition.heading(),
                    apparition==null?"banshee":apparition.appearance(),1.95*stature,1.16,
                    .09*Math.sin(clock*3)+lift,alpha,lamp,renderWidth,renderHeight,focal,
                    apparition!=null&&apparition.greenTint(),phase,
                    Math.floorMod((int)Math.floor(clock*10),4));
            }
        }
        if(hunterRoom>=0){
            DirectionalSprites.draw(pixels,depths,x,z,yaw,pitch,
                map.centerX(hunterRoom)-1.25,map.centerZ(hunterRoom)+2.0,
                0,"observer",1.75,1.04,0,255,lamp,renderWidth,renderHeight,focal);
        }
        for(RemoteBody person:others){
            double distance=Math.hypot(person.x()-x,person.z()-z);
            if(distance>14||distance<1.35)continue;
            DirectionalSprites.draw(pixels,depths,x,z,yaw,pitch,person.x(),person.z(),
                person.heading(),"observer",1.75,1.04,0,255,lamp,renderWidth,renderHeight,focal);
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
                    :MaterialAtlas.sample(material,uu,vv);
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