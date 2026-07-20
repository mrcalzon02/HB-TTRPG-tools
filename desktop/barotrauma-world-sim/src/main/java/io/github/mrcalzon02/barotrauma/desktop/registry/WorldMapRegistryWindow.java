package io.github.mrcalzon02.barotrauma.desktop.registry;

import io.github.mrcalzon02.barotrauma.desktop.imports.WebWorldImportApprovalWindow;
import io.github.mrcalzon02.barotrauma.desktop.session.DesktopWorldSession;
import io.github.mrcalzon02.barotrauma.persistence.PassiveWorldRegistry;
import io.github.mrcalzon02.barotrauma.persistence.PassiveWorldRegistry.EncounterRow;
import io.github.mrcalzon02.barotrauma.persistence.PassiveWorldRegistry.MissionRow;
import io.github.mrcalzon02.barotrauma.persistence.PassiveWorldRegistry.ResearchRow;
import io.github.mrcalzon02.barotrauma.persistence.PassiveWorldRegistry.VesselRow;
import io.github.mrcalzon02.barotrauma.persistence.PassiveWorldRegistry.VoyageLogRow;
import io.github.mrcalzon02.barotrauma.persistence.WorldMapRegistry;
import io.github.mrcalzon02.barotrauma.persistence.WorldMapRegistry.ComponentVersionRow;
import io.github.mrcalzon02.barotrauma.persistence.WorldMapRegistry.LocationRow;
import io.github.mrcalzon02.barotrauma.persistence.WorldMapRegistry.StationRow;
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
import javax.swing.JSpinner;
import javax.swing.JSplitPane;
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
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.ExecutionException;

/** Normalized Europa registry and live passive-world observation console. */
public final class WorldMapRegistryWindow extends JFrame {
    private final DesktopWorldSession session = DesktopWorldSession.global();
    private final JButton openWorldButton = new JButton("Open World");
    private final JButton refreshButton = new JButton("Refresh");
    private final JButton importButton = new JButton("Open Version-22 Import");
    private final JButton enablePassiveButton = new JButton("Enable Passive Mode");
    private final JButton disablePassiveButton = new JButton("Disable Passive Mode");
    private final JSpinner cadenceSeconds = new JSpinner(new SpinnerNumberModel(5, 1, 3600, 1));
    private final JSpinner ticksPerCycle = new JSpinner(new SpinnerNumberModel(1, 1, 1000, 1));
    private final JLabel worldStatus = new JLabel("No desktop world open");
    private final JLabel passiveStatus = new JLabel("Passive mode unavailable");
    private final JLabel operationStatus = new JLabel("Ready");
    private final JTextArea summary = textArea();
    private final JTextArea voyageLog = textArea();

    private final DefaultTableModel locationModel = model(
            "Ring", "Level", "Station", "Name", "Type", "Source ID", "X", "Y", "Biome", "Faction", "Location ID");
    private final DefaultTableModel normalizedStationModel = model(
            "Ring", "Level", "Name", "Type", "Faction", "Economy", "Source ID", "Location Source ID", "Station ID");
    private final DefaultTableModel componentModel = model("Component", "Version");
    private final DefaultTableModel familyModel = model("Imported State Family");
    private final DefaultTableModel passiveStationModel = model(
            "Status", "Name", "Ring", "Level", "Credits", "Supplies", "Ore", "Industry", "Security",
            "Integrity", "Threat", "Research", "Last Tick", "Station ID");
    private final DefaultTableModel vesselModel = model(
            "Status", "Vessel", "Role", "Hull", "Supplies", "Cargo", "Current", "Destination", "Mission",
            "Mission Status", "Progress", "Route", "Incidents", "Revised ETA", "Next Incident", "Crew", "Nav",
            "Eng", "Combat", "Mining", "Research", "Last Tick", "Vessel ID");
    private final DefaultTableModel missionModel = model(
            "Status", "Type", "Origin", "Target", "Vessel", "Difficulty", "Reward", "Cargo", "Progress",
            "Created", "Updated", "Completed", "Mission ID");
    private final DefaultTableModel researchModel = model(
            "Status", "Station", "Topic", "Progress", "Target", "Created", "Updated", "Completed", "Project ID");
    private final DefaultTableModel encounterModel = model(
            "Tick", "Time", "Vessel", "Hazard", "Challenge", "Roll", "Margin", "Outcome", "Narrative", "Encounter ID");

