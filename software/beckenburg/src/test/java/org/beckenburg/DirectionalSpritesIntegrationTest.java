package org.beckenburg;

import java.util.Arrays;
import java.util.List;

/** Test the shipped sprite resource and live SceneRenderer, not a standalone viewer. */
public final class DirectionalSpritesIntegrationTest {
    private static void check(boolean ok,String why){if(!ok)throw new AssertionError(why);}
    public static void main(String[] args) {
        check(DirectionalSprites.frameCount()==12,"all twelve approved character frames packaged");
        for(int i=0;i<8;i++){
            check(DirectionalSprites.frame("observer",i)!=null,"observer facing "+i);
            check(DirectionalSprites.frame("banshee",i)!=null,"banshee facing "+i);
        }
        check(DirectionalSprites.facing(0,0,0,0,2)==0,"front");
        check(DirectionalSprites.facing(0,0,0,2,0)==2,"right");
        check(DirectionalSprites.facing(0,0,0,0,-2)==4,"back");
        check(DirectionalSprites.facing(0,0,0,-2,0)==6,"left");
        int[] pix=new int[SceneRenderer.W*SceneRenderer.H];
        double[] depth=new double[pix.length];Arrays.fill(depth,Double.POSITIVE_INFINITY);
        DirectionalSprites.draw(pix,depth,0,0,0,0,0,4,0,"observer",1.75,1.04,0,255,true);
        check(Arrays.stream(pix).anyMatch(v->v!=0),"live raster draws alpha-masked character");
        Arrays.fill(pix,0);Arrays.fill(depth,2);
        DirectionalSprites.draw(pix,depth,0,0,0,0,0,4,0,"observer",1.75,1.04,0,255,true);
        check(Arrays.stream(pix).noneMatch(v->v!=0),"scene depth occludes character");
        HouseMap map=new HouseMap();SceneRenderer renderer=new SceneRenderer();
        renderer.x=map.centerX(4);renderer.z=map.centerZ(4)-2.4;
        renderer.yaw=0;renderer.pitch=-.04;
        renderer.drawNetwork(map,List.of(),(SceneRenderer.Apparition)null,1);
        int[] hidden=renderer.pixels().clone();
        renderer.drawNetwork(map,List.of(),new SceneRenderer.Apparition(map.centerX(4),map.centerZ(4)),1);
        check(!Arrays.equals(hidden,renderer.pixels()),"network manifestation draws image in real house");
        renderer.drawNetwork(map,List.of(),(SceneRenderer.Apparition)null,1);
        check(Arrays.equals(hidden,renderer.pixels()),"hidden ghost never draws");
        System.out.println("PASS: 12 sprites, 8 facings, depth occlusion and real LAN ghost renderer");
    }
}
