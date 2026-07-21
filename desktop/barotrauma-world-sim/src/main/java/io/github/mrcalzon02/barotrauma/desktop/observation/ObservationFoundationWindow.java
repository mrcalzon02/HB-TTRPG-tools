package io.github.mrcalzon02.barotrauma.desktop.observation;

import io.github.mrcalzon02.barotrauma.desktop.session.DesktopWorldSession;
import io.github.mrcalzon02.barotrauma.observation.ObservationRegistry;
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
import javax.swing.JSpinner;
import javax.swing.JTabbedPane;
import javax.swing.JTable;
import javax.swing.JTextArea;
import javax.swing.SpinnerNumberModel;
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
import java.util.List;
import java.util.concurrent.ExecutionException;

/** Read-only desktop surface for passive-world observation, accounting, and schema-028 migration evidence. */
public final class ObservationFoundationWindow extends JFrame {
    private static final int MIGRATION_LIMIT = 5_000;

    private final DesktopWorldSession session = DesktopWorldSession.global();
    private final JLabel worldStatus = new JLabel("No desktop world open");
    private final JLabel operationStatus = new JLabel("Observation Registry ready");
    private final JButton openWorldButton = new JButton("Open World");
    private final JButton refreshButton = new JButton("Refresh");
    private final JSpinner changedSinceTick = new JSpinner(new SpinnerNumberModel(-1L, -1L, Long.MAX_VALUE, 1L));
    private final JTextArea summary = textArea();

    private final DefaultTableModel npcModel = model("Station", "Total", "Civilians", "Industry", "Logistics",
            "Security", "Medical", "Science", "Temporary", "Refugees", "Housing", "Life Support",
            "Employment", "Morale", "Last Tick", "Population ID");
    private final DefaultTableModel ledgerModel = model("Tick", "Station", "Before", "Births", "Deaths",
            "Immigration", "Emigration", "Disaster Losses", "Other Gains", "Other Losses", "After",
            "Housing", "Life Support", "Employment", "Morale", "Index Before", "Index After", "Cause",
            "Evidence", "Reconciliation", "Baseline / Index", "Summary", "Ledger ID");
    private final DefaultTableModel creatureModel = model("Location", "Guild", "Class", "Estimate", "Biomass",
            "Health", "Food Stress", "Habitat", "Migration", "Confidence", "Territory", "Pressure", "Nest",
            "Last Tick", "Population ID");
    private final DefaultTableModel factionModel = model("Location", "Faction", "Influence", "State", "Source",
            "Last Tick", "Presence ID");
    private final DefaultTableModel migrationModel = model("Status", "Kind", "Cause", "Origin", "Destination",
            "Quantity", "Reserved", "Embarked", "Arrived", "Returned", "Losses", "Stranded", "Transport",
            "Progress", "Duration", "Preparation", "Departure", "Arrival", "Return", "Updated",
            "Failure", "Summary", "Flow ID");
    private final DefaultTableModel eventModel = model("Tick", "Time", "Category", "Entity Type", "Entity ID",
            "Cause", "Evidence", "Magnitude", "Visibility", "Confidence", "Summary", "Event ID");
    private final DefaultTableModel snapshotModel = model("Tick", "Status", "Source", "Rules", "Created",
            "Parent", "Snapshot ID");
    private final DefaultTableModel metricModel = model("Tick", "Entity Type", "Entity ID", "Metric", "Value",
            "Unit", "Snapshot", "Metric ID");

    private final Timer refreshTimer = new Timer(3000, event -> refreshObservation(false));
    private WorldPaths world;
    private Path lastDirectory;
    private AutoCloseable sessionSubscription;
    private boolean busy;