    private final JTable locationTable = table(locationModel);
    private final JTable normalizedStationTable = table(normalizedStationModel);
    private final JTable componentTable = table(componentModel);
    private final JTable familyTable = table(familyModel);
    private final JTable passiveStationTable = table(passiveStationModel);
    private final JTable vesselTable = table(vesselModel);
    private final JTable missionTable = table(missionModel);
    private final JTable researchTable = table(researchModel);
    private final JTable encounterTable = table(encounterModel);
    private final Timer refreshTimer = new Timer(2000, event -> refreshRegistry());

    private WorldPaths world;
    private Path lastDirectory;
    private AutoCloseable sessionSubscription;
    private AutoCloseable passiveSubscription;
    private PassiveWorldRegistry.Snapshot passiveSnapshot;
    private UUID selectedVesselId;
    private boolean busy;

    public WorldMapRegistryWindow() {
        super("Barotrauma Europa World Map and Passive Simulation");
        setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
        setMinimumSize(new Dimension(1150, 720));
        setSize(1550, 920);
        setLocationByPlatform(true);
        setLayout(new BorderLayout(10, 10));

        JPanel header = new JPanel(new BorderLayout(12, 8));
        header.setBorder(BorderFactory.createEmptyBorder(12, 12, 0, 12));
        JPanel state = new JPanel(new BorderLayout(4, 4));
        state.add(worldStatus, BorderLayout.NORTH);
        state.add(passiveStatus, BorderLayout.SOUTH);
        header.add(state, BorderLayout.WEST);
        header.add(operationStatus, BorderLayout.EAST);
        add(header, BorderLayout.NORTH);

        summary.setText("Open a desktop world to inspect normalized and passive master-world state.\n");
        voyageLog.setText("Select an NPC vessel to watch its voyage log update.\n");

        JTabbedPane tabs = new JTabbedPane();
        tabs.addTab("World Summary", new JScrollPane(summary));
        tabs.addTab("Locations", new JScrollPane(locationTable));
        tabs.addTab("Normalized Stations", new JScrollPane(normalizedStationTable));
        tabs.addTab("Station Economy", new JScrollPane(passiveStationTable));
        tabs.addTab("NPC Voyages", buildVoyagePanel());
        tabs.addTab("Missions and Routes", new JScrollPane(missionTable));
        tabs.addTab("Research", new JScrollPane(researchTable));
        tabs.addTab("Encounters", new JScrollPane(encounterTable));
        tabs.addTab("Component Versions", new JScrollPane(componentTable));
        tabs.addTab("State Families", new JScrollPane(familyTable));
        tabs.setBorder(BorderFactory.createEmptyBorder(0, 12, 0, 12));
        add(tabs, BorderLayout.CENTER);

        JPanel passiveControls = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 0));
        passiveControls.add(new JLabel("Cadence seconds:"));
        passiveControls.add(cadenceSeconds);
        passiveControls.add(new JLabel("Ticks per cycle:"));
        passiveControls.add(ticksPerCycle);
        passiveControls.add(enablePassiveButton);
        passiveControls.add(disablePassiveButton);

        JPanel worldControls = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 0));
        worldControls.add(openWorldButton);
        worldControls.add(refreshButton);
        worldControls.add(importButton);

        JPanel footer = new JPanel(new BorderLayout(8, 8));
        footer.setBorder(BorderFactory.createEmptyBorder(0, 12, 12, 12));
        footer.add(passiveControls, BorderLayout.NORTH);
        footer.add(worldControls, BorderLayout.SOUTH);
        add(footer, BorderLayout.SOUTH);

        refreshButton.setEnabled(false);
        openWorldButton.addActionListener(event -> openWorld());
        refreshButton.addActionListener(event -> refreshRegistry());
        enablePassiveButton.addActionListener(event -> enablePassiveMode());
        disablePassiveButton.addActionListener(event -> disablePassiveMode());
        importButton.addActionListener(event -> {
            WebWorldImportApprovalWindow window = new WebWorldImportApprovalWindow();
            window.setLocationRelativeTo(this);
            window.setVisible(true);
        });
        vesselTable.getSelectionModel().addListSelectionListener(event -> {
            if (event.getValueIsAdjusting()) return;
            int viewRow = vesselTable.getSelectedRow();
            if (viewRow < 0) return;
            int row = vesselTable.convertRowIndexToModel(viewRow);
            Object value = vesselModel.getValueAt(row, vesselModel.getColumnCount() - 1);
            selectedVesselId = value instanceof UUID id ? id : UUID.fromString(value.toString());
            renderSelectedVoyage();
        });
        sessionSubscription = session.addListener(this::activateSharedWorld, true);
        refreshTimer.setRepeats(true);
        refreshTimer.start();
        refreshControls();
    }

    private JSplitPane buildVoyagePanel() {
        JScrollPane vessels = new JScrollPane(vesselTable);
        JScrollPane logs = new JScrollPane(voyageLog);
        JSplitPane split = new JSplitPane(JSplitPane.VERTICAL_SPLIT, vessels, logs);
        split.setResizeWeight(0.58);
        split.setDividerLocation(380);
        return split;
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
        detachPassiveListener();
        world = sharedWorld;
        passiveSnapshot = null;
        selectedVesselId = null;
        clearTables();
        if (sharedWorld == null) {
            worldStatus.setText("No desktop world open");
            passiveStatus.setText("Passive mode unavailable");
            summary.setText("Open a desktop world to inspect normalized and passive master-world state.\n");
            voyageLog.setText("Select an NPC vessel to watch its voyage log update.\n");
            refreshControls();
            return;
        }
        lastDirectory = sharedWorld.root().getParent();
        worldStatus.setText("Shared world: " + sharedWorld.root());
        setBusy(true, "Checking passive world runtime…");
        new SwingWorker<PassiveWorldSimulationService, Void>() {
            @Override protected PassiveWorldSimulationService doInBackground() throws Exception {
                return PassiveWorldSimulationService.resumeIfEnabled(sharedWorld);
            }
            @Override protected void done() {
                try {
                    PassiveWorldSimulationService service = get();
                    attachPassiveListener(service);
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    showFailure("Passive mode resume interrupted", exception);
                } catch (ExecutionException exception) {
                    showFailure("Passive mode resume failed", cause(exception));
                } finally {
                    setBusy(false, "World ready");
                    refreshRegistry();
                }
            }
        }.execute();
    }

    private void enablePassiveMode() {
        WorldPaths selectedWorld = world;
        if (selectedWorld == null || busy) return;
        int cadence = ((Number) cadenceSeconds.getValue()).intValue();
        int ticks = ((Number) ticksPerCycle.getValue()).intValue();
        setBusy(true, "Enabling passive world simulation…");
        new SwingWorker<PassiveWorldSimulationService, Void>() {
            @Override protected PassiveWorldSimulationService doInBackground() throws Exception {
                return PassiveWorldSimulationService.enable(selectedWorld, Duration.ofSeconds(cadence), ticks);
            }
            @Override protected void done() {
                try {
                    PassiveWorldSimulationService service = get();
                    attachPassiveListener(service);
                    operationStatus.setText("Passive world simulation enabled");
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    showFailure("Passive mode enable interrupted", exception);
                } catch (ExecutionException exception) {
                    showFailure("Passive mode enable failed", cause(exception));
                } finally {
                    setBusy(false, operationStatus.getText());
                    refreshRegistry();
                }
            }
        }.execute();
    }

    private void disablePassiveMode() {
        WorldPaths selectedWorld = world;
        if (selectedWorld == null || busy) return;
        setBusy(true, "Disabling passive world simulation…");
        new SwingWorker<Void, Void>() {
            @Override protected Void doInBackground() throws Exception {
                PassiveWorldSimulationService.disable(selectedWorld);
                return null;
            }
            @Override protected void done() {
                try {
                    get();
                    detachPassiveListener();
                    operationStatus.setText("Passive world simulation disabled");
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    showFailure("Passive mode disable interrupted", exception);
                } catch (ExecutionException exception) {
                    showFailure("Passive mode disable failed", cause(exception));
                } finally {
                    setBusy(false, operationStatus.getText());
                    refreshRegistry();
                }
            }
        }.execute();
    }

    private void attachPassiveListener(PassiveWorldSimulationService service) {
        detachPassiveListener();
        if (service == null) return;
        passiveSubscription = service.addListener(status -> SwingUtilities.invokeLater(() -> {
            if (world == null || !world.equals(status.world())) return;
            updateRuntimeStatus(status);
            if (!busy && status.lastResult() != null) refreshRegistry();
        }), true);
    }

    private void detachPassiveListener() {
        if (passiveSubscription == null) return;
        try { passiveSubscription.close(); } catch (Exception ignored) { }
        passiveSubscription = null;
    }

    private void updateRuntimeStatus(PassiveWorldSimulationService.Status status) {
        if (status.fault() != null) {
            passiveStatus.setText("PASSIVE FAULT: " + status.fault().getMessage());
        } else if (status.running()) {
            String cycle = status.cycleRunning() ? " · resolving cycle" : "";
            passiveStatus.setText("PASSIVE ON · every " + status.cadence().toSeconds() + "s · "
                    + status.ticksPerCycle() + " tick(s)" + cycle);
        } else {
            passiveStatus.setText("Passive mode disabled");
        }
        refreshControls();
    }

    private void refreshRegistry() {
        WorldPaths selectedWorld = world;
        if (selectedWorld == null || busy) return;
        setBusy(true, "Loading world and passive simulation state…");
        new SwingWorker<Loaded, Void>() {
            @Override protected Loaded doInBackground() throws Exception {
                return new Loaded(WorldMapRegistry.load(selectedWorld), PassiveWorldRegistry.load(selectedWorld));
            }
            @Override protected void done() {
                try {
                    Loaded loaded = get();
                    if (!selectedWorld.equals(world)) return;
                    populate(loaded.world(), loaded.passive());
                    operationStatus.setText("World map and passive simulation state loaded");
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    showFailure("World map refresh interrupted", exception);
                } catch (ExecutionException exception) {
                    showFailure("World map refresh failed", cause(exception));
                } finally {
                    setBusy(false, operationStatus.getText());
                }
            }
        }.execute();
    }

    private void populate(WorldMapRegistry.RegistrySnapshot registry, PassiveWorldRegistry.Snapshot passive) {
        clearTables();
        passiveSnapshot = passive;
        summary.setText(renderSummary(registry, passive));
        summary.setCaretPosition(0);
        for (LocationRow location : registry.locations()) {
            locationModel.addRow(new Object[]{location.ring(), location.locationLevel(),
                    location.station() ? "Station" : "", blank(location.displayName()),
                    blank(location.locationType()), location.sourceLocationId(), nullable(location.mapX()),
                    nullable(location.mapY()), blank(location.biome()), blank(location.faction()),
                    location.locationId()});
        }
        for (StationRow station : registry.stations()) {
            normalizedStationModel.addRow(new Object[]{station.ring(), station.locationLevel(),
                    blank(station.displayName()), blank(station.stationType()), blank(station.faction()),
                    station.economyPresent() ? "Present" : "Not recorded", station.sourceStationId(),
                    station.sourceLocationId(), station.stationId()});
        }
        for (ComponentVersionRow component : registry.componentVersions()) {
            componentModel.addRow(new Object[]{component.componentKey(), component.componentVersion()});
        }
        for (String family : registry.stateFamilies()) familyModel.addRow(new Object[]{family});
        for (PassiveWorldRegistry.StationRow station : passive.stations()) {
            passiveStationModel.addRow(new Object[]{station.status(), station.name(), station.ring(), station.level(),
                    station.credits(), station.supplies(), station.ore(), station.industry(), station.security(),
                    station.integrity(), station.threat(), station.research(), station.lastTick(), station.stationId()});
        }
        for (VesselRow vessel : passive.vessels()) {
            vesselModel.addRow(new Object[]{vessel.status(), vessel.name(), vessel.role(), vessel.hull(),
                    vessel.supplies(), vessel.cargo(), blank(vessel.currentLocation()),
                    blank(vessel.destinationLocation()), blank(vessel.missionType()),
                    blank(vessel.missionStatus()), nullable(vessel.missionProgress()),
                    vessel.routeProgress() + "/" + vessel.routeTicksRequired(), incidentProgress(vessel),
                    nullable(vessel.scheduledArrivalTick()),
                    nullable(vessel.nextIncidentTick()), vessel.crewQuality(), vessel.navigation(),
                    vessel.engineering(), vessel.combat(), vessel.mining(), vessel.research(), vessel.lastTick(),
                    vessel.vesselId()});
        }
        for (MissionRow mission : passive.missions()) {
            missionModel.addRow(new Object[]{mission.status(), mission.type(), blank(mission.origin()),
                    mission.target(), blank(mission.vessel()), mission.difficulty(), mission.rewardCredits(),
                    mission.cargoUnits(), mission.progress(), mission.createdTick(), mission.updatedTick(),
                    nullable(mission.completedTick()), mission.missionId()});
        }
        for (ResearchRow project : passive.research()) {
            researchModel.addRow(new Object[]{project.status(), project.stationName(), project.topic(),
                    project.progress(), project.target(), project.createdTick(), project.updatedTick(),
                    nullable(project.completedTick()), project.projectId()});
        }
        for (EncounterRow encounter : passive.encounters()) {
            encounterModel.addRow(new Object[]{encounter.tickSequence(), encounter.canonicalTime(),
                    encounter.vesselName(), encounter.hazardType(), encounter.challenge(), encounter.roll(),
                    encounter.margin(), encounter.outcome(), encounter.narrative(), encounter.encounterId()});
        }
        if (selectedVesselId == null && !passive.vessels().isEmpty()) {
            selectedVesselId = passive.vessels().get(0).vesselId();
        }
        selectPinnedVessel();
        renderSelectedVoyage();
        PassiveWorldSimulationService active = PassiveWorldSimulationService.active(world);
        if (active != null) updateRuntimeStatus(active.status());
        else passiveStatus.setText(passive.configuration().enabled()
                ? "Passive mode configured; runtime resuming" : "Passive mode disabled");
        cadenceSeconds.setValue(passive.configuration().cadenceSeconds());
        ticksPerCycle.setValue(passive.configuration().ticksPerCycle());
    }

    private void selectPinnedVessel() {
        if (selectedVesselId == null) return;
        for (int modelRow = 0; modelRow < vesselModel.getRowCount(); modelRow++) {
            Object id = vesselModel.getValueAt(modelRow, vesselModel.getColumnCount() - 1);
            if (selectedVesselId.equals(id)) {
                int view = vesselTable.convertRowIndexToView(modelRow);
                if (view >= 0) vesselTable.getSelectionModel().setSelectionInterval(view, view);
                return;
            }
        }
    }

    private void renderSelectedVoyage() {
        PassiveWorldRegistry.Snapshot current = passiveSnapshot;
        if (current == null || selectedVesselId == null) {
            voyageLog.setText("Select an NPC vessel to watch its voyage log update.\n");
            return;
        }
        VesselRow vessel = current.vessels().stream()
                .filter(row -> row.vesselId().equals(selectedVesselId)).findFirst().orElse(null);
        StringBuilder text = new StringBuilder();
        if (vessel != null) {
            text.append(vessel.name()).append(" · ").append(vessel.role()).append(" · ")
                    .append(vessel.status()).append('\n')
                    .append("Hull ").append(vessel.hull()).append("% · Supplies ").append(vessel.supplies())
                    .append(" · Cargo ").append(vessel.cargo()).append('\n')
                    .append("Current: ").append(blank(vessel.currentLocation()))
                    .append(" · Destination: ").append(blank(vessel.destinationLocation())).append('\n')
                    .append("Route: ").append(vessel.routeProgress()).append('/')
                    .append(vessel.routeTicksRequired()).append(" elapsed ticks · ")
                    .append(Math.max(0, vessel.routeTicksRequired() - vessel.routeProgress()))
                    .append(" remaining · last update tick ").append(vessel.lastTick()).append('\n')
                    .append("Incidents: ").append(incidentProgress(vessel))
                    .append(" · next at tick ").append(nullable(vessel.nextIncidentTick())).append('\n')
                    .append("Arrival estimate: base ").append(nullable(vessel.baseArrivalTick()))
                    .append(" · revised ").append(nullable(vessel.scheduledArrivalTick()))
                    .append(" · accumulated delay ").append(nullable(vessel.cumulativeDelayTicks())).append('\n')
                    .append("Mission: ").append(blank(vessel.missionType())).append(" · ")
                    .append(blank(vessel.missionStatus())).append(" · ")
                    .append(nullable(vessel.missionProgress())).append("%\n\n");
        }
        boolean found = false;
        for (VoyageLogRow logRow : current.voyageLogs()) {
            if (!logRow.vesselId().equals(selectedVesselId)) continue;
            found = true;
            text.append("[").append(logRow.canonicalTime()).append(" · tick ")
                    .append(logRow.tickSequence()).append("] ")
                    .append(logRow.eventType()).append(" · severity ").append(logRow.severity()).append('\n')
                    .append(logRow.summary()).append('\n')
                    .append(logRow.details()).append('\n')
                    .append("Resolution: ").append(logRow.resolution())
                    .append(" · hull ").append(signed(logRow.hullDelta()))
                    .append(" · supplies ").append(signed(logRow.suppliesDelta()))
                    .append(" · station ").append(signed(logRow.stationDelta())).append("\n\n");
        }
        if (!found) text.append("No voyage events recorded yet. The vessel may still be docked.\n");
        voyageLog.setText(text.toString());
        voyageLog.setCaretPosition(0);
    }

    private static String renderSummary(WorldMapRegistry.RegistrySnapshot world,
                                        PassiveWorldRegistry.Snapshot passive) {
        WorldMapRegistry.WorldSummary summary = world.summary();
        PassiveWorldRegistry.Configuration config = passive.configuration();
        return "Europa world and passive simulation\n"
                + "Desktop world: " + summary.displayName() + "\n"
                + "Master world: " + value(summary.masterWorldId()) + "\n"
                + "Canonical time: " + value(config.canonicalTime()) + "\n"
                + "Current tick: " + value(config.currentTickSequence()) + "\n"
                + "Passive enabled: " + config.enabled() + "\n"
                + "Cadence / ticks: " + config.cadenceSeconds() + "s / " + config.ticksPerCycle() + "\n"
                + "Last passive cycle: " + value(config.lastCycleAt()) + " · tick "
                + value(config.lastCycleTick()) + "\n\n"
                + "Normalized locations: " + world.locations().size() + "\n"
                + "Normalized stations: " + world.stations().size() + "\n"
                + "Simulated stations: " + passive.stations().size() + "\n"
                + "NPC vessels: " + passive.vessels().size() + "\n"
                + "Open/recorded missions: " + passive.missions().size() + "\n"
                + "Voyage log records: " + passive.voyageLogs().size() + "\n"
                + "Transit encounters: " + passive.encounters().size() + "\n"
                + "Research projects: " + passive.research().size() + "\n\n"
                + "Stations rise, stabilize, strain, become besieged, or fall according to supplies, industry, "
                + "security, integrity, and threat. NPC vessels answer with trade, mining, fauna-clearing, "
                + "defense, research, salvage, and transit missions resolved by the shared player transit engine.\n";
    }

    private static String incidentProgress(VesselRow vessel) {
        return vessel.plannedIncidents() == null ? "—"
                : nullable(vessel.incidentsResolved()) + "/" + vessel.plannedIncidents();
    }

    private void setBusy(boolean value, String message) {
        busy = value;
        operationStatus.setText(message);
        refreshControls();
    }

    private void refreshControls() {
        boolean hasWorld = world != null;
        PassiveWorldSimulationService active = PassiveWorldSimulationService.active(world);
        boolean running = active != null && active.status().running() && active.status().fault() == null;
        openWorldButton.setEnabled(!busy);
        refreshButton.setEnabled(!busy && hasWorld);
        importButton.setEnabled(!busy);
        cadenceSeconds.setEnabled(!busy && hasWorld && !running);
        ticksPerCycle.setEnabled(!busy && hasWorld && !running);
        enablePassiveButton.setEnabled(!busy && hasWorld && !running);
        disablePassiveButton.setEnabled(!busy && hasWorld && running);
    }

    private void clearTables() {
        for (DefaultTableModel model : new DefaultTableModel[]{locationModel, normalizedStationModel,
                componentModel, familyModel, passiveStationModel, vesselModel, missionModel,
                researchModel, encounterModel}) model.setRowCount(0);
    }

    private void showFailure(String title, Throwable throwable) {
        operationStatus.setText(title);
        summary.append("\n" + title + "\n" + throwable.getClass().getSimpleName() + ": "
                + throwable.getMessage() + "\n");
        JOptionPane.showMessageDialog(this, throwable.getMessage(), title, JOptionPane.ERROR_MESSAGE);
    }

    @Override
    public void dispose() {
        refreshTimer.stop();
        detachPassiveListener();
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

    private static JTextArea textArea() {
        JTextArea area = new JTextArea();
        area.setEditable(false);
        area.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 13));
        area.setLineWrap(false);
        return area;
    }

    private static String blank(String value) { return value == null ? "" : value; }
    private static Object nullable(Object value) { return value == null ? "" : value; }
    private static String value(Object value) { return value == null ? "not declared" : value.toString(); }
    private static String signed(int value) { return value > 0 ? "+" + value : Integer.toString(value); }
    private static Throwable cause(ExecutionException exception) {
        return exception.getCause() == null ? exception : exception.getCause();
    }

    private record Loaded(WorldMapRegistry.RegistrySnapshot world, PassiveWorldRegistry.Snapshot passive) { }

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
