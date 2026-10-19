package org.beckenburg;

import javax.swing.*;
import java.awt.*;
import java.awt.event.*;
import java.util.HashSet;
import java.util.Set;

/** Walkable castle preparation lobby; service desks and purchases exist as world interactions. */
public final class CastleHubPanel extends JPanel implements KeyListener,FocusListener {
    public interface Actions {
        void begin();void network();void spectral();void menu();
        void cycleRole();void cycleWeather();String role();String weather();
    }
    private final CastleHubMap map=new CastleHubMap();
    private final SceneRenderer renderer=new SceneRenderer();
    private final ProfileStore profile;
    private final Actions actions;
    private final MouseLook look;
    private final Set<Integer> down=new HashSet<>();
    private final javax.swing.Timer timer;
    private final AtmosphereAudio atmosphere=new AtmosphereAudio(AtmosphereAudio.Scene.CASTLE);
    private long last=System.nanoTime();
    private double clock;
    private boolean castleLightsOn=true;
    private String notice="Welcome to Beckenburg Castle. The equipment is real; look and press E.";
    private int noticeTicks=100;
    public CastleHubPanel(ProfileStore profile,Actions actions){
        this.profile=java.util.Objects.requireNonNull(profile);
        this.actions=java.util.Objects.requireNonNull(actions);
        setFocusable(true);setBackground(new Color(11,12,17));
        renderer.x=13.5;renderer.z=19.3;renderer.yaw=Math.PI;renderer.pitch=-.07;
        look=new MouseLook(this,(dx,dy)->MouseLook.rotate(renderer,dx,dy));
        addKeyListener(this);addFocusListener(this);addFocusListener(look);
        addMouseListener(look);addMouseMotionListener(look);
        renderer.drawCastle(map,0);
        timer=new javax.swing.Timer(33,e->frame());timer.start();
    }
    public void close(){timer.stop();down.clear();look.close();atmosphere.close();}
    private void frame(){
        atmosphere.setActive(isShowing());
        if(!isShowing()){last=System.nanoTime();return;}
        long now=System.nanoTime();double dt=Math.min(.07,Math.max(0,(now-last)/1e9));last=now;
        if(down.contains(KeyEvent.VK_LEFT))renderer.yaw-=dt*1.65;
        if(down.contains(KeyEvent.VK_RIGHT))renderer.yaw+=dt*1.65;
        if(down.contains(KeyEvent.VK_UP))renderer.pitch=Math.min(1.05,renderer.pitch+dt);
        if(down.contains(KeyEvent.VK_DOWN))renderer.pitch=Math.max(-1.05,renderer.pitch-dt);
        double forward=(down.contains(KeyEvent.VK_W)?1:0)-(down.contains(KeyEvent.VK_S)?1:0);
        double strafe=(down.contains(KeyEvent.VK_D)?1:0)-(down.contains(KeyEvent.VK_A)?1:0);
        double norm=Math.hypot(forward,strafe);
        if(norm>0){
            double priorX=renderer.x,priorZ=renderer.z;
            double speed=(down.contains(KeyEvent.VK_SHIFT)?3.9:2.6)*dt/norm;
            double dx=(Math.sin(renderer.yaw)*forward+Math.cos(renderer.yaw)*strafe)*speed;
            double dz=(Math.cos(renderer.yaw)*forward-Math.sin(renderer.yaw)*strafe)*speed;
            if(map.traversable(renderer.x+dx,renderer.z))renderer.x+=dx;
            if(map.traversable(renderer.x,renderer.z+dz))renderer.z+=dz;
            if(Math.hypot(renderer.x-priorX,renderer.z-priorZ)>.0001)
                GameSfx.play(map.footstep(renderer.x,renderer.z));
        }
        clock+=dt;
        GraphicsOptions.current().configure(renderer,getWidth(),getHeight(),true);
        renderer.drawCastle(map,clock,castleLightsOn);
        if(noticeTicks>0)noticeTicks--;
        repaint();
    }
    private void use(CastleHubMap.Station station){
        if(station==null){
            if(CastleHubDecor.aimed(map,renderer.x,renderer.z,renderer.yaw)!=null){
                castleLightsOn=!castleLightsOn;
                GameSfx.play(LanSound.Cue.SWITCH);
                notice="Castle lights "+(castleLightsOn?"on.":"off.");
                noticeTicks=80;return;
            }
            notice="Look at a station or light switch.";noticeTicks=75;return;
        }
        try{
            switch(station){
                case ARMORY_UV,ARMORY_SALT -> {
                    EquipmentLoadout.Item item=station==CastleHubMap.Station.ARMORY_UV?
                        EquipmentLoadout.Item.UV_LAMP:EquipmentLoadout.Item.SALT;
                    if(profile.ownsEquipment(item))notice=item.label+" already owned / appears in van rack.";
                    else {
                        boolean bought=profile.purchaseEquipment(item);
                        if(bought)GameSfx.play(LanSound.Cue.PICKUP);
                        notice=bought?"Purchased "+item.label+". Now stocked in your expedition van.":
                            "Need £"+ProfileStore.equipmentPrice(item)+" to purchase "+item.label;
                    }
                }
                case ROLE -> {actions.cycleRole();GameSfx.play(LanSound.Cue.SELECT);notice="Hunter discipline: "+actions.role();}
                case CONTRACT -> {actions.cycleWeather();GameSfx.play(LanSound.Cue.SELECT);notice="Selected weather: "+actions.weather();}
                case EXPEDITION -> {actions.begin();return;}
                case MULTIPLAYER -> {actions.network();return;}
                case SPECTRAL -> {actions.spectral();return;}
            }
        }catch(java.io.IOException e){notice="Purchase not saved: "+e.getMessage();}
        noticeTicks=110;
    }
    @Override public void keyPressed(KeyEvent e){
        if(!isShowing())return;
        int key=e.getKeyCode();if(down.contains(key))return;
        if(key==KeyEvent.VK_ESCAPE){actions.menu();return;}
        if(key==KeyEvent.VK_E)use(CastleHubDecor.aimed(map,renderer.x,renderer.z,renderer.yaw)!=null?
            null:map.aimed(renderer.x,renderer.z,renderer.yaw));
        if(key==KeyEvent.VK_F)renderer.lamp=!renderer.lamp;
        if(key==KeyEvent.VK_L){castleLightsOn=!castleLightsOn;GameSfx.play(LanSound.Cue.SWITCH);}
        down.add(key);
    }
    @Override public void keyReleased(KeyEvent e){down.remove(e.getKeyCode());}
    @Override public void keyTyped(KeyEvent e){}
    @Override public void focusGained(FocusEvent e){last=System.nanoTime();}
    @Override public void focusLost(FocusEvent e){down.clear();look.release();}
    @Override protected void paintComponent(Graphics src){
        super.paintComponent(src);
        Graphics2D g=(Graphics2D)src.create();
        try{
            int w=getWidth(),h=getHeight();
            GraphicsOptions.current().draw(g,renderer.image(),w,h);

            g.setFont(new Font(Font.MONOSPACED,Font.BOLD,14));
            g.setColor(new Color(11,17,23,214));
            g.fillRoundRect(12,10,Math.min(w-24,450),42,8,8);
            g.setColor(new Color(243,223,179));
            g.drawString("BECKENBURG CASTLE",25,29);
            g.setFont(new Font(Font.MONOSPACED,Font.PLAIN,12));
            g.setColor(new Color(186,215,202));
            g.drawString("£"+profile.currency()+"   /   "+actions.role(),25,44);
            g.setColor(new Color(230,215,174));
            g.drawString("+",w/2-4,h/2+4);
            CastleHubMap.Station station=map.aimed(renderer.x,renderer.z,renderer.yaw);
            boolean atSwitch=CastleHubDecor.aimed(map,renderer.x,renderer.z,renderer.yaw)!=null;
            if(station!=null||atSwitch){
                String label=atSwitch?"CASTLE LIGHT SWITCH":station.label;
                int labelWidth=Math.min(w-24,Math.max(250,g.getFontMetrics().stringWidth(label)+50));
                int left=(w-labelWidth)/2;
                g.setColor(new Color(11,16,21,220));g.fillRoundRect(left,h-75,labelWidth,36,8,8);
                g.setColor(new Color(247,211,153));g.drawString("[ E ]  "+label,left+12,h-52);
            }
            // Only context prompts and transient notices overlay the scene; controls
            // belong to the dedicated menu, not a permanent bottom-screen ticker.
            if(noticeTicks>0){
                String text=notice.length()>70?notice.substring(0,67)+"...":notice;
                int boxWidth=Math.min(w-24,Math.max(290,g.getFontMetrics().stringWidth(text)+24));
                g.setColor(new Color(12,24,27,220));g.fillRoundRect(12,60,boxWidth,35,8,8);
                g.setColor(new Color(162,223,193));g.drawString(text,24,82);
            }
            g.setColor(new Color(11,17,23,212));g.fillRoundRect(Math.max(12,w-172),12,160,30,8,8);
            g.setColor(new Color(216,220,212));g.drawString("ESC  /  MAIN MENU",Math.max(20,w-162),32);
        }finally{g.dispose();}
    }
}