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
    private final RoomLighting lights=new RoomLighting();
    private final SceneRenderer renderer=new SceneRenderer();
    private final Map<Integer,SceneRenderer.RemoteBody> peers=new HashMap<>();
    private final Map<Integer,String> hunterNames=new HashMap<>();
    private final java.util.ArrayDeque<LanChat.Entry> chatHistory=new java.util.ArrayDeque<>();
    private final JTextField chatInput=new JTextField();
    private LanChat.Channel chatChannel=LanChat.Channel.LOCAL;
    private LanChat.Channel heldVoice;
    private int chatVisibleUntil;
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
    private final AtmosphereAudio atmosphere=new AtmosphereAudio(AtmosphereAudio.Scene.FIELD);
    private String soundCaption="";
    private int soundUntilTick=-1;
    private LanCase.Tool selected=LanCase.Tool.EMF; // compatibility with legacy tests
    private final String[] equippedGear={"EMF_READER","THERMOMETER","SPIRIT_BOX","UV_LIGHT"};
    private final java.util.Map<String,EquipmentTiers.Tier> equipmentTier=new java.util.HashMap<>();
    private final java.util.Map<String,String> deviceReading=new java.util.HashMap<>();
    private int activeGearSlot;
    private int heldUseUntilTick;
    private String caseResult="";
    private final List<LanEvidenceJournal.Entry> casefile=new ArrayList<>();
    private final java.util.EnumMap<LanCase.Tool,String> lastMeasurement=
        new java.util.EnumMap<>(LanCase.Tool.class);
    private int casefileScroll;
    private boolean casefileOpen;
    private final FieldJournal fieldNotes=new FieldJournal();
    private int journalPage,guideCursor,guideGhostIndex;
    private GhostIdentity.Type selectedGuess=GhostIdentity.Type.SPIRIT;

    public LanWorldPanel(LanClient client){
        this.client=Objects.requireNonNull(client);
        if(client.seat().equals("GHOST"))throw new IllegalArgumentException("hunter-only world view");
        seat=Integer.parseInt(client.seat().substring(1))-1;
        setFocusable(true);setBackground(Color.BLACK);setLayout(null);
        chatInput.setVisible(false);
        chatInput.setFont(new Font(Font.MONOSPACED,Font.PLAIN,14));
        chatInput.setBackground(new Color(15,20,28));
        chatInput.setForeground(new Color(229,232,222));
        chatInput.setCaretColor(new Color(242,219,158));
        chatInput.addActionListener(e->submitChat());
        chatInput.addKeyListener(new KeyAdapter(){
            @Override public void keyPressed(KeyEvent e){
                if(e.getKeyCode()==KeyEvent.VK_ESCAPE){closeChat();e.consume();}
            }
        });
        add(chatInput);
        setPreferredSize(new Dimension(850,555));
        renderer.yaw=-Math.PI/2;renderer.pitch=-.08;
        renderer.roomLights=lights;
        mouseLook=new MouseLook(this,(dx,dy)->MouseLook.rotate(renderer,dx,dy),
            ()->!casefileOpen);
        addKeyListener(this);addMouseListener(mouseLook);addMouseMotionListener(mouseLook);
        addMouseListener(new MouseAdapter(){
            @Override public void mousePressed(MouseEvent e){
                if(casefileOpen&&journalPage==1&&handleJournalClick(e.getX(),e.getY(),
                        SwingUtilities.isRightMouseButton(e))){
                    e.consume();mouseLook.release();requestFocusInWindow();repaint();
                }
            }
        });
        addFocusListener(mouseLook);addFocusListener(this);
        timer=new javax.swing.Timer(110,e->frame());timer.start();
    }
    @Override public void doLayout(){
        super.doLayout();
        int viewH=Math.max(160,getHeight()-82);
        chatInput.setBounds(14,Math.max(40,viewH-32),Math.max(145,getWidth()-28),26);
    }
    private void openChat(LanChat.Channel channel){
        if(health==0||!caseResult.isEmpty())return;
        chatChannel=channel;
        keys.clear();mouseLook.release();
        chatInput.setText("");
        chatInput.setVisible(true);
        chatInput.requestFocusInWindow();
        repaint();
    }
    private void closeChat(){
        chatInput.setVisible(false);
        chatInput.setText("");
        requestFocusInWindow();
        repaint();
    }
    private void submitChat(){
        String message=chatInput.getText();
        try{
            client.say(chatChannel,message);
            closeChat();
        }catch(IOException|IllegalArgumentException error){
            feedback="CHAT REJECTED: "+error.getMessage();
            chatInput.requestFocusInWindow();
        }
    }
    public void close(){
        releaseVoice();timer.stop();keys.clear();mouseLook.close();audio.close();atmosphere.close();
    }
    private void beginVoice(LanChat.Channel channel){
        if(health<=0||!caseResult.isEmpty()||chatInput.isVisible())return;
        LanVoiceClientAudio voice=client.voice();
        if(voice==null){feedback="VOICE LINK NOT YET READY";return;}
        if(voice.muted()){feedback="VOICE MUTED — F7 TO ENABLE";return;}
        heldVoice=channel;
        voice.setPushToTalk(channel);
        feedback="MIC ON / "+channel+" — RELEASE F3/F4 TO STOP";
    }
    private void releaseVoice(){
        heldVoice=null;
        LanVoiceClientAudio voice=client.voice();
        if(voice!=null)voice.setPushToTalk(null);
    }
    private void voiceSettings(){
        LanVoiceClientAudio voice=client.voice();
        if(voice==null){feedback="VOICE LINK UNAVAILABLE";return;}
        releaseVoice();keys.clear();mouseLook.release();
        JCheckBox mute=new JCheckBox("Mute microphone",voice.muted());
        var devices=LanVoiceClientAudio.microphones();
        JComboBox<String> input=new JComboBox<>();
        input.addItem("System default");
        int selectedDevice=0;
        for(int i=0;i<devices.size();i++){
            var device=devices.get(i);
            input.addItem(device.getName()+" / "+device.getDescription());
            if(device.equals(voice.selectedMicrophone()))selectedDevice=i+1;
        }
        input.setSelectedIndex(selectedDevice);
        JSlider volume=new JSlider(0,100,voice.playbackVolume());
        volume.setMajorTickSpacing(25);volume.setPaintTicks(true);
        JPanel panel=new JPanel(new GridLayout(0,1,4,4));
        panel.add(new JLabel("F3 local / F4 radio — hold to speak"));
        panel.add(mute);
        panel.add(new JLabel("Microphone"));
        panel.add(input);
        panel.add(new JLabel("Incoming voice volume"));panel.add(volume);
        int answer=JOptionPane.showConfirmDialog(this,panel,"VOICE / LOCAL LAN",
            JOptionPane.OK_CANCEL_OPTION,JOptionPane.PLAIN_MESSAGE);
        if(answer==JOptionPane.OK_OPTION){
            voice.setMuted(mute.isSelected());
            voice.selectMicrophone(input.getSelectedIndex()==0?null:
                devices.get(input.getSelectedIndex()-1));
            voice.setPlaybackVolume(volume.getValue());
        }
        requestFocusInWindow();
    }
    public void onEvent(String frame){
        if(!SwingUtilities.isEventDispatchThread())throw new IllegalStateException("network view must update on EDT");
        try{
            List<String> p=LanProtocol.parts(frame);
            if(p.get(0).equals("CHAT")){
                LanChat.Entry line=LanChat.Entry.decode(frame);
                chatHistory.addLast(line);
                if(chatHistory.size()>28)chatHistory.removeFirst();
                chatVisibleUntil=tick+75;
            }else if(p.size()==3&&p.get(0).equals("PLAYERNAME")){
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
            }else if(p.size()==3&&p.get(0).equals("LIGHTS")){
                lights.acceptSnapshot(p.get(1));
                lights.setBreaker(LanProtocol.integer(p.get(2),0,1)==1);
            }else if(p.size()==5&&p.get(0).equals("LIGHTFX")){
                lights.pulseUntil(LanProtocol.integer(p.get(1),0,HouseMap.INDOOR_ROOMS-1),
                    RoomLighting.Interference.valueOf(p.get(2)),
                    LanProtocol.integer(p.get(3),0,99999999),
                    LanProtocol.integer(p.get(4),0,99999999));
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
            }else if(p.size()==7&&p.get(0).equals("GEARSTATE")){
                fieldCredits=LanProtocol.integer(p.get(1),0,100000);
                activeGearSlot=LanProtocol.integer(p.get(2),0,FieldEquipment.SLOTS-1);
                for(int i=0;i<FieldEquipment.SLOTS;i++){
                    String[] parts=p.get(i+3).split(":",-1);
                    if(parts.length!=2||!FieldEquipment.functional(parts[0]))
                        throw new IllegalArgumentException("invalid owned equipment");
                    equippedGear[i]=parts[0];
                    equipmentTier.put(parts[0],EquipmentTiers.Tier.valueOf(parts[1]));
                }
                feedback="EQUIPPED: "+equippedGear[activeGearSlot]+" / "+equipmentTier.get(equippedGear[activeGearSlot]);
            }else if(p.get(0).equals("GEAROWNED")){
                for(int i=1;i<p.size();i++){
                    String[] parts=p.get(i).split(":",-1);
                    if(parts.length!=2||!FieldEquipment.functional(parts[0]))
                        throw new IllegalArgumentException("invalid gear inventory");
                    equipmentTier.put(parts[0],EquipmentTiers.Tier.valueOf(parts[1]));
                }
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
                if(p.size()==2&&p.get(1).equals("RESET")){casefile.clear();casefileScroll=0;}
                else {
                    LanEvidenceJournal.Entry entry=LanEvidenceJournal.Entry.decode(frame);
                    casefile.add(entry);
                    if(casefileScroll>0)casefileScroll++;
                    if(casefile.size()>LanEvidenceJournal.CAPACITY)casefile.remove(0);
                    casefileScroll=Math.min(casefileScroll,Math.max(0,casefile.size()-1));
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
            }else if(p.get(0).equals("DOTS")){
                if(p.size()==2&&p.get(1).equals("RESET")){
                    renderer.dotsPositions.clear();
                    renderer.dotsPassRoom=-1;
                }else if(p.size()==3&&p.get(1).equals("CLEAR")){
                    int owner=LanProtocol.integer(p.get(2),0,5);
                    renderer.dotsPositions.remove(owner);
                }else if(p.size()==7&&p.get(1).equals("PLACE")){
                    int owner=LanProtocol.integer(p.get(2),0,5);
                    int room=LanProtocol.integer(p.get(3),0,HouseMap.INDOOR_ROOMS-1);
                    double x=LanProtocol.integer(p.get(4),0,HouseMap.WIDTH*1000)/1000.0;
                    double z=LanProtocol.integer(p.get(5),0,HouseMap.HEIGHT*1000)/1000.0;
                    EquipmentTiers.Tier gear=EquipmentTiers.Tier.valueOf(p.get(6));
                    renderer.dotsPositions.put(owner,
                        new LanDotsProjectors.Placement(owner,room,x,z,gear));
                    feedback="D.O.T.S. PROJECTOR ACTIVE IN "+map.roomName(room);
                }else if(p.size()==6&&p.get(1).equals("PASS")){
                    int room=LanProtocol.integer(p.get(2),0,HouseMap.INDOOR_ROOMS-1);
                    int eventTick=LanProtocol.integer(p.get(3),0,99999999);
                    double x=LanProtocol.integer(p.get(4),0,HouseMap.WIDTH*1000)/1000.0;
                    double z=LanProtocol.integer(p.get(5),0,HouseMap.HEIGHT*1000)/1000.0;
                    renderer.dotsPassRoom=room;
                    renderer.dotsPassX=x;renderer.dotsPassZ=z;
                    renderer.dotsPassUntil=eventTick+28;
                    feedback="REAL D.O.T.S. PASSAGE / MEASUREMENT RECORDED";
                }else throw new IllegalArgumentException("invalid D.O.T.S. state");
            }else if(p.size()==2&&p.get(0).equals("VANDOOR")){
                map.van().setCargoDoorClosed(LanProtocol.integer(p.get(1),0,1)==1);
                feedback=map.van().cargoDoorClosed()
                    ?"VAN CARGO DOOR CLOSED":"VAN CARGO DOOR OPEN";
            }else if(frame.startsWith("BOOK|")){
                if(p.size()==3&&p.get(1).equals("DEPLOYED"))
                    renderer.placedWritingBookRoom=LanProtocol.integer(p.get(2),0,HouseMap.INDOOR_ROOMS-1);
                else if(p.size()==3&&p.get(1).equals("REMOVED"))
                    renderer.placedWritingBookRoom=-1;
                feedback="WRITING BOOK: "+frame.substring(5);
            }else if(p.size()==4&&p.get(0).equals("ACCEPT")
                    &&p.get(1).equals("GEARUSE")){
                if(!FieldEquipment.functional(p.get(2)))
                    throw new IllegalArgumentException("unknown gear result");
                deviceReading.put(p.get(2),p.get(3));
                if(p.get(2).equals("EMF_READER"))lastMeasurement.put(LanCase.Tool.EMF,p.get(3));
                if(p.get(2).equals("THERMOMETER"))lastMeasurement.put(LanCase.Tool.THERMOMETER,p.get(3));
                if(p.get(2).equals("SPIRIT_BOX"))lastMeasurement.put(LanCase.Tool.SPIRIT_BOX,p.get(3));
                feedback=p.get(2)+" / "+p.get(3);
            }else if(frame.startsWith("ACCEPT|SCAN|")){
                String value=frame.substring(12);
                for(LanCase.Tool tool:LanCase.Tool.values())
                    if(value.contains(" "+tool.name()+" ")){
                        lastMeasurement.put(tool,value);break;
                    }
                feedback=frame;
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
    /** Public manual-reference lookup only; never consults the host's hidden type. */
    boolean journalAllows(GhostIdentity.Type type){
        return GhostFieldGuide.remainsPossible(type,fieldNotes);
    }
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
    /** One compact van rack list for actual working devices, never inert catalog props. */
    private void showEquipmentRack(){
        if(map.van().stationAt(renderer.x,renderer.z)!=VanStaging.Station.EQUIPMENT){
            feedback="RETURN TO VAN EQUIPMENT RACK";return;
        }
        mouseLook.release();keys.clear();
        java.util.List<String> options=new java.util.ArrayList<>();
        java.util.List<Runnable> actions=new java.util.ArrayList<>();
        for(String id:java.util.List.of("EMF_READER","THERMOMETER","SPIRIT_BOX",
                "UV_LIGHT","GHOST_WRITING_BOOK","DOTS_PROJECTOR")){
            EquipmentTiers.Tier tier=equipmentTier.getOrDefault(id,EquipmentTiers.Tier.I);
            if(tier!=EquipmentTiers.Tier.III){
                EquipmentTiers.Tier next=EquipmentTiers.Tier.values()[tier.ordinal()+1];
                EquipmentTiers.Stage stage=EquipmentTiers.stage(id,next);
                options.add("UPGRADE "+id+" → "+next+" / £"+stage.creditCost()
                    +" / "+stage.effect());
                actions.add(()->sendAction("upgrade",()->client.buyEquipment(id,next)));
            }
            for(int slot=0;slot<FieldEquipment.SLOTS;slot++){
                final int selectedSlot=slot;
                if(!equippedGear[slot].equals(id)){
                    options.add("EQUIP "+id+" / SLOT "+(slot+1));
                    actions.add(()->sendAction("equip",()->client.equipAt(selectedSlot,id)));
                }
            }
        }
        Object choice=JOptionPane.showInputDialog(this,
            "CREDITS £"+fieldCredits+" / CURRENT "+equippedGear[activeGearSlot]+" / "+equipmentTier.get(equippedGear[activeGearSlot]),
            "FIELD EQUIPMENT",JOptionPane.PLAIN_MESSAGE,null,options.toArray(),
            options.get(0));
        if(choice!=null)for(int i=0;i<options.size();i++)if(options.get(i).equals(choice)){
            actions.get(i).run();break;
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
        atmosphere.setActive(isShowing());
        if(!isDisplayable()||!caseResult.isEmpty()){repaint();return;}
        if(chatInput.isVisible()){
            keys.clear();
            releaseVoice();
        }
        vanDisplay=insideVan();
        if(!vanDisplay){meters=null;}
        if(vanDisplay&&tick-lastVanPoll>=11){
            try{client.vanMonitor();lastVanPoll=tick;}
            catch(IOException e){feedback="Van display disconnected: "+e.getMessage();vanDisplay=false;}
        }
        int right=(keys.contains(KeyEvent.VK_D)?1:0)-(keys.contains(KeyEvent.VK_A)?1:0);
        int forward=(keys.contains(KeyEvent.VK_W)?1:0)-(keys.contains(KeyEvent.VK_S)?1:0);
        try{
            if(!chatInput.isVisible()&&health>0&&(forward!=0||right!=0)){
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
        renderer.roomLightTick=tick;
        renderer.drawNetwork(map,new ArrayList<>(peers.values()),apparition,tick*.1,List.copyOf(counterMarks));
        repaint();
    }
    @Override protected void paintComponent(Graphics original){
        super.paintComponent(original);Graphics2D g=(Graphics2D)original.create();
        try{
            int h=Math.max(160,getHeight()-82);
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,RenderingHints.VALUE_INTERPOLATION_NEAREST_NEIGHBOR);
            g.drawImage(renderer.image(),0,0,getWidth(),h,null);
            String held=equippedGear[activeGearSlot];
            String visual=held.equals("EMF_READER")?"EMF":held;
            HeldToolView.draw(g,getWidth(),h,visual,tick,tick<=heldUseUntilTick,
                renderer.lamp,deviceReading.get(held),
                equipmentTier.getOrDefault(held,EquipmentTiers.Tier.I));
            drawHunterNameplates(g,h);
            g.setFont(new Font(Font.MONOSPACED,Font.BOLD,Math.max(12,getHeight()/46)));
            g.setColor(new Color(234,222,189));
            g.drawString("BECKENBURG / LAN HOUSE — HUNTER "+(seat+1)+
                "   PARTY "+partySize+"  DIFFICULTY +"+partyDifficulty,13,26);
            g.drawString(map.roomName(renderer.x,renderer.z)+" | TEAM "+(peers.size()+1)+" / 6 | HP "+health+
                " | SANITY "+sanity+" | LOG "+casefile.size(),13,46);
            g.drawString("+",getWidth()/2,h/2);
            int switchTarget=lights.aimed(map,renderer.x,renderer.z,renderer.yaw);
            if(switchTarget>=0){
                g.setColor(new Color(251,220,152));
                g.drawString("E / WALL SWITCH "+(lights.on(switchTarget)?"ON":"OFF"),13,h-33);
            }
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
                    "WASD / SHIFT RUN / ENTER TEXT / F2 TEXT RADIO / F3 VOICE / F4 RADIO VOICE",13,h+23);
            g.drawString(health==0?"NO MOVEMENT OR EQUIPMENT WHILE INCAPACITATED":
                    "1-4 GEAR "+equippedGear[activeGearSlot]+" / "+equipmentTier.getOrDefault(equippedGear[activeGearSlot],EquipmentTiers.Tier.I)
                    +"  R USE  F6 GEAR RACK  K MEDICINE  Z CROSS  G WARD  H SALT",13,h+42);
            g.setColor(new Color(145,204,175));
            LanVoiceClientAudio voice=client.voice();
            String mic=voice==null?"VOICE: OFF":voice.muted()?"VOICE: MUTED":
                voice.transmitting()?"MIC: "+heldVoice:voice.connected()?"VOICE: READY":"VOICE: LINKING";
            g.drawString((mouseLook.captured()?"MOUSE LOCKED | ":"CLICK TO LOCK LOOK | ")+
                mic+" | "+feedback,13,h+62);
            drawChat(g,h);
            if(vanDisplay)drawVanMeters(g,h);
            if(casefileOpen && journalPage!=0)drawFieldJournal(g,h);
            if(casefileOpen && journalPage==0){
                int rows=Math.min(casefile.size(),Math.min(8,Math.max(1,(h-135)/37)));
                int width=Math.max(260,getWidth()-48),height=52+rows*37,top=83;
                g.setColor(new Color(10,14,23,232));g.fillRoundRect(20,top,width,height,10,10);
                g.setColor(new Color(190,172,131));g.drawRoundRect(20,top,width,height,10,10);
                g.setFont(new Font(Font.MONOSPACED,Font.BOLD,15));
                g.drawString("SHARED CASEFILE / "+casefile.size()+" READINGS / UP-DOWN SCROLL",33,top+23);
                g.setFont(new Font(Font.MONOSPACED,Font.PLAIN,13));
                g.setColor(new Color(217,218,209));
                if(casefile.isEmpty())g.drawString("No readings. Select a tool, then press R to scan.",33,top+48);
                for(int i=0;i<rows;i++){
                    LanEvidenceJournal.Entry entry=casefile.get(casefile.size()-rows-casefileScroll+i);
                    String line=String.format("T%05d  H%d  %s  /  %s  /  %s",entry.tick(),
                            entry.seat()+1,map.roomName(entry.room()),entry.tool(),entry.finding());
                    int max=Math.max(12,(width-36)/8),y=top+48+i*37;
                    g.setColor(new Color(221,207,167));
                    g.drawString(line.length()>max?line.substring(0,max-3)+"...":line,33,y);
                    g.setColor(new Color(217,218,209));
                    String raw=entry.reading();
                    g.drawString(raw.length()>max?raw.substring(0,max-3)+"...":raw,33,y+16);
                }
            }
        }finally{g.dispose();}
    }
    /** Three compact chat rows by default; editing reveals six. No extra menu hierarchy. */
    private void drawChat(Graphics2D g,int viewHeight){
        if(chatHistory.isEmpty()&&!chatInput.isVisible())return;
        if(!chatInput.isVisible()&&tick>chatVisibleUntil)return;
        int rows=chatInput.isVisible()?6:3;
        int start=Math.max(0,chatHistory.size()-rows),index=0;
        int x=14,y=viewHeight-56-rows*20,w=Math.min(getWidth()-28,590);
        g.setFont(new Font(Font.MONOSPACED,Font.PLAIN,12));
        g.setColor(new Color(11,17,23,203));
        g.fillRoundRect(x,y-19,w,rows*20+24,7,7);
        g.setColor(new Color(203,214,218));
        g.drawString(chatInput.isVisible()?
            ("CHAT / "+chatChannel+"  / ENTER SEND  ESC CANCEL"):
            "TEAM COMMS / ENTER LOCAL  F2 RADIO",x+9,y-5);
        for(LanChat.Entry line:chatHistory){
            if(index++<start)continue;
            String author=line.seat()==seat?"YOU":
                hunterNames.getOrDefault(line.seat(),"H"+(line.seat()+1));
            String msg=(line.channel()==LanChat.Channel.RADIO?"[R] ":"[L] ")+
                author+": "+line.message();
            int max=Math.max(8,(w-20)/7);
            if(msg.length()>max)msg=msg.substring(0,max-3)+"...";
            g.setColor(line.channel()==LanChat.Channel.RADIO?
                new Color(155,216,207):new Color(222,211,183));
            g.drawString(msg,x+9,y+12+(index-start-1)*20);
        }
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
        int w=Math.min(212,Math.max(160,getWidth()/4)),left=getWidth()-w-12,top=85;
        int height=275;
        g.setColor(new Color(12,17,25,207));g.fillRoundRect(left,top,w,height,8,8);
        g.setColor(new Color(219,208,177));g.setFont(new Font(Font.MONOSPACED,Font.BOLD,12));
        g.drawString("VAN / TEAM METERS",left+10,top+19);
        g.setFont(new Font(Font.MONOSPACED,Font.PLAIN,11));
        if(meters==null){g.drawString("Sampling...",left+10,top+39);return;}
        int[] sanity=meters.sanity();
        for(int i=0;i<6;i++){
            int y=top+42+i*22,value=sanity[i];
            g.setColor(new Color(209,219,223));
            g.drawString("H"+(i+1)+" "+(value<0?"--":value+"%"),left+10,y);
            g.setColor(new Color(45,54,60));g.fillRect(left+64,y-9,w-74,8);
            if(value>=0){
                g.setColor(value<35?new Color(209,113,115):new Color(126,199,168));
                g.fillRect(left+64,y-9,(w-74)*value/100,8);
            }
        }
        g.setColor(new Color(180,200,203));g.drawString("ACTIVITY ~"+meters.activity()+"/10",left+10,top+186);
        int x0=left+10,y0=top+205,plotWidth=w-20,plotHeight=42;
        g.setColor(new Color(35,46,58));g.fillRect(x0,y0,plotWidth,plotHeight);
        int size=activityHistory.size(),index=0,prevX=-1,prevY=-1;
        g.setColor(new Color(147,213,190));
        for(int val:activityHistory){
            int px=x0+(size<=1?0:index*plotWidth/(size-1));
            int py=y0+plotHeight-3-val*(plotHeight-7)/10;
            if(prevX>=0)g.drawLine(prevX,prevY,px,py);
            prevX=px;prevY=py;index++;
        }
        g.setColor(new Color(183,188,198));g.drawString("NOISY / NOT EXACT",left+10,top+264);
    }
    /** One compact casebook with instrument results, observations and type reference. */
    private static final int NOTE_LEFT=20, NOTE_TOP=82, NOTE_ROW_HEIGHT=22;
    private int noteWidth(){return Math.min(getWidth()-40,750);}
    private int noteFirst(){
        int count=GhostFieldGuide.activeClues().length;
        return Math.max(0,Math.min(Math.max(0,count-11),guideCursor-5));
    }
    /** Clicking never invokes the host identity validator, only submits a hunter note. */
    boolean handleJournalClick(int x,int y,boolean uncertain){
        if(!casefileOpen||journalPage!=1)return false;
        int width=noteWidth(),right=NOTE_LEFT+width-420;
        if(x>=NOTE_LEFT+10&&x<right-8&&y>=NOTE_TOP+60
                &&y<NOTE_TOP+60+11*NOTE_ROW_HEIGHT){
            int row=(y-(NOTE_TOP+60))/NOTE_ROW_HEIGHT,at=noteFirst()+row;
            GhostFieldGuide.Clue[] clues=GhostFieldGuide.activeClues();
            if(at>=clues.length)return true;
            guideCursor=at;
            GhostFieldGuide.Clue clue=clues[at];
            FieldJournal.Status current=fieldNotes.status(clue);
            FieldJournal.Status next=uncertain
                ?(current==FieldJournal.Status.UNSURE?FieldJournal.Status.UNKNOWN
                    :FieldJournal.Status.UNSURE)
                :(current==FieldJournal.Status.SEEN?FieldJournal.Status.UNKNOWN
                    :FieldJournal.Status.SEEN);
            sendAction("mark evidence",()->client.note(clue,next));
            return true;
        }
        int spacing=Math.max(140,(NOTE_LEFT+width-right-18)/2);
        if(x>=right&&x<right+spacing*2
                &&y>=NOTE_TOP+86&&y<NOTE_TOP+86+7*NOTE_ROW_HEIGHT){
            int column=(x-right)/spacing,row=(y-(NOTE_TOP+86))/NOTE_ROW_HEIGHT;
            int index=column*7+row;
            GhostIdentity.Type[] all=GhostIdentity.Type.values();
            if(index<all.length){
                selectedGuess=all[index];
                feedback="YOUR GHOST CHOICE: "+selectedGuess+" / P TO SUBMIT";
            }
            return true;
        }
        return false;
    }
    private void drawFieldJournal(Graphics2D g,int viewHeight){
        int left=NOTE_LEFT,top=NOTE_TOP,width=noteWidth();
        int height=Math.max(175,Math.min(viewHeight-100,390));
        g.setColor(new Color(15,18,26,244));g.fillRoundRect(left,top,width,height,7,7);
        g.setColor(new Color(218,200,158));g.drawRoundRect(left,top,width,height,7,7);
        g.setFont(new Font(Font.MONOSPACED,Font.BOLD,14));
        g.drawString(journalPage==1?"EVIDENCE / PLAYER NOTES":"GHOST REFERENCE / TAB: LOG",
            left+13,top+24);
        if(journalPage==1){
            GhostFieldGuide.Clue[] clues=GhostFieldGuide.activeClues();
            int first=noteFirst();
            int right=left+width-420;
            g.setColor(new Color(207,195,172));
            g.setFont(new Font(Font.MONOSPACED,Font.BOLD,13));
            g.drawString("MANUAL CHECKLIST",left+12,top+43);
            for(int row=0;row<11&&first+row<clues.length;row++){
                int at=first+row,y=top+60+row*NOTE_ROW_HEIGHT+12;
                GhostFieldGuide.Clue clue=clues[at];
                FieldJournal.Status mark=fieldNotes.status(clue);
                boolean focused=guideCursor==at;
                g.setColor(focused?new Color(246,214,148):new Color(185,182,174));
                g.drawRect(left+15,y-10,12,12);
                if(mark==FieldJournal.Status.SEEN){
                    g.fillRect(left+18,y-7,7,7);
                }else if(mark==FieldJournal.Status.UNSURE)g.drawString("?",left+17,y+1);
                g.setFont(new Font(Font.MONOSPACED,Font.PLAIN,12));
                String label=clue.label;
                int cap=Math.max(12,(right-left-62)/7);
                if(label.length()>cap)label=label.substring(0,cap-1)+"…";
                g.drawString(label,left+34,y);
            }
            g.setColor(new Color(211,191,144));
            g.drawLine(right-12,top+35,right-12,top+height-36);
            g.setFont(new Font(Font.MONOSPACED,Font.BOLD,13));
            g.drawString("GHOST TYPES",right,top+45);
            int remaining=GhostFieldGuide.shortlist(fieldNotes).size();
            g.setFont(new Font(Font.MONOSPACED,Font.PLAIN,11));
            g.setColor(new Color(188,190,181));
            g.drawString(remaining+"/"+GhostIdentity.Type.values().length
                +" match YOUR notes",right,top+65);
            int spacing=Math.max(140,(left+width-right-18)/2);
            GhostIdentity.Type[] all=GhostIdentity.Type.values();
            for(int i=0;i<all.length;i++){
                GhostIdentity.Type type=all[i];
                boolean possible=GhostFieldGuide.remainsPossible(type,fieldNotes);
                int x=right+(i/7)*spacing,y=top+98+(i%7)*NOTE_ROW_HEIGHT;
                if(type==selectedGuess){
                    g.setColor(new Color(165,169,156,70));
                    g.fillRoundRect(x-3,y-14,spacing-8,19,4,4);
                }
                g.setFont(new Font(Font.MONOSPACED,type==selectedGuess?Font.BOLD:Font.PLAIN,12));
                g.setColor(!possible?new Color(103,105,112):
                           type==selectedGuess?new Color(244,211,139):
                           new Color(223,224,209));
                g.drawString(type.name().replace('_',' '),x,y);
                if(!possible){
                    int lineWidth=Math.min(spacing-15,g.getFontMetrics().stringWidth(type.name()));
                    g.drawLine(x,y-4,x+lineWidth,y-4);
                }
            }
            g.setFont(new Font(Font.MONOSPACED,Font.PLAIN,11));
            g.setColor(new Color(183,190,201));
            g.drawString("CLICK / SPACE: tick   RIGHT CLICK: ?   UP/DOWN: scroll",
                left+13,top+height-14);
            g.drawString("Ghost names select a GUESS; nothing is verified",right,top+height-32);
        }else{
            GhostIdentity.Type type=GhostIdentity.Type.values()[guideGhostIndex];
            int y=top+50;
            g.setFont(new Font(Font.MONOSPACED,Font.PLAIN,12));
            for(String line:GhostFieldGuide.reference(type).split("\\n")){
                String text=line.length()>Math.max(20,(width-25)/8)?
                    line.substring(0,Math.max(17,(width-35)/8))+"...":line;
                g.drawString(text,left+13,y);y+=26;
            }
            y+=10;
            for(String line:GhostFieldGuide.hint(type).split("\\n")){
                g.drawString(line,left+13,y);y+=22;
            }
            g.setColor(new Color(175,194,210));
            g.drawString("LEFT/RIGHT browse species   TAB log   J close",
                left+13,top+height-12);
        }
    }
    @Override public void keyPressed(KeyEvent e){
        if(chatInput.isVisible())return;
        if(e.getKeyCode()==KeyEvent.VK_F3){
            beginVoice(LanChat.Channel.LOCAL);return;
        }
        if(e.getKeyCode()==KeyEvent.VK_F4){
            beginVoice(LanChat.Channel.RADIO);return;
        }
        if(e.getKeyCode()==KeyEvent.VK_F7){voiceSettings();return;}
        if(e.getKeyCode()==KeyEvent.VK_ENTER){releaseVoice();openChat(LanChat.Channel.LOCAL);return;}
        if(e.getKeyCode()==KeyEvent.VK_F2){openChat(LanChat.Channel.RADIO);return;}
        if(e.getKeyCode()==KeyEvent.VK_ESCAPE && casefileOpen){
            casefileOpen=false;repaint();return;
        }
        if(e.getKeyCode()==KeyEvent.VK_TAB){
            if(!casefileOpen){casefileOpen=true;journalPage=1;mouseLook.release();keys.clear();}
            else journalPage=(journalPage+1)%3;
            e.consume();repaint();return;
        }
        if(casefileOpen&&journalPage==0){
            int rows=Math.min(casefile.size(),Math.min(8,Math.max(1,(Math.max(160,getHeight()-82)-135)/37)));
            if(e.getKeyCode()==KeyEvent.VK_UP){
                casefileScroll=Math.min(Math.max(0,casefile.size()-rows),casefileScroll+1);repaint();return;
            }
            if(e.getKeyCode()==KeyEvent.VK_DOWN){
                casefileScroll=Math.max(0,casefileScroll-1);repaint();return;
            }
        }
        if(casefileOpen&&journalPage==1){
            if(e.getKeyCode()==KeyEvent.VK_UP){guideCursor=(guideCursor+GhostFieldGuide.activeClues().length-1)%GhostFieldGuide.activeClues().length;repaint();return;}
            if(e.getKeyCode()==KeyEvent.VK_DOWN){guideCursor=(guideCursor+1)%GhostFieldGuide.activeClues().length;repaint();return;}
            if(e.getKeyCode()==KeyEvent.VK_SPACE){
                GhostFieldGuide.Clue clue=GhostFieldGuide.activeClues()[guideCursor];
                FieldJournal.Status next=fieldNotes.status(clue)==FieldJournal.Status.SEEN
                    ?FieldJournal.Status.UNKNOWN:FieldJournal.Status.SEEN;
                sendAction("note",()->client.note(clue,next));repaint();return;
            }
        }
        if(casefileOpen&&journalPage==2){
            if(e.getKeyCode()==KeyEvent.VK_LEFT){guideGhostIndex=Math.floorMod(guideGhostIndex-1,GhostIdentity.Type.values().length);repaint();return;}
            if(e.getKeyCode()==KeyEvent.VK_RIGHT){guideGhostIndex=(guideGhostIndex+1)%GhostIdentity.Type.values().length;repaint();return;}
        }
        if(casefileOpen)return; // An open journal never triggers world equipment or movement.
        switch(e.getKeyCode()){
            case KeyEvent.VK_ESCAPE -> {Window window=SwingUtilities.getWindowAncestor(this);if(window!=null)window.dispose();}
            case KeyEvent.VK_E -> {
                int aimed=lights.aimed(map,renderer.x,renderer.z,renderer.yaw);
                if(map.van().nearDoorButton(renderer.x,renderer.z))
                    sendAction("van cargo door",()->client.vanDoor());
                else if(aimed>=0)sendAction("light switch",()->client.light());
                else if(map.roomAt(renderer.x,renderer.z)==11 &&
                        Math.hypot(renderer.x-map.centerX(11),renderer.z-map.centerZ(11))<1.5)
                    sendAction("power breaker",()->client.power());
                else sendAction("door",()->client.door());
            }
            case KeyEvent.VK_1 -> {
                activeGearSlot=0;
                selected=LanCase.Tool.EMF;
                sendAction("select gear",()->client.selectGearSlot(0));
            }
            case KeyEvent.VK_2 -> {
                activeGearSlot=1;
                selected=LanCase.Tool.THERMOMETER;
                sendAction("select gear",()->client.selectGearSlot(1));
            }
            case KeyEvent.VK_3 -> {
                activeGearSlot=2;
                selected=LanCase.Tool.SPIRIT_BOX;
                sendAction("select gear",()->client.selectGearSlot(2));
            }
            case KeyEvent.VK_4 -> {
                activeGearSlot=3;
                
                sendAction("select gear",()->client.selectGearSlot(3));
            }
            case KeyEvent.VK_R -> {heldUseUntilTick=tick+4;
                sendAction("device reading",()->client.useHeldEquipment());
            }
            case KeyEvent.VK_Z -> sendAction("cross",()->client.deploy(HunterCounters.Kind.CROSS));
            case KeyEvent.VK_G -> sendAction("thrown ward",()->client.deploy(HunterCounters.Kind.WARD));
            case KeyEvent.VK_H -> sendAction("salt",()->client.deploy(HunterCounters.Kind.SALT));
            case KeyEvent.VK_U -> sendAction("UV",()->client.scanUv());
            case KeyEvent.VK_F8 -> sendAction("deploy writing book",()->client.placeBook());
            case KeyEvent.VK_F9 -> sendAction("inspect writing book",()->client.readBook());
            case KeyEvent.VK_F10 -> sendAction("retrieve writing book",()->client.takeBook());
            case KeyEvent.VK_L -> sendAction("hide",()->client.hide());
            case KeyEvent.VK_M -> feedback=insideVan()?"MONITOR ALWAYS VISIBLE ON RIGHT":"VAN TELEMETRY ONLY INSIDE THE VAN";
            case KeyEvent.VK_K -> showSupplyStore();
            case KeyEvent.VK_F6 -> showEquipmentRack();
            case KeyEvent.VK_T -> consumeMedicine(FieldSupplies.Kind.HEALTH);
            case KeyEvent.VK_Y -> consumeMedicine(FieldSupplies.Kind.SANITY);
            case KeyEvent.VK_J -> {casefileOpen=!casefileOpen;
                if(casefileOpen){journalPage=0;mouseLook.release();keys.clear();}
            }
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
    @Override public void keyReleased(KeyEvent e){
        keys.remove(e.getKeyCode());
        if(e.getKeyCode()==KeyEvent.VK_F3&&heldVoice==LanChat.Channel.LOCAL)releaseVoice();
        if(e.getKeyCode()==KeyEvent.VK_F4&&heldVoice==LanChat.Channel.RADIO)releaseVoice();
    }
    @Override public void keyTyped(KeyEvent e){}
    @Override public void focusGained(FocusEvent e){}
    @Override public void focusLost(FocusEvent e){
        keys.clear();releaseVoice();mouseLook.release();
    }
}