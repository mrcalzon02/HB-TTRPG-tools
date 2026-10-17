package org.beckenburg;

import javax.swing.*;
import java.awt.*;
import java.awt.event.*;
import java.io.IOException;
import java.util.*;
import java.util.List;

/** Networked hunter viewport. Render state is projected from host packets, never trusted as authority. */
public final class LanWorldPanel extends JPanel implements KeyListener, FocusListener {
    private final LanClient client;
    private final int seat;
    private final HouseMap map=new HouseMap();
    private final SceneRenderer renderer=new SceneRenderer();
    private final Map<Integer,SceneRenderer.RemoteBody> peers=new HashMap<>();
    private final javax.swing.Timer timer;
    private final Set<Integer> keys=new HashSet<>();
    private String feedback="Awaiting host world snapshot";
    private int lastTurn=-1,tick,visibleGhost=-1,health=100,evidence;
    private SceneRenderer.Apparition apparition;
    private int apparitionWarningTick=-1;
    private int lastMotionTick=-1;
    private int threatUntilTick=-1;
    private int threatTarget=-1;
    private String threatOutcome="";
    private final MouseLook mouseLook;
    private final LanAudio audio=new LanAudio();
    private String soundCaption="";
    private int soundUntilTick=-1;
    private LanCase.Tool selected=LanCase.Tool.EMF;
    private String caseResult="";
    private final List<LanEvidenceJournal.Entry> casefile=new ArrayList<>();
    private boolean casefileOpen;
    private GhostIdentity.Type selectedGuess=GhostIdentity.Type.SPIRIT;

