package org.beckenburg;

import javax.swing.SwingUtilities;
import java.awt.Graphics2D;
import java.awt.event.KeyEvent;
import java.awt.image.BufferedImage;

/** Authentic first-person UI consumes replayed LAN observations without leaking host knowledge. */
public final class LanCaseFileHudTest {
    static void ok(boolean yes,String message){if(!yes)throw new AssertionError(message);}
    public static void main(String[] args)throws Exception{
        try(LanHost host=new LanHost("127.0.0.1",0);
            LanClient hunter=new LanClient("127.0.0.1",host.port(),false,"Observer",s->{})){
            final LanWorldPanel[] view={null};
            SwingUtilities.invokeAndWait(()->{
                LanWorldPanel panel=new LanWorldPanel(hunter);
                panel.setSize(850,555);
                panel.onEvent("CASEFILE|RESET");
                panel.onEvent("CASEFILE|18|0|4|EMF|CONFIRMED|CONFIRMED EMF in 4 - EMF level 5");
                ok(panel.casefileSize()==1,"host casefile packet accepted");
                panel.keyPressed(new KeyEvent(panel,KeyEvent.KEY_PRESSED,System.currentTimeMillis(),0,KeyEvent.VK_J,'J'));
                ok(panel.casefileOpen(),"J toggles actual casefile panel");
                BufferedImage image=new BufferedImage(850,555,BufferedImage.TYPE_INT_RGB);
                Graphics2D g=image.createGraphics();panel.paint(g);g.dispose();
                int backdrop=image.getRGB(29,100)&0xffffff;
                ok(backdrop!=0,"journal overlay painted");
                panel.onEvent("CASEFILE|RESET");
                ok(panel.casefileSize()==0,"replay reset replaces history");
                panel.keyPressed(new KeyEvent(panel,KeyEvent.KEY_PRESSED,System.currentTimeMillis(),0,KeyEvent.VK_J,'J'));
                ok(!panel.casefileOpen(),"J closes the panel");
                view[0]=panel;
            });
            SwingUtilities.invokeAndWait(view[0]::close);
        }
        System.out.println("PASS: shared casefile HUD renders and toggles, authenticated replay clears stale notes");
    }
}