    public ObservationFoundationWindow() {
        super("Barotrauma Observation Foundation");
        setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
        setMinimumSize(new Dimension(1100, 700));
        setSize(1700, 960);
        setLocationByPlatform(true);
        setLayout(new BorderLayout(10, 10));

        JPanel header = new JPanel(new BorderLayout(12, 6));
        header.setBorder(BorderFactory.createEmptyBorder(10, 12, 0, 12));
        header.add(worldStatus, BorderLayout.WEST);
        header.add(operationStatus, BorderLayout.EAST);
        add(header, BorderLayout.NORTH);

        summary.setText("Open a schema-028 desktop world to inspect conserved population and migration evidence.\n");
        JTabbedPane tabs = new JTabbedPane();
        tabs.addTab("Summary", new JScrollPane(summary));
        tabs.addTab("NPC Populations", tablePane(npcModel));
        tabs.addTab("NPC Population Ledger", tablePane(ledgerModel));
        tabs.addTab("NPC Migration", tablePane(migrationModel));
        tabs.addTab("Creature Populations", tablePane(creatureModel));
        tabs.addTab("Faction Presence", tablePane(factionModel));
        tabs.addTab("Observation Events", tablePane(eventModel));
        tabs.addTab("Snapshots", tablePane(snapshotModel));
        tabs.addTab("Metrics", tablePane(metricModel));
        tabs.setBorder(BorderFactory.createEmptyBorder(0, 12, 0, 12));
        add(tabs, BorderLayout.CENTER);

        JPanel controls = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 0));
        controls.add(openWorldButton);
        controls.add(refreshButton);
        controls.add(new JLabel("Changed after tick (-1 = all):"));
        controls.add(changedSinceTick);
        controls.setBorder(BorderFactory.createEmptyBorder(0, 12, 12, 12));
        add(controls, BorderLayout.SOUTH);

        openWorldButton.addActionListener(event -> chooseWorld());
        refreshButton.addActionListener(event -> refreshObservation(true));
        changedSinceTick.addChangeListener(event -> refreshObservation(true));
        sessionSubscription = session.addListener(this::activateWorld, true);
        refreshTimer.setRepeats(true);
        refreshTimer.start();
        refreshControls();
    }

    private void chooseWorld() {
        JFileChooser chooser = lastDirectory == null ? new JFileChooser() : new JFileChooser(lastDirectory.toFile());
        chooser.setDialogTitle("Open a Barotrauma desktop world for observation");
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
            summary.setText("Open a schema-028 desktop world to inspect conserved population and migration evidence.\n");
            refreshControls();
            return;
        }
        lastDirectory = selectedWorld.root().getParent();
        worldStatus.setText("Shared world: " + selectedWorld.root());
        refreshObservation(true);
    }

    private void refreshObservation(boolean explicit) {
        WorldPaths selectedWorld = world;
        if (selectedWorld == null || busy) return;
        long since = ((Number) changedSinceTick.getValue()).longValue();
        setBusy(true, explicit ? "Loading observation evidence…" : "Checking observation changes…");
        new SwingWorker<ObservationLoad, Void>() {
            @Override protected ObservationLoad doInBackground() throws Exception {
                return new ObservationLoad(
                        ObservationRegistry.loadChangedSince(selectedWorld, since),
                        ObservationRegistry.migrationFlows(selectedWorld, since, MIGRATION_LIMIT),
                        ObservationRegistry.migrationConservation(selectedWorld));
            }

            @Override protected void done() {
                try {
                    ObservationLoad load = get();
                    if (!selectedWorld.equals(world)) return;
                    populate(load);
                    operationStatus.setText("Observation evidence loaded at tick "
                            + load.snapshot().summary().currentTick());
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    showFailure("Observation refresh interrupted", exception);
                } catch (ExecutionException exception) {
                    showFailure("Observation refresh failed", cause(exception));
                } finally {
                    setBusy(false, operationStatus.getText());
                }
            }
        }.execute();
    }

    private void populate(ObservationLoad load) {
        clearTables();
        ObservationRegistry.Snapshot snapshot = load.snapshot();
        var worldSummary = snapshot.summary();
        var conservation = load.conservation();
        summary.setText("DESKTOP OBSERVATION FOUNDATION\n\n"
                + "World: " + worldSummary.displayName() + "\n"
                + "World ID: " + worldSummary.worldId() + "\n"
                + "Canonical tick: " + worldSummary.currentTick() + "\n"
                + "Canonical time: " + blank(worldSummary.canonicalTime()) + "\n"
                + "Changed-after filter: " + snapshot.changedSinceTick() + "\n\n"
                + "NPC population records: " + worldSummary.npcPopulations() + "\n"
                + "Estimated NPC population: " + worldSummary.npcPopulationTotal() + "\n"
                + "Population ledger rows: " + worldSummary.populationLedgerRows() + "\n"
                + "Migration rows in this view: " + load.migrations().size() + "\n"
                + "Population resident at stations: " + conservation.stationPopulation() + "\n"
                + "Population physically in flows: " + conservation.populationInFlows() + "\n"
                + "Recorded migration losses: " + conservation.recordedMigrationLosses() + "\n"
                + "Migration-accounted population: " + conservation.accountedPopulation() + "\n"
                + "Creature population records: " + worldSummary.creaturePopulations() + "\n"
                + "Estimated creature count: " + worldSummary.creatureEstimatedTotal() + "\n"
                + "Faction presence records: " + worldSummary.factionPresences() + "\n"
                + "Observation events: " + worldSummary.observationEvents() + "\n\n"
                + "This window is read-only. Schema 028 exposes the same durable migration authority used by "
                + "passive simulation: exact cohorts remain at the origin through preparation, leave only on "
                + "physical departure, and are then accounted as arrived, returned, lost, or stranded.\n");
        summary.setCaretPosition(0);

        for (var row : snapshot.npcPopulations()) npcModel.addRow(new Object[]{row.stationName(), row.totalPopulation(),
                row.civilians(), row.industrialWorkers(), row.logisticsWorkers(), row.securityPersonnel(),
                row.medicalPersonnel(), row.scientificPersonnel(), row.temporaryResidents(), row.refugees(),
                row.housingCapacity(), row.lifeSupportCapacity(), row.employmentCapacity(), row.morale(),
                row.lastTick(), row.populationId()});
        for (var row : snapshot.populationLedgers()) ledgerModel.addRow(new Object[]{row.tickSequence(),
                row.stationName(), row.beforeTotal(), row.births(), row.deaths(), row.immigration(), row.emigration(),
                row.disasterLosses(), row.otherGains(), row.otherLosses(), row.afterTotal(), row.housingCapacity(),
                row.lifeSupportCapacity(), row.employmentCapacity(), row.morale(), row.populationIndexBefore(),
                row.populationIndexAfter(), row.primaryCause(), row.evidenceKey(), row.reconciliationStatus(),
                row.baselinePopulationPerIndex(), row.summary(), row.ledgerId()});
        for (var row : load.migrations()) migrationModel.addRow(new Object[]{row.status(), row.flowKind(), row.cause(),
                row.originStation(), row.destinationStation(), row.quantity(), row.reserved(), row.embarked(),
                row.arrived(), row.returned(), row.losses(), row.stranded(), row.transportName(),
                row.progressTicks(), nullable(row.durationTicks()), nullable(row.preparationTick()),
                nullable(row.departureTick()), nullable(row.arrivalTick()), nullable(row.returnTick()),
                row.updatedTick(), blank(row.failureReason()), row.summary(), row.flowId()});
        for (var row : snapshot.creaturePopulations()) creatureModel.addRow(new Object[]{row.locationName(),
                row.speciesKey(), row.populationClass(), row.estimatedCount(), row.biomass(), row.health(),
                row.foodStress(), row.habitatSupport(), row.migrationPressure(), row.confidence(),
                blank(row.territoryStatus()), row.territoryPressure(), row.nestStrength(), row.lastTick(),
                row.populationId()});
        for (var row : snapshot.factionPresence()) factionModel.addRow(new Object[]{row.locationName(),
                row.factionKey(), row.influence(), row.presenceState(), row.seedSource(), row.lastTick(),
                row.presenceId()});
        for (var row : snapshot.events()) eventModel.addRow(new Object[]{row.tickSequence(), row.canonicalTime(),
                row.category(), row.entityType(), row.entityId(), row.primaryCause(), row.evidenceKey(),
                row.magnitude(), row.visibility(), row.confidence(), row.summary(), row.eventId()});
        for (var row : snapshot.snapshots()) snapshotModel.addRow(new Object[]{row.tickSequence(), row.status(),
                row.source(), row.rulesVersion(), row.createdAt(), blank(row.parentSnapshotId()), row.snapshotId()});
        for (var row : snapshot.metrics()) metricModel.addRow(new Object[]{row.tickSequence(), row.entityType(),
                row.entityId(), row.metricKey(), row.numericValue(), row.unit(), blank(row.snapshotId()), row.metricId()});
    }

    private void clear() {
        clearTables();
        operationStatus.setText("Observation Registry ready");
    }

    private void clearTables() {
        for (DefaultTableModel model : new DefaultTableModel[]{npcModel, ledgerModel, migrationModel, creatureModel,
                factionModel, eventModel, snapshotModel, metricModel}) model.setRowCount(0);
    }

    private void setBusy(boolean value, String message) {
        busy = value;
        operationStatus.setText(message);
        refreshControls();
    }

    private void refreshControls() {
        openWorldButton.setEnabled(!busy);
        refreshButton.setEnabled(!busy && world != null);
        changedSinceTick.setEnabled(!busy && world != null);
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

    private static DefaultTableModel model(String... columns) {
        return new DefaultTableModel(columns, 0) {
            @Override public boolean isCellEditable(int row, int column) { return false; }
        };
    }

    private static JScrollPane tablePane(DefaultTableModel model) {
        JTable table = new JTable(model);
        table.setAutoCreateRowSorter(true);
        table.setAutoResizeMode(JTable.AUTO_RESIZE_OFF);
        return new JScrollPane(table);
    }

    private static JTextArea textArea() {
        JTextArea area = new JTextArea();
        area.setEditable(false);
        area.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 12));
        area.setLineWrap(true);
        area.setWrapStyleWord(true);
        return area;
    }

    private static String blank(String value) { return value == null ? "" : value; }
    private static Object nullable(Object value) { return value == null ? "" : value; }
    private static Throwable cause(ExecutionException exception) {
        return exception.getCause() == null ? exception : exception.getCause();
    }

    private record ObservationLoad(ObservationRegistry.Snapshot snapshot,
                                   List<ObservationRegistry.MigrationFlowRow> migrations,
                                   ObservationRegistry.MigrationConservationRow conservation) { }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            try { UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName()); }
            catch (Exception exception) {
                System.err.println("Could not activate system look and feel: " + exception.getMessage());
            }
            new ObservationFoundationWindow().setVisible(true);
        });
    }
}
