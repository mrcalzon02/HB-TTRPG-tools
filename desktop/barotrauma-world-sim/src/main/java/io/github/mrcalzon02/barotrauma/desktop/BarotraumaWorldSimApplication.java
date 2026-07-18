package io.github.mrcalzon02.barotrauma.desktop;

import io.github.mrcalzon02.barotrauma.desktop.imports.CampaignVesselMappingWindow;
import io.github.mrcalzon02.barotrauma.desktop.imports.ImportInspectionWindow;
import io.github.mrcalzon02.barotrauma.desktop.imports.WebWorldImportApprovalWindow;
import io.github.mrcalzon02.barotrauma.desktop.imports.WorldImportApprovalWindow;
import io.github.mrcalzon02.barotrauma.desktop.registry.VesselSnapshotApprovalWindow;
import io.github.mrcalzon02.barotrauma.desktop.registry.WorldVesselRegistryWindow;
import io.github.mrcalzon02.barotrauma.desktop.session.DesktopWorldSession;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import javax.swing.BorderFactory;
import javax.swing.Box;
import javax.swing.BoxLayout;
import javax.swing.DefaultListCellRenderer;
import javax.swing.DefaultListModel;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JList;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JSeparator;
import javax.swing.JSplitPane;
import javax.swing.SwingConstants;
import javax.swing.SwingUtilities;
import javax.swing.UIManager;
import javax.swing.WindowConstants;
import javax.swing.border.EmptyBorder;
import java.awt.BorderLayout;
import java.awt.CardLayout;
import java.awt.Component;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.GridLayout;
import java.awt.Window;
import java.util.LinkedHashMap;
import java.util.Map;

/** Primary Java 17 Swing shell for the Barotrauma World Simulation Toolbox. */
public final class BarotraumaWorldSimApplication {

