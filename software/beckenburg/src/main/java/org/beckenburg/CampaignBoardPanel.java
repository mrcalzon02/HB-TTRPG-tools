package org.beckenburg;

import javax.swing.*;
import java.awt.*;
import java.util.List;
import java.util.Objects;

/** Compact campaign contract browser. Only genuine SiteCatalog maps can deploy. */
public final class CampaignBoardPanel extends JPanel {
    public interface Actions {
        void deploy(SiteCatalog.Location location);
        void castle();
        void tutorial();
    }
    public record Entry(String name,String region,String dossier,SiteCatalog.Location map) {
        public boolean playable(){return map!=null&&map.playable();}
        @Override public String toString(){return name+(playable()?"  /  AVAILABLE":"  /  PLANNED");}
    }
    public static List<Entry> catalog(){
        return List.of(
            new Entry("The Victorian House","Established Districts","A confined residential investigation; the first playable architectural assignment.",SiteCatalog.Location.HOUSE),
            new Entry("Ravenshade School","Established Districts","A school with classrooms and a dedicated circulation plan; available when its source geometry validates.",SiteCatalog.Location.SCHOOL),
            new Entry("Abandoned Farmhouse","Established Districts","A rural home with distinct circulation and open approaches.",SiteCatalog.Location.FARMHOUSE),
            new Entry("Mansion","Established Districts","Multiple wings, long sightlines, and sealed household history.",SiteCatalog.Location.MANSION),
            new Entry("Prison","Established Districts","Cell blocks, dangerous gates, and forgotten records.",SiteCatalog.Location.PRISON),
            new Entry("Asylum","Established Districts","Institutional halls and unsettled records, requiring sensitive storytelling.",SiteCatalog.Location.ASYLUM),
            new Entry("Academy","Established Districts","An archive of disputed occult research.",SiteCatalog.Location.ACADEMY),
            new Entry("College","Established Districts","Institutional buildings with widely separated investigation zones.",SiteCatalog.Location.COLLEGE),
            new Entry("Church","Established Districts","A church, crypt, bell tower and burial ground.",SiteCatalog.Location.CHURCH),
            new Entry("Blackpine Logging Camp","Northern Woodlands","Abandoned sawmill and logging cabins; incomplete payroll and a mysterious shipping manifest.",null),
            new Entry("Camp Hollow Creek","Northern Woodlands","A lakeside campsite, ranger cabin and abandoned trail system.",null),
            new Entry("Red Mesa Ancestral Caves","Western Badlands","Fictional canyon ruins and a multi-level cave network; disputed expedition maps.",null),
            new Entry("Widow's Peak Fire Lookout","Northern Woodlands","An isolated lookout and its impossible final fire reports.",null),
            new Entry("Dead Man's Claim","Highland Frontier","Abandoned mine galleries and a payroll recorded after closure.",null),
            new Entry("Drowned Fisherman's Wharf","Coastal Territories","Shuttered fishing cottages, narrow docks, and conflicting tide records.",null),
            new Entry("Saint Bartholomew's Cemetery","Northern Woodlands","A ruined chapel, caretaker's house and forgotten ossuary.",null),
            new Entry("Northwatch Research Station","Northern Expanse","An abandoned polar laboratory with contradictory radio logs.",null),
            new Entry("Blackwater Hydroelectric Dam","Highland Frontier","Turbines, spillways and irreconcilable engineering reports.",null),
            new Entry("Monastery of Ashen Bells","Highland Frontier","A remote monastery whose bell ledger records impossible tolls.",null),
            new Entry("Mourning Marsh","Coastal Territories","Flooded settlement and tenuous boardwalks.",null),
            new Entry("Gallows Pass Railway","Highland Frontier","A derailed train, railway bridge and disused mountain tunnel.",null),
            new Entry("Greywater Cannery","Coastal Territories","A coastal cannery whose payroll continues after its recorded closure.",null));
    }
    private final JList<Entry> contracts=new JList<>();
    private final JLabel status=new JLabel();
    private final JTextArea dossier=new JTextArea();
    private final JButton deploy=button("DEPLOY SELECTED CASE");
    private final JLabel account=new JLabel();
    private final ProfileStore profile;
    private final Actions actions;
    private static final Color PAPER=new Color(230,219,193);
    private static JButton button(String name){
        JButton b=new JButton(name);
        b.setFont(new Font(Font.SANS_SERIF,Font.BOLD,13));
        b.setBackground(new Color(46,56,63));b.setForeground(PAPER);
        b.setFocusPainted(true);return b;
    }
    public CampaignBoardPanel(ProfileStore profile,Actions actions){
        this.profile=Objects.requireNonNull(profile);
        this.actions=Objects.requireNonNull(actions);
        setLayout(new BorderLayout(8,8));
        setBackground(new Color(13,17,24));
        setBorder(BorderFactory.createEmptyBorder(14,18,14,18));
        JLabel title=new JLabel("CASTLE BECKENBURG  /  CAMPAIGN DESK");
        title.setFont(new Font(Font.SERIF,Font.BOLD,24));title.setForeground(PAPER);
        account.setForeground(new Color(160,215,184));
        JPanel header=new JPanel(new BorderLayout());header.setOpaque(false);
        header.add(title,BorderLayout.NORTH);header.add(account,BorderLayout.SOUTH);
        add(header,BorderLayout.NORTH);
        DefaultListModel<Entry> entries=new DefaultListModel<>();
        for(Entry entry:catalog())entries.addElement(entry);
        contracts.setModel(entries);contracts.setName("campaign.contracts");
        contracts.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        contracts.setBackground(new Color(27,34,42));contracts.setForeground(PAPER);
        contracts.setSelectionBackground(new Color(73,81,74));
        contracts.setFont(new Font(Font.MONOSPACED,Font.PLAIN,12));
        JScrollPane scroll=new JScrollPane(contracts);
        scroll.setBorder(BorderFactory.createTitledBorder(
            BorderFactory.createLineBorder(new Color(92,91,78)),"REGIONAL CONTRACTS"));
        scroll.setPreferredSize(new Dimension(385,420));
        dossier.setEditable(false);dossier.setFocusable(false);dossier.setLineWrap(true);
        dossier.setWrapStyleWord(true);dossier.setMargin(new Insets(12,12,12,12));
        dossier.setBackground(new Color(27,34,42));dossier.setForeground(PAPER);
        dossier.setFont(new Font(Font.SANS_SERIF,Font.PLAIN,14));
        JScrollPane details=new JScrollPane(dossier);
        details.setBorder(BorderFactory.createTitledBorder(
            BorderFactory.createLineBorder(new Color(92,91,78)),"LOCATION DOSSIER"));
        JSplitPane split=new JSplitPane(JSplitPane.HORIZONTAL_SPLIT,scroll,details);
        split.setResizeWeight(.52);split.setBorder(null);
        add(split,BorderLayout.CENTER);
        JPanel footer=new JPanel(new BorderLayout(8,6));footer.setOpaque(false);
        status.setForeground(PAPER);footer.add(status,BorderLayout.NORTH);
        JPanel controls=new JPanel(new FlowLayout(FlowLayout.LEFT,7,0));controls.setOpaque(false);
        JButton tutorial=button("CASTLE ORIENTATION");
        JButton back=button("RETURN TO CASTLE");
        deploy.setName("campaign.deploy");
        controls.add(deploy);controls.add(tutorial);controls.add(back);
        footer.add(controls,BorderLayout.SOUTH);add(footer,BorderLayout.SOUTH);
        contracts.addListSelectionListener(event->{if(!event.getValueIsAdjusting())updateSelection();});
        deploy.addActionListener(event->{
            Entry entry=contracts.getSelectedValue();
            if(entry!=null&&entry.playable())actions.deploy(entry.map());
        });
        tutorial.addActionListener(event->actions.tutorial());
        back.addActionListener(event->actions.castle());
        refreshLedger();
        contracts.setSelectedIndex(0);
    }
    public void refreshLedger(){
        account.setText("CURRENT PROFILE   £"+profile.currency()+"   /   XP "+profile.experience()
            +"    •    Campaign progression and hired allies: not implemented");
    }
    private void updateSelection(){
        Entry entry=contracts.getSelectedValue();
        boolean ready=entry!=null&&entry.playable();
        deploy.setEnabled(ready);
        if(entry==null){dossier.setText("");status.setText("SELECT A CONTRACT");return;}
        dossier.setText(entry.name()+"\n\nREGION   "+entry.region()+
            "\n\n"+entry.dossier()+
            "\n\n"+(ready?"Playable investigation. Deployment uses your currently selected discipline and conditions.":
            "Concept only. This site cannot be deployed until unique geometry, rituals, evidence and navigation pass acceptance."));
        dossier.setCaretPosition(0);
        status.setText(ready?"AVAILABLE  /  SELECT DEPLOY":"IN PRODUCTION  /  DEPLOYMENT LOCKED");
    }
}
