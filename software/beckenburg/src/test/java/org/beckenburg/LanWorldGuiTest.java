package org.beckenburg;

import javax.swing.*;
import java.awt.*;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import java.io.File;
import java.net.ServerSocket;
import java.util.*;

/** Real graphical LAN lobby launches a responsive shared 3D scene with live socket peers. */
public final class LanWorldGuiTest {
    static void until(java.util.function.BooleanSupplier condition,String label)throws Exception {
        long end=System.currentTimeMillis()+8500;
        while(System.currentTimeMillis()<end){if(condition.getAsBoolean())return;Thread.sleep(80);}
        throw new AssertionError("timeout: "+label);
    }
    static <T> T onEdt(java.util.concurrent.Callable<T> action)throws Exception {
        final Object[] r={null};final Exception[] err={null};
        SwingUtilities.invokeAndWait(()->{try{r[0]=action.call();}catch(Exception ex){err[0]=ex;}});
        if(err[0]!=null)throw err[0];
        @SuppressWarnings("unchecked") T answer=(T)r[0];return answer;
    }
    public static void main(String[] args)throws Exception {
        if(GraphicsEnvironment.isHeadless())throw new AssertionError("requires graphical display");
        int port;try(ServerSocket ep=new ServerSocket(0)){port=ep.getLocalPort();}
        LanLobbyWindow frame=onEdt(()->{
            LanLobbyWindow lobby=new LanLobbyWindow();
            java.util.List<JTextField> inputs=new ArrayList<>();LanWindowSmokeTest.collect(lobby.getContentPane(),JTextField.class,inputs);
            inputs.stream().filter(t->"27717".equals(t.getText())).findFirst().orElseThrow().setText(Integer.toString(port));
            lobby.setVisible(true);LanWindowSmokeTest.button(lobby,"Host LAN").doClick();return lobby;
        });
        try{
            until(()->{try{return onEdt(()->LanWindowSmokeTest.button(frame,"Ready / Unready").isEnabled());}catch(Exception e){return false;}},"host connection");
            try(LanClient b=new LanClient("127.0.0.1",port,false,"Observer",s->{});
                LanClient c=new LanClient("127.0.0.1",port,false,"Demonologist",s->{})){
                b.ready();c.ready();
                onEdt(()->{LanWindowSmokeTest.button(frame,"Ready / Unready").doClick();return null;});
                // Server may process READY out of order; wait for all three readiness before clicking Start.
                until(()->{try{return onEdt(()->{
                    java.util.List<JTextArea> areas=new ArrayList<>();LanWindowSmokeTest.collect(frame.getContentPane(),JTextArea.class,areas);
                    // Host lobby still reports readiness to the client; UI logs the event.
                    return areas.stream().anyMatch(x->x.getText().contains("LOBBY|3|AI|3|WAITING"));
                });}catch(Exception e){return false;}},"three ready seats");
                onEdt(()->{LanWindowSmokeTest.button(frame,"Start Match").doClick();return null;});
                until(()->{try{return onEdt(()->LanWindowSmokeTest.button(frame,"Enter 3D World").isEnabled());}catch(Exception e){return false;}},"mission start and 3D button");
                onEdt(()->{LanWindowSmokeTest.button(frame,"Enter 3D World").doClick();return null;});
                until(()->{try{return onEdt(()->Arrays.stream(Window.getWindows()).anyMatch(w->w instanceof JFrame f&&f.isVisible()&&f.getContentPane() instanceof LanWorldPanel));}catch(Exception e){return false;}},"world viewport");
                JFrame world=onEdt(()->Arrays.stream(Window.getWindows()).filter(w->w instanceof JFrame f&&f.isVisible()&&f.getContentPane() instanceof LanWorldPanel).map(w->(JFrame)w).findFirst().orElseThrow());
                LanWorldPanel panel=(LanWorldPanel)world.getContentPane();
                until(()->{try{return onEdt(()->panel.visiblePeers()==2);}catch(Exception e){return false;}},"both remote avatars");
                Thread.sleep(850);
                BufferedImage screenshot=onEdt(()->{
                    BufferedImage shot=new BufferedImage(world.getWidth(),world.getHeight(),BufferedImage.TYPE_INT_RGB);
                    world.paint(shot.getGraphics());return shot;
                });
                int unique=(int)Arrays.stream(screenshot.getRGB(0,0,screenshot.getWidth(),screenshot.getHeight(),null,0,screenshot.getWidth())).distinct().count();
                if(args.length==1)ImageIO.write(screenshot,"png",new File(args[0]));
                if(unique<60)throw new AssertionError("rendered scene appears empty: "+unique);
                if(args.length==1)ImageIO.write(screenshot,"png",new File(args[0]));
                onEdt(()->{world.dispose();return null;});
                System.out.println("PASS: real LAN GUI launched shared 3D world, teammate bodies and textured view ("+unique+" colors)");
            }
        }finally{onEdt(()->{frame.dispose();return null;});}
        System.exit(0); // End the graphics smoke test even if AWT keeps a timer thread alive.
    }
}
