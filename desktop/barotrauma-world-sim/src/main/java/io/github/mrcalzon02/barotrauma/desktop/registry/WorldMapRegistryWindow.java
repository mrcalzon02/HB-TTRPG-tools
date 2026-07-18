package io.github.mrcalzon02.barotrauma.desktop.registry;

import io.github.mrcalzon02.barotrauma.desktop.imports.WebWorldImportApprovalWindow;
import io.github.mrcalzon02.barotrauma.desktop.session.DesktopWorldSession;
import io.github.mrcalzon02.barotrauma.persistence.WorldMapRegistry;
import io.github.mrcalzon02.barotrauma.persistence.WorldMapRegistry.ComponentVersionRow;
import io.github.mrcalzon02.barotrauma.persistence.WorldMapRegistry.LocationRow;
import io.github.mrcalzon02.barotrauma.persistence.WorldMapRegistry.RegistrySnapshot;
import io.github.mrcalzon02.barotrauma.persistence.WorldMapRegistry.StationRow;
import io.github.mrcalzon02.barotrauma.persistence.WorldMapRegistry.WorldSummary;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

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
import javax.swing.UIManager;
import javax.swing.WindowConstants;
import javax.swing.table.DefaultTableModel;
import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Font;
import java.nio.file.Path;
import java.time.Instant;
import java.util.concurrent.ExecutionException;

/** Read-only Swing view of normalized version-22 master-world state. */
public final class WorldMapRegistryWindow extends JFrame {
    private final DesktopWorldSession session = DesktopWorldSession.global();
    private final JButton openWorldButton = new JButton("Open World");
    private final JButton refreshButton = new JButton("Refresh");
    private final JButton importButton = new JButton("Open Version-22 Import");
    private final JLabel worldStatus = new JLabel("No desktop world open");
    private final JLabel operationStatus = new JLabel("Ready");
    private final JTextArea summary = new JTextArea();

    private final DefaultTableModel locationModel = model(
            "Ring", "Level", "Station", "Name", "Type", "Source ID", "X", "Y", "Biome", "Faction", "Location ID");
    private final DefaultTableModel stationModel = model(
            "Ring", "Level", "Name", "Type", "Faction", "Economy", "Source ID", "Location Source ID", "Station ID");
    private final DefaultTableModel componentModel = model("Component", "Version");
    private final DefaultTableModel familyModel = model("Imported State Family");

    private final JTable locationTable = table(locationModel);
    private final JTable stationTable = table(stationModel);
    private final JTable componentTable = table(componentModel);
    private final JTable familyTable = table(familyModel);

    private WorldPaths world;
    private Path lastDirectory;
    private AutoCloseable sessionSubscription;

