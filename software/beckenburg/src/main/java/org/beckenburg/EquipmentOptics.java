package org.beckenburg;

import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.util.Objects;

/** Hardware-only optics progression. Never examines ghost identity or clue flags. */
public final class EquipmentOptics {
    private EquipmentOptics(){}

    public record Profile(int photos,double videoFieldOfView,int monitorWidth,
                          int photoWidth,int photoHeight,boolean videoNightMode) {
        public Profile {
            if(photos<1||videoFieldOfView<30||videoFieldOfView>150
                    ||monitorWidth<100||photoWidth<100||photoHeight<100)
                throw new IllegalArgumentException("invalid optics");
        }
    }
    public static Profile forTier(EquipmentTiers.Tier tier){
        return switch(Objects.requireNonNull(tier)){
            case I->new Profile(1,65,155,160,160,false);
            case II->new Profile(6,93,210,320,200,false);
            case III->new Profile(12,120,280,640,400,true);
        };
    }
    /**
     * Processes an actual existing rendered frame. A Polaroid gets a square
     * low-detail print, the midrange a native full frame, the professional
     * a larger smoothly resampled full-frame output. Export resolution does
     * not mean the underlying scene renderer gained extra polygons/pixels.
     */
    public static BufferedImage photograph(BufferedImage source,EquipmentTiers.Tier tier){
        if(source==null)throw new IllegalArgumentException("no optical image");
        Profile p=forTier(tier);
        BufferedImage out=new BufferedImage(p.photoWidth(),p.photoHeight(),
            BufferedImage.TYPE_INT_RGB);
        Graphics2D g=out.createGraphics();
        try{
            Object interpolation=tier==EquipmentTiers.Tier.III
                ?RenderingHints.VALUE_INTERPOLATION_BICUBIC:
                RenderingHints.VALUE_INTERPOLATION_NEAREST_NEIGHBOR;
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,interpolation);
            if(tier==EquipmentTiers.Tier.I){
                int side=Math.min(source.getWidth(),source.getHeight());
                int cropX=(source.getWidth()-side)/2,cropY=(source.getHeight()-side)/2;
                g.drawImage(source,0,0,p.photoWidth(),p.photoHeight(),
                    cropX,cropY,cropX+side,cropY+side,null);
            }else{
                g.drawImage(source,0,0,p.photoWidth(),p.photoHeight(),null);
            }
        }finally{g.dispose();}
        return out;
    }
}
