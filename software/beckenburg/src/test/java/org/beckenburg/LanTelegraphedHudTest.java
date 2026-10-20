package org.beckenburg;

import javax.swing.SwingUtilities;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

/** The LAN viewport paints an unmistakable warning when the host telegraphs a strike. */
public final class LanTelegraphedHudTest {
    static void ok(boolean v,String s){if(!v)throw new AssertionError(s);}
    static int warningPixels(BufferedImage image){
        int count=0;
        for(int y=87;y<119;y++)for(int x=10;x<720;x++){
            int c=image.getRGB(x,y);int r=(c>>16)&255,g=(c>>8)&255,b=c&255;
            if(r>215&&r>g+45&&g>b+10)count++;
        }
        return count;
    }
    public static void main(String[] args)throws Exception{
        try(LanHost server=new LanHost("127.0.0.1",0);
            LanClient hunter=new LanClient("127.0.0.1",server.port(),false,"Cleric",s->{})){
            final LanWorldPanel[] panel=new LanWorldPanel[1];
            SwingUtilities.invokeAndWait(()->{
                panel[0]=new LanWorldPanel(hunter);
                panel[0].setSize(850,555);
                panel[0].onEvent(new LanWorld(new HouseMap()).bodyFrame(0,170));
            });
            try{
                int[] pixels=new int[2];
                SwingUtilities.invokeAndWait(()->{
                    BufferedImage before=new BufferedImage(850,555,BufferedImage.TYPE_INT_RGB);
                    Graphics2D g0=before.createGraphics();panel[0].paint(g0);g0.dispose();
                    pixels[0]=warningPixels(before);
                    panel[0].onEvent("THREAT|START|8|0");
                    BufferedImage after=new BufferedImage(850,555,BufferedImage.TYPE_INT_RGB);
                    Graphics2D g=after.createGraphics();panel[0].paint(g);g.dispose();
                    pixels[1]=warningPixels(after);
                    panel[0].onEvent("THREAT|EVADED|0");
                    ok(panel[0].caseFeedback().contains("EVADED"),"evasion feedback visible");
                });
                ok(pixels[1]>pixels[0]+80,"warning text must visibly change HUD colors: "+pixels[0]+" "+pixels[1]);
            }finally{SwingUtilities.invokeAndWait(panel[0]::close);}
            System.out.println("PASS: on-screen red strike wind-up and evasion feedback render in the LAN HUD");
        }
    }
}
