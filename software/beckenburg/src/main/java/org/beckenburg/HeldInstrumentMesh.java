package org.beckenburg;

import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.awt.image.DataBufferInt;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

/** Source-mesh foreground raster for owner-approved PSX instrument and book shells.
 * The real GLB triangles/embedded textures are drawn; live measurements are
 * overlaid separately on the instrument face, never invented by the art layer.
 */
public final class HeldInstrumentMesh {
    private HeldInstrumentMesh(){}
    private static final int W=180,H=155;
    private static final Map<String,BufferedImage> cache=new HashMap<>();
    public static String source(String kind,EquipmentTiers.Tier tier){
        if(kind==null||tier==null)return null;
        String id=kind.equals("EMF")?"EMF_READER":kind;
        // Every cataloged device has an authored model per tier. Unknown legacy
        // labels still use their older non-GLB fallback without source invention.
        try{
            return EquipmentTierVisuals.prefab(id,tier).modelName();
        }catch(IllegalArgumentException unknown){
            return null;
        }
    }
    public static synchronized BufferedImage image(String kind,EquipmentTiers.Tier tier){
        String name=source(kind,tier);
        if(name==null)throw new IllegalArgumentException("No physical instrument mesh for "+kind);
        return cache.computeIfAbsent(name,HeldInstrumentMesh::raster);
    }
    public static void draw(Graphics2D g,int screenWidth,int screenHeight,
            String kind,EquipmentTiers.Tier tier){
        if(screenWidth<180||screenHeight<140)return;
        BufferedImage mesh=image(kind,tier);
        double factor=Math.max(.5,Math.min(1.85,
            Math.min(screenWidth/850.0,screenHeight/480.0)));
        factor*=1.0+.085*tier.ordinal();
        int w=(int)Math.round(W*factor),h=(int)Math.round(H*factor);
        g.drawImage(mesh,screenWidth-w-18,screenHeight-h+7,w,h,null);
    }
    private static BufferedImage raster(String name){
        var triangles=GlbProps.model(name).triangles();
        BufferedImage out=new BufferedImage(W,H,BufferedImage.TYPE_INT_ARGB);
        int[] pixels=((DataBufferInt)out.getRaster().getDataBuffer()).getData();
        double[] zBuffer=new double[W*H];Arrays.fill(zBuffer,Double.NEGATIVE_INFINITY);
        double minX=Double.POSITIVE_INFINITY,minY=minX,minZ=minX;
        double maxX=Double.NEGATIVE_INFINITY,maxY=maxX,maxZ=maxX;
        for(var t:triangles)for(var p:new GlbProps.Vertex[]{t.a(),t.b(),t.c()}){
            minX=Math.min(minX,p.x());minY=Math.min(minY,p.y());minZ=Math.min(minZ,p.z());
            maxX=Math.max(maxX,p.x());maxY=Math.max(maxY,p.y());maxZ=Math.max(maxZ,p.z());
        }
        double span=Math.max(.04,Math.max(maxX-minX,Math.max(maxZ-minZ,(maxY-minY)*.65)));
        double scale=135.0/span, cx=(minX+maxX)/2,cy=(minY+maxY)/2,cz=(minZ+maxZ)/2;
        for(var t:triangles){
            var p=new GlbProps.Vertex[]{t.a(),t.b(),t.c()};
            double[] sx=new double[3],sy=new double[3],depth=new double[3];
            for(int i=0;i<3;i++){
                double x=p[i].x()-cx,y=p[i].y()-cy,z=p[i].z()-cz;
                sx[i]=W*.5+(x*.86+z*.26)*scale;
                sy[i]=H*.53-(z*.80+y*.56-x*.11)*scale;
                depth[i]=y*.85-z*.14+x*.13;
            }
            double denom=(sy[1]-sy[2])*(sx[0]-sx[2])+
                         (sx[2]-sx[1])*(sy[0]-sy[2]);
            if(Math.abs(denom)<1e-10)continue;
            int xmin=Math.max(0,(int)Math.floor(Math.min(sx[0],Math.min(sx[1],sx[2]))));
            int xmax=Math.min(W-1,(int)Math.ceil(Math.max(sx[0],Math.max(sx[1],sx[2]))));
            int ymin=Math.max(0,(int)Math.floor(Math.min(sy[0],Math.min(sy[1],sy[2]))));
            int ymax=Math.min(H-1,(int)Math.ceil(Math.max(sy[0],Math.max(sy[1],sy[2]))));
            for(int py=ymin;py<=ymax;py++)for(int px=xmin;px<=xmax;px++){
                double a=((sy[1]-sy[2])*(px+.5-sx[2])
                         +(sx[2]-sx[1])*(py+.5-sy[2]))/denom;
                double b=((sy[2]-sy[0])*(px+.5-sx[2])
                         +(sx[0]-sx[2])*(py+.5-sy[2]))/denom;
                double c=1-a-b;
                if(a<0||b<0||c<0)continue;
                double z=a*depth[0]+b*depth[1]+c*depth[2];
                int index=py*W+px;if(z<=zBuffer[index])continue;
                double u=a*p[0].u()+b*p[1].u()+c*p[2].u();
                double v=a*p[0].v()+b*p[1].v()+c*p[2].v();
                pixels[index]=0xff000000|GlbProps.sample(t.material(),u,v);
                zBuffer[index]=z;
            }
        }
        int count=0;for(int pixel:pixels)if((pixel>>>24)!=0)count++;
        if(count<35)throw new IllegalStateException("Original asset did not render: "+name);
        return out;
    }
}
