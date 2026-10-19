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
        if(name.startsWith("blender_sound_recorder_"))triangles=triangles.stream()
            .map(t->new GlbProps.Triangle(recorderView(t.a()),recorderView(t.b()),recorderView(t.c()),t.material())).toList();
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
    private static GlbProps.Vertex recorderView(GlbProps.Vertex p){
        return new GlbProps.Vertex(p.x(),p.z(),p.y(),p.u(),p.v());
    }
    /** Project the actual Blender LCD corners through the same camera used for its mesh. */
    public static void drawRecorderDisplay(Graphics2D graphics,int screenWidth,int screenHeight,
            EquipmentTiers.Tier tier,String status){
        if(screenWidth<180||screenHeight<140)return;
        var triangles=GlbProps.model(source("SOUND_RECORDER",tier)).triangles();
        double[] low={Double.POSITIVE_INFINITY,Double.POSITIVE_INFINITY,Double.POSITIVE_INFINITY};
        double[] high={Double.NEGATIVE_INFINITY,Double.NEGATIVE_INFINITY,Double.NEGATIVE_INFINITY};
        for(var t:triangles)for(var point:new GlbProps.Vertex[]{t.a(),t.b(),t.c()}){
            var p=recorderView(point);double[] xyz={p.x(),p.y(),p.z()};
            for(int i=0;i<3;i++){low[i]=Math.min(low[i],xyz[i]);high[i]=Math.max(high[i],xyz[i]);}
        }
        double span=Math.max(.04,Math.max(high[0]-low[0],Math.max(high[2]-low[2],(high[1]-low[1])*.65)));
        double scale=135/span,cx=(low[0]+high[0])/2,cy=(low[1]+high[1])/2,cz=(low[2]+high[2])/2;
        int level=tier.ordinal(),number=level+1;
        double half=(.095+.014*level)*.72/2;
        double faceDepth=(.035+.006*level)/2+.006;
        double top=.025+(.058+.012*number)/2,bottom=.025-(.058+.012*number)/2;
        double[][] corners={{-half,faceDepth,top},{half,faceDepth,top},{-half,faceDepth,bottom}};
        for(double[] p:corners){
            double x=p[0]-cx,y=p[1]-cy,z=p[2]-cz;
            p[0]=W*.5+(x*.86+z*.26)*scale;
            p[1]=H*.53-(z*.80+y*.56-x*.11)*scale;
        }
        BufferedImage lcd=new BufferedImage(80,100,BufferedImage.TYPE_INT_RGB);
        Graphics2D face=lcd.createGraphics();
        try{
            face.setColor(new java.awt.Color(8,24,20));face.fillRect(0,0,80,100);
            face.setColor(new java.awt.Color(124,232,180));
            face.setFont(new java.awt.Font(java.awt.Font.MONOSPACED,java.awt.Font.BOLD,23));
            boolean rec=status!=null&&status.startsWith("REC ");
            face.drawString(rec?"REC":"STOP",4,26);
            String time="0.0s",peak="PK0";
            if(rec){
                var m=java.util.regex.Pattern.compile("REC ([0-9.]+s) / PEAK (\\d+)").matcher(status);
                if(m.find()){time=m.group(1);peak="PK"+m.group(2);}
            }else if(status!=null){
                var m=java.util.regex.Pattern.compile("STOP / (\\d+) clips").matcher(status);
                if(m.find())time=m.group(1)+"CLP";
            }
            face.setFont(new java.awt.Font(java.awt.Font.MONOSPACED,java.awt.Font.BOLD,20));
            face.drawString(time,3,58);face.drawString(rec?peak:"PLAY",3,89);
        }finally{face.dispose();}
        double factor=Math.max(.5,Math.min(1.85,Math.min(screenWidth/850.0,screenHeight/480.0)))*(1+.085*level);
        int w=(int)Math.round(W*factor),h=(int)Math.round(H*factor);
        Graphics2D g=(Graphics2D)graphics.create();
        try{
            g.translate(screenWidth-w-18,screenHeight-h+7);g.scale(w/(double)W,h/(double)H);
            var a=corners[0];var b=corners[1];var c=corners[2];
            g.transform(new java.awt.geom.AffineTransform((b[0]-a[0])/80,(b[1]-a[1])/80,
                (c[0]-a[0])/100,(c[1]-a[1])/100,a[0],a[1]));
            g.drawImage(lcd,0,0,null);
        }finally{g.dispose();}
    }
}