    public LanWorldPanel(LanClient client){
        this.client=Objects.requireNonNull(client);
        if(client.seat().equals("GHOST"))throw new IllegalArgumentException("hunter-only world view");
        seat=Integer.parseInt(client.seat().substring(1))-1;
        setFocusable(true);setBackground(Color.BLACK);
        setPreferredSize(new Dimension(850,555));
        renderer.yaw=1.4;renderer.pitch=-.08;
        mouseLook=new MouseLook(this,(dx,dy)->MouseLook.rotate(renderer,dx,dy));
        addKeyListener(this);addMouseListener(mouseLook);addMouseMotionListener(mouseLook);
        addFocusListener(mouseLook);addFocusListener(this);
        timer=new javax.swing.Timer(110,e->frame());timer.start();
    }
    public void close(){timer.stop();keys.clear();mouseLook.close();audio.close();}
    public void onEvent(String frame){
        if(!SwingUtilities.isEventDispatchThread())throw new IllegalStateException("network view must update on EDT");
        try{
            List<String> p=LanProtocol.parts(frame);
            if(p.size()==6&&p.get(0).equals("BODY")){
                int who=LanProtocol.integer(p.get(1),0,2);
                double x=LanProtocol.integer(p.get(2),0,HouseMap.WIDTH*1000)/1000.0;
                double z=LanProtocol.integer(p.get(3),0,HouseMap.HEIGHT*1000)/1000.0;
                int heading=LanProtocol.integer(p.get(4),0,359);
                tick=LanProtocol.integer(p.get(5),0,99999999);
                if(who==seat){renderer.x=x;renderer.z=z;feedback="HOST SYNC ACTIVE — movement and doors server controlled";}
                else peers.put(who,new SceneRenderer.RemoteBody(x,z,who,heading));
            }else if(p.size()==3&&p.get(0).equals("PEER")&&p.get(1).equals("LEFT")){
                int gone=LanProtocol.integer(p.get(2),0,2);
                if(gone!=seat)peers.remove(gone);
                feedback="INVESTIGATOR "+(gone+1)+" DISCONNECTED - CASE CONTINUES";
            }else if(p.get(0).equals("APPARITION")){
                if(p.size()==3 && p.get(1).equals("HIDDEN")){
                    apparition=null;
                    lastMotionTick=-1;
                }else if(p.size()==5 && p.get(1).equals("VISIBLE")){
                    double gx=LanProtocol.integer(p.get(2),0,HouseMap.WIDTH*1000)/1000.0;
                    double gz=LanProtocol.integer(p.get(3),0,HouseMap.HEIGHT*1000)/1000.0;
                    int eventTick=LanProtocol.integer(p.get(4),0,99999999);
                    if(apparition==null)apparitionWarningTick=eventTick;
                    apparition=apparition==null?new SceneRenderer.Apparition(gx,gz)
                            :new SceneRenderer.Apparition(gx,gz,apparition.phase(),apparition.heading(),apparition.progress());
                }else throw new IllegalArgumentException("malformed apparition");
            }else if(p.get(0).equals("MOTION")){
                LanGhostAnimation.Motion motion=LanGhostAnimation.decode(frame);
                if(apparition!=null && motion.tick()>=lastMotionTick){
                    apparition=new SceneRenderer.Apparition(apparition.x(),apparition.z(),
                            motion.phase(),motion.heading(),motion.progress());
                    lastMotionTick=motion.tick();
                }
            }else if(p.size()==2&&p.get(0).equals("DOORS")){
                map.applyDoorSnapshot(p.get(1));
            }else if(p.size()==7&&p.get(0).equals("STATE")){
                visibleGhost=LanProtocol.integer(p.get(3),-1,HouseMap.ROOM_COUNT-1);
            }else if(p.size()==8&&p.get(0).equals("PROGRESS")){
                health=LanProtocol.integer(p.get(1),0,100);
                evidence=LanProtocol.integer(p.get(4),0,3);
                if(health==0){keys.clear();feedback="INCAPACITATED - YOU CAN OBSERVE BUT NOT ACT";}
            }else if(p.size()==3&&p.get(0).equals("HUNTER")&&p.get(1).equals("DOWN")){
                int down=LanProtocol.integer(p.get(2),0,2);
                if(down==seat){
                    keys.clear();feedback="INCAPACITATED - YOU CAN OBSERVE BUT NOT ACT";
                }else feedback="INVESTIGATOR "+(down+1)+" IS DOWN";
            }else if(p.get(0).equals("IDENTIFIED")&&p.size()==3){
                feedback="TEAM IDENTIFIED "+p.get(1)+" - REQUIRED "+p.get(2);
            }else if(p.get(0).equals("TELL")&&p.size()==2){
                feedback="ENTITY TELL: "+p.get(1);
            }else if(p.get(0).equals("SITES")&&p.size()==4){
                feedback="Ritual sites active: Banish=cellar Cleanse=library Absolve=foyer";
            }else if(p.get(0).equals("CASEFILE")){
                if(p.size()==2&&p.get(1).equals("RESET"))casefile.clear();
                else {
                    LanEvidenceJournal.Entry entry=LanEvidenceJournal.Entry.decode(frame);
                    casefile.add(entry);
                    if(casefile.size()>LanEvidenceJournal.CAPACITY)casefile.remove(0);
                }
            }else if(p.get(0).equals("SOUND")){
                LanSound.CueEvent cue=LanSound.decode(frame);
                // Caption is an independent non-audio clue for deaf players/no sound device.
                soundCaption=cue.cue().caption()+" / "+(cue.pan()< -25?"LEFT":cue.pan()>25?"RIGHT":"AHEAD");
                soundUntilTick=cue.tick()+20;
                audio.play(cue);
            }else if(p.get(0).equals("THREAT")){
                if(p.size()==4&&p.get(1).equals("START")){
                    int ticks=LanProtocol.integer(p.get(2),1,LanTelegraphedStrike.WINDUP_TICKS);
                    threatTarget=LanProtocol.integer(p.get(3),0,2);
                    threatUntilTick=tick+ticks;
                    threatOutcome="";
                }else if(p.size()==3&&(p.get(1).equals("EVADED")||p.get(1).equals("HIT"))){
                    threatTarget=LanProtocol.integer(p.get(2),0,2);
                    threatUntilTick=-1;
                    threatOutcome=p.get(1).equals("HIT")?"SPECTRAL STRIKE CONNECTED":"STRIKE EVADED — KEEP MOVING";
                    feedback=threatOutcome;
                }else throw new IllegalArgumentException("invalid threat packet");
            }else if(frame.startsWith("RESULT|")){
                caseResult=frame.substring(7);feedback="CASE CLOSED: "+caseResult;
                keys.clear();
            }else if(frame.startsWith("ACCEPT|")||frame.startsWith("REJECT|")||frame.startsWith("EVIDENCE|")||frame.startsWith("RITUAL|")) {
                feedback=frame;
            }
        }catch(IllegalArgumentException ignored){feedback="Invalid world update rejected";}
        repaint();
    }
    public HouseMap worldMap(){return map;}
    public double cameraX(){return renderer.x;}
    public double cameraZ(){return renderer.z;}
    public int visiblePeers(){return peers.size();}
    public boolean seesApparition(){return apparition!=null;}
    public SceneRenderer.Apparition apparitionPose(){return apparition;}
    public String activeSoundCaption(){return tick<=soundUntilTick?soundCaption:"";}
    public int casefileSize(){return casefile.size();}
    public boolean casefileOpen(){return casefileOpen;}
    public GhostIdentity.Type selectedGuess(){return selectedGuess;}
    private void frame(){
        if(!isDisplayable()||!caseResult.isEmpty()){repaint();return;}
        int right=(keys.contains(KeyEvent.VK_D)?1:0)-(keys.contains(KeyEvent.VK_A)?1:0);
        int forward=(keys.contains(KeyEvent.VK_W)?1:0)-(keys.contains(KeyEvent.VK_S)?1:0);
        try{
            if(health>0&&(forward!=0||right!=0)){
                double dx=Math.sin(renderer.yaw)*forward+Math.cos(renderer.yaw)*right;
                double dz=Math.cos(renderer.yaw)*forward-Math.sin(renderer.yaw)*right;
                double len=Math.hypot(dx,dz);
                int mx=(int)Math.round(dx/len*100),mz=(int)Math.round(dz/len*100);
                if(mx!=0||mz!=0)client.step(mx,mz);
            }
            int heading=Math.floorMod((int)Math.round(Math.toDegrees(renderer.yaw)),360);
            if(heading!=lastTurn){client.turn(heading);lastTurn=heading;}
        }catch(IOException e){feedback="LAN disconnected: "+e.getMessage();close();}
        renderer.drawNetwork(map,new ArrayList<>(peers.values()),apparition,tick*.1);
        repaint();
    }
    @Override protected void paintComponent(Graphics original){
        super.paintComponent(original);Graphics2D g=(Graphics2D)original.create();
        try{
            int h=Math.max(160,getHeight()-82);
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,RenderingHints.VALUE_INTERPOLATION_NEAREST_NEIGHBOR);
            g.drawImage(renderer.image(),0,0,getWidth(),h,null);
            g.setFont(new Font(Font.MONOSPACED,Font.BOLD,Math.max(12,getHeight()/46)));
            g.setColor(new Color(234,222,189));
            g.drawString("BECKENBURG / LAN HOUSE — HUNTER "+(seat+1),13,26);
            g.drawString(map.roomName(renderer.x,renderer.z)+" | TEAM "+peers.size()+" / 2 | HP "+health+" | CLUES "+evidence+"/3",13,46);
            g.drawString("+",getWidth()/2,h/2);
            g.setColor(new Color(214,195,151));
            g.drawString("IDENTIFY: "+selectedGuess+"  [I NEXT / P SUBMIT]",13,91);
            if(health==0){
                g.setColor(new Color(235,154,159));
                g.drawString("INCAPACITATED - VIEW ONLY / AWAIT CASE RESULT",13,68);
            }else if(threatUntilTick>=tick && threatTarget>=0){
                g.setColor(new Color(240,149,124));
                int remaining=threatUntilTick-tick;
                g.drawString("GHOST STRIKE WIND-UP — EVADE OR BREAK SIGHT"+(threatTarget==seat?" / TARGETED":"")+" ("+remaining+")",13,68);
            }else if(apparition!=null){
                g.setColor(new Color(228,158,177));
                String state=apparition.phase()==LanGhostAnimation.Phase.MATERIALIZE?"MATERIALIZING"
                        :apparition.phase()==LanGhostAnimation.Phase.RECOVER?"RECOVERING":"MANIFESTED";
                g.drawString("ENTITY "+state+" — KEEP DISTANCE / USE WARDS",13,68);
            }else if(!activeSoundCaption().isEmpty()){
                g.setColor(new Color(204,188,231));
                g.drawString("HEARD: "+activeSoundCaption(),13,68);
            }
            g.setColor(new Color(17,19,25));g.fillRect(0,h,getWidth(),getHeight()-h);
            g.setColor(new Color(216,215,202));
            g.drawString(health==0?"ARROWS / MOUSE LOOK - OBSERVE ONLY - ESC EXIT":
                    "WASD MOVE  •  CLICK TO CAPTURE MOUSE / ARROWS LOOK  •  E DOOR",13,h+23);
            g.drawString(health==0?"NO MOVEMENT OR EQUIPMENT WHILE INCAPACITATED":
                    "1-3 TOOL "+selected+"  R SCAN  I/P IDENTIFY  J NOTES  C WARD  B CLEANSE  N BANISH  V ABSOLVE  X EXIT",13,h+42);
            g.setColor(new Color(145,204,175));
            g.drawString((mouseLook.captured()?"MOUSE LOCKED | ":"CLICK TO LOCK LOOK | ")+feedback,13,h+62);
            if(casefileOpen){
                int rows=Math.min(casefile.size(),Math.min(8,Math.max(1,(h-135)/37)));
                int width=Math.max(260,getWidth()-48),height=52+rows*37,top=83;
                g.setColor(new Color(10,14,23,232));g.fillRoundRect(20,top,width,height,10,10);
                g.setColor(new Color(190,172,131));g.drawRoundRect(20,top,width,height,10,10);
                g.setFont(new Font(Font.MONOSPACED,Font.BOLD,15));
                g.drawString("SHARED CASEFILE / "+casefile.size()+" READINGS / J TO CLOSE",33,top+23);
                g.setFont(new Font(Font.MONOSPACED,Font.PLAIN,13));
                g.setColor(new Color(217,218,209));
                if(casefile.isEmpty())g.drawString("No readings. Select a tool, then press R to scan.",33,top+48);
                for(int i=0;i<rows;i++){
                    LanEvidenceJournal.Entry entry=casefile.get(casefile.size()-rows+i);
                    String line=String.format("T%05d  H%d  %s  /  %s  /  %s",entry.tick(),
                            entry.seat()+1,map.roomName(entry.room()),entry.tool(),entry.finding());
                    int max=Math.max(12,(width-36)/8),y=top+48+i*37;
                    g.setColor(entry.finding()==LanEvidenceJournal.Finding.CONFIRMED
                            ?new Color(149,219,179):new Color(221,207,167));
                    g.drawString(line.length()>max?line.substring(0,max-3)+"...":line,33,y);
                    g.setColor(new Color(217,218,209));
                    String raw=entry.reading();
                    g.drawString(raw.length()>max?raw.substring(0,max-3)+"...":raw,33,y+16);
                }
            }
        }finally{g.dispose();}
    }
    @Override public void keyPressed(KeyEvent e){
        switch(e.getKeyCode()){
            case KeyEvent.VK_ESCAPE -> {Window window=SwingUtilities.getWindowAncestor(this);if(window!=null)window.dispose();}
            case KeyEvent.VK_E -> sendAction("door",()->client.door());
            case KeyEvent.VK_1 -> selected=LanCase.Tool.EMF;
            case KeyEvent.VK_2 -> selected=LanCase.Tool.THERMOMETER;
            case KeyEvent.VK_3 -> selected=LanCase.Tool.SPIRIT_BOX;
            case KeyEvent.VK_R -> sendAction("scan",()->client.scan(selected));
            case KeyEvent.VK_J -> casefileOpen=!casefileOpen;
            case KeyEvent.VK_I -> selectedGuess=GhostIdentity.Type.values()[
                    (selectedGuess.ordinal()+1)%GhostIdentity.Type.values().length];
            case KeyEvent.VK_P -> sendAction("identify",()->client.identify(selectedGuess));
            case KeyEvent.VK_C -> sendAction("ward",()->client.ward());
            case KeyEvent.VK_B -> sendAction("cleansing",()->client.cleanse());
            case KeyEvent.VK_N -> sendAction("banishment",()->client.banish());
            case KeyEvent.VK_V -> sendAction("absolution",()->client.absolve());
            case KeyEvent.VK_X -> sendAction("extract",()->client.extract());
            case KeyEvent.VK_LEFT -> renderer.yaw-=.09;
            case KeyEvent.VK_RIGHT -> renderer.yaw+=.09;
            case KeyEvent.VK_UP -> renderer.pitch=Math.min(1.05,renderer.pitch+.06);
            case KeyEvent.VK_DOWN -> renderer.pitch=Math.max(-1.05,renderer.pitch-.06);
            default -> {if(health>0)keys.add(e.getKeyCode());}
        }
    }
    @FunctionalInterface private interface NetworkAction {void run()throws IOException;}
    private void sendAction(String verb,NetworkAction action){
        if(!caseResult.isEmpty())return;
        if(health==0){feedback="INCAPACITATED - CANNOT "+verb.toUpperCase();return;}
        try{action.run();feedback="Awaiting host "+verb+" result";}
        catch(IOException ex){feedback="LAN "+verb+" failed: "+ex.getMessage();}
    }
    public LanCase.Tool selectedTool(){return selected;}
    public String caseFeedback(){return feedback;}
    @Override public void keyReleased(KeyEvent e){keys.remove(e.getKeyCode());}
    @Override public void keyTyped(KeyEvent e){}
    @Override public void focusGained(FocusEvent e){}
    @Override public void focusLost(FocusEvent e){keys.clear();mouseLook.release();}
}
