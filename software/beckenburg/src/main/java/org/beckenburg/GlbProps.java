package org.beckenburg;

import java.awt.image.BufferedImage;
import java.awt.Graphics2D;
import java.awt.Color;
import java.awt.Font;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.imageio.ImageIO;

/** Bounded glTF 2.0 binary mesh/PNG reader for the licensed Beckenburg PSX scene props.
 * Actual source positions, index buffers, UVs and textures reach SceneRenderer's
 * existing perspective-correct, depth-tested triangle rasterizer.
 */
public final class GlbProps {
    private GlbProps() { }
    public static final int TEXTURE_BASE=256;
    private static final String[] NAMES={
        "blender_sound_recorder_1","blender_sound_recorder_2","blender_sound_recorder_3",
        "light_switch_1","ceiling_lamp_1_off","door_1_loose","shelf_mp_6",
        "chair_mp_5","ceiling_lamp_1_on","cross_mp_2","flashlight_mp_1",
        "kenney_medieval_wall_fortified","kenney_medieval_wall_fortified_window","kenney_medieval_wall_fortified_gate","kenney_medieval_wall_pane_wood_window","kenney_medieval_tower","kenney_medieval_tower_top","kenney_medieval_tower_base","kenney_medieval_battlement","kenney_medieval_battlement_corner_outer","kenney_medieval_column","kenney_medieval_column_damaged","kenney_medieval_structure_wall","kenney_medieval_stairs_stone","kenney_medieval_detail_crate","kenney_medieval_detail_barrel",
        "armchair_1","sofa_1","dinner_table_1","wardrobe_mp_1",
        "display_cabinet_mp_2","tv_mp_1","tv_table_1_4",
        "lamp_3_on","lamp_3_off","ceiling_lamp_4_on","ceiling_lamp_4_off",
        "pc_keyboard_mp_1",
        "vape_mp_1","dosimeter_1","dosimeter_2","walkie_talkie_2",
        "handheld_tablet_1","monitoring_screen_mp_1","pc_mp_1",
        "blender_site_map_fixed","blender_objective_board_fixed","blender_clipboards_fixed",
        "button_12","book_mp_1","open_book_mp_1","dosimeter_4","walkie_talkie_1",
        "exploration_emf_detector","exploration_flashlight","exploration_flashlight_poquet","exploration_photo_camera","exploration_spirit_box","exploration_thermal_camera","exploration_thermometer","exploration_voice_recorder","ggbot_car08_van_shell","ggbot_car01","ggbot_car05","ggbot_car07","kenney_road_asphalt_straight","kenney_road_asphalt_side","kenney_road_asphalt_damaged","kenney_detail_light_single","kenney_detail_dumpster_closed","kenney_detail_bench","kenney_detail_barrier_type_a"
    };
    public record Vertex(double x,double y,double z,double u,double v) { }
    public record Triangle(Vertex a,Vertex b,Vertex c,int material) { }
    public record Model(List<Triangle> triangles) { }
    private static final Map<String,Model> cache=new HashMap<>();
    private static final List<BufferedImage> textures=new ArrayList<>();
    private static final List<double[]> diffuseFactors=new ArrayList<>();
    private static int vanCrtMaterial=-1;
    private static BufferedImage vanCrtImage=blankCrt();
    private static BufferedImage blankCrt(){
        BufferedImage image=new BufferedImage(256,256,BufferedImage.TYPE_INT_RGB);
        Graphics2D g=image.createGraphics();
        g.setColor(new Color(7,17,22));g.fillRect(0,0,256,256);
        g.setColor(new Color(119,211,174));
        g.setFont(new Font(Font.MONOSPACED,Font.BOLD,17));
        g.drawString("BECKENBURG",20,48);
        g.drawString("VAN TELEMETRY",20,78);
        g.dispose();return image;
    }
    /** Changes only the owner's CRT screen material, never its real GLB casing. */
    public static synchronized void updateVanCrt(VanTelemetry.Display telemetry){
        if(telemetry==null)return;
        BufferedImage image=blankCrt();
        Graphics2D g=image.createGraphics();
        try{
            g.setColor(new Color(7,17,22));g.fillRect(0,0,256,256);
            g.setColor(new Color(142,229,183));
            g.setFont(new Font(Font.MONOSPACED,Font.BOLD,17));
            g.drawString("FIELD TELEMETRY",15,27);
            g.setFont(new Font(Font.MONOSPACED,Font.PLAIN,15));
            g.drawString("ACTIVITY "+telemetry.activity()+"/10",15,55);
            int[] people=telemetry.sanity();
            for(int i=0;i<Math.min(6,people.length);i++){
                int number=people[i];
                g.setColor(number<0?new Color(87,119,119):
                    number<30?new Color(245,148,126):new Color(144,224,188));
                g.drawString("H"+(i+1)+" "+(number<0?"OFFLINE":number+"% SAN"),15,80+i*25);
            }
            g.setColor(new Color(83,135,122));
            g.drawString("TICK "+telemetry.tick(),15,244);
        }finally{g.dispose();}
        vanCrtImage=image;
    }

