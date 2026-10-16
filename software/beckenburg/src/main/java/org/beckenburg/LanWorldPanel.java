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
    private final MouseLook mouseLook;
    private LanCase.Tool selected=LanCase.Tool.EMF;
    private String caseResult="";

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
    public void close(){timer.stop();keys.clear();mouseLook.close();}
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
                else peers.put(who,new SceneRenderer.RemoteBody(x,z,who));
            }else if(p.get(0).equals("APPARITION")){
                if(p.size()==3 && p.get(1).equals("HIDDEN")){
                    apparition=null;
                }else if(p.size()==5 && p.get(1).equals("VISIBLE")){
                    double gx=LanProtocol.integer(p.get(2),0,HouseMap.WIDTH*1000)/1000.0;
                    double gz=LanProtocol.integer(p.get(3),0,HouseMap.HEIGHT*1000)/1000.0;
                    int eventTick=LanProtocol.integer(p.get(4),0,99999999);
                    if(apparition==null)apparitionWarningTick=eventTick;
                    apparition=new SceneRenderer.Apparition(gx,gz);
                }else throw new IllegalArgumentException("malformed apparition");
            }else if(p.size()==2&&p.get(0).equals("DOORS")){
                map.applyDoorSnapshot(p.get(1));
            }else if(p.size()==7&&p.get(0).equals("STATE")){
                visibleGhost=LanProtocol.integer(p.get(3),-1,HouseMap.ROOM_COUNT-1);
            }else if(p.size()==8&&p.get(0).equals("PROGRESS")){
                health=LanProtocol.integer(p.get(1),0,100);
                evidence=LanProtocol.integer(p.get(4),0,3);
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
    private void frame(){
        if(!isDisplayable()||!caseResult.isEmpty()){repaint();return;}
        int right=(keys.contains(KeyEvent.VK_D)?1:0)-(keys.contains(KeyEvent.VK_A)?1:0);
        int forward=(keys.contains(KeyEvent.VK_W)?1:0)-(keys.contains(KeyEvent.VK_S)?1:0);
        try{
            if(forward!=0||right!=0){
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
            if(apparition!=null){
                g.setColor(new Color(228,158,177));
                g.drawString("ENTITY MANIFESTED — KEEP DISTANCE / USE WARDS",13,68);
            }
            g.setColor(new Color(17,19,25));g.fillRect(0,h,getWidth(),getHeight()-h);
            g.setColor(new Color(216,215,202));
            g.drawString("WASD MOVE  •  CLICK TO CAPTURE MOUSE / ARROWS LOOK  •  E DOOR",13,h+23);
            g.drawString("1-3 TOOL: "+selected+"  R SCAN  C WARD  B RITUAL  X EXTRACT  ESC EXIT",13,h+42);
            g.setColor(new Color(145,204,175));
            g.drawString((mouseLook.captured()?"MOUSE LOCKED | ":"CLICK TO LOCK LOOK | ")+feedback,13,h+62);
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
            case KeyEvent.VK_C -> sendAction("ward",()->client.ward());
            case KeyEvent.VK_B -> sendAction("ritual",()->client.cleanse());
            case KeyEvent.VK_X -> sendAction("extract",()->client.extract());
            case KeyEvent.VK_LEFT -> renderer.yaw-=.09;
            case KeyEvent.VK_RIGHT -> renderer.yaw+=.09;
            case KeyEvent.VK_UP -> renderer.pitch=Math.min(1.05,renderer.pitch+.06);
            case KeyEvent.VK_DOWN -> renderer.pitch=Math.max(-1.05,renderer.pitch-.06);
            default -> keys.add(e.getKeyCode());
        }
    }
    @FunctionalInterface private interface NetworkAction {void run()throws IOException;}
    private void sendAction(String verb,NetworkAction action){
        if(!caseResult.isEmpty())return;
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