    private BarotraumaWorldSimApplication() { }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            installSystemLookAndFeel();
            new MainWindow().setVisible(true);
        });
    }

    private static void installSystemLookAndFeel() {
        try { UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName()); }
        catch (Exception exception) {
            System.err.println("Could not activate the system look and feel: " + exception.getMessage());
        }
    }

    private static final class MainWindow extends JFrame {
        private static final Workspace[] WORKSPACES = {
                new Workspace("overview", "Overview", "Master-world identity, health, time, and readiness."),
                new Workspace("active-submarine", "Active Submarine", "Managed vessel status, crew, route, systems, and operations."),
                new Workspace("world-map", "World Map", "Europa locations, routes, levels, stations, factions, and vessel markers."),
                new Workspace("submarines", "Submarines", "Official definitions, physical vessel instances, and snapshot chronology."),
                new Workspace("crew", "Crew", "Characters, submissions, assignments, conditions, inventories, and qualifications."),
                new Workspace("stations-economy", "Stations and Economy", "Production, consumption, vendors, freight, markets, and treasuries."),
                new Workspace("routes-jobs", "Routes and Jobs", "Voyage planning, contracts, transit, crossings, and event requirements."),
                new Workspace("encounters", "Encounters", "Creature, maintenance, hazard, expedition, and general event resolution."),
                new Workspace("cargo-catalogue", "Cargo and Catalogue", "Items, recipes, compatibility, manifests, lots, and transactions."),
                new Workspace("workshop-research", "Workshop and R&D", "Custom content, validation ceilings, research, and construction."),
                new Workspace("factions", "Factions", "Organizations, relationships, influence, reputation, and hidden cells."),
                new Workspace("reference-library", "Reference Library", "Crewman's Primer, RPG rules, catalogues, and source provenance."),
                new Workspace("import-center", "Import Center", "Version-22 master-world and official .save/.sub compatibility."),
                new Workspace("campaign-journal", "Campaign Journal", "Audit history, incidents, voyages, transactions, and decisions."),
                new Workspace("simulation-monitor", "Simulation Monitor", "Clock, cycles, catch-up, diagnostics, and deterministic streams."),
                new Workspace("settings-backups", "Settings and Backups", "World directories, checkpoints, backups, restore, and packaging data.")
        };

        private final DesktopWorldSession session = DesktopWorldSession.global();
        private final CardLayout cardLayout = new CardLayout();
        private final JPanel cardPanel = new JPanel(cardLayout);
        private final DefaultListModel<Workspace> navigationModel = new DefaultListModel<>();
        private final JList<Workspace> navigationList = new JList<>(navigationModel);
        private final Map<String, Workspace> workspacesById = new LinkedHashMap<>();
        private final JLabel workspaceTitle = new JLabel("Overview");
        private final JLabel worldStatus = new JLabel("No desktop world open");
        private final JLabel simulationStatus = new JLabel("Simulation writer disabled");
        private final JLabel operationStatus = new JLabel("Desktop shell ready");
        private AutoCloseable sessionSubscription;

        private MainWindow() {
            super("Barotrauma World Simulation Toolbox");
            setDefaultCloseOperation(WindowConstants.EXIT_ON_CLOSE);
            setMinimumSize(new Dimension(1100, 700));
            setSize(1440, 900);
            setLocationByPlatform(true);
            setLocationRelativeTo(null);
            for (Workspace workspace : WORKSPACES) {
                workspacesById.put(workspace.id(), workspace);
                navigationModel.addElement(workspace);
            }
            JPanel root = new JPanel(new BorderLayout());
            root.setBorder(new EmptyBorder(12, 12, 12, 12));
            root.add(buildHeader(), BorderLayout.NORTH);
            root.add(buildMainArea(), BorderLayout.CENTER);
            root.add(buildStatusBar(), BorderLayout.SOUTH);
            setContentPane(root);
            navigationList.setSelectedIndex(0);
            sessionSubscription = session.addListener(this::showSharedWorld, true);
        }

        private Component buildHeader() {
            JPanel header = new JPanel(new BorderLayout(16, 8));
            header.setBorder(new EmptyBorder(4, 6, 12, 6));
            JPanel titleBlock = new JPanel();
            titleBlock.setLayout(new BoxLayout(titleBlock, BoxLayout.Y_AXIS));
            JLabel applicationTitle = new JLabel("Barotrauma World Simulation Toolbox");
            applicationTitle.setFont(applicationTitle.getFont().deriveFont(Font.BOLD, 22f));
            workspaceTitle.setFont(workspaceTitle.getFont().deriveFont(Font.BOLD, 16f));
            titleBlock.add(applicationTitle);
            titleBlock.add(Box.createVerticalStrut(4));
            titleBlock.add(workspaceTitle);
            JPanel stateBlock = new JPanel();
            stateBlock.setLayout(new BoxLayout(stateBlock, BoxLayout.Y_AXIS));
            worldStatus.setHorizontalAlignment(SwingConstants.RIGHT);
            simulationStatus.setHorizontalAlignment(SwingConstants.RIGHT);
            stateBlock.add(worldStatus);
            stateBlock.add(Box.createVerticalStrut(4));
            stateBlock.add(simulationStatus);
            header.add(titleBlock, BorderLayout.WEST);
            header.add(stateBlock, BorderLayout.EAST);
            return header;
        }

        private Component buildMainArea() {
            navigationList.setSelectionMode(javax.swing.ListSelectionModel.SINGLE_SELECTION);
            navigationList.setFixedCellHeight(34);
            navigationList.setBorder(new EmptyBorder(4, 4, 4, 4));
            navigationList.setCellRenderer(new WorkspaceCellRenderer());
            navigationList.addListSelectionListener(event -> {
                if (!event.getValueIsAdjusting()) {
                    Workspace selected = navigationList.getSelectedValue();
                    if (selected != null) showWorkspace(selected);
                }
            });
            JScrollPane navigationScroll = new JScrollPane(navigationList);
            navigationScroll.setMinimumSize(new Dimension(220, 400));
            navigationScroll.setPreferredSize(new Dimension(250, 700));
            registerPanels();
            JSplitPane splitPane = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT, navigationScroll, cardPanel);
            splitPane.setResizeWeight(0.0);
            splitPane.setDividerLocation(250);
            splitPane.setContinuousLayout(true);
            return splitPane;
        }

        private void registerPanels() {
            cardPanel.add(buildOverviewPanel(), "overview");
            cardPanel.add(buildPlaceholderPanel(workspacesById.get("active-submarine")), "active-submarine");
            cardPanel.add(buildWorldMapPanel(), "world-map");
            cardPanel.add(buildSubmarinesPanel(), "submarines");
            cardPanel.add(buildPlaceholderPanel(workspacesById.get("crew")), "crew");
            cardPanel.add(buildPlaceholderPanel(workspacesById.get("stations-economy")), "stations-economy");
            cardPanel.add(buildPlaceholderPanel(workspacesById.get("routes-jobs")), "routes-jobs");
            cardPanel.add(buildPlaceholderPanel(workspacesById.get("encounters")), "encounters");
            cardPanel.add(buildPlaceholderPanel(workspacesById.get("cargo-catalogue")), "cargo-catalogue");
            cardPanel.add(buildPlaceholderPanel(workspacesById.get("workshop-research")), "workshop-research");
            cardPanel.add(buildPlaceholderPanel(workspacesById.get("factions")), "factions");
            cardPanel.add(buildPlaceholderPanel(workspacesById.get("reference-library")), "reference-library");
            cardPanel.add(buildImportCenterPanel(), "import-center");
            cardPanel.add(buildPlaceholderPanel(workspacesById.get("campaign-journal")), "campaign-journal");
            cardPanel.add(buildSimulationMonitorPanel(), "simulation-monitor");
            cardPanel.add(buildPlaceholderPanel(workspacesById.get("settings-backups")), "settings-backups");
        }

        private Component buildOverviewPanel() {
            JPanel panel = contentPanel();
            panel.add(sectionHeading("Desktop world operations"));
            panel.add(Box.createVerticalStrut(8));
            panel.add(bodyLabel("The Java desktop now supports shared world selection, schema-002 persistence, normalized version-22 master-world import, official vessel imports, explicit campaign mapping, and vessel snapshot chronology."));
            panel.add(Box.createVerticalStrut(18));
            JPanel metrics = new JPanel(new GridLayout(2, 3, 12, 12));
            metrics.add(metricCard("Voyage rings", "48", "Mandatory inward rings"));
            metrics.add(metricCard("Locations", "960", "Normalized master-world nodes"));
            metrics.add(metricCard("Stations", "180", "Normalized station records"));
            metrics.add(metricCard("Web compatibility", "v22", "Explicit normalized import"));
            metrics.add(metricCard("Official saves", ".save/.sub", "Bounded decoding and canonical identity"));
            metrics.add(metricCard("Persistence", "Schema 002", "Atomic world and vessel transactions"));
            panel.add(metrics);
            panel.add(Box.createVerticalStrut(18));
            panel.add(new JSeparator());
            panel.add(Box.createVerticalStrut(12));
            JPanel actions = new JPanel();
            actions.add(button("Import Version-22 World", this::openWebWorldImport));
            actions.add(button("Open Vessel Import", this::openImportApproval));
            actions.add(button("Map Campaign Archive", this::openCampaignMapper));
            actions.add(button("Open Vessel Registry", this::openVesselRegistry));
            panel.add(actions);
            panel.add(Box.createVerticalGlue());
            return new JScrollPane(panel);
        }

        private Component buildWorldMapPanel() {
            JPanel panel = contentPanel();
            panel.add(sectionHeading("Normalized Europa world"));
            panel.add(Box.createVerticalStrut(8));
            panel.add(bodyLabel("Version-22 exports can now establish the desktop world's master-world identity, canonical clock, rings, locations, stations, component versions, and imported scheduler metadata. The scheduler remains paused after import."));
            panel.add(Box.createVerticalStrut(16));
            panel.add(metricCard("Master world", "One per world", "Replacement is blocked to prevent silent world-state loss"));
            panel.add(Box.createVerticalStrut(10));
            panel.add(metricCard("Location identity", "Source-backed", "Deterministic fallback IDs are used only when source IDs are absent"));
            panel.add(Box.createVerticalStrut(10));
            panel.add(metricCard("Simulation", "PAUSED", "Import never starts or advances the continuous writer"));
            panel.add(Box.createVerticalStrut(16));
            panel.add(button("Open Master-World Import", this::openWebWorldImport));
            panel.add(Box.createVerticalGlue());
            return new JScrollPane(panel);
        }

        private Component buildSubmarinesPanel() {
            JPanel panel = contentPanel();
            panel.add(sectionHeading("Submarine and physical-vessel registry"));
            panel.add(Box.createVerticalStrut(8));
            panel.add(bodyLabel("Submarine definitions are deduplicated by canonical XML structure. Physical vessels retain separate world identities, and every accepted source creates an immutable current or historical snapshot."));
            panel.add(Box.createVerticalStrut(16));
            panel.add(metricCard("Definitions", "Reusable", "One canonical design may support many physical vessels"));
            panel.add(Box.createVerticalStrut(10));
            panel.add(metricCard("Vessels", "World-specific", "Names do not control identity or duplicate decisions"));
            panel.add(Box.createVerticalStrut(10));
            panel.add(metricCard("Snapshots", "Chronological", "Newer states promote; older states remain historical"));
            panel.add(Box.createVerticalStrut(16));
            JPanel actions = new JPanel();
            actions.add(button("Open Vessel Registry", this::openVesselRegistry));
            actions.add(button("Import One Vessel", this::openImportApproval));
            actions.add(button("Map Campaign Archive", this::openCampaignMapper));
            actions.add(button("Attach Snapshot", this::openSnapshotApproval));
            panel.add(actions);
            panel.add(Box.createVerticalGlue());
            return new JScrollPane(panel);
        }

        private Component buildImportCenterPanel() {
            JPanel panel = contentPanel();
            panel.add(sectionHeading("Import Center"));
            panel.add(Box.createVerticalStrut(8));
            panel.add(bodyLabel("Sources are hashed, safely decoded, validated, compared with existing identities, and reviewed before any accepted transaction changes world or vessel records."));
            panel.add(Box.createVerticalStrut(16));
            panel.add(metricCard("Existing suite", "Version 22", "Normalized master-world import with paused scheduler metadata"));
            panel.add(Box.createVerticalStrut(10));
            panel.add(metricCard("Campaign saves", ".save", "Every submarine payload receives an explicit row mapping"));
            panel.add(Box.createVerticalStrut(10));
            panel.add(metricCard("Standalone vessels", ".sub", "Canonical definitions and immutable source snapshots"));
            panel.add(Box.createVerticalStrut(16));
            JPanel actions = new JPanel();
            actions.add(button("Read-Only Inspection", this::openInspection));
            actions.add(button("Version-22 World Approval", this::openWebWorldImport));
            actions.add(button("One-Vessel Approval", this::openImportApproval));
            actions.add(button("Campaign Mapping", this::openCampaignMapper));
            panel.add(actions);
            panel.add(Box.createVerticalGlue());
            return new JScrollPane(panel);
        }

        private Component buildSimulationMonitorPanel() {
            JPanel panel = contentPanel();
            panel.add(sectionHeading("Simulation engine boundary established"));
            panel.add(Box.createVerticalStrut(8));
            panel.add(bodyLabel("Imported scheduler metadata is stored for continuity, but the deterministic single-writer simulation process has not yet been activated. UI controls remain disabled until command and checkpoint contracts are complete."));
            panel.add(Box.createVerticalStrut(16));
            panel.add(metricCard("Current state", "PAUSED", "Schema 002 explicitly stores simulation_enabled = false"));
            panel.add(Box.createVerticalStrut(10));
            panel.add(metricCard("Clock source", "Canonical", "Imported separately from repaint frequency and wall-clock drift"));
            panel.add(Box.createVerticalStrut(10));
            panel.add(metricCard("Catch-up", "Next phase", "Elapsed-time cycles with checkpoints and bounded commits"));
            panel.add(Box.createVerticalStrut(16));
            JPanel controls = new JPanel();
            for (String label : new String[]{"Run", "Pause", "Step", "Catch Up", "Checkpoint"}) {
                JButton button = new JButton(label);
                button.setEnabled(false);
                controls.add(button);
            }
            panel.add(controls);
            panel.add(Box.createVerticalGlue());
            return new JScrollPane(panel);
        }

        private Component buildPlaceholderPanel(Workspace workspace) {
            JPanel panel = contentPanel();
            panel.add(sectionHeading(workspace.label()));
            panel.add(Box.createVerticalStrut(8));
            panel.add(bodyLabel(workspace.description()));
            panel.add(Box.createVerticalStrut(16));
            panel.add(metricCard("Migration state", "Reserved", "Stable navigation identity; application service not yet connected"));
            panel.add(Box.createVerticalGlue());
            return new JScrollPane(panel);
        }

        private JPanel contentPanel() {
            JPanel panel = new JPanel();
            panel.setLayout(new BoxLayout(panel, BoxLayout.Y_AXIS));
            panel.setBorder(new EmptyBorder(24, 24, 24, 24));
            return panel;
        }

        private JLabel sectionHeading(String text) {
            JLabel label = new JLabel(text);
            label.setAlignmentX(Component.LEFT_ALIGNMENT);
            label.setFont(label.getFont().deriveFont(Font.BOLD, 20f));
            return label;
        }

        private JLabel bodyLabel(String text) {
            JLabel label = new JLabel("<html><div style='width:760px'>" + escapeHtml(text) + "</div></html>");
            label.setAlignmentX(Component.LEFT_ALIGNMENT);
            return label;
        }

        private JPanel metricCard(String label, String value, String note) {
            JPanel card = new JPanel();
            card.setLayout(new BoxLayout(card, BoxLayout.Y_AXIS));
            card.setBorder(BorderFactory.createCompoundBorder(BorderFactory.createEtchedBorder(),
                    new EmptyBorder(12, 12, 12, 12)));
            card.setAlignmentX(Component.LEFT_ALIGNMENT);
            JLabel labelComponent = new JLabel(label);
            labelComponent.setFont(labelComponent.getFont().deriveFont(Font.BOLD, 12f));
            JLabel valueComponent = new JLabel(value);
            valueComponent.setFont(valueComponent.getFont().deriveFont(Font.BOLD, 22f));
            JLabel noteComponent = new JLabel("<html><div style='width:220px'>" + escapeHtml(note) + "</div></html>");
            card.add(labelComponent);
            card.add(Box.createVerticalStrut(6));
            card.add(valueComponent);
            card.add(Box.createVerticalStrut(6));
            card.add(noteComponent);
            return card;
        }

        private JButton button(String text, Runnable action) {
            JButton button = new JButton(text);
            button.addActionListener(event -> action.run());
            return button;
        }

        private Component buildStatusBar() {
            JPanel statusBar = new JPanel(new BorderLayout(12, 0));
            statusBar.setBorder(new EmptyBorder(10, 6, 2, 6));
            statusBar.add(operationStatus, BorderLayout.WEST);
            statusBar.add(new JLabel("Java 17 Swing · schema 002 · normalized world · simulation paused"), BorderLayout.EAST);
            return statusBar;
        }

        private void showWorkspace(Workspace workspace) {
            cardLayout.show(cardPanel, workspace.id());
            workspaceTitle.setText(workspace.label());
            operationStatus.setText("Viewing " + workspace.label());
        }

        private void showSharedWorld(WorldPaths world) {
            worldStatus.setText(world == null ? "No desktop world open" : "World: " + world.root().getFileName());
        }

        private void openInspection() { showChild(new ImportInspectionWindow(), "Opened read-only source inspection"); }
        private void openWebWorldImport() { showChild(new WebWorldImportApprovalWindow(), "Opened version-22 world approval"); }
        private void openImportApproval() { showChild(new WorldImportApprovalWindow(), "Opened vessel import approval"); }
        private void openCampaignMapper() { showChild(new CampaignVesselMappingWindow(), "Opened campaign vessel mapper"); }
        private void openVesselRegistry() { showChild(new WorldVesselRegistryWindow(), "Opened vessel registry"); }
        private void openSnapshotApproval() { showChild(new VesselSnapshotApprovalWindow(), "Opened snapshot approval"); }

        private void showChild(Window window, String status) {
            window.setLocationRelativeTo(this);
            window.setVisible(true);
            operationStatus.setText(status);
        }

        @Override
        public void dispose() {
            if (sessionSubscription != null) {
                try { sessionSubscription.close(); } catch (Exception ignored) { }
                sessionSubscription = null;
            }
            super.dispose();
        }

        private String escapeHtml(String value) {
            return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                    .replace("\"", "&quot;").replace("'", "&#39;");
        }
    }

    private record Workspace(String id, String label, String description) {
        @Override public String toString() { return label; }
    }

    private static final class WorkspaceCellRenderer extends DefaultListCellRenderer {
        @Override
        public Component getListCellRendererComponent(JList<?> list, Object value, int index,
                                                       boolean isSelected, boolean cellHasFocus) {
            Component component = super.getListCellRendererComponent(list, value, index, isSelected, cellHasFocus);
            if (component instanceof JLabel label && value instanceof Workspace workspace) {
                label.setText(workspace.label());
                label.setBorder(new EmptyBorder(4, 8, 4, 8));
            }
            return component;
        }
    }
}
