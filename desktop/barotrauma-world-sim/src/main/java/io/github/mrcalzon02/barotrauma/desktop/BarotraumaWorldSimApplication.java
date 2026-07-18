package io.github.mrcalzon02.barotrauma.desktop;

import io.github.mrcalzon02.barotrauma.desktop.imports.CampaignVesselMappingWindow;
import io.github.mrcalzon02.barotrauma.desktop.imports.ImportInspectionWindow;
import io.github.mrcalzon02.barotrauma.desktop.imports.WebWorldImportApprovalWindow;
import io.github.mrcalzon02.barotrauma.desktop.imports.WorldImportApprovalWindow;
import io.github.mrcalzon02.barotrauma.desktop.logistics.PlayerVesselTransitWindow;
import io.github.mrcalzon02.barotrauma.desktop.logistics.StationLogisticsWindow;
import io.github.mrcalzon02.barotrauma.desktop.registry.VesselSnapshotApprovalWindow;
import io.github.mrcalzon02.barotrauma.desktop.registry.WorldMapRegistryWindow;
import io.github.mrcalzon02.barotrauma.desktop.registry.WorldVesselRegistryWindow;
import io.github.mrcalzon02.barotrauma.desktop.session.DesktopWorldSession;
import io.github.mrcalzon02.barotrauma.desktop.simulation.SimulationMonitorWindow;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;
import io.github.mrcalzon02.barotrauma.simulation.PassiveWorldSimulationService;

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
            try { UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName()); }
            catch (Exception exception) {
                System.err.println("Could not activate system look and feel: " + exception.getMessage());
            }
            new MainWindow().setVisible(true);
        });
    }

    private static final class MainWindow extends JFrame {
        private static final Workspace[] WORKSPACES = {
                new Workspace("overview", "Overview", "Master-world identity, health, time, and readiness."),
                new Workspace("active-submarine", "Active Submarine", "Imported player-vessel location, route, freight, transit challenges, systems, and operations."),
                new Workspace("world-map", "World Map", "Live Europa stations, NPC voyages, routes, missions, research, and encounters."),
                new Workspace("submarines", "Submarines", "Official definitions, physical vessel instances, and snapshot chronology."),
                new Workspace("crew", "Crew", "Characters, submissions, assignments, conditions, inventories, and qualifications."),
                new Workspace("stations-economy", "Stations and Economy", "Production, inventories, vendors, freight, treasuries, defense pressure, and station health."),
                new Workspace("routes-jobs", "Routes and Jobs", "Player and NPC voyage planning, contracts, transit, trade, mining, and fauna-clearing missions."),
                new Workspace("encounters", "Encounters", "Shared player/NPC transit hazards, challenge resolution, and consequences."),
                new Workspace("cargo-catalogue", "Cargo and Catalogue", "Items, production recipes, station inventories, vendor offers, freight lots, and transactions."),
                new Workspace("workshop-research", "Workshop and R&D", "Station research, production recipes, custom content, validation, and construction."),
                new Workspace("factions", "Factions", "Organizations, relationships, influence, reputation, and hidden cells."),
                new Workspace("reference-library", "Reference Library", "Crewman's Primer, RPG rules, catalogues, and source provenance."),
                new Workspace("import-center", "Import Center", "Version-22 master-world and official .save/.sub compatibility."),
                new Workspace("campaign-journal", "Campaign Journal", "Audit history, incidents, voyages, transactions, and decisions."),
                new Workspace("simulation-monitor", "Simulation Monitor", "Durable manual clock controls and automatic passive world scheduling."),
                new Workspace("settings-backups", "Settings and Backups", "World directories, checkpoints, backups, restore, and packaging data.")
        };

        private final DesktopWorldSession session = DesktopWorldSession.global();
        private final CardLayout cards = new CardLayout();
        private final JPanel cardPanel = new JPanel(cards);
        private final DefaultListModel<Workspace> navigationModel = new DefaultListModel<>();
        private final JList<Workspace> navigation = new JList<>(navigationModel);
        private final Map<String, Workspace> byId = new LinkedHashMap<>();
        private final JLabel workspaceTitle = new JLabel("Overview");
        private final JLabel worldStatus = new JLabel("No desktop world open");
        private final JLabel simulationStatus = new JLabel("Passive Mode available after master-world import");
        private final JLabel operationStatus = new JLabel("Desktop shell ready");
        private AutoCloseable sessionSubscription;

        private MainWindow() {
            super("Barotrauma World Simulation Toolbox");
            setDefaultCloseOperation(WindowConstants.EXIT_ON_CLOSE);
            setMinimumSize(new Dimension(1100, 700));
            setSize(1440, 900);
            setLocationRelativeTo(null);
            for (Workspace workspace : WORKSPACES) {
                byId.put(workspace.id(), workspace);
                navigationModel.addElement(workspace);
            }
            JPanel root = new JPanel(new BorderLayout());
            root.setBorder(new EmptyBorder(12, 12, 12, 12));
            root.add(header(), BorderLayout.NORTH);
            root.add(mainArea(), BorderLayout.CENTER);
            root.add(statusBar(), BorderLayout.SOUTH);
            setContentPane(root);
            navigation.setSelectedIndex(0);
            sessionSubscription = session.addListener(this::showSharedWorld, true);
        }

        private Component header() {
            JPanel header = new JPanel(new BorderLayout(16, 8));
            header.setBorder(new EmptyBorder(4, 6, 12, 6));
            JPanel titles = new JPanel();
            titles.setLayout(new BoxLayout(titles, BoxLayout.Y_AXIS));
            JLabel app = new JLabel("Barotrauma World Simulation Toolbox");
            app.setFont(app.getFont().deriveFont(Font.BOLD, 22f));
            workspaceTitle.setFont(workspaceTitle.getFont().deriveFont(Font.BOLD, 16f));
            titles.add(app);
            titles.add(Box.createVerticalStrut(4));
            titles.add(workspaceTitle);
            JPanel state = new JPanel();
            state.setLayout(new BoxLayout(state, BoxLayout.Y_AXIS));
            worldStatus.setHorizontalAlignment(SwingConstants.RIGHT);
            simulationStatus.setHorizontalAlignment(SwingConstants.RIGHT);
            state.add(worldStatus);
            state.add(Box.createVerticalStrut(4));
            state.add(simulationStatus);
            header.add(titles, BorderLayout.WEST);
            header.add(state, BorderLayout.EAST);
            return header;
        }

        private Component mainArea() {
            navigation.setSelectionMode(javax.swing.ListSelectionModel.SINGLE_SELECTION);
            navigation.setFixedCellHeight(34);
            navigation.setCellRenderer(new WorkspaceCellRenderer());
            navigation.addListSelectionListener(event -> {
                if (event.getValueIsAdjusting()) return;
                Workspace workspace = navigation.getSelectedValue();
                if (workspace != null) {
                    cards.show(cardPanel, workspace.id());
                    workspaceTitle.setText(workspace.label());
                    operationStatus.setText("Viewing " + workspace.label());
                }
            });
            registerPanels();
            JScrollPane navScroll = new JScrollPane(navigation);
            navScroll.setPreferredSize(new Dimension(250, 700));
            JSplitPane split = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT, navScroll, cardPanel);
            split.setDividerLocation(250);
            split.setResizeWeight(0.0);
            return split;
        }

        private void registerPanels() {
            cardPanel.add(overview(), "overview");
            cardPanel.add(activeSubmarine(), "active-submarine");
            cardPanel.add(worldMap(), "world-map");
            cardPanel.add(submarines(), "submarines");
            cardPanel.add(placeholder(byId.get("crew")), "crew");
            cardPanel.add(logisticsPanel(byId.get("stations-economy"),
                    "Station inventories, production recipes, vendor prices, freight lots, treasury entries, and passive station health now share one schema-backed economy."), "stations-economy");
            cardPanel.add(routePanel(), "routes-jobs");
            cardPanel.add(encounterPanel(), "encounters");
            cardPanel.add(logisticsPanel(byId.get("cargo-catalogue"),
                    "The current catalogue defines raw materials, industrial products, fuel, medical supplies, rations, ammunition, research samples, and luxury goods with recipe inputs and outputs."), "cargo-catalogue");
            cardPanel.add(logisticsPanel(byId.get("workshop-research"),
                    "Station research remains passive-world state while production recipes consume and produce item-level inventory with durable treasury costs."), "workshop-research");
            cardPanel.add(placeholder(byId.get("factions")), "factions");
            cardPanel.add(placeholder(byId.get("reference-library")), "reference-library");
            cardPanel.add(importCenter(), "import-center");
            cardPanel.add(placeholder(byId.get("campaign-journal")), "campaign-journal");
            cardPanel.add(simulation(), "simulation-monitor");
            cardPanel.add(placeholder(byId.get("settings-backups")), "settings-backups");
        }

        private Component overview() {
            JPanel panel = contentPanel();
            panel.add(heading("Desktop world operations"));
            panel.add(Box.createVerticalStrut(8));
            panel.add(body("The Java desktop now supports schema-007 persistence, normalized version-22 worlds, official vessel imports, automatic Passive Mode, item-level station logistics, player freight, and explicit player-vessel routes using the same deterministic transit system as NPCs."));
            panel.add(Box.createVerticalStrut(18));
            JPanel metrics = new JPanel(new GridLayout(2, 3, 12, 12));
            metrics.add(metric("World map", "Live", "Stations, NPC vessels, missions, research, encounters, freight"));
            metrics.add(metric("Player transit", "Shared", "Imported vessels use the NPC challenge resolver"));
            metrics.add(metric("Station logistics", "Item-level", "Inventory, recipes, markets, production, treasury"));
            metrics.add(metric("Player freight", "Operational", "Load at source, transit, dock, deliver at destination"));
            metrics.add(metric("Scheduling", "Passive Mode", "One process-wide scheduler per world"));
            metrics.add(metric("Persistence", "Schema 007", "Atomic world, logistics, route, freight, and evidence records"));
            panel.add(metrics);
            panel.add(Box.createVerticalStrut(18));
            panel.add(new JSeparator());
            panel.add(Box.createVerticalStrut(12));
            JPanel actions = new JPanel();
            actions.add(button("Open Live World Map", this::openWorldRegistry));
            actions.add(button("Open Station Logistics", this::openStationLogistics));
            actions.add(button("Open Player Transit", this::openPlayerTransit));
            actions.add(button("Open Vessel Registry", this::openVesselRegistry));
            panel.add(actions);
            panel.add(Box.createVerticalGlue());
            return new JScrollPane(panel);
        }

        private Component activeSubmarine() {
            JPanel panel = contentPanel();
            panel.add(heading("Imported player vessel operations"));
            panel.add(Box.createVerticalStrut(8));
            panel.add(body("Enroll an imported physical vessel at a normalized world location, load READY freight at its source, plan a route, resolve each transit hazard using the shared player/NPC challenge system, dock after arrival, and deliver cargo at its declared destination."));
            panel.add(Box.createVerticalStrut(16));
            panel.add(metric("Identity", "Physical vessel", "Definition and snapshot history remain unchanged"));
            panel.add(Box.createVerticalStrut(10));
            panel.add(metric("Transit", "Explicit", "One reviewed challenge resolution at a time"));
            panel.add(Box.createVerticalStrut(10));
            panel.add(metric("Freight", "Transactional", "Inventory, cargo, treasury, lot state, and logs"));
            panel.add(Box.createVerticalStrut(16));
            JPanel actions = new JPanel();
            actions.add(button("Open Player Transit and Freight", this::openPlayerTransit));
            actions.add(button("Open Vessel Registry", this::openVesselRegistry));
            panel.add(actions);
            panel.add(Box.createVerticalGlue());
            return new JScrollPane(panel);
        }

        private Component worldMap() {
            JPanel panel = contentPanel();
            panel.add(heading("Live Europa world map"));
            panel.add(Box.createVerticalStrut(8));
            panel.add(body("Passive Mode advances station conditions, NPC missions, voyages, encounters, research, production, vendor markets, shortage-based freight offers, deliveries, and treasury evidence while the application remains open."));
            panel.add(Box.createVerticalStrut(16));
            panel.add(metric("NPC vessel records", "Clickable", "Pin a vessel and watch its voyage log update"));
            panel.add(Box.createVerticalStrut(10));
            panel.add(metric("Station response", "Autonomous", "Threat and shortages create missions and freight"));
            panel.add(Box.createVerticalStrut(10));
            panel.add(metric("Automatic scheduling", "Enabled", "Only while Passive Mode is explicitly on"));
            panel.add(Box.createVerticalStrut(16));
            JPanel actions = new JPanel();
            actions.add(button("Open World Map and Passive Console", this::openWorldRegistry));
            actions.add(button("Open Station Logistics", this::openStationLogistics));
            panel.add(actions);
            panel.add(Box.createVerticalGlue());
            return new JScrollPane(panel);
        }

        private Component submarines() {
            JPanel panel = contentPanel();
            panel.add(heading("Submarine and physical-vessel registry"));
            panel.add(Box.createVerticalStrut(8));
            panel.add(body("Imported player vessels retain definition, physical identity, and snapshot chronology. Enrollment in player transit and freight adds operational state without replacing those identities."));
            panel.add(Box.createVerticalStrut(16));
            JPanel actions = new JPanel();
            actions.add(button("Open Vessel Registry", this::openVesselRegistry));
            actions.add(button("Open Player Transit", this::openPlayerTransit));
            actions.add(button("Import One Vessel", this::openImportApproval));
            actions.add(button("Map Campaign Archive", this::openCampaignMapper));
            actions.add(button("Attach Snapshot", this::openSnapshotApproval));
            panel.add(actions);
            panel.add(Box.createVerticalGlue());
            return new JScrollPane(panel);
        }

        private Component routePanel() {
            JPanel panel = contentPanel();
            panel.add(heading("Routes and Jobs"));
            panel.add(Box.createVerticalStrut(8));
            panel.add(body("NPC routes remain automatic under Passive Mode. Imported player vessels can enroll, accept freight, plan explicit routes, choose a mission context, resolve varied deterministic hazards, and retain their own voyage and cargo evidence."));
            panel.add(Box.createVerticalStrut(16));
            JPanel actions = new JPanel();
            actions.add(button("Open Player Transit and Freight", this::openPlayerTransit));
            actions.add(button("Open Live NPC Routes", this::openWorldRegistry));
            panel.add(actions);
            panel.add(Box.createVerticalGlue());
            return new JScrollPane(panel);
        }

        private Component encounterPanel() {
            JPanel panel = contentPanel();
            panel.add(heading("Shared transit encounters"));
            panel.add(Box.createVerticalStrut(8));
            panel.add(body("Player and NPC vessels call the same deterministic resolver for thermal vents, ice shear, ballast failure, reactor instability, fauna, abyssal predators, current reversals, and navigation blackouts. Hazard selection remains reproducible while varying across route sequences."));
            panel.add(Box.createVerticalStrut(16));
            JPanel actions = new JPanel();
            actions.add(button("Resolve Player Transit", this::openPlayerTransit));
            actions.add(button("View NPC Encounters", this::openWorldRegistry));
            panel.add(actions);
            panel.add(Box.createVerticalGlue());
            return new JScrollPane(panel);
        }

        private Component logisticsPanel(Workspace workspace, String description) {
            JPanel panel = contentPanel();
            panel.add(heading(workspace.label()));
            panel.add(Box.createVerticalStrut(8));
            panel.add(body(description));
            panel.add(Box.createVerticalStrut(16));
            JPanel actions = new JPanel();
            actions.add(button("Open Station Logistics", this::openStationLogistics));
            actions.add(button("Open Live World Map", this::openWorldRegistry));
            actions.add(button("Open Player Freight", this::openPlayerTransit));
            panel.add(actions);
            panel.add(Box.createVerticalGlue());
            return new JScrollPane(panel);
        }

        private Component importCenter() {
            JPanel panel = contentPanel();
            panel.add(heading("Import Center"));
            panel.add(Box.createVerticalStrut(8));
            panel.add(body("Sources remain inspection-first and approval-gated. A normalized master world establishes locations and stations; imported physical vessels can then be enrolled into live player routes and freight work."));
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

        private Component simulation() {
            JPanel panel = contentPanel();
            panel.add(heading("Durable simulation controls"));
            panel.add(Box.createVerticalStrut(8));
            panel.add(body("Automatic Passive Mode serializes clock, station, NPC, mission, research, encounter, inventory, production, market, freight, and treasury updates. Explicit player route and freight actions share the world lock without advancing the passive clock."));
            panel.add(Box.createVerticalStrut(16));
            panel.add(metric("Passive scheduler", "Available", "One scheduler per world; disabled or faulted explicitly"));
            panel.add(Box.createVerticalStrut(10));
            panel.add(metric("Cycle scope", "Atomic", "Clock and passive workloads commit together"));
            panel.add(Box.createVerticalStrut(10));
            panel.add(metric("Player operations", "Serialized", "Routes and freight share the world lock and resolver"));
            panel.add(Box.createVerticalStrut(16));
            JPanel actions = new JPanel();
            actions.add(button("Open World Map Passive Mode", this::openWorldRegistry));
            actions.add(button("Open Manual Simulation Monitor", this::openSimulationMonitor));
            panel.add(actions);
            panel.add(Box.createVerticalGlue());
            return new JScrollPane(panel);
        }

        private Component placeholder(Workspace workspace) {
            JPanel panel = contentPanel();
            panel.add(heading(workspace.label()));
            panel.add(Box.createVerticalStrut(8));
            panel.add(body(workspace.description()));
            panel.add(Box.createVerticalStrut(16));
            panel.add(metric("Migration state", "Reserved", "Stable navigation identity; application service not yet connected"));
            panel.add(Box.createVerticalGlue());
            return new JScrollPane(panel);
        }

        private JPanel contentPanel() {
            JPanel panel = new JPanel();
            panel.setLayout(new BoxLayout(panel, BoxLayout.Y_AXIS));
            panel.setBorder(new EmptyBorder(24, 24, 24, 24));
            return panel;
        }

        private JLabel heading(String text) {
            JLabel label = new JLabel(text);
            label.setAlignmentX(Component.LEFT_ALIGNMENT);
            label.setFont(label.getFont().deriveFont(Font.BOLD, 20f));
            return label;
        }

        private JLabel body(String text) {
            JLabel label = new JLabel("<html><div style='width:760px'>" + escapeHtml(text) + "</div></html>");
            label.setAlignmentX(Component.LEFT_ALIGNMENT);
            return label;
        }

        private JPanel metric(String label, String value, String note) {
            JPanel card = new JPanel();
            card.setLayout(new BoxLayout(card, BoxLayout.Y_AXIS));
            card.setBorder(BorderFactory.createCompoundBorder(BorderFactory.createEtchedBorder(),
                    new EmptyBorder(12, 12, 12, 12)));
            card.setAlignmentX(Component.LEFT_ALIGNMENT);
            JLabel heading = new JLabel(label);
            heading.setFont(heading.getFont().deriveFont(Font.BOLD, 12f));
            JLabel metric = new JLabel(value);
            metric.setFont(metric.getFont().deriveFont(Font.BOLD, 22f));
            JLabel detail = new JLabel("<html><div style='width:220px'>" + escapeHtml(note) + "</div></html>");
            card.add(heading);
            card.add(Box.createVerticalStrut(6));
            card.add(metric);
            card.add(Box.createVerticalStrut(6));
            card.add(detail);
            return card;
        }

        private JButton button(String text, Runnable action) {
            JButton button = new JButton(text);
            button.addActionListener(event -> action.run());
            return button;
        }

        private Component statusBar() {
            JPanel status = new JPanel(new BorderLayout(12, 0));
            status.setBorder(new EmptyBorder(10, 6, 2, 6));
            status.add(operationStatus, BorderLayout.WEST);
            status.add(new JLabel("Java 17 Swing · schema " + WorldStorageContracts.DATABASE_SCHEMA_VERSION
                    + " · passive logistics, player transit, and freight available"), BorderLayout.EAST);
            return status;
        }

        private void showSharedWorld(WorldPaths world) {
            worldStatus.setText(world == null ? "No desktop world open" : "World: " + world.root().getFileName());
            if (world == null) {
                simulationStatus.setText("Passive Mode available after master-world import");
                return;
            }
            PassiveWorldSimulationService active = PassiveWorldSimulationService.active(world);
            if (active == null) simulationStatus.setText("Passive Mode off · enable from World Map");
            else if (active.status().fault() != null) simulationStatus.setText("Passive Mode faulted · open World Map");
            else simulationStatus.setText("Passive Mode on · automatic world and logistics cycles active");
        }

        private void openInspection() { showChild(new ImportInspectionWindow(), "Opened read-only source inspection"); }
        private void openWebWorldImport() { showChild(new WebWorldImportApprovalWindow(), "Opened version-22 world approval"); }
        private void openWorldRegistry() { showChild(new WorldMapRegistryWindow(), "Opened live world map and passive console"); }
        private void openStationLogistics() { showChild(new StationLogisticsWindow(), "Opened station logistics and markets"); }
        private void openPlayerTransit() { showChild(new PlayerVesselTransitWindow(), "Opened imported player-vessel transit and freight"); }
        private void openImportApproval() { showChild(new WorldImportApprovalWindow(), "Opened vessel import approval"); }
        private void openCampaignMapper() { showChild(new CampaignVesselMappingWindow(), "Opened campaign vessel mapper"); }
        private void openVesselRegistry() { showChild(new WorldVesselRegistryWindow(), "Opened vessel registry"); }
        private void openSnapshotApproval() { showChild(new VesselSnapshotApprovalWindow(), "Opened snapshot approval"); }
        private void openSimulationMonitor() { showChild(new SimulationMonitorWindow(), "Opened manual durable simulation monitor"); }

        private void showChild(Window window, String status) {
            window.setLocationRelativeTo(this);
            window.setVisible(true);
            operationStatus.setText(status);
        }

        @Override public void dispose() {
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
