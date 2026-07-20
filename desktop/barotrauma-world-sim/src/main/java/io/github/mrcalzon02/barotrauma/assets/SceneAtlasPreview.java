package io.github.mrcalzon02.barotrauma.assets;

import javax.imageio.ImageIO;
import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.Shape;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

/** Development review renderer for the exact cells owned by {@link SceneAtlasIndex}. */
public final class SceneAtlasPreview {
    private SceneAtlasPreview() { }

    public static BufferedImage renderFamilyGallery(SceneAtlasIndex index,
                                                    SceneAtlasIndex.SceneFamily family) throws IOException {
        List<SceneAtlasIndex.SceneCell> cells = index.scenesForFamily(family);
        int columns = 3;
        int cellWidth = 620;
        int cellHeight = 390;
        int margin = 22;
        int header = 72;
        int rows = (cells.size() + columns - 1) / columns;
        BufferedImage canvas = new BufferedImage(margin * 2 + columns * cellWidth,
                header + margin + rows * cellHeight, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = canvas.createGraphics();
        try {
            prepare(graphics);
            graphics.setColor(new Color(3, 8, 11));
            graphics.fillRect(0, 0, canvas.getWidth(), canvas.getHeight());
            graphics.setColor(new Color(220, 231, 221));
            graphics.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 25));
            graphics.drawString(family == SceneAtlasIndex.SceneFamily.EXTERIOR
                    ? "Approved exterior scene atlas cells"
                    : "Approved retro-futurist interior scene atlas cells", margin, 36);
            graphics.setColor(new Color(145, 174, 169));
            graphics.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 13));
            graphics.drawString("Exact reviewed crops; source PNGs remain unchanged.", margin, 58);

            for (int item = 0; item < cells.size(); item++) {
                int x = margin + (item % columns) * cellWidth;
                int y = header + (item / columns) * cellHeight;
                drawGalleryCell(index, graphics, cells.get(item), x, y, cellWidth - 10, cellHeight - 10);
            }
        } finally {
            graphics.dispose();
        }
        return canvas;
    }

    public static BufferedImage reviewOverlay(SceneAtlasIndex index, String atlasId) throws IOException {
        List<SceneAtlasIndex.SceneCell> cells = index.scenesForAtlas(atlasId);
        if (cells.isEmpty()) throw new IOException("Unknown packaged scene atlas: " + atlasId);
        BufferedImage source = index.sourceForReview(atlasId);
        BufferedImage overlay = new BufferedImage(source.getWidth(), source.getHeight(), BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = overlay.createGraphics();
        try {
            graphics.drawImage(source, 0, 0, null);
            graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_OFF);
            graphics.setStroke(new BasicStroke(3f));
            graphics.setFont(new Font(Font.MONOSPACED, Font.BOLD, 16));
            for (SceneAtlasIndex.SceneCell cell : cells) {
                graphics.setColor(new Color(40, 230, 135));
                graphics.drawRect(cell.x(), cell.y(), cell.width() - 1, cell.height() - 1);
                graphics.setColor(Color.WHITE);
                graphics.drawString(cell.sceneId(), cell.x() + 8, cell.y() + 23);
            }
        } finally {
            graphics.dispose();
        }
        return overlay;
    }

    public static BufferedImage renderOverlayMontage(SceneAtlasIndex index) throws IOException {
        int columns = 2;
        int cellWidth = 1050;
        int cellHeight = 450;
        int header = 70;
        int margin = 18;
        int rows = (index.atlasIds().size() + columns - 1) / columns;
        BufferedImage canvas = new BufferedImage(margin * 2 + columns * cellWidth,
                header + margin + rows * cellHeight, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = canvas.createGraphics();
        try {
            prepare(graphics);
            graphics.setColor(new Color(3, 8, 11));
            graphics.fillRect(0, 0, canvas.getWidth(), canvas.getHeight());
            graphics.setColor(new Color(220, 231, 221));
            graphics.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 25));
            graphics.drawString("Twenty-sheet scene atlas boundary review", margin, 36);
            graphics.setColor(new Color(145, 174, 169));
            graphics.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 13));
            graphics.drawString("Green rectangles exclude source borders and separator gutters.", margin, 58);

            List<String> ids = index.atlasIds();
            for (int item = 0; item < ids.size(); item++) {
                int x = margin + (item % columns) * cellWidth;
                int y = header + (item / columns) * cellHeight;
                drawOverlayCell(index, graphics, ids.get(item), x, y, cellWidth - 12, cellHeight - 12);
            }
        } finally {
            graphics.dispose();
        }
        return canvas;
    }

    public static void writeFamilyGallery(SceneAtlasIndex index,
                                          SceneAtlasIndex.SceneFamily family,
                                          Path output) throws IOException {
        writePng(renderFamilyGallery(index, family), output);
    }

    public static void writeReviewOverlay(SceneAtlasIndex index, String atlasId, Path output) throws IOException {
        writePng(reviewOverlay(index, atlasId), output);
    }

    public static void writeReviewOverlays(SceneAtlasIndex index, Path directory) throws IOException {
        Files.createDirectories(directory);
        for (String atlasId : index.atlasIds()) {
            writeReviewOverlay(index, atlasId, directory.resolve(atlasId + "-scene-review.png"));
        }
    }

    public static void writeOverlayMontage(SceneAtlasIndex index, Path output) throws IOException {
        writePng(renderOverlayMontage(index), output);
    }

    private static void drawGalleryCell(SceneAtlasIndex index,
                                        Graphics2D graphics,
                                        SceneAtlasIndex.SceneCell cell,
                                        int x, int y, int width, int height) throws IOException {
        graphics.setColor(new Color(10, 20, 24));
        graphics.fillRoundRect(x, y, width, height, 12, 12);
        drawCover(graphics, index.crop(cell.sceneId()), x + 8, y + 8, width - 16, height - 78);
        graphics.setColor(new Color(45, 210, 133));
        graphics.setStroke(new BasicStroke(2f));
        graphics.drawRoundRect(x, y, width - 1, height - 1, 12, 12);
        graphics.setColor(new Color(225, 235, 225));
        graphics.setFont(new Font(Font.MONOSPACED, Font.BOLD, 13));
        graphics.drawString(cell.sceneId(), x + 12, y + height - 45);
        graphics.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 12));
        graphics.drawString(shorten(cell.semanticName(), 70), x + 12, y + height - 25);
        graphics.setColor(new Color(145, 174, 169));
        graphics.drawString(cell.category(), x + 12, y + height - 8);
    }

    private static void drawOverlayCell(SceneAtlasIndex index,
                                        Graphics2D graphics,
                                        String atlasId,
                                        int x, int y, int width, int height) throws IOException {
        graphics.setColor(new Color(10, 20, 24));
        graphics.fillRoundRect(x, y, width, height, 12, 12);
        BufferedImage overlay = reviewOverlay(index, atlasId);
        int imageX = x + 8;
        int imageY = y + 32;
        int imageWidth = width - 16;
        int imageHeight = height - 40;
        double factor = Math.min(imageWidth / (double) overlay.getWidth(),
                imageHeight / (double) overlay.getHeight());
        int drawWidth = (int) Math.round(overlay.getWidth() * factor);
        int drawHeight = (int) Math.round(overlay.getHeight() * factor);
        graphics.drawImage(overlay, imageX + (imageWidth - drawWidth) / 2,
                imageY + (imageHeight - drawHeight) / 2, drawWidth, drawHeight, null);
        graphics.setColor(new Color(225, 235, 225));
        graphics.setFont(new Font(Font.MONOSPACED, Font.BOLD, 14));
        graphics.drawString(atlasId, x + 10, y + 22);
    }

    private static void prepare(Graphics2D graphics) {
        graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                RenderingHints.VALUE_INTERPOLATION_BILINEAR);
    }

    private static void drawCover(Graphics2D graphics, BufferedImage source,
                                  int x, int y, int width, int height) {
        double factor = Math.max(width / (double) source.getWidth(), height / (double) source.getHeight());
        int drawWidth = Math.max(1, (int) Math.round(source.getWidth() * factor));
        int drawHeight = Math.max(1, (int) Math.round(source.getHeight() * factor));
        Shape previousClip = graphics.getClip();
        graphics.clipRect(x, y, width, height);
        graphics.drawImage(source, x + (width - drawWidth) / 2,
                y + (height - drawHeight) / 2, drawWidth, drawHeight, null);
        graphics.setClip(previousClip);
    }

    private static void writePng(BufferedImage image, Path output) throws IOException {
        Path parent = output.toAbsolutePath().normalize().getParent();
        if (parent != null) Files.createDirectories(parent);
        if (!ImageIO.write(image, "png", output.toFile())) {
            throw new IOException("PNG writer unavailable for " + output);
        }
    }

    private static String shorten(String value, int maximum) {
        return value.length() <= maximum ? value : value.substring(0, maximum - 1) + "…";
    }

    public static void verifyContract() throws Exception {
        SceneAtlasIndex index = SceneAtlasIndex.packaged();
        if (renderFamilyGallery(index, SceneAtlasIndex.SceneFamily.EXTERIOR).getWidth() < 1800
                || renderFamilyGallery(index, SceneAtlasIndex.SceneFamily.INTERIOR).getWidth() < 1800
                || renderOverlayMontage(index).getHeight() < 2500) {
            throw new IllegalStateException("Packaged scene review preview dimensions changed.");
        }
    }

    public static void main(String[] args) throws Exception {
        SceneAtlasIndex index = SceneAtlasIndex.packaged();
        if (args.length == 1 && args[0].equals("--verify")) {
            verifyContract();
            System.out.println("Packaged scene atlas previews passed: 60 exterior and 60 interior scenes.");
            return;
        }
        if (args.length == 3 && args[0].equals("--render-gallery")) {
            writeFamilyGallery(index, SceneAtlasIndex.SceneFamily.valueOf(args[1].toUpperCase()), Path.of(args[2]));
            return;
        }
        if (args.length == 2 && args[0].equals("--render-montage")) {
            writeOverlayMontage(index, Path.of(args[1]));
            return;
        }
        if (args.length == 2 && args[0].equals("--render-overlays")) {
            writeReviewOverlays(index, Path.of(args[1]));
            return;
        }
        System.err.println("Usage: SceneAtlasPreview --verify"
                + " | --render-gallery <exterior|interior> <output.png>"
                + " | --render-montage <output.png>"
                + " | --render-overlays <directory>");
        System.exit(2);
    }
}
