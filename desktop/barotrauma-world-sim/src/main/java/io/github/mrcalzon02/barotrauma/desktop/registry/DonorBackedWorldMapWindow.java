package io.github.mrcalzon02.barotrauma.desktop.registry;

import io.github.mrcalzon02.barotrauma.assets.BarotraumaAssetCatalogue;
import io.github.mrcalzon02.barotrauma.assets.BarotraumaAssetCatalogue.VisualRole;
import io.github.mrcalzon02.barotrauma.desktop.assets.DonorAssetSetupWindow;
import io.github.mrcalzon02.barotrauma.desktop.session.DesktopWorldSession;
import io.github.mrcalzon02.barotrauma.observation.ObservationRegistry.SnapshotRow;
import io.github.mrcalzon02.barotrauma.persistence.NaturalWorldAndFleetRegistry;
import io.github.mrcalzon02.barotrauma.persistence.PassiveWorldRegistry;
import io.github.mrcalzon02.barotrauma.persistence.WorldMapRegistry;
import io.github.mrcalzon02.barotrauma.persistence.WorldMapRegistry.LocationRow;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;
import io.github.mrcalzon02.barotrauma.simulation.ManualWorldStepService;
import io.github.mrcalzon02.barotrauma.simulation.PassiveWorldSimulationService;

import javax.swing.BorderFactory;
import javax.swing.DefaultListCellRenderer;
import javax.swing.DefaultListModel;
import javax.swing.JButton;
import javax.swing.JComboBox;
import javax.swing.JFileChooser;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JList;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JSpinner;
import javax.swing.JSplitPane;
import javax.swing.JTextArea;
import javax.swing.JToggleButton;
import javax.swing.ListSelectionModel;
import javax.swing.SpinnerNumberModel;
import javax.swing.SwingUtilities;
import javax.swing.SwingWorker;
import javax.swing.Timer;
import javax.swing.UIManager;
import javax.swing.WindowConstants;
import java.awt.AlphaComposite;
import java.awt.BasicStroke;
import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Component;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Font;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.Point;
import java.awt.Rectangle;
import java.awt.RenderingHints;
import java.awt.Shape;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.awt.geom.Line2D;
import java.awt.image.BufferedImage;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.function.Consumer;

/**
 * Living graphical Europa observer using local Barotrauma textures or independent procedural fallbacks.
 *
 * <p>The window is coupled to the authoritative desktop world. It resumes an already-enabled Passive Mode
 * scheduler, can explicitly run, pause, or manually step that scheduler authority, renders in-transit NPC
 * vessels at committed route progress, and keeps a clicked vessel, route, station, location, timeline record,
 * or historical evidence snapshot pinned in the evidence inspector. Environmental and civilization layers
 * are read-only projections of committed simulation and observation evidence.</p>
 */
public final class DonorBackedWorldMapWindow extends JFrame {
    private static final int TIMELINE_VISIBLE_LIMIT = 140;
    private static final String[] TIMELINE_CATEGORIES = {
            "ALL", "VOYAGE", "ENCOUNTER", "MISSION", "FLEET_RESPONSE", "FREIGHT", "ECONOMY",
            "NATURAL", "EXTRACTION", "CIVILIZATION", "POPULATION", "MIGRATION", "SETTLEMENT"
    };

    private final DesktopWorldSession session = DesktopWorldSession.global();
    private final BarotraumaAssetCatalogue assets = new BarotraumaAssetCatalogue();
    private final JLabel worldStatus = new JLabel("No desktop world open");
    private final JLabel passiveStatus = new JLabel("Passive mode unavailable");
    private final JLabel viewStatus = new JLabel("NO WORLD");
    private final JLabel assetStatus = new JLabel("Visual catalogue ready");
    private final JButton openWorldButton = new JButton("Open World");
    private final JButton refreshButton = new JButton("Refresh");
    private final JButton configureAssetsButton = new JButton("Configure Assets");
    private final JButton enablePassiveButton = new JButton("Run Passive");
    private final JButton disablePassiveButton = new JButton("Pause Passive");
    private final JButton manualStepButton = new JButton("Step Once");
    private final JButton worldOverviewButton = new JButton("World Overview");
    private final JButton zoomInButton = new JButton("Zoom +");
    private final JButton zoomOutButton = new JButton("Zoom -");
    private final JButton fitMapButton = new JButton("Fit World");
    private final JToggleButton freezeViewButton = new JToggleButton("Freeze View");
    private final JToggleButton ecologyLayerButton = new JToggleButton("Ecology");
    private final JToggleButton geologyLayerButton = new JToggleButton("Geology");
    private final JToggleButton resourceLayerButton = new JToggleButton("Resources");
    private final JToggleButton fleetLayerButton = new JToggleButton("Fleet response", true);
    private final JToggleButton incidentLayerButton = new JToggleButton("Incidents", true);
    private final JToggleButton populationLayerButton = new JToggleButton("Population");
    private final JToggleButton migrationLayerButton = new JToggleButton("Migration", true);
    private final JToggleButton settlementLayerButton = new JToggleButton("Settlement");
    private final JToggleButton factionLayerButton = new JToggleButton("Factions");
    private final JToggleButton creatureLayerButton = new JToggleButton("Creatures", true);
    private final JSpinner cadenceSeconds = new JSpinner(new SpinnerNumberModel(5, 1, 3600, 1));
    private final JSpinner ticksPerCycle = new JSpinner(new SpinnerNumberModel(1, 1, 1000, 1));
    private final JComboBox<String> timelineCategory = new JComboBox<>(TIMELINE_CATEGORIES);
    private final JSpinner timelineMinimumSeverity = new JSpinner(new SpinnerNumberModel(0, 0, 100, 5));
    private final JComboBox<String> historySnapshot = new JComboBox<>();
    private final JButton inspectHistoryButton = new JButton("Inspect Snapshot");
    private final JButton compareHistoryButton = new JButton("Compare Previous");
    private final JButton returnEvidenceButton = new JButton("Return to Live Dossier");
    private final JTextArea details = new JTextArea();
    private final DefaultListModel<WorldObserverTimeline.Entry> timelineModel = new DefaultListModel<>();
    private final JList<WorldObserverTimeline.Entry> timelineList = new JList<>(timelineModel);
    private final EuropaMapCanvas canvas = new EuropaMapCanvas(assets);
    private final JScrollPane mapScroll = new JScrollPane(canvas);
    private final Timer refreshTimer = new Timer(2000, event -> refresh());

    private WorldPaths world;
    private Path lastDirectory;
    private AutoCloseable subscription;
    private AutoCloseable passiveSubscription;
    private LoadedMap lastLoaded;
    private Selection selection = Selection.world();
    private WorldObserverNavigation.Target recordTarget;
    private String selectedTimelineKey;
    private List<SnapshotRow> historyRows = List.of();
    private String historicalSnapshotId;
    private boolean historicalComparison;
    private boolean suppressTimelineSelection;
    private boolean passiveControlsInitialized;
    private boolean viewFrozen;
    private boolean busy;

