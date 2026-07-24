package io.github.mrcalzon02.barotrauma.desktop.ui;

import io.github.mrcalzon02.barotrauma.assets.BarotraumaAssetCatalogue;
import io.github.mrcalzon02.barotrauma.assets.BarotraumaAssetCatalogue.VisualRole;

import javax.swing.AbstractButton;
import javax.swing.BorderFactory;
import javax.swing.ButtonModel;
import javax.swing.Icon;
import javax.swing.JComponent;
import javax.swing.JPanel;
import javax.swing.JProgressBar;
import javax.swing.JRootPane;
import javax.swing.JTabbedPane;
import javax.swing.SwingUtilities;
import javax.swing.UIManager;
import javax.swing.border.BevelBorder;
import javax.swing.border.CompoundBorder;
import javax.swing.border.EtchedBorder;
import javax.swing.border.LineBorder;
import javax.swing.border.TitledBorder;
import javax.swing.plaf.ComponentUI;
import javax.swing.plaf.basic.BasicButtonUI;
import javax.swing.plaf.basic.BasicPanelUI;
import javax.swing.plaf.basic.BasicProgressBarUI;
import javax.swing.plaf.basic.BasicTabbedPaneUI;
import java.awt.AlphaComposite;
import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.Insets;
import java.awt.Rectangle;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Canonical Swing presentation for the Barotrauma desktop runtime.
 *
 * <p>The theme consumes the same authoritative donor/packaged/procedural catalogue used by the graphical world map.
 * It changes Swing's base UI delegates before application components are constructed; it does not walk completed
 * windows, mutate component trees after creation, or maintain a second visual pipeline.</p>
 */
public final class BarotraumaDesktopTheme {
    private static final AtomicBoolean INSTALLED = new AtomicBoolean();
    private static final BarotraumaAssetCatalogue ASSETS = new BarotraumaAssetCatalogue();
    private static final Map<ImageKey, BufferedImage> IMAGE_CACHE = new ConcurrentHashMap<>();

    private static final Color OCEAN = new Color(7, 18, 24);
    private static final Color DEEP_PANEL = new Color(10, 24, 30);
    private static final Color TEXT = new Color(224, 237, 232);
    private static final Color MUTED_TEXT = new Color(151, 176, 169);
    private static final Color ACCENT = new Color(83, 191, 173);
    private static final Color WARNING = new Color(230, 170, 72);
    private static final Color SELECTION = new Color(28, 87, 83);

    private BarotraumaDesktopTheme() { }

