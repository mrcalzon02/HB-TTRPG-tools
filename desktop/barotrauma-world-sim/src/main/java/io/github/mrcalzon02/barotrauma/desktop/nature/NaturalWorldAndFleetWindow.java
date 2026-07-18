package io.github.mrcalzon02.barotrauma.desktop.nature;

import io.github.mrcalzon02.barotrauma.desktop.session.DesktopWorldSession;
import io.github.mrcalzon02.barotrauma.persistence.NaturalWorldAndFleetRegistry;
import io.github.mrcalzon02.barotrauma.persistence.NaturalWorldAndFleetRegistry.Snapshot;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;
import io.github.mrcalzon02.barotrauma.simulation.PassiveWorldSimulationService;

import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JFileChooser;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTabbedPane;
import javax.swing.JTable;
import javax.swing.JTextArea;
import javax.swing.SwingUtilities;
import javax.swing.SwingWorker;
import javax.swing.Timer;
import javax.swing.UIManager;
import javax.swing.WindowConstants;
import javax.swing.table.DefaultTableModel;
import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Font;
import java.nio.file.Path;
import java.util.concurrent.ExecutionException;

/** Live read-only console for passive fleet recovery and natural-world activity. */
public final class NaturalWorldAndFleetWindow extends JFrame {
    private final DesktopWorldSession session = DesktopWorldSession.global();
    private final JLabel worldStatus = new JLabel("No desktop world open");
    private final JLabel operationStatus = new JLabel("Ready");
    private final JButton openWorldButton = new JButton("Open World");
    private final JButton refreshButton = new JButton("Refresh");
    private final JTextArea summary = new JTextArea();

    private final DefaultTableModel ecologyModel = model("Location", "Ring", "Level", "Producers", "Bloom",
            "Herbivores", "Predators", "Scavengers", "Bioaccumulators", "Nutrients", "Habitat", "Migration", "Tick", "Location ID");
    private final DefaultTableModel geologyModel = model("Location", "Ring", "Level", "Stress", "Hydrothermal",
            "Mineral Exposure", "Instability", "Sediment", "Tick", "Location ID");
    private final DefaultTableModel resourceModel = model("Status", "Type", "Location", "Richness",
            "Accessibility", "Renewable", "Discovered", "Updated", "Site ID");
    private final DefaultTableModel eventModel = model("Tick", "Type", "Location", "Severity", "Summary", "Event ID");
    private final DefaultTableModel operationModel = model("Status", "Type", "Progress", "Difficulty", "Casualty",
            "Responder", "Origin", "Target Station", "Target Location", "Steel", "Fuel", "Ammo", "Medical",
            "Created", "Updated", "Completed", "Operation ID");
    private final DefaultTableModel responseLogModel = model("Tick", "Operation Type", "Event", "Summary",
            "Operation ID", "Log ID");

    private final Timer refreshTimer = new Timer(2500, event -> refresh());
    private WorldPaths world;
    private Path lastDirectory;
    private AutoCloseable sessionSubscription;
    private boolean busy;

