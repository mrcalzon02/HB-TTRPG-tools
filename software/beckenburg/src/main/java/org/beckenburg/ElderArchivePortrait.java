package org.beckenburg;

import java.awt.image.BufferedImage;
import java.io.IOException;
import java.util.EnumMap;
import javax.imageio.ImageIO;

/**
 * Front-view crop of the approved individual Elder concept board, not a
 * substituted original ghost. Master files remain intact and attributable.
 * Crops are archive portraits, NOT claimed directional gameplay animations.
 */
final class ElderArchivePortrait {
    private ElderArchivePortrait(){}
    private record Crop(String file,int x,int y,int w,int h){}
    private static final EnumMap<GhostIdentity.Type,BufferedImage> CACHE=
        new EnumMap<>(GhostIdentity.Type.class);
    private static Crop crop(GhostIdentity.Type type){
        return switch(type){
            case ELDER_BLADE_DEMON -> new Crop("elder-blade-demon.png",22,256,214,378);
            case ELDER_PLAGUE_DEMON -> new Crop("elder-plague-demon.png",17,235,280,346);
            case ELDER_NOTHIC -> new Crop("elder-nothic.png",14,185,261,322);
            default -> throw new IllegalArgumentException("Not an Elder: "+type);
        };
    }
    static synchronized BufferedImage front(GhostIdentity.Type type){
        if(!type.elder())throw new IllegalArgumentException("Elder portrait required");
        BufferedImage cached=CACHE.get(type);
        if(cached!=null)return cached;
        Crop c=crop(type);
        try(var resource=ElderArchivePortrait.class.getResourceAsStream("elder-masters/"+c.file())){
            if(resource==null)throw new IllegalStateException("Missing licensed/approved Elder master: "+c.file());
            BufferedImage sheet=ImageIO.read(resource);
            if(sheet==null||sheet.getWidth()!=1536||sheet.getHeight()!=1024)
                throw new IllegalStateException("Invalid Elder concept sheet "+c.file());
            BufferedImage front=sheet.getSubimage(c.x(),c.y(),c.w(),c.h());
            CACHE.put(type,front);
            return front;
        }catch(IOException e){throw new IllegalStateException("Unreadable Elder sheet "+c.file(),e);}
    }
}
