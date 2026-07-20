package io.github.mrcalzon02.barotrauma.desktop.frontier;

import io.github.mrcalzon02.barotrauma.desktop.logistics.StationLogisticsWindow;
import io.github.mrcalzon02.barotrauma.desktop.registry.WorldMapRegistryWindow;
import io.github.mrcalzon02.barotrauma.desktop.session.DesktopWorldSession;
import io.github.mrcalzon02.barotrauma.persistence.CivilizationFrontierRegistry;
import io.github.mrcalzon02.barotrauma.persistence.CivilizationFrontierRegistry.Snapshot;
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
import java.util.concurrent.ExecutionException;

/** Read-only live console for station consumption and civilization/fauna frontier movement. */
public final class CivilizationFrontierWindow extends JFrame {
    private final DesktopWorldSession session = DesktopWorldSession.global();
    private final JLabel worldStatus = new JLabel("No desktop world open");
    private final JLabel operationStatus = new JLabel("Ready");
    private final JButton openWorldButton = new JButton("Open World");
    private final JButton refreshButton = new JButton("Refresh");
    private final JButton logisticsButton = new JButton("Open Logistics");
    private final JButton worldMapButton = new JButton("Open World Map");
    private final JTextArea summary = new JTextArea();

    private final DefaultTableModel stationModel = model("Frontier", "Station", "Station Status",
            "Supplies", "Rations", "Last Use", "Shortage", "Surplus", "Residents", "Workforce",
            "Population Capacity", "Civilization",
            "Fauna", "Position", "Integrity", "Security", "Threat", "Industry", "Tick", "Station ID");
    private final DefaultTableModel consumptionModel = model("Tick", "Station", "Required", "Rations Used",
            "Supply Delta", "Shortage", "Supplies After", "Rations After", "Consumption ID");
    private final DefaultTableModel eventModel = model("Tick", "Station", "Event", "Severity",
            "Supply", "Integrity", "Security", "Civilization", "Fauna", "Frontier", "Summary", "Event ID");
    private final DefaultTableModel missionModel = model("Updated", "Station", "Type", "Status", "Target",
            "Difficulty", "Reward", "Progress", "Created", "Mission ID");

    private WorldPaths world;
    private Path lastDirectory;
    private AutoCloseable sessionSubscription;
    private boolean busy;

