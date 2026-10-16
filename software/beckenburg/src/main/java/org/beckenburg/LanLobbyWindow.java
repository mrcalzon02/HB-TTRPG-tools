package org.beckenburg;

import javax.swing.*;
import java.awt.*;
import java.io.IOException;

/** Compact LAN lobby and mode launcher; both hunter and ghost inhabit host-owned 3D views. */
public final class LanLobbyWindow extends JFrame {
    private final JTextField ip=new JTextField("127.0.0.1",13),port=new JTextField("27717",5),name=new JTextField("Investigator",11);
    private final JComboBox<String> role=new JComboBox<>(new String[]{"Hunter","Ghost"});
    private final JTextArea log=new JTextArea(12,52);
    private final JLabel status=new JLabel("Not connected");
    private final JSpinner target=new JSpinner(new SpinnerNumberModel(4,0,HouseMap.ROOM_COUNT-1,1));
    private final JComboBox<GhostDomain.Action> action=new JComboBox<>(GhostDomain.Action.values());
    private final JComboBox<LanCase.Tool> instrument=new JComboBox<>(LanCase.Tool.values());
    private final JButton scan=new JButton("Scan"),ward=new JButton("Ward"),cleanse=new JButton("Ritual"),extract=new JButton("Extract");
    private final JLabel caseStatus=new JLabel("Case: not started"),teamStatus=new JLabel("Team: awaiting session");
    private LanHost hosted;
    private LanClient connection;
    private int myRoom=HouseMap.EXTRACTION_ROOM;
    private boolean busy,missionRunning,worldMode;
    private LanWorldPanel worldView;
    private LanGhostPanel ghostView;
    private JFrame worldFrame;
    private final JButton enter3D=new JButton("Enter 3D World");
    private final JButton ready=new JButton("Ready / Unready"),start=new JButton("Start Match"),move=new JButton("Move Room"),use=new JButton("Ghost Action");