    /** Installs the atlas-backed delegates into Swing's authoritative defaults table. */
    public static void install() {
        if (!INSTALLED.compareAndSet(false, true)) return;

        UIManager.put("PanelUI", AtlasPanelUI.class.getName());
        UIManager.put("ButtonUI", AtlasButtonUI.class.getName());
        UIManager.put("ToggleButtonUI", AtlasButtonUI.class.getName());
        UIManager.put("TabbedPaneUI", AtlasTabbedPaneUI.class.getName());
        UIManager.put("ProgressBarUI", AtlasProgressBarUI.class.getName());

        UIManager.put("control", DEEP_PANEL);
        UIManager.put("info", DEEP_PANEL);
        UIManager.put("nimbusBase", OCEAN);
        UIManager.put("nimbusBlueGrey", DEEP_PANEL);
        UIManager.put("nimbusLightBackground", new Color(18, 35, 40));
        UIManager.put("text", TEXT);

        UIManager.put("Panel.background", OCEAN);
        UIManager.put("Label.foreground", TEXT);
        UIManager.put("Label.disabledForeground", MUTED_TEXT);
        UIManager.put("Button.foreground", TEXT);
        UIManager.put("Button.disabledText", MUTED_TEXT);
        UIManager.put("ToggleButton.foreground", TEXT);
        UIManager.put("TabbedPane.foreground", TEXT);
        UIManager.put("TabbedPane.selected", SELECTION);
        UIManager.put("TabbedPane.contentAreaColor", DEEP_PANEL);
        UIManager.put("TabbedPane.focus", ACCENT);
        UIManager.put("List.background", new Color(11, 27, 33));
        UIManager.put("List.foreground", TEXT);
        UIManager.put("List.selectionBackground", SELECTION);
        UIManager.put("List.selectionForeground", Color.WHITE);
        UIManager.put("Table.background", new Color(11, 27, 33));
        UIManager.put("Table.foreground", TEXT);
        UIManager.put("Table.selectionBackground", SELECTION);
        UIManager.put("Table.selectionForeground", Color.WHITE);
        UIManager.put("Table.gridColor", new Color(55, 89, 86));
        UIManager.put("TableHeader.background", new Color(15, 48, 50));
        UIManager.put("TableHeader.foreground", TEXT);
        UIManager.put("TextField.background", new Color(5, 15, 20));
        UIManager.put("TextField.foreground", TEXT);
        UIManager.put("TextField.caretForeground", ACCENT);
        UIManager.put("TextArea.background", new Color(5, 15, 20));
        UIManager.put("TextArea.foreground", TEXT);
        UIManager.put("TextArea.caretForeground", ACCENT);
        UIManager.put("TextPane.background", new Color(5, 15, 20));
        UIManager.put("TextPane.foreground", TEXT);
        UIManager.put("EditorPane.background", new Color(5, 15, 20));
        UIManager.put("EditorPane.foreground", TEXT);
        UIManager.put("ComboBox.background", new Color(11, 27, 33));
        UIManager.put("ComboBox.foreground", TEXT);
        UIManager.put("ScrollPane.background", OCEAN);
        UIManager.put("Viewport.background", new Color(7, 18, 24));
        UIManager.put("ToolTip.background", new Color(8, 29, 34));
        UIManager.put("ToolTip.foreground", TEXT);
        UIManager.put("ToolTip.border", BorderFactory.createLineBorder(ACCENT));
        UIManager.put("TitledBorder.titleColor", ACCENT);
        UIManager.put("Separator.foreground", new Color(52, 100, 94));
        UIManager.put("ProgressBar.foreground", ACCENT);
        UIManager.put("ProgressBar.background", new Color(4, 13, 17));
        UIManager.put("ProgressBar.selectionForeground", Color.WHITE);
        UIManager.put("ProgressBar.selectionBackground", TEXT);

        UIManager.put("OptionPane.informationIcon", icon(VisualRole.NOTIFICATION_ICON, 34, 34));
        UIManager.put("OptionPane.warningIcon", icon(VisualRole.WARNING_ICON, 34, 34));
        UIManager.put("OptionPane.errorIcon", icon(VisualRole.BROKEN_STATUS, 34, 34));
        UIManager.put("OptionPane.questionIcon", icon(VisualRole.RESEARCH_ICON, 34, 34));
        UIManager.put("FileView.directoryIcon", icon(VisualRole.STATION_ICON, 18, 18));
        UIManager.put("FileView.fileIcon", icon(VisualRole.CARGO_ICON, 18, 18));
        UIManager.put("FileView.computerIcon", icon(VisualRole.VESSEL_ICON, 18, 18));
        UIManager.put("Tree.openIcon", icon(VisualRole.OUTPOST_MARKER, 16, 16));
        UIManager.put("Tree.closedIcon", icon(VisualRole.STATION_ICON, 16, 16));
        UIManager.put("Tree.leafIcon", icon(VisualRole.LOCATION_MARKER, 14, 14));
    }

    /** Clears decoded images after the user changes donor-asset configuration. */
    public static void refreshAssets() {
        ASSETS.clearCache();
        IMAGE_CACHE.clear();
    }

    private static Icon icon(VisualRole role, int width, int height) {
        try {
            return ASSETS.loadIcon(role, width, height);
        } catch (Exception ignored) {
            return null;
        }
    }

    private static BufferedImage image(VisualRole role, int width, int height) {
        if (width < 1 || height < 1) return null;
        int unit = role.category() == BarotraumaAssetCatalogue.Category.BACKGROUND ? 64 : 8;
        int decodedWidth = rounded(width, unit);
        int decodedHeight = rounded(height, unit);
        ImageKey key = new ImageKey(role, decodedWidth, decodedHeight);
        if (IMAGE_CACHE.size() > 192) IMAGE_CACHE.clear();
        return IMAGE_CACHE.computeIfAbsent(key, ignored -> {
            try {
                return ASSETS.loadImage(role, decodedWidth, decodedHeight);
            } catch (Exception exception) {
                return null;
            }
        });
    }

    private static int rounded(int value, int unit) {
        return Math.max(unit, ((value + unit - 1) / unit) * unit);
    }

    private static void draw(Graphics graphics, VisualRole role, int x, int y, int width, int height) {
        BufferedImage image = image(role, width, height);
        if (image == null) return;
        Graphics2D g = (Graphics2D) graphics.create();
        try {
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.drawImage(image, x, y, width, height, null);
        } finally {
            g.dispose();
        }
    }

    private static void tint(Graphics graphics, Color color, float alpha, int x, int y, int width, int height) {
        Graphics2D g = (Graphics2D) graphics.create();
        try {
            g.setComposite(AlphaComposite.SrcOver.derive(alpha));
            g.setColor(color);
            g.fillRect(x, y, width, height);
        } finally {
            g.dispose();
        }
    }

