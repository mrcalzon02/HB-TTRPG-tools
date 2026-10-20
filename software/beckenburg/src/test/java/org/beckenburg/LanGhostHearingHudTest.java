package org.beckenburg;

import javax.swing.SwingUtilities;
import java.awt.image.BufferedImage;

/** The spectral hearing caption works when audio is muted and ages out on a host tick. */
public final class LanGhostHearingHudTest {
    static void ok(boolean value,String label){if(!value)throw new AssertionError(label);}
    public static void main(String[] args)throws Exception{
        System.setProperty("beckenburg.audio.mute","true");
        try(LanHost server=new LanHost("127.0.0.1",0);
            LanClient ghost=new LanClient("127.0.0.1",server.port(),true,"Spirit",s->{})){
            SwingUtilities.invokeAndWait(()->{
                LanGhostPanel panel=new LanGhostPanel(ghost);panel.setSize(850,555);
                try{
                    panel.onEvent(new LanGhostSpatial(new HouseMap(),4).frame(17));
                    panel.onEvent("GHEAR|DOOR|LEFT|NEAR|17");
                    ok(panel.currentHearing().contains("DOOR MOVEMENT")
                       &&panel.currentHearing().contains("LEFT"),"directional sound is visible");
                    BufferedImage image=new BufferedImage(850,555,BufferedImage.TYPE_INT_RGB);
                    var graphics=image.createGraphics();panel.paint(graphics);graphics.dispose();
                    panel.onEvent(new LanGhostSpatial(new HouseMap(),4).frame(40));
                    ok(panel.currentHearing().isEmpty(),"cue expired");
                    panel.onEvent("GHEAR|DOOR|LEFT|NEAR|17");
                    ok(panel.currentHearing().isEmpty(),"old delayed cue ignored");
                }finally{panel.close();}
            });
        }
        System.out.println("PASS: mute-safe spectral sound overlay, EDT and stale-event expiry");
    }
}