    public DonorBackedWorldMapWindow() {
        super("Barotrauma Living World Observer");
        setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
        setMinimumSize(new Dimension(1080, 720));
        setSize(1500, 920);
        setLocationByPlatform(true);
        setLayout(new BorderLayout(10, 10));

        JPanel header = new JPanel(new BorderLayout(12, 6));
        header.setBorder(BorderFactory.createEmptyBorder(10, 12, 0, 12));
        JPanel state = new JPanel(new BorderLayout(4, 4));
        state.add(worldStatus, BorderLayout.NORTH);
        state.add(passiveStatus, BorderLayout.SOUTH);
        header.add(state, BorderLayout.WEST);
        header.add(viewStatus, BorderLayout.CENTER);
        header.add(assetStatus, BorderLayout.EAST);
        add(header, BorderLayout.NORTH);

        details.setEditable(false);
        details.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 12));
        details.setLineWrap(true);
        details.setWrapStyleWord(true);
        details.setText("Open a normalized desktop world to begin passive observation.\n");

        timelineList.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        timelineList.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 11));
        timelineList.setCellRenderer(new DefaultListCellRenderer() {
            @Override public Component getListCellRendererComponent(JList<?> list, Object value, int index,
                                                                    boolean selectedCell, boolean focusedCell) {
                super.getListCellRendererComponent(list, value, index, selectedCell, focusedCell);
                if (value instanceof WorldObserverTimeline.Entry entry) {
                    setText("[" + entry.tick() + "] " + entry.category() + " · " + entry.label()
                            + " — " + entry.title() + " · sev " + entry.severity());
                    setToolTipText(entry.summary() + " · " + entry.details());
                }
                return this;
            }
        });
        timelineList.addListSelectionListener(event -> {
            if (event.getValueIsAdjusting() || suppressTimelineSelection) return;
            navigateTimeline(timelineList.getSelectedValue());
        });
        timelineCategory.addActionListener(event -> {
            if (lastLoaded != null) refreshTimeline(lastLoaded);
        });
        timelineMinimumSeverity.addChangeListener(event -> {
            if (lastLoaded != null) refreshTimeline(lastLoaded);
        });

        mapScroll.getVerticalScrollBar().setUnitIncrement(24);
        mapScroll.getHorizontalScrollBar().setUnitIncrement(24);
        JScrollPane detailsScroll = new JScrollPane(details);
        JPanel evidencePanel = new JPanel(new BorderLayout(4, 4));
        JPanel historyControls = new JPanel(new FlowLayout(FlowLayout.LEFT, 5, 0));
        historyControls.add(new JLabel("History:"));
        historySnapshot.setPreferredSize(new Dimension(210, historySnapshot.getPreferredSize().height));
        historyControls.add(historySnapshot);
        historyControls.add(inspectHistoryButton);
        historyControls.add(compareHistoryButton);
        historyControls.add(returnEvidenceButton);
        evidencePanel.add(historyControls, BorderLayout.NORTH);
        evidencePanel.add(detailsScroll, BorderLayout.CENTER);

        JPanel timelinePanel = new JPanel(new BorderLayout(4, 4));
        timelinePanel.setBorder(BorderFactory.createTitledBorder("Recent committed world timeline"));
        JPanel timelineControls = new JPanel(new FlowLayout(FlowLayout.LEFT, 6, 0));
        timelineControls.add(new JLabel("Category:"));
        timelineControls.add(timelineCategory);
        timelineControls.add(new JLabel("Min severity:"));
        timelineControls.add(timelineMinimumSeverity);
        timelinePanel.add(timelineControls, BorderLayout.NORTH);
        timelinePanel.add(new JScrollPane(timelineList), BorderLayout.CENTER);
        JSplitPane evidenceSplit = new JSplitPane(JSplitPane.VERTICAL_SPLIT, evidencePanel, timelinePanel);
        evidenceSplit.setDividerLocation(500);
        evidenceSplit.setResizeWeight(0.68);
        evidenceSplit.setPreferredSize(new Dimension(500, 700));

        JSplitPane split = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT, mapScroll, evidenceSplit);
        split.setDividerLocation(990);
        split.setResizeWeight(0.70);
        add(split, BorderLayout.CENTER);

        JPanel simulationControls = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 0));
        simulationControls.add(new JLabel("Cadence seconds:"));
        simulationControls.add(cadenceSeconds);
        simulationControls.add(new JLabel("Ticks / cycle or step:"));
        simulationControls.add(ticksPerCycle);
        simulationControls.add(enablePassiveButton);
        simulationControls.add(disablePassiveButton);
        simulationControls.add(manualStepButton);

        JPanel layerControls = new JPanel(new FlowLayout(FlowLayout.LEFT, 6, 0));
        layerControls.add(new JLabel("Layers:"));
        layerControls.add(ecologyLayerButton);
        layerControls.add(geologyLayerButton);
        layerControls.add(resourceLayerButton);
        layerControls.add(fleetLayerButton);
        layerControls.add(incidentLayerButton);
        layerControls.add(populationLayerButton);
        layerControls.add(migrationLayerButton);
        layerControls.add(settlementLayerButton);
        layerControls.add(factionLayerButton);
        layerControls.add(creatureLayerButton);

        JPanel viewControls = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 0));
        viewControls.add(openWorldButton);
        viewControls.add(refreshButton);
        viewControls.add(worldOverviewButton);
        viewControls.add(freezeViewButton);
        viewControls.add(zoomOutButton);
        viewControls.add(zoomInButton);
        viewControls.add(fitMapButton);
        viewControls.add(configureAssetsButton);

        JPanel footer = new JPanel(new BorderLayout(8, 6));
        footer.setBorder(BorderFactory.createEmptyBorder(0, 12, 10, 12));
        footer.add(simulationControls, BorderLayout.NORTH);
        footer.add(layerControls, BorderLayout.CENTER);
        footer.add(viewControls, BorderLayout.SOUTH);
        add(footer, BorderLayout.SOUTH);

        openWorldButton.addActionListener(event -> chooseWorld());
        refreshButton.addActionListener(event -> refresh());
        enablePassiveButton.addActionListener(event -> enablePassiveMode());
        disablePassiveButton.addActionListener(event -> disablePassiveMode());
        manualStepButton.addActionListener(event -> manualStep());
        worldOverviewButton.addActionListener(event -> select(Selection.world()));
        freezeViewButton.addActionListener(event -> toggleViewFreeze());
        inspectHistoryButton.addActionListener(event -> inspectHistoricalSnapshot(false));
        compareHistoryButton.addActionListener(event -> inspectHistoricalSnapshot(true));
        returnEvidenceButton.addActionListener(event -> {
            clearHistoricalMode();
            renderSelection();
        });
        zoomInButton.addActionListener(event -> zoomBy(1.25));
        zoomOutButton.addActionListener(event -> zoomBy(0.80));
        fitMapButton.addActionListener(event -> fitWorld());
        configureAssetsButton.addActionListener(event -> {
            DonorAssetSetupWindow window = new DonorAssetSetupWindow();
            window.setLocationRelativeTo(this);
            window.setVisible(true);
        });
        var layerListener = new java.awt.event.ActionListener() {
            @Override public void actionPerformed(java.awt.event.ActionEvent event) { applyLayerSelection(); }
        };
        for (JToggleButton button : List.of(ecologyLayerButton, geologyLayerButton, resourceLayerButton,
                fleetLayerButton, incidentLayerButton, populationLayerButton, migrationLayerButton,
                settlementLayerButton, factionLayerButton, creatureLayerButton)) {
            button.addActionListener(layerListener);
        }
        applyLayerSelection();

        canvas.setSelectionConsumer(this::select);
        canvas.addMouseWheelListener(event -> {
            if (!event.isControlDown()) return;
            zoomBy(event.getPreciseWheelRotation() < 0 ? 1.15 : 1.0 / 1.15);
            event.consume();
        });
        installViewportPan();
        subscription = session.addListener(this::activateWorld, true);
        refreshTimer.setRepeats(true);
        refreshTimer.start();
        refreshControls();
    }

    private void applyLayerSelection() {
        canvas.setLayers(ecologyLayerButton.isSelected(), geologyLayerButton.isSelected(),
                resourceLayerButton.isSelected(), fleetLayerButton.isSelected(), incidentLayerButton.isSelected(),
                populationLayerButton.isSelected(), migrationLayerButton.isSelected(),
                settlementLayerButton.isSelected(), factionLayerButton.isSelected(), creatureLayerButton.isSelected());
    }

    private void toggleViewFreeze() {
        viewFrozen = freezeViewButton.isSelected();
        freezeViewButton.setText(viewFrozen ? "Resume Live View" : "Freeze View");
        updateViewStatus();
        refreshControls();
        if (!viewFrozen) refresh();
    }

    private void updateViewStatus() {
        if (world == null) {
            viewStatus.setText("NO WORLD");
            return;
        }
        if (historicalSnapshotId != null) {
            SnapshotRow row = historyRows.stream().filter(candidate -> historicalSnapshotId.equals(candidate.snapshotId()))
                    .findFirst().orElse(null);
            viewStatus.setText("HISTORICAL EVIDENCE" + (row == null ? "" : " @ tick " + row.tickSequence())
                    + " · map remains " + (viewFrozen ? "FROZEN" : "LIVE") + " current-state context");
        } else if (viewFrozen) {
            Long tick = lastLoaded == null ? null : lastLoaded.passive().configuration().currentTickSequence();
            viewStatus.setText("VIEW FROZEN" + (tick == null ? "" : " @ tick " + tick)
                    + " · simulation continues independently");
        } else {
            viewStatus.setText("LIVE VIEW");
        }
    }

    private void installViewportPan() {
        MouseAdapter adapter = new MouseAdapter() {
            private Point pressed;
            private Point viewAtPress;

            @Override public void mousePressed(MouseEvent event) {
                if (!SwingUtilities.isMiddleMouseButton(event) && !SwingUtilities.isRightMouseButton(event)) return;
                pressed = event.getPoint();
                viewAtPress = mapScroll.getViewport().getViewPosition();
                canvas.setCursor(java.awt.Cursor.getPredefinedCursor(java.awt.Cursor.MOVE_CURSOR));
            }

            @Override public void mouseDragged(MouseEvent event) {
                if (pressed == null || viewAtPress == null) return;
                int dx = event.getX() - pressed.x;
                int dy = event.getY() - pressed.y;
                Dimension extent = mapScroll.getViewport().getExtentSize();
                Dimension view = canvas.getPreferredSize();
                int x = Math.max(0, Math.min(viewAtPress.x - dx, Math.max(0, view.width - extent.width)));
                int y = Math.max(0, Math.min(viewAtPress.y - dy, Math.max(0, view.height - extent.height)));
                mapScroll.getViewport().setViewPosition(new Point(x, y));
            }

            @Override public void mouseReleased(MouseEvent event) {
                if (pressed == null) return;
                pressed = null;
                viewAtPress = null;
                canvas.setCursor(java.awt.Cursor.getDefaultCursor());
            }
        };
        canvas.addMouseListener(adapter);
        canvas.addMouseMotionListener(adapter);
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
        detachPassiveListener();
        world = selectedWorld;
        lastLoaded = null;
        selection = Selection.world();
        recordTarget = null;
        selectedTimelineKey = null;
        historyRows = List.of();
        historicalSnapshotId = null;
        historicalComparison = false;
        historySnapshot.removeAllItems();
        clearTimelineSelection();
        timelineModel.clear();
        passiveControlsInitialized = false;
        viewFrozen = false;
        freezeViewButton.setSelected(false);
        freezeViewButton.setText("Freeze View");
        canvas.clear();
        canvas.setSelected(selection);
        updateViewStatus();
        if (selectedWorld == null) {
            worldStatus.setText("No desktop world open");
            passiveStatus.setText("Passive mode unavailable");
            details.setText("Open a normalized desktop world to begin passive observation.\n");
            refreshControls();
            return;
        }
        lastDirectory = selectedWorld.root().getParent();
        worldStatus.setText("Shared world: " + selectedWorld.root());
        passiveStatus.setText("Checking passive world runtime…");
        setBusy(true, "Checking passive world runtime…");
        new SwingWorker<PassiveWorldSimulationService, Void>() {
            @Override protected PassiveWorldSimulationService doInBackground() throws Exception {
                return PassiveWorldSimulationService.resumeIfEnabled(selectedWorld);
            }

            @Override protected void done() {
                try {
                    if (!Objects.equals(selectedWorld, world)) return;
                    attachPassiveListener(get());
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    showFailure("Passive mode resume interrupted", exception);
                } catch (ExecutionException exception) {
                    showFailure("Passive mode resume failed", cause(exception));
                } finally {
                    setBusy(false, "World ready");
                    refresh();
                }
            }
        }.execute();
    }

    private void enablePassiveMode() {
        WorldPaths selectedWorld = world;
        if (selectedWorld == null || busy) return;
        int cadence = ((Number) cadenceSeconds.getValue()).intValue();
        long ticks = ((Number) ticksPerCycle.getValue()).longValue();
        setBusy(true, "Starting Passive Mode…");
        new SwingWorker<PassiveWorldSimulationService, Void>() {
            @Override protected PassiveWorldSimulationService doInBackground() throws Exception {
                return PassiveWorldSimulationService.enable(selectedWorld, Duration.ofSeconds(cadence), ticks);
            }

            @Override protected void done() {
                try {
                    if (!Objects.equals(selectedWorld, world)) return;
                    attachPassiveListener(get());
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    showFailure("Passive mode start interrupted", exception);
                } catch (ExecutionException exception) {
                    showFailure("Passive mode start failed", cause(exception));
                } finally {
                    setBusy(false, "Passive Mode ready");
                    if (!viewFrozen) refresh();
                }
            }
        }.execute();
    }

    private void disablePassiveMode() {
        WorldPaths selectedWorld = world;
        if (selectedWorld == null || busy) return;
        setBusy(true, "Pausing Passive Mode…");
        new SwingWorker<Void, Void>() {
            @Override protected Void doInBackground() throws Exception {
                PassiveWorldSimulationService.disable(selectedWorld);
                return null;
            }

            @Override protected void done() {
                try {
                    get();
                    if (!Objects.equals(selectedWorld, world)) return;
                    detachPassiveListener();
                    passiveStatus.setText("Passive mode paused");
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    showFailure("Passive mode pause interrupted", exception);
                } catch (ExecutionException exception) {
                    showFailure("Passive mode pause failed", cause(exception));
                } finally {
                    setBusy(false, "Passive Mode paused");
                    if (!viewFrozen) refresh();
                }
            }
        }.execute();
    }

    private void manualStep() {
        WorldPaths selectedWorld = world;
        if (selectedWorld == null || busy || PassiveWorldSimulationService.active(selectedWorld) != null) return;
        long ticks = ((Number) ticksPerCycle.getValue()).longValue();
        setBusy(true, "Advancing authoritative world by " + ticks + " tick(s)…");
        new SwingWorker<io.github.mrcalzon02.barotrauma.persistence.PassiveWorldTickTransaction.TickResult, Void>() {
            @Override protected io.github.mrcalzon02.barotrauma.persistence.PassiveWorldTickTransaction.TickResult
                    doInBackground() throws Exception {
                return ManualWorldStepService.step(selectedWorld, ticks);
            }

            @Override protected void done() {
                try {
                    var result = get();
                    if (!Objects.equals(selectedWorld, world)) return;
                    assetStatus.setText("Manual step committed · tick " + result.tickSequence());
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    showFailure("Manual step interrupted", exception);
                } catch (ExecutionException exception) {
                    showFailure("Manual step failed", cause(exception));
                } finally {
                    setBusy(false, assetStatus.getText());
                    if (!viewFrozen) refresh();
                    else updateViewStatus();
                }
            }
        }.execute();
    }

    private void attachPassiveListener(PassiveWorldSimulationService service) {
        detachPassiveListener();
        if (service == null) {
            passiveStatus.setText("Passive mode paused");
            refreshControls();
            return;
        }
        passiveSubscription = service.addListener(status -> SwingUtilities.invokeLater(() -> {
            if (!Objects.equals(status.world(), world)) return;
            if (status.fault() != null) {
                passiveStatus.setText("Passive mode fault: " + status.fault().getMessage());
            } else if (status.cycleRunning()) {
                passiveStatus.setText("Passive mode running · advancing " + status.ticksPerCycle() + " tick(s)");
            } else {
                passiveStatus.setText("Passive mode running · every " + status.cadence().toSeconds()
                        + "s · " + status.ticksPerCycle() + " tick(s)/cycle");
            }
            refreshControls();
            if (!busy && !viewFrozen) refresh();
        }), true);
        refreshControls();
    }

    private void detachPassiveListener() {
        if (passiveSubscription == null) return;
        try { passiveSubscription.close(); } catch (Exception ignored) { }
        passiveSubscription = null;
    }

    private void refresh() {
        WorldPaths selectedWorld = world;
        if (selectedWorld == null || busy || viewFrozen) return;
        setBusy(true, "Loading live world evidence…");
        assets.clearCache();
        new SwingWorker<LoadedMap, Void>() {
            @Override protected LoadedMap doInBackground() throws Exception {
                WorldMapRegistry.RegistrySnapshot registry = WorldMapRegistry.load(selectedWorld);
                PassiveWorldRegistry.Snapshot passive = PassiveWorldRegistry.load(selectedWorld);
                NaturalWorldAndFleetRegistry.Snapshot natural = NaturalWorldAndFleetRegistry.load(selectedWorld);
                WorldObserverCivilLayer.CivilSnapshot civil = WorldObserverCivilLayer.load(selectedWorld);
                return new LoadedMap(registry, passive, natural, civil, assets.coverage());
            }

            @Override protected void done() {
                try {
                    LoadedMap loaded = get();
                    if (!Objects.equals(selectedWorld, world)) return;
                    lastLoaded = loaded;
                    canvas.setSnapshots(loaded.registry(), loaded.passive(), loaded.natural(), loaded.civil());
                    canvas.setSelected(selection);
                    refreshTimeline(loaded);
                    refreshHistory(loaded);
                    renderSelection();
                    updateViewStatus();
                    assetStatus.setText("Donor roles " + loaded.coverage().donorCount()
                            + " · fallback roles " + loaded.coverage().fallbackCount());
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    showFailure("Map refresh interrupted", exception);
                } catch (ExecutionException exception) {
                    showFailure("Map refresh failed", cause(exception));
                } finally {
                    setBusy(false, assetStatus.getText());
                }
            }
        }.execute();
    }

    private void refreshTimeline(LoadedMap loaded) {
        String category = Objects.toString(timelineCategory.getSelectedItem(), "ALL");
        int minimumSeverity = ((Number) timelineMinimumSeverity.getValue()).intValue();
        List<WorldObserverTimeline.Entry> entries = WorldObserverTimeline.build(
                        loaded.passive(), loaded.natural(), loaded.civil()).stream()
                .filter(entry -> "ALL".equals(category) || category.equals(entry.category()))
                .filter(entry -> entry.severity() >= minimumSeverity)
                .limit(TIMELINE_VISIBLE_LIMIT)
                .toList();
        suppressTimelineSelection = true;
        try {
            timelineModel.clear();
            int selectedIndex = -1;
            for (int index = 0; index < entries.size(); index++) {
                WorldObserverTimeline.Entry entry = entries.get(index);
                timelineModel.addElement(entry);
                if (selectedTimelineKey != null && selectedTimelineKey.equals(entry.stableKey())) selectedIndex = index;
            }
            if (selectedIndex >= 0) timelineList.setSelectedIndex(selectedIndex);
            else timelineList.clearSelection();
        } finally {
            suppressTimelineSelection = false;
        }
    }

    private void refreshHistory(LoadedMap loaded) {
        String selectedId = selectedHistoryRow() == null ? historicalSnapshotId : selectedHistoryRow().snapshotId();
        historyRows = WorldObserverHistory.snapshots(loaded.civil().observation());
        historySnapshot.removeAllItems();
        int selectedIndex = -1;
        for (int index = 0; index < historyRows.size(); index++) {
            SnapshotRow row = historyRows.get(index);
            historySnapshot.addItem("Tick " + row.tickSequence() + " · " + row.snapshotId());
            if (selectedId != null && selectedId.equals(row.snapshotId())) selectedIndex = index;
        }
        if (selectedIndex >= 0) historySnapshot.setSelectedIndex(selectedIndex);
        else if (!historyRows.isEmpty()) historySnapshot.setSelectedIndex(0);
    }

    private SnapshotRow selectedHistoryRow() {
        int index = historySnapshot.getSelectedIndex();
        return index >= 0 && index < historyRows.size() ? historyRows.get(index) : null;
    }

    private void inspectHistoricalSnapshot(boolean comparePrevious) {
        LoadedMap loaded = lastLoaded;
        SnapshotRow row = selectedHistoryRow();
        if (loaded == null || row == null) return;
        historicalSnapshotId = row.snapshotId();
        historicalComparison = comparePrevious;
        recordTarget = null;
        selectedTimelineKey = null;
        clearTimelineSelection();
        renderSelection();
        updateViewStatus();
    }

    private void clearHistoricalMode() {
        historicalSnapshotId = null;
        historicalComparison = false;
        updateViewStatus();
    }

    private void navigateTimeline(WorldObserverTimeline.Entry entry) {
        LoadedMap loaded = lastLoaded;
        if (entry == null || loaded == null) return;
        clearHistoricalMode();
        WorldObserverNavigation.Target target = WorldObserverNavigation.resolve(entry,
                loaded.registry(), loaded.passive(), loaded.natural(), loaded.civil());
        recordTarget = target;
        selectedTimelineKey = entry.stableKey();
        selection = selectionForAnchor(target.anchor(), loaded);
        canvas.setSelected(selection);
        renderSelection();
        focusSelection(selection);
    }

    private Selection selectionForAnchor(WorldObserverNavigation.Anchor anchor, LoadedMap loaded) {
        if (anchor == null || !anchor.present()) return Selection.world();
        try {
            if (anchor.kind() == WorldObserverNavigation.TargetKind.LOCATION) {
                UUID id = UUID.fromString(anchor.id());
                return loaded.registry().locations().stream().filter(row -> row.locationId().equals(id))
                        .findFirst().map(Selection::location).orElse(Selection.world());
            }
            if (anchor.kind() == WorldObserverNavigation.TargetKind.VESSEL) {
                UUID id = UUID.fromString(anchor.id());
                return loaded.passive().vessels().stream().filter(row -> row.vesselId().equals(id))
                        .findFirst().map(Selection::vessel).orElse(Selection.world());
            }
        } catch (IllegalArgumentException ignored) { }
        return Selection.world();
    }

    private void select(Selection requested) {
        clearHistoricalMode();
        recordTarget = null;
        selectedTimelineKey = null;
        clearTimelineSelection();
        selection = requested == null ? Selection.world() : requested;
        canvas.setSelected(selection);
        renderSelection();
    }

    private void clearTimelineSelection() {
        suppressTimelineSelection = true;
        try { timelineList.clearSelection(); }
        finally { suppressTimelineSelection = false; }
    }

    private void renderSelection() {
        LoadedMap loaded = lastLoaded;
        if (loaded == null) return;
        var configuration = loaded.passive().configuration();
        if (configuration.configured()) {
            if (!passiveControlsInitialized) {
                cadenceSeconds.setValue(configuration.cadenceSeconds());
                ticksPerCycle.setValue(configuration.ticksPerCycle());
                passiveControlsInitialized = true;
            }
            if (PassiveWorldSimulationService.active(world) == null) {
                passiveStatus.setText(configuration.enabled()
                        ? "Passive mode configured; runtime is not currently active"
                        : "Passive mode paused");
            }
        }

        String text;
        if (historicalSnapshotId != null) {
            if (historicalComparison) {
                SnapshotRow previous = WorldObserverHistory.previous(historicalSnapshotId, loaded.civil().observation());
                text = previous == null
                        ? WorldObserverHistory.renderSnapshot(historicalSnapshotId, loaded.civil().observation())
                                + "\n\nNo older committed snapshot is available for comparison.\n"
                        : WorldObserverHistory.compare(historicalSnapshotId, previous.snapshotId(),
                                loaded.civil().observation());
            } else {
                text = WorldObserverHistory.renderSnapshot(historicalSnapshotId, loaded.civil().observation());
            }
        } else if (recordTarget != null) {
            text = WorldObserverRecordInspector.render(recordTarget, loaded.passive(), loaded.natural(), loaded.civil());
            if (recordTarget.anchor().present()) {
                text += "\n\nMAP ANCHOR\n" + recordTarget.anchor().kind() + " · "
                        + recordTarget.anchor().label() + "\n";
            }
        } else {
            text = switch (selection.kind()) {
                case WORLD -> worldDossier(loaded);
                case LOCATION -> loaded.registry().locations().stream()
                        .filter(row -> row.locationId().equals(selection.id())).findFirst()
                        .map(row -> WorldObserverInspector.location(row, loaded.registry(), loaded.passive())
                                + "\n\n" + WorldObserverNaturalLayer.location(row.displayName(), loaded.natural())
                                + "\n\n" + WorldObserverCivilLayer.location(row.displayName(), loaded.civil()))
                        .orElseGet(() -> missingSelection(loaded));
                case VESSEL -> loaded.passive().vessels().stream()
                        .filter(row -> row.vesselId().equals(selection.id())).findFirst()
                        .map(row -> WorldObserverInspector.vessel(row, loaded.passive()))
                        .orElseGet(() -> missingSelection(loaded));
                case ROUTE -> loaded.passive().vessels().stream()
                        .filter(row -> row.vesselId().equals(selection.id())).findFirst()
                        .map(row -> WorldObserverInspector.route(row, loaded.passive()))
                        .orElseGet(() -> missingSelection(loaded));
            };
        }
        details.setText(text);
        details.setCaretPosition(0);
        updateViewStatus();
    }

    private String missingSelection(LoadedMap loaded) {
        selection = Selection.world();
        canvas.setSelected(selection);
        return "The selected entity is no longer present in the current world state.\n\n" + worldDossier(loaded);
    }

    private String worldDossier(LoadedMap loaded) {
        String donorRoot = assets.activeDonor().map(candidate -> candidate.installationRoot().toString())
                .orElse("No active Barotrauma installation; procedural fallback visuals are in use.");
        return WorldObserverInspector.world(loaded.registry(), loaded.passive(), donorRoot,
                loaded.coverage().donorCount(), loaded.coverage().fallbackCount())
                + "\n\n" + WorldObserverNaturalLayer.world(loaded.natural())
                + "\n\n" + WorldObserverCivilLayer.world(loaded.civil())
                + "\n\n" + WorldObserverHistory.renderIndex(loaded.civil().observation())
                + "\n\nRECENT WORLD TIMELINE\nUse the interactive timeline pane below to filter and open committed causal records.\n";
    }

    private void focusSelection(Selection requested) {
        Point point = canvas.pointFor(requested);
        if (point == null) return;
        var viewport = mapScroll.getViewport();
        Dimension extent = viewport.getExtentSize();
        Dimension view = canvas.getPreferredSize();
        int x = Math.max(0, Math.min(point.x - extent.width / 2, Math.max(0, view.width - extent.width)));
        int y = Math.max(0, Math.min(point.y - extent.height / 2, Math.max(0, view.height - extent.height)));
        viewport.setViewPosition(new Point(x, y));
    }

    private void zoomBy(double factor) {
        var viewport = mapScroll.getViewport();
        double oldZoom = canvas.zoom();
        Point oldPosition = viewport.getViewPosition();
        Dimension extent = viewport.getExtentSize();
        double centerX = (oldPosition.x + extent.width / 2.0) / oldZoom;
        double centerY = (oldPosition.y + extent.height / 2.0) / oldZoom;
        double newZoom = canvas.setZoom(oldZoom * factor);
        SwingUtilities.invokeLater(() -> {
            Dimension viewSize = canvas.getPreferredSize();
            int x = (int) Math.round(centerX * newZoom - extent.width / 2.0);
            int y = (int) Math.round(centerY * newZoom - extent.height / 2.0);
            x = Math.max(0, Math.min(x, Math.max(0, viewSize.width - extent.width)));
            y = Math.max(0, Math.min(y, Math.max(0, viewSize.height - extent.height)));
            viewport.setViewPosition(new Point(x, y));
        });
    }

    private void fitWorld() {
        Dimension extent = mapScroll.getViewport().getExtentSize();
        if (extent.width <= 0 || extent.height <= 0) return;
        double fit = Math.min(extent.width / (double) EuropaMapCanvas.MAP_WIDTH,
                extent.height / (double) EuropaMapCanvas.MAP_HEIGHT);
        canvas.setZoom(fit);
        SwingUtilities.invokeLater(() -> mapScroll.getViewport().setViewPosition(new Point(0, 0)));
    }

    private void setBusy(boolean value, String message) {
        busy = value;
        assetStatus.setText(message);
        refreshControls();
    }

    private void refreshControls() {
        boolean worldOpen = world != null;
        boolean passiveRunning = worldOpen && PassiveWorldSimulationService.active(world) != null;
        openWorldButton.setEnabled(!busy);
        refreshButton.setEnabled(!busy && worldOpen && !viewFrozen);
        configureAssetsButton.setEnabled(!busy);
        worldOverviewButton.setEnabled(!busy && worldOpen);
        freezeViewButton.setEnabled(!busy && worldOpen);
        enablePassiveButton.setEnabled(!busy && worldOpen && !passiveRunning);
        disablePassiveButton.setEnabled(!busy && passiveRunning);
        manualStepButton.setEnabled(!busy && worldOpen && !passiveRunning);
        cadenceSeconds.setEnabled(!busy && worldOpen && !passiveRunning);
        ticksPerCycle.setEnabled(!busy && worldOpen && !passiveRunning);
        timelineList.setEnabled(!busy && worldOpen);
        timelineCategory.setEnabled(worldOpen);
        timelineMinimumSeverity.setEnabled(worldOpen);
        historySnapshot.setEnabled(worldOpen && !historyRows.isEmpty());
        inspectHistoryButton.setEnabled(worldOpen && !historyRows.isEmpty());
        compareHistoryButton.setEnabled(worldOpen && historyRows.size() > 1);
        returnEvidenceButton.setEnabled(worldOpen && historicalSnapshotId != null);
        zoomInButton.setEnabled(!busy);
        zoomOutButton.setEnabled(!busy);
        fitMapButton.setEnabled(!busy);
        for (JToggleButton button : List.of(ecologyLayerButton, geologyLayerButton, resourceLayerButton,
                fleetLayerButton, incidentLayerButton, populationLayerButton, migrationLayerButton,
                settlementLayerButton, factionLayerButton, creatureLayerButton)) {
            button.setEnabled(!busy && worldOpen);
        }
    }

    private void showFailure(String title, Throwable throwable) {
        assetStatus.setText(title);
        details.append("\n" + title + "\n" + throwable.getClass().getSimpleName() + ": "
                + throwable.getMessage() + "\n");
        JOptionPane.showMessageDialog(this, throwable.getMessage(), title, JOptionPane.ERROR_MESSAGE);
    }

    @Override public void dispose() {
        refreshTimer.stop();
        detachPassiveListener();
        if (subscription != null) {
            try { subscription.close(); } catch (Exception ignored) { }
            subscription = null;
        }
        super.dispose();
    }

    private static String blank(String value) { return value == null ? "" : value; }
    private static String nullable(Object value) { return value == null ? "" : value.toString(); }
    private static Throwable cause(ExecutionException exception) {
        return exception.getCause() == null ? exception : exception.getCause();
    }

    private enum SelectionKind { WORLD, LOCATION, VESSEL, ROUTE }

    private record Selection(SelectionKind kind, UUID id, String label) {
        private Selection {
            Objects.requireNonNull(kind, "kind");
        }
        static Selection world() { return new Selection(SelectionKind.WORLD, null, "World overview"); }
        static Selection location(LocationRow row) {
            return new Selection(SelectionKind.LOCATION, row.locationId(), row.displayName());
        }
        static Selection vessel(PassiveWorldRegistry.VesselRow row) {
            return new Selection(SelectionKind.VESSEL, row.vesselId(), row.name());
        }
        static Selection route(PassiveWorldRegistry.VesselRow row) {
            return new Selection(SelectionKind.ROUTE, row.vesselId(), row.name() + " route");
        }
    }

    private record LoadedMap(WorldMapRegistry.RegistrySnapshot registry, PassiveWorldRegistry.Snapshot passive,
                             NaturalWorldAndFleetRegistry.Snapshot natural,
                             WorldObserverCivilLayer.CivilSnapshot civil,
                             BarotraumaAssetCatalogue.CoverageReport coverage) { }

    private static final class EuropaMapCanvas extends JPanel {
        private static final int MAP_WIDTH = 1500;
        private static final int MAP_HEIGHT = 900;
        private static final int MARGIN = 70;
        private static final double MIN_ZOOM = 0.35;
        private static final double MAX_ZOOM = 4.0;

        private final BarotraumaAssetCatalogue assets;
        private final Map<VisualRole, BufferedImage> icons = new EnumMap<>(VisualRole.class);
        private final List<HitRegion> hitRegions = new ArrayList<>();
        private WorldMapRegistry.RegistrySnapshot registry;
        private PassiveWorldRegistry.Snapshot passive;
        private NaturalWorldAndFleetRegistry.Snapshot natural;
        private WorldObserverCivilLayer.CivilSnapshot civil;
        private Map<String, WorldObserverNaturalLayer.LayerSignal> naturalSignals = Map.of();
        private Map<String, WorldObserverCivilLayer.CivilSignal> civilSignals = Map.of();
        private BufferedImage background;
        private Consumer<Selection> selectionConsumer = ignored -> { };
        private Selection selected = Selection.world();
        private double zoom = 1.0;
        private boolean ecologyLayer;
        private boolean geologyLayer;
        private boolean resourceLayer;
        private boolean fleetLayer = true;
        private boolean incidentLayer = true;
        private boolean populationLayer;
        private boolean migrationLayer = true;
        private boolean settlementLayer;
        private boolean factionLayer;
        private boolean creatureLayer = true;

        private EuropaMapCanvas(BarotraumaAssetCatalogue assets) {
            this.assets = assets;
            applyZoom();
            setMinimumSize(new Dimension(900, 600));
            setOpaque(true);
            setToolTipText("");
            addMouseListener(new MouseAdapter() {
                @Override public void mouseClicked(MouseEvent event) {
                    if (!SwingUtilities.isLeftMouseButton(event)) return;
                    selectAt(event.getPoint());
                }
            });
        }

        void setSelectionConsumer(Consumer<Selection> consumer) {
            selectionConsumer = Objects.requireNonNull(consumer, "consumer");
        }

        void setSelected(Selection selection) {
            selected = selection == null ? Selection.world() : selection;
            repaint();
        }

        void setLayers(boolean ecology, boolean geology, boolean resources, boolean fleet, boolean incidents,
                       boolean population, boolean migration, boolean settlement, boolean factions,
                       boolean creatures) {
            ecologyLayer = ecology;
            geologyLayer = geology;
            resourceLayer = resources;
            fleetLayer = fleet;
            incidentLayer = incidents;
            populationLayer = population;
            migrationLayer = migration;
            settlementLayer = settlement;
            factionLayer = factions;
            creatureLayer = creatures;
            repaint();
        }

        private void selectAt(Point point) {
            for (int index = hitRegions.size() - 1; index >= 0; index--) {
                HitRegion region = hitRegions.get(index);
                if (region.shape().contains(point)) {
                    selectionConsumer.accept(region.selection());
                    return;
                }
            }
            selectionConsumer.accept(Selection.world());
        }

        double zoom() { return zoom; }

        double setZoom(double requestedZoom) {
            zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, requestedZoom));
            applyZoom();
            return zoom;
        }

        private void applyZoom() {
            setPreferredSize(new Dimension(
                    Math.max(1, (int) Math.round(MAP_WIDTH * zoom)),
                    Math.max(1, (int) Math.round(MAP_HEIGHT * zoom))));
            revalidate();
            repaint();
        }

        void setSnapshots(WorldMapRegistry.RegistrySnapshot registry, PassiveWorldRegistry.Snapshot passive,
                          NaturalWorldAndFleetRegistry.Snapshot natural,
                          WorldObserverCivilLayer.CivilSnapshot civil) {
            this.registry = registry;
            this.passive = passive;
            this.natural = natural;
            this.civil = civil;
            naturalSignals = natural == null ? Map.of() : WorldObserverNaturalLayer.signals(natural);
            civilSignals = civil == null ? Map.of() : WorldObserverCivilLayer.signals(civil);
            icons.clear();
            background = null;
            repaint();
        }

        Point pointFor(Selection requested) {
            if (requested == null || registry == null || requested.kind() == SelectionKind.WORLD) return null;
            Map<String, Point> positions = positions(registry.locations(), getWidth(), getHeight());
            if (requested.kind() == SelectionKind.LOCATION) {
                return registry.locations().stream().filter(row -> row.locationId().equals(requested.id()))
                        .findFirst().map(row -> positions.get(row.displayName())).orElse(null);
            }
            if (passive == null) return null;
            var vessel = passive.vessels().stream().filter(row -> row.vesselId().equals(requested.id()))
                    .findFirst().orElse(null);
            if (vessel == null) return null;
            if (requested.kind() == SelectionKind.VESSEL) return vesselPosition(vessel, positions);
            Point from = positions.get(vessel.currentLocation());
            Point to = positions.get(vessel.destinationLocation());
            if (from == null) return null;
            if (to == null) return from;
            return new Point((from.x + to.x) / 2, (from.y + to.y) / 2);
        }

        void clear() {
            registry = null;
            passive = null;
            natural = null;
            civil = null;
            naturalSignals = Map.of();
            civilSignals = Map.of();
            icons.clear();
            background = null;
            hitRegions.clear();
            repaint();
        }

        @Override protected void paintComponent(Graphics graphics) {
            super.paintComponent(graphics);
            Graphics2D g = (Graphics2D) graphics.create();
            try {
                g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
                drawBackground(g);
                if (registry == null) {
                    g.setColor(new Color(220, 235, 230));
                    g.setFont(getFont().deriveFont(Font.BOLD, 20f));
                    g.drawString("Open a normalized desktop world", 70, 90);
                    return;
                }
                hitRegions.clear();
                Map<String, Point> positions = positions(registry.locations(), getWidth(), getHeight());
                drawNaturalLayers(g, positions);
                drawCivilLayers(g, positions);
                drawRoutes(g, positions);
                drawLocations(g, positions);
                drawVessels(g, positions);
                drawLayerLegend(g);
                drawSourceBadge(g);
            } finally {
                g.dispose();
            }
        }

        private void drawBackground(Graphics2D g) {
            if (background == null || background.getWidth() != getWidth() || background.getHeight() != getHeight()) {
                try {
                    background = assets.loadImage(VisualRole.MAP_BACKGROUND,
                            Math.max(1, getWidth()), Math.max(1, getHeight()));
                } catch (Exception exception) {
                    background = null;
                }
            }
            if (background != null) g.drawImage(background, 0, 0, null);
            else {
                g.setColor(new Color(7, 18, 24));
                g.fillRect(0, 0, getWidth(), getHeight());
            }
            g.setComposite(AlphaComposite.SrcOver.derive(0.32f));
            g.setColor(new Color(0, 8, 12));
            g.fillRect(0, 0, getWidth(), getHeight());
            g.setComposite(AlphaComposite.SrcOver);
        }

        private void drawNaturalLayers(Graphics2D g, Map<String, Point> positions) {
            if (natural == null) return;
            for (var entry : naturalSignals.entrySet()) {
                Point point = positions.get(entry.getKey());
                if (point == null) continue;
                var signal = entry.getValue();
                if (ecologyLayer && signal.ecologicalRisk() > 0) {
                    int radius = 18 + signal.ecologicalRisk() / 8;
                    g.setComposite(AlphaComposite.SrcOver.derive(0.22f));
                    g.setColor(new Color(95, 190, 125));
                    g.fillOval(point.x - radius, point.y - radius, radius * 2, radius * 2);
                    g.setComposite(AlphaComposite.SrcOver);
                    g.setColor(new Color(129, 220, 155));
                    g.drawOval(point.x - radius, point.y - radius, radius * 2, radius * 2);
                }
                if (geologyLayer && signal.geologicalRisk() > 0) {
                    int radius = 22 + signal.geologicalRisk() / 7;
                    g.setStroke(new BasicStroke(2f));
                    g.setColor(new Color(226, 145, 82, 190));
                    g.drawOval(point.x - radius, point.y - radius, radius * 2, radius * 2);
                }
                if (resourceLayer && signal.overallOpportunity() > 0) {
                    int radius = 7 + signal.overallOpportunity() / 18;
                    g.setColor(new Color(105, 205, 225, 210));
                    g.fillOval(point.x - radius, point.y - radius, radius * 2, radius * 2);
                    g.setColor(new Color(220, 245, 250));
                    g.drawOval(point.x - radius, point.y - radius, radius * 2, radius * 2);
                }
                if (incidentLayer && signal.eventSeverity() >= 35) {
                    int radius = 11 + signal.eventSeverity() / 12;
                    g.setStroke(new BasicStroke(2.5f));
                    g.setColor(new Color(235, 95, 86, 220));
                    g.drawLine(point.x - radius, point.y - radius, point.x + radius, point.y + radius);
                    g.drawLine(point.x + radius, point.y - radius, point.x - radius, point.y + radius);
                }
            }
            if (fleetLayer && passive != null) {
                for (var response : passive.fleetResponses()) {
                    if (!"ACTIVE".equals(response.status()) && !"AVAILABLE".equals(response.status())) continue;
                    Point target = positions.get(response.targetLocationName());
                    if (target == null) continue;
                    g.setStroke(new BasicStroke(3f));
                    g.setColor(new Color(245, 190, 92, 220));
                    g.drawOval(target.x - 24, target.y - 24, 48, 48);
                    if (response.responderVesselId() != null) {
                        var responder = passive.vessels().stream()
                                .filter(vessel -> vessel.vesselId().toString().equals(response.responderVesselId()))
                                .findFirst().orElse(null);
                        Point responderPoint = responder == null ? null : vesselPosition(responder, positions);
                        if (responderPoint != null) {
                            g.setStroke(new BasicStroke(2f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND,
                                    10f, new float[]{4f, 6f}, 0f));
                            g.drawLine(responderPoint.x, responderPoint.y, target.x, target.y);
                        }
                    }
                }
            }
            g.setStroke(new BasicStroke(1f));
            g.setComposite(AlphaComposite.SrcOver);
        }

        private void drawCivilLayers(Graphics2D g, Map<String, Point> positions) {
            if (civil == null) return;
            for (var entry : civilSignals.entrySet()) {
                Point point = positions.get(entry.getKey());
                if (point == null) continue;
                var signal = entry.getValue();
                if (populationLayer && signal.population() > 0) {
                    int radius = 10 + Math.min(28, (int) Math.round(Math.sqrt(signal.population()) / 2.0));
                    g.setComposite(AlphaComposite.SrcOver.derive(0.18f));
                    g.setColor(signal.populationPressure() >= 50
                            ? new Color(230, 100, 92) : new Color(125, 175, 235));
                    g.fillOval(point.x - radius, point.y - radius, radius * 2, radius * 2);
                    g.setComposite(AlphaComposite.SrcOver);
                    g.drawOval(point.x - radius, point.y - radius, radius * 2, radius * 2);
                }
                if (settlementLayer && signal.settlementActivity() > 0) {
                    int half = 10 + signal.settlementActivity() / 12;
                    g.setStroke(new BasicStroke(2f));
                    g.setColor(new Color(184, 220, 128, 220));
                    g.drawRect(point.x - half, point.y - half, half * 2, half * 2);
                }
                if (creatureLayer && signal.creaturePressure() >= 25) {
                    int radius = 16 + signal.creaturePressure() / 7;
                    g.setStroke(new BasicStroke(2f));
                    g.setColor(new Color(230, 105, 112, 190));
                    g.drawArc(point.x - radius, point.y - radius, radius * 2, radius * 2, 20, 130);
                    g.drawArc(point.x - radius, point.y - radius, radius * 2, radius * 2, 200, 130);
                }
                if (factionLayer && signal.dominantFaction() != null && signal.dominantFactionInfluence() > 0) {
                    String label = signal.dominantFaction() + " " + signal.dominantFactionInfluence();
                    g.setFont(getFont().deriveFont(Font.BOLD, 10f));
                    g.setColor(new Color(225, 220, 180));
                    g.drawString(label, point.x + 15, point.y - 17);
                }
            }

            if (migrationLayer) {
                for (var flow : civil.migrations()) {
                    if (List.of("COMPLETE", "FAILED", "CANCELLED").contains(flow.status())) continue;
                    Point from = positions.get(flow.originLocation());
                    Point to = positions.get(flow.destinationLocation());
                    if (from == null || to == null) continue;
                    g.setStroke(new BasicStroke(2.2f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND,
                            10f, new float[]{5f, 7f}, 0f));
                    g.setColor(new Color(190, 140, 235, 210));
                    g.drawLine(from.x, from.y, to.x, to.y);
                    drawArrow(g, from, to);
                }
            }
            g.setStroke(new BasicStroke(1f));
            g.setComposite(AlphaComposite.SrcOver);
        }

        private void drawRoutes(Graphics2D g, Map<String, Point> positions) {
            if (passive == null) return;
            for (var vessel : passive.vessels()) {
                if (vessel.destinationLocation() == null) continue;
                Point from = positions.get(vessel.currentLocation());
                Point to = positions.get(vessel.destinationLocation());
                if (from == null || to == null) continue;
                boolean selectedRoute = selected.kind() == SelectionKind.ROUTE
                        && vessel.vesselId().equals(selected.id());
                if (selectedRoute) {
                    g.setStroke(new BasicStroke(5f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
                    g.setColor(new Color(245, 230, 155));
                    g.drawLine(from.x, from.y, to.x, to.y);
                }
                g.setStroke(new BasicStroke(selectedRoute ? 2.8f : 2f, BasicStroke.CAP_ROUND,
                        BasicStroke.JOIN_ROUND, 10f, new float[]{8f, 8f}, 0f));
                g.setColor(routeColor(vessel.status()));
                g.drawLine(from.x, from.y, to.x, to.y);
                drawArrow(g, from, to);
                Shape routeHit = new BasicStroke(14f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND)
                        .createStrokedShape(new Line2D.Double(from, to));
                hitRegions.add(new HitRegion(routeHit,
                        vessel.name() + " · " + vessel.currentLocation() + " → " + vessel.destinationLocation()
                                + " · " + vessel.routeProgress() + "/" + vessel.routeTicksRequired(),
                        Selection.route(vessel)));
            }
            g.setStroke(new BasicStroke(1f));
        }

        private void drawLocations(Graphics2D g, Map<String, Point> positions) {
            List<LocationRow> rows = registry.locations().stream()
                    .sorted(Comparator.comparing(LocationRow::station)).toList();
            for (LocationRow row : rows) {
                Point point = positions.get(row.displayName());
                if (point == null) continue;
                var naturalSignal = naturalSignals.get(row.displayName());
                var civilSignal = civilSignals.get(row.displayName());
                int importance = WorldObserverLevelOfDetail.importance(naturalSignal, civilSignal);
                boolean selectedLocation = selected.kind() == SelectionKind.LOCATION
                        && row.locationId().equals(selected.id());
                if (!WorldObserverLevelOfDetail.showGenericMarker(zoom, row.station(), selectedLocation, importance)) {
                    continue;
                }

                VisualRole role = locationRole(row);
                int size = row.station() ? 38 : 30;
                BufferedImage icon = icon(role, size, size);
                g.drawImage(icon, point.x - size / 2, point.y - size / 2, null);
                if (selectedLocation) {
                    g.setStroke(new BasicStroke(3f));
                    g.setColor(new Color(245, 230, 155));
                    g.drawOval(point.x - size / 2 - 6, point.y - size / 2 - 6, size + 12, size + 12);
                    g.setStroke(new BasicStroke(1f));
                }
                if (WorldObserverLevelOfDetail.showLabel(zoom, row.station(), selectedLocation, importance)) {
                    g.setColor(new Color(225, 236, 226));
                    g.setFont(getFont().deriveFont(row.station() ? Font.BOLD : Font.PLAIN,
                            row.station() ? 12f : 11f));
                    g.drawString(row.displayName(), point.x + size / 2 + 4, point.y + 4);
                }
                Rectangle bounds = new Rectangle(point.x - size / 2, point.y - size / 2, size, size);
                String naturalText = naturalSignal == null ? "" : " · hazard " + naturalSignal.overallHazard()
                        + " · resource " + naturalSignal.overallOpportunity();
                String civilText = civilSignal == null ? "" : " · pop " + civilSignal.population()
                        + " · migration " + civilSignal.migrationActivity()
                        + " · creature " + civilSignal.creaturePressure()
                        + (civilSignal.dominantFaction() == null ? ""
                        : " · " + civilSignal.dominantFaction() + " " + civilSignal.dominantFactionInfluence());
                hitRegions.add(new HitRegion(bounds,
                        row.displayName() + " · ring " + row.ring() + " · level " + row.locationLevel()
                                + " · " + blank(row.locationType())
                                + (row.faction() == null ? "" : " · " + row.faction()) + naturalText + civilText,
                        Selection.location(row)));
            }
        }

        private void drawVessels(Graphics2D g, Map<String, Point> positions) {
            if (passive == null) return;
            Map<String, Integer> offsets = new HashMap<>();
            for (var vessel : passive.vessels()) {
                Point routePoint = vesselPosition(vessel, positions);
                if (routePoint == null) continue;
                String stackKey = vessel.currentLocation() + "->" + nullable(vessel.destinationLocation());
                int offset = offsets.merge(stackKey, 1, Integer::sum) - 1;
                double angle = offset * Math.PI * 0.65;
                int radius = offset == 0 ? 0 : 12 + offset * 4;
                int x = routePoint.x + (int) Math.round(Math.cos(angle) * radius);
                int y = routePoint.y + (int) Math.round(Math.sin(angle) * radius);
                VisualRole role = "LOST".equals(vessel.status()) ? VisualRole.WRECK_MARKER
                        : "DISABLED".equals(vessel.status()) ? VisualRole.BROKEN_STATUS
                        : VisualRole.SUBMARINE_MARKER;
                int size = 28;
                g.drawImage(icon(role, size, size), x - size / 2, y - size / 2, null);
                g.setColor(routeColor(vessel.status()));
                g.drawOval(x - size / 2 - 2, y - size / 2 - 2, size + 4, size + 4);
                boolean selectedVessel = selected.kind() == SelectionKind.VESSEL
                        && vessel.vesselId().equals(selected.id());
                if (selectedVessel) {
                    g.setStroke(new BasicStroke(3f));
                    g.setColor(new Color(245, 230, 155));
                    g.drawOval(x - size / 2 - 7, y - size / 2 - 7, size + 14, size + 14);
                    g.setStroke(new BasicStroke(1f));
                }
                String progress = vessel.destinationLocation() == null || vessel.routeTicksRequired() <= 0
                        ? "" : " · route " + vessel.routeProgress() + "/" + vessel.routeTicksRequired();
                String incidents = vessel.plannedIncidents() == null ? ""
                        : " · incidents " + nullable(vessel.incidentsResolved()) + "/" + vessel.plannedIncidents();
                String eta = vessel.scheduledArrivalTick() == null ? ""
                        : " · ETA tick " + vessel.scheduledArrivalTick();
                hitRegions.add(new HitRegion(new Rectangle(x - size / 2, y - size / 2, size, size),
                        vessel.name() + " · " + vessel.role() + " · " + vessel.status()
                                + " · hull " + vessel.hull() + "% · supplies " + vessel.supplies()
                                + (vessel.destinationLocation() == null ? ""
                                : " · destination " + vessel.destinationLocation())
                                + progress + incidents + eta,
                        Selection.vessel(vessel)));
            }
        }

        private static Point vesselPosition(PassiveWorldRegistry.VesselRow vessel, Map<String, Point> positions) {
            Point from = positions.get(vessel.currentLocation());
            if (from == null || vessel.destinationLocation() == null) return from;
            Point to = positions.get(vessel.destinationLocation());
            if (to == null || vessel.routeTicksRequired() <= 0) return from;
            return WorldObserverProjection.interpolate(from, to, vessel.routeProgress(), vessel.routeTicksRequired());
        }

        private void drawLayerLegend(Graphics2D g) {
            List<String> labels = new ArrayList<>();
            if (ecologyLayer) labels.add("Ecology");
            if (geologyLayer) labels.add("Geology");
            if (resourceLayer) labels.add("Resources");
            if (fleetLayer) labels.add("Fleet response");
            if (incidentLayer) labels.add("Incidents");
            if (populationLayer) labels.add("Population");
            if (migrationLayer) labels.add("Migration");
            if (settlementLayer) labels.add("Settlement");
            if (factionLayer) labels.add("Factions");
            if (creatureLayer) labels.add("Creatures");
            if (labels.isEmpty()) return;
            String text = "Layers: " + String.join(" · ", labels);
            g.setFont(getFont().deriveFont(Font.BOLD, 11f));
            int width = g.getFontMetrics().stringWidth(text) + 20;
            int x = Math.max(12, getWidth() - width - 16);
            int y = 16;
            g.setColor(new Color(4, 15, 20, 210));
            g.fillRoundRect(x, y, width, 24, 12, 12);
            g.setColor(new Color(200, 225, 220));
            g.drawRoundRect(x, y, width, 24, 12, 12);
            g.drawString(text, x + 10, y + 16);
        }

        private void drawSourceBadge(Graphics2D g) {
            String text = assets.activeDonor().isPresent()
                    ? "Barotrauma donor textures active" : "Procedural fallback visuals";
            g.setFont(getFont().deriveFont(Font.BOLD, 12f));
            int width = g.getFontMetrics().stringWidth(text) + 24;
            int x = getWidth() - width - 16;
            int y = getHeight() - 40;
            g.setColor(new Color(4, 15, 20, 210));
            g.fillRoundRect(x, y, width, 26, 12, 12);
            g.setColor(assets.activeDonor().isPresent()
                    ? new Color(129, 205, 188) : new Color(226, 177, 92));
            g.drawRoundRect(x, y, width, 26, 12, 12);
            g.drawString(text, x + 12, y + 18);
        }

        private BufferedImage icon(VisualRole role, int width, int height) {
            BufferedImage existing = icons.get(role);
            if (existing != null && existing.getWidth() == width && existing.getHeight() == height) return existing;
            try {
                BufferedImage loaded = assets.loadImage(role, width, height);
                icons.put(role, loaded);
                return loaded;
            } catch (Exception exception) {
                BufferedImage empty = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
                icons.put(role, empty);
                return empty;
            }
        }

        private static Map<String, Point> positions(List<LocationRow> locations, int width, int height) {
            Map<String, Point> result = new HashMap<>();
            List<LocationRow> mapped = locations.stream()
                    .filter(row -> row.mapX() != null && row.mapY() != null).toList();
            if (mapped.size() >= 2) {
                double minX = mapped.stream().mapToDouble(LocationRow::mapX).min().orElse(0);
                double maxX = mapped.stream().mapToDouble(LocationRow::mapX).max().orElse(1);
                double minY = mapped.stream().mapToDouble(LocationRow::mapY).min().orElse(0);
                double maxY = mapped.stream().mapToDouble(LocationRow::mapY).max().orElse(1);
                double rangeX = Math.max(1.0, maxX - minX);
                double rangeY = Math.max(1.0, maxY - minY);
                for (LocationRow row : locations) {
                    if (row.mapX() == null || row.mapY() == null) continue;
                    int x = MARGIN + (int) Math.round((row.mapX() - minX) / rangeX
                            * Math.max(1, width - MARGIN * 2));
                    int y = MARGIN + (int) Math.round((row.mapY() - minY) / rangeY
                            * Math.max(1, height - MARGIN * 2));
                    result.put(row.displayName(), new Point(x, y));
                }
            }
            if (result.size() < locations.size()) {
                int maximumRing = locations.stream().mapToInt(LocationRow::ring).max().orElse(1);
                double cx = width / 2.0;
                double cy = height / 2.0;
                double radius = Math.max(100, Math.min(width, height) / 2.0 - MARGIN);
                for (LocationRow row : locations) {
                    if (result.containsKey(row.displayName())) continue;
                    double angle = row.sourceOrdinal() * 2.399963229728653;
                    double radial = maximumRing == 0 ? 0.5 : 1.0 - row.ring() / (double) maximumRing;
                    radial = 0.18 + radial * 0.82;
                    result.put(row.displayName(), new Point(
                            (int) Math.round(cx + Math.cos(angle) * radius * radial),
                            (int) Math.round(cy + Math.sin(angle) * radius * radial)));
                }
            }
            return result;
        }

        private static VisualRole locationRole(LocationRow row) {
            String text = (blank(row.locationType()) + " " + row.displayName()).toLowerCase(Locale.ROOT);
            if (row.station() || text.contains("station") || text.contains("outpost")) return VisualRole.OUTPOST_MARKER;
            if (text.contains("cave") || text.contains("chasm") || text.contains("tunnel")) return VisualRole.CAVE_MARKER;
            if (text.contains("ruin") || text.contains("ancient")) return VisualRole.RUIN_MARKER;
            if (text.contains("beacon")) return VisualRole.BEACON_MARKER;
            if (text.contains("wreck")) return VisualRole.WRECK_MARKER;
            if (text.contains("radiation")) return VisualRole.RADIATION_MARKER;
            if (text.contains("enemy") || text.contains("hostile") || text.contains("nest")) return VisualRole.ENEMY_MARKER;
            return VisualRole.LOCATION_MARKER;
        }

        private static Color routeColor(String status) {
            return switch (status) {
                case "DISABLED", "LOST" -> new Color(220, 90, 80);
                case "RETURNING" -> new Color(226, 177, 92);
                case "IN_TRANSIT", "PREPARING" -> new Color(126, 211, 224);
                default -> new Color(170, 205, 190);
            };
        }

        private static void drawArrow(Graphics2D g, Point from, Point to) {
            double angle = Math.atan2(to.y - from.y, to.x - from.x);
            int x = (int) Math.round(from.x + (to.x - from.x) * 0.72);
            int y = (int) Math.round(from.y + (to.y - from.y) * 0.72);
            int length = 10;
            g.drawLine(x, y, (int) Math.round(x - Math.cos(angle - 0.55) * length),
                    (int) Math.round(y - Math.sin(angle - 0.55) * length));
            g.drawLine(x, y, (int) Math.round(x - Math.cos(angle + 0.55) * length),
                    (int) Math.round(y - Math.sin(angle + 0.55) * length));
        }

        @Override public String getToolTipText(MouseEvent event) {
            for (int index = hitRegions.size() - 1; index >= 0; index--) {
                HitRegion region = hitRegions.get(index);
                if (region.shape().contains(event.getPoint())) return region.text();
            }
            return null;
        }

        private record HitRegion(Shape shape, String text, Selection selection) { }
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            try { UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName()); }
            catch (Exception exception) { System.err.println(exception.getMessage()); }
            DonorBackedWorldMapWindow window = new DonorBackedWorldMapWindow();
            window.setLocationRelativeTo(null);
            window.setVisible(true);
        });
    }
}