    private static boolean isRootContent(JComponent component) {
        JRootPane root = SwingUtilities.getRootPane(component);
        return root != null && root.getContentPane() == component;
    }

    private static boolean isAtlasPanel(JComponent component) {
        var border = component.getBorder();
        return border instanceof TitledBorder
                || border instanceof CompoundBorder
                || border instanceof EtchedBorder
                || border instanceof BevelBorder
                || border instanceof LineBorder;
    }

    public static final class AtlasPanelUI extends BasicPanelUI {
        public static ComponentUI createUI(JComponent component) { return new AtlasPanelUI(); }

        @Override public void installUI(JComponent component) {
            super.installUI(component);
            component.setForeground(TEXT);
        }

        @Override public void update(Graphics graphics, JComponent component) {
            int width = component.getWidth();
            int height = component.getHeight();
            if (isRootContent(component)) {
                draw(graphics, VisualRole.APP_BACKGROUND, 0, 0, width, height);
                tint(graphics, OCEAN, 0.54f, 0, 0, width, height);
            } else if (isAtlasPanel(component)) {
                VisualRole role = component.getBorder() instanceof TitledBorder
                        ? VisualRole.INNER_PANEL : VisualRole.PANEL;
                draw(graphics, role, 0, 0, width, height);
                tint(graphics, DEEP_PANEL, 0.70f, 0, 0, width, height);
            } else if (component.isOpaque()) {
                graphics.setColor(component.getBackground());
                graphics.fillRect(0, 0, width, height);
            }
            paint(graphics, component);
        }
    }

    public static final class AtlasButtonUI extends BasicButtonUI {
        public static ComponentUI createUI(JComponent component) { return new AtlasButtonUI(); }

        @Override protected void installDefaults(AbstractButton button) {
            super.installDefaults(button);
            button.setOpaque(false);
            button.setContentAreaFilled(false);
            button.setBorderPainted(false);
            button.setFocusPainted(false);
            button.setForeground(TEXT);
            button.setMargin(new Insets(7, 13, 7, 13));
        }

        @Override public void paint(Graphics graphics, JComponent component) {
            AbstractButton button = (AbstractButton) component;
            ButtonModel model = button.getModel();
            draw(graphics, VisualRole.BUTTON, 0, 0, component.getWidth(), component.getHeight());
            if (!model.isEnabled()) {
                tint(graphics, OCEAN, 0.66f, 0, 0, component.getWidth(), component.getHeight());
            } else if (model.isPressed() || model.isSelected()) {
                tint(graphics, SELECTION, 0.48f, 0, 0, component.getWidth(), component.getHeight());
            } else if (model.isRollover()) {
                tint(graphics, ACCENT, 0.18f, 0, 0, component.getWidth(), component.getHeight());
            } else {
                tint(graphics, DEEP_PANEL, 0.18f, 0, 0, component.getWidth(), component.getHeight());
            }
            super.paint(graphics, component);
        }
    }

    public static final class AtlasTabbedPaneUI extends BasicTabbedPaneUI {
        public static ComponentUI createUI(JComponent component) { return new AtlasTabbedPaneUI(); }

        @Override protected void installDefaults() {
            super.installDefaults();
            tabPane.setOpaque(false);
            tabPane.setForeground(TEXT);
            tabPane.setFont(tabPane.getFont().deriveFont(Font.BOLD));
            selectedTabPadInsets = new Insets(2, 2, 2, 2);
            tabInsets = new Insets(7, 13, 7, 13);
        }

        @Override protected void paintTabBackground(Graphics graphics, int tabPlacement, int tabIndex,
                                                     int x, int y, int width, int height, boolean selected) {
            draw(graphics, VisualRole.TAB, x, y, width, height);
            tint(graphics, selected ? SELECTION : DEEP_PANEL, selected ? 0.34f : 0.26f,
                    x, y, width, height);
        }

        @Override protected void paintTabBorder(Graphics graphics, int tabPlacement, int tabIndex,
                                                 int x, int y, int width, int height, boolean selected) {
            Graphics2D g = (Graphics2D) graphics.create();
            try {
                g.setColor(selected ? ACCENT : new Color(53, 90, 87));
                g.drawRoundRect(x, y, Math.max(0, width - 1), Math.max(0, height - 1), 8, 8);
            } finally {
                g.dispose();
            }
        }

        @Override protected void paintFocusIndicator(Graphics graphics, int tabPlacement, Rectangle[] rectangles,
                                                       int tabIndex, Rectangle iconRect, Rectangle textRect,
                                                       boolean selected) {
            // The selected atlas tab and accent border provide the focus indication without a second dotted layer.
        }
    }

    public static final class AtlasProgressBarUI extends BasicProgressBarUI {
        public static ComponentUI createUI(JComponent component) { return new AtlasProgressBarUI(); }

