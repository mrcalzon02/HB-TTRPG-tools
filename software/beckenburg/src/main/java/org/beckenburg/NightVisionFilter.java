package org.beckenburg;

import java.awt.image.BufferedImage;

/**
 * Optical enhancement of the actual rendered room. No hidden ghost data,
 * fabricated apparitions, or journal/evidence fields are consulted.
 */
public final class NightVisionFilter {
    private NightVisionFilter(){}
    public static BufferedImage apply(BufferedImage original){
        if(original==null)throw new IllegalArgumentException("no video frame");
        BufferedImage out=new BufferedImage(original.getWidth(),original.getHeight(),
            BufferedImage.TYPE_INT_RGB);
        for(int y=0;y<original.getHeight();y++)for(int x=0;x<original.getWidth();x++){
            int pixel=original.getRGB(x,y);
            int r=(pixel>>16)&255,g=(pixel>>8)&255,b=pixel&255;
            int luminance=(r*30+g*59+b*11)/100;
            int amplified=Math.min(255,(int)(Math.sqrt(luminance/255.0)*255));
            // Actual frame luminance remains the only input to this green phosphor view.
            out.setRGB(x,y,((amplified/7)<<16)|(Math.min(255,amplified)<<8)|(amplified/6));
        }
        return out;
    }
}
