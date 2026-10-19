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
    private final LanAudio audio=new LanAudio();
    private final AtmosphereAudio atmosphere=new AtmosphereAudio(AtmosphereAudio.Scene.FIELD);
    private MissionWeather.State currentWeather;
    private int room=-1,energy,tick,choice,lastTurn=-1;
    private int burstRemaining=30,burstMax=30;
    private boolean bursting;
    private boolean audible,finished;
    private String legal="[]",feedback="Awaiting private spectral pose";
    private int actionDueTick=-1;
    private GhostFrenzy.Phase frenzyPhase=GhostFrenzy.Phase.CALM;
    private int frenzyTicks;
    private List<GhostDomain.Action> offered=List.of();
    private String lastAutomaticAction="";
    private LanGhostHearing.Event hearing;
    private int lastHearingTick=-1;
    private String ghostSpecies="UNKNOWN",behaviorName="RESTLESS";
    private GhostIdentity.Type revealedType;

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
    public void close(){timer.stop();keys.clear();mouseLook.close();audio.close();atmosphere.close();}
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
            }else if(p.size()==4&&p.get(0).equals("STAMINA")){
                burstRemaining=LanProtocol.integer(p.get(1),0,300);
                burstMax=LanProtocol.integer(p.get(2),0,300);
                bursting=LanProtocol.integer(p.get(3),0,1)==1;
                if(burstRemaining>burstMax)throw new IllegalArgumentException("invalid stamina");
            }else if(p.size()==7&&p.get(0).equals("STATE")){
                int reportedRoom=LanProtocol.integer(p.get(2),0,HouseMap.EXTRACTION_ROOM-1);
                energy=LanProtocol.integer(p.get(4),0,100);
                legal=p.get(5);
                audible=p.get(6).equals("1");
                // The host's ROOM state always wins if a GPOSE packet is delayed.
                if(room!=-1&&reportedRoom!=room)feedback="Room transition pending host pose";
            }else if(p.size()==3&&p.get(0).equals("GTYPE")){
                revealedType=GhostIdentity.Type.valueOf(p.get(1));
                ghostSpecies=revealedType.name();
                behaviorName=GhostIdentity.Behavior.valueOf(p.get(2)).name();
            }else if(p.get(0).equals("GHEAR")){
                LanGhostHearing.Event cue=LanGhostHearing.decode(packet);
                if(!finished&&cue.tick()>=lastHearingTick&&cue.tick()>=tick-18){
                    hearing=cue;lastHearingTick=cue.tick();
                    LanSound.Cue sound=switch(cue.source()){
                        case FOOTSTEP->LanSound.Cue.FOOTFALL;
                        case DOOR->LanSound.Cue.DOOR;
                        case EQUIPMENT->LanSound.Cue.EQUIPMENT;
                        case RITUAL->LanSound.Cue.RITUAL;
                        case VOICE->LanSound.Cue.WHISPER;
                    };
                    int pan=switch(cue.direction()){
                        case LEFT->-75;case RIGHT->75;case AHEAD,BEHIND,HERE->0;
                    };
                    int volume=switch(cue.strength()){
                        case FAINT->30;case NEAR->58;case LOUD->86;
                    };
                    audio.play(new LanSound.CueEvent(sound,pan,volume,cue.tick()));
                }
            }else if(p.get(0).equals("WEATHER")){
                MissionWeather.State current=MissionWeather.State.parse(packet);
                if(currentWeather==null||current.revision()>=currentWeather.revision()){
                    currentWeather=current;
                    atmosphere.setWeather(current);
                    camera.setWeather(current);
                }
            }else if(p.size()==4&&p.get(0).equals("FRENZY")){
                frenzyPhase=GhostFrenzy.Phase.valueOf(p.get(1));
                frenzyTicks=LanProtocol.integer(p.get(2),0,10000);
                GhostFrenzy.Cause.valueOf(p.get(3));
                atmosphere.setHunt(frenzyPhase==GhostFrenzy.Phase.WARNING
                    ||frenzyPhase==GhostFrenzy.Phase.RAGING);
            }else if(p.size()>=4&&p.size()<=7&&p.get(0).equals("GPROMPT")){
                int sampleTick=LanProtocol.integer(p.get(1),0,99999999);
                int due=LanProtocol.integer(p.get(2),0,99999999);
                LanProtocol.integer(p.get(3),0,HouseMap.EXTRACTION_ROOM-1);
                List<GhostDomain.Action> options=new ArrayList<>();
                for(int i=4;i<p.size();i++){
                    GhostDomain.Action candidate=GhostDomain.Action.valueOf(p.get(i));
                    if(candidate==GhostDomain.Action.DRIFT||options.contains(candidate))
                        throw new IllegalArgumentException("invalid haunt menu");
                    options.add(candidate);
                }
                if(sampleTick>=tick-8){
                    actionDueTick=due;
                    offered=List.copyOf(options);
                }
            }else if(p.size()==4&&p.get(0).equals("GFORCED")){
                GhostDomain.Action action=GhostDomain.Action.valueOf(p.get(1));
                int place=LanProtocol.integer(p.get(2),0,HouseMap.EXTRACTION_ROOM-1);
                LanProtocol.integer(p.get(3),0,99999999);
                lastAutomaticAction=action+" in "+map.roomName(place);
                feedback="DEADLINE EXPIRED: "+lastAutomaticAction;
            }else if(packet.startsWith("RESULT|")){
                finished=true;
                boolean victory=packet.equals("RESULT|CLEANSED")
                    ||packet.equals("RESULT|BANISHED")
                    ||packet.equals("RESULT|ABSOLVED");
                feedback=victory?"INVESTIGATORS COMPLETED THE RITUAL":
                    "THE ENTITY PREVAILS - RITUAL UNFINISHED";
                keys.clear();
                atmosphere.setHunt(false);atmosphere.setRitual(false);
            }else if(p.size()>=3&&p.get(0).equals("ACCEPT")&&p.get(1).equals("GHOST")){
                GhostDomain.Action applied=GhostDomain.Action.valueOf(p.get(2));
                LanSound.Cue result=switch(applied){
                    case WHISPER->LanSound.Cue.WHISPER;
                    case DISTURB->LanSound.Cue.DISTURB;
                    case MANIFEST->LanSound.Cue.MANIFEST;
                    case STRIKE->LanSound.Cue.STRIKE;
                    case SIGNATURE->LanSound.Cue.SIGNATURE;
                    case DRIFT->LanSound.Cue.GHOST_DRIFT;
                };
                audio.play(new LanSound.CueEvent(result,0,65,tick));
                feedback=packet;
            }else if(packet.startsWith("ACCEPT|")||packet.startsWith("REJECT|"))feedback=packet;
        }catch(IllegalArgumentException ex){feedback="Invalid spectral snapshot rejected";}
        repaint();
    }
    private void frame(){
        atmosphere.setActive(isShowing()&&!finished);
        atmosphere.setOutside(room>=0&&map.outside(room));
        if(!isDisplayable()||finished){repaint();return;}
        try{
            int f=(keys.contains(KeyEvent.VK_W)?1:0)-(keys.contains(KeyEvent.VK_S)?1:0);
            int r=(keys.contains(KeyEvent.VK_D)?1:0)-(keys.contains(KeyEvent.VK_A)?1:0);
            if(room>=0&&(f!=0||r!=0)){
                double dx=Math.sin(camera.yaw)*f+Math.cos(camera.yaw)*r;
                double dz=Math.cos(camera.yaw)*f-Math.sin(camera.yaw)*r;
                double length=Math.hypot(dx,dz);
                client.ghostStep((int)Math.round(dx/length*100),
                    (int)Math.round(dz/length*100),keys.contains(KeyEvent.VK_SHIFT));
            }
            int heading=Math.floorMod((int)Math.round(Math.toDegrees(camera.yaw)),360);
            if(room>=0&&lastTurn!=heading){client.ghostTurn(heading);lastTurn=heading;}
        }catch(IOException ex){feedback="Disconnected: "+ex.getMessage();close();}
        if(room>=0)camera.drawNetwork(map,List.of(),-1,tick*.1);
        repaint();
    }
    private List<Integer> exits(){return room<0?List.of():map.ghostExits(room);}
    private void chosen(int index){
        if(index>=0&&index<offered.size())ability(offered.get(index));
        else feedback="NO LEGAL ACTION IN THAT SLOT";
    }
    private void ability(GhostDomain.Action action){
        if(finished||room<0)return;
        List<Integer> exits=exits();
        int dest=action==GhostDomain.Action.DRIFT&&!exits.isEmpty()?exits.get(Math.floorMod(choice,exits.size())):room;
        try{client.ghost(action,dest);feedback="Awaiting host "+action+" validation";}
        catch(IOException ex){feedback="Ghost command failed: "+ex.getMessage();}
    }
    private void frenzyAttack(GhostFrenzy.Attack attack){
        if(frenzyPhase!=GhostFrenzy.Phase.RAGING){
            feedback="FRENZY ATTACKS REQUIRE THE RAGING PHASE";return;
        }
        if(revealedType!=null&&!GhostFrenzy.profile(revealedType).permits(attack)){
            feedback="THIS SPECIES CANNOT USE "+attack+" DURING FRENZY";return;
        }
        try{client.frenzyAttack(attack);feedback="Host validating frenzy "+attack;}
        catch(IOException error){feedback="Frenzy attack failed: "+error.getMessage();}
    }
    public int ghostRoom(){return room;}
    public int energy(){return energy;}
    public String ghostSpecies(){return ghostSpecies;}
    public String feedback(){return feedback;}
    public int actionDeadline(){return actionDueTick;}
    public List<GhostDomain.Action> offeredActions(){return offered;}
    public String automaticAction(){return lastAutomaticAction;}
    public boolean isCaptured(){return mouseLook.captured();}
    public String currentHearing(){
        return !finished&&hearing!=null&&tick<=hearing.tick()+18?hearing.caption():"";
    }
    @Override public void keyPressed(KeyEvent e){
        switch(e.getKeyCode()){
            case KeyEvent.VK_ESCAPE -> {Window w=SwingUtilities.getWindowAncestor(this);if(w!=null)w.dispose();}
            case KeyEvent.VK_OPEN_BRACKET -> choice--;
            case KeyEvent.VK_CLOSE_BRACKET -> choice++;
            case KeyEvent.VK_SPACE,KeyEvent.VK_ENTER -> ability(GhostDomain.Action.DRIFT);
            case KeyEvent.VK_1 -> chosen(0);
            case KeyEvent.VK_2 -> chosen(1);
            case KeyEvent.VK_3 -> chosen(2);
            case KeyEvent.VK_4 -> ability(GhostDomain.Action.STRIKE);
            case KeyEvent.VK_5 -> ability(GhostDomain.Action.SIGNATURE);
            case KeyEvent.VK_6 -> {
                try{client.frenzy();feedback="Requesting MAJOR ACTION: GHOST FRENZY";}
                catch(IOException failure){feedback="Frenzy request failed: "+failure.getMessage();}
            }
            case KeyEvent.VK_7 -> frenzyAttack(GhostFrenzy.Attack.CLAW);
            case KeyEvent.VK_8 -> frenzyAttack(GhostFrenzy.Attack.DREAD);
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

            int w=getWidth(),h=getHeight();
            g.setColor(Color.BLACK);g.fillRect(0,0,w,h);
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,RenderingHints.VALUE_INTERPOLATION_NEAREST_NEIGHBOR);
            if(room>=0)g.drawImage(camera.image(),0,0,w,h,null);
            g.setColor(new Color(76,26,100,36));g.fillRect(0,0,w,h);
            g.setFont(new Font(Font.MONOSPACED,Font.BOLD,13));
            int identityWidth=Math.min(w-24,480);
            g.setColor(new Color(22,13,31,219));g.fillRoundRect(12,10,identityWidth,65,9,9);
            g.setColor(new Color(232,208,247));
            g.drawString("SPECTRAL / "+ghostSpecies+" / "+behaviorName,23,30);
            g.drawString(map.roomName(room)+"  |  ENERGY "+energy+"/100",23,50);
            g.setColor(audible?new Color(238,166,151):new Color(192,167,210));
            g.drawString(audible?"SOUND DETECTED":"QUIET",23,66);
            g.setColor(new Color(233,210,248));g.drawString("+",w/2,h/2);
            SprintHud.draw(g,12,h-163,Math.min(255,w-24),
                "GHOST BURST / SHIFT",burstRemaining,burstMax,bursting);
            if(!currentHearing().isEmpty()){
                String heard=currentHearing();
                if(heard.length()>70)heard=heard.substring(0,67)+"...";
                g.setColor(new Color(28,14,39,220));g.fillRoundRect(12,84,
                    Math.min(w-24,Math.max(240,g.getFontMetrics().stringWidth(heard)+24)),31,8,8);
                g.setColor(new Color(199,170,239));g.drawString("HEARD: "+heard,22,105);
            }
            List<Integer> exits=exits();
            int width=Math.min(w-24,620),panelY=h-117;
            g.setColor(new Color(23,14,32,225));g.fillRoundRect(12,panelY,width,105,8,8);
            g.setColor(new Color(235,206,244));g.drawString("SPECTRAL ACTIONS",24,panelY+22);
            g.setFont(new Font(Font.MONOSPACED,Font.PLAIN,12));
            StringBuilder actions=new StringBuilder();
            for(int i=0;i<offered.size();i++)actions.append(i+1).append(": ").append(offered.get(i)).append("   ");
            if(offered.isEmpty())actions.append("RECHARGING");
            String abilities=actions.toString();
            if(abilities.length()>66)abilities=abilities.substring(0,63)+"...";
            g.drawString(abilities,24,panelY+42);
            g.drawString("[ / ] EXIT: "+(exits.isEmpty()?"NONE":map.roomName(exits.get(Math.floorMod(choice,exits.size()))))+
                "   SPACE DRIFT",24,panelY+62);
            int remaining=actionDueTick<0?-1:Math.max(0,(actionDueTick-tick+9)/10);
            g.setColor(remaining>=0&&remaining<=3?new Color(255,174,166):new Color(194,207,217));
            GhostFrenzy.Profile costs=revealedType==null?null:GhostFrenzy.profile(revealedType);
            String abilityCosts=costs==null?"6 FRENZY / 7 CLAW / 8 DREAD"
                :"6 FRENZY "+costs.energyCost()+"E / 7 CLAW "+
                    (costs.permits(GhostFrenzy.Attack.CLAW)?costs.clawCost()+"E":"N/A")+
                    " / 8 DREAD "+costs.dreadCost()+"E";
            g.drawString("NEXT EVENT "+(remaining<0?"WAITING":remaining+"s")+" / "+abilityCosts,
                24,panelY+82);
            if(frenzyPhase!=GhostFrenzy.Phase.CALM){
                g.setColor(new Color(255,166,156));
                g.drawString("FRENZY "+frenzyPhase+" / "+(frenzyTicks/10)+"s",24,panelY-12);
            }
            if(!feedback.isBlank()){
                String note=feedback.length()>76?feedback.substring(0,73)+"...":feedback;
                g.setColor(new Color(190,235,206));g.drawString(note,24,panelY-10);
            }
        }finally{g.dispose();}
    }
}
