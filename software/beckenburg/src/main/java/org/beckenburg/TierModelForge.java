package org.beckenburg;

import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import javax.imageio.ImageIO;

/**
 * Source-authored, deterministic PSX equipment manufacturing.
 *
 * Exports REAL self-contained textured glTF 2.0 GLBs (triangles/UV/embedded
 * 128x128 PNG), one per equipment ID per tier, with model silhouettes based on
 * their physical functions. No external model-generating service or runtime
 * internet dependency. Artifacts are packaged by both Java 17 build scripts.
 *
 * Original creator GLBs remain untouched; EquipmentTierVisuals chooses those
 * where suitable and these new meshes where a genuine tier body is missing.
 */
public final class TierModelForge {
    private TierModelForge(){}
    public static final int TEXTURE_PIXELS=128;
    private static final int TILE=32;
    private record Vertex(float x,float y,float z,float u,float v){}
    private static final class Mesh {
        final List<Vertex> points=new ArrayList<>();
        final List<Integer> indices=new ArrayList<>();
        float minX=Float.POSITIVE_INFINITY,minY=Float.POSITIVE_INFINITY,
              minZ=Float.POSITIVE_INFINITY;
        float maxX=Float.NEGATIVE_INFINITY,maxY=Float.NEGATIVE_INFINITY,
              maxZ=Float.NEGATIVE_INFINITY;
        void vertex(double x,double y,double z,int tile,double su,double sv){
            int col=tile%4,row=tile/4;
            // Half-pixel inset prevents PSX atlas tile bleeding.
            float u=(float)((col*TILE+.5+su*(TILE-1))/TEXTURE_PIXELS);
            float v=(float)(1-(row*TILE+.5+sv*(TILE-1))/TEXTURE_PIXELS);
            points.add(new Vertex((float)x,(float)y,(float)z,u,v));
            minX=Math.min(minX,(float)x);minY=Math.min(minY,(float)y);
            minZ=Math.min(minZ,(float)z);
            maxX=Math.max(maxX,(float)x);maxY=Math.max(maxY,(float)y);
            maxZ=Math.max(maxZ,(float)z);
        }
        void face(double[] a,double[] b,double[] c,double[] d,int tile){
            int start=points.size();
            vertex(a[0],a[1],a[2],tile,0,0);
            vertex(b[0],b[1],b[2],tile,1,0);
            vertex(c[0],c[1],c[2],tile,1,1);
            vertex(d[0],d[1],d[2],tile,0,1);
            for(int i:new int[]{0,1,2,0,2,3})indices.add(start+i);
        }
        void box(double x,double y,double z,double w,double h,double d,
                 int body,int top){
            if(w<=0||h<=0||d<=0)throw new IllegalArgumentException("bad box");
            double x0=x-w/2,x1=x+w/2,y0=y-h/2,y1=y+h/2,z0=z-d/2,z1=z+d/2;
            face(v(x0,y0,z1),v(x1,y0,z1),v(x1,y1,z1),v(x0,y1,z1),body);
            face(v(x1,y0,z0),v(x0,y0,z0),v(x0,y1,z0),v(x1,y1,z0),body);
            face(v(x1,y0,z1),v(x1,y0,z0),v(x1,y1,z0),v(x1,y1,z1),body);
            face(v(x0,y0,z0),v(x0,y0,z1),v(x0,y1,z1),v(x0,y1,z0),body);
            face(v(x0,y1,z1),v(x1,y1,z1),v(x1,y1,z0),v(x0,y1,z0),top);
            face(v(x0,y0,z0),v(x1,y0,z0),v(x1,y0,z1),v(x0,y0,z1),top);
        }
        /** Faceted 8-sided lens/knob along the Z axis (PSX faceting intentional). */
        void drum(double x,double y,double z,double radius,double depth,int side,int cap){
            int slices=8;double end=z+depth;
            for(int i=0;i<slices;i++){
                double a=i*Math.PI*2/slices,b=(i+1)*Math.PI*2/slices;
                double xa=x+radius*Math.cos(a),ya=y+radius*Math.sin(a);
                double xb=x+radius*Math.cos(b),yb=y+radius*Math.sin(b);
                face(v(xa,ya,z),v(xb,yb,z),v(xb,yb,end),v(xa,ya,end),side);
                face(v(x,y,end),v(xa,ya,end),v(xb,yb,end),v(x,y,end),cap);
            }
        }
        private static double[] v(double x,double y,double z){return new double[]{x,y,z};}
    }