    public CivilizationFrontierWindow() {
        super("Barotrauma Civilization Frontier");
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
        summary.setText("Open a current-schema world to inspect station consumption and frontier movement.\n");

        JTabbedPane tabs = new JTabbedPane();
        tabs.addTab("Summary", new JScrollPane(summary));
        tabs.addTab("Station Frontiers", scroll(stationModel));
        tabs.addTab("Consumption History", scroll(consumptionModel));
        tabs.addTab("Frontier Events", scroll(eventModel));
        tabs.addTab("NPC Responses", scroll(missionModel));
        tabs.setBorder(BorderFactory.createEmptyBorder(0, 12, 0, 12));
        add(tabs, BorderLayout.CENTER);

        JPanel footer = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 0));
        footer.setBorder(BorderFactory.createEmptyBorder(0, 12, 12, 12));
        footer.add(openWorldButton);
        footer.add(refreshButton);
        footer.add(logisticsButton);
        footer.add(worldMapButton);
        add(footer, BorderLayout.SOUTH);

        openWorldButton.addActionListener(event -> chooseWorld());
        refreshButton.addActionListener(event -> refresh());
        logisticsButton.addActionListener(event -> {
            StationLogisticsWindow window = new StationLogisticsWindow();
            window.setLocationRelativeTo(this);
            window.setVisible(true);
        });
        worldMapButton.addActionListener(event -> {
            WorldMapRegistryWindow window = new WorldMapRegistryWindow();
            window.setLocationRelativeTo(this);
            window.setVisible(true);
        });
        sessionSubscription = session.addListener(this::activateWorld, true);
        refreshControls();
    }

    private void chooseWorld() {
        JFileChooser chooser = lastDirectory == null ? new JFileChooser() : new JFileChooser(lastDirectory.toFile());
        chooser.setDialogTitle("Open an existing Barotrauma desktop world");
        chooser.setFileSelectionMode(JFileChooser.DIRECTORIES_ONLY);
        chooser.setAcceptAllFileFilterUsed(false);
        if (chooser.showOpenDialog(this) != JFileChooser.APPROVE_OPTION) return;
        try { session.activate(WorldStorageContracts.openWorld(chooser.getSelectedFile().toPath())); }
        catch (Exception exception) { showFailure("World open failed", exception); }
    }

    private void activateWorld(WorldPaths selectedWorld) {
        world = selectedWorld;
        clear();
        if (selectedWorld == null) {
            worldStatus.setText("No desktop world open");
            summary.setText("Open a current-schema world to inspect station consumption and frontier movement.\n");
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
        setBusy(true, "Loading civilization frontier…");
        new SwingWorker<Snapshot, Void>() {
            @Override protected Snapshot doInBackground() throws Exception {
                return CivilizationFrontierRegistry.load(selectedWorld);
            }
            @Override protected void done() {
                try {
                    Snapshot snapshot = get();
                    if (!selectedWorld.equals(world)) return;
                    populate(snapshot);
                    operationStatus.setText("Civilization frontier loaded");
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    showFailure("Frontier refresh interrupted", exception);
                } catch (ExecutionException exception) {
                    showFailure("Frontier refresh failed", cause(exception));
                } finally { setBusy(false, operationStatus.getText()); }
            }
        }.execute();
    }

    private void populate(Snapshot snapshot) {
        clear();
        var s = snapshot.summary();
        summary.setText("Civilization and fauna frontier\n"
                + "Stations: " + s.stations() + "\n"
                + "Expanding: " + s.expanding() + "\n"
                + "Holding: " + s.holding() + "\n"
                + "Contested: " + s.contested() + "\n"
                + "Contracting: " + s.contracting() + "\n"
                + "Abandoned: " + s.abandoned() + "\n"
                + "Average frontier position: " + oneDecimal(s.averageFrontier()) + "\n"
                + "Average civilization strength: " + oneDecimal(s.averageCivilization()) + "\n"
                + "Average fauna pressure: " + oneDecimal(s.averageFauna()) + "\n"
                + "Consumption records: " + s.consumptionRows() + "\n"
                + "Shortage records: " + s.shortageRows() + "\n"
                + "Monster attacks: " + s.monsterAttacks() + "\n\n"
                + "Every passive tick consumes a small deterministic amount with variation. Ration stock covers demand first; "
                + "uncovered consumption deepens shortage pressure. Persistent shortages slowly reduce integrity, security, "
                + "population capacity, and the civilian perimeter. Resident and workforce headcounts begin as a clearly "
                + "labeled imported estimate, then move only through recorded population events. Deliveries, defensive missions, and successful pressure "
                + "against fauna can stabilize or expand civilization again.\n");

        for (var row : snapshot.stations()) stationModel.addRow(new Object[]{row.frontierState(), row.stationName(),
                row.stationStatus(), row.supplies(), row.rationStock(), row.lastConsumption(), row.shortageTicks(),
                row.surplusTicks(), row.residentCount(), row.workforceCount(), row.populationIndex(),
                row.civilizationStrength(), row.faunaPressure(),
                row.frontierPosition(), row.integrity(), row.security(), row.threat(), row.industry(),
                row.lastTick(), row.stationId()});
        for (var row : snapshot.consumption()) consumptionModel.addRow(new Object[]{row.tickSequence(),
                row.stationName(), row.requiredUnits(), row.rationUnitsConsumed(), signed(row.abstractSupplyDelta()),
                row.shortage(), row.suppliesAfter(), row.rationStockAfter(), row.consumptionId()});
        for (var row : snapshot.events()) eventModel.addRow(new Object[]{row.tickSequence(), row.stationName(),
                row.eventType(), row.severity(), signed(row.suppliesDelta()), signed(row.integrityDelta()),
                signed(row.securityDelta()), signed(row.civilizationDelta()), signed(row.faunaDelta()),
                signed(row.frontierDelta()), row.summary(), row.eventId()});
        for (var row : snapshot.responseMissions()) missionModel.addRow(new Object[]{row.updatedTick(),
                row.stationName(), row.missionType(), row.status(), row.targetName(), row.difficulty(),
                row.rewardCredits(), row.progress(), row.createdTick(), row.missionId()});
        summary.setCaretPosition(0);
    }

    private void clear() {
        for (DefaultTableModel model : new DefaultTableModel[]{stationModel, consumptionModel, eventModel, missionModel}) {
            model.setRowCount(0);
        }
    }

    private void setBusy(boolean value, String message) {
        busy = value;
        operationStatus.setText(message);
        refreshControls();
    }

    private void refreshControls() {
        openWorldButton.setEnabled(!busy);
        refreshButton.setEnabled(!busy && world != null);
        logisticsButton.setEnabled(!busy && world != null);
        worldMapButton.setEnabled(!busy && world != null);
    }

    private void showFailure(String title, Throwable throwable) {
        operationStatus.setText(title);
        summary.append("\n" + title + "\n" + throwable.getClass().getSimpleName() + ": "
                + throwable.getMessage() + "\n");
        JOptionPane.showMessageDialog(this, throwable.getMessage(), title, JOptionPane.ERROR_MESSAGE);
    }

    @Override public void dispose() {
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

    private static String signed(int value) { return value > 0 ? "+" + value : Integer.toString(value); }
    private static String oneDecimal(double value) { return String.format(java.util.Locale.ROOT, "%.1f", value); }
    private static Throwable cause(ExecutionException exception) {
        return exception.getCause() == null ? exception : exception.getCause();
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            try { UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName()); }
            catch (Exception exception) { System.err.println(exception.getMessage()); }
            CivilizationFrontierWindow window = new CivilizationFrontierWindow();
            window.setLocationRelativeTo(null);
            window.setVisible(true);
        });
    }
}
