package org.beckenburg;

import java.awt.image.BufferedImage;
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
        "light_switch_1","ceiling_lamp_1_off","door_1_loose","shelf_mp_6","chair_mp_5","ceiling_lamp_1_on","cross_mp_2","flashlight_mp_1"
    };
    public record Vertex(double x,double y,double z,double u,double v) { }
    public record Triangle(Vertex a,Vertex b,Vertex c,int material) { }
    public record Model(List<Triangle> triangles) { }
    private static final Map<String,Model> cache=new HashMap<>();
    private static final List<BufferedImage> textures=new ArrayList<>();

    public static synchronized Model model(String name){
        if(!Arrays.asList(NAMES).contains(name))throw new IllegalArgumentException("Unapproved model "+name);
        Model m=cache.get(name);
        if(m!=null)return m;
        String resource="/org/beckenburg/models/"+name+".glb";
        try(InputStream in=GlbProps.class.getResourceAsStream(resource)){
            if(in==null)throw new IOException("Missing packaged licensed mesh "+resource);
            byte[] bytes=in.readNBytes(4_000_001);
            if(bytes.length>4_000_000)throw new IOException("GLB resource over budget");
            m=decode(bytes);
            cache.put(name,m);
            return m;
        }catch(IOException failure){throw new IllegalStateException("Model unavailable: "+name,failure);}
    }
    /** Model triangle list is immutable and cannot mutate runtime source geometry. */
    public static synchronized int sample(int material,double u,double v){
        int index=material-TEXTURE_BASE;
        if(index<0||index>=textures.size()||!Double.isFinite(u)||!Double.isFinite(v))
            throw new IllegalArgumentException("Invalid imported texture");
        BufferedImage image=textures.get(index);
        int x=Math.min(image.getWidth()-1,(int)((u-Math.floor(u))*image.getWidth()));
        // glTF UV V=0 originates at the bottom of a PNG image.
        int y=Math.min(image.getHeight()-1,
            (int)((1.0-(v-Math.floor(v)))*image.getHeight()));
        return image.getRGB(x,y)&0xffffff;
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
        }
        List<Triangle> result=new ArrayList<>();
        for(Object n:nodes){
            Map<String,Object> node=obj(n);
            if(!node.containsKey("mesh"))continue;
            double[] t=vec(node.get("translation"),0,0,0),
                     scale=vec(node.get("scale"),1,1,1),
                     q=vec(node.get("rotation"),0,0,0,1);
            double qx=q[0],qy=q[1],qz=q[2],qw=q[3];
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
                    // glTF node TRS, proper quaternion rotation then translation.
                    xx*=scale[0];yy*=scale[1];zz*=scale[2];
                    double rx=xx+2*(-(qy*qy+qz*qz)*xx+(qx*qy-qz*qw)*yy+(qx*qz+qy*qw)*zz);
                    double ry=yy+2*((qx*qy+qz*qw)*xx-(qx*qx+qz*qz)*yy+(qy*qz-qx*qw)*zz);
                    double rz=zz+2*((qx*qz-qy*qw)*xx+(qy*qz+qx*qw)*yy-(qx*qx+qy*qy)*zz);
                    double u=component(bb,binStart,binLength,views,uv,i,0,2),
                           v=component(bb,binStart,binLength,views,uv,i,1,2);
                    if(!Double.isFinite(rx+ry+rz+u+v))throw new IOException("Nonfinite mesh");
                    vertices[i]=new Vertex(rx+t[0],ry+t[1],rz+t[2],u,v);
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
