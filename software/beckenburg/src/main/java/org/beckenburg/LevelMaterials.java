package org.beckenburg;

import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import javax.imageio.ImageIO;

/** Original PSX library diffuse images, sampled at their native resolution. */
public final class LevelMaterials {
    private LevelMaterials(){}
    public static final int BASE=32,PLASTER=32,WOOD=33,FLOOR=34,TILE=35,CONCRETE=36,STONE=37,RUG=38,CLADDING=39;
    private static final String[] FILES={"wall_1_0.png","wall_1_1.png","floor_ceiling_1_0.png",
        "floor_ceiling_2_0.png","floor_ceiling_1_1.png","wall_1_plain_0.png","carpet_mp_1_0.png","wall_1_1.png"};
    private static final BufferedImage[] IMAGES=new BufferedImage[FILES.length];
    private static synchronized BufferedImage image(int id){
        int i=id-BASE;if(i<0||i>=FILES.length)throw new IllegalArgumentException("level material");
        if(IMAGES[i]==null)try(InputStream in=LevelMaterials.class.getResourceAsStream("/org/beckenburg/level-textures/"+FILES[i])){
            if(in==null)throw new IOException("missing "+FILES[i]);IMAGES[i]=ImageIO.read(in);
            if(IMAGES[i]==null)throw new IOException("invalid image "+FILES[i]);
        }catch(IOException e){throw new IllegalStateException("Original environment texture unavailable",e);}
        return IMAGES[i];
    }
    public static int sample(int id,double u,double v){
        BufferedImage im=image(id);
        int x=Math.min(im.getWidth()-1,(int)((u-Math.floor(u))*im.getWidth()));
        int y=Math.min(im.getHeight()-1,(int)((1-(v-Math.floor(v)))*im.getHeight()));
        int rgb=im.getRGB(x,y)&0xffffff;
        if(id==CLADDING){int grey=(((rgb>>16)&255)*3+((rgb>>8)&255)*5+(rgb&255)*2)/10;
            return (Math.min(255,grey+22)<<16)|(Math.min(255,grey+27)<<8)|Math.min(255,grey+30);}
        return rgb;
    }
    public static int floor(LevelDefinition.Room r){
        if(r.outside())return r.id()==12?MaterialAtlas.FOLIAGE:MaterialAtlas.CONCRETE;
        String f=r.finish().toLowerCase();
        return f.contains("tile")||f.contains("kitchen")||f.contains("bath")?TILE:
            f.contains("stone")?STONE:f.contains("concrete")||r.y()<0?CONCRETE:FLOOR;
    }
    public static int wall(LevelDefinition.Room r){
        String f=r.finish().toLowerCase();
        return f.contains("tile")?TILE:f.contains("stone")?STONE:
            f.contains("concrete")?CONCRETE:PLASTER;
    }
}
