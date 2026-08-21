package io.github.mrcalzon02.barotrauma.desktop.registry;

import io.github.mrcalzon02.barotrauma.assets.BarotraumaAssetCatalogue;
import io.github.mrcalzon02.barotrauma.assets.BarotraumaAssetCatalogue.VisualRole;
import io.github.mrcalzon02.barotrauma.desktop.assets.DonorAssetSetupWindow;
import io.github.mrcalzon02.barotrauma.desktop.session.DesktopWorldSession;
import io.github.mrcalzon02.barotrauma.persistence.PassiveWorldRegistry;
import io.github.mrcalzon02.barotrauma.persistence.WorldMapRegistry;
import io.github.mrcalzon02.barotrauma.persistence.WorldMapRegistry.LocationRow;
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
import javax.swing.JTextArea;
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
 * scheduler, can explicitly run or pause that scheduler, renders in-transit NPC vessels at committed route
 * progress, and keeps a clicked vessel, route, station, or location pinned in the evidence inspector while
 * the world continues to advance.
 */
public final class DonorBackedWorldMapWindow extends JFrame {
    private final DesktopWorldSession session = DesktopWorldSession.global();
    private final BarotraumaAssetCatalogue assets = new BarotraumaAssetCatalogue();
    private final JLabel worldStatus = new JLabel("No desktop world open");
    private final JLabel passiveStatus = new JLabel("Passive mode unavailable");
    private final JLabel assetStatus = new JLabel("Visual catalogue ready");
    private final JButton openWorldButton = new JButton("Open World");
    private final JButton refreshButton = new JButton("Refresh");
    private final JButton configureAssetsButton = new JButton("Configure Assets");
    private final JButton enablePassiveButton = new JButton("Run Passive");
    private final JButton disablePassiveButton = new JButton("Pause Passive");
    private final JButton worldOverviewButton = new JButton("World Overview");
    private final JButton zoomInButton = new JButton("Zoom +");
    private final JButton zoomOutButton = new JButton("Zoom -");
    private final JButton fitMapButton = new JButton("Fit World");
    private final JSpinner cadenceSeconds = new JSpinner(new SpinnerNumberModel(5, 1, 3600, 1));
    private final JSpinner ticksPerCycle = new JSpinner(new SpinnerNumberModel(1, 1, 1000, 1));
    private final JTextArea details = new JTextArea();
    private final EuropaMapCanvas canvas = new EuropaMapCanvas(assets);
    private final JScrollPane mapScroll = new JScrollPane(canvas);
    private final Timer refreshTimer = new Timer(2000, event -> refresh());

    private WorldPaths world;
    private Path lastDirectory;
    private AutoCloseable subscription;
    private AutoCloseable passiveSubscription;
    private LoadedMap lastLoaded;
    private Selection selection = Selection.world();
    private boolean passiveControlsInitialized;
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
        header.add(assetStatus, BorderLayout.EAST);
        add(header, BorderLayout.NORTH);

