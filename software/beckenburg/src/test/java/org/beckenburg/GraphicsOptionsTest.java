package org.beckenburg;

import java.awt.image.BufferedImage;
import java.util.Arrays;

/** Headless graphics acceptance without requiring proprietary asset packages. */
public final class GraphicsOptionsTest {
    private static void ok(boolean value,String label){if(!value)throw new AssertionError(label);}
    public static void main(String[] args){
        GraphicsOptions defaults=GraphicsOptions.current();
        GraphicsOptions wide=new GraphicsOptions(
            GraphicsOptions.Mode.WINDOWED,GraphicsOptions.DisplaySize.FULL_HD,
            GraphicsOptions.Detail.BALANCED,GraphicsOptions.Aspect.WIDE,
            GraphicsOptions.Upscale.CRISP,GraphicsOptions.Antialias.EDGE,95,
            0,0,false,true,false,false);
        GraphicsOptions.Viewport letterbox=wide.viewport(1024,768);
        ok(letterbox.width()==1024&&letterbox.height()==576&&letterbox.y()==96,
            "16:9 viewport letterboxes a 4:3 window");
        GraphicsOptions classic=new GraphicsOptions(
            GraphicsOptions.Mode.WINDOWED,GraphicsOptions.DisplaySize.NATIVE,
            GraphicsOptions.Detail.RETRO,GraphicsOptions.Aspect.CLASSIC,
            GraphicsOptions.Upscale.CRISP,GraphicsOptions.Antialias.OFF,93,
            0,0,false,false,false,false);
        GraphicsOptions.Viewport pillarbox=classic.viewport(1920,1080);
        ok(pillarbox.width()==1440&&pillarbox.x()==240,
            "4:3 viewport pillarboxes a 16:9 display");
        SceneRenderer renderer=new SceneRenderer();
        ok(renderer.width()==320&&renderer.height()==200,"legacy test size preserved");
        renderer.setRenderSize(640,360);
        ok(renderer.width()==640&&renderer.height()==360,
            "real 16:9 RGB framebuffer dimensions");
        ok(renderer.pixels().length==640*360&&renderer.depths().length==640*360,
            "pixel and depth arrays resize with actual rendering");
        renderer.setFieldOfView(95);
        double before=renderer.fieldOfView();
        renderer.setRenderSize(960,540);
        ok(Math.abs(renderer.fieldOfView()-before)<.01,
            "changing resolution does not distort camera field of view");
        ok(renderer.image().getWidth()==960&&renderer.image().getHeight()==540,
            "output image is physically higher-resolution");
        wide.configure(renderer,1920,1080,true);
        ok(renderer.width()==640&&renderer.height()==360,
            "quality target determines actual 3D raster dimensions");
        int[] scene=new int[8*8];
        Arrays.fill(scene,0x8899aa);
        scene[3*8+3]=0xffffff;
        int[] raw=scene.clone();
        GraphicsEffects.apply(scene,8,8,wide,2);
        ok(!Arrays.equals(scene,raw),"edge smoothing or vignette modifies world pixels");
        GraphicsOptions off=new GraphicsOptions(
            defaults.mode(),defaults.display(),defaults.detail(),defaults.aspect(),
            defaults.upscale(),GraphicsOptions.Antialias.OFF,defaults.fieldOfView(),
            0,0,false,false,false,false);
        GraphicsEffects.apply(raw,8,8,off,2);
        ok(raw[0]==0x8899aa,"disabled post-processing leaves image untouched");
        boolean rejected=false;
        try{renderer.setRenderSize(8192,8192);}catch(IllegalArgumentException ex){rejected=true;}
        ok(rejected,"oversized software frame rejected safely");
        BufferedImage output=new BufferedImage(1920,1080,BufferedImage.TYPE_INT_RGB);
        java.awt.Graphics2D g=output.createGraphics();
        try{wide.draw(g,renderer.image(),1920,1080);}finally{g.dispose();}
        System.out.println("PASS real render resolution, widescreen, pillarbox, safe dimensions and CPU graphics effects");
    }
}
