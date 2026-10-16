package org.beckenburg;

import javax.swing.*;
import java.awt.*;
import java.awt.event.InputEvent;
import java.util.concurrent.atomic.AtomicInteger;

/** Real pointer capture/recenter/focus safety, deliberately independent of game timers. */
public final class MouseLookGuiTest {
    private static void check(boolean value,String why){if(!value)throw new AssertionError(why);}
    private static void onEdt(Runnable r)throws Exception{SwingUtilities.invokeAndWait(r);}
    public static void main(String[] args)throws Exception{
        if(GraphicsEnvironment.isHeadless())throw new AssertionError("graphical desktop required");
        JFrame frame=new JFrame("Beckenburg Mouse Capture Test");
        JPanel panel=new JPanel();panel.setFocusable(true);
        AtomicInteger total=new AtomicInteger();
        MouseLook look=new MouseLook(panel,(dx,dy)->total.addAndGet(Math.abs(dx)+Math.abs(dy)));
        onEdt(()->{
            panel.addMouseListener(look);panel.addMouseMotionListener(look);panel.addFocusListener(look);
            frame.setContentPane(panel);frame.setSize(520,360);frame.setLocation(120,90);
            frame.setDefaultCloseOperation(JFrame.DISPOSE_ON_CLOSE);frame.setVisible(true);
            panel.requestFocusInWindow();
        });
        try {
            Robot robot=new Robot();robot.setAutoDelay(50);robot.waitForIdle();
            Point center=new Point();
            onEdt(()->{
                Point pos=panel.getLocationOnScreen();center.setLocation(pos.x+panel.getWidth()/2,pos.y+panel.getHeight()/2);
            });
            robot.mouseMove(center.x,center.y);robot.mousePress(InputEvent.BUTTON1_DOWN_MASK);
            robot.mouseRelease(InputEvent.BUTTON1_DOWN_MASK);robot.waitForIdle();
            check(look.captured(),"click should capture pointer without hold");
            robot.mouseMove(center.x+44,center.y+20);robot.waitForIdle();
            check(total.get()>0,"motion after button release must change camera");
            onEdt(()->look.focusLost(new java.awt.event.FocusEvent(panel,java.awt.event.FocusEvent.FOCUS_LOST)));
            check(!look.captured(),"lost focus releases cursor");
            int previous=total.get();
            robot.mouseMove(center.x+70,center.y+20);robot.waitForIdle();
            check(total.get()==previous,"uncaptured motion may not change camera");
            System.out.println("PASS: real click-to-capture, free mouse look and focus-loss cursor restoration");
        }finally{onEdt(()->{look.close();frame.dispose();});}
        System.exit(0);
    }
}
