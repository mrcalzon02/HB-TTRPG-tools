package org.beckenburg;

import java.lang.reflect.*;
import java.util.*;
import java.nio.file.*;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;

/** Exports the exact runtime triangles, UVs, textures and authored sockets for Blender. */
public final class LevelSceneSource {
    static Object read(Object value,String field)throws Exception{
        Method m=value.getClass().getDeclaredMethod(field);m.setAccessible(true);return m.invoke(value);
    }
    static String json(Object v)throws Exception{
        if(v==null)return "null";
        if(v instanceof String s)return "\""+s.replace("\\","\\\\").replace("\"","\\\"").replace("\n","\\n")+"\"";
        if(v instanceof Number||v instanceof Boolean)return v.toString();
        if(v instanceof Collection<?> list){StringJoiner j=new StringJoiner(",","[","]");for(Object x:list)j.add(json(x));return j.toString();}
        if(v.getClass().isRecord()){
            StringJoiner j=new StringJoiner(",","{","}");for(RecordComponent c:v.getClass().getRecordComponents())j.add(json(c.getName())+":"+json(read(v,c.getName())));return j.toString();
        }
        throw new IllegalArgumentException(v.getClass().toString());
    }
    @SuppressWarnings("unchecked")
    public static void main(String[] args)throws Exception{
        HouseMap map=new HouseMap(args.length>0?HouseMap.Site.valueOf(args[0]):HouseMap.Site.HOUSE);
        Path out=Path.of("build/level-verification/scenes",map.level().id());Files.createDirectories(out.resolve("textures"));
        SceneRenderer scene=new SceneRenderer();scene.x=21;scene.z=22;
        Field all=SceneRenderer.class.getDeclaredField("exportFullLevel");all.setAccessible(true);all.setBoolean(scene,true);
        Method assemble=SceneRenderer.class.getDeclaredMethod("levelArchitecture",List.class,HouseMap.class);assemble.setAccessible(true);
        List<Object> faces=new ArrayList<>();assemble.invoke(scene,faces,map);
        Files.writeString(out.resolve("definition.json"),json(map.level()));
        Files.writeString(out.resolve("geometry.json"),json(faces));
        Set<Integer> mats=new TreeSet<>();for(Object f:faces)mats.add((Integer)read(f,"material"));
        Field tex=GlbProps.class.getDeclaredField("textures");tex.setAccessible(true);
        Field factors=GlbProps.class.getDeclaredField("diffuseFactors");factors.setAccessible(true);
        List<BufferedImage> images=(List<BufferedImage>)tex.get(null);List<double[]> colors=(List<double[]>)factors.get(null);
        for(int mat:mats)if(mat>=0){
            BufferedImage im;
            if(mat>=256){
                BufferedImage original=images.get(mat-256);im=new BufferedImage(original.getWidth(),original.getHeight(),BufferedImage.TYPE_INT_RGB);
                double[] c=colors.get(mat-256);
                for(int y=0;y<im.getHeight();y++)for(int x=0;x<im.getWidth();x++){
                    int rgb=original.getRGB(x,y);im.setRGB(x,y,(Math.min(255,(int)(((rgb>>16)&255)*c[0]))<<16)|(Math.min(255,(int)(((rgb>>8)&255)*c[1]))<<8)|Math.min(255,(int)((rgb&255)*c[2])));
                }
            }else{
                int size=mat>=32?512:32;im=new BufferedImage(size,size,BufferedImage.TYPE_INT_RGB);
                for(int y=0;y<size;y++)for(int x=0;x<size;x++)im.setRGB(x,y,mat>=32?LevelMaterials.sample(mat,x/(double)size,1-(y+.5)/size):MaterialAtlas.sample(mat,x/(double)size,y/(double)size));
            }
            ImageIO.write(im,"PNG",out.resolve("textures/"+mat+".png").toFile());
        }
        System.out.println("Exact runtime source "+map.level().id()+": "+faces.size()+" textured triangles, "+mats.size()+" materials");
    }
}
