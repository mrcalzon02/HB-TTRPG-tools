package org.beckenburg;

import java.awt.image.BufferedImage;
import java.awt.image.DataBufferInt;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/** True perspective-triangle software rasterizer, depth tested at a period-appropriate 320x200. */
public final class SceneRenderer {
    public static final int W=320,H=200;
    private static final double NEAR=.065,FOCAL=153; // ~93 degree horizontal first-person FOV
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
    public int hidingDensity;
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
            case 6 -> { // library: bookcases and reader's table
                box(out,cx-2.45,0,cz-1.8,.55,2.15,3.2,0x614735);
                for(int i=0;i<5;i++)box(out,cx-2.37,.38+i*.35,cz-1.69,.58,.08,2.97,0x936e4e);
                box(out,cx-.2,0,cz+1.0,1.7,.82,.85,0x5e4938);
            }
            case 7 -> { // dining room: table and four seats
                box(out,cx-1.1,0,cz-.7,2.15,.74,1.35,0x574337);
                box(out,cx-1.15,.76,cz-.72,2.25,.09,1.41,0x97734e);
                box(out,cx-1.3,0,cz-1.55,.76,.54,.52,0x68513b);
                box(out,cx+.58,0,cz+1.14,.76,.54,.52,0x68513b);
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
    private static void vanModel(List<Face> faces,VanStaging van){
        double w=VanStaging.HALF_WIDTH,f=VanStaging.FRONT,r=VanStaging.REAR;
        // Three obstructing wall segments surround a traversable open cargo entrance.
        vanBox(faces,van,-w,0,f,.16,2.27,r-f,MaterialAtlas.IRON);
        vanBox(faces,van,w-.16,0,f,.16,2.27,r-f,MaterialAtlas.IRON);
        vanBox(faces,van,-w,0,r-.16,w*2,2.27,.16,MaterialAtlas.AGED_WOOD);
        vanBox(faces,van,-w,2.27,f,w*2,.17,r-f,MaterialAtlas.IRON);
        vanBox(faces,van,-w,.015,f,w*2,.04,r-f,MaterialAtlas.CONCRETE);
        // Side-mounted lockers, distinct coloured monitor/briefing boards and ramps.
        vanBox(faces,van,-1.90,.20,-1.25,.30,1.45,1.00,MaterialAtlas.AGED_WOOD);
        vanBox(faces,van,1.60,.20,-1.25,.28,1.45,1.00,MaterialAtlas.IRON);
        vanBox(faces,van,-1.90,.68,.28,.32,.95,1.0,MaterialAtlas.WINDOW);
        vanBox(faces,van,1.55,.7,.28,.36,.9,.95,MaterialAtlas.RITUAL);
        vanBox(faces,van,-.55,.10,r-.28,1.1,.5,.18,MaterialAtlas.AGED_WOOD);
        vanBox(faces,van,-w+.1,.05,f-.3,w*2-.2,.08,.3,MaterialAtlas.IRON);
        // Visible equipment shelf: six distinct physical sockets. Items can be aimed at and taken.
        vanBox(faces,van,1.76,.58,-1.88,.10,1.14,3.30,MaterialAtlas.AGED_WOOD);
        vanBox(faces,van,1.35,.53,-1.88,.53,.085,3.30,MaterialAtlas.IRON);
        for(EquipmentLoadout.Item item:EquipmentLoadout.Item.values()){
            double lz=-1.58+item.ordinal()*.52;
            int finish=switch(item){
                case EMF->0x517d73; case THERMOMETER->0xaaa99b;
                case SPIRIT_BOX->0x49535f;case UV_LAMP->0x8a70b1;
                case PHOTO_CAMERA->0x3b4553;case SALT->0xd1c49d;
            };
            VanStaging.Position v=van.world(1.48,lz);
            // Distinct silhouettes rather than textureless pickup collision flags.
            box(faces,v.x()-.11,.65,v.z()-.09,.21,.50,.18,finish);
            box(faces,v.x()-.09,1.12,v.z()-.07,.17,.08,.14,0xa1aab4);
        }
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
                        texturedBox(out,xx+.27,0,zz+.09,.46,2.34,.82,MaterialAtlas.DOOR);
                        box(out,xx+.245,1.02,zz+.69,.055,.12,.075,0xe1ba62);
                    }
                }else{
                    box(out,xx+.02,0,zz+.18,.10,2.45,.64,0x8f805e);
                    box(out,xx+.88,0,zz+.18,.10,2.45,.64,0x8f805e);
                    box(out,xx,2.35,zz+.18,1,.11,.64,0x8f805e);
                    if(!map.doorOpen(xx,zz)){
                        texturedBox(out,xx+.09,0,zz+.27,.82,2.34,.46,MaterialAtlas.DOOR);
                        box(out,xx+.68,1.02,zz+.245,.075,.12,.055,0xe1ba62);
                    }
                }
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
        if(Math.hypot(map.van().placement().x()-x,map.van().placement().z()-z)<14) vanModel(out,map.van());
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
                    box(out,mx-.055,yy,mz-.055,.11,.34,.11,0xd7c08c);
                    box(out,mx-.21,yy+.15,mz-.055,.42,.10,.11,0xe1d4a3);
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
        double cx=W*.5+torso.x/torso.z*FOCAL;
        double cy=H*.5-torso.y/torso.z*FOCAL;
        double labelX=W*.5+head.x/head.z*FOCAL;
        double labelY=H*.5-head.y/head.z*FOCAL-5;
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
            for(int i=1;i<pts.size()-1;i++)triangle(pts.get(0),pts.get(i),pts.get(i+1),face.color,face.material);
        }
        renderCharacterSprites(map,ghostRoom,visibleGhost,hunterRoom,clock,others,apparition);
    }
    /** Procedural sky gradient, distant hills and moving moon; only rendered through outdoor openings. */
    private void paintSky(HouseMap map){
        final double eye=1.62;
        final int horizon=(int)Math.round(H*.51+Math.tan(pitch)*153);
        boolean outside=map.outside(map.roomAt(x,z));
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
        int cx=(int)Math.round(W*.5+p.x/p.z*FOCAL),cy=(int)Math.round(H*.5-p.y/p.z*FOCAL);
        int radius=Math.min(29,Math.max(2,(int)Math.round(FOCAL*.19/p.z)));
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
        Point a=va.p,b=vb.p,c=vc.p;
        int color=tint;
        double x0=W*.5+a.x/a.z*FOCAL,y0=H*.5-a.y/a.z*FOCAL;
        double x1=W*.5+b.x/b.z*FOCAL,y1=H*.5-b.y/b.z*FOCAL;
        double x2=W*.5+c.x/c.z*FOCAL,y2=H*.5-c.y/c.z*FOCAL;
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
                int texel=MaterialAtlas.sample(material,uu,vv);
                int tr=(texel>>16)&255,tg=(texel>>8)&255,tb=texel&255;
                color=((tr*((tint>>16)&255)/255)<<16) |
                    ((tg*((tint>>8)&255)/255)<<8) |
                     (tb*(tint&255)/255);
            }
            double light=(lamp?1.22:.55)*environmentLight*Math.max(.22,1-d/26.0);
            light=Math.max(.1,Math.min(1.45,light+(BAYER[(px&3)+((py&3)<<2)]-7.5)/140.0));
            int red=(int)(((color>>16)&255)*light),green=(int)(((color>>8)&255)*light),blue=(int)((color&255)*light);
            double fog=Math.min(.92,Math.max(0,(d-5)/15)*fogDensity);
            red=(int)(red*(1-fog)+18*fog);green=(int)(green*(1-fog)+21*fog);blue=(int)(blue*(1-fog)+30*fog);
            pixels[k]=(Math.min(255,red)<<16)|(Math.min(255,green)<<8)|Math.min(255,blue);
        }
    }
}