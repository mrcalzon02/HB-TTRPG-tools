package io.github.mrcalzon02.barotrauma.assets;

import javax.imageio.ImageIO;
import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Deterministic image renderer for the unified atlas correction review. */
public final class UiAtlasUnifiedReviewPreview {
    private static final int GALLERY_WIDTH = 1920;
    private static final int GALLERY_COLUMNS = 10;
    private static final int GALLERY_CELL_WIDTH = 184;
    private static final int GALLERY_CELL_HEIGHT = 148;
    private static final int GALLERY_MARGIN = 20;
    private static final int GALLERY_HEADER_HEIGHT = 52;

    private static final int OVERLAY_WIDTH = 1920;
    private static final int OVERLAY_COLUMNS = 2;
    private static final int OVERLAY_CELL_WIDTH = 940;
    private static final int OVERLAY_CELL_HEIGHT = 990;
    private static final int OVERLAY_MARGIN = 20;

    private static final Color BACKGROUND = new Color(4, 8, 11);
    private static final Color CELL = new Color(9, 17, 22);
    private static final Color TEXT = new Color(216, 231, 220);
    private static final Color MUTED = new Color(137, 168, 164);
    private static final Color APPROVED = new Color(45, 220, 95);
    private static final Color ASSIGNED = new Color(30, 220, 230);

    private UiAtlasUnifiedReviewPreview() { }

