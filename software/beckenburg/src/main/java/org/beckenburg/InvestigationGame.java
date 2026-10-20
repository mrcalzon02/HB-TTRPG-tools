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
    private final JPanel menu=PsxHorrorUi.surface(new BorderLayout());
    private final java.util.prefs.Preferences displayPrefs=java.util.prefs.Preferences.userNodeForPackage(InvestigationGame.class);
    private final ProfileStore profile=new ProfileStore(ProfileStore.defaultPath());
    private BeckenburgInstallIdentity.Identity installation;
    private final JLabel account=new JLabel();
    private JComboBox<InvestigationSession.Role> rolePicker;
    private JComboBox<SiteCatalog.Location> locationPicker;
    private JComboBox<SiteCatalog.Conditions> conditionsPicker;
    private JComboBox<MissionWeather.Mode> weatherModePicker;
    private JComboBox<EvidenceSignals.Weather> weatherPicker;
    private JComboBox<Integer> weatherSeverityPicker;
    private GamePanel game;
    private GhostPracticePanel ghostPractice;
    private CastleHubPanel castle;
    private int caseNumber;
    private JLabel startupStatus;

    private void bootPhase(String message){
        BeckenburgDiagnostics.phase(message);
        if(startupStatus!=null)SwingUtilities.invokeLater(()->startupStatus.setText(message));
    }
    private void startupFailure(Throwable reason){
        Throwable cause=reason instanceof java.util.concurrent.ExecutionException
            &&reason.getCause()!=null?reason.getCause():reason;
        BeckenburgDiagnostics.fail("Loading screen / "+BeckenburgDiagnostics.stageName(),cause);
        if(startupStatus!=null)startupStatus.setText("STARTUP FAILED — open Diagnostics for the crash report.");
        BeckenburgDiagnostics.failureScreen(window,"Unable to initialize Beckenburg",cause);
        // Keep the loading window and Diagnostics button available instead of
        // disposing the only route to the failure evidence.
    }

    private InvestigationGame(){
        bootPhase("Opening game window");
        window.setDefaultCloseOperation(WindowConstants.EXIT_ON_CLOSE);
        window.setSize(1060,725);
        window.setMinimumSize(new Dimension(760,510));
        window.setLocationRelativeTo(null);
        window.setContentPane(loadingScreen());
        window.setVisible(true);
        bootPhase("Applying display preferences");
        GraphicsOptions.current().applyWindow(window);
        window.getRootPane().getInputMap(JComponent.WHEN_IN_FOCUSED_WINDOW).put(
            KeyStroke.getKeyStroke(KeyEvent.VK_F11,0),"toggleFullscreen");
        window.getRootPane().getInputMap(JComponent.WHEN_IN_FOCUSED_WINDOW).put(
            KeyStroke.getKeyStroke(KeyEvent.VK_ENTER,InputEvent.ALT_DOWN_MASK),"toggleFullscreen");
        window.getRootPane().getActionMap().put("toggleFullscreen",new AbstractAction(){
            @Override public void actionPerformed(ActionEvent event){toggleFullscreen();}
        });
        // Do local disk I/O away from the event dispatch thread. The splash reports actual
        // initialization work; it is never a simulated progress bar or forced delay.
        new SwingWorker<String,Void>(){
            @Override protected String doInBackground(){
                StringBuilder warnings=new StringBuilder();
                bootPhase("Reading installation identity");
                try{installation=BeckenburgInstallIdentity.loadOrCreate(ProfileStore.defaultPath().getParent());}
                catch(IOException ex){warnings.append("Installation identity: ").append(ex.getMessage()).append("\n");}
                bootPhase("Loading local profile");
                try{profile.load();if(!java.nio.file.Files.exists(ProfileStore.defaultPath()))profile.save();}
                catch(IOException ex){warnings.append("Local profile: ").append(ex.getMessage()).append("\n");}
                return warnings.toString();
            }
            @Override protected void done(){
                try{
                    String warnings=get();
                    bootPhase("Building investigation menu and PSX UI");
                    buildMenu();
                    cards.add(menu,"menu");
                    window.setContentPane(cards);
                    window.revalidate();window.repaint();
                    showMenu();
                    BeckenburgDiagnostics.ready();
                    if(!warnings.isBlank())JOptionPane.showMessageDialog(window,
                        warnings+"Existing files were preserved.", "Local startup warnings",JOptionPane.WARNING_MESSAGE);
                    BeckenburgDiagnostics.phase("Checking update channel");
                    BeckenburgUpdatesUI.checkOnStartup(window);
                    BeckenburgDiagnostics.phase("Menu available");
                }catch(Throwable ex){
                    startupFailure(ex);
                }
            }
        }.execute();
    }
    private JPanel loadingScreen(){
        // Deliberately plain Swing: diagnostics must work even if the PSX UI
        // archive, its decoding, or its custom paint components are broken.
        JPanel surface=new JPanel(new BorderLayout());
        surface.setBackground(new Color(9,13,18));
        JPanel center=new JPanel(new GridBagLayout());
        center.setOpaque(false);
        JLabel text=new JLabel("<html><div style='text-align:center'>"+
            "<span style='font-size:34px;color:#e5d4b1'>THE BECKENBURG PROJECT</span><br><br>"+
            "<span style='font-size:13px;color:#bcc2bb'>Reading local records and preparing expedition services</span>"+
            "</div></html>",SwingConstants.CENTER);
        center.add(text);
        surface.add(center,BorderLayout.CENTER);
        startupStatus=new JLabel("Preparing local records",SwingConstants.CENTER);
        startupStatus.setForeground(new Color(208,214,201));
        startupStatus.setFont(new Font(Font.MONOSPACED,Font.PLAIN,13));
        JProgressBar loading=new JProgressBar();
        loading.setIndeterminate(true);
        loading.setBorder(BorderFactory.createEmptyBorder(4,0,4,0));
        loading.setForeground(new Color(158,185,160));
        loading.setBackground(new Color(28,34,40));
        JPanel loadingRow=new JPanel(new BorderLayout());
        loadingRow.setOpaque(false);
        loadingRow.setBorder(BorderFactory.createEmptyBorder(0,70,65,70));
        loadingRow.add(startupStatus,BorderLayout.NORTH);
        loadingRow.add(loading,BorderLayout.CENTER);
        JButton diagnostics=new JButton("DIAGNOSTICS");
        diagnostics.addActionListener(e->BeckenburgDiagnostics.show(window));
        loadingRow.add(diagnostics,BorderLayout.SOUTH);
        surface.add(loadingRow,BorderLayout.SOUTH);
        return surface;
    }
    private void showCastle(){
        BeckenburgDiagnostics.phase("Entering Castle Beckenburg");
        try{
            if(castle==null){
            castle=new CastleHubPanel(profile,new CastleHubPanel.Actions(){
                @Override public void begin(){InvestigationGame.this.begin();}
                @Override public void network(){openLan();}
                @Override public void spectral(){InvestigationGame.this.beginGhost();}
                @Override public void menu(){showMenu();}
                @Override public void cycleRole(){rolePicker.setSelectedIndex((rolePicker.getSelectedIndex()+1)%rolePicker.getItemCount());}
                @Override public void cycleWeather(){conditionsPicker.setSelectedIndex((conditionsPicker.getSelectedIndex()+1)%conditionsPicker.getItemCount());}
                @Override public String role(){return rolePicker.getSelectedItem().toString();}
                @Override public String weather(){return conditionsPicker.getSelectedItem().toString();}
            });
                cards.add(castle,"castle");
            }
            ((CardLayout)cards.getLayout()).show(cards,"castle");
            SwingUtilities.invokeLater(castle::requestFocusInWindow);
        }catch(RuntimeException ex){
            BeckenburgDiagnostics.fail("Castle construction / rendering",ex);
            // Castle art must not prevent access to settings, multiplayer or the main menu.
            showMenu();
            JOptionPane.showMessageDialog(window,"Castle assets could not be loaded: "+ex.getMessage(),
                "Castle unavailable",JOptionPane.WARNING_MESSAGE);
        }
    }
    private void showMenu(){
        refreshAccount();
        ((CardLayout)cards.getLayout()).show(cards,"menu");
    }
    private void openLan(){new LanLobbyWindow().setVisible(true);}
    private Color ink(){return displayPrefs.getBoolean("highContrast",false)?Color.WHITE:new Color(223,210,183);}
    private int menuFont(int base){return base+(displayPrefs.getBoolean("largeMenuText",false)?3:0);}
    private JLabel menuLabel(String text,int size){
        JLabel l=new JLabel(text);l.setForeground(ink());
        l.setFont(new Font(Font.SANS_SERIF,Font.PLAIN,menuFont(size)));return l;
    }
    private static JPanel transparentPanel(LayoutManager layout){JPanel p=new JPanel(layout);p.setOpaque(false);return p;}
    private static JPanel transparentPanel(){JPanel p=new JPanel();p.setOpaque(false);return p;}
    private void buildMenu(){
        menu.removeAll();
        menu.setBackground(new Color(13,17,24));
        menu.setBorder(BorderFactory.createEmptyBorder(25,30,19,30));
        JPanel header=transparentPanel(new BorderLayout(8,4));
        JLabel title=new JLabel("THE BECKENBURG PROJECT");
        title.setFont(new Font(Font.SERIF,Font.BOLD,menuFont(35)));
        title.setForeground(ink());header.add(title,BorderLayout.NORTH);
        JLabel subtitle=menuLabel("CASTLE OPERATIONS  /  EXPEDITION DESK",12);
        subtitle.setForeground(new Color(167,182,185));header.add(subtitle,BorderLayout.SOUTH);
        menu.add(header,BorderLayout.NORTH);

        JPanel columns=transparentPanel(new GridBagLayout());
        JPanel navigation=transparentPanel();
        navigation.setLayout(new BoxLayout(navigation,BoxLayout.Y_AXIS));
        JButton enterCastle=button("ENTER CASTLE");
        JButton begin=button("START SOLO INVESTIGATION");
        JButton lan=button("HOST / JOIN MULTIPLAYER");
        JButton ghost=button("GHOST PRACTICE");
        for(JButton b:new JButton[]{enterCastle,begin,lan,ghost}){
            b.setAlignmentX(Component.LEFT_ALIGNMENT);
            navigation.add(Box.createVerticalStrut(9));navigation.add(b);
        }
        navigation.add(Box.createVerticalStrut(20));
        JLabel utilities=menuLabel("SUPPORT",11);utilities.setAlignmentX(Component.LEFT_ALIGNMENT);
        navigation.add(utilities);
        JPanel utilityRow=transparentPanel(new GridLayout(1,4,6,0));
        JButton options=button("OPTIONS"),guide=button("HELP"),updates=button("UPDATES"),credits=button("CREDITS");
        utilityRow.add(options);utilityRow.add(guide);utilityRow.add(updates);utilityRow.add(credits);
        utilityRow.setMaximumSize(new Dimension(390,37));utilityRow.setAlignmentX(Component.LEFT_ALIGNMENT);
        navigation.add(Box.createVerticalStrut(7));navigation.add(utilityRow);

        JPanel preparation=PsxHorrorUi.panel(new BorderLayout(10,16));
        preparation.setBackground(displayPrefs.getBoolean("highContrast",false)?new Color(0,0,0):new Color(29,35,43));
        preparation.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(new Color(100,91,71),1),
            BorderFactory.createEmptyBorder(18,20,20,20)));
        JLabel prepTitle=menuLabel("PREPARE AN INVESTIGATION",18);
        prepTitle.setIcon(new ImageIcon(PsxHorrorUi.image("icons/flashlight.png")));
        prepTitle.setIconTextGap(9);
        prepTitle.setFont(prepTitle.getFont().deriveFont(Font.BOLD));
        preparation.add(prepTitle,BorderLayout.NORTH);
        JPanel selectorGrid=transparentPanel(new GridLayout(0,2,10,12));
        rolePicker=new JComboBox<>(InvestigationSession.Role.values());
        locationPicker=new JComboBox<>(SiteCatalog.Location.values());
        conditionsPicker=new JComboBox<>(SiteCatalog.Conditions.values());
        weatherModePicker=new JComboBox<>(MissionWeather.Mode.values());
        weatherPicker=new JComboBox<>(EvidenceSignals.Weather.values());
        weatherSeverityPicker=new JComboBox<>(new Integer[]{1,2,3});
        for(JComboBox<?> picker:new JComboBox<?>[]{rolePicker,locationPicker,conditionsPicker,
                weatherModePicker,weatherPicker,weatherSeverityPicker}){
            picker.setBackground(new Color(35,39,46));
            picker.setForeground(new Color(237,225,201));
            picker.setFont(new Font(Font.MONOSPACED,Font.BOLD,menuFont(13)));
        }
        selectorGrid.add(menuLabel("Discipline",13));selectorGrid.add(rolePicker);
        selectorGrid.add(menuLabel("Location",13));selectorGrid.add(locationPicker);
        selectorGrid.add(menuLabel("Conditions",13));selectorGrid.add(conditionsPicker);
        selectorGrid.add(menuLabel("Weather schedule",13));selectorGrid.add(weatherModePicker);
        selectorGrid.add(menuLabel("Starting weather",13));selectorGrid.add(weatherPicker);
        selectorGrid.add(menuLabel("Weather severity",13));selectorGrid.add(weatherSeverityPicker);
        preparation.add(selectorGrid,BorderLayout.CENTER);
        JLabel status=menuLabel("SELECT AN AVAILABLE LOCATION",12);
        status.setForeground(new Color(188,202,177));
        preparation.add(status,BorderLayout.SOUTH);
        locationPicker.addActionListener(e->{
            SiteCatalog.Location site=(SiteCatalog.Location)locationPicker.getSelectedItem();
            boolean playable=site!=null&&site.playable();
            begin.setEnabled(playable);conditionsPicker.setEnabled(playable);
            status.setText(playable?"SOLO EXPEDITION READY":"LOCATION IN PRODUCTION");
        });
        locationPicker.setSelectedIndex(0);
        SiteCatalog.Location initial=(SiteCatalog.Location)locationPicker.getSelectedItem();
        boolean playable=initial!=null&&initial.playable();
        begin.setEnabled(playable);conditionsPicker.setEnabled(playable);
        status.setText(playable?"SOLO EXPEDITION READY":"LOCATION IN PRODUCTION");
        GridBagConstraints c=new GridBagConstraints();
        c.gridy=0;c.insets=new Insets(12,0,12,18);
        c.weightx=.42;c.weighty=1;c.fill=GridBagConstraints.HORIZONTAL;c.anchor=GridBagConstraints.NORTHWEST;
        columns.add(navigation,c);
        c.gridx=1;c.weightx=.58;c.insets=new Insets(12,0,12,0);
        columns.add(preparation,c);
        JScrollPane scroller=new JScrollPane(columns,
            ScrollPaneConstants.VERTICAL_SCROLLBAR_AS_NEEDED,ScrollPaneConstants.HORIZONTAL_SCROLLBAR_NEVER);
        scroller.setOpaque(false);scroller.getViewport().setOpaque(false);scroller.setBorder(null);
        menu.add(scroller,BorderLayout.CENTER);

        JPanel footer=transparentPanel(new BorderLayout(8,6));
        account.setFont(new Font(Font.MONOSPACED,Font.PLAIN,menuFont(12)));
        account.setForeground(new Color(170,211,182));account.setHorizontalAlignment(SwingConstants.LEFT);
        footer.add(account,BorderLayout.CENTER);
        JPanel footerActions=transparentPanel(new FlowLayout(FlowLayout.RIGHT,7,0));
        JButton importSave=button("IMPORT SAVE"),diagnostics=button("DIAGNOSTICS"),quit=button("EXIT");
        footerActions.add(importSave);footerActions.add(diagnostics);footerActions.add(quit);
        footer.add(footerActions,BorderLayout.EAST);
        menu.add(footer,BorderLayout.SOUTH);

        enterCastle.addActionListener(e->showCastle());
        begin.addActionListener(e->begin());ghost.addActionListener(e->beginGhost());
        lan.addActionListener(e->openLan());
        options.addActionListener(e->openOptions());
        guide.addActionListener(e->showControls());
        credits.addActionListener(e->JOptionPane.showMessageDialog(window,
            "PSX Horror UI Free by heyheythere\nhttps://heyheythere.itch.io/psx-horror-ui-free\nLicensed CC BY 4.0\nOriginal texture assets adapted for Beckenburg's Java interface.",
            "Third-party credits",JOptionPane.INFORMATION_MESSAGE));
        importSave.addActionListener(e->importLocalSave());
        diagnostics.addActionListener(e->BeckenburgDiagnostics.show(window));
        updates.addActionListener(e->BeckenburgUpdatesUI.open(window));
        quit.addActionListener(e->window.dispose());
        refreshAccount();
    }
    /** F11 / Alt+Enter: guaranteed windowed escape even after a failed fullscreen choice. */
    private void toggleFullscreen(){
        GraphicsOptions old=GraphicsOptions.current();
        GraphicsOptions.Mode mode=old.mode()==GraphicsOptions.Mode.WINDOWED
            ?GraphicsOptions.Mode.BORDERLESS_FULLSCREEN:GraphicsOptions.Mode.WINDOWED;
        GraphicsOptions alternate=new GraphicsOptions(mode,old.display(),old.detail(),
            old.aspect(),old.upscale(),old.antialias(),old.fieldOfView(),
            old.brightness(),old.contrast(),old.scanlines(),old.vignette(),
            old.grain(),old.chromatic());
        try{alternate.applyWindow(window);alternate.save();}
        catch(RuntimeException failure){
            try{old.applyWindow(window);}catch(RuntimeException ignored){}
            JOptionPane.showMessageDialog(window,failure.getMessage(),
                "Display change failed",JOptionPane.ERROR_MESSAGE);
        }
    }
    private static <T> JComboBox<T> select(T[] items,T selected){
        JComboBox<T> combo=new JComboBox<>(items);combo.setSelectedItem(selected);return combo;
    }
    private static void setting(JPanel grid,String text,JComponent control){
        JLabel label=new JLabel(text);label.setHorizontalAlignment(SwingConstants.RIGHT);
        grid.add(label);grid.add(control);
    }
    private void openOptions(){
        GraphicsOptions old=GraphicsOptions.current();
        JComboBox<GraphicsOptions.Mode> mode=select(GraphicsOptions.Mode.values(),old.mode());
        JComboBox<GraphicsOptions.DisplaySize> desktop=select(GraphicsOptions.DisplaySize.values(),old.display());
        JComboBox<GraphicsOptions.Detail> detail=select(GraphicsOptions.Detail.values(),old.detail());
        JComboBox<GraphicsOptions.Aspect> aspect=select(GraphicsOptions.Aspect.values(),old.aspect());
        JComboBox<GraphicsOptions.Upscale> upscale=select(GraphicsOptions.Upscale.values(),old.upscale());
        JComboBox<GraphicsOptions.Antialias> aa=select(GraphicsOptions.Antialias.values(),old.antialias());
        JComboBox<PsxPipeline.Preset> psx=select(PsxPipeline.Preset.values(),PsxPipeline.selected());
        JSpinner fov=new JSpinner(new SpinnerNumberModel(old.fieldOfView(),50,120,1));
        JSpinner brightness=new JSpinner(new SpinnerNumberModel(old.brightness(),-40,40,1));
        JSpinner contrast=new JSpinner(new SpinnerNumberModel(old.contrast(),-40,40,1));
        JCheckBox scanlines=new JCheckBox("Scanlines",old.scanlines());
        JCheckBox vignette=new JCheckBox("Vignette",old.vignette());
        JCheckBox grain=new JCheckBox("Film grain",old.grain());
        JCheckBox chromatic=new JCheckBox("Chromatic aberration",old.chromatic());
        JCheckBox large=new JCheckBox("Larger menu text",displayPrefs.getBoolean("largeMenuText",false));
        JCheckBox highContrast=new JCheckBox("High contrast menu",displayPrefs.getBoolean("highContrast",false));
        JSlider musicVolume=new JSlider(0,100,SoundtrackAudio.volume());
        musicVolume.setMajorTickSpacing(25);musicVolume.setPaintTicks(true);
        JSlider effectsVolume=new JSlider(0,100,LanAudio.effectsVolume());
        effectsVolume.setMajorTickSpacing(25);effectsVolume.setPaintTicks(true);
        JPanel grid=new JPanel(new GridLayout(0,2,7,7));
        grid.setBorder(BorderFactory.createEmptyBorder(9,9,9,9));
        setting(grid,"Display mode",mode);
        setting(grid,"Window size (fullscreen uses native)",desktop);
        setting(grid,"Real 3D rendering height",detail);
        setting(grid,"Aspect ratio",aspect);
        setting(grid,"Upscaling filter",upscale);
        setting(grid,"Anti-aliasing",aa);
        setting(grid,"PSX shader treatment",psx);
        setting(grid,"Field of view (degrees)",fov);
        setting(grid,"Brightness",brightness);
        setting(grid,"Contrast",contrast);
        setting(grid,"Atmospheric effects",new JLabel("Optional CPU post-processing"));
        grid.add(scanlines);grid.add(vignette);
        grid.add(grain);grid.add(chromatic);
        grid.add(large);grid.add(highContrast);
        setting(grid,"Music volume",musicVolume);
        setting(grid,"Effects volume (voice separate)",effectsVolume);
        JScrollPane scroll=new JScrollPane(grid,
            ScrollPaneConstants.VERTICAL_SCROLLBAR_AS_NEEDED,ScrollPaneConstants.HORIZONTAL_SCROLLBAR_NEVER);
        scroll.setPreferredSize(new Dimension(610,Math.min(540,grid.getPreferredSize().height+18)));
        int answer=JOptionPane.showConfirmDialog(window,scroll,"Video, PSX & accessibility",
            JOptionPane.OK_CANCEL_OPTION,JOptionPane.PLAIN_MESSAGE);
        if(answer!=JOptionPane.OK_OPTION)return;
        GraphicsOptions chosen=new GraphicsOptions(
            (GraphicsOptions.Mode)mode.getSelectedItem(),
            (GraphicsOptions.DisplaySize)desktop.getSelectedItem(),
            (GraphicsOptions.Detail)detail.getSelectedItem(),
            (GraphicsOptions.Aspect)aspect.getSelectedItem(),
            (GraphicsOptions.Upscale)upscale.getSelectedItem(),
            (GraphicsOptions.Antialias)aa.getSelectedItem(),
            (Integer)fov.getValue(),(Integer)brightness.getValue(),(Integer)contrast.getValue(),
            scanlines.isSelected(),vignette.isSelected(),grain.isSelected(),chromatic.isSelected());
        boolean windowChanged=old.mode()!=chosen.mode()||old.display()!=chosen.display();
        if(windowChanged){
            try{chosen.applyWindow(window);}
            catch(RuntimeException failure){
                try{old.applyWindow(window);}catch(RuntimeException ignored){}
                JOptionPane.showMessageDialog(window,
                    "Display mode could not be applied: "+failure.getMessage(),
                    "Graphics settings",JOptionPane.ERROR_MESSAGE);
                return;
            }
            JOptionPane confirmation=new JOptionPane("Keep this display mode? Reverts after 15 seconds.",
                JOptionPane.QUESTION_MESSAGE,JOptionPane.YES_NO_OPTION);
            JDialog dialog=confirmation.createDialog(window,"Confirm display mode");
            javax.swing.Timer revert=new javax.swing.Timer(15000,event->dialog.dispose());
            revert.setRepeats(false);revert.start();dialog.setVisible(true);revert.stop();
            if(!Integer.valueOf(JOptionPane.YES_OPTION).equals(confirmation.getValue())){
                old.applyWindow(window);return;
            }
        }
        chosen.save();
        PsxPipeline.choose((PsxPipeline.Preset)psx.getSelectedItem());
        displayPrefs.putBoolean("largeMenuText",large.isSelected());
        displayPrefs.putBoolean("highContrast",highContrast.isSelected());
        SoundtrackAudio.volume(musicVolume.getValue());
        LanAudio.effectsVolume(effectsVolume.getValue());
        buildMenu();menu.revalidate();menu.repaint();
    }
    private void showControls(){
        JTextArea help=new JTextArea(
            "CASTLE / SOLO\nWASD move  |  Shift sprint  |  Click mouse-look  |  F light  |  E interact\n"+
            "1–4 select gear  |  R use  |  C ward  |  B ritual  |  J journal  |  M map\n"+
            "Q (hold) callouts  |  L hide in cupboard / emerge  |  X extract  |  Escape pause or return to menu\n\n"+
            "GHOST PRACTICE\n[ / ] change room  |  Space drift  |  1–4 ghost actions\n\n"+
            "MULTIPLAYER\nHost or join by IP, ready up, then use Enter 3D World when the case starts.\n"+
            "The Field Controls tab contains alpha simulation tools, not ordinary lobby controls.");
        help.setEditable(false);help.setLineWrap(true);help.setWrapStyleWord(true);
        help.setFont(new Font(Font.MONOSPACED,Font.PLAIN,13));
        help.setMargin(new Insets(12,12,12,12));
        JOptionPane.showMessageDialog(window,new JScrollPane(help),"Field controls",JOptionPane.INFORMATION_MESSAGE);
    }
    private JButton button(String s){
        JButton b=PsxHorrorUi.button(s);
        b.setFont(new Font(Font.SANS_SERIF,Font.BOLD,menuFont(13)));
        b.setForeground(ink());b.setBackground(new Color(48,58,66));
        b.setFocusPainted(true);
        b.setBorder(BorderFactory.createCompoundBorder(BorderFactory.createLineBorder(new Color(104,100,79)),
            BorderFactory.createEmptyBorder(8,12,8,12)));
        b.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        b.setMaximumSize(new Dimension(390,44));
        return b;
    }
    private void refreshAccount(){account.setText("CASTLE LEDGER  £"+profile.currency()+"   XP "+profile.experience()
            +(installation==null?"":"   PLAYER "+installation.shortPlayerId()));}
    private void importLocalSave(){
        JFileChooser chooser=new JFileChooser();
        chooser.setDialogTitle("Import a Beckenburg local progression save");
        chooser.setFileFilter(new javax.swing.filechooser.FileNameExtensionFilter("Beckenburg profile (*.properties)","properties"));
        if(chooser.showOpenDialog(window)!=JFileChooser.APPROVE_OPTION)return;
        int answer=JOptionPane.showConfirmDialog(window,
            "Import this save? Your current progress will be backed up automatically. Your installation ID will not change.",
            "Import local save",JOptionPane.OK_CANCEL_OPTION,JOptionPane.WARNING_MESSAGE);
        if(answer!=JOptionPane.OK_OPTION)return;
        try{
            profile.importFrom(chooser.getSelectedFile().toPath());
            refreshAccount();if(castle!=null)castle.repaint();
            JOptionPane.showMessageDialog(window,"Local progress imported. The previous save was backed up; installation identity is unchanged.",
                "Save imported",JOptionPane.INFORMATION_MESSAGE);
        }catch(IOException ex){JOptionPane.showMessageDialog(window,
            "Import refused; your existing progress was not intentionally overwritten: "+ex.getMessage(),
            "Import failed",JOptionPane.ERROR_MESSAGE);}
    }
    private void begin(){
        if(game!=null){game.close();cards.remove(game);game=null;}
        if(ghostPractice!=null){ghostPractice.close();cards.remove(ghostPractice);ghostPractice=null;}
        caseNumber++;
        SiteCatalog.Location location=(SiteCatalog.Location)locationPicker.getSelectedItem();
        SiteCatalog.requirePlayable(location);
        game=new GamePanel((InvestigationSession.Role)rolePicker.getSelectedItem(),caseNumber,
            location,(SiteCatalog.Conditions)conditionsPicker.getSelectedItem(),
            (MissionWeather.Mode)weatherModePicker.getSelectedItem(),
            (EvidenceSignals.Weather)weatherPicker.getSelectedItem(),
            (Integer)weatherSeverityPicker.getSelectedItem());
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
        showMenu();
    }
    private final class GamePanel extends JPanel implements KeyListener,FocusListener {
        private final Set<Integer> down=new HashSet<>();
        private final HouseMap map;
        private final SceneRenderer scene=new SceneRenderer();
        private final RoomLighting lights=new RoomLighting();
        private final InvestigationSession session;
        private final javax.swing.Timer timer;
        private final EquipmentLoadout loadout=new EquipmentLoadout();
        private final SiteCatalog.Location location;
        private final SiteCatalog.Conditions conditions;
        private boolean powerOn;
        private boolean mapShown,journalShown,claimSaved,wheelOpen,helpVisible;
        private final MouseLook mouseLook;
        private final TeamCallout.Board callouts;
        private double wheelDx,wheelDy;
        private TeamCallout.Ping lastPing;
        private String vanNotice="";
        private int vanNoticeExpires;
        private boolean briefingShown;
        private int useHeldUntilTick;
        private final VanTelemetry monitor=new VanTelemetry(20261017L);
        private final AtmosphereAudio atmosphere=new AtmosphereAudio(AtmosphereAudio.Scene.FIELD);
        private final LevelSoundscape buildingSoundscape;
        private final java.util.ArrayDeque<Integer> activityHistory=new java.util.ArrayDeque<>();
        private int frameCount;
        private long last=System.nanoTime();
        private double accumulator;
        GamePanel(InvestigationSession.Role role,int ordinal,SiteCatalog.Location site,
                SiteCatalog.Conditions mode,MissionWeather.Mode weatherMode,
                EvidenceSignals.Weather selectedWeather,int severity){
            SiteCatalog.requirePlayable(site);
            map=new HouseMap(SiteCatalog.mapFor(site));
            buildingSoundscape=new LevelSoundscape(map);
            callouts=new TeamCallout.Board(map);
            location=site;conditions=java.util.Objects.requireNonNull(mode);
            scene.x=map.van().placement().x();scene.z=map.van().placement().z();
            scene.eyeHeight=map.level().dock().y()+1.62;
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
            session.configureWeather(weatherMode,selectedWeather,severity);
            session.connectLighting(lights);
            scene.setWeather(session.weather());
            atmosphere.setWeather(session.weather());
            scene.roomLights=lights;
            scene.roomLightTick=0;
            scene.rackStock=profile.equipment();
            scene.draw(map,session,0);
            timer=new javax.swing.Timer(33,e->frame());timer.start();
        }
        void close(){timer.stop();down.clear();wheelOpen=false;mouseLook.close();atmosphere.close();buildingSoundscape.close();}
        private double feetY(){return scene.eyeHeight-1.62;}
        private int currentRoom(){return map.roomAt(scene.x,feetY(),scene.z);}
        private boolean atVanFloor(){return Math.abs(feetY()-map.level().dock().y())<.25;}
        private EquipmentLoadout.Item aimedRack(){return atVanFloor()
            ?VanEquipmentRack.aimed(map.van(),scene.x,scene.z,scene.yaw,profile.equipment()):null;}
        private VanStaging.Station aimedStation(){return atVanFloor()?map.van().stationAt(scene.x,scene.z):null;}
        private void syncEnvironment(){
            scene.environmentLight=conditions.lightMultiplier()*(powerOn?1.0:.48);
            scene.fogDensity=conditions.fogMultiplier();
            scene.environmentPowerOn=powerOn;
            lights.setBreaker(powerOn);
        }
        private boolean nearBreaker(){
            return RoomLighting.breakerAimed(map,scene.x,feetY(),scene.z,scene.yaw);
        }
        private void buyMedicine(){
            timer.stop();down.clear();mouseLook.release();
            String[] names=new String[6];int at=0;
            for(FieldSupplies.Kind kind:FieldSupplies.Kind.values())
                for(FieldSupplies.Tier tier:FieldSupplies.Tier.values())
                    names[at++]=kind+" / "+tier.name()+" / £"+tier.price+" / +"+tier.restore(kind);
            Object chosen=JOptionPane.showInputDialog(window,"ACCOUNT £"+profile.currency()+
                "  /  Purchase field medicine","VAN SUPPLY COUNTER",
                JOptionPane.PLAIN_MESSAGE,null,names,names[0]);
            if(chosen!=null)for(int i=0;i<names.length;i++)if(names[i].equals(chosen)){
                FieldSupplies.Kind kind=FieldSupplies.Kind.values()[i/3];
                FieldSupplies.Tier tier=FieldSupplies.Tier.values()[i%3];
                try{showVanNotice(profile.purchase(kind,tier)?
                    "Purchased "+kind+" "+tier+".":"Insufficient credits or stock capacity.");}
                catch(IOException error){showVanNotice("PURCHASE FAILED: "+error.getMessage());}
                break;
            }
            last=System.nanoTime();timer.start();requestFocusInWindow();
        }
        private void useMedicine(FieldSupplies.Kind kind){
            FieldSupplies.Tier tier=profile.strongest(kind);
            if(tier==null){showVanNotice("No purchased "+kind+" medicine. Buy at the van rack.");return;}
            if(session.outcome()!=InvestigationSession.Outcome.ACTIVE||
                    (kind==FieldSupplies.Kind.HEALTH&&session.health()==100)||
                    (kind==FieldSupplies.Kind.SANITY&&session.stress()==0)){
                showVanNotice("No treatment necessary or mission inactive.");return;
            }
            try{
                if(profile.consume(kind,tier)){
                    session.useMedicine(kind,tier.restore(kind));
                    GameSfx.play(LanSound.Cue.POTION);
                    showVanNotice(kind+" "+tier+" used. Supplies deducted from the saved inventory.");
                }
            }catch(IOException error){showVanNotice("TREATMENT FAILED: "+error.getMessage());}
        }
        /** The E key picks up a physically visible instrument; no loadout popup. */
        private void takeRackItem(){
            EquipmentLoadout.Item aimed=aimedRack();
            if(aimed==null){showVanNotice("Look directly at an instrument on the van rack, then press E.");return;}
            loadout.pickup(aimed);
            GameSfx.play(LanSound.Cue.PICKUP);
            showVanNotice("PICKED UP: "+aimed.label+".  Current slot "+(loadout.activeSlot()+1));
        }
        private boolean insideVan(){
            var p=map.van().local(scene.x,scene.z);
            return currentRoom()==HouseMap.EXTRACTION_ROOM &&
                Math.abs(p.x())<VanStaging.HALF_WIDTH-.20 &&
                p.z()>=VanStaging.FRONT && p.z()<VanStaging.REAR-.2;
        }
        private void frame(){
            atmosphere.setActive(isShowing());
            buildingSoundscape.setActive(isShowing());
            int outdoorRoom=currentRoom();
            buildingSoundscape.setContext(outdoorRoom,lights.breaker());
            atmosphere.setOutside(outdoorRoom>=0&&map.outside(outdoorRoom));
            long now=System.nanoTime();double dt=Math.max(0,Math.min(.075,(now-last)/1e9));last=now;
            double forward=wheelOpen?0:(down.contains(KeyEvent.VK_W)?1:0)-(down.contains(KeyEvent.VK_S)?1:0);
            double strafe=wheelOpen?0:(down.contains(KeyEvent.VK_D)?1:0)-(down.contains(KeyEvent.VK_A)?1:0);
            if(!wheelOpen && down.contains(KeyEvent.VK_LEFT))scene.yaw+=dt*1.8;
            if(!wheelOpen && down.contains(KeyEvent.VK_RIGHT))scene.yaw-=dt*1.8;
            if(!wheelOpen && down.contains(KeyEvent.VK_UP))scene.pitch=Math.min(1.05,scene.pitch+dt*.9);
            if(!wheelOpen && down.contains(KeyEvent.VK_DOWN))scene.pitch=Math.max(-1.05,scene.pitch-dt*.9);
            double length=Math.hypot(forward,strafe);
            if(length>0 && (session.outcome()==InvestigationSession.Outcome.ACTIVE || session.outcome()==InvestigationSession.Outcome.CLEANSED)){
                double priorX=scene.x,priorZ=scene.z;
                forward/=length;strafe/=length;
                double speed=down.contains(KeyEvent.VK_SHIFT)?3.6:2.4;
                double dx=(Math.sin(scene.yaw)*forward-Math.cos(scene.yaw)*strafe)*dt*speed;
                double dz=(Math.cos(scene.yaw)*forward+Math.sin(scene.yaw)*strafe)*dt*speed;
                var moved=map.resolveMove(new LevelDefinition.Vec(scene.x,feetY(),scene.z),scene.x+dx,scene.z+dz);
                if(moved==null){
                    moved=map.resolveMove(new LevelDefinition.Vec(scene.x,feetY(),scene.z),scene.x+dx,scene.z);
                    if(moved==null)moved=map.resolveMove(new LevelDefinition.Vec(scene.x,feetY(),scene.z),scene.x,scene.z+dz);
                }
                if(moved!=null){session.leaveHiding();scene.x=moved.x();scene.z=moved.z();scene.eyeHeight=moved.y()+1.62;}
                if(Math.hypot(scene.x-priorX,scene.z-priorZ)>.0001)
                    GameSfx.play(LanSound.stepCue(map,currentRoom()));
            }
            accumulator+=dt;
            while(accumulator>=.1){
                session.tick(scene.x,feetY(),scene.z,scene.lamp);
                int activity=monitor.sample(session.ticks(),session.ghostEnergy());
                if(session.ticks()%12==0){
                    activityHistory.addLast(activity);
                    if(activityHistory.size()>32)activityHistory.removeFirst();
                }
                accumulator-=.1;
            }
            scene.roomLightTick=session.ticks();
            scene.setWeather(session.weather());
            atmosphere.setWeather(session.weather());
            GraphicsOptions.current().configure(scene,getWidth(),getHeight(),true);
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
            Object[] choices={"Resume", "Retreat & return", "Controls", "Exit Game"};
            int choice=JOptionPane.showOptionDialog(window,"Expedition paused", "Field Pause",
                JOptionPane.DEFAULT_OPTION,JOptionPane.QUESTION_MESSAGE,null,choices,choices[0]);
            if(choice==1){session.extract(scene.x,feetY(),scene.z); // extraction location still validated
                if(session.outcome()==InvestigationSession.Outcome.ACTIVE){
                    // Leaving a running mission from elsewhere is a failed withdrawal, not a free payout.
                    JOptionPane.showMessageDialog(window,"Return to the entry marker to extract safely.","Not at extraction",JOptionPane.INFORMATION_MESSAGE);
                }else{endCase("Expedition ended.");return;}
            }
            if(choice==2) JOptionPane.showMessageDialog(window,"WASD / click to mouse-look • 1/2/3 gear • R scan • C ward • B ritual • E door • Q hold communication wheel • M map • J journal • X extract","Controls",JOptionPane.INFORMATION_MESSAGE);
            if(choice==3&&InGamePauseMenu.confirmExit(window)){
                close(); // never reward an abandoned investigation
                System.exit(0);
                return;
            }
            last=System.nanoTime();timer.start();requestFocusInWindow();
        }
        @Override public void keyPressed(KeyEvent e){
            int key=e.getKeyCode();if(down.contains(key))return;
            if(key==KeyEvent.VK_F1){
                helpVisible=!helpVisible;
                if(helpVisible){down.clear();mouseLook.release();wheelOpen=false;}
                repaint();return;
            }
            if(helpVisible){if(key==KeyEvent.VK_ESCAPE){helpVisible=false;repaint();}return;}
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
            if(key>=KeyEvent.VK_1&&key<=KeyEvent.VK_4){
                loadout.select(key-KeyEvent.VK_1);
                GameSfx.play(LanSound.Cue.SELECT);
            }
            if(key==KeyEvent.VK_F){
                scene.lamp=!scene.lamp;
                GameSfx.play(scene.lamp?LanSound.Cue.DEVICE_ON:LanSound.Cue.DEVICE_OFF);
            }
            if(key==KeyEvent.VK_L)session.toggleHide(scene.x,feetY(),scene.z);
            if(key==KeyEvent.VK_E){
                var aimed=aimedRack();
                if(aimed!=null){takeRackItem();}
                else {
                VanStaging.Station service=aimedStation();
                if(service!=null)useVan(service);
                else if(nearBreaker()){
                    powerOn=!powerOn;syncEnvironment();
                    GameSfx.play(LanSound.Cue.BREAKER);
                    showVanNotice(powerOn?"Utility power restored.":"Utility breaker switched off.");
                }
                else if(lights.aimed(map,scene.x,feetY(),scene.z,scene.yaw)>=0){
                    int room=lights.aimed(map,scene.x,feetY(),scene.z,scene.yaw);
                    boolean lit=lights.toggle(room);
                    GameSfx.play(LanSound.Cue.SWITCH);
                    showVanNotice(map.roomName(room)+" LIGHTS "+(lit?"ON":"OFF"));
                }
                else if(!map.toggleNearestDoor(scene.x,feetY(),scene.z)
                        &&!map.toggleNearestWindow(scene.x,feetY(),scene.z))
                    showVanNotice("No usable door, window, light switch or station nearby.");
                else GameSfx.play(LanSound.Cue.DOOR);
                }
            }
            if(key==KeyEvent.VK_R){
                useHeldUntilTick=session.ticks()+4;
                session.useEquipment(loadout,scene.x,feetY(),scene.z,scene.yaw);
                GameSfx.play(loadout.equipped()==EquipmentLoadout.Item.PHOTO_CAMERA
                    ?LanSound.Cue.CAMERA:LanSound.Cue.SCANNER);
            }
            if(key==KeyEvent.VK_C){
                session.placeWard(scene.x,feetY(),scene.z);
                GameSfx.play(LanSound.Cue.WARD);
            }
            if(key==KeyEvent.VK_Z)session.deployCounter(HunterCounters.Kind.CROSS,scene.x,feetY(),scene.z,scene.yaw);
            if(key==KeyEvent.VK_G)session.deployCounter(HunterCounters.Kind.WARD,scene.x,feetY(),scene.z,scene.yaw);
            if(key==KeyEvent.VK_H)session.deployCounter(HunterCounters.Kind.SALT,scene.x,feetY(),scene.z,scene.yaw);
            if(key==KeyEvent.VK_B)session.cleanse(scene.x,feetY(),scene.z);
            if(key==KeyEvent.VK_T)useMedicine(FieldSupplies.Kind.HEALTH);
            if(key==KeyEvent.VK_Y)useMedicine(FieldSupplies.Kind.SANITY);
            if(key==KeyEvent.VK_J){journalShown=!journalShown;GameSfx.play(LanSound.Cue.BOOK);}
            if(key==KeyEvent.VK_M){mapShown=!mapShown;GameSfx.play(LanSound.Cue.BOOK);}
            if(key==KeyEvent.VK_X && session.extract(scene.x,feetY(),scene.z)) {timer.stop();endCase("Extraction processed.");return;}
            down.add(key);repaint();
        }
        private void showVanNotice(String text){vanNotice=text;vanNoticeExpires=session.ticks()+85;}
        private void useVan(VanStaging.Station station){
            switch(station){
                case BRIEFING -> {
                    briefingShown=!briefingShown;
                    showVanNotice(briefingShown?"CASE BOARD OPEN — current role, objectives and progress":"Case board closed.");
                }
                case EQUIPMENT -> takeRackItem();
                case RELAY -> showVanNotice("The monitor stays visible at the right while you are in the van.");
                case EXTRACTION -> {
                    if(session.extract(scene.x,feetY(),scene.z)){timer.stop();endCase("Van extraction confirmed.");}
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
                        new double[]{scene.x,scene.z} : TeamCallout.aim(map,scene.x,feetY(),scene.z,scene.yaw,12);
                    lastPing=callouts.submit(new TeamCallout.Request(0,choice,scene.x,scene.z,where[0],where[1],session.ticks()),feetY(),feetY());
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
                int stageH=getHeight(),width=getWidth();
                GraphicsOptions.current().draw(g,scene.image(),width,stageH);
                HeldToolView.draw(g,width,stageH,loadout.equipped().name(),session.ticks(),
                    session.ticks()<=useHeldUntilTick,scene.lamp);
                g.setFont(new Font(Font.MONOSPACED,Font.BOLD,13));
                g.setColor(new Color(14,19,25,222));
                g.fillRoundRect(12,10,Math.min(width-24,590),71,9,9);
                g.setColor(new Color(242,212,156));
                g.drawString("BECKENBURG / "+location.label.toUpperCase()+" / "+session.role(),24,30);
                g.setColor(new Color(207,220,216));
                g.drawString(map.roomName(currentRoom())+" / "+conditions.label.toUpperCase(),24,48);
                String status=session.statusLine();
                if(status.length()>76)status=status.substring(0,73)+"...";
                g.setFont(new Font(Font.MONOSPACED,Font.PLAIN,12));
                g.drawString(status,24,66);
                g.setColor(new Color(232,225,195));g.drawString("+",width/2-4,stageH/2+4);
                String msg=session.message();
                if(!msg.isBlank()){
                    if(msg.length()>75)msg=msg.substring(0,72)+"...";
                    g.setColor(new Color(14,19,25,228));
                    g.fillRoundRect(12,88,Math.min(width-24,610),30,7,7);
                    g.setColor(new Color(182,218,205));g.drawString(msg,23,108);
                }
                if(lastPing!=null && callouts.visible(session.ticks()).contains(lastPing)){
                    g.setColor(new Color(238,196,109));
                    g.drawString("CALLOUT: "+lastPing.phrase().spoken+" ["+map.roomName(lastPing.zone())+"]",23,139);
                }
                int gearY=stageH-112;
                g.setColor(new Color(13,20,27,222));g.fillRoundRect(12,gearY,346,100,9,9);
                g.setColor(new Color(236,206,155));
                g.drawString("EQUIPMENT / 1-4 SELECT / R USE / F1 HELP",23,gearY+20);
                for(int i=0;i<EquipmentLoadout.SLOTS;i++){
                    String item=loadout.at(i).label.toUpperCase();
                    if(item.length()>17)item=item.substring(0,14)+"...";
                    g.setColor(i==loadout.activeSlot()?new Color(166,238,194):new Color(194,207,211));
                    g.drawString((i+1)+"  "+item,23+(i%2)*167,gearY+45+(i/2)*27);
                }
                g.setColor(new Color(13,19,25,215));g.fillRoundRect(Math.max(12,width-126),12,114,30,8,8);
                g.setColor(new Color(225,219,200));g.drawString("ESC PAUSE",Math.max(23,width-116),32);
                int targetedSwitch=lights.aimed(map,scene.x,feetY(),scene.z,scene.yaw);
                if(targetedSwitch>=0){
                    g.setColor(new Color(255,225,156));
                    g.drawString("E / ROOM LIGHT SWITCH : "+(lights.on(targetedSwitch)?"ON":"OFF"),Math.max(24,width/2-155),stageH-59);
                }
                if(nearBreaker()){
                    g.setColor(new Color(255,212,137));
                    g.drawString("E / UTILITY BREAKER: "+(powerOn?"ON":"OFF"),Math.max(24,width/2-155),stageH-59);
                }
                EquipmentLoadout.Item rackAim=aimedRack();
                if(rackAim!=null){
                    g.setColor(new Color(255,212,137));
                    g.drawString("E PICK UP / "+rackAim.label.toUpperCase(),Math.max(24,width/2-155),stageH-59);
                }
                else if(aimedStation()!=null){
                    VanStaging.Station service=aimedStation();
                    g.setColor(new Color(255,212,137));
                    g.drawString("E  /  "+service.label,Math.max(24,width/2-155),stageH-59);
                }
                if(vanNoticeExpires>session.ticks()){
                    g.setColor(new Color(160,218,216));
                    g.drawString(vanNotice.substring(0,Math.min(vanNotice.length(),78)),24,Math.max(146,stageH-155));
                }
                // Always-on instrument sidebar while physically inside the van.
                if(insideVan())drawVanMeters(g);
                if(briefingShown)drawBriefing(g);
                if(wheelOpen) drawCalloutWheel(g,stageH);
                if(mapShown)drawMap(g);
                if(journalShown)drawJournal(g);
                if(helpVisible){
                    int pw=Math.min(width-36,570),ph=245,x=(width-pw)/2,y=(stageH-ph)/2;
                    g.setColor(new Color(12,17,27,248));g.fillRoundRect(x,y,pw,ph,12,12);
                    g.setColor(new Color(228,206,161));g.setFont(new Font(Font.MONOSPACED,Font.BOLD,14));
                    g.drawString("BECKENBURG / FIELD CONTROLS",x+18,y+29);
                    g.setFont(new Font(Font.MONOSPACED,Font.PLAIN,12));
                    String[] hints={
                        "WASD move / SHIFT sprint / CLICK mouse-look",
                        "E interact / F flashlight / 1-4 select gear / R use",
                        "C ritual ward / B rite / Z cross / G ward / H salt",
                        "T health medicine / Y sanity medicine",
                        "J journal / M map / Q hold team callout wheel",
                        "X extract at van / ESC pause / F1 close help"
                    };
                    int iy=y+60;g.setColor(new Color(225,228,221));
                    for(String hint:hints){g.drawString(hint,x+18,iy);iy+=27;}
                }
            }finally{g.dispose();}
        }
        private void drawMap(Graphics2D g){
            int ox=24,oy=112;
            double tile=Math.min(Math.max(1,getWidth()-70)/(double)map.width(),
                Math.max(1,getHeight()-170)/(double)map.height());
            int bw=(int)(map.width()*tile),bh=(int)(map.height()*tile);
            int here=currentRoom();double floor=here<0?feetY():map.floorY(here);
            g.setColor(new Color(15,18,26,245));g.fillRoundRect(ox-8,oy-30,bw+16,bh+44,8,8);
            g.setColor(new Color(232,203,149));
            g.drawString("FIELD PLAN / "+(floor<-.2?"CELLAR":floor>.2?"UPPER FLOOR":"GROUND FLOOR"),ox,oy-12);
            g.setFont(new Font(Font.MONOSPACED,Font.PLAIN,10));
            for(var room:map.level().rooms().stream().sorted(
                    java.util.Comparator.comparing(LevelDefinition.Room::outside).reversed()).toList()){
                if(Math.abs(room.y()-floor)>.15)continue;
                int x=ox+(int)(room.x0()*tile),z=oy+(int)(room.z0()*tile);
                int w=(int)((room.x1()-room.x0())*tile),h=(int)((room.z1()-room.z0())*tile);
                g.setColor(room.outside()?new Color(31,48,40):new Color(53,59,68));g.fillRect(x,z,w,h);
                g.setColor(new Color(164,158,139));g.drawRect(x,z,w,h);
                if(!room.outside()){
                    g.setColor(new Color(215,221,222));
                    int chars=Math.max(3,(w-6)/6);
                    String label=room.name();if(label.length()>chars)label=label.substring(0,Math.max(1,chars-1))+"…";
                    g.drawString(label,x+3,z+13);
                }
            }
            for(var portal:map.level().portals()){
                if(Math.abs(portal.y()-floor)>.15||portal.kind().equals("stair"))continue;
                int x=ox+(int)(portal.x()*tile),z=oy+(int)(portal.z()*tile),half=Math.max(2,(int)(portal.width()*tile/2));
                g.setColor(portal.kind().equals("window")?new Color(111,168,184)
                    :portal.door()&&!map.doorOpen(portal.id())?new Color(183,123,75):new Color(114,185,138));
                if(portal.alongX())g.fillRect(x-half,z-2,half*2,4);else g.fillRect(x-2,z-half,4,half*2);
            }
            for(var stair:map.level().stairs())if(Math.abs(stair.y0()-floor)<.15||Math.abs(stair.y1()-floor)<.15){
                g.setColor(new Color(181,168,113));
                g.drawLine(ox+(int)(stair.x0()*tile),oy+(int)(stair.z0()*tile),ox+(int)(stair.x1()*tile),oy+(int)(stair.z1()*tile));
            }
            g.setColor(new Color(236,219,125));g.fillOval(ox+(int)(scene.x*tile)-4,oy+(int)(scene.z*tile)-4,8,8);
            for(var ping:callouts.visible(session.ticks())){
                if(Math.abs(map.floorY(ping.zone())-floor)>.15)continue;
                g.setColor(new Color(245,172,84));
                int px=ox+(int)(ping.x()*tile),pz=oy+(int)(ping.z()*tile);
                g.drawOval(px-6,pz-6,12,12);g.drawLine(px-8,pz,px+8,pz);g.drawLine(px,pz-8,px,pz+8);
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
        private void drawVanMeters(Graphics2D g){
            int w=Math.min(226,Math.max(154,getWidth()/4)),x=getWidth()-w-12,y=70;
            g.setColor(new Color(12,18,27,198));g.fillRoundRect(x,y,w,177,7,7);
            g.setFont(new Font(Font.MONOSPACED,Font.BOLD,12));
            g.setColor(new Color(230,209,165));g.drawString("VAN TELEMETRY",x+10,y+21);
            int sane=Math.max(0,100-session.stress());
            g.setFont(new Font(Font.MONOSPACED,Font.PLAIN,11));
            g.setColor(new Color(196,217,213));g.drawString("SANITY "+sane+"%",x+10,y+42);
            g.setColor(new Color(46,58,62));g.fillRect(x+10,y+48,w-20,9);
            g.setColor(sane<35?new Color(203,113,117):new Color(128,192,161));
            g.fillRect(x+10,y+48,(w-20)*sane/100,9);
            int activity=monitor.sample(session.ticks(),session.ghostEnergy());
            g.setColor(new Color(196,217,213));g.drawString("ACTIVITY ~"+activity+"/10",x+10,y+77);
            int priorX=-1,priorY=-1,index=0,size=activityHistory.size();
            g.setColor(new Color(126,198,178));
            for(int value:activityHistory){
                int px=x+10+(size<=1?0:index*(w-20)/(size-1));
                int py=y+151-value*5;
                if(priorX>=0)g.drawLine(priorX,priorY,px,py);
                priorX=px;priorY=py;index++;
            }
            g.setColor(new Color(174,183,194));g.drawString("UNCERTAIN / DELAYED",x+10,y+167);
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
        BeckenburgDiagnostics.install();
        if(GraphicsEnvironment.isHeadless()){
            BeckenburgDiagnostics.record("Headless runtime; GUI unavailable");
            System.err.println("A graphical Windows/Linux desktop is required for the Swing client.");
            return;
        }
        if(java.util.Arrays.asList(args).contains("--diagnostics")){
            SwingUtilities.invokeLater(()->BeckenburgDiagnostics.show(null));
            return;
        }
        SwingUtilities.invokeLater(()->{
            try{new InvestigationGame();}
            catch(Throwable failure){
                BeckenburgDiagnostics.fail("Game initialization before loading screen",failure);
                BeckenburgDiagnostics.failureScreen(null,"Beckenburg startup failed",failure);
            }
        });
    }
}
