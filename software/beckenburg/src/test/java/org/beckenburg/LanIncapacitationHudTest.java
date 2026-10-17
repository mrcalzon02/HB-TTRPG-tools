package org.beckenburg;

import javax.swing.SwingUtilities;
import java.awt.event.KeyEvent;
import java.awt.image.BufferedImage;

/** The downed first-person HUD prevents inputs even with the audio device absent. */
public final class LanIncapacitationHudTest {
    static void ok(boolean yes,String why){if(!yes)throw new AssertionError(why);}
    static void press(LanWorldPanel p,int key){
        p.keyPressed(new KeyEvent(p,KeyEvent.KEY_PRESSED,System.currentTimeMillis(),0,
                key,KeyEvent.CHAR_UNDEFINED));
    }
    public static void main(String[] args)throws Exception{
        System.setProperty("beckenburg.audio.mute","true");
        try(LanHost host=new LanHost("127.0.0.1",0);
            LanClient client=new LanClient("127.0.0.1",host.port(),false,"Cleric",s->{})){
            SwingUtilities.invokeAndWait(()->{
                LanWorldPanel p=new LanWorldPanel(client);
                p.setSize(850,555);
                try {
                    p.onEvent("PROGRESS|0|6|2|0|0|0|ACTIVE");
                    p.onEvent("HUNTER|DOWN|0");
                    press(p,KeyEvent.VK_E);
                    ok(p.caseFeedback().contains("INCAPACITATED"),"door input suppressed when down");
                    press(p,KeyEvent.VK_R);
                    ok(p.caseFeedback().contains("CANNOT SCAN"),"scanner hotkey suppressed");
                    press(p,KeyEvent.VK_W);
                    BufferedImage image=new BufferedImage(850,555,BufferedImage.TYPE_INT_RGB);
                    var g=image.createGraphics();p.paint(g);g.dispose();
                    ok(p.caseFeedback().contains("INCAPACITATED"),"offscreen view keeps downed status");
                }finally {p.close();}
            });
        }
        System.out.println("PASS: downed first-person view refuses doors, scanner and movement inputs");
    }
}
