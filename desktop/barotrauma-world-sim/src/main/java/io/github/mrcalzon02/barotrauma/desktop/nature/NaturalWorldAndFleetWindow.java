package io.github.mrcalzon02.barotrauma.desktop.nature;

import io.github.mrcalzon02.barotrauma.assets.BarotraumaDonorAssets;
import io.github.mrcalzon02.barotrauma.assets.BarotraumaDonorAssets.AssetRole;
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
import javax.swing.Icon;
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

/** Live read-only console for response transit, recovery, extraction, and natural-world activity. */
public final class NaturalWorldAndFleetWindow extends JFrame {
    private final DesktopWorldSession session = DesktopWorldSession.global();
    private final BarotraumaDonorAssets graphicalAssets = new BarotraumaDonorAssets();
    private final JLabel worldStatus = new JLabel("No desktop world open");
    private final JLabel operationStatus = new JLabel("Ready");
    private final JButton openWorldButton = new JButton("Open World");
    private final JButton refreshButton = new JButton("Refresh");
    private final JTextArea summary = new JTextArea();

    private final DefaultTableModel ecologyModel = model("Location", "Ring", "Level", "Producers", "Bloom",
            "Herbivores", "Predators", "Scavengers", "Bioaccumulators", "Nutrients", "Habitat", "Migration", "Tick", "Location ID");
    private final DefaultTableModel geologyModel = model("Location", "Ring", "Level", "Stress", "Hydrothermal",
            "Mineral Exposure", "Instability", "Sediment", "Tick", "Location ID");
    private final DefaultTableModel resourceModel = model("Status", "Type", "Location", "Remaining", "Capacity",
            "Rate", "Richness", "Accessibility", "Renewable", "Recovery", "Extractions", "Last Harvest",
            "Dormant Until", "Discovered", "Updated", "Site ID");
    private final DefaultTableModel extractionModel = model("Tick", "Type", "Item", "Quantity", "Location",
            "Station", "Vessel", "Reserve Before", "Reserve After", "Richness Before", "Richness After",
            "Renewable", "Ecology Impact", "Geology Impact", "Credit Value", "Site ID", "Mission ID", "Freight Lot ID");
    private final DefaultTableModel eventModel = model("Tick", "Type", "Location", "Severity", "Summary", "Event ID");
    private final DefaultTableModel operationModel = model("Status", "Phase", "Attempt", "Materials", "Type",
            "Progress", "Difficulty", "Casualty", "Responder", "Responder Status", "Responder Location", "Origin",
            "Target Station", "Target Location", "Steel", "Fuel", "Ammo", "Medical", "Created", "Updated",
            "Outbound", "Arrived", "Return Started", "Responder Returned", "Completed", "Operation ID");
    private final DefaultTableModel transitLegModel = model("Status", "Leg", "Attempt", "Responder", "From", "To",
            "Route Ticks", "Started", "Arrived", "Completed", "Operation ID", "Leg ID");
    private final DefaultTableModel transitEncounterModel = model("Tick", "Leg", "Responder", "Hazard", "Challenge",
            "Roll", "Margin", "Outcome", "Narrative", "Operation ID", "Encounter ID");
    private final DefaultTableModel responseLogModel = model("Tick", "Operation Type", "Event", "Summary",
            "Operation ID", "Log ID");

    private final Timer refreshTimer = new Timer(2500, event -> refresh());
    private WorldPaths world;
    private Path lastDirectory;
    private AutoCloseable sessionSubscription;
    private boolean busy;

