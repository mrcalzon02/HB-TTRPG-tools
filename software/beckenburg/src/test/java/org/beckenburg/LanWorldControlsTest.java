package org.beckenburg;

import javax.swing.SwingUtilities;
import java.awt.event.KeyEvent;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

/** Host-verified viewport actions, without legacy room controls or fabricated results. */
public final class LanWorldControlsTest {
    static final class Peer implements AutoCloseable {
        final BlockingQueue<String> events=new LinkedBlockingQueue<>();
        final LanClient client;
        Peer(int port,String name)throws Exception{
            client=new LanClient("127.0.0.1",port,false,name,events::offer);
        }
        String await(String prefix)throws Exception{
            long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(7);
            while(System.nanoTime()<deadline){
                String next=events.poll(150,TimeUnit.MILLISECONDS);
                if(next!=null&&next.startsWith(prefix))return next;
            }
            throw new AssertionError("missing host acknowledgment "+prefix);
        }
        @Override public void close(){client.close();}
    }
    static void check(boolean value,String text){if(!value)throw new AssertionError(text);}
    static void press(LanWorldPanel panel,int key)throws Exception{
        SwingUtilities.invokeAndWait(()->panel.keyPressed(new KeyEvent(panel,KeyEvent.KEY_PRESSED,
                System.currentTimeMillis(),0,key,KeyEvent.CHAR_UNDEFINED)));
    }
    public static void main(String[] args)throws Exception{
        try(LanHost host=new LanHost("127.0.0.1",0);
            Peer a=new Peer(host.port(),"Cleric");
            Peer b=new Peer(host.port(),"Observer");
            Peer c=new Peer(host.port(),"Demonologist")){
            a.client.ready();b.client.ready();c.client.ready();
            a.await("LOBBY|3|AI|3|WAITING");a.client.start();a.await("INFO|mission started");
            a.client.view3D();a.await("ACCEPT|VIEW3D");
            final LanWorldPanel[] instance=new LanWorldPanel[1];
            SwingUtilities.invokeAndWait(()->instance[0]=new LanWorldPanel(a.client));
            LanWorldPanel panel=instance[0];
            try{
                press(panel,KeyEvent.VK_2);check(panel.selectedTool()==LanCase.Tool.THERMOMETER,"hotkey 2 selects thermometer");
                press(panel,KeyEvent.VK_R);
                String measurement=a.await("ACCEPT|GEARUSE|THERMOMETER|");
                check(measurement.contains("Air ")&&!measurement.contains("INCONCLUSIVE"),
                    "held thermometer returns host-measured air temperature without an evidence verdict");
                press(panel,KeyEvent.VK_C);check(a.await("ACCEPT|WARD").contains("DEFENSIVE"),"ward updates host state");
                press(panel,KeyEvent.VK_B);
                check(a.await("REJECT|CLEANSE").contains("haunting anchor"),
                    "legacy host rejects a ritual from the van rather than the physical anchor");
                press(panel,KeyEvent.VK_3);check(panel.selectedTool()==LanCase.Tool.SPIRIT_BOX,"hotkey 3 selects spirit box");
                press(panel,KeyEvent.VK_X);check(a.await("ACCEPT|EXTRACT").contains("TEAM WITHDREW"),"3D viewport can extract from van");
                check(a.await("RESULT|RETREATED").contains("RETREATED"),"outcome synchronized");
            }finally{SwingUtilities.invokeAndWait(panel::close);}
            System.out.println("PASS: LAN 3D hotkeys dispatch real host-owned scan, ward, cleanse and extraction");
        }
    }
}
