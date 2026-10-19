package org.beckenburg;

import java.awt.Component;
import java.awt.Container;
import java.awt.GraphicsEnvironment;
import java.awt.Robot;
import java.awt.Toolkit;
import java.awt.Window;
import java.awt.Rectangle;
import java.awt.image.BufferedImage;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.concurrent.TimeUnit;
import javax.imageio.ImageIO;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.SwingUtilities;

/**
 * Loads the actual packaged Swing launcher, waits for the real menu and
 * opens the multiplayer UI. A splash-only process never counts as loaded.
 * Run on a desktop runner, not in headless synthetic graphics mode.
 */
public final class BeckenburgDesktopE2ETest {
    private static final Path OUTPUT=Path.of("build","e2e");
    private BeckenburgDesktopE2ETest(){}
    private static JButton button(Container container,String label){
        for(Component child:container.getComponents()){
            if(child instanceof JButton found&&label.equals(found.getText()))return found;
            if(child instanceof Container nested){
                JButton found=button(nested,label);
                if(found!=null)return found;
            }
        }
        return null;
    }
    private static JFrame launcher(){
        for(Window window:Window.getWindows())if(window instanceof JFrame frame
                &&frame.isShowing()&&frame.getTitle().startsWith("The Beckenburg Project"))
            return frame;
        return null;
    }
    private static JFrame multiplayer(){
        for(Window window:Window.getWindows())if(window instanceof LanLobbyWindow frame
                &&frame.isShowing())return frame;
        return null;
    }
    private static void capture(String label){
        try{
            Files.createDirectories(OUTPUT);
            if(!GraphicsEnvironment.isHeadless()){
                Rectangle bounds=new Rectangle(Toolkit.getDefaultToolkit().getScreenSize());
                BufferedImage screenshot=new Robot().createScreenCapture(bounds);
                ImageIO.write(screenshot,"png",OUTPUT.resolve(label+".png").toFile());
            }
        }catch(Exception failed){System.err.println("Screenshot unavailable: "+failed);}
    }
    private static <T> T waitFor(java.util.concurrent.Callable<T> check,long seconds)throws Exception{
        long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(seconds);
        while(System.nanoTime()<deadline){
            // The game is a real Swing event loop. Inspect components on the EDT.
            final Object[] slot=new Object[1];
            SwingUtilities.invokeAndWait(()->{
                try{slot[0]=check.call();}catch(Exception ex){throw new RuntimeException(ex);}
            });
            if(slot[0]!=null){
                @SuppressWarnings("unchecked") T value=(T)slot[0];
                return value;
            }
            Thread.sleep(80);
        }
        return null;
    }
    public static void main(String[] args)throws Exception{
        if(GraphicsEnvironment.isHeadless())throw new AssertionError("Actual desktop required");
        Files.createDirectories(OUTPUT);
        try{
            InvestigationGame.main(new String[0]);
            JFrame frame=waitFor(()->{
                JFrame game=launcher();
                return game!=null&&button(game.getContentPane(),"HOST / JOIN MULTIPLAYER")!=null
                    ?game:null;
            },30);
            if(frame==null)throw new AssertionError(
                "Startup never completed: menu's multiplayer button not available (check diagnostics log)");
            if(button(frame.getContentPane(),"DIAGNOSTICS")==null)
                throw new AssertionError("Diagnostics control missing from playable launcher");
            capture("01-loaded-menu");
            System.out.println("E2E PASS packaged startup and usable PSX-themed main menu");
            SwingUtilities.invokeAndWait(()->button(frame.getContentPane(),
                "HOST / JOIN MULTIPLAYER").doClick());
            JFrame lobby=waitFor(()->{
                JFrame result=multiplayer();
                return result!=null&&button(result.getContentPane(),"Host LAN")!=null
                    &&button(result.getContentPane(),"Join by IP")!=null
                    &&button(result.getContentPane(),"Ready / Unready")!=null
                    &&button(result.getContentPane(),"Start Match")!=null?result:null;
            },15);
            if(lobby==null)throw new AssertionError("Multiplayer lobby not interactable");
            capture("02-multiplayer-lobby");
            System.out.println("E2E PASS main-menu multiplayer handoff and actionable join/host lobby");
            SwingUtilities.invokeAndWait(()->{
                lobby.dispose();
                frame.dispose();
            });
            Files.writeString(OUTPUT.resolve("desktop-load.txt"),
                Instant.now()+" PASS actual packaged launcher, loading screen, main menu and multiplayer lobby\n");
            System.out.println("PASS Beckenburg packaged desktop startup and multiplayer UI");
            System.exit(0);
        }catch(Throwable error){
            capture("FAILED-desktop-startup");
            Files.writeString(OUTPUT.resolve("desktop-load.txt"),
                Instant.now()+" FAIL "+error+"\nphase="+BeckenburgDiagnostics.stageName()+"\n");
            error.printStackTrace();
            System.exit(1);
        }
    }
}
