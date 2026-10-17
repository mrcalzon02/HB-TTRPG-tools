package org.beckenburg;

import javax.swing.*;
import java.awt.*;
import java.util.ArrayList;
import java.util.List;

/** Separately executable on xvfb or a real display: recovery permits rejoining without restart. */
public final class LanLobbyReconnectGuiTest {
    static void ok(boolean yes,String label){if(!yes)throw new AssertionError(label);}
    static String status(JFrame frame){
        List<JLabel> labels=new ArrayList<>();
        LanWindowSmokeTest.collect(frame.getContentPane(),JLabel.class,labels);
        return labels.stream().map(JLabel::getText)
            .filter(x->x.startsWith("Seat ")||x.startsWith("Disconnected")).findFirst().orElse("");
    }
    static void await(java.util.function.BooleanSupplier ready,String label)throws Exception {
        long until=System.nanoTime()+java.util.concurrent.TimeUnit.SECONDS.toNanos(7);
        while(System.nanoTime()<until){
            if(LanGhostGuiTest.edt(()->ready.getAsBoolean()))return;
            Thread.sleep(70);
        }
        throw new AssertionError("timed out: "+label);
    }
    static void join(JFrame frame,int port)throws Exception {
        LanGhostGuiTest.edt(()->{
            List<JTextField> all=new ArrayList<>();
            LanWindowSmokeTest.collect(frame.getContentPane(),JTextField.class,all);
            all.stream().filter(x->x.getColumns()==5).findFirst().orElseThrow()
                .setText(Integer.toString(port));
            LanWindowSmokeTest.button(frame,"Join IP").doClick();
            return null;
        });
    }
    public static void main(String[] args)throws Exception {
        if(GraphicsEnvironment.isHeadless())throw new AssertionError("graphical host required");
        LanLobbyWindow gui=LanGhostGuiTest.edt(()->{LanLobbyWindow f=new LanLobbyWindow();f.setVisible(true);return f;});
        try{
            try(LanHost first=new LanHost("127.0.0.1",0)){
                join(gui,first.port());
                await(()->status(gui).startsWith("Seat H1"),"initial UI connection");
                first.close();
                await(()->status(gui).startsWith("Disconnected"),"closed server state");
                ok(!LanWindowSmokeTest.button(gui,"Ready / Unready").isEnabled(),
                    "stale session controls disabled");
            }
            try(LanHost second=new LanHost("127.0.0.1",0)){
                join(gui,second.port());
                await(()->status(gui).startsWith("Seat H1"),"rejoined new host");
                ok(LanWindowSmokeTest.button(gui,"Ready / Unready").isEnabled(),
                    "fresh session controls restored");
            }
        }finally{LanGhostGuiTest.edt(()->{gui.dispose();return null;});}
        System.out.println("PASS: Swing client recovers from server EOF and joins a replacement host");
        System.exit(0);
    }
}
