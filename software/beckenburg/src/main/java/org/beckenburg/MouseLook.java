package org.beckenburg;

import javax.swing.SwingUtilities;
import java.awt.AWTException;
import java.awt.Component;
import java.awt.Cursor;
import java.awt.GraphicsEnvironment;
import java.awt.Point;
import java.awt.Robot;
import java.awt.Toolkit;
import java.awt.event.FocusEvent;
import java.awt.event.FocusListener;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.awt.image.BufferedImage;
import java.util.Objects;

/** Shared first-person pointer capture. Click once to look without holding a button.
 * Native pointer recentering prevents the edge of the window stopping the camera.
 * If desktop pointer warping is denied, pointer delta look still works until an edge.
 */
public final class MouseLook extends MouseAdapter implements FocusListener {
    public interface Delta { void moved(int dx, int dy); }
    private final Component view;
    private final Delta listener;
    private final Cursor originalCursor, hiddenCursor;
    private Robot robot;
    private boolean captured, hasPrevious;
    private int previousX, previousY;

    public MouseLook(Component view, Delta listener) {
        this.view=Objects.requireNonNull(view);
        this.listener=Objects.requireNonNull(listener);
        originalCursor=view.getCursor();
        Cursor invisible=originalCursor;
        if(!GraphicsEnvironment.isHeadless()) {
            try {
                BufferedImage blank=new BufferedImage(16,16,BufferedImage.TYPE_INT_ARGB);
                invisible=Toolkit.getDefaultToolkit().createCustomCursor(blank,new Point(0,0),"Hidden FPS cursor");
            } catch(RuntimeException ignored) { /* normal cursor is safer than an exception */ }
            try {robot=new Robot(view.getGraphicsConfiguration()==null?
                    GraphicsEnvironment.getLocalGraphicsEnvironment().getDefaultScreenDevice():
                    view.getGraphicsConfiguration().getDevice());}
            catch(AWTException|SecurityException ignored) { /* relative delta fallback */ }
        }
        hiddenCursor=invisible;
    }
    public boolean captured(){return captured;}
    /** The capture gesture must originate inside a visible, focused play viewport. */
    public void capture(){
        if(captured||!view.isShowing()||!view.isFocusOwner())return;
        captured=true;hasPrevious=false;
        view.setCursor(hiddenCursor);
        centerPointer();
    }
    public void release(){
        captured=false;hasPrevious=false;
        view.setCursor(originalCursor);
    }
    public void close(){release();}
    @Override public void mousePressed(MouseEvent event){
        if(event.getButton()!=MouseEvent.BUTTON1)return;
        view.requestFocusInWindow();
        // Focus is granted synchronously when already in this game panel. A second click
        // captures it on window managers that deliver focus after the first click.
        capture();
    }
    @Override public void mouseMoved(MouseEvent event){
        if(!captured)return;
        if(robot!=null&&view.isShowing()){
            int cx=view.getWidth()/2,cy=view.getHeight()/2;
            int dx=event.getX()-cx,dy=event.getY()-cy;
            if(dx!=0||dy!=0){applyDelta(dx,dy);centerPointer();}
        }else{
            if(hasPrevious)applyDelta(event.getX()-previousX,event.getY()-previousY);
            previousX=event.getX();previousY=event.getY();hasPrevious=true;
        }
    }
    @Override public void mouseDragged(MouseEvent event){mouseMoved(event);}
    @Override public void mouseExited(MouseEvent event){if(robot==null)release();}
    @Override public void focusGained(FocusEvent event) { /* click to regain capture */ }
    @Override public void focusLost(FocusEvent event){release();}
    private void applyDelta(int dx,int dy){
        // Drop single huge jumps from lost focus, window relocation or broken mouse warps.
        if(Math.abs(dx)>180||Math.abs(dy)>180)return;
        listener.moved(dx,dy);
    }
    private void centerPointer(){
        if(robot==null||!view.isShowing())return;
        try{
            Point p=new Point(view.getWidth()/2,view.getHeight()/2);
            SwingUtilities.convertPointToScreen(p,view);
            robot.mouseMove(p.x,p.y);
        }catch(IllegalStateException|SecurityException ex){robot=null;hasPrevious=false;}
    }
    /** The same pitch and sensitivity math is used by the solo, ghost and LAN views. */
    public static void rotate(SceneRenderer camera,int dx,int dy){
        Objects.requireNonNull(camera);
        camera.yaw+=dx*.004;
        camera.pitch=Math.max(-1.05,Math.min(1.05,camera.pitch-dy*.004));
    }
}
