package io.github.mrcalzon02.barotrauma.assets;

import javax.imageio.ImageIO;
import javax.swing.ImageIcon;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JScrollPane;
import javax.swing.SwingUtilities;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.GraphicsEnvironment;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

/**
 * Development preview for approved packaged UI atlas slices.
 *
 * <p>This is intentionally a review surface rather than a second asset catalogue. Every image is loaded by
 * semantic name from {@link UiAtlasSliceIndex}, so boundary and assignment corrections remain authoritative in
 * one place. The preview uses the source crops directly and does not export replacement sprites.</p>
 */
public final class UiAtlasImplementationPreview {
    private static final int WIDTH = 1600;
    private static final int HEIGHT = 1120;
    private static final Color BACKGROUND = new Color(4, 9, 12);
    private static final Color SECTION = new Color(10, 20, 25);
    private static final Color BORDER = new Color(91, 157, 161);
    private static final Color TEXT = new Color(214, 229, 218);
    private static final Color MUTED = new Color(142, 172, 168);

    private UiAtlasImplementationPreview() { }

    public static BufferedImage renderMedicalPreview() throws IOException {
        UiAtlasSliceIndex index = UiAtlasSliceIndex.packaged();
        BufferedImage canvas = new BufferedImage(WIDTH, HEIGHT, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = canvas.createGraphics();
        try {
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                    RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            graphics.setColor(BACKGROUND);
            graphics.fillRect(0, 0, WIDTH, HEIGHT);
            graphics.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 24));
            graphics.setColor(TEXT);
            graphics.drawString("Approved medical UI atlas implementation preview", 28, 38);
            graphics.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 13));
            graphics.setColor(MUTED);
            graphics.drawString("Exact reviewed source crops, composed at practical desktop UI sizes; no replacement sprites generated.",
                    28, 61);

            section(graphics, 20, 82, 500, 340, "Panel and control assembly");
            drawScaled(index, graphics, "medical-large-panel", 42, 126, 310, 215);
            drawScaled(index, graphics, "medical-system-status-panel", 66, 151, 184, 120);
            drawScaled(index, graphics, "medical-warning-status-icon", 270, 155, 42, 41);
            drawScaled(index, graphics, "medical-confirm-status-icon", 270, 207, 42, 42);
            drawScaled(index, graphics, "medical-teal-pill-button", 258, 278, 94, 41);
            drawScaled(index, graphics, "medical-minus-button", 373, 151, 50, 50);
            drawScaled(index, graphics, "medical-plus-button", 432, 151, 50, 50);
            drawScaled(index, graphics, "medical-grid-panel", 369, 219, 113, 110);
            graphics.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 11));
            graphics.setColor(MUTED);
            graphics.drawString("medical-large-panel", 42, 365);
            graphics.drawString("semantic controls over approved chrome", 42, 385);

            section(graphics, 540, 82, 500, 340, "Navigation cards and clinical symbols");
            String[] cards = {"medical-crew-card", "medical-folder-card", "medical-settings-card",
                    "medical-search-card", "medical-observation-card"};
            for (int indexOfCard = 0; indexOfCard < cards.length; indexOfCard++) {
                drawScaled(index, graphics, cards[indexOfCard], 562 + (indexOfCard % 2) * 224,
                        126 + (indexOfCard / 2) * 75, 194, 58);
            }
            String[] symbols = {"medical-dna-symbol", "medical-brain-symbol", "medical-lungs-symbol",
                    "medical-heart-symbol", "medical-molecule-symbol", "medical-stethoscope-symbol",
                    "medical-atom-symbol", "medical-lab-flask-symbol"};
            for (int symbol = 0; symbol < symbols.length; symbol++) {
                int x = 562 + symbol * 56;
                drawContained(index, graphics, symbols[symbol], x, 350, 46, 46);
            }

            section(graphics, 1060, 82, 520, 340, "Diagnostics and subject review");
            drawScaled(index, graphics, "medical-subject-data-panel", 1082, 126, 178, 138);
            drawScaled(index, graphics, "medical-body-scan-panel", 1276, 126, 126, 142);
            drawScaled(index, graphics, "medical-vital-signs-panel", 1416, 126, 142, 150);
            drawScaled(index, graphics, "medical-radiograph-panel", 1082, 284, 145, 116);
            drawScaled(index, graphics, "medical-dna-diagnostics-panel", 1244, 290, 150, 110);
            drawScaled(index, graphics, "medical-molecular-network-panel", 1410, 290, 148, 110);

            section(graphics, 20, 442, 1020, 270, "Status, storage, and operational controls");
            List<String> statuses = List.of(
                    "medical-eye-status-icon", "medical-target-status-icon", "medical-timer-status-icon",
                    "medical-analytics-status-icon", "medical-lock-status-icon", "medical-warning-status-icon",
                    "medical-help-status-icon", "medical-down-status-icon", "medical-confirm-status-icon",
                    "medical-cancel-status-icon", "medical-hazard-status-icon", "medical-power-status-icon",
                    "medical-power-button");
            for (int status = 0; status < statuses.size(); status++) {
                int x = 42 + status * 70;
                drawContained(index, graphics, statuses.get(status), x, 486, 54, 54);
                label(graphics, shortName(statuses.get(status)), x - 2, 557);
            }
            List<String> storage = List.of(
                    "medical-message-icon", "medical-save-icon", "medical-storage-icon-a", "medical-storage-icon-b",
                    "medical-clipboard-icon", "medical-download-icon", "medical-upload-icon", "medical-cloud-icon",
                    "medical-service-key-icon", "medical-cross-button");
            for (int item = 0; item < storage.size(); item++) {
                int x = 42 + item * 92;
                drawContained(index, graphics, storage.get(item), x, 590, 64, 48);
                label(graphics, shortName(storage.get(item)), x - 4, 657);
            }
            drawScaled(index, graphics, "medical-gold-pill-button", 42, 675, 150, 36);
            drawScaled(index, graphics, "medical-teal-pill-button", 210, 675, 150, 36);
            drawScaled(index, graphics, "medical-chamfered-strip", 378, 675, 230, 36);
            drawScaled(index, graphics, "medical-small-chamfered-panel", 626, 650, 180, 62);
            drawScaled(index, graphics, "medical-equipment-panel", 824, 650, 190, 62);

            section(graphics, 1060, 442, 520, 270, "Radar and instrumentation");
            drawScaled(index, graphics, "medical-radar-panel", 1082, 482, 190, 190);
            drawScaled(index, graphics, "medical-gauge", 1292, 487, 185, 105);
            drawScaled(index, graphics, "medical-dot-matrix-indicator", 1490, 482, 68, 106);
            drawScaled(index, graphics, "medical-world-map-panel", 1292, 604, 266, 88);

            section(graphics, 20, 732, 1560, 360, "Reusable panel and footer inventory");
            drawScaled(index, graphics, "medical-blank-square-panel", 42, 778, 140, 138);
            drawScaled(index, graphics, "medical-grid-panel", 202, 778, 150, 146);
            drawScaled(index, graphics, "medical-large-panel", 372, 778, 210, 146);
            drawScaled(index, graphics, "medical-equipment-panel", 602, 778, 210, 100);
            drawScaled(index, graphics, "medical-grid-equipment-panel", 832, 778, 230, 100);
            drawScaled(index, graphics, "medical-small-chamfered-panel", 1082, 778, 250, 150);
            drawScaled(index, graphics, "medical-system-status-panel", 1352, 778, 206, 135);
            drawScaled(index, graphics, "medical-green-footer-strip", 42, 952, 510, 67);
            drawScaled(index, graphics, "medical-white-footer-strip", 572, 952, 430, 67);
            drawScaled(index, graphics, "medical-dark-footer-strip", 1022, 952, 536, 67);
            graphics.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 11));
            graphics.setColor(MUTED);
            graphics.drawString("Green outlines in the atlas review overlay identify these 65 approved medical assets.",
                    42, 1065);
        } finally {
            graphics.dispose();
        }
        return canvas;
    }

    public static void writeMedicalPreview(Path output) throws IOException {
        Path parent = output.toAbsolutePath().normalize().getParent();
        if (parent != null) Files.createDirectories(parent);
        if (!ImageIO.write(renderMedicalPreview(), "png", output.toFile())) {
            throw new IOException("PNG writer unavailable for " + output);
        }
    }

    public static void showMedicalPreview() throws IOException {
        if (GraphicsEnvironment.isHeadless()) {
            throw new IOException("Medical UI preview cannot open a window in a headless environment.");
        }
        BufferedImage preview = renderMedicalPreview();
        SwingUtilities.invokeLater(() -> {
            JFrame frame = new JFrame("Medical UI Atlas Preview");
            frame.setDefaultCloseOperation(JFrame.DISPOSE_ON_CLOSE);
            JLabel label = new JLabel(new ImageIcon(preview));
            JScrollPane scrollPane = new JScrollPane(label);
            scrollPane.setPreferredSize(new Dimension(1280, 820));
            frame.setContentPane(scrollPane);
            frame.pack();
            frame.setLocationByPlatform(true);
            frame.setVisible(true);
        });
    }

    public static void verifyContract() throws Exception {
        BufferedImage preview = renderMedicalPreview();
        require(preview.getWidth() == WIDTH && preview.getHeight() == HEIGHT,
                "Medical UI implementation preview dimensions changed.");
        UiAtlasSliceIndex index = UiAtlasSliceIndex.packaged();
        require(index.approvedSlicesFor("medical-ui").size() == 65,
                "Medical UI implementation preview requires 65 approved assets.");
        require(index.findBySemanticName("medical-large-panel").isPresent()
                        && index.findBySemanticName("medical-warning-status-icon").isPresent(),
                "Medical UI implementation preview assignments are incomplete.");
    }

    public static void main(String[] args) throws Exception {
        if (args.length == 2 && args[0].equals("--render-medical")) {
            writeMedicalPreview(Path.of(args[1]));
            System.out.println("Wrote medical UI implementation preview to " + Path.of(args[1]).toAbsolutePath());
            return;
        }
        if (args.length == 1 && args[0].equals("--show-medical")) {
            showMedicalPreview();
            return;
        }
        if (args.length == 0 || (args.length == 1 && args[0].equals("--verify"))) {
            verifyContract();
            System.out.println("Approved medical UI implementation preview passed.");
            return;
        }
        System.err.println("Usage: UiAtlasImplementationPreview [--verify | --render-medical <output.png> | --show-medical]");
        System.exit(2);
    }

    private static void section(Graphics2D graphics, int x, int y, int width, int height, String title) {
        graphics.setColor(SECTION);
        graphics.fillRoundRect(x, y, width, height, 12, 12);
        graphics.setColor(BORDER);
        graphics.drawRoundRect(x, y, width, height, 12, 12);
        graphics.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 15));
        graphics.setColor(TEXT);
        graphics.drawString(title, x + 16, y + 25);
    }

    private static void drawScaled(UiAtlasSliceIndex index, Graphics2D graphics, String semanticName,
                                   int x, int y, int width, int height) throws IOException {
        BufferedImage source = index.cropBySemanticName(semanticName);
        graphics.drawImage(source, x, y, width, height, null);
    }

    private static void drawContained(UiAtlasSliceIndex index, Graphics2D graphics, String semanticName,
                                      int x, int y, int width, int height) throws IOException {
        BufferedImage source = index.cropBySemanticName(semanticName);
        double factor = Math.min(width / (double) source.getWidth(), height / (double) source.getHeight());
        int drawWidth = Math.max(1, (int) Math.round(source.getWidth() * factor));
        int drawHeight = Math.max(1, (int) Math.round(source.getHeight() * factor));
        graphics.drawImage(source, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2,
                drawWidth, drawHeight, null);
    }

    private static String shortName(String semanticName) {
        return semanticName.replace("medical-", "").replace("-status-icon", "")
                .replace("-icon", "").replace("-button", "");
    }

    private static void label(Graphics2D graphics, String text, int x, int y) {
        graphics.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 9));
        graphics.setColor(MUTED);
        graphics.drawString(text, x, y);
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }
}
