package org.beckenburg;

import javax.swing.JPanel;
import java.awt.event.FocusEvent;
import java.awt.event.MouseEvent;
import java.util.concurrent.atomic.AtomicInteger;

/** Headless safety checks: motion without capture is inert; angles stay bounded. */
public final class MouseLookTest {
    private static void check(boolean ok,String reason){if(!ok)throw new AssertionError(reason);}
    public static void main(String[] args){
        SceneRenderer camera=new SceneRenderer();
        double oldYaw=camera.yaw;
        MouseLook.rotate(camera,100,-100);
        check(Math.abs(camera.yaw-(oldYaw+.4))<.0001,"horizontal mouse sensitivity");
        check(camera.pitch>0,"moving mouse up raises gaze");
        MouseLook.rotate(camera,0,-1000);
        check(camera.pitch==1.05,"upper pitch clamp");
        MouseLook.rotate(camera,0,1000);
        check(camera.pitch==-1.05,"lower pitch clamp");
        JPanel panel=new JPanel();
        AtomicInteger observed=new AtomicInteger();
        MouseLook look=new MouseLook(panel,(dx,dy)->observed.addAndGet(Math.abs(dx)+Math.abs(dy)));
        look.mouseMoved(new MouseEvent(panel,MouseEvent.MOUSE_MOVED,0,0,10,11,0,false));
        check(observed.get()==0,"free desktop pointer must not rotate game view");
        look.capture();check(!look.captured(),"invisible component may not lock cursor");
        look.focusLost(new FocusEvent(panel,FocusEvent.FOCUS_LOST));
        check(!look.captured(),"focus loss releases capture");
        look.close();check(panel.getCursor()!=null,"restored cursor");
        System.out.println("PASS: mouse-look directions, clamps, uncaptured safety and focus release");
    }
}