    public static BufferedImage renderSlicingPreview(UiAtlasUnifiedReview review) throws IOException {
        int height = GALLERY_MARGIN + 54;
        Map<String, List<UiAtlasUnifiedReview.ReviewSlice>> bySheet = new LinkedHashMap<>();
        for (UiAtlasSliceIndex.Sheet sheet : review.index().sheets()) {
            List<UiAtlasUnifiedReview.ReviewSlice> reviewed = review.reviewedSlicesFor(sheet.sheetId());
            bySheet.put(sheet.sheetId(), reviewed);
            int rows = Math.max(1, (reviewed.size() + GALLERY_COLUMNS - 1) / GALLERY_COLUMNS);
            height += GALLERY_HEADER_HEIGHT + rows * GALLERY_CELL_HEIGHT + 22;
        }

        BufferedImage canvas = new BufferedImage(GALLERY_WIDTH, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = canvas.createGraphics();
        try {
            prepare(graphics);
            graphics.setColor(BACKGROUND);
            graphics.fillRect(0, 0, canvas.getWidth(), canvas.getHeight());
            graphics.setColor(TEXT);
            graphics.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 25));
            graphics.drawString("Unified UI atlas slicing review", GALLERY_MARGIN, 35);
            graphics.setColor(MUTED);
            graphics.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 13));
            graphics.drawString("Green = approved semantic asset. Cyan = provisional complete-looking region awaiting correction and naming.",
                    GALLERY_MARGIN, 57);

            int y = 76;
            for (UiAtlasSliceIndex.Sheet sheet : review.index().sheets()) {
                List<UiAtlasUnifiedReview.ReviewSlice> reviewed = bySheet.get(sheet.sheetId());
                graphics.setColor(CELL);
                graphics.fillRoundRect(GALLERY_MARGIN, y, GALLERY_WIDTH - GALLERY_MARGIN * 2,
                        GALLERY_HEADER_HEIGHT - 8, 12, 12);
                graphics.setColor(TEXT);
                graphics.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 17));
                graphics.drawString(sheet.sheetId(), GALLERY_MARGIN + 12, y + 23);
                graphics.setColor(MUTED);
                graphics.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 12));
                long approvedCount = reviewed.stream()
                        .filter(UiAtlasUnifiedReview.ReviewSlice::approved).count();
                graphics.drawString(reviewed.size() + " reviewed (" + approvedCount + " approved, "
                        + (reviewed.size() - approvedCount) + " assigned)", GALLERY_MARGIN + 12, y + 41);
                y += GALLERY_HEADER_HEIGHT;

                for (int item = 0; item < reviewed.size(); item++) {
                    int column = item % GALLERY_COLUMNS;
                    int row = item / GALLERY_COLUMNS;
                    drawGalleryCell(review, graphics, reviewed.get(item),
                            GALLERY_MARGIN + column * GALLERY_CELL_WIDTH,
                            y + row * GALLERY_CELL_HEIGHT);
                }
                int rows = Math.max(1, (reviewed.size() + GALLERY_COLUMNS - 1) / GALLERY_COLUMNS);
                y += rows * GALLERY_CELL_HEIGHT + 22;
            }
        } finally {
            graphics.dispose();
        }
        return canvas;
    }

    public static BufferedImage renderOverlayPreview(UiAtlasUnifiedReview review) throws IOException {
        int rows = (review.index().sheets().size() + OVERLAY_COLUMNS - 1) / OVERLAY_COLUMNS;
        BufferedImage canvas = new BufferedImage(
                OVERLAY_WIDTH, OVERLAY_MARGIN + 60 + rows * OVERLAY_CELL_HEIGHT,
                BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = canvas.createGraphics();
        try {
            prepare(graphics);
            graphics.setColor(BACKGROUND);
            graphics.fillRect(0, 0, canvas.getWidth(), canvas.getHeight());
            graphics.setColor(TEXT);
            graphics.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 25));
            graphics.drawString("Unified UI atlas boundary review", OVERLAY_MARGIN, 35);
            graphics.setColor(MUTED);
            graphics.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 13));
            graphics.drawString("Cyan R rectangles are provisional review selections; green A rectangles remain approved medical assets.",
                    OVERLAY_MARGIN, 56);

            for (int sheetIndex = 0; sheetIndex < review.index().sheets().size(); sheetIndex++) {
                UiAtlasSliceIndex.Sheet sheet = review.index().sheets().get(sheetIndex);
                drawOverlayCell(review, graphics, sheet,
                        OVERLAY_MARGIN + (sheetIndex % OVERLAY_COLUMNS) * OVERLAY_CELL_WIDTH,
                        70 + (sheetIndex / OVERLAY_COLUMNS) * OVERLAY_CELL_HEIGHT);
            }
        } finally {
            graphics.dispose();
        }
        return canvas;
    }

    public static void writeSlicingPreview(UiAtlasUnifiedReview review, Path output) throws IOException {
        writePng(renderSlicingPreview(review), output);
    }

    public static void writeOverlayPreview(UiAtlasUnifiedReview review, Path output) throws IOException {
        writePng(renderOverlayPreview(review), output);
    }

    public static void verifyContract(UiAtlasUnifiedReview review) throws Exception {
        BufferedImage slicing = renderSlicingPreview(review);
        BufferedImage overlays = renderOverlayPreview(review);
        if (slicing.getWidth() != GALLERY_WIDTH || slicing.getHeight() < 1000) {
            throw new IllegalStateException("Unified slicing preview dimensions changed.");
        }
        if (overlays.getWidth() != OVERLAY_WIDTH || overlays.getHeight() < 1000) {
            throw new IllegalStateException("Unified overlay preview dimensions changed.");
        }
    }

    private static void drawGalleryCell(UiAtlasUnifiedReview review, Graphics2D graphics,
                                        UiAtlasUnifiedReview.ReviewSlice reviewed,
                                        int x, int y) throws IOException {
        UiAtlasSliceIndex.Slice slice = reviewed.slice();
        int width = GALLERY_CELL_WIDTH - 8;
        int height = GALLERY_CELL_HEIGHT - 8;
        graphics.setColor(CELL);
        graphics.fillRoundRect(x, y, width, height, 10, 10);
        graphics.setColor(reviewed.approved() ? APPROVED : ASSIGNED);
        graphics.setStroke(new BasicStroke(reviewed.approved() ? 2f : 1.5f));
        graphics.drawRoundRect(x, y, width, height, 10, 10);

        drawContained(graphics, review.index().crop(slice.assetId()),
                x + 8, y + 8, width - 16, 101);
        graphics.setColor(TEXT);
        graphics.setFont(new Font(Font.MONOSPACED, Font.BOLD, 11));
        graphics.drawString(slice.assetId() + (reviewed.approved() ? " A" : " R"),
                x + 8, y + 122);
        graphics.setColor(MUTED);
        graphics.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 9));
        String label = reviewed.approved() ? slice.semanticName() : slice.kind();
        graphics.drawString(ellipsize(label, 27), x + 8, y + 136);
    }

    private static void drawOverlayCell(UiAtlasUnifiedReview review, Graphics2D graphics,
                                        UiAtlasSliceIndex.Sheet sheet, int x, int y)
            throws IOException {
        int width = OVERLAY_CELL_WIDTH - 20;
        int height = OVERLAY_CELL_HEIGHT - 20;
        graphics.setColor(CELL);
        graphics.fillRoundRect(x, y, width, height, 12, 12);
        graphics.setColor(TEXT);
        graphics.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 17));
        graphics.drawString(sheet.sheetId(), x + 12, y + 24);
        graphics.setColor(MUTED);
        graphics.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 11));
        graphics.drawString(review.reviewedSlicesFor(sheet.sheetId()).size()
                + " reviewed", x + 12, y + 42);

        BufferedImage overlay = copy(review.index().reviewOverlay(sheet.sheetId()));
        Graphics2D overlayGraphics = overlay.createGraphics();
        try {
            overlayGraphics.setRenderingHint(
                    RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_OFF);
            overlayGraphics.setStroke(new BasicStroke(2f));
            overlayGraphics.setFont(new Font(Font.MONOSPACED, Font.BOLD, 9));
            overlayGraphics.setColor(ASSIGNED);
            for (UiAtlasSliceIndex.Slice slice : review.assignedSlicesFor(sheet.sheetId())) {
                overlayGraphics.drawRect(
                        slice.x(), slice.y(), slice.width() - 1, slice.height() - 1);
                String suffix = slice.assetId()
                        .substring(slice.assetId().lastIndexOf('-') + 1) + "R";
                overlayGraphics.drawString(suffix, slice.x() + 1,
                        Math.min(overlay.getHeight() - 1, slice.y() + 9));
            }
        } finally {
            overlayGraphics.dispose();
        }
        drawContained(graphics, overlay, x + 12, y + 52, width - 24, height - 64);
    }

    private static void drawContained(Graphics2D graphics, BufferedImage source,
                                      int x, int y, int width, int height) {
        double factor = Math.min(
                width / (double) source.getWidth(), height / (double) source.getHeight());
        int drawWidth = Math.max(1, (int) Math.round(source.getWidth() * factor));
        int drawHeight = Math.max(1, (int) Math.round(source.getHeight() * factor));
        graphics.drawImage(source,
                x + (width - drawWidth) / 2, y + (height - drawHeight) / 2,
                drawWidth, drawHeight, null);
    }

    private static void prepare(Graphics2D graphics) {
        graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        graphics.setRenderingHint(
                RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        graphics.setRenderingHint(
                RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
    }

    private static BufferedImage copy(BufferedImage source) {
        BufferedImage copy = new BufferedImage(
                source.getWidth(), source.getHeight(), BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = copy.createGraphics();
        try {
            graphics.drawImage(source, 0, 0, null);
        } finally {
            graphics.dispose();
        }
        return copy;
    }

    private static void writePng(BufferedImage image, Path output) throws IOException {
        Path parent = output.toAbsolutePath().normalize().getParent();
        if (parent != null) Files.createDirectories(parent);
        if (!ImageIO.write(image, "png", output.toFile())) {
            throw new IOException("PNG writer unavailable for " + output);
        }
    }

    private static String ellipsize(String value, int maximum) {
        if (value.length() <= maximum) return value;
        return value.substring(0, Math.max(1, maximum - 1)) + "…";
    }
}
