package org.beckenburg;

import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.util.HashSet;
import java.util.Set;

/** Actual GLB flashlight pixels, texture fidelity, caching, and powered/unpowered drawing. */
public final class HeldMeshViewTest {
    private HeldMeshViewTest() { }
    public static void main(String[] args) {
        BufferedImage mesh=HeldMeshView.flashlightImage();
        assert mesh==HeldMeshView.flashlightImage():"Mesh frame is cached";
        int solid=0;Set<Integer> colors=new HashSet<>();
        for(int y=0;y<mesh.getHeight();y++)for(int x=0;x<mesh.getWidth();x++){
            int rgb=mesh.getRGB(x,y);
            if((rgb>>>24)!=0){solid++;colors.add(rgb);}
        }
        assert solid>200:"No physical flashlight geometry";
        assert colors.size()>8:"Purchased texture sampling lost";
        BufferedImage frame=new BufferedImage(850,480,BufferedImage.TYPE_INT_ARGB);
        Graphics2D g=frame.createGraphics();
        try{
            HeldMeshView.draw(g,850,480,5,true);
            HeldMeshView.draw(g,850,480,9,false);
        }finally{g.dispose();}
        int pixels=0;
        for(int y=0;y<480;y++)for(int x=0;x<850;x++)
            if((frame.getRGB(x,y)>>>24)!=0)pixels++;
        assert pixels>200:"No flashlight in actual HUD framebuffer";
        System.out.println("Purchased flashlight foreground: "+solid+" mesh pixels, "+colors.size()+" colors");
    }
}
