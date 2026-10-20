package org.beckenburg;

import javax.swing.SwingUtilities;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;

/** Every acoustic cue has a visual caption, including when audio is muted/unavailable. */
public final class LanSoundHudTest {
    static void ok(boolean b,String msg){if(!b)throw new AssertionError(msg);}
    public static void main(String[] args)throws Exception{
        System.setProperty("beckenburg.audio.mute","true");
        try(LanHost host=new LanHost("127.0.0.1",0);
            LanClient client=new LanClient("127.0.0.1",host.port(),false,"Observer",s->{})){
            final LanWorldPanel[] panel=new LanWorldPanel[1];
            SwingUtilities.invokeAndWait(()->{
                panel[0]=new LanWorldPanel(client);
                panel[0].setSize(850,555);
                try{
                panel[0].onEvent(new LanWorld(new HouseMap()).bodyFrame(0,50));
                panel[0].onEvent("SOUND|WHISPER|-75|60|50");
                ok(panel[0].activeSoundCaption().contains("WHISPER")
                        &&panel[0].activeSoundCaption().contains("LEFT"),"caption matches bounded audio cue");
                BufferedImage frame=new BufferedImage(850,555,BufferedImage.TYPE_INT_RGB);
                Graphics2D g=frame.createGraphics();panel[0].paint(g);g.dispose();
                int lavender=0;
                for(int y=87;y<119;y++)for(int x=12;x<600;x++){
                    int rgb=frame.getRGB(x,y),r=(rgb>>>16)&255,green=(rgb>>>8)&255,b=rgb&255;
                    if(b>r && r>green && b>160)lavender++;
                }
                ok(lavender>30,"on-screen audio caption actually paints");
                panel[0].onEvent(new LanWorld(new HouseMap()).bodyFrame(0,75));
                ok(panel[0].activeSoundCaption().isEmpty(),"outdated sound caption expires");
                }finally{panel[0].close();}
            });
        }
        System.out.println("PASS: silent-device accessibility audio caption, directional label and expiry");
    }
}