    public NaturalWorldAndFleetWindow() {
        super("Barotrauma Natural World and Fleet Response");
        setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
        setMinimumSize(new Dimension(1100, 700));
        setSize(1550, 900);
        setLocationByPlatform(true);
        setLayout(new BorderLayout(10, 10));

        JPanel header = new JPanel(new BorderLayout(12, 8));
        header.setBorder(BorderFactory.createEmptyBorder(12, 12, 0, 12));
        header.add(worldStatus, BorderLayout.WEST);
        header.add(operationStatus, BorderLayout.EAST);
        add(header, BorderLayout.NORTH);

        summary.setEditable(false);
        summary.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 13));
        summary.setText(schemaPrompt());

        JTabbedPane tabs = new JTabbedPane();
        tabs.addTab("Summary", new JScrollPane(summary));
        tabs.addTab("Ecology", scroll(ecologyModel));
        tabs.addTab("Geology", scroll(geologyModel));
        tabs.addTab("Resource Sites", scroll(resourceModel));
        tabs.addTab("Natural Events", scroll(eventModel));
        tabs.addTab("Fleet Responses", scroll(operationModel));
        tabs.addTab("Response Log", scroll(responseLogModel));
        tabs.setBorder(BorderFactory.createEmptyBorder(0, 12, 0, 12));
        add(tabs, BorderLayout.CENTER);

        JPanel footer = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 0));
        footer.setBorder(BorderFactory.createEmptyBorder(0, 12, 12, 12));
        footer.add(openWorldButton);
        footer.add(refreshButton);
        add(footer, BorderLayout.SOUTH);

        openWorldButton.addActionListener(event -> chooseWorld());
        refreshButton.addActionListener(event -> refresh());
        sessionSubscription = session.addListener(this::activateWorld, true);
        refreshTimer.setCoalesce(true);
        refreshTimer.start();
        refreshControls();
    }

    private void chooseWorld() {
        JFileChooser chooser = lastDirectory == null ? new JFileChooser() : new JFileChooser(lastDirectory.toFile());
        chooser.setDialogTitle("Open an existing Barotrauma desktop world");
        chooser.setFileSelectionMode(JFileChooser.DIRECTORIES_ONLY);
        chooser.setAcceptAllFileFilterUsed(false);
        if (chooser.showOpenDialog(this) != JFileChooser.APPROVE_OPTION) return;
        try {
            session.activate(WorldStorageContracts.openWorld(chooser.getSelectedFile().toPath()));
        } catch (Exception exception) {
            showFailure("World open failed", exception);
        }
    }

    private void activateWorld(WorldPaths selectedWorld) {
        world = selectedWorld;
        clear();
        if (selectedWorld == null) {
            worldStatus.setText("No desktop world open");
            summary.setText(schemaPrompt());
            refreshControls();
            return;
        }
        lastDirectory = selectedWorld.root().getParent();
        worldStatus.setText("Shared world: " + selectedWorld.root());
        refresh();
    }

    private void refresh() {
        WorldPaths selectedWorld = world;
        if (selectedWorld == null || busy) return;
        setBusy(true, "Loading fleet and natural-world evidence…");
        new SwingWorker<Snapshot, Void>() {
            @Override protected Snapshot doInBackground() throws Exception {
                return NaturalWorldAndFleetRegistry.load(selectedWorld);
            }

            @Override protected void done() {
                try {
                    Snapshot snapshot = get();
                    if (!selectedWorld.equals(world)) return;
                    populate(snapshot);
                    PassiveWorldSimulationService active = PassiveWorldSimulationService.active(selectedWorld);
                    operationStatus.setText(active == null ? "Loaded · Passive Mode off"
                            : active.status().fault() == null ? "Live · Passive Mode running"
                            : "Loaded · Passive Mode faulted");
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    showFailure("Natural-world refresh interrupted", exception);
                } catch (ExecutionException exception) {
                    showFailure("Natural-world refresh failed", cause(exception));
                } finally {
                    setBusy(false, operationStatus.getText());
                }
            }
        }.execute();
    }

    private void populate(Snapshot snapshot) {
        clear();
        var s = snapshot.summary();
        summary.setText("Passive fleet recovery and natural-world registry\n"
                + "Database schema: " + WorldStorageContracts.DATABASE_SCHEMA_VERSION + "\n"
                + "Locations with ecology: " + s.locations() + "\n"
                + "Active algal blooms: " + s.activeBlooms() + "\n"
                + "Predator migration zones: " + s.predatorMigrationZones() + "\n"
                + "Geological hotspots: " + s.geologicalHotspots() + "\n"
                + "Exposed resource sites: " + s.resourceSites() + "\n"
                + "Active fleet responses: " + s.activeResponses() + "\n"
                + "Completed fleet responses: " + s.completedResponses() + "\n\n"
                + "Ecological cycles connect producers, algal blooms, herbivores, predators, scavengers, "
                + "bioaccumulators, nutrients, habitat integrity, and migration pressure. Geological cycles "
                + "change stress, hydrothermal activity, cave stability, sediment, and exposed resources.\n\n"
                + "Disabled vessels and besieged stations create response operations. Qualified patrol, salvage, "
                + "or courier vessels are assigned when available. Progress requires sufficient steel, fuel, "
                + "ammunition, and medical stock at the origin station. Exposed resources and predator expansion "
                + "feed mining, research, salvage, and fauna-clearing work into the shared NPC mission queue.\n");

        for (var row : snapshot.ecology()) ecologyModel.addRow(new Object[]{row.locationName(), row.ring(), row.level(),
                row.primaryProducers(), row.algalBloom(), row.herbivores(), row.predators(), row.scavengers(),
                row.bioaccumulators(), row.nutrients(), row.habitatIntegrity(), row.migrationPressure(), row.lastTick(), row.locationId()});
        for (var row : snapshot.geology()) geologyModel.addRow(new Object[]{row.locationName(), row.ring(), row.level(),
                row.tectonicStress(), row.hydrothermalActivity(), row.mineralExposure(), row.caveInstability(),
                row.sedimentFlux(), row.lastTick(), row.locationId()});
        for (var row : snapshot.resources()) resourceModel.addRow(new Object[]{row.status(), row.resourceType(),
                row.locationName(), row.richness(), row.accessibility(), row.renewable(), row.discoveredTick(),
                row.lastTick(), row.siteId()});
        for (var row : snapshot.events()) eventModel.addRow(new Object[]{row.tickSequence(), row.eventType(),
                row.locationName(), row.severity(), row.summary(), row.eventId()});
        for (var row : snapshot.operations()) operationModel.addRow(new Object[]{row.status(), row.operationType(),
                row.progress(), row.difficulty(), blank(row.distressedVessel()), blank(row.responderVessel()),
                blank(row.originStation()), blank(row.targetStation()), row.targetLocation(), row.spareParts(),
                row.fuel(), row.ammunition(), row.medical(), row.createdTick(), row.updatedTick(),
                row.completedTick() == null ? "" : row.completedTick(), row.operationId()});
        for (var row : snapshot.responseLogs()) responseLogModel.addRow(new Object[]{row.tickSequence(),
                row.operationType(), row.eventType(), row.summary(), row.operationId(), row.logId()});
        summary.setCaretPosition(0);
    }

    private void clear() {
        for (DefaultTableModel model : new DefaultTableModel[]{ecologyModel, geologyModel, resourceModel,
                eventModel, operationModel, responseLogModel}) model.setRowCount(0);
    }

    private void setBusy(boolean value, String message) {
        busy = value;
        operationStatus.setText(message);
        refreshControls();
    }

    private void refreshControls() {
        openWorldButton.setEnabled(!busy);
        refreshButton.setEnabled(!busy && world != null);
    }

    private void showFailure(String title, Throwable throwable) {
        operationStatus.setText(title);
        summary.append("\n" + title + "\n" + throwable.getClass().getSimpleName() + ": "
                + throwable.getMessage() + "\n");
        JOptionPane.showMessageDialog(this, throwable.getMessage(), title, JOptionPane.ERROR_MESSAGE);
    }

    @Override public void dispose() {
        refreshTimer.stop();
        if (sessionSubscription != null) {
            try { sessionSubscription.close(); } catch (Exception ignored) { }
            sessionSubscription = null;
        }
        super.dispose();
    }

    private static JScrollPane scroll(DefaultTableModel model) {
        JTable table = new JTable(model);
        table.setAutoCreateRowSorter(true);
        table.setAutoResizeMode(JTable.AUTO_RESIZE_OFF);
        table.setFillsViewportHeight(true);
        return new JScrollPane(table);
    }

    private static DefaultTableModel model(String... columns) {
        return new DefaultTableModel(columns, 0) {
            @Override public boolean isCellEditable(int row, int column) { return false; }
        };
    }

    private static String schemaPrompt() {
        return "Open a schema-" + WorldStorageContracts.DATABASE_SCHEMA_VERSION
                + " world to inspect fleet recovery and natural activity.\n";
    }

    private static String blank(String value) { return value == null ? "" : value; }
    private static Throwable cause(ExecutionException exception) {
        return exception.getCause() == null ? exception : exception.getCause();
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            try { UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName()); }
            catch (Exception exception) { System.err.println(exception.getMessage()); }
            NaturalWorldAndFleetWindow window = new NaturalWorldAndFleetWindow();
            window.setLocationRelativeTo(null);
            window.setVisible(true);
        });
    }
}
