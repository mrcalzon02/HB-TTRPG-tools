package org.beckenburg;

import javax.swing.*;
import java.awt.*;
import java.awt.event.*;
import java.util.List;

/** Local first-person spectral command-training viewport. No privileged ghost information. */
public final class GhostPracticePanel extends JPanel implements KeyListener,MouseListener,MouseMotionListener,FocusListener {
    private final HouseMap map=new HouseMap();
    private final GhostPracticeSession practice=new GhostPracticeSession(map,20261015L);
    private final SceneRenderer renderer=new SceneRenderer();
    private final Runnable exit;
    private final javax.swing.Timer timer;
    private long last=System.nanoTime();
    private double accumulator;
    private int choice,oldX,oldY;
    private boolean dragging;

    public GhostPracticePanel(Runnable exit){
        this.exit=java.util.Objects.requireNonNull(exit);
        setFocusable(true);
        addKeyListener(this);addMouseListener(this);addMouseMotionListener(this);addFocusListener(this);
        // Face the first audible investigator, not an empty wall at startup.
        renderer.yaw=-.56;renderer.pitch=-.04;
        syncCamera();
        renderer.drawPractice(map,practice.visibleHunterRoom(),0);
        timer=new javax.swing.Timer(33,e->frame());timer.start();
    }
    public void close(){timer.stop();dragging=false;}
    public GhostPracticeSession session(){return practice;}
    private void syncCamera(){
        renderer.x=map.centerX(practice.ghostRoom());
        renderer.z=map.centerZ(practice.ghostRoom());
    }
    private void frame(){
        long now=System.nanoTime();double dt=Math.max(0,Math.min(.075,(now-last)/1e9));last=now;
        accumulator+=dt;
        while(accumulator>=.1){practice.tick();accumulator-=.1;}
        syncCamera();
        renderer.drawPractice(map,practice.visibleHunterRoom(),practice.tickCount()*.1);
        repaint();
    }
    private List<Integer> exits(){return practice.observation().exits();}
    private void cycle(int direction){
        List<Integer> paths=exits();
        if(!paths.isEmpty())choice=Math.floorMod(choice+direction,paths.size());
        repaint();
    }
    private void invoke(GhostDomain.Action action){
        if(action==GhostDomain.Action.DRIFT){
            List<Integer> paths=exits();
            if(paths.isEmpty())return;
            practice.act(action,paths.get(Math.floorMod(choice,paths.size())));
            choice=0;
        } else practice.act(action,practice.ghostRoom());
        syncCamera();repaint();
    }
    @Override public void keyPressed(KeyEvent e){
        switch(e.getKeyCode()){
            case KeyEvent.VK_ESCAPE -> { close();exit.run(); }
            case KeyEvent.VK_OPEN_BRACKET -> cycle(-1);
            case KeyEvent.VK_CLOSE_BRACKET -> cycle(1);
            case KeyEvent.VK_SPACE,KeyEvent.VK_ENTER -> invoke(GhostDomain.Action.DRIFT);
            case KeyEvent.VK_1 -> invoke(GhostDomain.Action.WHISPER);
            case KeyEvent.VK_2 -> invoke(GhostDomain.Action.DISTURB);
            case KeyEvent.VK_3 -> invoke(GhostDomain.Action.MANIFEST);
            case KeyEvent.VK_4 -> invoke(GhostDomain.Action.STRIKE);
            case KeyEvent.VK_LEFT -> renderer.yaw-=.12;
            case KeyEvent.VK_RIGHT -> renderer.yaw+=.12;
            case KeyEvent.VK_UP -> renderer.pitch=Math.min(1.05,renderer.pitch+.08);
            case KeyEvent.VK_DOWN -> renderer.pitch=Math.max(-1.05,renderer.pitch-.08);
            default -> { }
        }
    }
    @Override public void keyReleased(KeyEvent e){}
    @Override public void keyTyped(KeyEvent e){}
    @Override public void mousePressed(MouseEvent e){oldX=e.getX();oldY=e.getY();dragging=e.getButton()==MouseEvent.BUTTON1;requestFocusInWindow();}
    @Override public void mouseReleased(MouseEvent e){dragging=false;}
    @Override public void mouseDragged(MouseEvent e){
        if(!dragging)return;
        renderer.yaw+=(e.getX()-oldX)*.004;
        renderer.pitch=Math.max(-1.05,Math.min(1.05,renderer.pitch-(e.getY()-oldY)*.004));
        oldX=e.getX();oldY=e.getY();
    }
    @Override public void mouseMoved(MouseEvent e){}
    @Override public void mouseClicked(MouseEvent e){}
    @Override public void mouseEntered(MouseEvent e){}
    @Override public void mouseExited(MouseEvent e){dragging=false;}
    @Override public void focusGained(FocusEvent e){last=System.nanoTime();}
    @Override public void focusLost(FocusEvent e){dragging=false;}
    @Override protected void paintComponent(Graphics original){
        super.paintComponent(original);
        Graphics2D g=(Graphics2D)original.create();
        try{
            int stageH=Math.max(250,getHeight()-116);
            g.setColor(Color.BLACK);g.fillRect(0,0,getWidth(),getHeight());
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,RenderingHints.VALUE_INTERPOLATION_NEAREST_NEIGHBOR);
            g.drawImage(renderer.image(),0,0,getWidth(),stageH,null);
            g.setFont(new Font(Font.MONOSPACED,Font.BOLD,Math.max(12,getHeight()/52)));
            g.setColor(new Color(220,180,245));
            g.drawString("BECKENBURG / GHOST PRACTICE — LOCAL",14,25);
            GhostDomain.Observation obs=practice.observation();
            g.drawString("SPECTRAL ROOM "+map.roomName(obs.room())+"    ENERGY "+obs.energy()+"/100",14,46);
            g.drawString(obs.hearsHunter()?"PRESENCE: HUNTER AUDIBLE NEARBY":"PRESENCE: SILENT",14,67);
            g.drawString("+",getWidth()/2,stageH/2);
            g.setColor(new Color(18,19,28));g.fillRect(0,stageH,getWidth(),getHeight()-stageH);
            g.setColor(new Color(225,211,236));
            List<Integer> paths=obs.exits();
            String target=paths.isEmpty()?"NONE":map.roomName(paths.get(Math.floorMod(choice,paths.size())));
            g.drawString("[ / ] SELECT ROOM    SPACE DRIFT → "+target,14,stageH+24);
            g.drawString("1 WHISPER  2 DISTURB  3 MANIFEST  4 STRIKE  ESC CASTLE",14,stageH+46);
            g.setColor(new Color(152,206,180));
            g.drawString("READY: "+obs.legalActions()+"   HITS: "+practice.strikes()+"/2",14,stageH+68);
            g.setColor(practice.outcome()==GhostPracticeSession.Outcome.ACTIVE?new Color(212,176,228):new Color(147,235,171));
            String status=practice.status();
            g.drawString(status.substring(0,Math.min(105,status.length())),14,stageH+94);
        }finally{g.dispose();}
    }
}
