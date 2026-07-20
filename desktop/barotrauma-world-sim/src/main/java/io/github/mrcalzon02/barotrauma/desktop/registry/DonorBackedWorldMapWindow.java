package io.github.mrcalzon02.barotrauma.desktop.registry;

import io.github.mrcalzon02.barotrauma.assets.BarotraumaAssetCatalogue;
import io.github.mrcalzon02.barotrauma.assets.BarotraumaAssetCatalogue.GraphicSource;
import io.github.mrcalzon02.barotrauma.assets.BarotraumaAssetCatalogue.VisualRole;
import io.github.mrcalzon02.barotrauma.desktop.assets.DonorAssetSetupWindow;
import io.github.mrcalzon02.barotrauma.desktop.session.DesktopWorldSession;
import io.github.mrcalzon02.barotrauma.persistence.PassiveWorldRegistry;
import io.github.mrcalzon02.barotrauma.persistence.WorldMapRegistry;
import io.github.mrcalzon02.barotrauma.persistence.WorldMapRegistry.LocationRow;
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
import javax.swing.JSplitPane;
import javax.swing.JTextArea;
import javax.swing.SwingUtilities;
import javax.swing.SwingWorker;
import javax.swing.UIManager;
import javax.swing.WindowConstants;
import java.awt.AlphaComposite;
import java.awt.BasicStroke;
import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.Point;
import java.awt.Rectangle;
import java.awt.RenderingHints;
import java.awt.event.MouseEvent;
import java.awt.image.BufferedImage;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ExecutionException;

/** Graphical normalized Europa map using local Barotrauma textures or independent procedural fallbacks. */
public final class DonorBackedWorldMapWindow extends JFrame {
    private final DesktopWorldSession session = DesktopWorldSession.global();
    private final BarotraumaAssetCatalogue assets = new BarotraumaAssetCatalogue();
    private final JLabel worldStatus = new JLabel("No desktop world open");
    private final JLabel assetStatus = new JLabel("Visual catalogue ready");
    private final JButton openWorldButton = new JButton("Open World");
    private final JButton refreshButton = new JButton("Refresh");
    private final JButton configureAssetsButton = new JButton("Configure Assets");
    private final JTextArea details = new JTextArea();
    private final EuropaMapCanvas canvas = new EuropaMapCanvas(assets);

    private WorldPaths world;
    private Path lastDirectory;
    private AutoCloseable subscription;
    private boolean busy;

