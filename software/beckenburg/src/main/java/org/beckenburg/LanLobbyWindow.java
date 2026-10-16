package org.beckenburg;

import javax.swing.*;
import java.awt.*;
import java.io.IOException;

/** Functional Swing controls for TCP direct-IP host/join and authoritative room actions.
 * Does not claim this lobby synchronizes rendered first-person bodies yet.
 */
public final class LanLobbyWindow extends JFrame {
    private final JTextField ip=new JTextField("127.0.0.1",13),port=new JTextField("27717",5),name=new JTextField("Investigator",11);
    private final JComboBox<String> role=new JComboBox<>(new String[]{"Hunter","Ghost"});
    private final JTextArea log=new JTextArea(12,52);
    private final JLabel status=new JLabel("Not connected");
    private final JSpinner target=new JSpinner(new SpinnerNumberModel(4,0,HouseMap.ROOM_COUNT-1,1));
    private final JComboBox<GhostDomain.Action> action=new JComboBox<>(GhostDomain.Action.values());
    private LanHost hosted;
    private LanClient connection;
    private int myRoom=HouseMap.EXTRACTION_ROOM;
    private boolean busy;
    private final JButton ready=new JButton("Ready / Unready"),start=new JButton("Start Match"),move=new JButton("Move Room"),use=new JButton("Ghost Action");

    public LanLobbyWindow(){
        super("Beckenburg — Local LAN Room-Simulation Alpha");setDefaultCloseOperation(DISPOSE_ON_CLOSE);
        JPanel controls=new JPanel(new FlowLayout(FlowLayout.LEFT,5,5));
        controls.add(new JLabel("IP"));controls.add(ip);controls.add(new JLabel("Port"));controls.add(port);
        controls.add(new JLabel("Name"));controls.add(name);controls.add(role);
        JButton host=new JButton("Host LAN"),join=new JButton("Join IP");controls.add(host);controls.add(join);
        JPanel commands=new JPanel(new FlowLayout(FlowLayout.LEFT,6,4));
        commands.add(ready);commands.add(start);commands.add(new JLabel("Room"));commands.add(target);
        commands.add(move);commands.add(action);commands.add(use);
        log.setEditable(false);log.setFont(new Font(Font.MONOSPACED,Font.PLAIN,12));
        log.setLineWrap(true);log.setWrapStyleWord(true);
        JPanel top=new JPanel(new BorderLayout());top.add(controls,BorderLayout.NORTH);top.add(status,BorderLayout.SOUTH);
        add(top,BorderLayout.NORTH);add(new JScrollPane(log),BorderLayout.CENTER);add(commands,BorderLayout.SOUTH);
        host.addActionListener(e->connect(true));join.addActionListener(e->connect(false));
        ready.addActionListener(e->send("READY"));start.addActionListener(e->send("START"));
        move.addActionListener(e->send("MOVE|"+target.getValue()+"|"+(++sequence)));
        use.addActionListener(e->send("GHOST|"+action.getSelectedItem()+"|"+target.getValue()+"|"+(++sequence)));
        setCommandEnabled(false);pack();setMinimumSize(new Dimension(810,370));setLocationRelativeTo(null);
        addWindowListener(new java.awt.event.WindowAdapter(){@Override public void windowClosed(java.awt.event.WindowEvent e){if(connection!=null)connection.close();if(hosted!=null)hosted.close();}});
    }
    private long sequence;
    private void connect(boolean localHost){
        if(busy||connection!=null)return;busy=true;status.setText("Connecting...");
        String hostname=ip.getText().trim(),nickname=name.getText();String p=port.getText().trim();
        boolean ghost=role.getSelectedIndex()==1;
        Thread task=new Thread(()->{
            LanHost newHost=null;
            try{
                int portNumber=LanProtocol.integer(p,1,65535);
                if(localHost){newHost=new LanHost("0.0.0.0",portNumber);}
                LanClient client=new LanClient(localHost?"127.0.0.1":hostname,portNumber,localHost?false:ghost,nickname,
                    frame->SwingUtilities.invokeLater(()->receive(frame)));
                final LanHost own=newHost;
                SwingUtilities.invokeLater(()->{hosted=own;connection=client;busy=false;
                    status.setText("Seat "+client.seat()+" — room-level LAN test");
                    setCommandEnabled(true);log.append("Connected. Ready when your team is assembled.\n");});
            }catch(Exception ex){if(newHost!=null)newHost.close();String msg=ex.getMessage();SwingUtilities.invokeLater(()->{busy=false;status.setText("Connection failed");log.append("Error: "+msg+"\n");});}
        },"beckenburg-connect");task.setDaemon(true);task.start();
    }
    private void receive(String event){
        if(event.startsWith("STATE|")){
            var p=LanProtocol.parts(event);if(p.size()>=4)try{myRoom=Integer.parseInt(p.get(2));}catch(NumberFormatException ignored){}
            status.setText("Room: "+new HouseMap().roomName(myRoom)+"  |  tick "+p.get(1)+"  |  energy "+p.get(4));
        }else{log.append(event+"\n");log.setCaretPosition(log.getDocument().getLength());}
    }
    private void setCommandEnabled(boolean available){
        ready.setEnabled(available);
        start.setEnabled(available&&connection!=null&&"H1".equals(connection.seat()));
        move.setEnabled(available&&connection!=null&&!"GHOST".equals(connection.seat()));
        use.setEnabled(available&&connection!=null&&"GHOST".equals(connection.seat()));
    }
    private void send(String frame){try{if(connection==null)throw new IOException("not connected");connection.send(frame);}
        catch(Exception e){log.append("Send failed: "+e.getMessage()+"\n");}}
}
