package io.github.mrcalzon02.barotrauma.desktop;

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
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * First dependency-free Java 17 Swing shell for the Barotrauma World Simulation Toolbox.
 *
 * <p>The shell establishes stable workspace identities and Event Dispatch Thread ownership.
 * Persistence, import inspection, and simulation are deliberately not implemented here.</p>
 */
public final class BarotraumaWorldSimApplication {

    private BarotraumaWorldSimApplication() {
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            installSystemLookAndFeel();
            MainWindow window = new MainWindow();
            window.setVisible(true);
        });
    }

    private static void installSystemLookAndFeel() {
        try {
            UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
        } catch (Exception exception) {
            System.err.println("Could not activate the system look and feel: " + exception.getMessage());
        }
    }

    private static final class MainWindow extends JFrame {

        private static final Workspace[] WORKSPACES = {
                new Workspace("overview", "Overview", "Master-world identity, health, time, and readiness."),
                new Workspace("active-submarine", "Active Submarine", "Managed vessel status, crew, route, systems, and operations."),
                new Workspace("world-map", "World Map", "Europa locations, routes, levels, stations, factions, and vessel markers."),
                new Workspace("submarines", "Submarines", "Official definitions, custom designs, vessel instances, and snapshots."),
                new Workspace("crew", "Crew", "Characters, submissions, assignments, conditions, inventories, and qualifications."),
                new Workspace("stations-economy", "Stations and Economy", "Production, consumption, vendors, freight, markets, and treasuries."),
                new Workspace("routes-jobs", "Routes and Jobs", "Voyage planning, contracts, transit, crossings, and event requirements."),
                new Workspace("encounters", "Encounters", "Creature, maintenance, hazard, expedition, and general event resolution."),
                new Workspace("cargo-catalogue", "Cargo and Catalogue", "Items, recipes, compatibility, manifests, lots, and transactions."),
                new Workspace("workshop-research", "Workshop and R&D", "Custom content, validation ceilings, research, and construction."),
                new Workspace("factions", "Factions", "Organizations, relationships, influence, reputation, and hidden cells."),
                new Workspace("reference-library", "Reference Library", "Crewman's Primer, RPG rules, catalogues, and source provenance."),
                new Workspace("import-center", "Import Center", "Version-22 suite inspection and official .save/.sub compatibility."),
                new Workspace("campaign-journal", "Campaign Journal", "Audit history, incidents, voyages, transactions, and decisions."),
                new Workspace("simulation-monitor", "Simulation Monitor", "Clock, cycles, catch-up, diagnostics, and deterministic streams."),
                new Workspace("settings-backups", "Settings and Backups", "World directories, checkpoints, backups, restore, and packaging data.")
        };

        private final CardLayout cardLayout = new CardLayout();
        private final JPanel cardPanel = new JPanel(cardLayout);
        private final DefaultListModel<Workspace> navigationModel = new DefaultListModel<>();
        private final JList<Workspace> navigationList = new JList<>(navigationModel);
        private final Map<String, Workspace> workspacesById = new LinkedHashMap<>();
        private final JLabel workspaceTitle = new JLabel("Overview");
        private final JLabel worldStatus = new JLabel("No desktop world is open");
        private final JLabel simulationStatus = new JLabel("Simulation paused");
        private final JLabel operationStatus = new JLabel("Shell ready");

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
                    if (selected != null) {
                        showWorkspace(selected);
                    }
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
            cardPanel.add(buildPlaceholderPanel(workspacesById.get("world-map")), "world-map");
            cardPanel.add(buildPlaceholderPanel(workspacesById.get("submarines")), "submarines");
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

            JLabel heading = sectionHeading("Desktop migration baseline");
            JLabel explanation = bodyLabel(
                    "This dependency-free shell fixes the desktop workspace identities before persistence, "
                            + "import, or simulation mutation is introduced. The existing web suite remains unchanged."
            );

            JPanel metrics = new JPanel(new GridLayout(2, 3, 12, 12));
            metrics.add(metricCard("Voyage rings", "48", "Mandatory inward rings"));
            metrics.add(metricCard("Locations", "960", "Default master-world nodes"));
            metrics.add(metricCard("Stations", "180", "Guaranteed station target"));
            metrics.add(metricCard("Location levels", "10", "Level 10 is the Eye of Europa"));
            metrics.add(metricCard("Web compatibility", "v22", "Current full-suite export"));
            metrics.add(metricCard("Runtime", "Java 17", "Swing desktop application"));

            JPanel actions = new JPanel();
            JButton importButton = new JButton("Open Import Center");
            importButton.addActionListener(event -> selectWorkspace("import-center"));
            JButton simulationButton = new JButton("Open Simulation Monitor");
            simulationButton.addActionListener(event -> selectWorkspace("simulation-monitor"));
            JButton openWorldButton = new JButton("Open Desktop World");
            openWorldButton.setEnabled(false);
            openWorldButton.setToolTipText("World persistence is introduced after the identity and importer contracts.");
            actions.add(importButton);
            actions.add(simulationButton);
            actions.add(openWorldButton);

            panel.add(heading);
            panel.add(Box.createVerticalStrut(8));
            panel.add(explanation);
            panel.add(Box.createVerticalStrut(18));
            panel.add(metrics);
            panel.add(Box.createVerticalStrut(18));
            panel.add(new JSeparator());
            panel.add(Box.createVerticalStrut(12));
            panel.add(actions);
            panel.add(Box.createVerticalGlue());
            return new JScrollPane(panel);
        }

        private Component buildImportCenterPanel() {
            JPanel panel = contentPanel();
            panel.add(sectionHeading("Import Center boundary established"));
            panel.add(Box.createVerticalStrut(8));
            panel.add(bodyLabel(
                    "Import is intentionally inspection-first. A source file will be hashed, safely decoded, "
                            + "validated, compared with existing identities, and presented for review before any world mutation."
            ));
            panel.add(Box.createVerticalStrut(16));
            panel.add(metricCard("Existing suite", "Version 22", "Read-only inspector is the first compatibility implementation"));
            panel.add(Box.createVerticalStrut(10));
            panel.add(metricCard("Campaign saves", ".save", "Custom GZip archive containing gamesession.xml and .sub entries"));
            panel.add(Box.createVerticalStrut(10));
            panel.add(metricCard("Standalone vessels", ".sub", "GZip-compressed submarine XML"));
            panel.add(Box.createVerticalStrut(16));

            JButton inspectButton = new JButton("Inspect Source File");
            inspectButton.setEnabled(false);
            inspectButton.setToolTipText("Enabled after the compatibility inspection service is implemented.");
            panel.add(inspectButton);
            panel.add(Box.createVerticalGlue());
            return new JScrollPane(panel);
        }

        private Component buildSimulationMonitorPanel() {
            JPanel panel = contentPanel();
            panel.add(sectionHeading("Simulation engine boundary established"));
            panel.add(Box.createVerticalStrut(8));
            panel.add(bodyLabel(
                    "The simulation engine will run outside the Swing Event Dispatch Thread as a deterministic "
                            + "single logical writer. UI actions will submit commands and receive immutable display snapshots."
            ));
            panel.add(Box.createVerticalStrut(16));
            panel.add(metricCard("Current state", "Paused", "No desktop world is open"));
            panel.add(Box.createVerticalStrut(10));
            panel.add(metricCard("Clock source", "Canonical", "Independent of repaint frequency and timer drift"));
            panel.add(Box.createVerticalStrut(10));
            panel.add(metricCard("Catch-up", "Planned", "Elapsed-time cycles with checkpoints and bounded commits"));
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
            card.setBorder(BorderFactory.createCompoundBorder(
                    BorderFactory.createEtchedBorder(),
                    new EmptyBorder(12, 12, 12, 12)
            ));
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

        private Component buildStatusBar() {
            JPanel statusBar = new JPanel(new BorderLayout(12, 0));
            statusBar.setBorder(new EmptyBorder(10, 6, 2, 6));
            statusBar.add(operationStatus, BorderLayout.WEST);
            statusBar.add(new JLabel("Java 17 Swing scaffold · persistence not yet enabled"), BorderLayout.EAST);
            return statusBar;
        }

        private void showWorkspace(Workspace workspace) {
            cardLayout.show(cardPanel, workspace.id());
            workspaceTitle.setText(workspace.label());
            operationStatus.setText("Viewing " + workspace.label());
        }

        private void selectWorkspace(String workspaceId) {
            for (int index = 0; index < navigationModel.size(); index++) {
                if (navigationModel.get(index).id().equals(workspaceId)) {
                    navigationList.setSelectedIndex(index);
                    navigationList.ensureIndexIsVisible(index);
                    return;
                }
            }
        }

        private String escapeHtml(String value) {
            return value
                    .replace("&", "&amp;")
                    .replace("<", "&lt;")
                    .replace(">", "&gt;")
                    .replace("\"", "&quot;")
                    .replace("'", "&#39;");
        }
    }

    private record Workspace(String id, String label, String description) {
        @Override
        public String toString() {
            return label;
        }
    }

    private static final class WorkspaceCellRenderer extends DefaultListCellRenderer {
        @Override
        public Component getListCellRendererComponent(
                JList<?> list,
                Object value,
                int index,
                boolean isSelected,
                boolean cellHasFocus
        ) {
            Component component = super.getListCellRendererComponent(list, value, index, isSelected, cellHasFocus);
            if (component instanceof JLabel label && value instanceof Workspace workspace) {
                label.setText(workspace.label());
                label.setBorder(new EmptyBorder(4, 8, 4, 8));
            }
            return component;
        }
    }
}
