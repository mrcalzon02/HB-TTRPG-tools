package org.beckenburg;

import javax.swing.*;
import java.awt.*;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import java.io.File;
import java.net.ServerSocket;
import java.util.*;
import java.util.concurrent.*;

/** Real ghost lobby to host-owned 3D viewport, with no developer-only render path. */
public final class LanGhostGuiTest {
    static <T> T edt(java.util.concurrent.Callable<T> c)throws Exception {
        Object[] box=new Object[1];Exception[] fail=new Exception[1];
        SwingUtilities.invokeAndWait(()->{try{box[0]=c.call();}catch(Exception e){fail[0]=e;}});
        if(fail[0]!=null)throw fail[0];@SuppressWarnings("unchecked")T out=(T)box[0];return out;
    }
    static void until(java.util.function.BooleanSupplier b,String label)throws Exception {
        long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(9);
        while(System.nanoTime()<deadline){if(b.getAsBoolean())return;Thread.sleep(70);}
        throw new AssertionError("timed out " + label);
    }
    public static void main(String[] args)throws Exception{
        if(GraphicsEnvironment.isHeadless())throw new AssertionError("graphical host required");
        try(LanHost host=new LanHost("127.0.0.1",0);
            LanClient h1=new LanClient("127.0.0.1",host.port(),false,"Cleric",s->{});
            LanClient h2=new LanClient("127.0.0.1",host.port(),false,"Observer",s->{});
            LanClient h3=new LanClient("127.0.0.1",host.port(),false,"Demonologist",s->{})){
            LanLobbyWindow ghost=edt(()->{
                LanLobbyWindow lobby=new LanLobbyWindow();
                java.util.List<JTextField> txt=new ArrayList<>();LanWindowSmokeTest.collect(lobby.getContentPane(),JTextField.class,txt);
                txt.stream().filter(x->x.getText().equals("27717")).findFirst().orElseThrow().setText(Integer.toString(host.port()));
                java.util.List<JComboBox> combos=new ArrayList<>();LanWindowSmokeTest.collect(lobby.getContentPane(),JComboBox.class,combos);
                combos.stream().filter(x->x.getItemCount()==2&&"Ghost".equals(x.getItemAt(1))).findFirst().orElseThrow().setSelectedIndex(1);
                lobby.setVisible(true);LanWindowSmokeTest.button(lobby,"Join IP").doClick();return lobby;
            });
            try{
                until(()->{try{return edt(()->LanWindowSmokeTest.button(ghost,"Ready / Unready").isEnabled());}catch(Exception e){return false;}},"ghost connected");
                h1.ready();h2.ready();h3.ready();
                edt(()->{LanWindowSmokeTest.button(ghost,"Ready / Unready").doClick();return null;});
                // Readiness runs asynchronously; only trigger start once ghost appears ready in the lobby log.
                until(()->{try{return edt(()->{
                    java.util.List<JTextArea> logs=new ArrayList<>();LanWindowSmokeTest.collect(ghost.getContentPane(),JTextArea.class,logs);
                    return logs.stream().anyMatch(x->x.getText().contains("LOBBY|3|HUMAN|4|WAITING"));
                });}catch(Exception e){return false;}},"lobby ready");
                h1.start();
                until(()->{try{return edt(()->LanWindowSmokeTest.button(ghost,"Enter 3D World").isEnabled());}catch(Exception e){return false;}},"ghost 3D enable");
                edt(()->{LanWindowSmokeTest.button(ghost,"Enter 3D World").doClick();return null;});
                until(()->{try{return edt(()->Arrays.stream(Window.getWindows()).anyMatch(w->w instanceof JFrame f&&f.isVisible()&&f.getContentPane() instanceof LanGhostPanel));}catch(Exception e){return false;}},"ghost scene");
                JFrame world=edt(()->Arrays.stream(Window.getWindows()).filter(w->w instanceof JFrame f&&f.isVisible()&&f.getContentPane() instanceof LanGhostPanel).map(w->(JFrame)w).findFirst().orElseThrow());
                LanGhostPanel panel=(LanGhostPanel)world.getContentPane();
                // Repeated Enter 3D must focus the existing ghost scene, never dereference a hunter-only panel.
                edt(()->{LanWindowSmokeTest.button(ghost,"Enter 3D World").doClick();return null;});
                if(!world.isDisplayable()||world.getContentPane()!=panel)
                    throw new AssertionError("second ghost 3D request replaced or closed the spectral viewport");
                until(()->{try{return edt(()->panel.ghostRoom()==4);}catch(Exception e){return false;}},"spectral host position");
                Thread.sleep(600);
                BufferedImage shot=edt(()->{BufferedImage im=new BufferedImage(world.getWidth(),world.getHeight(),BufferedImage.TYPE_INT_RGB);world.paint(im.getGraphics());return im;});
                int unique=(int)Arrays.stream(shot.getRGB(0,0,shot.getWidth(),shot.getHeight(),null,0,shot.getWidth())).distinct().count();
                if(unique<75)throw new AssertionError("ghost 3D art missing, colors="+unique);
                if(args.length==1)ImageIO.write(shot,"png",new File(args[0]));
                edt(()->{world.dispose();return null;});
                System.out.println("PASS: real 4-seat ghost lobby opens spectral rendered 3D view with host pose ("+unique+" colors)");
            }finally{edt(()->{ghost.dispose();return null;});}
        }
        System.exit(0);
    }
}
