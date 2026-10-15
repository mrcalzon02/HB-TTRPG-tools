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
    private record Face(Point a,Point b,Point c,int color) { }
    private final BufferedImage frame = new BufferedImage(W,H,BufferedImage.TYPE_INT_RGB);
    private final int[] pixels=((DataBufferInt)frame.getRaster().getDataBuffer()).getData();
    private final double[] depths=new double[W*H];
    public double x=4.5,z=15.5,yaw=Math.PI/2,pitch=-.18;
    public boolean lamp=true;
    public BufferedImage image(){return frame;}
    public int[] pixels(){return pixels;}
    public double[] depths(){return depths;}
    private static int shade(int c,double k){return (Math.min(255,(int)(((c>>16)&255)*k))<<16) |
        (Math.min(255,(int)(((c>>8)&255)*k))<<8) | Math.min(255,(int)((c&255)*k));}
    private static void quad(List<Face> out,Point a,Point b,Point c,Point d,int col) {
        out.add(new Face(a,b,c,col));out.add(new Face(a,c,d,col));
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
            case 0 -> { // chapel altar, candles and raised cross
                box(out,cx-1,0,cz-1.5,2,.85,.8,0x564333);
                box(out,cx-.85,.85,cz-1.38,1.7,.12,.55,0x987657);
                box(out,cx-.07,1,cz-1.25,.14,.75,.12,0x9b855b);
                box(out,cx-.39,1.49,cz-1.25,.8,.13,.12,0x9b855b);
                box(out,cx-.73,1,cz-1.25,.12,.28,.12,0xd7ab62);
            }
            case 1 -> { box(out,cx-2.5,0,cz-1.8,.65,2.2,3.25,0x503c31);
                box(out,cx-2.55,.7,cz-1.7,.7,.08,3.1,0x9a7351);
                box(out,cx-2.55,1.4,cz-1.7,.7,.08,3.1,0x906846);
                for(int i=0;i<8;i++)box(out,cx-2.35,.74,cz-1.55+i*.38,.35,.62,.25,i%2==0?0x774432:0x455466);
            }
            case 2 -> {box(out,cx-1.7,0,cz-1.7,2,.6,1.1,0x5b4140);
                box(out,cx-1.65,.62,cz-1.66,1.9,.18,.96,0x82736b);
                box(out,cx+1.6,0,cz+1.1,.6,1.25,.6,0x76593a);}
            case 3 -> {box(out,cx-1.5,0,cz-1.5,3,1,.6,0x453733);
                box(out,cx-1.3,1,cz-1.4,2.6,.06,.45,0x8f7762);
                box(out,cx+.85,0,cz+1.1,.65,1.1,.55,0x695746);}
            case 4 -> {box(out,cx-1.0,0,cz-1.25,2,.7,1.3,0x584333);
                box(out,cx-1.02,.7,cz-1.25,2.05,.09,1.35,0x8e6247);
                box(out,cx+.45,.79,cz-.8,.2,.27,.2,0xd3a865);}
            case 5 -> {box(out,cx-1.9,0,cz-1.45,2.3,.5,1.75,0x594b4a);
                box(out,cx-1.81,.51,cz-1.40,2.1,.19,1.58,0x646c77);
                box(out,cx+1.8,0,cz-.8,.65,1.25,.9,0x4f433a);}
            case 6 -> {box(out,cx+1.3,0,cz-.8,.8,1.3,.7,0x58483a);
                box(out,cx-1.7,0,cz+1.0,1.1,1.1,.85,0x685b48);}
            case 7 -> {box(out,cx-1.3,0,cz+.75,2.1,.8,1.2,0x535941);
                box(out,cx-.7,.85,cz+1.2,.4,.7,.35,0x365d46);}
            case 8 -> {box(out,cx-1.45,0,cz-1.1,2.4,.82,1.1,0x6a5140);
                box(out,cx+1.7,0,cz-.85,.65,1.5,1.25,0x473d3b);
                box(out,cx-1.2,.88,cz-.95,.63,.1,.53,0x8e7757);}
            default -> { }
        }
    }
    private List<Face> scene(HouseMap map,InvestigationSession session,double clock,boolean ward) {
        List<Face> out=new ArrayList<>(2000);
        for(int zz=1;zz<map.height()-1;zz++)for(int xx=1;xx<map.width()-1;xx++) {
            if(map.tile(xx,zz)=='#') continue;
            double mx=xx+.5,mz=zz+.5;
            // Far geometry may be skipped only when beyond near/far fog; clipping handles visibility.
            if(Math.hypot(mx-x,mz-z)>14)continue;
            int n=map.roomAt(mx,mz),base=n%2==0?0x44413d:0x3e403f;
            quad(out,new Point(xx,0,zz),new Point(xx+1,0,zz),new Point(xx+1,0,zz+1),new Point(xx,0,zz+1),((xx+zz)&1)==0?base:shade(base,.91));
            quad(out,new Point(xx,2.7,zz+1),new Point(xx+1,2.7,zz+1),new Point(xx+1,2.7,zz),new Point(xx,2.7,zz),0x343238);
            int stone=(xx+zz)%7==0?0x686064:0x575054;
            if(map.solid(xx-1,zz))quad(out,new Point(xx,0,zz+1),new Point(xx,0,zz),new Point(xx,2.7,zz),new Point(xx,2.7,zz+1),shade(stone,.83));
            if(map.solid(xx+1,zz))quad(out,new Point(xx+1,0,zz),new Point(xx+1,0,zz+1),new Point(xx+1,2.7,zz+1),new Point(xx+1,2.7,zz),stone);
            if(map.solid(xx,zz-1))quad(out,new Point(xx,0,zz),new Point(xx+1,0,zz),new Point(xx+1,2.7,zz),new Point(xx,2.7,zz),shade(stone,.92));
            if(map.solid(xx,zz+1))quad(out,new Point(xx+1,0,zz+1),new Point(xx,0,zz+1),new Point(xx,2.7,zz+1),new Point(xx+1,2.7,zz+1),shade(stone,.86));
            if(map.tile(xx,zz)=='D'&&!map.doorOpen(xx,zz)){
                if(xx==8||xx==16)box(out,xx+.22,0,zz+.07,.54,2.35,.86,0x7b503b);
                else box(out,xx+.08,0,zz+.23,.85,2.35,.54,0x7b503b);
            }
        }
        for(int r=0;r<9;r++) if(Math.hypot(map.centerX(r)-x,map.centerZ(r)-z)<14) furniture(out,r,map);
        if(session.outcome()==InvestigationSession.Outcome.ACTIVE && session.ghostManifesting()){
            double gx=map.centerX(session.ghostRoom()), gz=map.centerZ(session.ghostRoom());
            double bob=.12*Math.sin(clock*3);
            // Faceted low-poly spirit: shrouded torso, hood, arms and glowing eye pair.
            box(out,gx-.32,.48+bob,gz-.2,.64,1.05,.4,0x747d9b);
            box(out,gx-.23,1.5+bob,gz-.14,.46,.43,.35,0x888eaf);
            box(out,gx-.44,.72+bob,gz-.2,.15,.8,.28,0x626983);
            box(out,gx+.29,.72+bob,gz-.2,.15,.8,.28,0x626983);
            box(out,gx-.15,1.7+bob,gz-.24,.09,.06,.055,0xd4d9ff);
            box(out,gx+.08,1.7+bob,gz-.24,.09,.06,.055,0xd4d9ff);
        }
        if(ward){
            int r=session.anchorRoom();double wx=map.centerX(r),wz=map.centerZ(r);
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
    private static List<Point> clip(Point a,Point b,Point c){
        List<Point> in=List.of(a,b,c),out=new ArrayList<>(4);
        for(int i=0;i<3;i++){
            Point s=in.get(i),e=in.get((i+1)%3); boolean front=s.z>=NEAR,next=e.z>=NEAR;
            if(front)out.add(s);
            if(front!=next){double t=(NEAR-s.z)/(e.z-s.z);out.add(new Point(s.x+(e.x-s.x)*t,s.y+(e.y-s.y)*t,NEAR));}
        }
        return out;
    }
    public void draw(HouseMap map,InvestigationSession session,double clock){
        Arrays.fill(pixels,0x171b25); Arrays.fill(depths,Double.POSITIVE_INFINITY);
        for(Face face:scene(map,session,clock,session.wardPrepared())){
            List<Point> pts=clip(camera(face.a),camera(face.b),camera(face.c));
            for(int i=1;i<pts.size()-1;i++)triangle(pts.get(0),pts.get(i),pts.get(i+1),face.color);
        }
    }
    private void triangle(Point a,Point b,Point c,int color){
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
            double light=(lamp?1.22:.55)*Math.max(.22,1-d/26.0);
            light=Math.max(.1,Math.min(1.45,light+(BAYER[(px&3)+((py&3)<<2)]-7.5)/140.0));
            int red=(int)(((color>>16)&255)*light),green=(int)(((color>>8)&255)*light),blue=(int)((color&255)*light);
            double fog=Math.min(.75,Math.max(0,(d-5)/15));
            red=(int)(red*(1-fog)+18*fog);green=(int)(green*(1-fog)+21*fog);blue=(int)(blue*(1-fog)+30*fog);
            pixels[k]=(Math.min(255,red)<<16)|(Math.min(255,green)<<8)|Math.min(255,blue);
        }
    }
}
