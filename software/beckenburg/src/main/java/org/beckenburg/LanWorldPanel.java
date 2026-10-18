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
    private final Map<Integer,String> hunterNames=new HashMap<>();
    private final javax.swing.Timer timer;
    private final Set<Integer> keys=new HashSet<>();
    private String feedback="Awaiting host world snapshot";
    private int lastTurn=-1,tick,visibleGhost=-1,health=100,sanity=100,evidence;
    private int crosses=2,throwWards=2,saltPouches=3;
    private int partySize=3,partyDifficulty=3,fieldCredits=400;
    private final int[] medicine=new int[6];
    private VanTelemetry.Display meters;
    private final java.util.ArrayDeque<Integer> activityHistory=new java.util.ArrayDeque<>();
    private boolean vanDisplay,concealed;
    private int lastVanPoll=-100000;
    private final List<SceneRenderer.WorldMark> counterMarks=new ArrayList<>();
    private SceneRenderer.Apparition apparition;
    private boolean orbForm;
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
    private final FieldJournal fieldNotes=new FieldJournal();
    private int journalPage,guideCursor,guideGhostIndex;
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
            if(p.size()==3&&p.get(0).equals("PLAYERNAME")){
                int hunter=LanProtocol.integer(p.get(1),0,5);
                String nickname=LanProtocol.cleanName(p.get(2));
                if(hunter!=seat)hunterNames.put(hunter,nickname);
            }else if(p.size()==6&&p.get(0).equals("BODY")){
                int who=LanProtocol.integer(p.get(1),0,5);
                double x=LanProtocol.integer(p.get(2),0,HouseMap.WIDTH*1000)/1000.0;
                double z=LanProtocol.integer(p.get(3),0,HouseMap.HEIGHT*1000)/1000.0;
                int heading=LanProtocol.integer(p.get(4),0,359);
                tick=LanProtocol.integer(p.get(5),0,99999999);
                if(who==seat){renderer.x=x;renderer.z=z;feedback="HOST SYNC ACTIVE — movement and doors server controlled";}
                else peers.put(who,new SceneRenderer.RemoteBody(x,z,who,heading));
            }else if(p.size()==3&&p.get(0).equals("PEER")&&p.get(1).equals("LEFT")){
                int gone=LanProtocol.integer(p.get(2),0,5);
                if(gone!=seat){peers.remove(gone);hunterNames.remove(gone);}
                feedback="INVESTIGATOR "+(gone+1)+" DISCONNECTED - CASE CONTINUES";
            }else if(p.size()==2&&p.get(0).equals("FORM")){
                if(!p.get(1).equals("ORBS")&&!p.get(1).equals("FIGURE"))
                    throw new IllegalArgumentException("invalid ghost form");
                orbForm=p.get(1).equals("ORBS");
            }else if(p.get(0).equals("APPARITION")){
                if(p.size()==3 && p.get(1).equals("HIDDEN")){
                    apparition=null;
                    lastMotionTick=-1;
                }else if(p.size()==5 && p.get(1).equals("VISIBLE")){
                    double gx=LanProtocol.integer(p.get(2),0,HouseMap.WIDTH*1000)/1000.0;
                    double gz=LanProtocol.integer(p.get(3),0,HouseMap.HEIGHT*1000)/1000.0;
                    int eventTick=LanProtocol.integer(p.get(4),0,99999999);
                    if(apparition==null)apparitionWarningTick=eventTick;
                    apparition=apparition==null?
                            new SceneRenderer.Apparition(gx,gz,LanGhostAnimation.Phase.LURK,0,0,orbForm)
                            :new SceneRenderer.Apparition(gx,gz,apparition.phase(),
                                apparition.heading(),apparition.progress(),orbForm);
                }else throw new IllegalArgumentException("malformed apparition");
            }else if(p.get(0).equals("MOTION")){
                LanGhostAnimation.Motion motion=LanGhostAnimation.decode(frame);
                if(apparition!=null && motion.tick()>=lastMotionTick){
                    apparition=new SceneRenderer.Apparition(apparition.x(),apparition.z(),
                            motion.phase(),motion.heading(),motion.progress(),orbForm);
                    lastMotionTick=motion.tick();
                }
            }else if(p.size()==2&&p.get(0).equals("DOORS")){
                map.applyDoorSnapshot(p.get(1));
            }else if(p.size()==7&&p.get(0).equals("STATE")){
                visibleGhost=LanProtocol.integer(p.get(3),-1,HouseMap.ROOM_COUNT-1);
            }else if(p.size()==8&&p.get(0).equals("PROGRESS")){
                health=LanProtocol.integer(p.get(1),0,100);
                evidence=LanProtocol.integer(p.get(4),0,3);
                sanity=100-LanProtocol.integer(p.get(2),0,100);
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
            }else if(p.get(0).equals("COUNTER")){
                if(p.size()==2&&p.get(1).equals("RESET"))counterMarks.clear();
                else if(p.size()==7){
                    LanProtocol.integer(p.get(1),1,10000000);
                    HunterCounters.Kind kind=HunterCounters.Kind.valueOf(p.get(2));
                    double xx=LanProtocol.integer(p.get(3),0,HouseMap.WIDTH*1000)/1000.0;
                    double zz=LanProtocol.integer(p.get(4),0,HouseMap.HEIGHT*1000)/1000.0;
                    double yy=LanProtocol.integer(p.get(5),0,3000)/1000.0;
                    LanProtocol.integer(p.get(6),0,300);
                    counterMarks.add(new SceneRenderer.WorldMark(xx,zz,yy,kind));
                }else throw new IllegalArgumentException("bad counter snapshot");
            }else if(p.size()==2&&p.get(0).equals("HIDECONFIG")){
                renderer.hidingDensity=LanProtocol.integer(p.get(1),0,100);
            }else if(p.size()==2&&p.get(0).equals("HIDING")){
                concealed=LanProtocol.integer(p.get(1),0,1)==1;
                feedback=concealed?"HIDDEN: do not move or you will become exposed":"LEFT HIDING PLACE";
            }else if(p.size()==3&&p.get(0).equals("PARTY")){
                partySize=LanProtocol.integer(p.get(1),1,6);
                partyDifficulty=LanProtocol.integer(p.get(2),1,30);
            }else if(p.get(0).equals("VANMETERS")){
                VanTelemetry.Display next=VanTelemetry.Display.decode(frame);
                if(meters==null||meters.tick()!=next.tick()){
                    activityHistory.addLast(next.activity());
                    if(activityHistory.size()>32)activityHistory.removeFirst();
                }
                meters=next;
            }else if(p.size()==8&&p.get(0).equals("SUPPLY")){
                fieldCredits=LanProtocol.integer(p.get(1),0,100000);
                for(int i=0;i<6;i++)medicine[i]=LanProtocol.integer(p.get(i+2),0,4);
            }else if(p.size()==4&&p.get(0).equals("COUNTERAMMO")){
                crosses=LanProtocol.integer(p.get(1),0,2);
                throwWards=LanProtocol.integer(p.get(2),0,2);
                saltPouches=LanProtocol.integer(p.get(3),0,3);
            }else if(p.get(0).equals("FIELD")||p.get(0).equals("FEED")){
                feedback=p.get(0).equals("FEED")?"SANITY DRAIN: an entity is feeding nearby":frame.substring(6);
            }else if(p.size()==2&&p.get(0).equals("NOTES")&&p.get(1).equals("RESET")){
                fieldNotes.clear();
            }else if(p.get(0).equals("NOTE")){
                fieldNotes.accept(FieldJournal.Note.decode(frame));
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
                    threatTarget=LanProtocol.integer(p.get(3),0,5);
                    threatUntilTick=tick+ticks;
                    threatOutcome="";
                }else if(p.size()==3&&(p.get(1).equals("EVADED")||p.get(1).equals("HIT"))){
                    threatTarget=LanProtocol.integer(p.get(2),0,5);
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
    private boolean insideVan(){
        var local=map.van().local(renderer.x,renderer.z);
        return map.roomAt(renderer.x,renderer.z)==HouseMap.EXTRACTION_ROOM
            &&Math.abs(local.x())<VanStaging.HALF_WIDTH-.2
            &&local.z()>=VanStaging.FRONT&&local.z()<VanStaging.REAR-.2;
    }
    private void showSupplyStore(){
        if(map.van().stationAt(renderer.x,renderer.z)!=VanStaging.Station.EQUIPMENT){
            feedback="PURCHASE MEDICINE AT THE EQUIPMENT RACK";return;
        }
        mouseLook.release();keys.clear();
        String[] options=new String[6];
        int i=0;
        for(FieldSupplies.Kind kind:FieldSupplies.Kind.values())
            for(FieldSupplies.Tier tier:FieldSupplies.Tier.values())
                options[i++]=kind+" / "+tier.name()+" / £"+tier.price+" / restore "+tier.restore(kind);
        Object choice=JOptionPane.showInputDialog(this,
            "CREDITS £"+fieldCredits+"    /    PURCHASE 1 FIELD ITEM",
            "VAN EQUIPMENT SUPPLIES",JOptionPane.PLAIN_MESSAGE,null,options,options[0]);
        if(choice!=null)for(int n=0;n<options.length;n++)if(options[n].equals(choice)){
            FieldSupplies.Kind kind=FieldSupplies.Kind.values()[n/3];
            FieldSupplies.Tier tier=FieldSupplies.Tier.values()[n%3];
            sendAction("buy "+kind,()->client.purchaseSupply(kind,tier));
            break;
        }
        requestFocusInWindow();
    }
    private void consumeMedicine(FieldSupplies.Kind kind){
        int offset=kind.ordinal()*3;
        for(int at=2;at>=0;at--)if(medicine[offset+at]>0){
            FieldSupplies.Tier tier=FieldSupplies.Tier.values()[at];
            sendAction("use "+kind,()->client.useSupply(kind,tier));return;
        }
        feedback="NO PURCHASED "+kind+" MEDICINE";
    }
    private void frame(){
        if(!isDisplayable()||!caseResult.isEmpty()){repaint();return;}
        if(vanDisplay&&!insideVan()){vanDisplay=false;meters=null;}
        if(vanDisplay&&tick-lastVanPoll>=11){
            try{client.vanMonitor();lastVanPoll=tick;}
            catch(IOException e){feedback="Van display disconnected: "+e.getMessage();vanDisplay=false;}
        }
        int right=(keys.contains(KeyEvent.VK_D)?1:0)-(keys.contains(KeyEvent.VK_A)?1:0);
        int forward=(keys.contains(KeyEvent.VK_W)?1:0)-(keys.contains(KeyEvent.VK_S)?1:0);
        try{
            if(health>0&&(forward!=0||right!=0)){
                double dx=Math.sin(renderer.yaw)*forward+Math.cos(renderer.yaw)*right;
                double dz=Math.cos(renderer.yaw)*forward-Math.sin(renderer.yaw)*right;
                double len=Math.hypot(dx,dz);
                int mx=(int)Math.round(dx/len*100),mz=(int)Math.round(dz/len*100);
                if(mx!=0||mz!=0){
                    concealed=false;
                    client.step(mx,mz,keys.contains(KeyEvent.VK_SHIFT));
                }
            }
            int heading=Math.floorMod((int)Math.round(Math.toDegrees(renderer.yaw)),360);
            if(heading!=lastTurn){client.turn(heading);lastTurn=heading;}
        }catch(IOException e){feedback="LAN disconnected: "+e.getMessage();close();}
        renderer.drawNetwork(map,new ArrayList<>(peers.values()),apparition,tick*.1,List.copyOf(counterMarks));
        repaint();
    }
    @Override protected void paintComponent(Graphics original){
        super.paintComponent(original);Graphics2D g=(Graphics2D)original.create();
        try{
            int h=Math.max(160,getHeight()-82);
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,RenderingHints.VALUE_INTERPOLATION_NEAREST_NEIGHBOR);
            g.drawImage(renderer.image(),0,0,getWidth(),h,null);
            drawHunterNameplates(g,h);
            g.setFont(new Font(Font.MONOSPACED,Font.BOLD,Math.max(12,getHeight()/46)));
            g.setColor(new Color(234,222,189));
            g.drawString("BECKENBURG / LAN HOUSE — HUNTER "+(seat+1)+
                "   PARTY "+partySize+"  DIFFICULTY +"+partyDifficulty,13,26);
            g.drawString(map.roomName(renderer.x,renderer.z)+" | TEAM "+(peers.size()+1)+" / 6 | HP "+health+
                " | SANITY "+sanity+" | CLUES "+evidence+"/3",13,46);
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
                    "WASD MOVE / SHIFT SPRINT / L HIDE / M VAN / E DOOR / ARROWS LOOK",13,h+23);
            g.drawString(health==0?"NO MOVEMENT OR EQUIPMENT WHILE INCAPACITATED":
                    "1-3 "+selected+" R SCAN  Z CROSS("+crosses+")  G WARD("+throwWards+
                    ") H SALT("+saltPouches+") K SHOP  T HP  Y SAN  M VAN",13,h+42);
            g.setColor(new Color(145,204,175));
            g.drawString((mouseLook.captured()?"MOUSE LOCKED | ":"CLICK TO LOCK LOOK | ")+feedback,13,h+62);
            if(vanDisplay)drawVanMeters(g,h);
            if(casefileOpen && journalPage!=0)drawFieldJournal(g,h);
            if(casefileOpen && journalPage==0){
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
    /** In-van board: actual individual sanity, deliberately approximate activity history. */
    /** Hunter-only 2D labels projected from real 3D sprite locations after depth rendering. */
    private void drawHunterNameplates(Graphics2D g,int viewHeight){
        g.setFont(new Font(Font.MONOSPACED,Font.BOLD,13));
        FontMetrics metrics=g.getFontMetrics();
        for(var entry:peers.entrySet()){
            String label=hunterNames.get(entry.getKey());
            if(label==null||label.isBlank())continue;
            SceneRenderer.Nameplate anchor=renderer.teammateNameplate(map,entry.getValue());
            if(anchor==null)continue;
            int px=(int)Math.round(anchor.x()*getWidth()/(double)SceneRenderer.W);
            int py=(int)Math.round(anchor.y()*viewHeight/(double)SceneRenderer.H);
            int width=metrics.stringWidth(label)+12;
            int left=Math.max(4,Math.min(getWidth()-width-4,px-width/2));
            if(py<metrics.getHeight()+4||py>viewHeight-6||width>=getWidth()-8)continue;
            int top=py-metrics.getAscent()-7;
            g.setColor(new Color(9,16,21,190));g.fillRoundRect(left,top,width,
                metrics.getHeight()+6,7,7);
            g.setColor(new Color(179,219,224));
            g.drawRoundRect(left,top,width,metrics.getHeight()+6,7,7);
            g.setColor(new Color(245,248,240));
            g.drawString(label,left+6,py);
        }
    }
    private void drawVanMeters(Graphics2D g,int h){
        int left=Math.max(15,(getWidth()-560)/2),top=73,w=Math.min(560,getWidth()-30),height=330;
        g.setColor(new Color(12,17,25,244));g.fillRoundRect(left,top,w,height,9,9);
        g.setColor(new Color(219,208,177));g.setFont(new Font(Font.MONOSPACED,Font.BOLD,15));
        g.drawString("VAN / SANITY AND ACTIVITY",left+18,top+29);
        g.setFont(new Font(Font.MONOSPACED,Font.PLAIN,12));
        if(meters==null){
            g.drawString("Awaiting host instrument sample...",left+18,top+56);return;
        }
        int[] sanity=meters.sanity();
        for(int i=0;i<6;i++){
            int y=top+56+i*27;
            int value=sanity[i];
            g.setColor(new Color(209,219,223));
            g.drawString("H"+(i+1)+" "+(value<0?"OFFLINE":value+"%"),left+18,y);
            g.setColor(new Color(45,54,60));g.fillRoundRect(left+125,y-12,115,10,3,3);
            if(value>=0){
                g.setColor(value<35?new Color(209,113,115):value<65?
                    new Color(203,168,105):new Color(126,199,168));
                g.fillRoundRect(left+125,y-12,115*value/100,10,3,3);
            }
        }
        int x0=left+266,y0=top+65,plotWidth=Math.max(130,w-286),plotHeight=154;
        g.setColor(new Color(42,51,65));g.fillRect(x0,y0,plotWidth,plotHeight);
        g.setColor(new Color(180,200,203));
        g.drawString("ACTIVITY / UNCERTAIN",x0,y0-8);
        g.drawString(meters.activity()+"/10",x0+plotWidth-42,y0-8);
        int size=activityHistory.size(),index=0,prevX=-1,prevY=-1;
        g.setColor(new Color(147,213,190));
        for(int val:activityHistory){
            int px=x0+(size<=1?0:index*plotWidth/(size-1));
            int py=y0+plotHeight-6-val*(plotHeight-12)/10;
            if(prevX>=0)g.drawLine(prevX,prevY,px,py);
            prevX=px;prevY=py;index++;
        }
        g.setColor(new Color(183,188,198));
        g.drawString("LAGGED / NOISY / NOT EXACT GHOST ENERGY",left+18,top+260);
        g.drawString("M CLOSE  |  K AT RACK TO BUY   T HEALTH  Y SANITY",left+18,top+282);
        g.drawString("CREDITS £"+fieldCredits,left+18,top+306);
    }
    /** One compact casebook with instrument results, observations and type reference. */
    private void drawFieldJournal(Graphics2D g,int viewHeight){
        int left=20,top=82,width=Math.min(getWidth()-40,750),height=Math.max(175,Math.min(viewHeight-100,390));
        g.setColor(new Color(11,15,23,241));g.fillRoundRect(left,top,width,height,8,8);
        g.setColor(new Color(213,195,153));
        g.setFont(new Font(Font.MONOSPACED,Font.BOLD,14));
        g.drawString(journalPage==1?"FIELD NOTES / TAB: QUICK REFERENCE":"GHOST REFERENCE / TAB: INSTRUMENT LOG",
            left+13,top+23);
        g.setFont(new Font(Font.MONOSPACED,Font.PLAIN,12));
        if(journalPage==1){
            GhostFieldGuide.Clue[] clues=GhostFieldGuide.Clue.values();
            int first=Math.max(0,Math.min(clues.length-11,guideCursor-5));
            for(int row=0;row<11&&first+row<clues.length;row++){
                int at=first+row;
                GhostFieldGuide.Clue clue=clues[at];
                FieldJournal.Status value=fieldNotes.status(clue);
                g.setColor(at==guideCursor?new Color(247,221,161):value==FieldJournal.Status.SEEN?
                    new Color(154,223,169):new Color(204,208,210));
                String mark=value==FieldJournal.Status.SEEN?"[X]":value==FieldJournal.Status.UNSURE?"[?]":"[ ]";
                String label=clue.label;
                if(label.length()>42)label=label.substring(0,39)+"...";
                g.drawString((at==guideCursor?">":" ")+mark+" "+label,left+13,top+47+row*21);
            }
            int right=left+width-218;
            g.setColor(new Color(202,183,143));g.drawString("POSSIBLE GHOSTS",right,top+47);
            var list=GhostFieldGuide.ordered(fieldNotes);
            g.drawString(list.size()+"/13 remain",right,top+67);
            int shown=Math.min(10,list.size());
            for(int i=0;i<shown;i++){
                var type=list.get(i);
                g.setColor(i==0?new Color(233,210,169):new Color(198,208,208));
                g.drawString(type.name()+"  "+GhostFieldGuide.suspicion(type,fieldNotes),
                    right,top+92+i*20);
            }
            if(list.isEmpty())g.drawString("CONFLICTING CLUES",right,top+94);
            g.setColor(new Color(175,194,210));
            g.drawString("UP/DOWN select   SPACE mark   TAB page   J close",left+13,top+height-12);
        }else{
            GhostIdentity.Type type=GhostIdentity.Type.values()[guideGhostIndex];
            int y=top+48;
            for(String line:GhostFieldGuide.reference(type).split("\n")){
                String text=line.length()>Math.max(20,(width-25)/8)?
                    line.substring(0,Math.max(17,(width-35)/8))+"...":line;
                g.drawString(text,left+13,y);y+=26;
            }
            y+=10;
            for(String line:GhostFieldGuide.hint(type).split("\n")){g.drawString(line,left+13,y);y+=22;}
            g.setColor(new Color(175,194,210));
            g.drawString("LEFT/RIGHT browse species  TAB evidence  J close",left+13,top+height-12);
        }
    }
    @Override public void keyPressed(KeyEvent e){
        if(e.getKeyCode()==KeyEvent.VK_ESCAPE && casefileOpen){
            casefileOpen=false;repaint();return;
        }
        if(e.getKeyCode()==KeyEvent.VK_TAB){
            if(!casefileOpen){casefileOpen=true;journalPage=1;}
            else journalPage=(journalPage+1)%3;
            e.consume();repaint();return;
        }
        if(casefileOpen&&journalPage==1){
            if(e.getKeyCode()==KeyEvent.VK_UP){guideCursor=(guideCursor+GhostFieldGuide.Clue.values().length-1)%GhostFieldGuide.Clue.values().length;repaint();return;}
            if(e.getKeyCode()==KeyEvent.VK_DOWN){guideCursor=(guideCursor+1)%GhostFieldGuide.Clue.values().length;repaint();return;}
            if(e.getKeyCode()==KeyEvent.VK_SPACE){
                GhostFieldGuide.Clue clue=GhostFieldGuide.Clue.values()[guideCursor];
                FieldJournal.Status next=switch(fieldNotes.status(clue)){
                    case UNKNOWN->FieldJournal.Status.SEEN;
                    case SEEN->FieldJournal.Status.UNSURE;
                    case UNSURE->FieldJournal.Status.UNKNOWN;
                };
                sendAction("note",()->client.note(clue,next));repaint();return;
            }
        }
        if(casefileOpen&&journalPage==2){
            if(e.getKeyCode()==KeyEvent.VK_LEFT){guideGhostIndex=Math.floorMod(guideGhostIndex-1,GhostIdentity.Type.values().length);repaint();return;}
            if(e.getKeyCode()==KeyEvent.VK_RIGHT){guideGhostIndex=(guideGhostIndex+1)%GhostIdentity.Type.values().length;repaint();return;}
        }
        switch(e.getKeyCode()){
            case KeyEvent.VK_ESCAPE -> {Window window=SwingUtilities.getWindowAncestor(this);if(window!=null)window.dispose();}
            case KeyEvent.VK_E -> sendAction("door",()->client.door());
            case KeyEvent.VK_1 -> selected=LanCase.Tool.EMF;
            case KeyEvent.VK_2 -> selected=LanCase.Tool.THERMOMETER;
            case KeyEvent.VK_3 -> selected=LanCase.Tool.SPIRIT_BOX;
            case KeyEvent.VK_R -> sendAction("scan",()->client.scan(selected));
            case KeyEvent.VK_Z -> sendAction("cross",()->client.deploy(HunterCounters.Kind.CROSS));
            case KeyEvent.VK_G -> sendAction("thrown ward",()->client.deploy(HunterCounters.Kind.WARD));
            case KeyEvent.VK_H -> sendAction("salt",()->client.deploy(HunterCounters.Kind.SALT));
            case KeyEvent.VK_U -> sendAction("UV",()->client.scanUv());
            case KeyEvent.VK_L -> sendAction("hide",()->client.hide());
            case KeyEvent.VK_M -> {
                if(vanDisplay)vanDisplay=false;
                else if(insideVan()){
                    vanDisplay=true;meters=null;activityHistory.clear();lastVanPoll=-100000;
                    sendAction("van monitor",()->client.vanMonitor());
                    lastVanPoll=tick;
                }else feedback="MONITORS ONLY ACCESSIBLE INSIDE THE VAN";
            }
            case KeyEvent.VK_K -> showSupplyStore();
            case KeyEvent.VK_T -> consumeMedicine(FieldSupplies.Kind.HEALTH);
            case KeyEvent.VK_Y -> consumeMedicine(FieldSupplies.Kind.SANITY);
            case KeyEvent.VK_J -> {casefileOpen=!casefileOpen;if(casefileOpen)journalPage=0;}
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
