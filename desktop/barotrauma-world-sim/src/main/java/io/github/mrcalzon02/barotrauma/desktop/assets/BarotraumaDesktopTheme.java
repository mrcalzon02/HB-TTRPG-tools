package io.github.mrcalzon02.barotrauma.desktop.assets;

import io.github.mrcalzon02.barotrauma.assets.BarotraumaAssetCatalogue;
import io.github.mrcalzon02.barotrauma.assets.BarotraumaAssetCatalogue.VisualRole;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

/** Construction-time visual authority for the desktop client. */
public final class BarotraumaDesktopTheme {
    public static final Color DEEP = new Color(7, 15, 20);
    public static final Color SURFACE = new Color(14, 27, 34);
    public static final Color SURFACE_ALT = new Color(20, 38, 46);
    public static final Color EDGE = new Color(63, 142, 151);
    public static final Color TEXT = new Color(226, 236, 231);

    private static final BarotraumaAssetCatalogue ASSETS = new BarotraumaAssetCatalogue();
    private static final Map<String, ImageIcon> ICONS = new ConcurrentHashMap<>();
    private static final Map<VisualRole, BufferedImage> BACKGROUNDS = new ConcurrentHashMap<>();

    private BarotraumaDesktopTheme() { }

    public static void install() {
        UIManager.put("Panel.background", SURFACE);
        UIManager.put("Label.foreground", TEXT);
        UIManager.put("Button.background", SURFACE_ALT);
        UIManager.put("Button.foreground", TEXT);
        UIManager.put("List.background", new Color(9, 20, 26));
        UIManager.put("List.foreground", TEXT);
        UIManager.put("List.selectionBackground", new Color(30, 73, 79));
        UIManager.put("List.selectionForeground", TEXT);
        UIManager.put("Table.background", new Color(10, 22, 28));
        UIManager.put("Table.foreground", TEXT);
        UIManager.put("Table.gridColor", new Color(42, 78, 84));
        UIManager.put("Table.selectionBackground", new Color(35, 82, 88));
        UIManager.put("Table.selectionForeground", TEXT);
        UIManager.put("TableHeader.background", SURFACE_ALT);
        UIManager.put("TableHeader.foreground", TEXT);
        UIManager.put("TabbedPane.background", SURFACE);
        UIManager.put("TabbedPane.foreground", TEXT);
        UIManager.put("TabbedPane.selected", new Color(29, 61, 67));
        UIManager.put("TextArea.background", new Color(8, 18, 23));
        UIManager.put("TextArea.foreground", TEXT);
        UIManager.put("TextArea.caretForeground", TEXT);
        UIManager.put("Viewport.background", DEEP);
        UIManager.put("SplitPane.background", DEEP);
    }

    public static JPanel scenePanel(VisualRole role, LayoutManager layout) {
        return new ScenePanel(role, layout, 0.70f);
    }

    public static JPanel scenePanel(VisualRole role, LayoutManager layout, float overlay) {
        return new ScenePanel(role, layout, overlay);
    }

    public static JPanel surfacePanel() { return new SurfacePanel(); }

    public static JPanel surfacePanel(LayoutManager layout) {
        JPanel panel = new SurfacePanel();
        panel.setLayout(layout);
        return panel;
    }

