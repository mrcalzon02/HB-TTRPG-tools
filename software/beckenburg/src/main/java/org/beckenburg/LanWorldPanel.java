package org.beckenburg;

import javax.swing.*;
import java.awt.*;
import java.awt.event.*;
import java.io.IOException;
import java.util.*;
import java.util.List;

/** Networked hunter viewport. Render state is projected from host packets, never trusted as authority. */
public final class LanWorldPanel extends JPanel implements KeyListener, MouseListener, MouseMotionListener, FocusListener {
    private final LanClient client;
    private final int seat;
    private final HouseMap map=new HouseMap();
    private final SceneRenderer renderer=new SceneRenderer();
    private final Map<Integer,SceneRenderer.RemoteBody> peers=new HashMap<>();
    private final javax.swing.Timer timer;
    private final Set<Integer> keys=new HashSet<>();
    private String feedback="Awaiting host world snapshot";
    private int lastTurn=-1,tick,visibleGhost=-1,health=100,evidence;
    private int mouseX,mouseY;
    private boolean dragging;

    public LanWorldPanel(LanClient client){
        this.client=Objects.requireNonNull(client);
        if(client.seat().equals("GHOST"))throw new IllegalArgumentException("hunter-only world view");
        seat=Integer.parseInt(client.seat().substring(1))-1;
        setFocusable(true);setBackground(Color.BLACK);
        setPreferredSize(new Dimension(850,555));
        renderer.yaw=1.4;renderer.pitch=-.08;
        addKeyListener(this);addMouseListener(this);addMouseMotionListener(this);addFocusListener(this);
        timer=new javax.swing.Timer(110,e->frame());timer.start();
    }
    public void close(){timer.stop();keys.clear();dragging=false;}
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
            }else if(p.size()==2&&p.get(0).equals("DOORS")){
                map.applyDoorSnapshot(p.get(1));
            }else if(p.size()==7&&p.get(0).equals("STATE")){
                visibleGhost=LanProtocol.integer(p.get(3),-1,HouseMap.ROOM_COUNT-1);
            }else if(p.size()==8&&p.get(0).equals("PROGRESS")){
                health=LanProtocol.integer(p.get(1),0,100);
                evidence=LanProtocol.integer(p.get(4),0,3);
            }else if(frame.startsWith("REJECT|")||frame.startsWith("ACCEPT|DOOR")){
                feedback=frame;
            }
        }catch(IllegalArgumentException ignored){feedback="Invalid world update rejected";}
        repaint();
    }
    public HouseMap worldMap(){return map;}
    public double cameraX(){return renderer.x;}
    public double cameraZ(){return renderer.z;}
    public int visiblePeers(){return peers.size();}
    private void frame(){
        if(!isDisplayable()){return;}
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
        renderer.drawNetwork(map,new ArrayList<>(peers.values()),visibleGhost,tick*.1);
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
            g.setColor(new Color(17,19,25));g.fillRect(0,h,getWidth(),getHeight()-h);
            g.setColor(new Color(216,215,202));
            g.drawString("WASD MOVE  •  DRAG / ARROWS LOOK  •  E OPEN DOOR  •  ESC RETURN TO LOBBY",13,h+27);
            g.setColor(new Color(145,204,175));g.drawString(feedback,13,h+54);
        }finally{g.dispose();}
    }
    @Override public void keyPressed(KeyEvent e){
        switch(e.getKeyCode()){
            case KeyEvent.VK_ESCAPE -> {Window window=SwingUtilities.getWindowAncestor(this);if(window!=null)window.dispose();}
            case KeyEvent.VK_E -> {try{client.door();}catch(IOException ex){feedback="Cannot open door: "+ex.getMessage();}}
            case KeyEvent.VK_LEFT -> renderer.yaw-=.09;
            case KeyEvent.VK_RIGHT -> renderer.yaw+=.09;
            case KeyEvent.VK_UP -> renderer.pitch=Math.min(1.05,renderer.pitch+.06);
            case KeyEvent.VK_DOWN -> renderer.pitch=Math.max(-1.05,renderer.pitch-.06);
            default -> keys.add(e.getKeyCode());
        }
    }
    @Override public void keyReleased(KeyEvent e){keys.remove(e.getKeyCode());}
    @Override public void keyTyped(KeyEvent e){}
    @Override public void mousePressed(MouseEvent e){mouseX=e.getX();mouseY=e.getY();dragging=e.getButton()==MouseEvent.BUTTON1;requestFocusInWindow();}
    @Override public void mouseDragged(MouseEvent e){if(!dragging)return;renderer.yaw+=(e.getX()-mouseX)*.004;
        renderer.pitch=Math.max(-1.05,Math.min(1.05,renderer.pitch-(e.getY()-mouseY)*.004));mouseX=e.getX();mouseY=e.getY();}
    @Override public void mouseReleased(MouseEvent e){dragging=false;}
    @Override public void mouseMoved(MouseEvent e){}
    @Override public void mouseClicked(MouseEvent e){}
    @Override public void mouseEntered(MouseEvent e){}
    @Override public void mouseExited(MouseEvent e){}
    @Override public void focusGained(FocusEvent e){}
    @Override public void focusLost(FocusEvent e){keys.clear();dragging=false;}
}
