package org.beckenburg;

import java.awt.image.BufferedImage;
import java.io.InputStream;
import java.security.MessageDigest;
import java.util.Arrays;

/** Tests the REAL packaged atlas (including reassembled binary bytes), not sample drawings. */
public final class GhostSpriteAtlasIntegrationTest {
    private static void check(boolean condition,String msg){
        if(!condition)throw new AssertionError(msg);
    }
    private static int pixels(BufferedImage image){
        int present=0,absent=0;
        for(int y=0;y<image.getHeight();y++)for(int x=0;x<image.getWidth();x++){
            int a=image.getRGB(x,y)>>>24;
            if(a>=24)present++;else absent++;
        }
        check(present>=50,"ghost sheet is empty");
        check(absent>75,"ghost sheet lost transparent surroundings");
        return present;
    }
    public static void main(String[] args)throws Exception{
        String expected="8cdbe69101a951c0862b81a4b3b9a7555e9be8068f735466c2c77b5cd33a876d";
        try(InputStream src=GhostSpriteAtlas.class.getResourceAsStream("ghost-sprite-expansion-v3.zip")){
            check(src!=null,"missing sprite archive from JAR classpath");
            MessageDigest md=MessageDigest.getInstance("SHA-256");
            byte[] data=new byte[8192];int n;long size=0;
            while((n=src.read(data))>=0){md.update(data,0,n);size+=n;}
            check(size==6868626L,"ghost resource bytes changed: "+size);
            StringBuilder hex=new StringBuilder();
            for(byte b:md.digest())hex.append(String.format("%02x",b&255));
            check(expected.equals(hex.toString()),"ghost archive checksum mismatch");
        }
        check(GhostSpriteAtlas.installed(),"actual ghost atlas not loaded");
        check(GhostSpriteAtlas.atlasCount()==23*8,"missing ghost-direction atlas");
        for(GhostIdentity.Type ghost:GhostIdentity.Type.values())if(!ghost.elder()){
            String name=ghost.name().toLowerCase(java.util.Locale.ROOT);
            check(GhostSpriteAtlas.supports(name),"missing type "+name);
            for(int facing=0;facing<8;facing++){
                BufferedImage frame=GhostSpriteAtlas.frame(name,facing,"idle",0);
                check(frame!=null&&frame.getWidth()==64&&frame.getHeight()==112,
                        "invalid compact PSX facing "+name+" "+facing);
                pixels(frame);
            }
            for(String state:new String[]{"idle","walk","sprint","attack","signature","manifest","recover","dissipate"})
                for(int step=0;step<4;step++)
                    pixels(GhostSpriteAtlas.frame(name,0,state,step));
        }
        BufferedImage banshee=GhostSpriteAtlas.frame("banshee",0,"idle",0);
        BufferedImage shade=GhostSpriteAtlas.frame("shade",0,"idle",0);
        BufferedImage ancient=GhostSpriteAtlas.frame("ancient_banshee",0,"idle",0);
        check(!Arrays.equals(banshee.getRGB(0,0,64,112,null,0,64),
                shade.getRGB(0,0,64,112,null,0,64)),
                "separate ghost species must not reuse a Banshee bitmap");
        check(!Arrays.equals(banshee.getRGB(0,0,64,112,null,0,64),
                ancient.getRGB(0,0,64,112,null,0,64)),
                "Ancient sprite tint must differ from the parent");
        check(DirectionalSprites.frame("observer",0)!=null,"legacy player art intact");
        check(DirectionalSprites.frame("ancient_shade",4,LanGhostAnimation.Phase.WINDUP,2)!=null,
                "live directional API missing Ancient pose");
        System.out.println("PASS: verified 6.9MB archived bytes, 23 ghosts, 184 facing atlases, 8 states x 4 frames, preserved alpha/legacy bodies");
    }
}