    public static ImageIcon icon(VisualRole role, int width, int height) {
        String key = role + ":" + width + "x" + height;
        return ICONS.computeIfAbsent(key, ignored -> {
            try { return ASSETS.loadIcon(role, width, height); }
            catch (Exception failure) {
                return new ImageIcon(new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB));
            }
        });
    }

    public static void styleButton(JButton button, VisualRole role) {
        Objects.requireNonNull(button, "button");
        button.setIcon(icon(role, 20, 20));
        button.setIconTextGap(8);
        button.setFocusPainted(false);
        button.setForeground(TEXT);
        button.setBackground(SURFACE_ALT);
        button.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(EDGE, 1, true), new EmptyBorder(7, 11, 7, 11)));
    }

    public static void styleTable(JTable table) {
        table.setBackground(new Color(9, 20, 26));
        table.setForeground(TEXT);
        table.setGridColor(new Color(42, 78, 84));
        table.setSelectionBackground(new Color(35, 82, 88));
        table.setSelectionForeground(TEXT);
        table.setRowHeight(Math.max(22, table.getRowHeight()));
        table.getTableHeader().setBackground(SURFACE_ALT);
        table.getTableHeader().setForeground(TEXT);
    }

    public static void styleTextArea(JTextArea area) {
        area.setBackground(new Color(8, 18, 23));
        area.setForeground(TEXT);
        area.setCaretColor(TEXT);
        area.setBorder(new EmptyBorder(12, 12, 12, 12));
    }

    public static JScrollPane styleScrollPane(JScrollPane pane) {
        pane.getViewport().setBackground(new Color(8, 18, 23));
        pane.setBorder(BorderFactory.createLineBorder(new Color(48, 91, 97)));
        return pane;
    }

    public static VisualRole workspaceIcon(String id) {
        return switch (id) {
            case "active-submarine", "submarines" -> VisualRole.VESSEL_ICON;
            case "world-map" -> VisualRole.LOCATION_MARKER;
            case "observation-center", "campaign-journal" -> VisualRole.NOTIFICATION_ICON;
            case "crew", "factions" -> VisualRole.CREW_ICON;
            case "stations-economy", "cargo-catalogue" -> VisualRole.CARGO_ICON;
            case "civilization-frontier" -> VisualRole.STATION_ICON;
            case "natural-world" -> VisualRole.FAUNA_ICON;
            case "routes-jobs" -> VisualRole.MISSION_ICON;
            case "encounters" -> VisualRole.WARNING_ICON;
            case "workshop-research", "reference-library" -> VisualRole.RESEARCH_ICON;
            case "import-center" -> VisualRole.SAVING_STATUS;
            case "simulation-monitor" -> VisualRole.GLOW;
            case "settings-backups" -> VisualRole.GEOLOGY_ICON;
            default -> VisualRole.STATION_ICON;
        };
    }

    public static VisualRole actionIcon(String text) {
        String lower = text.toLowerCase(Locale.ROOT);
        if (contains(lower, "world", "map")) return VisualRole.LOCATION_MARKER;
        if (contains(lower, "observation", "journal")) return VisualRole.NOTIFICATION_ICON;
        if (contains(lower, "submarine", "vessel", "transit")) return VisualRole.VESSEL_ICON;
        if (contains(lower, "station", "frontier")) return VisualRole.STATION_ICON;
        if (contains(lower, "natural", "fauna", "fleet")) return VisualRole.FAUNA_ICON;
        if (contains(lower, "logistics", "freight", "cargo")) return VisualRole.CARGO_ICON;
        if (contains(lower, "research", "workshop")) return VisualRole.RESEARCH_ICON;
        if (contains(lower, "import", "create", "default")) return VisualRole.SAVING_STATUS;
        if (contains(lower, "asset", "setting")) return VisualRole.GEOLOGY_ICON;
        if (contains(lower, "simulation", "passive")) return VisualRole.GLOW;
        return VisualRole.MISSION_ICON;
    }

    private static boolean contains(String value, String... terms) {
        for (String term : terms) if (value.contains(term)) return true;
        return false;
    }

    private static BufferedImage background(VisualRole role) {
        return BACKGROUNDS.computeIfAbsent(role, key -> {
            try { return ASSETS.loadImage(key, 1920, 1080); }
            catch (Exception failure) { return new BufferedImage(1920, 1080, BufferedImage.TYPE_INT_ARGB); }
        });
    }

    private static final class ScenePanel extends JPanel {
        private final BufferedImage image;
        private final float overlay;

        private ScenePanel(VisualRole role, LayoutManager layout, float overlay) {
            super(layout);
            image = background(Objects.requireNonNull(role, "role"));
            this.overlay = Math.max(0f, Math.min(0.95f, overlay));
        }

        @Override protected void paintComponent(Graphics graphics) {
            super.paintComponent(graphics);
            Graphics2D g = (Graphics2D) graphics.create();
            try {
                g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
                double scale = Math.max(getWidth() / (double) image.getWidth(), getHeight() / (double) image.getHeight());
                int width = Math.max(1, (int) Math.round(image.getWidth() * scale));
                int height = Math.max(1, (int) Math.round(image.getHeight() * scale));
                g.drawImage(image, (getWidth() - width) / 2, (getHeight() - height) / 2, width, height, null);
                g.setComposite(AlphaComposite.SrcOver.derive(overlay));
                g.setColor(DEEP);
                g.fillRect(0, 0, getWidth(), getHeight());
            } finally { g.dispose(); }
        }
    }

    private static final class SurfacePanel extends JPanel {
        private SurfacePanel() {
            setOpaque(false);
            setBorder(new EmptyBorder(16, 16, 16, 16));
        }

        @Override protected void paintComponent(Graphics graphics) {
            super.paintComponent(graphics);
            Graphics2D g = (Graphics2D) graphics.create();
            try {
                g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                g.setComposite(AlphaComposite.SrcOver.derive(0.88f));
                g.setColor(SURFACE);
                g.fillRoundRect(0, 0, getWidth() - 1, getHeight() - 1, 16, 16);
                g.setComposite(AlphaComposite.SrcOver);
                g.setStroke(new BasicStroke(1f));
                g.setColor(new Color(EDGE.getRed(), EDGE.getGreen(), EDGE.getBlue(), 150));
                g.drawRoundRect(0, 0, getWidth() - 1, getHeight() - 1, 16, 16);
            } finally { g.dispose(); }
        }
    }
}
