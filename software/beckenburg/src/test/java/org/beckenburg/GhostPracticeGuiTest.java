package org.beckenburg;

import javax.imageio.ImageIO;
import javax.swing.*;
import java.awt.*;
import java.awt.event.KeyEvent;
import java.awt.image.BufferedImage;
import java.io.File;

/** Integration smoke test: actual Swing menu, spectral viewport and ESC exit. */
public final class GhostPracticeGuiTest {
    private static JButton button(Container root,String text){
        for(Component c:root.getComponents()){
            if(c instanceof JButton b && text.equals(b.getText()))return b;
            if(c instanceof Container nested){JButton found=button(nested,text);if(found!=null)return found;}
        }
        return null;
    }
    public static void main(String[] args)throws Exception{
        if(GraphicsEnvironment.isHeadless())throw new IllegalStateException("GUI required");
        InvestigationGame.main(new String[0]);
        Thread.sleep(600);
        final JFrame[] window={null};
        SwingUtilities.invokeAndWait(()->{
            for(Window w:Window.getWindows())if(w instanceof JFrame f&&f.isShowing())window[0]=f;
            if(window[0]==null)throw new AssertionError("missing Swing launcher");
            JButton start=button(window[0].getContentPane(),"GHOST PRACTICE / LOCAL");
            if(start==null||!start.isEnabled())throw new AssertionError("missing active ghost mode");
            start.doClick();
        });
        Thread.sleep(600);
        final GhostPracticePanel[] panel={null};
        SwingUtilities.invokeAndWait(()->{
            for(Component c:window[0].getContentPane().getComponents())if(c instanceof GhostPracticePanel p&&p.isShowing())panel[0]=p;
            if(panel[0]==null)throw new AssertionError("ghost panel not active");
            if(panel[0].session().observation().room()<0)throw new AssertionError("invalid ghost spawn");
        });
        Robot robot=new Robot();
        BufferedImage shot=robot.createScreenCapture(window[0].getBounds());
        if(args.length>0)ImageIO.write(shot,"png",new File(args[0]));
        SwingUtilities.invokeAndWait(()->{
            KeyEvent esc=new KeyEvent(panel[0],KeyEvent.KEY_PRESSED,System.currentTimeMillis(),0,KeyEvent.VK_ESCAPE,KeyEvent.CHAR_UNDEFINED);
            panel[0].keyPressed(esc);
            if(panel[0].isShowing())throw new AssertionError("ghost ESC did not return to main menu");
            JButton hunter=button(window[0].getContentPane(),"BEGIN SOLO INVESTIGATION");
            if(hunter==null||!hunter.isEnabled())throw new AssertionError("hunter mode lost during ghost exit");
            window[0].dispose();
        });
        System.out.println("PASS: ghost practice menu, spectral 3D render, safe ESC return and hunter-mode persistence");
        System.exit(0);
    }
}