    public LanLobbyWindow(){
        super("Beckenburg — LAN House Alpha 1.1");setDefaultCloseOperation(DISPOSE_ON_CLOSE);
        JPanel controls=new JPanel(new FlowLayout(FlowLayout.LEFT,5,5));
        controls.add(new JLabel("IP"));controls.add(ip);controls.add(new JLabel("Port"));controls.add(port);
        controls.add(new JLabel("Name"));controls.add(name);controls.add(role);
        JButton host=new JButton("Host LAN"),join=new JButton("Join IP");controls.add(host);controls.add(join);
        JPanel commands=new JPanel(new FlowLayout(FlowLayout.LEFT,6,4));
        commands.add(ready);commands.add(start);commands.add(new JLabel("Room"));commands.add(target);
        commands.add(move);commands.add(instrument);commands.add(scan);commands.add(ward);
        commands.add(cleanse);commands.add(extract);commands.add(action);commands.add(use);commands.add(enter3D);
        log.setEditable(false);log.setFont(new Font(Font.MONOSPACED,Font.PLAIN,12));
        log.setLineWrap(true);log.setWrapStyleWord(true);
        JPanel info=new JPanel(new GridLayout(3,1));info.add(status);info.add(caseStatus);info.add(teamStatus);
        JPanel top=new JPanel(new BorderLayout());top.add(controls,BorderLayout.NORTH);top.add(info,BorderLayout.SOUTH);
        add(top,BorderLayout.NORTH);add(new JScrollPane(log),BorderLayout.CENTER);add(commands,BorderLayout.SOUTH);
        host.addActionListener(e->connect(true));join.addActionListener(e->connect(false));
        ready.addActionListener(e->send("READY"));start.addActionListener(e->send("START"));
        move.addActionListener(e->action(() -> connection.move((int)target.getValue())));
        use.addActionListener(e->action(() -> connection.ghost((GhostDomain.Action)action.getSelectedItem(),(int)target.getValue())));
        scan.addActionListener(e->action(() -> connection.scan((LanCase.Tool)instrument.getSelectedItem())));
        ward.addActionListener(e->action(() -> connection.ward()));
        cleanse.addActionListener(e->action(() -> connection.cleanse()));
        extract.addActionListener(e->action(() -> connection.extract()));
        enter3D.addActionListener(e->open3D());
        setCommandEnabled(false);pack();setMinimumSize(new Dimension(810,370));setLocationRelativeTo(null);
        addWindowListener(new java.awt.event.WindowAdapter(){@Override public void windowClosed(java.awt.event.WindowEvent e){if(worldFrame!=null)worldFrame.dispose();if(connection!=null)connection.close();if(hosted!=null)hosted.close();}});
    }
    @FunctionalInterface private interface Command {void send()throws IOException;}
    private void action(Command command){try{if(connection==null)throw new IOException("not connected");command.send();}
        catch(Exception ex){log.append("Send failed: "+ex.getMessage()+"\n");}}
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
                    status.setText("Seat "+client.seat()+" — room case + shared house");
                    setCommandEnabled(true);log.append("Connected. Ready when your team is assembled.\n");});
            }catch(Exception ex){if(newHost!=null)newHost.close();String msg=ex.getMessage();SwingUtilities.invokeLater(()->{busy=false;status.setText("Connection failed");log.append("Error: "+msg+"\n");});}
        },"beckenburg-connect");task.setDaemon(true);task.start();
    }
    private void open3D(){
        if(connection==null||!missionRunning)return;
        if(worldFrame!=null&&worldFrame.isDisplayable()){worldFrame.toFront();worldView.requestFocusInWindow();return;}
        boolean ghost="GHOST".equals(connection.seat());
        try{if(ghost)connection.viewGhost3D();else connection.view3D();}
        catch(IOException ex){log.append("3D start failed: "+ex.getMessage()+"\n");return;}
        worldMode=true;setCommandEnabled(true);
        JComponent active;
        if(ghost){ghostView=new LanGhostPanel(connection);active=ghostView;}
        else {worldView=new LanWorldPanel(connection);active=worldView;}
        worldFrame=new JFrame(ghost?"Beckenburg — LAN Spectral Ghost":"Beckenburg — Shared LAN House");
        worldFrame.setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
        worldFrame.setContentPane(active);
        worldFrame.pack();worldFrame.setLocationRelativeTo(this);
        worldFrame.addWindowListener(new java.awt.event.WindowAdapter(){
            @Override public void windowClosed(java.awt.event.WindowEvent e){
                if(worldView!=null){worldView.close();worldView=null;}
                if(ghostView!=null){ghostView.close();ghostView=null;}
                worldFrame=null;
            }
        });
        worldFrame.setVisible(true);active.requestFocusInWindow();
        // The host sends an immediate snapshot after VIEW3D. Subsequent frames update this viewport.
    }
    private void receive(String event){
        if(worldFrame!=null&&worldFrame.isDisplayable()){
            if(worldView!=null)worldView.onEvent(event);
            if(ghostView!=null)ghostView.onEvent(event);
        }
        if(event.startsWith("INFO|mission started")){missionRunning=true;setCommandEnabled(true);}
        if(event.startsWith("RESULT|")||event.startsWith("INFO|match stopped")){missionRunning=false;setCommandEnabled(true);}
        if(event.startsWith("STATE|")){
            var p=LanProtocol.parts(event);if(p.size()>=4)try{myRoom=Integer.parseInt(p.get(2));}catch(NumberFormatException ignored){}
            status.setText("Room: "+new HouseMap().roomName(myRoom)+"  |  tick "+p.get(1)+"  |  energy "+p.get(4));
        }else if(event.startsWith("TEAMMAP|")){
            var parts=LanProtocol.parts(event);
            if(parts.size()==4){HouseMap layout=new HouseMap();
                teamStatus.setText("Hunters: "+layout.roomName(Integer.parseInt(parts.get(1)))+" / "+layout.roomName(Integer.parseInt(parts.get(2)))+" / "+layout.roomName(Integer.parseInt(parts.get(3))));
            }
        }else if(event.startsWith("PROGRESS|")){
            var fields=LanProtocol.parts(event);
            if(fields.size()==8)caseStatus.setText("Health "+fields.get(1)+"  Fear "+fields.get(2)+"  Wards "+fields.get(3)+"  Evidence "+fields.get(4)+"/3  Circle "+fields.get(5)+"  Ritual "+fields.get(6)+"/45  "+fields.get(7));
        }else{log.append(event+"\n");log.setCaretPosition(log.getDocument().getLength());}
    }
    private void setCommandEnabled(boolean available){
        ready.setEnabled(available);
        start.setEnabled(available&&connection!=null&&"H1".equals(connection.seat()));
        move.setEnabled(available&&!worldMode&&connection!=null&&!"GHOST".equals(connection.seat()));
        use.setEnabled(available&&connection!=null&&"GHOST".equals(connection.seat()));
        boolean hunter=available&&connection!=null&&!"GHOST".equals(connection.seat());
        scan.setEnabled(hunter);ward.setEnabled(hunter);cleanse.setEnabled(hunter);extract.setEnabled(hunter);
        instrument.setEnabled(hunter);
        enter3D.setEnabled(available&&missionRunning&&connection!=null);
    }
    private void send(String frame){try{if(connection==null)throw new IOException("not connected");connection.send(frame);}
        catch(Exception e){log.append("Send failed: "+e.getMessage()+"\n");}}
}