    public DonorBackedWorldMapWindow() {
        super("Barotrauma Graphical Europa Map");
        setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
        setMinimumSize(new Dimension(1080, 720));
        setSize(1500, 920);
        setLocationByPlatform(true);
        setLayout(new BorderLayout(10, 10));

        JPanel header = new JPanel(new BorderLayout(12, 6));
        header.setBorder(BorderFactory.createEmptyBorder(10, 12, 0, 12));
        header.add(worldStatus, BorderLayout.WEST);
        header.add(assetStatus, BorderLayout.EAST);
        add(header, BorderLayout.NORTH);

        details.setEditable(false);
        details.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 12));
        details.setLineWrap(true);
        details.setWrapStyleWord(true);
        details.setText("Open a normalized desktop world to render its locations and active NPC routes.\n");

        JScrollPane mapScroll = new JScrollPane(canvas);
        mapScroll.getVerticalScrollBar().setUnitIncrement(24);
        mapScroll.getHorizontalScrollBar().setUnitIncrement(24);
        JScrollPane detailsScroll = new JScrollPane(details);
        detailsScroll.setPreferredSize(new Dimension(360, 700));
        JSplitPane split = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT, mapScroll, detailsScroll);
        split.setDividerLocation(1080);
        split.setResizeWeight(0.78);
        add(split, BorderLayout.CENTER);

        JPanel footer = new JPanel();
        footer.add(openWorldButton);
        footer.add(refreshButton);
        footer.add(configureAssetsButton);
        footer.setBorder(BorderFactory.createEmptyBorder(0, 12, 10, 12));
        add(footer, BorderLayout.SOUTH);

        openWorldButton.addActionListener(event -> chooseWorld());
        refreshButton.addActionListener(event -> refresh());
        configureAssetsButton.addActionListener(event -> {
            DonorAssetSetupWindow window = new DonorAssetSetupWindow();
            window.setLocationRelativeTo(this);
            window.setVisible(true);
        });
        subscription = session.addListener(this::activateWorld, true);
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
        canvas.clear();
        if (selectedWorld == null) {
            worldStatus.setText("No desktop world open");
            details.setText("Open a normalized desktop world to render its locations and active NPC routes.\n");
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
        setBusy(true, "Loading map and route evidence…");
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
                    canvas.setSnapshots(loaded.registry(), loaded.passive());
                    renderDetails(loaded);
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

    private void renderDetails(LoadedMap loaded) {
        var summary = loaded.registry().summary();
        long activeVessels = loaded.passive().vessels().stream()
                .filter(vessel -> !"DOCKED".equals(vessel.status()) && !"LOST".equals(vessel.status()))
                .count();
        long damagedVessels = loaded.passive().vessels().stream()
                .filter(vessel -> vessel.hull() < 40 || "DISABLED".equals(vessel.status()) || "LOST".equals(vessel.status()))
                .count();
        String donorRoot = assets.activeDonor().map(candidate -> candidate.installationRoot().toString())
                .orElse("No active Barotrauma installation; procedural fallback visuals are in use.");
        details.setText("GRAPHICAL EUROPA MAP\n\n"
                + "World: " + summary.displayName() + "\n"
                + "Master world: " + blank(summary.masterWorldId()) + "\n"
                + "Canonical time: " + nullable(summary.canonicalTime()) + "\n"
                + "Locations: " + loaded.registry().locations().size() + "\n"
                + "Stations: " + loaded.registry().stations().size() + "\n"
                + "NPC vessels: " + loaded.passive().vessels().size() + "\n"
                + "Active routes: " + activeVessels + "\n"
                + "Damaged or lost vessels: " + damagedVessels + "\n\n"
                + "Visual source:\n" + donorRoot + "\n\n"
                + "Donor-backed roles: " + loaded.coverage().donorCount() + "\n"
                + "Procedural fallbacks: " + loaded.coverage().fallbackCount() + "\n\n"
                + "The map resolves Barotrauma style-sheet atlas entries before filename matches. Hover over a "
                + "location or vessel marker for current evidence. Route lines connect a vessel's current location "
                + "to its declared destination.\n\nLEGEND\n"
                + "Outpost hexagon · location circle · cave arch · ruin grid · beacon mast · wreck crossed hull · "
                + "submarine silhouette · hostile fauna marker · radiation trefoil.\n");
        details.setCaretPosition(0);
    }

    private void setBusy(boolean value, String message) {
        busy = value;
        assetStatus.setText(message);
        refreshControls();
    }

    private void refreshControls() {
        openWorldButton.setEnabled(!busy);
        refreshButton.setEnabled(!busy && world != null);
        configureAssetsButton.setEnabled(!busy);
    }

    private void showFailure(String title, Throwable throwable) {
        assetStatus.setText(title);
        details.append("\n" + title + "\n" + throwable.getClass().getSimpleName() + ": "
                + throwable.getMessage() + "\n");
        JOptionPane.showMessageDialog(this, throwable.getMessage(), title, JOptionPane.ERROR_MESSAGE);
    }

    @Override public void dispose() {
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

    private record LoadedMap(WorldMapRegistry.RegistrySnapshot registry, PassiveWorldRegistry.Snapshot passive,
                             BarotraumaAssetCatalogue.CoverageReport coverage) { }

    private static final class EuropaMapCanvas extends JPanel {
        private static final int MAP_WIDTH = 1500;
        private static final int MAP_HEIGHT = 900;
        private static final int MARGIN = 70;

        private final BarotraumaAssetCatalogue assets;
        private final Map<VisualRole, BufferedImage> icons = new EnumMap<>(VisualRole.class);
        private final List<HitRegion> hitRegions = new ArrayList<>();
        private WorldMapRegistry.RegistrySnapshot registry;
        private PassiveWorldRegistry.Snapshot passive;
        private BufferedImage background;

        private EuropaMapCanvas(BarotraumaAssetCatalogue assets) {
            this.assets = assets;
            setPreferredSize(new Dimension(MAP_WIDTH, MAP_HEIGHT));
            setMinimumSize(new Dimension(900, 600));
            setOpaque(true);
            setToolTipText("");
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
                try { background = assets.loadImage(VisualRole.MAP_BACKGROUND, Math.max(1, getWidth()), Math.max(1, getHeight())); }
                catch (Exception exception) { background = null; }
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
            g.setStroke(new BasicStroke(2f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND,
                    10f, new float[]{8f, 8f}, 0f));
            for (var vessel : passive.vessels()) {
                if (vessel.destinationLocation() == null) continue;
                Point from = positions.get(vessel.currentLocation());
                Point to = positions.get(vessel.destinationLocation());
                if (from == null || to == null) continue;
                g.setColor(routeColor(vessel.status()));
                g.drawLine(from.x, from.y, to.x, to.y);
                drawArrow(g, from, to);
            }
            g.setStroke(new BasicStroke(1f));
        }

        private void drawLocations(Graphics2D g, Map<String, Point> positions) {
            List<LocationRow> rows = registry.locations().stream()
                    .sorted(Comparator.comparing(LocationRow::station))
                    .toList();
            for (LocationRow row : rows) {
                Point point = positions.get(row.displayName());
                if (point == null) continue;
                VisualRole role = locationRole(row);
                int size = row.station() ? 38 : 30;
                BufferedImage icon = icon(role, size, size);
                g.drawImage(icon, point.x - size / 2, point.y - size / 2, null);
                g.setColor(new Color(225, 236, 226));
                g.setFont(getFont().deriveFont(row.station() ? Font.BOLD : Font.PLAIN, row.station() ? 12f : 11f));
                String label = row.displayName();
                g.drawString(label, point.x + size / 2 + 4, point.y + 4);
                Rectangle bounds = new Rectangle(point.x - size / 2, point.y - size / 2, size, size);
                hitRegions.add(new HitRegion(bounds, label + " · ring " + row.ring() + " · level "
                        + row.locationLevel() + " · " + blank(row.locationType())
                        + (row.faction() == null ? "" : " · " + row.faction())));
            }
        }

        private void drawVessels(Graphics2D g, Map<String, Point> positions) {
            if (passive == null) return;
            Map<String, Integer> offsets = new HashMap<>();
            for (var vessel : passive.vessels()) {
                Point base = positions.get(vessel.currentLocation());
                if (base == null) continue;
                int offset = offsets.merge(vessel.currentLocation(), 1, Integer::sum) - 1;
                double angle = offset * Math.PI * 0.65;
                int x = base.x + (int) Math.round(Math.cos(angle) * (24 + offset * 5));
                int y = base.y + (int) Math.round(Math.sin(angle) * (24 + offset * 5));
                VisualRole role = "LOST".equals(vessel.status()) ? VisualRole.WRECK_MARKER
                        : "DISABLED".equals(vessel.status()) ? VisualRole.BROKEN_STATUS
                        : VisualRole.SUBMARINE_MARKER;
                int size = 28;
                g.drawImage(icon(role, size, size), x - size / 2, y - size / 2, null);
                g.setColor(routeColor(vessel.status()));
                g.drawOval(x - size / 2 - 2, y - size / 2 - 2, size + 4, size + 4);
                hitRegions.add(new HitRegion(new Rectangle(x - size / 2, y - size / 2, size, size),
                        vessel.name() + " · " + vessel.role() + " · " + vessel.status()
                                + " · hull " + vessel.hull() + "% · supplies " + vessel.supplies()
                                + (vessel.destinationLocation() == null ? "" : " · destination " + vessel.destinationLocation())));
            }
        }

        private void drawSourceBadge(Graphics2D g) {
            String text = assets.activeDonor().isPresent() ? "Barotrauma donor textures active" : "Procedural fallback visuals";
            g.setFont(getFont().deriveFont(Font.BOLD, 12f));
            int width = g.getFontMetrics().stringWidth(text) + 24;
            int x = getWidth() - width - 16;
            int y = getHeight() - 40;
            g.setColor(new Color(4, 15, 20, 210));
            g.fillRoundRect(x, y, width, 26, 12, 12);
            g.setColor(assets.activeDonor().isPresent() ? new Color(129, 205, 188) : new Color(226, 177, 92));
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
            List<LocationRow> mapped = locations.stream().filter(row -> row.mapX() != null && row.mapY() != null).toList();
            if (mapped.size() >= 2) {
                double minX = mapped.stream().mapToDouble(LocationRow::mapX).min().orElse(0);
                double maxX = mapped.stream().mapToDouble(LocationRow::mapX).max().orElse(1);
                double minY = mapped.stream().mapToDouble(LocationRow::mapY).min().orElse(0);
                double maxY = mapped.stream().mapToDouble(LocationRow::mapY).max().orElse(1);
                double rangeX = Math.max(1.0, maxX - minX);
                double rangeY = Math.max(1.0, maxY - minY);
                for (LocationRow row : locations) {
                    if (row.mapX() == null || row.mapY() == null) continue;
                    int x = MARGIN + (int) Math.round((row.mapX() - minX) / rangeX * Math.max(1, width - MARGIN * 2));
                    int y = MARGIN + (int) Math.round((row.mapY() - minY) / rangeY * Math.max(1, height - MARGIN * 2));
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
                if (region.bounds().contains(event.getPoint())) return region.text();
            }
            return null;
        }

        private record HitRegion(Rectangle bounds, String text) { }
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