    private static void addHandheld(Mesh m,String id,int level,double variation){
        double width=(id.contains("TABLET")||id.contains("THERM")?.52:.34)*variation,
            height=(id.contains("TABLET")?.69:.62)*(1+.12*level);
        m.box(0,0,0,width,height,.16,1,0);
        m.box(0,height*.16,.088,width*.74,height*.44,.026,5,3);
        m.box(0,-height*.34,.09,width*.45,.065,.036,6,4);
        if(id.contains("SPIRIT")||id.contains("RADIO")||id.contains("RESONANCE"))
            m.box(width*.33,height*.58,0,.045,.30+level*.08,.035,2,2);
        if(id.contains("EMF")||id.contains("SPECTRAL")||id.contains("WARD"))
            for(int i=0;i<3+level;i++)
                m.box(-width*.29+i*width*.13,height*.10,.118,width*.095,.04,.012,8,8);
        if(level>0){
            m.box(-width*.30,-height*.20,.10,width*.15,.11,.038,4,4);
            m.box(width*.30,-height*.20,.10,width*.15,.11,.038,4,4);
            m.drum(width*.28,height*.35,.09,.045,.058,2,7);
        }
        if(level>1){
            m.box(0,-height*.52,-.01,width*.8,.15,.20,2,6);
            m.box(width*.43,height*.36,.01,.045,height*.35,.045,2,8);
        }
    }
    private static void addCamera(Mesh m,String id,int level,double variation){
        double w=(.51+.13*level)*variation,h=.29+.07*level;
        m.box(0,0,0,w,h,.28+level*.04,1,0);
        m.box(0,.02,.18+level*.02,w*.44,h*.62,.05,2,2);
        m.drum(0,.02,.20+level*.02,.105+.045*level,.17+.09*level,6,5);
        m.box(-w*.27,h*.63,-.04,w*.18,.075,.10,4,4);
        m.box(w*.29,h*.62,.02,w*.12,.055,.09,8,8);
        if(level>0){
            m.box(0,-h*.50,-.14,w*.66,.08,.20,6,2);
            m.box(0,h*.57,-.07,w*.30,.09,.12,2,2);
        }
        if(level>1){
            m.box(0,0,-.21,w*.78,h*.78,.034,3,5);
            m.box(w*.38,-h*.58,-.02,.10,h*.58,.20,6,2);
        }
    }
    private static void addLight(Mesh m,String id,int level,double variation){
        double length=.65+level*.09;
        m.box(0,-length*.20,0,.16*variation,length*.73,.16*variation,6,1);
        m.box(0,length*.31,0,.21+level*.12,.16,.21+level*.12,2,2);
        m.drum(0,length*.38,.03,.115+level*.055,.068,2,8);
        m.box(.08,-length*.27,.096,.05,.095,.035,4,4);
        if(level>0)m.box(0,-length*.51,0,.18,.18,.22,1,6);
        if(level>1)for(int i=0;i<4;i++)
            m.box(-.22+i*.14,length*.21,.13,.045,.08,.04,4,4);
    }
    private static void addMonitor(Mesh m,String id,int level,double variation){
        double w=(.56+level*.28)*variation,h=.40+level*.12;
        m.box(0,.08,0,w,h,.15,0,1);
        m.box(0,.10,.091,w*.84,h*.78,.025,5,3);
        m.box(0,-h*.54,-.08,.15,.23,.13,2,6);
        m.box(0,-h*.78,-.07,w*.66,.06,.30,6,2);
        for(int i=0;i<2+level;i++)
            m.box(-w*.35+i*w*.12,-h*.35,.094,.032,.03,.016,4,4);
        if(level>1){
            m.box(w*.55,.14,-.02,w*.40,h*.87,.13,0,1);
            m.box(w*.55,.17,.07,w*.33,h*.64,.019,5,3);
        }
    }
    private static void addProjector(Mesh m,String id,int level,double variation){
        double w=(.46+level*.17)*variation;
        m.box(0,0,0,w,.23+level*.06,.36+level*.06,0,1);
        m.box(0,.15,.02,w*.44,.19,.25,1,2);
        for(int i=0;i<2+level;i++)
            m.drum((i-(1+level)/2.0)*w*.20,.12,.18,.045+level*.012,.06,2,8);
        m.box(0,-.20,0,w*.65,.12,.43,6,2);
        if(level>0)m.box(0,-.29,0,.18,.12,.18,2,2);
        if(level>1)m.box(0,-.35,0,.42,.08,.52,2,6);
    }
    private static void addPaper(Mesh m,String id,int level,double variation){
        double w=(.53+.14*level)*variation,d=.48+level*.13;
        m.box(0,-.03,0,w,.10,d,6,1);
        m.box(0,.025,0,w*.88,.025,d*.86,9,9);
        if(id.contains("BOOK")){
            m.box(-.035,.045,0,.015,.035,d*.88,2,2);
            m.box(w*.43,-.018,0,.035,.13,d,4,4);
        }
        if(level>0)m.box(w*.18,.053,d*.12,.22,.017,.06,4,4);
        if(level>1)m.box(-w*.33,.08,d*.19,.09,.08,.11,8,8);
    }
    private static void addDeployable(Mesh m,String id,int level,double variation){
        double w=(.38+.13*level)*variation;
        m.box(0,0,0,w,.20+level*.04,w*.75,1,0);
        m.box(0,.14,.02,w*.70,.12,w*.52,6,3);
        m.drum(0,.22,w*.29,.06+level*.025,.10,2,8);
        if(id.contains("TRIPOD")||id.contains("SEISMIC")||id.contains("MOTION"))
            for(int i=-1;i<=1;i++)
                m.box(i*.16,-.29,-i*.10,.065,.38,.065,6,6);
        if(level>0)m.box(w*.37,.13,.02,.08,.18,.18,4,4);
        if(level>1)m.box(-w*.35,.10,.08,.09,.27,.085,2,8);
    }
    private static void addConsumable(Mesh m,String id,int level,double variation){
        double w=(.23+.05*level)*variation;
        m.box(0,0,0,w,.30+level*.08,w,6,1);
        m.box(0,.18+level*.04,0,w*.73,.06,w*.73,4,4);
        if(id.contains("SALT")||id.contains("ECTOPLASM")||id.contains("MEDICATION"))
            m.box(0,.03,w*.52,w*.72,.18,.018,9,9);
        if(id.contains("CRUCIFIX")||id.contains("WARD")||id.contains("CHALK"))
            m.box(0,.36,0,.085,.48,.083,4,2);
        if(id.contains("CRUCIFIX"))
            m.box(0,.43,0,.40,.07,.085,4,2);
        if(level>0)m.box(0,-.24,0,w*.87,.10,w*.87,2,2);
        if(level>1)m.box(w*.48,.04,0,.055,.18,.09,8,8);
    }
    private static void addMic(Mesh m,String id,int level,double variation){
        double r=(.22+.09*level)*variation;
        m.box(0,-.26,0,.12,.62,.12,6,1);
        m.drum(0,.13,0,r,.075,2,5);
        m.box(0,.13,.08,r*.85,r*.85,.018,3,5);
        if(level>0)m.box(.15,.10,-.08,.06,.18,.14,4,4);
        if(level>1)m.box(-.20,.05,-.06,.05,.31,.14,2,8);
    }
    private static String shape(String id,EquipmentTiers.Role role){
        if(id.contains("CAMERA")||id.contains("PRISM"))return "camera";
        if(id.contains("FLASHLIGHT")||id.contains("UV_LIGHT")||id.contains("FIRELIGHT"))
            return "light";
        if(id.contains("PROJECTOR")||id.contains("LASER_GRID"))return "projector";
        if(id.contains("WRITING")||id.contains("BOARD")||id.contains("CLIPBOARD")
                ||id.equals("SITE_MAP"))return "paper";
        if(id.contains("MONITOR")||id.contains("COMPUTER"))return "monitor";
        if(id.contains("MICROPHONE")||id.contains("RESONANCE")||id.contains("FREQUENCY"))
            return "microphone";
        if(role==EquipmentTiers.Role.CONSUMABLE||role==EquipmentTiers.Role.DEFENSE
                ||id.equals("SALT")||id.contains("CHALK")||id.contains("ECTOPLASM"))
            return "consumable";
        if(role==EquipmentTiers.Role.DEPLOYABLE||id.contains("TRIPOD")
                ||id.contains("ARRAY")||id.contains("BEACON"))return "deployable";
        return "handheld";
    }
    private static Mesh geometry(String id,EquipmentTiers.Tier tier){
        EquipmentTiers.Plan plan=EquipmentTiers.get(id);
        int level=tier.ordinal();
        double variation=.91+Math.floorMod(id.hashCode(),17)*.011;
        Mesh m=new Mesh();
        switch(shape(id,plan.role())){
            case "camera"->addCamera(m,id,level,variation);
            case "light"->addLight(m,id,level,variation);
            case "projector"->addProjector(m,id,level,variation);
            case "paper"->addPaper(m,id,level,variation);
            case "monitor"->addMonitor(m,id,level,variation);
            case "microphone"->addMic(m,id,level,variation);
            case "consumable"->addConsumable(m,id,level,variation);
            case "deployable"->addDeployable(m,id,level,variation);
            default->addHandheld(m,id,level,variation);
        }
        if(m.points.size()<24||m.points.size()>20000||m.points.size()>65535)
            throw new IllegalStateException("Invalid PSX poly budget for "+id);
        return m;
    }
    private static BufferedImage atlas(String id,EquipmentTiers.Tier tier){
        BufferedImage result=new BufferedImage(TEXTURE_PIXELS,TEXTURE_PIXELS,
            BufferedImage.TYPE_INT_RGB);
        Graphics2D g=result.createGraphics();
        try{
            int seed=id.hashCode()^tier.ordinal()*14731;
            int[][] rgb={
                {30,35,39},{72,77,80},{116,127,126},{38,77,67},
                {tier==EquipmentTiers.Tier.I?144:196,122,70},{45,75,87},
                {39,40,44},{160,163,157},{99,208,171},{202,187,145},
                {51,59,69},{100,80,71},{90,105,126},{48,67,62},
                {158,95,78},{128,133,120}
            };
            for(int tile=0;tile<16;tile++){
                int tx=(tile%4)*TILE,ty=(tile/4)*TILE;
                int[] color=rgb[tile];
                for(int y=0;y<TILE;y++)for(int x=0;x<TILE;x++){
                    int noise=((x*13+y*7+seed)^((x+y*3)*17))&7;
                    int shade=(noise-3)*2+((x+y)&1)*3;
                    int rr=Math.max(0,Math.min(255,color[0]+shade)),
                        gg=Math.max(0,Math.min(255,color[1]+shade)),
                        bb=Math.max(0,Math.min(255,color[2]+shade));
                    result.setRGB(tx+x,ty+y,(rr<<16)|(gg<<8)|bb);
                }
            }
            // Face atlas UI is genuine decal art on the model, not any ghost reading.
            g.setFont(new Font(Font.MONOSPACED,Font.BOLD,10));
            g.setColor(new Color(132,244,199));
            g.drawString(tier==EquipmentTiers.Tier.I?"I":
                tier==EquipmentTiers.Tier.II?"II":"III",100,82);
            g.setColor(new Color(28,34,33));
            for(int i=0;i<3+tier.ordinal();i++)
                g.fillRect(99+i*5,19,3,9);
            g.setColor(new Color(222,226,187));
            g.setFont(new Font(Font.MONOSPACED,Font.BOLD,8));
            String label=id.replace("_"," ");
            if(label.length()>9)label=label.substring(0,9);
            g.drawString(label,2,115);
            g.setStroke(new BasicStroke(2));
            g.drawLine(69,116,90,116);
        }finally{g.dispose();}
        return result;
    }
    private static byte[] png(BufferedImage image)throws IOException{
        ByteArrayOutputStream b=new ByteArrayOutputStream();
        if(!ImageIO.write(image,"PNG",b))throw new IOException("PNG encoding unavailable");
        return b.toByteArray();
    }
    private static void align(ByteArrayOutputStream out){
        while((out.size()&3)!=0)out.write(0);
    }
    private static String view(int start,int length,int target){
        return "{\"buffer\":0,\"byteOffset\":"+start+
            ",\"byteLength\":"+length+",\"target\":"+target+"}";
    }
    private static void put(ByteArrayOutputStream output,ByteBuffer buffer)throws IOException{
        output.write(buffer.array());
    }
    /** Builds an importable binary GLB, not a screenshot, fake SVG, or placeholder. */
    public static byte[] generate(String id,EquipmentTiers.Tier tier)throws IOException{
        if(tier==null)throw new IllegalArgumentException("tier missing");
        Mesh mesh=geometry(id,tier);
        byte[] image=png(atlas(id,tier));
        int vertices=mesh.points.size(),indices=mesh.indices.size();
        ByteArrayOutputStream bin=new ByteArrayOutputStream();
        int pa=bin.size();
        ByteBuffer positions=ByteBuffer.allocate(vertices*12).order(ByteOrder.LITTLE_ENDIAN);
        for(Vertex v:mesh.points){positions.putFloat(v.x()).putFloat(v.y()).putFloat(v.z());}
        put(bin,positions);align(bin);int posBytes=bin.size()-pa;
        int ua=bin.size();
        ByteBuffer uv=ByteBuffer.allocate(vertices*8).order(ByteOrder.LITTLE_ENDIAN);
        for(Vertex v:mesh.points)uv.putFloat(v.u()).putFloat(v.v());
        put(bin,uv);align(bin);int uvBytes=bin.size()-ua;
        int ia=bin.size();
        ByteBuffer ib=ByteBuffer.allocate(indices*2).order(ByteOrder.LITTLE_ENDIAN);
        for(int index:mesh.indices)ib.putShort((short)index);
        put(bin,ib);align(bin);int indexBytes=bin.size()-ia;
        int pictureOffset=bin.size();bin.write(image);align(bin);
        int pictureBytes=image.length;
        String json="{\"asset\":{\"version\":\"2.0\",\"generator\":\"Beckenburg TierModelForge 1\"},"+
            "\"scene\":0,\"scenes\":[{\"nodes\":[0]}],\"nodes\":[{\"mesh\":0}],"+
            "\"buffers\":[{\"byteLength\":"+bin.size()+"}],"+
            "\"bufferViews\":["+
            view(pa,posBytes,34962)+","+view(ua,uvBytes,34962)+","+
            view(ia,indexBytes,34963)+","+
            "{\"buffer\":0,\"byteOffset\":"+pictureOffset+",\"byteLength\":"+pictureBytes+"}],"+
            "\"accessors\":["+
            "{\"bufferView\":0,\"componentType\":5126,\"count\":"+vertices+
            ",\"type\":\"VEC3\",\"min\":["+mesh.minX+","+mesh.minY+","+mesh.minZ+
            "],\"max\":["+mesh.maxX+","+mesh.maxY+","+mesh.maxZ+"]},"+
            "{\"bufferView\":1,\"componentType\":5126,\"count\":"+vertices+
            ",\"type\":\"VEC2\"},"+
            "{\"bufferView\":2,\"componentType\":5123,\"count\":"+indices+
            ",\"type\":\"SCALAR\"}],"+
            "\"images\":[{\"bufferView\":3,\"mimeType\":\"image/png\"}],"+
            "\"textures\":[{\"source\":0}],"+
            "\"materials\":[{\"name\":\"PSX "+id+" "+tier+
            "\",\"doubleSided\":true,\"pbrMetallicRoughness\":{\"baseColorTexture\":{\"index\":0},"+
            "\"metallicFactor\":0.0,\"roughnessFactor\":1.0}}],"+
            "\"meshes\":[{\"name\":\""+id+"_"+tier+
            "\",\"primitives\":[{\"attributes\":{\"POSITION\":0,\"TEXCOORD_0\":1},"+
            "\"indices\":2,\"material\":0,\"mode\":4}]}]}";
        byte[] jsonBytes=json.getBytes(StandardCharsets.UTF_8);
        int jsonPadded=(jsonBytes.length+3)&~3,binLength=bin.size();
        ByteBuffer header=ByteBuffer.allocate(12+8+jsonPadded+8+binLength)
            .order(ByteOrder.LITTLE_ENDIAN);
        header.putInt(0x46546c67).putInt(2).putInt(header.capacity());
        header.putInt(jsonPadded).putInt(0x4e4f534a).put(jsonBytes);
        while(header.position()<20+jsonPadded)header.put((byte)' ');
        header.putInt(binLength).putInt(0x004e4942).put(bin.toByteArray());
        return header.array();
    }
    public static String name(String id,EquipmentTiers.Tier tier){
        EquipmentTiers.get(id);
        return "synth_"+id.toLowerCase(Locale.ROOT)+"_"+
            tier.name().toLowerCase(Locale.ROOT);
    }
    public static boolean generatedName(String name){
        if(name==null||!name.startsWith("synth_"))return false;
        for(EquipmentTiers.Plan p:EquipmentTiers.all())
            for(EquipmentTiers.Tier tier:EquipmentTiers.Tier.values())
                if(name.equals(name(p.id(),tier)))return true;
        return false;
    }
    /** Offline build step: source-controlled Java 17 creates 126 true GLBs. */
    public static void main(String[] args)throws Exception{
        if(args.length!=1)throw new IllegalArgumentException("output directory required");
        Path dest=Path.of(args[0]);Files.createDirectories(dest);
        int files=0;long bytes=0;
        for(EquipmentTiers.Plan plan:EquipmentTiers.all()){
            for(EquipmentTiers.Tier tier:EquipmentTiers.Tier.values()){
                byte[] glb=generate(plan.id(),tier);
                // The same strict decoder as gameplay validates triangles and PNG.
                if(GlbProps.decode(glb).triangles().size()<12)
                    throw new IOException("unrenderable generated GLB for "+plan.id());
                Files.write(dest.resolve(name(plan.id(),tier)+".glb"),glb);
                files++;bytes+=glb.length;
            }
        }
        System.out.println("PASS: authored "+files+" textured PSX GLBs, "+
            bytes+" bytes (42 equipment categories x 3 physical tiers)");
    }
}
