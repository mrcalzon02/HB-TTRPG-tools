package org.beckenburg;

import java.awt.Graphics2D;
import java.awt.event.KeyEvent;
import java.awt.image.BufferedImage;
import javax.swing.SwingUtilities;

/** Real first-person notebook: full ghost roster stays clickable despite greyed guesses. */
public final class ManualEvidenceHudTest {
    static void ok(boolean value,String why){if(!value)throw new AssertionError(why);}
    public static void main(String[] args)throws Exception {
        try(LanHost host=new LanHost("127.0.0.1",0);
            LanClient client=new LanClient("127.0.0.1",host.port(),false,"Observer",s->{})){
            final LanWorldPanel[] panel={null};
            SwingUtilities.invokeAndWait(()->{
                LanWorldPanel ui=new LanWorldPanel(client);
                ui.setSize(850,555);
                ui.keyPressed(new KeyEvent(ui,KeyEvent.KEY_PRESSED,System.currentTimeMillis(),
                    0,KeyEvent.VK_TAB,'\t'));
                ok(ui.casefileOpen(),"tab opens manual evidence page");
                ok(ui.journalAllows(GhostIdentity.Type.SHADE),"no tick starts fully permissive");
                ui.onEvent("NOTE|EMF_OVER_SIX|SEEN|0|20");
                ok(!ui.journalAllows(GhostIdentity.Type.SHADE),"manual high EMF greys Shade");
                ok(ui.journalAllows(GhostIdentity.Type.SPIRIT),"valid ghosts remain visible");
                ok(ui.handleJournalClick(351,82+86+6*22+3,false),
                   "greyed Shade remains clickable in full ghost roster");
                ok(ui.selectedGuess()==GhostIdentity.Type.SHADE,
                   "greyed ghost can still be selected as the investigator guess");
                BufferedImage image=new BufferedImage(850,555,BufferedImage.TYPE_INT_RGB);
                Graphics2D graphics=image.createGraphics();
                ui.paint(graphics);graphics.dispose();
                ok((image.getRGB(30,95)&0xffffff)!=0,
                   "real evidence/ghost roster interface is rendered");
                ui.onEvent("NOTE|EMF_OVER_SIX|UNKNOWN|0|21");
                ok(ui.journalAllows(GhostIdentity.Type.SHADE),"unticking restores ghost");
                ui.close();panel[0]=ui;
            });
        }
        System.out.println("PASS: notebook checkboxes, greying/undo, ghost choice and actual HUD paint");
    }
}
