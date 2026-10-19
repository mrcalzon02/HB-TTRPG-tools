package org.beckenburg;

import java.awt.*;
import java.awt.image.BufferedImage;
import java.nio.file.*;
import javax.imageio.ImageIO;

public final class RecorderModelsTest {
    public static void main(String[] args)throws Exception {
        Path previews=Path.of("build/recorder-previews");Files.createDirectories(previews);
        for(var tier:EquipmentTiers.Tier.values()){
            String name=HeldInstrumentMesh.source("SOUND_RECORDER",tier);
            if(!name.equals("blender_sound_recorder_"+(tier.ordinal()+1)))throw new AssertionError("physical tier selection");
            var mesh=GlbProps.model(name);
            if(mesh.triangles().size()<100||mesh.triangles().size()>1200)throw new AssertionError("geometry budget");
            BufferedImage[] states=new BufferedImage[2];
            for(int i=0;i<2;i++){
                var image=new BufferedImage(850,480,BufferedImage.TYPE_INT_RGB);
                Graphics2D g=image.createGraphics();g.setColor(new Color(32,39,43));g.fillRect(0,0,850,480);
                HeldToolView.draw(g,850,480,"SOUND_RECORDER",0,true,false,
                    i==0?"STOP / 1 clips / R rec P play":"REC 2.4s / PEAK 75 / R stop",tier);
                g.dispose();states[i]=image;
                ImageIO.write(image,"png",previews.resolve("tier-"+tier+"-"+(i==0?"stop":"rec")+".png").toFile());
            }
            int changed=0;
            for(int y=0;y<480;y++)for(int x=0;x<850;x++)
                if(states[0].getRGB(x,y)!=states[1].getRGB(x,y))changed++;
            if(changed<25)throw new AssertionError("live on-device readout must actually change");
            var handheld=HeldInstrumentMesh.image("SOUND_RECORDER",tier);
            int opaque=0;
            for(int y=0;y<handheld.getHeight();y++)for(int x=0;x<handheld.getWidth();x++)
                if((handheld.getRGB(x,y)>>>24)!=0)opaque++;
            if(opaque<1000)throw new AssertionError("real source-derived held mesh is not visible");
        }
        System.out.println("PASS: three Blender recorder GLBs load/rasterize in Java, bounded triangles, live physical LCD previews");
    }
}