    public NaturalWorldAndFleetWindow() {
        super("Barotrauma Natural World, Resources, and Fleet Response Transit");
        setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
        setMinimumSize(new Dimension(1100, 700));
        setSize(1550, 900);
        setLocationByPlatform(true);
        setLayout(new BorderLayout(10, 10));
        try { setIconImage(graphicalAssets.loadIcon(AssetRole.VESSEL, 32, 32).getImage()); }
        catch (Exception ignored) { }

        JPanel header = new JPanel(new BorderLayout(12, 8));
        header.setBorder(BorderFactory.createEmptyBorder(12, 12, 0, 12));
        header.add(worldStatus, BorderLayout.WEST);
        header.add(operationStatus, BorderLayout.EAST);
        add(header, BorderLayout.NORTH);

        summary.setEditable(false);
        summary.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 13));
        summary.setText(schemaPrompt());

        JTabbedPane tabs = new JTabbedPane();
        tabs.addTab("Summary", assetIcon(AssetRole.STATION), new JScrollPane(summary));
        tabs.addTab("Ecology", assetIcon(AssetRole.FAUNA), scroll(ecologyModel));
        tabs.addTab("Geology", assetIcon(AssetRole.GEOLOGY), scroll(geologyModel));
        tabs.addTab("Resource Sites", assetIcon(AssetRole.GEOLOGY), scroll(resourceModel));
        tabs.addTab("Extraction Ledger", assetIcon(AssetRole.VESSEL), scroll(extractionModel));
        tabs.addTab("Natural Events", assetIcon(AssetRole.FAUNA), scroll(eventModel));
        tabs.addTab("Fleet Responses", assetIcon(AssetRole.VESSEL), scroll(operationModel));
        tabs.addTab("Response Transit", assetIcon(AssetRole.VESSEL), scroll(transitLegModel));
        tabs.addTab("Response Hazards", assetIcon(AssetRole.FAUNA), scroll(transitEncounterModel));
        tabs.addTab("Response Log", assetIcon(AssetRole.VESSEL), scroll(responseLogModel));
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
        setBusy(true, "Loading response routes, fleet, extraction, and natural-world evidence…");
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
        String assetSource = graphicalAssets.activeDonor()
                .map(candidate -> "Donor installation: " + candidate.installationRoot())
                .orElse("Packaged fallback PNGs");
        summary.setText("Passive fleet response transit, extraction, and natural-world registry\n"
                + "Database schema: " + WorldStorageContracts.DATABASE_SCHEMA_VERSION + "\n"
                + "Graphical asset source: " + assetSource + "\n"
                + "Locations with ecology: " + s.locations() + "\n"
                + "Active algal blooms: " + s.activeBlooms() + "\n"
                + "Predator migration zones: " + s.predatorMigrationZones() + "\n"
                + "Geological hotspots: " + s.geologicalHotspots() + "\n"
                + "Known resource sites: " + s.resourceSites() + "\n"
                + "Harvestable resource sites: " + s.harvestableSites() + "\n"
                + "Dormant renewable sites: " + s.dormantSites() + "\n"
                + "Depleted nonrenewable sites: " + s.depletedSites() + "\n"
                + "Extraction batches: " + s.extractionBatches() + "\n"
                + "Total extracted units: " + s.extractedUnits() + "\n"
                + "Active fleet responses: " + s.activeResponses() + "\n"
                + "Completed fleet responses: " + s.completedResponses() + "\n"
                + "Responders outbound: " + s.outboundResponses() + "\n"
                + "Responders on scene: " + s.onSceneResponses() + "\n"
                + "Responders returning or towing: " + s.returningResponses() + "\n"
                + "Response transit legs: " + s.transitLegs() + "\n"
                + "Response transit encounters: " + s.responseTransitEncounters() + "\n\n"
                + "Fleet responders now use the shared deterministic NPC transit engine. Recovery progress cannot "
                + "advance until the responder reaches the casualty or target station. Once materials are committed, "
                + "the responder undertakes a second return or towing leg; the casualty is restored only after that "
                + "leg reaches home. A failed leg returns the operation to the queue without charging materials twice.\n\n"
                + "Resource missions draw measured cargo from finite reserves. Mineral extraction changes exposure "
                + "and cave stability; biological harvesting reduces biomass and habitat integrity. Renewable sites "
                + "recover through dormancy, while depleted nonrenewable sites remain exhausted.\n");

        for (var row : snapshot.ecology()) ecologyModel.addRow(new Object[]{row.locationName(), row.ring(), row.level(),
                row.primaryProducers(), row.algalBloom(), row.herbivores(), row.predators(), row.scavengers(),
                row.bioaccumulators(), row.nutrients(), row.habitatIntegrity(), row.migrationPressure(), row.lastTick(), row.locationId()});
        for (var row : snapshot.geology()) geologyModel.addRow(new Object[]{row.locationName(), row.ring(), row.level(),
                row.tectonicStress(), row.hydrothermalActivity(), row.mineralExposure(), row.caveInstability(),
                row.sedimentFlux(), row.lastTick(), row.locationId()});
        for (var row : snapshot.resources()) resourceModel.addRow(new Object[]{row.status(), row.resourceType(),
                row.locationName(), row.remainingUnits(), row.carryingCapacity(), row.harvestRate(), row.richness(),
                row.accessibility(), row.renewable(), row.recoveryProgress(), row.extractionCount(),
                row.lastHarvestTick() == null ? "" : row.lastHarvestTick(),
                row.dormantUntilTick() == null ? "" : row.dormantUntilTick(), row.discoveredTick(),
                row.lastTick(), row.siteId()});
        for (var row : snapshot.extractions()) extractionModel.addRow(new Object[]{row.tickSequence(),
                row.resourceType(), row.itemId(), row.quantity(), row.locationName(), blank(row.stationName()),
                blank(row.vesselName()), row.remainingBefore(), row.remainingAfter(), row.richnessBefore(),
                row.richnessAfter(), row.renewable(), row.ecologicalImpact(), row.geologicalImpact(),
                row.creditsValue(), row.siteId(), row.missionId(), row.freightLotId()});
        for (var row : snapshot.events()) eventModel.addRow(new Object[]{row.tickSequence(), row.eventType(),
                row.locationName(), row.severity(), row.summary(), row.eventId()});
        for (var row : snapshot.operations()) operationModel.addRow(new Object[]{row.status(), row.responsePhase(),
                row.attemptNumber(), row.materialsCommitted(), row.operationType(), row.progress(), row.difficulty(),
                blank(row.distressedVessel()), blank(row.responderVessel()), blank(row.responderStatus()),
                blank(row.responderLocation()), blank(row.originStation()), blank(row.targetStation()),
                row.targetLocation(), row.spareParts(), row.fuel(), row.ammunition(), row.medical(), row.createdTick(),
                row.updatedTick(), nullable(row.outboundStartedTick()), nullable(row.arrivedTick()),
                nullable(row.returnStartedTick()), nullable(row.responderReturnedTick()), nullable(row.completedTick()),
                row.operationId()});
        for (var row : snapshot.transitLegs()) transitLegModel.addRow(new Object[]{row.status(), row.legType(),
                row.attemptNumber(), row.responderVessel(), row.startLocation(), row.endLocation(),
                row.routeTicksRequired(), row.startedTick(), nullable(row.arrivedTick()), nullable(row.completedTick()),
                row.operationId(), row.legId()});
        for (var row : snapshot.transitEncounters()) transitEncounterModel.addRow(new Object[]{row.tickSequence(),
                row.legId(), row.responderVessel(), row.hazardType(), row.challenge(), row.resolutionRoll(),
                row.margin(), row.outcome(), row.narrative(), row.operationId(), row.encounterId()});
        for (var row : snapshot.responseLogs()) responseLogModel.addRow(new Object[]{row.tickSequence(),
                row.operationType(), row.eventType(), row.summary(), row.operationId(), row.logId()});
        summary.setCaretPosition(0);
    }

    private Icon assetIcon(AssetRole role) {
        try { return graphicalAssets.loadIcon(role, 20, 20); }
        catch (Exception exception) { return null; }
    }

    private void clear() {
        for (DefaultTableModel model : new DefaultTableModel[]{ecologyModel, geologyModel, resourceModel,
                extractionModel, eventModel, operationModel, transitLegModel, transitEncounterModel, responseLogModel}) {
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
                + " world to inspect response transit, fleet recovery, resource extraction, and natural activity.\n";
    }

    private static String blank(String value) { return value == null ? "" : value; }
    private static Object nullable(Long value) { return value == null ? "" : value; }
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
