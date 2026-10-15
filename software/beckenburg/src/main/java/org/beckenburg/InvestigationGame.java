package org.beckenburg;

import javax.swing.*;
import java.awt.*;
import java.awt.event.*;
import java.io.IOException;
import java.util.HashSet;
import java.util.Set;

/** Beckenburg local solo investigation alpha. No networking or player-ghost control claim. */
public final class InvestigationGame {
    private final JFrame window=new JFrame("The Beckenburg Project — Expedition Alpha");
    private final JPanel cards=new JPanel(new CardLayout());
    private final JPanel menu=new JPanel(new GridBagLayout());
    private final ProfileStore profile=new ProfileStore(ProfileStore.defaultPath());
    private final JLabel account=new JLabel();
    private JComboBox<InvestigationSession.Role> rolePicker;
    private GamePanel game;
    private int caseNumber;

    private InvestigationGame(){
        try{profile.load();}catch(IOException ex){JOptionPane.showMessageDialog(null,
            "Profile could not be loaded. Existing file was not overwritten: "+ex.getMessage(),
            "Profile error",JOptionPane.WARNING_MESSAGE);}
        buildMenu();
        cards.add(menu,"menu");window.setContentPane(cards);
        window.setDefaultCloseOperation(WindowConstants.EXIT_ON_CLOSE);
        window.setSize(1060,725);window.setMinimumSize(new Dimension(760,510));
        window.setLocationRelativeTo(null);window.setVisible(true);
    }
    private void buildMenu(){
        menu.setBackground(new Color(19,21,28));
        JPanel inner=new JPanel();inner.setLayout(new BoxLayout(inner,BoxLayout.Y_AXIS));
        inner.setBackground(new Color(28,31,39));inner.setBorder(BorderFactory.createEmptyBorder(25,40,25,40));
        JLabel title=new JLabel("THE BECKENBURG PROJECT",SwingConstants.CENTER);
        title.setFont(new Font(Font.SERIF,Font.BOLD,34));title.setForeground(new Color(223,201,151));
        JLabel tagline=new JLabel("THREE HUNTERS. ONE HAUNTING. RECLAIM THE LOST.",SwingConstants.CENTER);
        tagline.setForeground(new Color(169,177,196));tagline.setFont(new Font(Font.MONOSPACED,Font.PLAIN,12));
        JLabel status=new JLabel("LOCAL SOLO ALPHA   ·   JAVA 17   ·   PLAYSTATION-ERA 3D",SwingConstants.CENTER);
        status.setForeground(new Color(170,145,120));
        rolePicker=new JComboBox<>(InvestigationSession.Role.values());
        rolePicker.setMaximumSize(new Dimension(330,35));
        JLabel selected=new JLabel("Investigator discipline",SwingConstants.CENTER);
        selected.setForeground(new Color(225,226,230));
        JButton begin=button("BEGIN SOLO INVESTIGATION");
        JButton guide=button("FIELD MANUAL / CONTROLS");
        JButton quit=button("EXIT");
        account.setForeground(new Color(172,204,183));
        account.setHorizontalAlignment(SwingConstants.CENTER);
        inner.add(title);inner.add(Box.createVerticalStrut(8));inner.add(tagline);
        inner.add(Box.createVerticalStrut(15));inner.add(status);inner.add(Box.createVerticalStrut(18));
        inner.add(selected);inner.add(Box.createVerticalStrut(6));inner.add(rolePicker);
        for(JButton b:new JButton[]{begin,guide,quit}){inner.add(Box.createVerticalStrut(9));inner.add(b);}
        inner.add(Box.createVerticalStrut(20));inner.add(account);
        JLabel limitation=new JLabel("LAN, human ghosts and nine finished locations are future milestones.",SwingConstants.CENTER);
        limitation.setForeground(new Color(147,154,165));inner.add(Box.createVerticalStrut(12));inner.add(limitation);
        for(Component c:inner.getComponents())if(c instanceof JComponent jc)jc.setAlignmentX(Component.CENTER_ALIGNMENT);
        menu.add(inner);
        begin.addActionListener(e->begin());guide.addActionListener(e->JOptionPane.showMessageDialog(window,
            "WASD move • Shift sprint • Arrow keys / left-drag look • F flashlight • E doors\n"+
            "1 EMF  •  2 Thermometer  •  3 Spirit Box  •  R scan\n"+
            "C defensive or ritual ward (2 per case)  •  B cleanse anchor\n"+
            "J toggle evidence journal  •  M toggle floor plan  •  X extract at entry\n"+
            "Escape pauses and offers return to castle.\n\n"+
            "Search every room: readings strengthen near the Spirit's anchor.\n"+
            "Record three types of evidence, place a ward in the anchor room, cleanse,\n"+
            "then return to the CELLAR entry to extract. You can retreat earlier.\n"+
            "An AI Spirit can roam, manifest and inflict incremental damage.",
            "Field Manual",JOptionPane.INFORMATION_MESSAGE));
        quit.addActionListener(e->window.dispose());refreshAccount();
    }
    private static JButton button(String s){
        JButton b=new JButton(s);b.setMaximumSize(new Dimension(330,38));
        b.setFocusPainted(true);return b;
    }
    private void refreshAccount(){account.setText("CASTLE LEDGER     £"+profile.currency()+"       XP "+profile.experience());}
    private void begin(){
        if(game!=null){game.close();cards.remove(game);game=null;}
        caseNumber++;
        game=new GamePanel((InvestigationSession.Role)rolePicker.getSelectedItem(),caseNumber);
        cards.add(game,"play");((CardLayout)cards.getLayout()).show(cards,"play");
        SwingUtilities.invokeLater(game::requestFocusInWindow);
    }
    private void returnHome(){
        if(game==null)return;
        game.close();cards.remove(game);game=null;refreshAccount();
        ((CardLayout)cards.getLayout()).show(cards,"menu");
    }
    private final class GamePanel extends JPanel implements KeyListener,MouseMotionListener,MouseListener,FocusListener {
        private final Set<Integer> down=new HashSet<>();
        private final HouseMap map=new HouseMap();
        private final SceneRenderer scene=new SceneRenderer();
        private final InvestigationSession session;
        private final javax.swing.Timer timer;
        private InvestigationSession.Instrument selected=InvestigationSession.Instrument.EMF;
        private boolean mapShown,journalShown,dragging,claimSaved;
        private int previousX,previousY,frameCount;
        private long last=System.nanoTime();
        private double accumulator;
        GamePanel(InvestigationSession.Role role,int ordinal){
            setFocusable(true);addKeyListener(this);addMouseMotionListener(this);addMouseListener(this);addFocusListener(this);
            // Reproducible case seed, varies by session, no silent random site conversion.
            session=new InvestigationSession(map,role,20261015L+ordinal);
            scene.draw(map,session,0);
            timer=new javax.swing.Timer(33,e->frame());timer.start();
        }
        void close(){timer.stop();down.clear();}
        private void frame(){
            long now=System.nanoTime();double dt=Math.max(0,Math.min(.075,(now-last)/1e9));last=now;
            double forward=(down.contains(KeyEvent.VK_W)?1:0)-(down.contains(KeyEvent.VK_S)?1:0);
            double strafe=(down.contains(KeyEvent.VK_D)?1:0)-(down.contains(KeyEvent.VK_A)?1:0);
            if(down.contains(KeyEvent.VK_LEFT))scene.yaw-=dt*1.8;
            if(down.contains(KeyEvent.VK_RIGHT))scene.yaw+=dt*1.8;
            if(down.contains(KeyEvent.VK_UP))scene.pitch=Math.min(1.05,scene.pitch+dt*.9);
            if(down.contains(KeyEvent.VK_DOWN))scene.pitch=Math.max(-1.05,scene.pitch-dt*.9);
            double length=Math.hypot(forward,strafe);
            if(length>0 && (session.outcome()==InvestigationSession.Outcome.ACTIVE || session.outcome()==InvestigationSession.Outcome.CLEANSED)){
                forward/=length;strafe/=length;
                double speed=down.contains(KeyEvent.VK_SHIFT)?3.6:2.4;
                double dx=(Math.sin(scene.yaw)*forward+Math.cos(scene.yaw)*strafe)*dt*speed;
                double dz=(Math.cos(scene.yaw)*forward-Math.sin(scene.yaw)*strafe)*dt*speed;
                if(map.traversable(scene.x+dx,scene.z))scene.x+=dx;
                if(map.traversable(scene.x,scene.z+dz))scene.z+=dz;
            }
            accumulator+=dt;
            while(accumulator>=.1){session.tick(scene.x,scene.z);accumulator-=.1;}
            scene.draw(map,session,frameCount++/30.0);repaint();
            if(session.outcome()==InvestigationSession.Outcome.LOST){
                timer.stop();endCase("You were overcome. The case remains open.");
            }
        }
        private void endCase(String details){
            if(claimSaved){return;}claimSaved=true;
            String result=details+"\nMission: "+session.outcome()+"\nCompensation: £"+session.payout();
            try{profile.addPayout(session);}catch(IOException | ArithmeticException ex){result+="\nWARNING: profile could not be saved: "+ex.getMessage();}
            JOptionPane.showMessageDialog(window,result,"Case report",JOptionPane.INFORMATION_MESSAGE);
            SwingUtilities.invokeLater(InvestigationGame.this::returnHome);
        }
        private void pause(){
            timer.stop();down.clear();dragging=false;
            Object[] choices={"Resume", "Retreat & return", "Controls"};
            int choice=JOptionPane.showOptionDialog(window,"Expedition paused", "Field Pause",
                JOptionPane.DEFAULT_OPTION,JOptionPane.QUESTION_MESSAGE,null,choices,choices[0]);
            if(choice==1){session.extract(scene.x,scene.z); // extraction location still validated
                if(session.outcome()==InvestigationSession.Outcome.ACTIVE){
                    // Leaving a running mission from elsewhere is a failed withdrawal, not a free payout.
                    JOptionPane.showMessageDialog(window,"Return to the entry marker to extract safely.","Not at extraction",JOptionPane.INFORMATION_MESSAGE);
                }else{endCase("Expedition ended.");return;}
            }
            if(choice==2) JOptionPane.showMessageDialog(window,"WASD / drag look • 1/2/3 gear • R scan • C ward • B ritual • E door • M map • J journal • X extract","Controls",JOptionPane.INFORMATION_MESSAGE);
            last=System.nanoTime();timer.start();requestFocusInWindow();
        }
        @Override public void keyPressed(KeyEvent e){
            int key=e.getKeyCode();if(down.contains(key))return;
            if(key==KeyEvent.VK_ESCAPE){pause();return;}
            if(key==KeyEvent.VK_1)selected=InvestigationSession.Instrument.EMF;
            if(key==KeyEvent.VK_2)selected=InvestigationSession.Instrument.THERMOMETER;
            if(key==KeyEvent.VK_3)selected=InvestigationSession.Instrument.SPIRIT_BOX;
            if(key==KeyEvent.VK_F)scene.lamp=!scene.lamp;
            if(key==KeyEvent.VK_E)map.toggleNearestDoor(scene.x,scene.z);
            if(key==KeyEvent.VK_R)session.scan(selected,scene.x,scene.z);
            if(key==KeyEvent.VK_C)session.placeWard(scene.x,scene.z);
            if(key==KeyEvent.VK_B)session.cleanse(scene.x,scene.z);
            if(key==KeyEvent.VK_J)journalShown=!journalShown;
            if(key==KeyEvent.VK_M)mapShown=!mapShown;
            if(key==KeyEvent.VK_X && session.extract(scene.x,scene.z)) {timer.stop();endCase("Extraction processed.");return;}
            down.add(key);repaint();
        }
        @Override public void keyReleased(KeyEvent e){down.remove(e.getKeyCode());}
        @Override public void keyTyped(KeyEvent e){}
        @Override public void mousePressed(MouseEvent e){previousX=e.getX();previousY=e.getY();dragging=e.getButton()==MouseEvent.BUTTON1;requestFocusInWindow();}
        @Override public void mouseReleased(MouseEvent e){dragging=false;}
        @Override public void mouseDragged(MouseEvent e){if(!dragging)return;
            scene.yaw+=(e.getX()-previousX)*.004;
            scene.pitch=Math.max(-1.05,Math.min(1.05,scene.pitch-(e.getY()-previousY)*.004));
            previousX=e.getX();previousY=e.getY();}
        @Override public void mouseMoved(MouseEvent e){}
        @Override public void mouseClicked(MouseEvent e){}
        @Override public void mouseEntered(MouseEvent e){}
        @Override public void mouseExited(MouseEvent e){dragging=false;}
        @Override public void focusGained(FocusEvent e){last=System.nanoTime();}
        @Override public void focusLost(FocusEvent e){down.clear();dragging=false;}
        @Override protected void paintComponent(Graphics graphics){super.paintComponent(graphics);
            Graphics2D g=(Graphics2D)graphics.create();
            try{
                g.setColor(Color.BLACK);g.fillRect(0,0,getWidth(),getHeight());
                int stageH=Math.max(250,getHeight()-106);
                g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,RenderingHints.VALUE_INTERPOLATION_NEAREST_NEIGHBOR);
                g.drawImage(scene.image(),0,0,getWidth(),stageH,null);
                g.setFont(new Font(Font.MONOSPACED,Font.BOLD,Math.max(12,getHeight()/52)));
                g.setColor(new Color(242,212,156));
                g.drawString("BECKENBURG  /  CASE 001  /  "+session.role(),16,25);
                g.drawString(map.roomName(scene.x,scene.z),16,46);
                g.drawString("+",getWidth()/2-5,stageH/2+5);
                g.setColor(new Color(21,23,30));g.fillRect(0,stageH,getWidth(),getHeight()-stageH);
                g.setColor(new Color(221,214,194));
                g.drawString(session.statusLine()+"     SELECTED "+selected.name().replace('_',' '),16,stageH+23);
                g.setColor(new Color(180,196,203));
                String msg=session.message();
                g.drawString(msg.length()>120?msg.substring(0,117)+"...":msg,16,stageH+45);
                g.setColor(new Color(194,171,139));
                g.drawString("WASD MOVE  DRAG LOOK  1/2/3 GEAR  R SCAN  C WARD  B RITUAL  E DOOR  M MAP  J JOURNAL  X EXTRACT  ESC",16,stageH+72);
                if(mapShown)drawMap(g);
                if(journalShown)drawJournal(g);
            }finally{g.dispose();}
        }
        private void drawMap(Graphics2D g){
            int tile=12,ox=20,oy=77,bw=map.width()*tile,bh=map.height()*tile;
            g.setColor(new Color(15,18,26,239));g.fillRoundRect(ox-7,oy-24,bw+14,bh+37,8,8);
            g.setColor(new Color(232,203,149));g.drawString("FIELD MAP / nine room zones",ox,oy-7);
            for(int z=0;z<map.height();z++)for(int x=0;x<map.width();x++){
                char cell=map.tile(x,z);
                g.setColor(cell=='#'?new Color(105,105,119):cell=='D'?(map.doorOpen(x,z)?new Color(91,131,112):new Color(163,103,64)):new Color(49,56,64));
                g.fillRect(ox+x*tile,oy+z*tile,tile-1,tile-1);
            }
            g.setColor(new Color(236,219,125));g.fillOval(ox+(int)(scene.x*tile)-5,oy+(int)(scene.z*tile)-5,10,10);
            g.setFont(new Font(Font.MONOSPACED,Font.PLAIN,10));
            for(int i=0;i<9;i++){
                int col=i%3,row=i/3;
                g.setColor(new Color(215,221,222));
                String s=map.roomName(i);g.drawString(s.substring(0,Math.min(9,s.length())),ox+col*8*tile+14,oy+row*6*tile+29);
            }
        }
        private void drawJournal(Graphics2D g){
            int boxW=Math.min(490,getWidth()-50),x=getWidth()-boxW-18,y=70,boxH=Math.min(getHeight()-165,395);
            g.setColor(new Color(18,21,29,240));g.fillRoundRect(x,y,boxW,boxH,10,10);
            g.setColor(new Color(223,201,156));g.drawString("CASE JOURNAL / "+session.evidenceCount()+" VERIFIED",x+15,y+27);
            g.setFont(new Font(Font.MONOSPACED,Font.PLAIN,12));
            for(InvestigationSession.Instrument t:InvestigationSession.Instrument.values()){
                y+=22;g.setColor(session.hasEvidence(t)?new Color(127,220,172):new Color(194,173,135));
                g.drawString((session.hasEvidence(t)?"[X] ":"[ ] ")+t.name().replace('_',' '),x+18,y+25);
            }
            y+=35;int j=0;
            for(String entry:session.journal().subList(Math.max(0,session.journal().size()-8),session.journal().size())){
                if(j++>=8)break;
                g.setColor(new Color(186,193,204));g.drawString(entry.substring(0,Math.min(59,entry.length())),x+16,y+j*21);
            }
        }
    }
    public static void main(String[] args){
        if(GraphicsEnvironment.isHeadless()){
            System.err.println("A graphical Windows/Linux desktop is required for the Swing client. Run GameplaySmokeTest in headless mode.");
            return;
        }
        SwingUtilities.invokeLater(InvestigationGame::new);
    }
}
