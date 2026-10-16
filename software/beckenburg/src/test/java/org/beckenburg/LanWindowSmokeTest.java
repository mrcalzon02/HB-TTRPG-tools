package org.beckenburg;

import javax.swing.*;
import java.awt.*;
import java.net.ServerSocket;
import java.util.ArrayList;
import java.util.List;

/** Execute separately under a real graphical desktop or xvfb, not headless build.sh. */
public final class LanWindowSmokeTest {
    static <T extends Component> void collect(Component c,Class<T> type,List<T> into){
        if(type.isInstance(c))into.add(type.cast(c));
        if(c instanceof Container parent)for(Component child:parent.getComponents())collect(child,type,into);
    }
    static JButton button(JFrame frame,String label){
        List<JButton> all=new ArrayList<>();collect(frame.getContentPane(),JButton.class,all);
        return all.stream().filter(b->label.equals(b.getText())).findFirst().orElseThrow();
    }
    public static void main(String[] args)throws Exception {
        if(GraphicsEnvironment.isHeadless())throw new AssertionError("requires graphical display");
        int port;try(ServerSocket ep=new ServerSocket(0)){port=ep.getLocalPort();}
        final LanLobbyWindow[] frame={null};
        SwingUtilities.invokeAndWait(()->{
            frame[0]=new LanLobbyWindow();
            List<JTextField> inputs=new ArrayList<>();collect(frame[0].getContentPane(),JTextField.class,inputs);
            inputs.stream().filter(t->"27717".equals(t.getText())).findFirst().orElseThrow().setText(Integer.toString(port));
            frame[0].setVisible(true);
            button(frame[0],"Host LAN").doClick();
        });
        long end=System.currentTimeMillis()+6000;boolean connected=false;
        while(System.currentTimeMillis()<end){
            final boolean[] ready={false};
            SwingUtilities.invokeAndWait(()->{
                List<JLabel> labels=new ArrayList<>();collect(frame[0].getContentPane(),JLabel.class,labels);
                ready[0]=labels.stream().anyMatch(l->l.getText().contains("Seat H1"));
            });
            if(ready[0]){connected=true;break;}
            Thread.sleep(70);
        }
        SwingUtilities.invokeAndWait(()->{
            if(!button(frame[0],"Ready / Unready").isEnabled())throw new AssertionError("ready unavailable");
            if(!button(frame[0],"Start Match").isEnabled())throw new AssertionError("host start unavailable");
            if(button(frame[0],"Ghost Action").isEnabled())throw new AssertionError("hunter UI exposes ghost power");
            frame[0].dispose();
        });
        if(!connected)throw new AssertionError("LAN UI could not host and claim first hunter seat");
        System.out.println("PASS: Swing LAN host setup, live socket host, seat H1, role-correct controls, clean close");
    }
}
