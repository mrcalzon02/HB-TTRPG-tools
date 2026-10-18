package org.beckenburg;

import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.awt.image.DataBufferInt;
import java.util.Arrays;

/** Actual textured PSX flashlight mesh in the left hand, separate from the active evidence tool.
 * The F-key power state affects its presentation; rasterisation is cached at native PSX resolution.
 */
public final class HeldMeshView {
    private static final int W=192,H=128;
    private static BufferedImage flashlight;
    private HeldMeshView() { }
    static synchronized BufferedImage flashlightImage(){
        if(flashlight==null)flashlight=buildFlashlight();
        return flashlight;
    }
    public static void draw(Graphics2D g,int width,int height,long tick,boolean powered){
        if(g==null||width<180||height<140)return;
        BufferedImage mesh=flashlightImage();
        double scale=Math.max(.5,Math.min(1.85,Math.min(width/850.0,height/480.0)));
        int sw=(int)Math.round(W*scale),sh=(int)Math.round(H*scale);
        int x=Math.max(0,(int)(width*.07)),y=height-sh+(int)(Math.sin(tick*.15)*3*scale);
        java.awt.Composite original=g.getComposite();
        try{
            if(!powered)g.setComposite(java.awt.AlphaComposite.getInstance(java.awt.AlphaComposite.SRC_OVER,.72f));
            g.drawImage(mesh,x,y,sw,sh,null);
        }finally{g.setComposite(original);}
    }
    private static BufferedImage buildFlashlight(){
        BufferedImage out=new BufferedImage(W,H,BufferedImage.TYPE_INT_ARGB);
        int[] pixels=((DataBufferInt)out.getRaster().getDataBuffer()).getData();
        double[] depths=new double[W*H];Arrays.fill(depths,Double.NEGATIVE_INFINITY);
        for(GlbProps.Triangle tri:GlbProps.model("flashlight_mp_1").triangles()){
            GlbProps.Vertex[] p={tri.a(),tri.b(),tri.c()};
            double[] xs=new double[3],ys=new double[3],zs=new double[3];
            for(int i=0;i<3;i++){
                // Original flashlight's long axis is X; cant it upward toward the scene.
                double x=p[i].x(),y=p[i].y(),z=p[i].z();
                xs[i]=W*.48+x*620-z*240;
                ys[i]=H*.55-x*230-(y-.035)*690-z*145;
                zs[i]=z*.78-y*.20+x*.11;
            }
            double den=(ys[1]-ys[2])*(xs[0]-xs[2])+(xs[2]-xs[1])*(ys[0]-ys[2]);
            if(Math.abs(den)<1e-10)continue;
            int minX=Math.max(0,(int)Math.floor(Math.min(xs[0],Math.min(xs[1],xs[2]))));
            int maxX=Math.min(W-1,(int)Math.ceil(Math.max(xs[0],Math.max(xs[1],xs[2]))));
            int minY=Math.max(0,(int)Math.floor(Math.min(ys[0],Math.min(ys[1],ys[2]))));
            int maxY=Math.min(H-1,(int)Math.ceil(Math.max(ys[0],Math.max(ys[1],ys[2]))));
            for(int yy=minY;yy<=maxY;yy++)for(int xx=minX;xx<=maxX;xx++){
                double a=((ys[1]-ys[2])*(xx+.5-xs[2])+(xs[2]-xs[1])*(yy+.5-ys[2]))/den;
                double b=((ys[2]-ys[0])*(xx+.5-xs[2])+(xs[0]-xs[2])*(yy+.5-ys[2]))/den;
                double c=1-a-b;
                if(a<0||b<0||c<0)continue;
                double depth=a*zs[0]+b*zs[1]+c*zs[2];
                int at=yy*W+xx;if(depth<=depths[at])continue;
                double u=a*p[0].u()+b*p[1].u()+c*p[2].u();
                double v=a*p[0].v()+b*p[1].v()+c*p[2].v();
                int sampled=GlbProps.sample(tri.material(),u,v);
                // The source texture remains authoritative; a small fixed highlight improves readability.
                int brightness=190+((int)(depth*100)+32)%30;
                int r=Math.min(255,((sampled>>16)&255)*brightness/205);
                int gg=Math.min(255,((sampled>>8)&255)*brightness/205);
                int bb=Math.min(255,(sampled&255)*brightness/205);
                pixels[at]=0xff000000|(r<<16)|(gg<<8)|bb;
                depths[at]=depth;
            }
        }
        int solid=0;for(int pixel:pixels)if((pixel>>>24)!=0)solid++;
        if(solid<100)throw new IllegalStateException("Purchased flashlight mesh failed to rasterise");
        return out;
    }
}
