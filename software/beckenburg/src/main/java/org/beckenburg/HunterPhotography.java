package org.beckenburg;

import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import javax.imageio.ImageIO;

/**
 * A physical camera captures the rendered view, regardless of ghost presence.
 * No hidden identity, evidence score, or image validity check is performed.
 * Snapshots belong to the local player, not the server's deduction journal.
 */
public final class HunterPhotography {
    private HunterPhotography(){}
    private static final DateTimeFormatter NAME=DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss-SSS");
    public static BufferedImage snapshot(BufferedImage view){
        if(view==null)throw new IllegalArgumentException("no camera view");
        BufferedImage image=new BufferedImage(view.getWidth(),view.getHeight(),
            BufferedImage.TYPE_INT_RGB);
        Graphics2D g=image.createGraphics();
        try{g.drawImage(view,0,0,null);}finally{g.dispose();}
        return image;
    }
    /** Distinct instant/standard/professional photo output from the actual frame. */
    public static BufferedImage snapshot(BufferedImage view,EquipmentTiers.Tier tier){
        return EquipmentOptics.photograph(view,tier);
    }
    public static Path save(BufferedImage shot,Path directory,int hunter,int exposure)
            throws IOException{
        if(shot==null||directory==null||hunter<0||hunter>=6||exposure<1)
            throw new IllegalArgumentException("invalid photograph");
        Files.createDirectories(directory);
        String name="hunter-"+(hunter+1)+"-photo-"+exposure+"-"+
            LocalDateTime.now().format(NAME)+".png";
        Path file=directory.resolve(name);
        if(!ImageIO.write(shot,"png",file.toFile()))
            throw new IOException("PNG encoder unavailable");
        if(Files.size(file)==0)throw new IOException("photo was empty");
        return file;
    }
    public static Path defaultFolder(){
        return Path.of(System.getProperty("user.home"),"Beckenburg","Photos");
    }
}
