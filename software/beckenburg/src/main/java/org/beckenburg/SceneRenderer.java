package org.beckenburg;

import java.awt.image.BufferedImage;
import java.awt.image.DataBufferInt;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/** True perspective-triangle software rasterizer, depth tested at a period-appropriate 320x200. */
public final class SceneRenderer {
    public static final int W=320,H=200;
    private static final double NEAR=.065,FOCAL=224;
    private static final int[] BAYER={0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5};
    private record Point(double x,double y,double z) { }
    private record Vertex(Point p,double u,double v) { }
    private record Face(Point a,Point b,Point c,int color,int material,
                        double au,double av,double bu,double bv,double cu,double cv) { }
    private final BufferedImage frame = new BufferedImage(W,H,BufferedImage.TYPE_INT_RGB);
    private final int[] pixels=((DataBufferInt)frame.getRaster().getDataBuffer()).getData();
    private final double[] depths=new double[W*H];
    public double x=20.5,z=27.5,yaw=1.65,pitch=-.09;
    public boolean lamp=true;
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
    }
    private List<Face> scene(HouseMap map,int ghostRoom,boolean ghostVisible,int wardRoom,int hunterRoom,double clock,List<RemoteBody> others,Apparition apparition) {
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
            if(map.solid(xx-1,zz))texturedQuad(out,new Point(xx,0,zz+1),new Point(xx,0,zz),new Point(xx,2.7,zz),new Point(xx,2.7,zz+1),
                wall,zz+1,0,zz,0,zz,2.7,zz+1,2.7,0xd0d0d0);
            if(map.solid(xx+1,zz))texturedQuad(out,new Point(xx+1,0,zz),new Point(xx+1,0,zz+1),new Point(xx+1,2.7,zz+1),new Point(xx+1,2.7,zz),
                wall,zz,0,zz+1,0,zz+1,2.7,zz,2.7,0xfafafa);
            if(map.solid(xx,zz-1))texturedQuad(out,new Point(xx,0,zz),new Point(xx+1,0,zz),new Point(xx+1,2.7,zz),new Point(xx,2.7,zz),
                wall,xx,0,xx+1,0,xx+1,2.7,xx,2.7,0xe0e0e0);
            if(map.solid(xx,zz+1))texturedQuad(out,new Point(xx+1,0,zz+1),new Point(xx,0,zz+1),new Point(xx,2.7,zz+1),new Point(xx+1,2.7,zz+1),
                wall,xx+1,0,xx,0,xx,2.7,xx+1,2.7,0xebebeb);
            if(map.tile(xx,zz)=='D'&&!map.doorOpen(xx,zz)){
                if(xx==8||xx==16)texturedBox(out,xx+.22,0,zz+.07,.54,2.35,.86,MaterialAtlas.DOOR);
                else texturedBox(out,xx+.08,0,zz+.23,.85,2.35,.54,MaterialAtlas.DOOR);
            }
        }
        for(int r=0;r<map.roomCount();r++) if(Math.hypot(map.centerX(r)-x,map.centerZ(r)-z)<14) furniture(out,r,map);
        if(Math.hypot(map.van().placement().x()-x,map.van().placement().z()-z)<14) vanModel(out,map.van());
        if(ghostVisible){
            double gx=apparition==null?map.centerX(ghostRoom):apparition.x(),
                   gz=apparition==null?map.centerZ(ghostRoom):apparition.z();
            double bob=.12*Math.sin(clock*3);
            // Faceted low-poly spirit: shrouded torso, hood, arms and glowing eye pair.
            box(out,gx-.32,.48+bob,gz-.2,.64,1.05,.4,0x747d9b);
            box(out,gx-.23,1.5+bob,gz-.14,.46,.43,.35,0x888eaf);
            box(out,gx-.44,.72+bob,gz-.2,.15,.8,.28,0x626983);
            box(out,gx+.29,.72+bob,gz-.2,.15,.8,.28,0x626983);
            box(out,gx-.15,1.7+bob,gz-.24,.09,.06,.055,0xd4d9ff);
            box(out,gx+.08,1.7+bob,gz-.24,.09,.06,.055,0xd4d9ff);
        }
        if(hunterRoom>=0){
            double hx=map.centerX(hunterRoom)-1.25,hz=map.centerZ(hunterRoom)+2.0;
            // The simulated hunter is only drawn when local ghost senses their room.
            box(out,hx-.27,0,hz-.19,.54,.95,.36,0x3a4548);
            box(out,hx-.28,.97,hz-.20,.56,.56,.4,0x5a6660);
            box(out,hx-.20,1.53,hz-.12,.40,.32,.28,0xa68d7c);
            box(out,hx-.31,.22,hz-.20,.18,.75,.24,0x242932);
            box(out,hx+.14,.22,hz-.20,.18,.75,.24,0x242932);
        }
        // Host-authoritative teammate bodies are only drawn in the hunters' shared view.
        for(RemoteBody person:others){
            if(!Double.isFinite(person.x())||!Double.isFinite(person.z()))continue;
            double distance=Math.hypot(person.x()-x,person.z()-z);
            if(distance>14||distance<1.35)continue; // Never let a teammate avatar fill the player camera.
            double hx=person.x(),hz=person.z();int col=switch(person.slot()){
                case 0 -> 0x667c68;case 1 -> 0x697c90;default -> 0x927864;
            };
            box(out,hx-.23,0,hz-.18,.46,.92,.35,0x33383e);
            box(out,hx-.28,.9,hz-.22,.56,.55,.44,col);
            box(out,hx-.19,1.49,hz-.16,.38,.30,.32,0xb89e87);
        }
        if(wardRoom>=0){
            int r=wardRoom;double wx=map.centerX(r),wz=map.centerZ(r);
            // Visible prepared circle is constrained to the anchor room; it is not a magic menu flag.
            quad(out,new Point(wx-.8,.035,wz-.8),new Point(wx+.8,.035,wz-.8),new Point(wx+.8,.035,wz-.65),new Point(wx-.8,.035,wz-.65),0x9b85b8);
            quad(out,new Point(wx-.8,.035,wz+.65),new Point(wx+.8,.035,wz+.65),new Point(wx+.8,.035,wz+.8),new Point(wx-.8,.035,wz+.8),0x9b85b8);
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
    /** First-person network rendering with low-poly teammate models and host-managed doors. */
    public record RemoteBody(double x,double z,int slot) { }
    public record Apparition(double x,double z) {
        public Apparition {
            if(!Double.isFinite(x)||!Double.isFinite(z))throw new IllegalArgumentException("invalid apparition");
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
    public void draw(HouseMap map,InvestigationSession session,double clock){
        render(map,session.ghostRoom(),session.outcome()==InvestigationSession.Outcome.ACTIVE && session.ghostManifesting(),
            session.wardPrepared()?session.anchorRoom():-1,-1,clock,List.of());
    }
    /** Spectral viewpoint: only a room-local sensed hunter is rendered. */
    public void drawPractice(HouseMap map,int visibleHunterRoom,double clock){
        render(map,-1,false,-1,visibleHunterRoom,clock,List.of());
    }
    private void render(HouseMap map,int ghostRoom,boolean visibleGhost,int wardRoom,int hunterRoom,double clock,List<RemoteBody> others){
        render(map,ghostRoom,visibleGhost,wardRoom,hunterRoom,clock,others,null);
    }
    private void render(HouseMap map,int ghostRoom,boolean visibleGhost,int wardRoom,int hunterRoom,double clock,List<RemoteBody> others,Apparition apparition){
        Arrays.fill(pixels,0x171b25); Arrays.fill(depths,Double.POSITIVE_INFINITY);
        for(Face face:scene(map,ghostRoom,visibleGhost,wardRoom,hunterRoom,clock,others,apparition)){
            List<Vertex> pts=clip(new Vertex(camera(face.a),face.au,face.av),
                new Vertex(camera(face.b),face.bu,face.bv),new Vertex(camera(face.c),face.cu,face.cv));
            for(int i=1;i<pts.size()-1;i++)triangle(pts.get(0),pts.get(i),pts.get(i+1),face.color,face.material);
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
            double light=(lamp?1.22:.55)*Math.max(.22,1-d/26.0);
            light=Math.max(.1,Math.min(1.45,light+(BAYER[(px&3)+((py&3)<<2)]-7.5)/140.0));
            int red=(int)(((color>>16)&255)*light),green=(int)(((color>>8)&255)*light),blue=(int)((color&255)*light);
            double fog=Math.min(.75,Math.max(0,(d-5)/15));
            red=(int)(red*(1-fog)+18*fog);green=(int)(green*(1-fog)+21*fog);blue=(int)(blue*(1-fog)+30*fog);
            pixels[k]=(Math.min(255,red)<<16)|(Math.min(255,green)<<8)|Math.min(255,blue);
        }
    }
}
