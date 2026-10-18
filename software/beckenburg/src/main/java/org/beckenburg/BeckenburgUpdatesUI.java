package org.beckenburg;

import java.awt.BorderLayout;
import java.awt.FlowLayout;
import java.awt.Font;
import java.awt.GraphicsEnvironment;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.nio.file.Path;
import java.util.prefs.Preferences;
import javax.swing.JButton;
import javax.swing.JCheckBox;
import javax.swing.JDialog;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JProgressBar;
import javax.swing.JScrollPane;
import javax.swing.JTextArea;
import javax.swing.SwingUtilities;

/** Non-blocking, opt-in install flow. Checks are read-only and never interrupt play. */
public final class BeckenburgUpdatesUI {
    private static final Preferences PREFS=Preferences.userNodeForPackage(BeckenburgUpdatesUI.class);
    private static final long DAY=86400000L;
    private BeckenburgUpdatesUI() { }
    public static void checkOnStartup(JFrame parent){
        if(GraphicsEnvironment.isHeadless()||!PREFS.getBoolean("check_updates",true))return;
        long now=System.currentTimeMillis();
        if(now-PREFS.getLong("last_update_check",0L)<DAY)return;
        PREFS.putLong("last_update_check",now);
        Thread worker=new Thread(()->{
            try{
                var release=BeckenburgUpdates.check(BeckenburgUpdates.installedVersion());
                if(release!=null)SwingUtilities.invokeLater(()->{
                    if(parent.isDisplayable())new Dialog(parent,release).setVisible(true);
                });
            }catch(Exception ignored){ // Offline updates must not interrupt a playable game.
            }
        },"Beckenburg-update-check");worker.setDaemon(true);worker.start();
    }
    public static void open(JFrame parent){new Dialog(parent,null).setVisible(true);}

    private static final class Dialog extends JDialog {
        private final JLabel status=new JLabel("Checks only Beckenburg release tags on GitHub.");
        private final JTextArea notes=new JTextArea(8,48);
        private final JButton check=new JButton("Check now");
        private final JButton action=new JButton("Download installer");
        private final JProgressBar progress=new JProgressBar(0,100);
        private BeckenburgUpdates.Release offered;
        private Path staged;
        private boolean busy;
        Dialog(JFrame parent,BeckenburgUpdates.Release found){
            super(parent,"Beckenburg updates",false);
            setDefaultCloseOperation(JDialog.DISPOSE_ON_CLOSE);
            JPanel panel=new JPanel(new BorderLayout(8,8));
            panel.setBorder(javax.swing.BorderFactory.createEmptyBorder(12,12,12,12));
            panel.add(new JLabel("Installed: Beckenburg "+BeckenburgUpdates.installedVersion()),BorderLayout.NORTH);
            notes.setEditable(false);notes.setLineWrap(true);notes.setWrapStyleWord(true);
            notes.setFont(new Font(Font.MONOSPACED,Font.PLAIN,12));
            panel.add(new JScrollPane(notes),BorderLayout.CENTER);
            JPanel bottom=new JPanel(new BorderLayout(3,3));
            bottom.add(status,BorderLayout.NORTH);bottom.add(progress,BorderLayout.CENTER);
            JPanel buttons=new JPanel(new FlowLayout(FlowLayout.RIGHT,4,2));
            JCheckBox auto=new JCheckBox("Check daily",PREFS.getBoolean("check_updates",true));
            auto.addActionListener(e->PREFS.putBoolean("check_updates",auto.isSelected()));
            buttons.add(auto);
            check.addActionListener(e->check());buttons.add(check);
            action.addActionListener(e->act());buttons.add(action);
            JButton later=new JButton("Not now");later.addActionListener(e->dispose());buttons.add(later);
            bottom.add(buttons,BorderLayout.SOUTH);panel.add(bottom,BorderLayout.SOUTH);
            setContentPane(panel);pack();setLocationRelativeTo(parent);
            apply(found);
            if(found==null)check();
            addWindowListener(new WindowAdapter(){@Override public void windowClosed(WindowEvent e){busy=true;}});
        }
        private void apply(BeckenburgUpdates.Release result){
            offered=result;staged=null;
            notes.setText(result==null?"Beckenburg has its own version stream: beckenburg-vX.Y.Z.\n\n"+
                "Updates are downloaded and SHA-256 verified before any installer can run.\n"+
                "Your saved profile remains in your user directory.":
                "Version "+result.version()+"\n\n"+result.notes());
            status.setText(result==null?"No update selected.":"Beckenburg "+result.version()+" available.");
            action.setText("Download installer");action.setEnabled(result!=null);
        }
        private void state(boolean working){
            busy=working;check.setEnabled(!working);action.setEnabled(!working&&offered!=null);
        }
        private void check(){
            if(busy)return;
            state(true);status.setText("Checking Beckenburg releases…");
            progress.setValue(0);
            Thread worker=new Thread(()->{
                try{
                    var newest=BeckenburgUpdates.check(BeckenburgUpdates.installedVersion());
                    SwingUtilities.invokeLater(()->{
                        if(!isDisplayable())return;
                        apply(newest);if(newest==null)status.setText("No newer stable Beckenburg release.");
                        state(false);
                    });
                }catch(Exception failure){
                    SwingUtilities.invokeLater(()->{
                        if(!isDisplayable())return;
                        status.setText("Update check unavailable: "+failure.getMessage());state(false);
                    });
                }
            },"Beckenburg-manual-update-check");worker.setDaemon(true);worker.start();
        }
        private void act(){
            if(busy||offered==null)return;
            if(staged!=null){
                if(!System.getProperty("os.name","").toLowerCase(java.util.Locale.ROOT).contains("win")){
                    status.setText("Windows installer requires Windows.");return;
                }
                int consent=JOptionPane.showConfirmDialog(this,
                    "Run the verified Beckenburg "+offered.version()+" installer and close the game?",
                    "Install Beckenburg update",JOptionPane.YES_NO_OPTION);
                if(consent!=JOptionPane.YES_OPTION)return;
                try{
                    new ProcessBuilder(staged.toAbsolutePath().toString()).start();
                    dispose(); // Installer runs separately after app process exits.
                    System.exit(0);
                }catch(Exception failure){
                    status.setText("Installer could not start: "+failure.getMessage());
                }
                return;
            }
            BeckenburgUpdates.Release chosen=offered;
            state(true);status.setText("Downloading and verifying installer…");
            Thread worker=new Thread(()->{
                try{
                    Path verified=BeckenburgUpdates.stage(chosen,BeckenburgUpdates.updateDirectory(),
                        percent->SwingUtilities.invokeLater(()->progress.setValue(percent)));
                    SwingUtilities.invokeLater(()->{
                        if(!isDisplayable())return;
                        staged=verified;state(false);action.setText("Install and restart");
                        status.setText("SHA-256 verified. Installation requires another click.");
                    });
                }catch(Exception failure){
                    SwingUtilities.invokeLater(()->{
                        if(!isDisplayable())return;
                        state(false);status.setText("Download failed, game unchanged: "+failure.getMessage());
                    });
                }
            },"Beckenburg-update-download");worker.setDaemon(true);worker.start();
        }
    }
}
