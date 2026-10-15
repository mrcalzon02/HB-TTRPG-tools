package org.beckenburg;

import javax.imageio.ImageIO;
import javax.swing.*;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.File;

/** Optional GUI smoke capture; invoke under a desktop display (e.g. xvfb-run). */
public final class GuiSmokeTest {
    private static JButton findButton(Container root,String text){
        for(Component c:root.getComponents()){
            if(c instanceof JButton b && b.getText().equals(text))return b;
            if(c instanceof Container child){JButton hit=findButton(child,text);if(hit!=null)return hit;}
        }
        return null;
    }
    public static void main(String[] args) throws Exception {
        if(GraphicsEnvironment.isHeadless())throw new IllegalStateException("GUI display required");
        InvestigationGame.main(new String[0]);
        Thread.sleep(1100);
        final JFrame[] frame={null};
        SwingUtilities.invokeAndWait(()->{
            for(Window w:Window.getWindows())if(w instanceof JFrame f && f.isShowing()) frame[0]=f;
            if(frame[0]==null)throw new AssertionError("launcher did not appear");
            JButton play=findButton(frame[0].getContentPane(),"BEGIN SOLO INVESTIGATION");
            if(play==null || !play.isEnabled())throw new AssertionError("functional menu button absent");
            play.doClick();
        });
        Thread.sleep(1500);
        SwingUtilities.invokeAndWait(()->{
            boolean visible=false;
            for(Component shown:((Container)frame[0].getContentPane()).getComponents())
                if(shown.getClass().getName().contains("GamePanel") && shown.isShowing())visible=true;
            if(!visible)throw new AssertionError("game card not shown");
        });
        Robot robot=new Robot();robot.setAutoDelay(40);
        Rectangle bounds=frame[0].getBounds();
        BufferedImage img=robot.createScreenCapture(bounds);
        if(args.length>0)ImageIO.write(img,"png",new File(args[0]));
        SwingUtilities.invokeAndWait(()->frame[0].dispose());
        System.out.println("PASS: Swing launcher, begin button, live first-person panel and screenshot capture");
        System.exit(0); // A live GUI timer is active until the desktop application exits.
    }
}
