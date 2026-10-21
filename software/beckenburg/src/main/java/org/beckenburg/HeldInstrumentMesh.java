package org.beckenburg;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.awt.image.DataBufferInt;
import java.util.*;
import java.util.List;
/** Original textured held meshes. Rigid poses preserve handedness; live pixels are
 * depth-tested on authored LCD faces rather than painted over the HUD. */
public final class HeldInstrumentMesh {
    private HeldInstrumentMesh(){}
    private static final int W=240,H=250;
    private static final Map<String,BufferedImage> cache=new HashMap<>();
    private record Live(String status,BufferedImage image){}
    private static final Map<String,Live> live=new HashMap<>();
    public static String source(String kind,EquipmentTiers.Tier tier){
        if(kind==null||tier==null)return null;
        try{return EquipmentTierVisuals.prefab(kind.equals("EMF")?"EMF_READER":kind,tier).modelName();}
        catch(IllegalArgumentException unknown){return null;}
    }
    public static synchronized BufferedImage image(String kind,EquipmentTiers.Tier tier){
        String name=source(kind,tier);if(name==null)throw new IllegalArgumentException("No physical instrument mesh for "+kind);
        return cache.computeIfAbsent(name,n->raster(n,null));
    }
    public static synchronized BufferedImage image(String kind,EquipmentTiers.Tier tier,String status){
        String name=source(kind,tier);if(status==null||status.isBlank())return image(kind,tier);
        var old=live.get(name);if(old==null||!old.status.equals(status)){old=new Live(status,raster(name,status));live.put(name,old);}return old.image;
    }
    public static void draw(Graphics2D g,int width,int height,String kind,EquipmentTiers.Tier tier){draw(g,width,height,kind,tier,null);}
    public static void draw(Graphics2D g,int width,int height,String kind,EquipmentTiers.Tier tier,String status){
        if(width<180||height<140)return;
        double factor=Math.max(.5,Math.min(1.85,Math.min(width/850.0,height/480.0)));
        int w=(int)Math.round(W*factor),h=(int)Math.round(H*factor);
        // Leave the bottom equipment strip clear, keeping controls and LCD visible.
        g.drawImage(image(kind,tier,status),width-w-18,height-h-83,w,h,null);
    }
    /** Model-facing convention: +Z is the control face on authored upright meters.
     * Optical emitters/camera lenses point away from the operator, into the scene.
     * The original K2 meter lies along source Z; rotate about X to stand up.
     */
    public static GlbProps.Vertex pose(String name,GlbProps.Vertex p){
        double x=p.x(),y=p.y(),z=p.z();
        if(name.equals("exploration_emf_detector")){double t=y;y=-z;z=t;}

        if(name.equals("exploration_thermometer")){x=-x;z=-z;}
        if(name.equals("blender_thermometer_3")){double t=x;x=-z;z=t;}
        if(name.contains("photo_camera")||name.contains("video_camera")||(name.contains("flashlight")&&!name.equals("exploration_flashlight"))||name.contains("uv_light")){x=-x;z=-z;}
        return new GlbProps.Vertex(x,y,z,p.u(),p.v());
    }
    private static boolean digital(int material){String n=GlbProps.materialName(material).toLowerCase(Locale.ROOT);return n.equals("pixel screen")||n.equals("screen")||n.startsWith("display ")||n.contains("temperature lcd");}
    private static BufferedImage display(String name,String status){
        var out=new BufferedImage(144,112,BufferedImage.TYPE_INT_RGB);var g=out.createGraphics();
        try{g.setColor(new Color(7,23,20));g.fillRect(0,0,144,112);g.setColor(new Color(144,223,175));g.setFont(new Font(Font.MONOSPACED,Font.BOLD,24));
            String text=status==null?"READY / R USE":status.replace("Air ","").replace("REC ","REC\n").replace(" / PEAK ","\nPK ").replace(" / ","\n").replace("; ","\n");
            if(name.contains("sound_recorder"))text=text.replace(" / PEAK ","\nPK ").replace(" / ","\n").replace(" clips"," CLP");
            int y=26;for(String line:text.split("\\n")){for(int i=0;i<line.length()&&y<110;i+=9){g.drawString(line.substring(i,Math.min(i+9,line.length())),5,y);y+=29;}}
        }finally{g.dispose();}return out;
    }
    private record Panel(double x0,double y0,double x1,double y1,int up){}
    private static BufferedImage raster(String name,String status){
        var triangles=GlbProps.model(name).triangles();
        var panels=new HashMap<Integer,Panel>();
        for(var t:triangles)if(digital(t.material())){
            Panel b=panels.get(t.material());for(var p:List.of(t.a(),t.b(),t.c())){
                if(b==null)b=new Panel(p.x(),p.y(),p.x(),p.y(),1);else b=new Panel(Math.min(b.x0,p.x()),Math.min(b.y0,p.y()),Math.max(b.x1,p.x()),Math.max(b.y1,p.y()),1);
            }panels.put(t.material(),b);
        }
        int emf=-1;if(status!=null){var match=java.util.regex.Pattern.compile("EMF (\\d{1,2})/10").matcher(status);if(match.find())emf=Integer.parseInt(match.group(1));}
        var lcd=display(name,status);var out=new BufferedImage(W,H,BufferedImage.TYPE_INT_ARGB);
        int[] pixels=((DataBufferInt)out.getRaster().getDataBuffer()).getData();double[] zBuffer=new double[W*H];Arrays.fill(zBuffer,Double.NEGATIVE_INFINITY);
        double[] low={Double.POSITIVE_INFINITY,Double.POSITIVE_INFINITY,Double.POSITIVE_INFINITY},high={-Double.MAX_VALUE,-Double.MAX_VALUE,-Double.MAX_VALUE};
        for(var t:triangles)for(var source:List.of(t.a(),t.b(),t.c())){var p=pose(name,source);double[] v={p.x(),p.y(),p.z()};for(int n=0;n<3;n++){low[n]=Math.min(low[n],v[n]);high[n]=Math.max(high[n],v[n]);}}
        double span=Math.max(.04,Math.max(high[0]-low[0],Math.max(high[1]-low[1],high[2]-low[2]))),scale=192/span,cx=(low[0]+high[0])/2,cy=(low[1]+high[1])/2,cz=(low[2]+high[2])/2;
        for(var t:triangles){
            var original=new GlbProps.Vertex[]{t.a(),t.b(),t.c()};double[] sx=new double[3],sy=new double[3],depth=new double[3];
            for(int i=0;i<3;i++){var p=pose(name,original[i]);double x=p.x()-cx,y=p.y()-cy,z=p.z()-cz;
                sx[i]=W*.5+(x*.94-z*.30)*scale;sy[i]=H*.51-(y*.98-z*.18+x*.04)*scale;depth[i]=z*.92+y*.18+x*.30;
            }
            double denom=(sy[1]-sy[2])*(sx[0]-sx[2])+(sx[2]-sx[1])*(sy[0]-sy[2]);if(Math.abs(denom)<1e-10)continue;
            int xmin=Math.max(0,(int)Math.floor(Math.min(sx[0],Math.min(sx[1],sx[2])))),xmax=Math.min(W-1,(int)Math.ceil(Math.max(sx[0],Math.max(sx[1],sx[2]))));
            int ymin=Math.max(0,(int)Math.floor(Math.min(sy[0],Math.min(sy[1],sy[2])))),ymax=Math.min(H-1,(int)Math.ceil(Math.max(sy[0],Math.max(sy[1],sy[2]))));
            for(int py=ymin;py<=ymax;py++)for(int px=xmin;px<=xmax;px++){
                double a=((sy[1]-sy[2])*(px+.5-sx[2])+(sx[2]-sx[1])*(py+.5-sy[2]))/denom,b=((sy[2]-sy[0])*(px+.5-sx[2])+(sx[0]-sx[2])*(py+.5-sy[2]))/denom,c=1-a-b;
                if(a<0||b<0||c<0)continue;double z=a*depth[0]+b*depth[1]+c*depth[2];int index=py*W+px;if(z<=zBuffer[index])continue;
                double u=a*original[0].u()+b*original[1].u()+c*original[2].u(),v=a*original[0].v()+b*original[1].v()+c*original[2].v();int rgb=GlbProps.sample(t.material(),u,1-v); // glTF image V begins at its top; compensate the legacy sampler here.
                var panel=panels.get(t.material());
                if(panel!=null&&panel.x1-panel.x0>.002&&panel.y1-panel.y0>.002){double x=a*original[0].x()+b*original[1].x()+c*original[2].x(),y=a*original[0].y()+b*original[1].y()+c*original[2].y();
                    int lx=(int)((x-panel.x0)/(panel.x1-panel.x0)*143),ly=(int)((panel.y1-y)/(panel.y1-panel.y0)*111);rgb=lcd.getRGB(Math.max(0,Math.min(143,lx)),Math.max(0,Math.min(111,ly)));
                }
                double originalX=a*t.a().x()+b*t.b().x()+c*t.c().x(),originalY=a*t.a().y()+b*t.b().y()+c*t.c().y(),originalZ=a*t.a().z()+b*t.b().z()+c*t.c().z();
                // Measured screen rectangles on the source single-atlas thermometer shells.
                if(name.equals("exploration_thermometer")&&originalZ<-.068&&Math.abs(originalX)<.015&&originalY>.064&&originalY<.091){
                    int lx=(int)((.015-originalX)/.030*143),ly=(int)((.091-originalY)/.027*111);rgb=lcd.getRGB(Math.max(0,Math.min(143,lx)),Math.max(0,Math.min(111,ly)));
                }
                if(name.equals("blender_thermometer_3")&&originalX>.015&&originalX<.038&&Math.abs(originalZ)<.031&&originalY>.145&&originalY<.185){
                    int lx=(int)((.031-originalZ)/.062*143),ly=(int)((.185-originalY)/.040*111);rgb=lcd.getRGB(Math.max(0,Math.min(143,lx)),Math.max(0,Math.min(111,ly)));
                }
                if(emf>=0&&name.equals("exploration_emf_detector")&&originalY>.006&&originalZ<-.095){
                    int led=Math.max(0,Math.min(4,(int)((originalX+.042)/.0168)));int[] colors={0x70c66c,0xa4c65d,0xd1c953,0xd88c45,0xcc4a40};
                    double centre=-.0336+led*.0168;
                    if(Math.hypot(originalX-centre,originalZ+.107)<.0055){int color=colors[led];double f=emf>led*2?.95:.17;rgb=((int)(((color>>16)&255)*f)<<16)|((int)(((color>>8)&255)*f)<<8)|(int)((color&255)*f);}
                }
                if(emf>=0&&(name.equals("blender_emf_reader_2")||name.equals("blender_emf_reader_3"))&&originalZ>.01){
                    boolean meter2=name.endsWith("_2");double pivotY=meter2?.145:.064,length=meter2?.023:.017;
                    double angle=Math.toRadians(150-12*emf),dx=Math.cos(angle)*length,dy=Math.sin(angle)*length;
                    double fraction=Math.max(0,Math.min(1,((originalX)*dx+(originalY-pivotY)*dy)/(length*length)));
                    if(Math.hypot(originalX-fraction*dx,originalY-pivotY-fraction*dy)<.0009)rgb=0xb54734;
                }
                // The recorder's single atlas includes its real LCD. Replace only that measured face region.
                if(name.startsWith("blender_sound_recorder_")){
                    int tier=Integer.parseInt(name.substring(name.length()-1)),level=tier-1;double half=(.095+.014*level)*.72/2,top=.025+(.058+.012*tier)/2,bottom=.025-(.058+.012*tier)/2;
                    double x=a*t.a().x()+b*t.b().x()+c*t.c().x(),y=a*t.a().y()+b*t.b().y()+c*t.c().y(),zz=a*t.a().z()+b*t.b().z()+c*t.c().z();
                    if(Math.abs(x)<=half&&y>=bottom&&y<=top&&zz>=(.035+.006*level)/2+.004){int lx=(int)((x+half)/(2*half)*143),ly=(int)((top-y)/(top-bottom)*111);rgb=lcd.getRGB(Math.max(0,Math.min(143,lx)),Math.max(0,Math.min(111,ly)));}
                }
                pixels[index]=0xff000000|rgb;zBuffer[index]=z;
            }
        }
        return out;
    }
    /** Retained API; the LCD is now rastered with the mesh and its depth buffer. */
    public static void drawRecorderDisplay(Graphics2D g,int w,int h,EquipmentTiers.Tier tier,String status){draw(g,w,h,"SOUND_RECORDER",tier,status);}
}