        @Override protected void installDefaults() {
            super.installDefaults();
            progressBar.setOpaque(false);
            progressBar.setBorder(BorderFactory.createEmptyBorder(2, 2, 2, 2));
            progressBar.setForeground(ACCENT);
        }

        @Override protected void paintDeterminate(Graphics graphics, JComponent component) {
            Insets insets = progressBar.getInsets();
            int width = progressBar.getWidth() - insets.left - insets.right;
            int height = progressBar.getHeight() - insets.top - insets.bottom;
            if (width <= 0 || height <= 0) return;
            draw(graphics, VisualRole.PROGRESS_TRACK, insets.left, insets.top, width, height);
            int amount = getAmountFull(insets, width, height);
            Graphics2D fill = (Graphics2D) graphics.create();
            try {
                if (progressBar.getOrientation() == JProgressBar.HORIZONTAL) {
                    fill.clipRect(insets.left, insets.top, Math.max(0, amount), height);
                } else {
                    fill.clipRect(insets.left, insets.top + height - amount, width, Math.max(0, amount));
                }
                draw(fill, VisualRole.PROGRESS_FILL, insets.left, insets.top, width, height);
            } finally {
                fill.dispose();
            }
            if (progressBar.isStringPainted()) {
                paintString(graphics, insets.left, insets.top, width, height, amount, insets);
            }
        }

        @Override protected void paintIndeterminate(Graphics graphics, JComponent component) {
            Insets insets = progressBar.getInsets();
            int width = progressBar.getWidth() - insets.left - insets.right;
            int height = progressBar.getHeight() - insets.top - insets.bottom;
            if (width <= 0 || height <= 0) return;
            draw(graphics, VisualRole.PROGRESS_TRACK, insets.left, insets.top, width, height);
            Rectangle box = getBox(boxRect);
            if (box != null) {
                Graphics2D fill = (Graphics2D) graphics.create();
                try {
                    fill.clip(box);
                    draw(fill, VisualRole.PROGRESS_FILL, insets.left, insets.top, width, height);
                } finally {
                    fill.dispose();
                }
            }
            if (progressBar.isStringPainted()) {
                paintString(graphics, insets.left, insets.top, width, height, 0, insets);
            }
        }
    }

    public static void verifyContract() throws Exception {
        install();
        require(UIManager.get("PanelUI").equals(AtlasPanelUI.class.getName()),
                "The desktop panel atlas delegate is not installed.");
        require(UIManager.get("ButtonUI").equals(AtlasButtonUI.class.getName()),
                "The desktop button atlas delegate is not installed.");

        JPanel root = new JPanel();
        root.setSize(640, 360);
        JPanel card = new JPanel();
        card.setBorder(BorderFactory.createEtchedBorder());
        card.setSize(320, 180);
        javax.swing.JButton button = new javax.swing.JButton("Atlas control");
        button.setSize(180, 42);
        JTabbedPane tabs = new JTabbedPane();
        tabs.addTab("Operations", new JPanel());
        tabs.setSize(320, 180);
        JProgressBar progress = new JProgressBar(0, 100);
        progress.setValue(65);
        progress.setSize(260, 24);

        require(root.getUI() instanceof AtlasPanelUI && card.getUI() instanceof AtlasPanelUI,
                "New Swing panels did not use the atlas-backed delegate.");
        require(button.getUI() instanceof AtlasButtonUI,
                "New Swing buttons did not use the atlas-backed delegate.");
        require(tabs.getUI() instanceof AtlasTabbedPaneUI,
                "New Swing tabs did not use the atlas-backed delegate.");
        require(progress.getUI() instanceof AtlasProgressBarUI,
                "New Swing progress bars did not use the atlas-backed delegate.");

        paint(root, 640, 360);
        paint(card, 320, 180);
        paint(button, 180, 42);
        paint(tabs, 320, 180);
        paint(progress, 260, 24);

        require(ASSETS.loadImage(VisualRole.APP_BACKGROUND, 640, 360) != null,
                "The packaged application background could not be decoded.");
        require(ASSETS.loadImage(VisualRole.BUTTON, 180, 42) != null,
                "The packaged button atlas asset could not be decoded.");
        require(ASSETS.loadImage(VisualRole.VESSEL_ICON, 32, 32) != null,
                "The packaged vessel icon could not be decoded.");
    }

    private static void paint(JComponent component, int width, int height) {
        BufferedImage target = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = target.createGraphics();
        try {
            component.setSize(width, height);
            component.doLayout();
            component.paint(graphics);
        } finally {
            graphics.dispose();
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    private record ImageKey(VisualRole role, int width, int height) {
        private ImageKey {
            Objects.requireNonNull(role, "role");
        }
    }
}