package io.github.mrcalzon02.barotrauma.desktop;

import io.github.mrcalzon02.barotrauma.assets.BarotraumaAssetCatalogue.VisualRole;
import io.github.mrcalzon02.barotrauma.desktop.assets.BarotraumaDesktopTheme;
import io.github.mrcalzon02.barotrauma.desktop.assets.DonorAssetSetupWindow;
import io.github.mrcalzon02.barotrauma.desktop.frontier.CivilizationFrontierWindow;
import io.github.mrcalzon02.barotrauma.desktop.generation.DefaultWorldGeneratorWindow;
import io.github.mrcalzon02.barotrauma.desktop.imports.CampaignVesselMappingWindow;
import io.github.mrcalzon02.barotrauma.desktop.imports.ImportInspectionWindow;
import io.github.mrcalzon02.barotrauma.desktop.imports.WebWorldImportApprovalWindow;
import io.github.mrcalzon02.barotrauma.desktop.imports.WorldImportApprovalWindow;
import io.github.mrcalzon02.barotrauma.desktop.logistics.PlayerVesselTransitWindow;
import io.github.mrcalzon02.barotrauma.desktop.logistics.StationLogisticsWindow;
import io.github.mrcalzon02.barotrauma.desktop.nature.NaturalWorldAndFleetWindow;
import io.github.mrcalzon02.barotrauma.desktop.observation.ObservationFoundationWindow;
import io.github.mrcalzon02.barotrauma.desktop.registry.VesselSnapshotApprovalWindow;
import io.github.mrcalzon02.barotrauma.desktop.registry.WorldMapRegistryWindow;
import io.github.mrcalzon02.barotrauma.desktop.registry.WorldVesselRegistryWindow;
import io.github.mrcalzon02.barotrauma.desktop.session.DesktopWorldSession;
import io.github.mrcalzon02.barotrauma.desktop.simulation.SimulationMonitorWindow;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;
import io.github.mrcalzon02.barotrauma.simulation.PassiveWorldSimulationService;

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
import java.awt.FlowLayout;
import java.awt.Font;
import java.awt.GridLayout;
import java.awt.Window;
import java.util.LinkedHashMap;
import java.util.List;
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
            BarotraumaDesktopTheme.install();
            new MainWindow().setVisible(true);
        });
    }

    private static final class MainWindow extends JFrame {
        private static final Workspace[] WORKSPACES = {
                new Workspace("overview", "Overview", "Master-world identity, health, time, readiness, and the current desktop runtime."),
                new Workspace("active-submarine", "Active Submarine", "Imported player-vessel location, freight, transit challenges, systems, and operations."),
                new Workspace("world-map", "World Map", "Live Europa stations, NPC voyages, routes, missions, research, encounters, and frontier pressure."),
                new Workspace("observation-center", "Passive World Observation", "Read-only population, migration, settlement, event, snapshot, and metric evidence."),
                new Workspace("submarines", "Submarines", "Official definitions, physical vessel instances, and snapshot chronology."),
                new Workspace("crew", "Crew", "Characters, assignments, conditions, inventories, qualifications, and future staffing state."),
                new Workspace("stations-economy", "Stations and Economy", "Consumption, production, inventories, vendors, freight, treasuries, and station health."),
                new Workspace("civilization-frontier", "Civilization Frontier", "Supply burn, demographics, fauna pressure, settlement growth, contraction, and abandonment."),
                new Workspace("natural-world", "Natural World and Fleet Response", "Ecology, geology, exposed resources, predator migration, rescue, towing, and repair."),
                new Workspace("routes-jobs", "Routes and Jobs", "Player and NPC voyage planning, contracts, trade, mining, research, and fauna-clearing work."),
                new Workspace("encounters", "Encounters", "Shared player/NPC transit hazards, monster attacks, challenge resolution, and consequences."),
                new Workspace("cargo-catalogue", "Cargo and Catalogue", "Items, recipes, inventories, vendor offers, freight lots, and transactions."),
                new Workspace("workshop-research", "Workshop and R&D", "Research, production recipes, custom content, validation, and settlement construction."),
                new Workspace("factions", "Factions", "Organizations, relationships, influence, reputation, and hidden cells."),
                new Workspace("reference-library", "Reference Library", "Crewman's Primer, RPG rules, catalogues, and source provenance."),
                new Workspace("import-center", "Import and World Creation", "Inspection-first imports and current-schema default-world generation."),
                new Workspace("campaign-journal", "Campaign Journal", "Audit history, incidents, voyages, transactions, and decisions."),
                new Workspace("simulation-monitor", "Simulation Monitor", "Durable manual clock controls and automatic passive world scheduling."),
                new Workspace("settings-backups", "Settings and Backups", "Graphical assets, world directories, checkpoints, backups, restore, and packaging data.")
        };

        private final DesktopWorldSession session = DesktopWorldSession.global();
        private final CardLayout cards = new CardLayout();
        private final JPanel cardPanel = new JPanel(cards);
        private final DefaultListModel<Workspace> navigationModel = new DefaultListModel<>();
        private final JList<Workspace> navigation = new JList<>(navigationModel);
        private final Map<String, Workspace> byId = new LinkedHashMap<>();
        private final JLabel workspaceTitle = new JLabel("Overview");
        private final JLabel worldStatus = new JLabel("No desktop world open");
        private final JLabel simulationStatus = new JLabel("Passive Mode available after world creation or import");
        private final JLabel operationStatus = new JLabel("Desktop shell ready");
        private AutoCloseable sessionSubscription;

        private MainWindow() {
            super("Barotrauma World Simulation Toolbox");
            setDefaultCloseOperation(WindowConstants.EXIT_ON_CLOSE);
            setMinimumSize(new Dimension(1180, 740));
            setSize(1560, 940);
            setLocationRelativeTo(null);
            setIconImage(BarotraumaDesktopTheme.icon(VisualRole.STATION_ICON, 32, 32).getImage());

            for (Workspace workspace : WORKSPACES) {
                byId.put(workspace.id(), workspace);
                navigationModel.addElement(workspace);
            }

            JPanel root = BarotraumaDesktopTheme.scenePanel(VisualRole.APP_BACKGROUND, new BorderLayout(12, 12), 0.76f);
            root.setBorder(new EmptyBorder(12, 12, 12, 12));
            root.add(header(), BorderLayout.NORTH);
            root.add(mainArea(), BorderLayout.CENTER);
            root.add(statusBar(), BorderLayout.SOUTH);
            setContentPane(root);

            navigation.setSelectedIndex(0);
            sessionSubscription = session.addListener(this::showSharedWorld, true);
        }

        private Component header() {
            JPanel header = BarotraumaDesktopTheme.surfacePanel(new BorderLayout(16, 8));
            JLabel appIcon = new JLabel(BarotraumaDesktopTheme.icon(VisualRole.STATION_ICON, 56, 56));
            header.add(appIcon, BorderLayout.WEST);

            JPanel titles = new JPanel();
            titles.setOpaque(false);
            titles.setLayout(new BoxLayout(titles, BoxLayout.Y_AXIS));
            JLabel app = new JLabel("Barotrauma World Simulation Toolbox");
            app.setFont(app.getFont().deriveFont(Font.BOLD, 24f));
            workspaceTitle.setFont(workspaceTitle.getFont().deriveFont(Font.BOLD, 16f));
            titles.add(app);
            titles.add(Box.createVerticalStrut(4));
            titles.add(workspaceTitle);
            header.add(titles, BorderLayout.CENTER);

            JPanel state = new JPanel();
            state.setOpaque(false);
            state.setLayout(new BoxLayout(state, BoxLayout.Y_AXIS));
            worldStatus.setHorizontalAlignment(SwingConstants.RIGHT);
            simulationStatus.setHorizontalAlignment(SwingConstants.RIGHT);
            state.add(worldStatus);
            state.add(Box.createVerticalStrut(4));
            state.add(simulationStatus);
            header.add(state, BorderLayout.EAST);
            return header;
        }

        private Component mainArea() {
            navigation.setSelectionMode(javax.swing.ListSelectionModel.SINGLE_SELECTION);
            navigation.setFixedCellHeight(38);
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
            cardPanel.setOpaque(false);

            JScrollPane navScroll = BarotraumaDesktopTheme.styleScrollPane(new JScrollPane(navigation));
            navScroll.setPreferredSize(new Dimension(280, 700));
            JSplitPane split = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT, navScroll, cardPanel);
            split.setOpaque(false);
            split.setBorder(null);
            split.setDividerLocation(280);
            split.setResizeWeight(0.0);
            return split;
        }

        private void registerPanels() {
            for (Workspace workspace : WORKSPACES) {
                cardPanel.add(workspacePanel(workspace), workspace.id());
            }
        }

        private Component workspacePanel(Workspace workspace) {
            JPanel panel = contentPanel();
            JLabel title = new JLabel(workspace.label(),
                    BarotraumaDesktopTheme.icon(BarotraumaDesktopTheme.workspaceIcon(workspace.id()), 34, 34),
                    JLabel.LEFT);
            title.setIconTextGap(12);
            title.setFont(title.getFont().deriveFont(Font.BOLD, 22f));
            title.setAlignmentX(Component.LEFT_ALIGNMENT);
            panel.add(title);
            panel.add(Box.createVerticalStrut(10));
            panel.add(body(workspace.description()));
            panel.add(Box.createVerticalStrut(18));

            List<MetricSpec> metrics = metrics(workspace.id());
            if (!metrics.isEmpty()) {
                JPanel grid = new JPanel(new GridLayout(0, Math.min(3, metrics.size()), 12, 12));
                grid.setOpaque(false);
                for (MetricSpec metric : metrics) grid.add(metric(metric.label(), metric.value(), metric.note()));
                grid.setAlignmentX(Component.LEFT_ALIGNMENT);
                panel.add(grid);
                panel.add(Box.createVerticalStrut(18));
            }

            JPanel actions = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 8));
            actions.setOpaque(false);
            for (ActionSpec action : actions(workspace.id())) actions.add(button(action.label(), action.action()));
            actions.setAlignmentX(Component.LEFT_ALIGNMENT);
            panel.add(actions);
            panel.add(Box.createVerticalGlue());

            JScrollPane scroll = BarotraumaDesktopTheme.styleScrollPane(new JScrollPane(panel));
            scroll.getViewport().setOpaque(false);
            scroll.setOpaque(false);
            scroll.setBorder(null);
            return scroll;
        }

        private List<MetricSpec> metrics(String id) {
            return switch (id) {
                case "overview" -> List.of(
                        new MetricSpec("Persistence", "Schema " + WorldStorageContracts.DATABASE_SCHEMA_VERSION,
                                "Current migrations, causal evidence, demographics, migration, and settlement authorities"),
                        new MetricSpec("Visual system", "Packaged + donor", "Graphics are resolved before each window becomes visible"),
                        new MetricSpec("World creation", "Current systems", "A deterministic default can be created without a legacy browser export"));
                case "observation-center" -> List.of(
                        new MetricSpec("Query mode", "Read-only", "Observation Registry never mutates the selected world"),
                        new MetricSpec("Population", "Conserved", "Ledgers, flows, losses, settlement handoffs, and dispositions"),
                        new MetricSpec("Refresh", "Incremental", "Changed-after-tick filtering across current schema evidence"));
                case "world-map" -> List.of(
                        new MetricSpec("Routes", "Live", "Stations, missions, NPC transit, incidents, and revised arrivals"),
                        new MetricSpec("Natural world", "Active", "Ecology, geology, resources, and predator pressure"),
                        new MetricSpec("Passive Mode", "Explicit", "One scheduler per selected world"));
                case "civilization-frontier" -> List.of(
                        new MetricSpec("Demographics", "Capacity-backed", "Births, mortality, morale, pressure, and evacuation"),
                        new MetricSpec("Settlements", "Physical", "Founding, expansion, abandonment, and reclamation"),
                        new MetricSpec("Support", "Conserved", "Materials, supplies, population, transport, security, and work"));
                case "settings-backups" -> List.of(
                        new MetricSpec("Donor assets", "Local only", "No Barotrauma donor media is copied into release packages"),
                        new MetricSpec("Packaged assets", "Always available", "Reviewed scene and UI atlases ship with the client"),
                        new MetricSpec("Fallbacks", "Independent", "Java2D emergency graphics remain available"));
                default -> List.of(
                        new MetricSpec("Authority", "Desktop SQLite", "One canonical world and one logical writer"),
                        new MetricSpec("Evidence", "Durable", "State changes retain causal records and audit history"));
            };
        }

        private List<ActionSpec> actions(String id) {
            return switch (id) {
                case "overview" -> List.of(
                        new ActionSpec("Create Current-Systems Default World", this::openDefaultWorldGenerator),
                        new ActionSpec("Open Passive World Observation", this::openObservation),
                        new ActionSpec("Open Live World Map", this::openWorldRegistry),
                        new ActionSpec("Configure Graphical Assets", this::openAssetSetup));
                case "active-submarine" -> List.of(
                        new ActionSpec("Open Player Transit and Freight", this::openPlayerTransit),
                        new ActionSpec("Open Vessel Registry", this::openVesselRegistry),
                        new ActionSpec("Open Fleet Response", this::openNaturalWorld));
                case "world-map" -> List.of(
                        new ActionSpec("Open World Map and Passive Console", this::openWorldRegistry),
                        new ActionSpec("Open Passive World Observation", this::openObservation),
                        new ActionSpec("Open Natural World and Fleet Response", this::openNaturalWorld));
                case "observation-center" -> List.of(
                        new ActionSpec("Open Passive World Observation", this::openObservation),
                        new ActionSpec("Open World Map", this::openWorldRegistry),
                        new ActionSpec("Open Simulation Monitor", this::openSimulationMonitor));
                case "submarines" -> List.of(
                        new ActionSpec("Open Vessel Registry", this::openVesselRegistry),
                        new ActionSpec("Import One Vessel", this::openImportApproval),
                        new ActionSpec("Map Campaign Archive", this::openCampaignMapper),
                        new ActionSpec("Attach Snapshot", this::openSnapshotApproval));
                case "stations-economy", "cargo-catalogue", "workshop-research" -> List.of(
                        new ActionSpec("Open Station Logistics", this::openStationLogistics),
                        new ActionSpec("Open Natural World and Fleet Response", this::openNaturalWorld),
                        new ActionSpec("Open Civilization Frontier", this::openCivilizationFrontier));
                case "civilization-frontier" -> List.of(
                        new ActionSpec("Open Civilization Frontier Console", this::openCivilizationFrontier),
                        new ActionSpec("Open Passive World Observation", this::openObservation),
                        new ActionSpec("Open Station Logistics", this::openStationLogistics));
                case "natural-world" -> List.of(
                        new ActionSpec("Open Natural World and Fleet Console", this::openNaturalWorld),
                        new ActionSpec("Open Live World Map", this::openWorldRegistry),
                        new ActionSpec("Configure Graphical Assets", this::openAssetSetup));
                case "routes-jobs", "encounters" -> List.of(
                        new ActionSpec("Open Player Transit", this::openPlayerTransit),
                        new ActionSpec("Open Live NPC Routes", this::openWorldRegistry),
                        new ActionSpec("Open Natural Events", this::openNaturalWorld));
                case "import-center" -> List.of(
                        new ActionSpec("Create Current-Systems Default World", this::openDefaultWorldGenerator),
                        new ActionSpec("Read-Only Inspection", this::openInspection),
                        new ActionSpec("Version-22 World Approval", this::openWebWorldImport),
                        new ActionSpec("One-Vessel Approval", this::openImportApproval));
                case "simulation-monitor" -> List.of(
                        new ActionSpec("Open World Map Passive Mode", this::openWorldRegistry),
                        new ActionSpec("Open Manual Simulation Monitor", this::openSimulationMonitor),
                        new ActionSpec("Open Passive World Observation", this::openObservation));
                case "settings-backups" -> List.of(
                        new ActionSpec("Configure Graphical Assets", this::openAssetSetup),
                        new ActionSpec("Create Current-Systems Default World", this::openDefaultWorldGenerator),
                        new ActionSpec("Open World Map", this::openWorldRegistry));
                default -> List.of(
                        new ActionSpec("Open Passive World Observation", this::openObservation),
                        new ActionSpec("Open Live World Map", this::openWorldRegistry));
            };
        }

        private JPanel contentPanel() {
            JPanel panel = BarotraumaDesktopTheme.surfacePanel();
            panel.setLayout(new BoxLayout(panel, BoxLayout.Y_AXIS));
            panel.setBorder(new EmptyBorder(24, 24, 24, 24));
            return panel;
        }

        private JLabel body(String text) {
            JLabel label = new JLabel("<html><div style='width:820px'>" + escapeHtml(text) + "</div></html>");
            label.setAlignmentX(Component.LEFT_ALIGNMENT);
            return label;
        }

        private JPanel metric(String label, String value, String note) {
            JPanel card = BarotraumaDesktopTheme.surfacePanel();
            card.setLayout(new BoxLayout(card, BoxLayout.Y_AXIS));
            card.setBorder(new EmptyBorder(12, 12, 12, 12));
            JLabel heading = new JLabel(label);
            heading.setFont(heading.getFont().deriveFont(Font.BOLD, 12f));
            JLabel metric = new JLabel(value);
            metric.setFont(metric.getFont().deriveFont(Font.BOLD, 21f));
            JLabel detail = new JLabel("<html><div style='width:230px'>" + escapeHtml(note) + "</div></html>");
            card.add(heading);
            card.add(Box.createVerticalStrut(6));
            card.add(metric);
            card.add(Box.createVerticalStrut(6));
            card.add(detail);
            return card;
        }

        private JButton button(String text, Runnable action) {
            JButton button = new JButton(text);
            BarotraumaDesktopTheme.styleButton(button, BarotraumaDesktopTheme.actionIcon(text));
            button.addActionListener(event -> action.run());
            return button;
        }

        private Component statusBar() {
            JPanel status = BarotraumaDesktopTheme.surfacePanel(new BorderLayout(12, 0));
            status.setBorder(new EmptyBorder(9, 12, 9, 12));
            status.add(operationStatus, BorderLayout.WEST);
            status.add(new JLabel("Java 17 · schema " + WorldStorageContracts.DATABASE_SCHEMA_VERSION
                    + " · packaged/donor graphics · current-system world generation", JLabel.RIGHT), BorderLayout.EAST);
            return status;
        }

        private void showSharedWorld(WorldPaths world) {
            worldStatus.setText(world == null ? "No desktop world open" : "World: " + world.root().getFileName());
            if (world == null) {
                simulationStatus.setText("Passive Mode available after world creation or import");
                return;
            }
            PassiveWorldSimulationService active = PassiveWorldSimulationService.active(world);
            if (active == null) simulationStatus.setText("Passive Mode off · enable from World Map");
            else if (active.status().fault() != null) simulationStatus.setText("Passive Mode faulted · open World Map");
            else simulationStatus.setText("Passive Mode on · civilization, natural-world, fleet, and NPC cycles active");
        }

        private void openDefaultWorldGenerator() {
            showChild(new DefaultWorldGeneratorWindow(), "Opened current-systems default world generator");
        }
        private void openObservation() { showChild(new ObservationFoundationWindow(), "Opened passive world observation"); }
        private void openInspection() { showChild(new ImportInspectionWindow(), "Opened read-only source inspection"); }
        private void openWebWorldImport() { showChild(new WebWorldImportApprovalWindow(), "Opened version-22 world approval"); }
        private void openWorldRegistry() { showChild(new WorldMapRegistryWindow(), "Opened live world map and passive console"); }
        private void openStationLogistics() { showChild(new StationLogisticsWindow(), "Opened station logistics and markets"); }
        private void openCivilizationFrontier() { showChild(new CivilizationFrontierWindow(), "Opened civilization and fauna frontier"); }
        private void openNaturalWorld() { showChild(new NaturalWorldAndFleetWindow(), "Opened natural world and fleet response"); }
        private void openAssetSetup() { showChild(new DonorAssetSetupWindow(), "Opened donor and packaged graphical asset setup"); }
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

        private static String escapeHtml(String value) {
            return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                    .replace("\"", "&quot;").replace("'", "&#39;");
        }
    }

    private record Workspace(String id, String label, String description) {
        @Override public String toString() { return label; }
    }

    private record MetricSpec(String label, String value, String note) { }
    private record ActionSpec(String label, Runnable action) { }

    private static final class WorkspaceCellRenderer extends DefaultListCellRenderer {
        @Override
        public Component getListCellRendererComponent(JList<?> list, Object value, int index,
                                                       boolean isSelected, boolean cellHasFocus) {
            Component component = super.getListCellRendererComponent(list, value, index, isSelected, cellHasFocus);
            if (component instanceof JLabel label && value instanceof Workspace workspace) {
                label.setText(workspace.label());
                label.setIcon(BarotraumaDesktopTheme.icon(
                        BarotraumaDesktopTheme.workspaceIcon(workspace.id()), 22, 22));
                label.setIconTextGap(8);
                label.setBorder(new EmptyBorder(4, 8, 4, 8));
            }
            return component;
        }
    }
}
