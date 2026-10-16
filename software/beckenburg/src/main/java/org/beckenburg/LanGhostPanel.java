package org.beckenburg;

import javax.swing.*;
import java.awt.*;
import java.awt.event.*;
import java.io.IOException;
import java.util.*;
import java.util.List;

/** First-person LAN ghost viewport, rendered from filtered host-owned ghost pose only.
 * No hunter bodies, private clues, or team map are ever requested or displayed here.
 */
public final class LanGhostPanel extends JPanel implements KeyListener, FocusListener {
    private final LanClient client;
    private final HouseMap map=new HouseMap();
    private final SceneRenderer camera=new SceneRenderer();
    private final MouseLook mouseLook;
    private final Set<Integer> keys=new HashSet<>();
    private final javax.swing.Timer timer;
    private int room=-1,energy,tick,choice,lastTurn=-1;
    private boolean audible,finished;
    private String legal="[]",feedback="Awaiting private spectral pose";

    public LanGhostPanel(LanClient client){
        this.client=Objects.requireNonNull(client);
        if(!"GHOST".equals(client.seat()))throw new IllegalArgumentException("ghost seat required");
        setFocusable(true);setBackground(Color.BLACK);setPreferredSize(new Dimension(850,555));
        camera.yaw=.55;camera.pitch=-.14;
        mouseLook=new MouseLook(this,(dx,dy)->MouseLook.rotate(camera,dx,dy));
        addKeyListener(this);addMouseListener(mouseLook);addMouseMotionListener(mouseLook);
        addFocusListener(this);addFocusListener(mouseLook);
        timer=new javax.swing.Timer(110,e->frame());timer.start();
    }
    public void close(){timer.stop();keys.clear();mouseLook.close();}
    /** Accept only frames addressed to ghost; never interpret BODY/TEAMMAP/PROGRESS. */
    public void onEvent(String packet){
        if(!SwingUtilities.isEventDispatchThread())throw new IllegalStateException("ghost UI update must be on EDT");
        try{
            List<String> p=LanProtocol.parts(packet);
            if(p.size()==6&&p.get(0).equals("GPOSE")){
                int next=LanProtocol.integer(p.get(1),0,HouseMap.EXTRACTION_ROOM-1);
                double x=LanProtocol.integer(p.get(2),0,HouseMap.WIDTH*1000)/1000.0;
                double z=LanProtocol.integer(p.get(3),0,HouseMap.HEIGHT*1000)/1000.0;
                LanProtocol.integer(p.get(4),0,359);
                tick=LanProtocol.integer(p.get(5),0,99999999);
                if(map.roomAt(x,z)!=next)throw new IllegalArgumentException("inconsistent spectral coordinates");
                room=next;camera.x=x;camera.z=z;
                feedback="HOST SPECTRAL POSE SYNCHRONIZED";
            }else if(p.size()==7&&p.get(0).equals("STATE")){
                int reportedRoom=LanProtocol.integer(p.get(2),0,HouseMap.EXTRACTION_ROOM-1);
                energy=LanProtocol.integer(p.get(4),0,100);
                legal=p.get(5);
                audible=p.get(6).equals("1");
                // The host's ROOM state always wins if a GPOSE packet is delayed.
                if(room!=-1&&reportedRoom!=room)feedback="Room transition pending host pose";
            }else if(packet.startsWith("RESULT|")){finished=true;feedback=packet;keys.clear();}
            else if(packet.startsWith("ACCEPT|")||packet.startsWith("REJECT|"))feedback=packet;
        }catch(IllegalArgumentException ex){feedback="Invalid spectral snapshot rejected";}
        repaint();
    }
    private void frame(){
        if(!isDisplayable()||finished){repaint();return;}
        try{
            int f=(keys.contains(KeyEvent.VK_W)?1:0)-(keys.contains(KeyEvent.VK_S)?1:0);
            int r=(keys.contains(KeyEvent.VK_D)?1:0)-(keys.contains(KeyEvent.VK_A)?1:0);
            if(room>=0&&(f!=0||r!=0)){
                double dx=Math.sin(camera.yaw)*f+Math.cos(camera.yaw)*r;
                double dz=Math.cos(camera.yaw)*f-Math.sin(camera.yaw)*r;
                double length=Math.hypot(dx,dz);
                client.ghostStep((int)Math.round(dx/length*100),(int)Math.round(dz/length*100));
            }
            int heading=Math.floorMod((int)Math.round(Math.toDegrees(camera.yaw)),360);
            if(room>=0&&lastTurn!=heading){client.ghostTurn(heading);lastTurn=heading;}
        }catch(IOException ex){feedback="Disconnected: "+ex.getMessage();close();}
        if(room>=0)camera.drawNetwork(map,List.of(),-1,tick*.1);
        repaint();
    }
    private List<Integer> exits(){return room<0?List.of():map.ghostExits(room);}
    private void ability(GhostDomain.Action action){
        if(finished||room<0)return;
        List<Integer> exits=exits();
        int dest=action==GhostDomain.Action.DRIFT&&!exits.isEmpty()?exits.get(Math.floorMod(choice,exits.size())):room;
        try{client.ghost(action,dest);feedback="Awaiting host "+action+" validation";}
        catch(IOException ex){feedback="Ghost command failed: "+ex.getMessage();}
    }
    public int ghostRoom(){return room;}
    public int energy(){return energy;}
    public String feedback(){return feedback;}
    public boolean isCaptured(){return mouseLook.captured();}
    @Override public void keyPressed(KeyEvent e){
        switch(e.getKeyCode()){
            case KeyEvent.VK_ESCAPE -> {Window w=SwingUtilities.getWindowAncestor(this);if(w!=null)w.dispose();}
            case KeyEvent.VK_OPEN_BRACKET -> choice--;
            case KeyEvent.VK_CLOSE_BRACKET -> choice++;
            case KeyEvent.VK_SPACE,KeyEvent.VK_ENTER -> ability(GhostDomain.Action.DRIFT);
            case KeyEvent.VK_1 -> ability(GhostDomain.Action.WHISPER);
            case KeyEvent.VK_2 -> ability(GhostDomain.Action.DISTURB);
            case KeyEvent.VK_3 -> ability(GhostDomain.Action.MANIFEST);
            case KeyEvent.VK_4 -> ability(GhostDomain.Action.STRIKE);
            case KeyEvent.VK_LEFT -> camera.yaw-=.1;
            case KeyEvent.VK_RIGHT -> camera.yaw+=.1;
            case KeyEvent.VK_UP -> camera.pitch=Math.min(1.05,camera.pitch+.06);
            case KeyEvent.VK_DOWN -> camera.pitch=Math.max(-1.05,camera.pitch-.06);
            default -> keys.add(e.getKeyCode());
        }
    }
    @Override public void keyReleased(KeyEvent e){keys.remove(e.getKeyCode());}
    @Override public void keyTyped(KeyEvent e){}
    @Override public void focusGained(FocusEvent e){}
    @Override public void focusLost(FocusEvent e){keys.clear();mouseLook.release();}
    @Override protected void paintComponent(Graphics base){
        super.paintComponent(base);
        Graphics2D g=(Graphics2D)base.create();
        try{
            int h=Math.max(170,getHeight()-109);
            g.setColor(Color.BLACK);g.fillRect(0,0,getWidth(),getHeight());
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,RenderingHints.VALUE_INTERPOLATION_NEAREST_NEIGHBOR);
            if(room>=0)g.drawImage(camera.image(),0,0,getWidth(),h,null);
            // Translucent purple visual language, independent of hunter-only data.
            g.setColor(new Color(76,26,100,36));g.fillRect(0,0,getWidth(),h);
            g.setColor(new Color(223,194,249));g.setFont(new Font(Font.MONOSPACED,Font.BOLD,14));
            g.drawString("BECKENBURG / LAN SPECTRAL GHOST",14,25);
            g.drawString("ROOM "+map.roomName(room)+"   ENERGY "+energy+"/100   "+(audible?"FOOTSTEPS AUDIBLE":"SILENT"),14,47);
            g.drawString("+",getWidth()/2,h/2);
            g.setColor(new Color(17,16,25));g.fillRect(0,h,getWidth(),getHeight()-h);
            g.setColor(new Color(219,196,242));
            List<Integer> exits=exits();
            g.drawString("WASD SPECTRAL VIEW  CLICK TO CAPTURE / ARROWS LOOK  ESC EXIT",12,h+22);
            g.drawString("[ ] SELECT ROOM  SPACE DRIFT -> "+(exits.isEmpty()?"NONE":map.roomName(exits.get(Math.floorMod(choice,exits.size())))),12,h+42);
            g.drawString("1 WHISPER   2 DISTURB   3 MANIFEST   4 STRIKE   READY "+legal,12,h+64);
            g.setColor(new Color(144,206,189));
            g.drawString(feedback.substring(0,Math.min(feedback.length(),108)),12,h+86);
        }finally{g.dispose();}
    }
}