    public WorldMapRegistryWindow() {
        super("Barotrauma Normalized World Registry");
        setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
        setMinimumSize(new Dimension(1050, 680));
        setSize(1380, 820);
        setLocationByPlatform(true);
        setLayout(new BorderLayout(10, 10));

        JPanel header = new JPanel(new BorderLayout(12, 8));
        header.setBorder(BorderFactory.createEmptyBorder(12, 12, 0, 12));
        header.add(worldStatus, BorderLayout.WEST);
        header.add(operationStatus, BorderLayout.EAST);
        add(header, BorderLayout.NORTH);

        summary.setEditable(false);
        summary.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 13));
        summary.setText("Open a desktop world to inspect normalized master-world state.\n");

        JTabbedPane tabs = new JTabbedPane();
        tabs.addTab("World Summary", new JScrollPane(summary));
        tabs.addTab("Locations", new JScrollPane(locationTable));
        tabs.addTab("Stations", new JScrollPane(stationTable));
        tabs.addTab("Component Versions", new JScrollPane(componentTable));
        tabs.addTab("State Families", new JScrollPane(familyTable));
        tabs.setBorder(BorderFactory.createEmptyBorder(0, 12, 0, 12));
        add(tabs, BorderLayout.CENTER);

        JPanel footer = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 0));
        footer.setBorder(BorderFactory.createEmptyBorder(0, 12, 12, 12));
        footer.add(openWorldButton);
        footer.add(refreshButton);
        footer.add(importButton);
        add(footer, BorderLayout.SOUTH);

        refreshButton.setEnabled(false);
        openWorldButton.addActionListener(event -> openWorld());
        refreshButton.addActionListener(event -> refreshRegistry());
        importButton.addActionListener(event -> {
            WebWorldImportApprovalWindow window = new WebWorldImportApprovalWindow();
            window.setLocationRelativeTo(this);
            window.setVisible(true);
        });
        sessionSubscription = session.addListener(this::activateSharedWorld, true);
    }

    private void openWorld() {
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

    private void activateSharedWorld(WorldPaths sharedWorld) {
        world = sharedWorld;
        clearTables();
        if (sharedWorld == null) {
            worldStatus.setText("No desktop world open");
            refreshButton.setEnabled(false);
            summary.setText("Open a desktop world to inspect normalized master-world state.\n");
            return;
        }
        lastDirectory = sharedWorld.root().getParent();
        worldStatus.setText("Shared world: " + sharedWorld.root());
        refreshButton.setEnabled(true);
        refreshRegistry();
    }

    private void refreshRegistry() {
        WorldPaths selectedWorld = world;
        if (selectedWorld == null) return;
        setBusy(true, "Loading normalized world registry…");
        new SwingWorker<RegistrySnapshot, Void>() {
            @Override
            protected RegistrySnapshot doInBackground() throws Exception {
                return WorldMapRegistry.load(selectedWorld);
            }

            @Override
            protected void done() {
                try {
                    RegistrySnapshot registry = get();
                    if (!selectedWorld.equals(world)) return;
                    populate(registry);
                    operationStatus.setText(registry.summary().imported()
                            ? "Normalized world registry loaded"
                            : "World database initialized; no master world imported");
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    showFailure("World registry refresh interrupted", exception);
                } catch (ExecutionException exception) {
                    showFailure("World registry refresh failed", cause(exception));
                } finally {
                    setBusy(false, operationStatus.getText());
                }
            }
        }.execute();
    }

    private void populate(RegistrySnapshot registry) {
        clearTables();
        summary.setText(renderSummary(registry.summary(), registry));
        summary.setCaretPosition(0);
        for (LocationRow location : registry.locations()) {
            locationModel.addRow(new Object[]{
                    location.ring(), location.locationLevel(), location.station() ? "Station" : "",
                    blank(location.displayName()), blank(location.locationType()), location.sourceLocationId(),
                    nullable(location.mapX()), nullable(location.mapY()), blank(location.biome()),
                    blank(location.faction()), location.locationId()
            });
        }
        for (StationRow station : registry.stations()) {
            stationModel.addRow(new Object[]{
                    station.ring(), station.locationLevel(), blank(station.displayName()),
                    blank(station.stationType()), blank(station.faction()),
                    station.economyPresent() ? "Present" : "Not recorded", station.sourceStationId(),
                    station.sourceLocationId(), station.stationId()
            });
        }
        for (ComponentVersionRow component : registry.componentVersions()) {
            componentModel.addRow(new Object[]{component.componentKey(), component.componentVersion()});
        }
        for (String family : registry.stateFamilies()) familyModel.addRow(new Object[]{family});
    }

    private static String renderSummary(WorldSummary world, RegistrySnapshot registry) {
        StringBuilder text = new StringBuilder("Normalized master-world registry\n")
                .append("Desktop world: ").append(world.displayName()).append('\n')
                .append("Desktop world ID: ").append(world.worldId()).append('\n')
                .append("Master world imported: ").append(world.imported()).append('\n');
        if (!world.imported()) {
            return text.append("\nNo version-22 master world has been accepted into this database.\n").toString();
        }
        return text.append("Import ID: ").append(world.importId()).append('\n')
                .append("Master world ID: ").append(value(world.masterWorldId())).append('\n')
                .append("Suite version: ").append(value(world.suiteVersion())).append('\n')
                .append("Source exported at: ").append(value(world.sourceExportedAt())).append('\n')
                .append("Imported at: ").append(value(world.importedAt())).append('\n')
                .append("Rings: ").append(value(world.rings())).append('\n')
                .append("Declared locations / loaded: ").append(value(world.declaredLocations()))
                .append(" / ").append(registry.locations().size()).append('\n')
                .append("Declared stations / loaded: ").append(value(world.declaredStations()))
                .append(" / ").append(registry.stations().size()).append('\n')
                .append("Shell radius: ").append(value(world.shellRadius())).append('\n')
                .append("Canonical time: ").append(value(world.canonicalTime())).append('\n')
                .append("Real epoch: ").append(value(world.realEpoch())).append('\n')
                .append("Source last simulated at: ").append(value(world.lastSimulatedAt())).append('\n')
                .append("Imported tick sequence: ").append(value(world.importedTickSequence())).append('\n')
                .append("Simulation enabled: ").append(world.simulationEnabled()).append('\n')
                .append("Scheduler state: ").append(value(world.schedulerState())).append('\n')
                .append("Active submarine: ").append(value(world.activeSubmarineName()))
                .append(world.activeSubmarineModel() == null ? "" : " [" + world.activeSubmarineModel() + "]")
                .append('\n')
                .append("Crew records: ").append(value(world.crewRecords())).append('\n')
                .append("Economy vessels / stations: ").append(value(world.economyVessels()))
                .append(" / ").append(value(world.economyStations())).append('\n')
                .append("Component versions: ").append(registry.componentVersions().size()).append('\n')
                .append("Top-level state families: ").append(registry.stateFamilies().size()).append('\n')
                .toString();
    }

    private void setBusy(boolean busy, String message) {
        openWorldButton.setEnabled(!busy);
        refreshButton.setEnabled(!busy && world != null);
        importButton.setEnabled(!busy);
        operationStatus.setText(message);
    }

    private void clearTables() {
        locationModel.setRowCount(0);
        stationModel.setRowCount(0);
        componentModel.setRowCount(0);
        familyModel.setRowCount(0);
    }

    private void showFailure(String title, Throwable throwable) {
        operationStatus.setText(title);
        summary.append("\n" + title + "\n" + throwable.getClass().getSimpleName() + ": "
                + throwable.getMessage() + "\n");
        JOptionPane.showMessageDialog(this, throwable.getMessage(), title, JOptionPane.ERROR_MESSAGE);
    }

    @Override
    public void dispose() {
        if (sessionSubscription != null) {
            try { sessionSubscription.close(); } catch (Exception ignored) { }
            sessionSubscription = null;
        }
        super.dispose();
    }

    private static DefaultTableModel model(String... columns) {
        return new DefaultTableModel(columns, 0) {
            @Override public boolean isCellEditable(int row, int column) { return false; }
        };
    }

    private static JTable table(DefaultTableModel model) {
        JTable table = new JTable(model);
        table.setAutoCreateRowSorter(true);
        table.setFillsViewportHeight(true);
        table.setAutoResizeMode(JTable.AUTO_RESIZE_OFF);
        return table;
    }

    private static String blank(String value) { return value == null ? "" : value; }
    private static Object nullable(Object value) { return value == null ? "" : value; }
    private static String value(Object value) { return value == null ? "not declared" : value.toString(); }
    private static Throwable cause(ExecutionException exception) {
        return exception.getCause() == null ? exception : exception.getCause();
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            try { UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName()); }
            catch (Exception exception) {
                System.err.println("Could not activate system look and feel: " + exception.getMessage());
            }
            WorldMapRegistryWindow window = new WorldMapRegistryWindow();
            window.setLocationRelativeTo(null);
            window.setVisible(true);
        });
    }
}