    public static synchronized Model model(String name){
        if(!Arrays.asList(NAMES).contains(name) && !EquipmentModelCatalog.approved(name)
                && !TierModelForge.generatedName(name))
            throw new IllegalArgumentException("Unapproved model "+name);
        Model m=cache.get(name);
        if(m!=null)return m;
        String resource="/org/beckenburg/models/"+name+".glb";
        try(InputStream in=GlbProps.class.getResourceAsStream(resource)){
            if(in==null)throw new IOException("Missing packaged licensed mesh "+resource);
            byte[] bytes=in.readNBytes(4_000_001);
            if(bytes.length>4_000_000)throw new IOException("GLB resource over budget");
            m=decode(bytes,name);
            cache.put(name,m);
            return m;
        }catch(IOException failure){throw new IllegalStateException("Model unavailable: "+name,failure);}
    }
    /** Model triangle list is immutable and cannot mutate runtime source geometry. */
    public static synchronized int sample(int material,double u,double v){
        int index=material-TEXTURE_BASE;
        if(index<0||index>=textures.size()||!Double.isFinite(u)||!Double.isFinite(v))
            throw new IllegalArgumentException("Invalid imported texture");
        BufferedImage image=material==vanCrtMaterial?vanCrtImage:textures.get(index);
        int x=Math.min(image.getWidth()-1,(int)((u-Math.floor(u))*image.getWidth()));
        // glTF UV V=0 originates at the bottom of a PNG image.
        int y=Math.min(image.getHeight()-1,
            (int)((1.0-(v-Math.floor(v)))*image.getHeight()));
        int rgb=image.getRGB(x,y)&0xffffff;
        // GLB material baseColorFactor is part of the original material.
        // Previously ignored, washing out the 128px van shell's deliberate
        // graphite-gray diffuse factor and misrepresenting its authored paint.
        double[] factor=diffuseFactors.get(index);
        int red=Math.max(0,Math.min(255,(int)Math.round(((rgb>>16)&255)*factor[0])));
        int green=Math.max(0,Math.min(255,(int)Math.round(((rgb>>8)&255)*factor[1])));
        int blue=Math.max(0,Math.min(255,(int)Math.round((rgb&255)*factor[2])));
        return (red<<16)|(green<<8)|blue;
    }
    @SuppressWarnings("unchecked")
    private static Map<String,Object> obj(Object value){return (Map<String,Object>)value;}
    @SuppressWarnings("unchecked")
    private static List<Object> arr(Object value){return (List<Object>)value;}
    private static double num(Object value){return ((Number)value).doubleValue();}
    private static int integer(Object value){return ((Number)value).intValue();}
    private static int get(Map<String,Object> m,String field,int d){
        Object v=m.get(field);return v==null?d:integer(v);
    }
    private static double[] vec(Object value,double... fallback){
        if(value==null)return fallback;
        List<Object> a=arr(value);
        if(a.size()!=fallback.length)throw new IllegalArgumentException("glTF vector length");
        double[] v=new double[a.size()];
        for(int i=0;i<v.length;i++)v[i]=num(a.get(i));
        return v;
    }
    public static synchronized Model decode(byte[] bytes)throws IOException{
        return decode(bytes,null);
    }
    private static synchronized Model decode(byte[] bytes,String resourceName)throws IOException{
        if(bytes.length<28||bytes.length>4_000_000)throw new IOException("GLB size");
        ByteBuffer bb=ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN);
        if(bb.getInt(0)!=0x46546c67||bb.getInt(4)!=2||bb.getInt(8)!=bytes.length)
            throw new IOException("Not glTF 2.0 binary");
        int jsonLength=bb.getInt(12);
        if(jsonLength<=0||jsonLength>bytes.length-28||
           bb.getInt(16)!=0x4e4f534a)throw new IOException("Invalid glTF JSON chunk");
        int binStart=20+jsonLength;
        if(binStart+8>bytes.length||bb.getInt(binStart+4)!=0x004e4942)
            throw new IOException("Missing binary buffer");
        int binLength=bb.getInt(binStart);
        if(binLength<0||(long)binStart+8+binLength>bytes.length)
            throw new IOException("Out of bounds GLB binary");
        binStart+=8;
        Object parsed=new Json(new String(bytes,20,jsonLength,StandardCharsets.UTF_8).trim()).read();
        Map<String,Object> root=obj(parsed);
        if(!"2.0".equals(obj(root.get("asset")).get("version"))||
            root.containsKey("extensionsRequired"))
            throw new IOException("Unsupported glTF asset or required extension");
        List<Object> views=arr(root.get("bufferViews")),accessors=arr(root.get("accessors"));
        List<Object> images=arr(root.get("images")),materials=arr(root.get("materials"));
        List<Object> glTextures=arr(root.get("textures")),nodes=arr(root.get("nodes"));
        List<Object> meshes=arr(root.get("meshes"));
        if(views.size()>4096||accessors.size()>4096||nodes.size()>128||
            meshes.size()>128||images.size()>64)throw new IOException("GLB budget exceeded");
        int[] materialIds=new int[materials.size()];
        for(int i=0;i<materials.size();i++){
            Map<String,Object> pbr=obj(obj(materials.get(i)).get("pbrMetallicRoughness"));
            Object base=pbr.get("baseColorTexture");
            if(base==null)throw new IOException("Material has no original texture");
            int textureIndex=integer(obj(base).get("index"));
            int imageIndex=integer(obj(glTextures.get(textureIndex)).get("source"));
            Map<String,Object> image=obj(images.get(imageIndex));
            if(!"image/png".equals(image.get("mimeType"))||
                image.get("bufferView")==null)throw new IOException("Unsupported embedded image");
            Map<String,Object> view=obj(views.get(integer(image.get("bufferView"))));
            int start=binStart+get(view,"byteOffset",0),length=get(view,"byteLength",-1);
            if(length<16||start<binStart||(long)start+length>binStart+binLength)
                throw new IOException("Bad image view");
            BufferedImage picture=ImageIO.read(new ByteArrayInputStream(bytes,start,length));
            if(picture==null||picture.getWidth()<2||picture.getHeight()<2||
                picture.getWidth()>2048||picture.getHeight()>2048)
                throw new IOException("Invalid embedded PNG");
            materialIds[i]=TEXTURE_BASE+textures.size();
            textures.add(picture);
            double[] color=vec(pbr.get("baseColorFactor"),1,1,1,1);
            diffuseFactors.add(color);
            // The owner's CRT screen uses a distinct original material/UV
            // region; replace only that surface at runtime with real van data.
            if("monitoring_screen_mp_1".equals(resourceName)
                    &&"crt_screen_mp_2".equals(obj(materials.get(i)).get("name")))
                vanCrtMaterial=materialIds[i];
        }
        List<Triangle> result=new ArrayList<>();
        double[][] nodeWorld=sceneTransforms(root,nodes);
        for(int nodeIndex=0;nodeIndex<nodes.size();nodeIndex++){
            Map<String,Object> node=obj(nodes.get(nodeIndex));
            if(!node.containsKey("mesh")||nodeWorld[nodeIndex]==null)continue;
            double[] world=nodeWorld[nodeIndex];
            List<Object> prims=arr(obj(meshes.get(integer(node.get("mesh")))).get("primitives"));
            for(Object pr:prims){
                Map<String,Object> primitive=obj(pr);
                if(get(primitive,"mode",4)!=4||!primitive.containsKey("indices"))
                    throw new IOException("Only indexed GL triangles supported");
                Map<String,Object> attrib=obj(primitive.get("attributes"));
                int pa=integer(attrib.get("POSITION")),ta=integer(attrib.get("TEXCOORD_0"));
                int ia=integer(primitive.get("indices"));
                Map<String,Object> pos=obj(accessors.get(pa)),uv=obj(accessors.get(ta)),
                    indices=obj(accessors.get(ia));
                int count=get(pos,"count",-1),ic=get(indices,"count",-1);
                if(count<3||count>50000||get(uv,"count",-1)!=count||
                    ic<3||ic>150000||ic%3!=0)throw new IOException("Triangle buffer budget");
                if(get(pos,"componentType",-1)!=5126||get(uv,"componentType",-1)!=5126||
                    !"VEC3".equals(pos.get("type"))||!"VEC2".equals(uv.get("type")))
                    throw new IOException("Unsupported vertex layout");
                int m=get(primitive,"material",-1);
                if(m<0||m>=materialIds.length)throw new IOException("Invalid material binding");
                Vertex[] vertices=new Vertex[count];
                for(int i=0;i<count;i++){
                    double xx=component(bb,binStart,binLength,views,pos,i,0,3),
                           yy=component(bb,binStart,binLength,views,pos,i,1,3),
                           zz=component(bb,binStart,binLength,views,pos,i,2,3);
                    // Global transform includes every ancestor's TRS,
                    // preserving the source object's original assembly.
                    double rx=world[0]*xx+world[1]*yy+world[2]*zz+world[3];
                    double ry=world[4]*xx+world[5]*yy+world[6]*zz+world[7];
                    double rz=world[8]*xx+world[9]*yy+world[10]*zz+world[11];
                    double u=component(bb,binStart,binLength,views,uv,i,0,2),
                           v=component(bb,binStart,binLength,views,uv,i,1,2);
                    if(!Double.isFinite(rx+ry+rz+u+v))throw new IOException("Nonfinite mesh");
                    vertices[i]=new Vertex(rx,ry,rz,u,v);
                }
                int componentType=get(indices,"componentType",-1);
                if(componentType!=5121&&componentType!=5123&&componentType!=5125)
                    throw new IOException("Unsupported index encoding");
                for(int i=0;i<ic;i+=3){
                    int a=index(bb,binStart,binLength,views,indices,i,componentType),
                        b=index(bb,binStart,binLength,views,indices,i+1,componentType),
                        c=index(bb,binStart,binLength,views,indices,i+2,componentType);
                    if(a>=count||b>=count||c>=count)throw new IOException("Index out of range");
                    result.add(new Triangle(vertices[a],vertices[b],vertices[c],materialIds[m]));
                }
            }
        }
        if(result.isEmpty()||result.size()>50000)throw new IOException("No drawable triangles");
        return new Model(List.copyOf(result));
    }
    /** glTF node TRS is LOCAL to its parent. Imported monitor arms and vehicle
     * assemblies must use the complete scene-graph transform, not merely each
     * mesh node's local translation (the old loader discarded its ancestors).
     */
    private static double[] matrix(Map<String,Object> node){
        double[] t=vec(node.get("translation"),0,0,0),
            s=vec(node.get("scale"),1,1,1),
            q=vec(node.get("rotation"),0,0,0,1);
        double x=q[0],y=q[1],z=q[2],w=q[3];
        return new double[]{
            (1-2*(y*y+z*z))*s[0], 2*(x*y-z*w)*s[1], 2*(x*z+y*w)*s[2],t[0],
            2*(x*y+z*w)*s[0],(1-2*(x*x+z*z))*s[1],2*(y*z-x*w)*s[2],t[1],
            2*(x*z-y*w)*s[0],2*(y*z+x*w)*s[1],(1-2*(x*x+y*y))*s[2],t[2],
            0,0,0,1};
    }
    private static double[] combine(double[] a,double[] b){
        double[] c=new double[16];
        for(int r=0;r<4;r++)for(int col=0;col<4;col++)
            for(int k=0;k<4;k++)c[r*4+col]+=a[r*4+k]*b[k*4+col];
        return c;
    }
    private static final double[] IDENTITY={1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1};
    private static void tree(List<Object> nodes,int index,double[] parent,
                             double[][] matrices,boolean[] active,int depth)throws IOException{
        if(index<0||index>=nodes.size()||depth>nodes.size()||active[index]
                ||matrices[index]!=null)
            throw new IOException("Invalid glTF node hierarchy");
        active[index]=true;
        Map<String,Object> node=obj(nodes.get(index));
        double[] world=combine(parent,matrix(node));
        matrices[index]=world;
        if(node.containsKey("children"))for(Object child:arr(node.get("children")))
            tree(nodes,integer(child),world,matrices,active,depth+1);
        active[index]=false;
    }
    private static double[][] sceneTransforms(Map<String,Object> root,
                                               List<Object> nodes)throws IOException{
        double[][] result=new double[nodes.size()][];
        boolean[] active=new boolean[nodes.size()];
        Object scenesValue=root.get("scenes");
        if(scenesValue==null)throw new IOException("glTF missing scene");
        List<Object> scenes=arr(scenesValue);
        int chosen=get(root,"scene",0);
        if(chosen<0||chosen>=scenes.size())throw new IOException("Invalid glTF scene");
        Map<String,Object> scene=obj(scenes.get(chosen));
        if(scene.get("nodes")==null)throw new IOException("glTF scene missing root nodes");
        for(Object n:arr(scene.get("nodes")))
            tree(nodes,integer(n),IDENTITY,result,active,0);
        return result;
    }
    private static int index(ByteBuffer b,int start,int bytes,List<Object> views,
                              Map<String,Object> accessor,int n,int component)throws IOException{
        if(accessor.containsKey("sparse"))throw new IOException("Sparse indices");
        Map<String,Object> view=obj(views.get(integer(accessor.get("bufferView"))));
        int size=component==5125?4:component==5123?2:1,
            stride=get(view,"byteStride",size);
        long addr=(long)get(view,"byteOffset",0)+get(accessor,"byteOffset",0)+(long)n*stride;
        if(addr<0||addr+size>bytes||addr+size>(long)get(view,"byteOffset",0)+get(view,"byteLength",0))
            throw new IOException("Index buffer bounds");
        int p=start+(int)addr;
        return component==5125?b.getInt(p):component==5123?Short.toUnsignedInt(b.getShort(p)):
            Byte.toUnsignedInt(b.get(p));
    }
    private static double component(ByteBuffer b,int start,int bytes,List<Object> views,
                        Map<String,Object> accessor,int n,int c,int dims)throws IOException{
        if(accessor.containsKey("sparse"))throw new IOException("Sparse vertices");
        Map<String,Object> view=obj(views.get(integer(accessor.get("bufferView"))));
        int stride=get(view,"byteStride",dims*4);
        long addr=(long)get(view,"byteOffset",0)+get(accessor,"byteOffset",0)+(long)n*stride+c*4;
        if(addr<0||addr+4>bytes||addr+4>(long)get(view,"byteOffset",0)+get(view,"byteLength",0))
            throw new IOException("Vertex bounds");
        return b.getFloat(start+(int)addr);
    }
    // Small strict JSON reader avoids runtime network/external dependency.
    private static final class Json {
        final String s;int p;
        Json(String data){s=data;}
        Object read()throws IOException{Object x=value();ws();if(p!=s.length())fail();return x;}
        void ws(){while(p<s.length()&&Character.isWhitespace(s.charAt(p)))p++;}
        void fail()throws IOException{throw new IOException("Malformed glTF JSON offset "+p);}
        Object value()throws IOException{
            ws();if(p==s.length()) {fail();return null;}
            char c=s.charAt(p++);
            if(c=='{'){
                Map<String,Object> m=new HashMap<>();ws();
                if(p<s.length()&&s.charAt(p)=='}'){p++;return m;}
                while(true){ws();if(p>=s.length()||s.charAt(p)!='"')fail();p++;
                    String key=string();ws();if(p>=s.length()||s.charAt(p++)!=':')fail();
                    m.put(key,value());ws();if(p>=s.length())fail();
                    char sep=s.charAt(p++);if(sep=='}')break;if(sep!=',')fail();}
                return m;
            }
            if(c=='['){List<Object> a=new ArrayList<>();ws();
                if(p<s.length()&&s.charAt(p)==']'){p++;return a;}
                while(true){a.add(value());ws();if(p>=s.length())fail();
                    char sep=s.charAt(p++);if(sep==']')break;if(sep!=',')fail();}
                return a;
            }
            if(c=='"')return string();
            if(c=='t'&&s.startsWith("rue",p)){p+=3;return true;}
            if(c=='f'&&s.startsWith("alse",p)){p+=4;return false;}
            if(c=='n'&&s.startsWith("ull",p)){p+=3;return null;}
            int start=p-1;
            while(p<s.length()&&"-+.0123456789eE".indexOf(s.charAt(p))>=0)p++;
            if(start==p)fail();
            try{return Double.parseDouble(s.substring(start,p));}catch(NumberFormatException bad){fail();return null;}
        }
        String string()throws IOException{
            StringBuilder b=new StringBuilder();
            while(p<s.length()){char c=s.charAt(p++);
                if(c=='"')return b.toString();
                if(c=='\\'){if(p==s.length())fail();c=s.charAt(p++);
                    if(c=='u'){if(p+4>s.length())fail();try{
                        c=(char)Integer.parseInt(s.substring(p,p+4),16);
                    }catch(NumberFormatException bad){fail();}p+=4;}
                    else c=switch(c){case 'n'->'\n';case 'r'->'\r';case 't'->'\t';
                        case '"'->'"';case '\\'->'\\';case '/'->'/';case 'b'->'\b';case 'f'->'\f';
                        default->throw new IOException("JSON escape");};}
                b.append(c);
            }
            fail();return "";
        }
    }
}
