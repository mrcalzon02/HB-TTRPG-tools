package org.beckenburg;

import javax.swing.*;
import java.awt.*;
import java.awt.event.*;
import java.io.IOException;
import java.util.HashSet;
import java.util.Set;

/** Playable solo modes plus an explicitly limited LAN room-simulation test harness. */
public final class InvestigationGame {
    private final JFrame window=new JFrame("The Beckenburg Project — Expedition Alpha");
    private final JPanel cards=new JPanel(new CardLayout());
    private final JPanel menu=new JPanel(new GridBagLayout());
    private final ProfileStore profile=new ProfileStore(ProfileStore.defaultPath());
    private final JLabel account=new JLabel();
    private JComboBox<InvestigationSession.Role> rolePicker;
    private JComboBox<SiteCatalog.Location> locationPicker;
    private JComboBox<SiteCatalog.Conditions> conditionsPicker;
    private GamePanel game;
    private GhostPracticePanel ghostPractice;
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
        locationPicker=new JComboBox<>(SiteCatalog.Location.values());
        conditionsPicker=new JComboBox<>(SiteCatalog.Conditions.values());
        JPanel selectors=new JPanel(new GridLayout(2,2,7,5));
        selectors.setBackground(new Color(28,31,39));
        selectors.add(new JLabel("Site"));selectors.add(locationPicker);
        selectors.add(new JLabel("Conditions"));selectors.add(conditionsPicker);
        selectors.setMaximumSize(new Dimension(410,75));
        JButton begin=button("BEGIN SOLO INVESTIGATION");
        locationPicker.addActionListener(e->{
            boolean available=((SiteCatalog.Location)locationPicker.getSelectedItem()).playable();
            begin.setEnabled(available);conditionsPicker.setEnabled(available);
            status.setText(available?"LOCAL SOLO ALPHA   /   HOUSE SITE READY"
                    :"SITE NOT PLAYABLE - LEVEL GEOMETRY STILL IN PRODUCTION");
        });
        JButton ghost=button("GHOST PRACTICE / LOCAL");
        JButton lan=button("LAN HOST / JOIN (3D HOUSE ALPHA)");
        JButton guide=button("FIELD MANUAL / CONTROLS");
        JButton quit=button("EXIT");
        account.setForeground(new Color(172,204,183));
        account.setHorizontalAlignment(SwingConstants.CENTER);
        inner.add(title);inner.add(Box.createVerticalStrut(8));inner.add(tagline);
        inner.add(Box.createVerticalStrut(15));inner.add(status);inner.add(Box.createVerticalStrut(18));
        inner.add(selected);inner.add(Box.createVerticalStrut(6));inner.add(rolePicker);
        inner.add(Box.createVerticalStrut(10));inner.add(selectors);
        for(JButton b:new JButton[]{begin,ghost,lan,guide,quit}){inner.add(Box.createVerticalStrut(9));inner.add(b);}
        inner.add(Box.createVerticalStrut(20));inner.add(account);
        JLabel limitation=new JLabel("LAN shared house navigation is available; complete 3v1 simulation is still in development.",SwingConstants.CENTER);
        limitation.setForeground(new Color(147,154,165));inner.add(Box.createVerticalStrut(12));inner.add(limitation);
        for(Component c:inner.getComponents())if(c instanceof JComponent jc)jc.setAlignmentX(Component.CENTER_ALIGNMENT);
        menu.add(inner);
        begin.addActionListener(e->begin());ghost.addActionListener(e->beginGhost());lan.addActionListener(e->new LanLobbyWindow().setVisible(true));guide.addActionListener(e->JOptionPane.showMessageDialog(window,
            "WASD move • Shift sprint • Click to capture mouse-look / arrows • F flashlight • E doors\n"+
            "1–4 select carried gear • R use • E at van rack to change loadout/restock\n"+
            "C defensive or ritual ward (2 per case)  •  B cleanse anchor\n"+
            "Hold Q, move mouse, release Q for contextual callouts and world pings.\n"+
            "J toggle evidence journal • M floor map • X extract • E at utility breaker toggles power\n"+
            "Escape pauses and offers return to castle.\n\n"+
            "Search every room: readings strengthen near the Spirit's anchor.\n"+
            "Record three types of evidence, place a ward in the anchor room, cleanse,\n"+
            "then return to VAN STAGING to extract. You can retreat earlier.\n"+
            "An AI Spirit can roam, manifest and inflict incremental damage.\n\n"+
            "GHOST PRACTICE: [ / ] select room, SPACE drift, 1 whisper, 2 disturb,\n"+
            "3 manifest, 4 strike, mouse-look or arrows, ESC return.\n"+
            "A simulated investigator is present; this is not a LAN match.\n"+
            "LAN ROOM TEST: 3 hunter seats + ghost/AI, ready/start, room moves and ghost actions.\n"+
            "LAN first-person hunter movement and doors work; full 3v1 integration remains unfinished.",
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
        if(ghostPractice!=null){ghostPractice.close();cards.remove(ghostPractice);ghostPractice=null;}
        caseNumber++;
        SiteCatalog.Location location=(SiteCatalog.Location)locationPicker.getSelectedItem();
        SiteCatalog.requirePlayable(location);
        game=new GamePanel((InvestigationSession.Role)rolePicker.getSelectedItem(),caseNumber,
            location,(SiteCatalog.Conditions)conditionsPicker.getSelectedItem());
        cards.add(game,"play");((CardLayout)cards.getLayout()).show(cards,"play");
        SwingUtilities.invokeLater(game::requestFocusInWindow);
    }
    private void beginGhost(){
        if(game!=null){game.close();cards.remove(game);game=null;}
        if(ghostPractice!=null){ghostPractice.close();cards.remove(ghostPractice);}
        ghostPractice=new GhostPracticePanel(this::returnHome);
        cards.add(ghostPractice,"ghost");
        ((CardLayout)cards.getLayout()).show(cards,"ghost");
        SwingUtilities.invokeLater(ghostPractice::requestFocusInWindow);
    }
    private void returnHome(){
        if(game!=null){game.close();cards.remove(game);game=null;}
        if(ghostPractice!=null){ghostPractice.close();cards.remove(ghostPractice);ghostPractice=null;}
        refreshAccount();
        ((CardLayout)cards.getLayout()).show(cards,"menu");
    }
    private final class GamePanel extends JPanel implements KeyListener,FocusListener {
        private final Set<Integer> down=new HashSet<>();
        private final HouseMap map=new HouseMap();
        private final SceneRenderer scene=new SceneRenderer();
        private final InvestigationSession session;
        private final javax.swing.Timer timer;
        private final EquipmentLoadout loadout=new EquipmentLoadout();
        private final SiteCatalog.Location location;
        private final SiteCatalog.Conditions conditions;
        private boolean powerOn;
        private boolean mapShown,journalShown,claimSaved,wheelOpen;
        private final MouseLook mouseLook;
        private final TeamCallout.Board callouts=new TeamCallout.Board(map);
        private double wheelDx,wheelDy;
        private TeamCallout.Ping lastPing;
        private String vanNotice="";
        private int vanNoticeExpires;
        private boolean briefingShown;
        private int frameCount;
        private long last=System.nanoTime();
        private double accumulator;
        GamePanel(InvestigationSession.Role role,int ordinal,SiteCatalog.Location site,
                SiteCatalog.Conditions mode){
            SiteCatalog.requirePlayable(site);
            location=site;conditions=java.util.Objects.requireNonNull(mode);
            powerOn=conditions.initiallyPowered();
            syncEnvironment();
            setFocusable(true);
            mouseLook=new MouseLook(this,(dx,dy)->{
                if(wheelOpen){wheelDelta(dx,dy);}
                else MouseLook.rotate(scene,dx,dy);
            });
            addKeyListener(this);addMouseMotionListener(mouseLook);addMouseListener(mouseLook);
            addFocusListener(mouseLook);addFocusListener(this);
            // Reproducible case seed, varies by session, no silent random site conversion.
            session=new InvestigationSession(map,role,20261015L+ordinal);
            scene.draw(map,session,0);
            timer=new javax.swing.Timer(33,e->frame());timer.start();
        }
        void close(){timer.stop();down.clear();wheelOpen=false;mouseLook.close();}
        private void syncEnvironment(){
            scene.environmentLight=conditions.lightMultiplier()*(powerOn?1.0:.48);
            scene.fogDensity=conditions.fogMultiplier();
        }
        private boolean nearBreaker(){
            return map.roomAt(scene.x,scene.z)==11
                &&Math.hypot(scene.x-map.centerX(11),scene.z-map.centerZ(11))<1.5;
        }
        private void editRack(){
            timer.stop();down.clear();mouseLook.release();
            java.util.List<JComboBox<EquipmentLoadout.Item>> fields=new java.util.ArrayList<>();
            JPanel entries=new JPanel(new GridLayout(4,2,6,5));
            for(int i=0;i<EquipmentLoadout.SLOTS;i++){
                entries.add(new JLabel("Slot "+(i+1)));
                JComboBox<EquipmentLoadout.Item> choice=new JComboBox<>(EquipmentLoadout.Item.values());
                choice.setSelectedItem(loadout.at(i));fields.add(choice);entries.add(choice);
            }
            int result=JOptionPane.showConfirmDialog(this,entries,
                "EQUIPMENT RACK / 4 DISTINCT CARRIED ITEMS",JOptionPane.OK_CANCEL_OPTION,
                JOptionPane.PLAIN_MESSAGE);
            if(result==JOptionPane.OK_OPTION){
                EquipmentLoadout.Item[] chosen=new EquipmentLoadout.Item[EquipmentLoadout.SLOTS];
                for(int i=0;i<chosen.length;i++)chosen[i]=(EquipmentLoadout.Item)fields.get(i).getSelectedItem();
                try{
                    loadout.replaceAtRack(chosen);
                    showVanNotice("Equipment exchanged and expendable supplies restocked.");
                }catch(IllegalArgumentException invalid){
                    showVanNotice("Each hotbar slot must contain a DIFFERENT item. Selection unchanged.");
                }
            }
            last=System.nanoTime();timer.start();requestFocusInWindow();
        }
        private void frame(){
            long now=System.nanoTime();double dt=Math.max(0,Math.min(.075,(now-last)/1e9));last=now;
            double forward=wheelOpen?0:(down.contains(KeyEvent.VK_W)?1:0)-(down.contains(KeyEvent.VK_S)?1:0);
            double strafe=wheelOpen?0:(down.contains(KeyEvent.VK_D)?1:0)-(down.contains(KeyEvent.VK_A)?1:0);
            if(!wheelOpen && down.contains(KeyEvent.VK_LEFT))scene.yaw-=dt*1.8;
            if(!wheelOpen && down.contains(KeyEvent.VK_RIGHT))scene.yaw+=dt*1.8;
            if(!wheelOpen && down.contains(KeyEvent.VK_UP))scene.pitch=Math.min(1.05,scene.pitch+dt*.9);
            if(!wheelOpen && down.contains(KeyEvent.VK_DOWN))scene.pitch=Math.max(-1.05,scene.pitch-dt*.9);
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
            timer.stop();down.clear();mouseLook.release();wheelOpen=false;briefingShown=false;
            Object[] choices={"Resume", "Retreat & return", "Controls"};
            int choice=JOptionPane.showOptionDialog(window,"Expedition paused", "Field Pause",
                JOptionPane.DEFAULT_OPTION,JOptionPane.QUESTION_MESSAGE,null,choices,choices[0]);
            if(choice==1){session.extract(scene.x,scene.z); // extraction location still validated
                if(session.outcome()==InvestigationSession.Outcome.ACTIVE){
                    // Leaving a running mission from elsewhere is a failed withdrawal, not a free payout.
                    JOptionPane.showMessageDialog(window,"Return to the entry marker to extract safely.","Not at extraction",JOptionPane.INFORMATION_MESSAGE);
                }else{endCase("Expedition ended.");return;}
            }
            if(choice==2) JOptionPane.showMessageDialog(window,"WASD / click to mouse-look • 1/2/3 gear • R scan • C ward • B ritual • E door • Q hold communication wheel • M map • J journal • X extract","Controls",JOptionPane.INFORMATION_MESSAGE);
            last=System.nanoTime();timer.start();requestFocusInWindow();
        }
        @Override public void keyPressed(KeyEvent e){
            int key=e.getKeyCode();if(down.contains(key))return;
            if(key==KeyEvent.VK_ESCAPE){if(wheelOpen){wheelOpen=false;down.remove(KeyEvent.VK_Q);repaint();}else pause();return;}
            if(key==KeyEvent.VK_Q){
                wheelOpen=true;wheelDx=0;wheelDy=0;
                down.add(key);repaint();return;
            }
            if(wheelOpen){ // Arrow keys also select callouts without a mouse.
                if(key==KeyEvent.VK_LEFT)wheelDx=-75;
                if(key==KeyEvent.VK_RIGHT)wheelDx=75;
                if(key==KeyEvent.VK_UP)wheelDy=-75;
                if(key==KeyEvent.VK_DOWN)wheelDy=75;
                down.add(key);repaint();return;
            }
            if(key>=KeyEvent.VK_1&&key<=KeyEvent.VK_4)loadout.select(key-KeyEvent.VK_1);
            if(key==KeyEvent.VK_F)scene.lamp=!scene.lamp;
            if(key==KeyEvent.VK_E){
                VanStaging.Station service=map.van().stationAt(scene.x,scene.z);
                if(service!=null)useVan(service);
                else if(nearBreaker()){
                    powerOn=!powerOn;syncEnvironment();
                    showVanNotice(powerOn?"Utility power restored.":"Utility breaker switched off.");
                }
                else if(!map.toggleNearestDoor(scene.x,scene.z))
                    showVanNotice("No usable door or station nearby.");
            }
            if(key==KeyEvent.VK_R)session.useEquipment(loadout,scene.x,scene.z);
            if(key==KeyEvent.VK_C)session.placeWard(scene.x,scene.z);
            if(key==KeyEvent.VK_B)session.cleanse(scene.x,scene.z);
            if(key==KeyEvent.VK_J)journalShown=!journalShown;
            if(key==KeyEvent.VK_M)mapShown=!mapShown;
            if(key==KeyEvent.VK_X && session.extract(scene.x,scene.z)) {timer.stop();endCase("Extraction processed.");return;}
            down.add(key);repaint();
        }
        private void showVanNotice(String text){vanNotice=text;vanNoticeExpires=session.ticks()+85;}
        private void useVan(VanStaging.Station station){
            switch(station){
                case BRIEFING -> {
                    briefingShown=!briefingShown;
                    showVanNotice(briefingShown?"CASE BOARD OPEN — current role, objectives and progress":"Case board closed.");
                }
                case EQUIPMENT -> editRack();
                case RELAY -> {
                    journalShown=!journalShown;
                    showVanNotice("RADIO RELAY — "+session.evidenceCount()+" clues logged; "+callouts.visible(session.ticks()).size()+" active pings.");
                }
                case EXTRACTION -> {
                    if(session.extract(scene.x,scene.z)){timer.stop();endCase("Van extraction confirmed.");}
                    else showVanNotice("Move to the extraction marker inside the van.");
                }
            }
        }
        @Override public void keyReleased(KeyEvent e){
            down.remove(e.getKeyCode());
            if(e.getKeyCode()==KeyEvent.VK_Q && wheelOpen){
                wheelOpen=false;
                TeamCallout.Phrase choice=TeamCallout.choose(wheelDx,wheelDy);
                if(choice!=null){
                    double[] where=choice==TeamCallout.Phrase.HERE || choice==TeamCallout.Phrase.FOLLOW ||
                        choice==TeamCallout.Phrase.HELP || choice==TeamCallout.Phrase.HOLD ?
                        new double[]{scene.x,scene.z} : TeamCallout.aim(map,scene.x,scene.z,scene.yaw,12);
                    lastPing=callouts.submit(new TeamCallout.Request(0,choice,scene.x,scene.z,where[0],where[1],session.ticks()));
                }
                repaint();
            }
        }
        @Override public void keyTyped(KeyEvent e){}
        private void wheelDelta(int dx,int dy){
            wheelDx=Math.max(-125,Math.min(125,wheelDx+dx));
            wheelDy=Math.max(-125,Math.min(125,wheelDy+dy));
            repaint();
        }
        @Override public void focusGained(FocusEvent e){last=System.nanoTime();}
        @Override public void focusLost(FocusEvent e){down.clear();mouseLook.release();wheelOpen=false;}
        @Override protected void paintComponent(Graphics graphics){super.paintComponent(graphics);
            Graphics2D g=(Graphics2D)graphics.create();
            try{
                g.setColor(Color.BLACK);g.fillRect(0,0,getWidth(),getHeight());
                int stageH=Math.max(250,getHeight()-106);
                g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,RenderingHints.VALUE_INTERPOLATION_NEAREST_NEIGHBOR);
                g.drawImage(scene.image(),0,0,getWidth(),stageH,null);
                g.setFont(new Font(Font.MONOSPACED,Font.BOLD,Math.max(12,getHeight()/52)));
                g.setColor(new Color(242,212,156));
                g.drawString("BECKENBURG / "+location.label.toUpperCase()+" / "+conditions.label.toUpperCase()+" / "+session.role(),16,25);
                g.drawString(map.roomName(scene.x,scene.z),16,46);
                g.drawString("+",getWidth()/2-5,stageH/2+5);
                g.setColor(new Color(21,23,30));g.fillRect(0,stageH,getWidth(),getHeight()-stageH);
                g.setColor(new Color(221,214,194));
                g.drawString(session.statusLine()+"   HELD "+loadout.equipped().label.toUpperCase()+
                    (loadout.usesLeft(loadout.equipped())<0?"":" ("+loadout.usesLeft(loadout.equipped())+" LEFT)"),16,stageH+23);
                g.setColor(new Color(180,196,203));
                String msg=session.message();
                g.drawString(msg.length()>120?msg.substring(0,117)+"...":msg,16,stageH+45);
                g.setColor(new Color(194,171,139));
                g.drawString("1-4 SELECT  R USE  F TORCH  E INTERACT/RACK/BREAKER  C WARD  B RITE  J NOTES  M MAP  X EXIT",16,stageH+72);
                if(lastPing!=null && callouts.visible(session.ticks()).contains(lastPing)){
                    g.setColor(new Color(238,196,109));
                    g.drawString("CALLOUT: "+lastPing.phrase().spoken+"   ["+map.roomName(lastPing.zone())+"]",16,stageH+88);
                }
                g.setColor(new Color(175,208,199));
                String slots="";for(int i=0;i<EquipmentLoadout.SLOTS;i++)
                    slots+=(i==0?"":"   ")+(i+1)+":"+
                        loadout.at(i).label.toUpperCase()+(i==loadout.activeSlot()?"*":"");
                g.drawString(slots,16,stageH-17);
                if(nearBreaker()){
                    g.setColor(new Color(255,212,137));
                    g.drawString("E / UTILITY BREAKER: "+(powerOn?"ON":"OFF"),16,stageH-36);
                }
                if(map.van().stationAt(scene.x,scene.z)!=null){
                    VanStaging.Station service=map.van().stationAt(scene.x,scene.z);
                    g.setColor(new Color(255,212,137));
                    g.drawString("E  /  "+service.label,16,stageH-19);
                }
                if(vanNoticeExpires>session.ticks()){
                    g.setColor(new Color(160,218,216));
                    g.drawString(vanNotice.substring(0,Math.min(vanNotice.length(),94)),16,stageH-39);
                }
                if(briefingShown)drawBriefing(g);
                if(wheelOpen) drawCalloutWheel(g,stageH);
                if(mapShown)drawMap(g);
                if(journalShown)drawJournal(g);
            }finally{g.dispose();}
        }
        private void drawMap(Graphics2D g){
            int tile=12,ox=20,oy=77,bw=map.width()*tile,bh=map.height()*tile;
            g.setColor(new Color(15,18,26,239));g.fillRoundRect(ox-7,oy-24,bw+14,bh+37,8,8);
            g.setColor(new Color(232,203,149));g.drawString("FIELD MAP / 12 rooms + 3 exterior",ox,oy-7);
            for(int z=0;z<map.height();z++)for(int x=0;x<map.width();x++){
                char cell=map.tile(x,z);
                g.setColor(cell=='#'?new Color(105,105,119):cell=='D'?(map.doorOpen(x,z)?new Color(91,131,112):new Color(163,103,64)):new Color(49,56,64));
                g.fillRect(ox+x*tile,oy+z*tile,tile-1,tile-1);
            }
            g.setColor(new Color(236,219,125));g.fillOval(ox+(int)(scene.x*tile)-5,oy+(int)(scene.z*tile)-5,10,10);
            for(var ping:callouts.visible(session.ticks())){
                g.setColor(new Color(245,172,84));
                int px=ox+(int)(ping.x()*tile),pz=oy+(int)(ping.z()*tile);
                g.drawOval(px-6,pz-6,12,12);g.drawLine(px-8,pz,px+8,pz);g.drawLine(px,pz-8,px,pz+8);
            }
            g.setFont(new Font(Font.MONOSPACED,Font.PLAIN,10));
            for(int i=0;i<map.roomCount();i++){
                int col=i%3,row=i/3;
                g.setColor(new Color(215,221,222));
                String s=map.roomName(i);g.drawString(s.substring(0,Math.min(9,s.length())),ox+col*8*tile+6,oy+row*6*tile+20);
            }
        }
        private void drawCalloutWheel(Graphics2D g,int stageH){
            int cx=getWidth()/2,cy=stageH/2;
            g.setColor(new Color(7,11,17,218));g.fillOval(cx-148,cy-148,296,296);
            g.setColor(new Color(176,158,121));g.drawOval(cx-146,cy-146,292,292);
            for(TeamCallout.Phrase phrase:TeamCallout.Phrase.values()){
                double angle=switch(phrase){
                    case THERE -> 0; case DANGER -> Math.PI/4; case HOLD -> Math.PI/2;
                    case DONT_GO -> 3*Math.PI/4; case HERE -> Math.PI;
                    case FOLLOW -> 5*Math.PI/4; case EVIDENCE -> 3*Math.PI/2;
                    case HELP -> 7*Math.PI/4;
                };
                TeamCallout.Phrase chosen=TeamCallout.choose(wheelDx,wheelDy);
                int tx=cx+(int)(Math.cos(angle)*108),ty=cy-(int)(Math.sin(angle)*108);
                g.setColor(chosen==phrase?new Color(255,206,124):new Color(195,196,211));
                g.setFont(new Font(Font.MONOSPACED,Font.BOLD,12));
                FontMetrics fm=g.getFontMetrics();g.drawString(phrase.label,tx-fm.stringWidth(phrase.label)/2,ty+5);
            }
            g.setColor(new Color(233,212,172));g.drawString("RELEASE Q",cx-34,cy+3);
            g.drawString("to call out",cx-38,cy+19);
            g.setColor(new Color(244,179,102));
            g.fillOval(cx+(int)wheelDx-5,cy+(int)wheelDy-5,10,10);
        }
        private void drawBriefing(Graphics2D g){
            int width=440,x=Math.max(12,(getWidth()-width)/2),y=65;
            g.setColor(new Color(14,19,26,238));g.fillRoundRect(x,y,width,140,8,8);
            g.setColor(new Color(233,197,142));g.drawString("VAN / BECKENBURG FIELD BRIEFING",x+16,y+26);
            g.setColor(new Color(210,216,225));
            g.drawString("Role: "+session.role()+"  /  Threat: SPIRIT (test contract)",x+16,y+50);
            g.drawString("Gather EMF, temperature and spirit-box readings.",x+16,y+74);
            g.drawString("Ward the anchor; cleanse; return to this van.",x+16,y+96);
            g.drawString("Evidence "+session.evidenceCount()+"/3  Wards "+session.wards()+"  HP "+session.health()+"  Photo "+(session.apparitionPhotographed()?"YES":"NO"),x+16,y+119);
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