        details.setEditable(false);
        details.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 12));
        details.setLineWrap(true);
        details.setWrapStyleWord(true);
        details.setText("Open a normalized desktop world to begin passive observation.\n");

        mapScroll.getVerticalScrollBar().setUnitIncrement(24);
        mapScroll.getHorizontalScrollBar().setUnitIncrement(24);
        JScrollPane detailsScroll = new JScrollPane(details);
        detailsScroll.setPreferredSize(new Dimension(430, 700));
        JSplitPane split = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT, mapScroll, detailsScroll);
        split.setDividerLocation(1040);
        split.setResizeWeight(0.74);
        add(split, BorderLayout.CENTER);

        JPanel simulationControls = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 0));
        simulationControls.add(new JLabel("Cadence seconds:"));
        simulationControls.add(cadenceSeconds);
        simulationControls.add(new JLabel("Ticks per cycle:"));
        simulationControls.add(ticksPerCycle);
        simulationControls.add(enablePassiveButton);
        simulationControls.add(disablePassiveButton);

        JPanel viewControls = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 0));
        viewControls.add(openWorldButton);
        viewControls.add(refreshButton);
        viewControls.add(worldOverviewButton);
        viewControls.add(zoomOutButton);
        viewControls.add(zoomInButton);
        viewControls.add(fitMapButton);
        viewControls.add(configureAssetsButton);

        JPanel footer = new JPanel(new BorderLayout(8, 8));
        footer.setBorder(BorderFactory.createEmptyBorder(0, 12, 10, 12));
        footer.add(simulationControls, BorderLayout.NORTH);
        footer.add(viewControls, BorderLayout.SOUTH);
        add(footer, BorderLayout.SOUTH);

        openWorldButton.addActionListener(event -> chooseWorld());
        refreshButton.addActionListener(event -> refresh());
        enablePassiveButton.addActionListener(event -> enablePassiveMode());
        disablePassiveButton.addActionListener(event -> disablePassiveMode());
        worldOverviewButton.addActionListener(event -> select(Selection.world()));
        zoomInButton.addActionListener(event -> zoomBy(1.25));
        zoomOutButton.addActionListener(event -> zoomBy(0.80));
        fitMapButton.addActionListener(event -> fitWorld());
        configureAssetsButton.addActionListener(event -> {
            DonorAssetSetupWindow window = new DonorAssetSetupWindow();
            window.setLocationRelativeTo(this);
            window.setVisible(true);
        });
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
        passiveControlsInitialized = false;
        canvas.clear();
        canvas.setSelected(selection);
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
                    refresh();
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
                    refresh();
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
            if (!busy) refresh();
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
        if (selectedWorld == null || busy) return;
        setBusy(true, "Loading live map and route evidence…");
        assets.clearCache();
        new SwingWorker<LoadedMap, Void>() {
            @Override protected LoadedMap doInBackground() throws Exception {
                WorldMapRegistry.RegistrySnapshot registry = WorldMapRegistry.load(selectedWorld);
                PassiveWorldRegistry.Snapshot passive = PassiveWorldRegistry.load(selectedWorld);
                return new LoadedMap(registry, passive, assets.coverage());
            }

            @Override protected void done() {
                try {
                    LoadedMap loaded = get();
                    if (!Objects.equals(selectedWorld, world)) return;
                    lastLoaded = loaded;
                    canvas.setSnapshots(loaded.registry(), loaded.passive());
                    canvas.setSelected(selection);
                    renderSelection();
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

    private void select(Selection requested) {
        selection = requested == null ? Selection.world() : requested;
        canvas.setSelected(selection);
        renderSelection();
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

        String text = switch (selection.kind()) {
            case WORLD -> worldDossier(loaded);
            case LOCATION -> loaded.registry().locations().stream()
                    .filter(row -> row.locationId().equals(selection.id())).findFirst()
                    .map(row -> WorldObserverInspector.location(row, loaded.registry(), loaded.passive()))
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
        details.setText(text);
        details.setCaretPosition(0);
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
                loaded.coverage().donorCount(), loaded.coverage().fallbackCount());
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
        refreshButton.setEnabled(!busy && worldOpen);
        configureAssetsButton.setEnabled(!busy);
        worldOverviewButton.setEnabled(!busy && worldOpen);
        enablePassiveButton.setEnabled(!busy && worldOpen && !passiveRunning);
        disablePassiveButton.setEnabled(!busy && passiveRunning);
        cadenceSeconds.setEnabled(!busy && worldOpen && !passiveRunning);
        ticksPerCycle.setEnabled(!busy && worldOpen && !passiveRunning);
        zoomInButton.setEnabled(!busy);
        zoomOutButton.setEnabled(!busy);
        fitMapButton.setEnabled(!busy);
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
        private BufferedImage background;
        private Consumer<Selection> selectionConsumer = ignored -> { };
        private Selection selected = Selection.world();
        private double zoom = 1.0;

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

        void setSnapshots(WorldMapRegistry.RegistrySnapshot registry, PassiveWorldRegistry.Snapshot passive) {
            this.registry = registry;
            this.passive = passive;
            icons.clear();
            background = null;
            repaint();
        }

        void clear() {
            registry = null;
            passive = null;
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
                drawRoutes(g, positions);
                drawLocations(g, positions);
                drawVessels(g, positions);
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
                VisualRole role = locationRole(row);
                int size = row.station() ? 38 : 30;
                BufferedImage icon = icon(role, size, size);
                g.drawImage(icon, point.x - size / 2, point.y - size / 2, null);
                boolean selectedLocation = selected.kind() == SelectionKind.LOCATION
                        && row.locationId().equals(selected.id());
                if (selectedLocation) {
                    g.setStroke(new BasicStroke(3f));
                    g.setColor(new Color(245, 230, 155));
                    g.drawOval(point.x - size / 2 - 6, point.y - size / 2 - 6, size + 12, size + 12);
                    g.setStroke(new BasicStroke(1f));
                }
                g.setColor(new Color(225, 236, 226));
                g.setFont(getFont().deriveFont(row.station() ? Font.BOLD : Font.PLAIN, row.station() ? 12f : 11f));
                g.drawString(row.displayName(), point.x + size / 2 + 4, point.y + 4);
                Rectangle bounds = new Rectangle(point.x - size / 2, point.y - size / 2, size, size);
                hitRegions.add(new HitRegion(bounds,
                        row.displayName() + " · ring " + row.ring() + " · level " + row.locationLevel()
                                + " · " + blank(row.locationType())
                                + (row.faction() == null ? "" : " · " + row.faction()),
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
