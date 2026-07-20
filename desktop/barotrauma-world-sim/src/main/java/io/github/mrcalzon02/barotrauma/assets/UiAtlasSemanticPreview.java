package io.github.mrcalzon02.barotrauma.assets;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/** Development renderer for the resolved multi-sheet UI atlas semantic review. */
public final class UiAtlasSemanticPreview {
    private static final int GALLERY_WIDTH = 1920;
    private static final int GALLERY_COLUMNS = 10;
    private static final int GALLERY_CELL_WIDTH = 190;
    private static final int GALLERY_CELL_HEIGHT = 126;
    private static final int OVERLAY_WIDTH = 1920;
    private static final int OVERLAY_COLUMNS = 2;
    private static final int OVERLAY_CELL_WIDTH = 950;
    private static final int OVERLAY_CELL_HEIGHT = 680;
    private static final int REJECTED_WIDTH = 1920;
    private static final int REJECTED_COLUMNS = 6;
    private static final int REJECTED_CELL_WIDTH = 316;
    private static final int REJECTED_CELL_HEIGHT = 220;

    private static final Color BACKGROUND = new Color(4, 9, 12);
    private static final Color CELL = new Color(10, 20, 25);
    private static final Color TEXT = new Color(214, 229, 218);
    private static final Color MUTED = new Color(142, 172, 168);
    private static final Color APPROVED = new Color(84, 255, 160);
    private static final Color REJECTED = new Color(130, 136, 140);

    private UiAtlasSemanticPreview() { }

    public static BufferedImage renderSlicingPreview() throws IOException {
        UiAtlasSliceIndex index = UiAtlasSliceIndex.packaged();
        int height = slicingHeight(index);
        BufferedImage canvas = new BufferedImage(GALLERY_WIDTH, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = canvas.createGraphics();
        try {
            prepare(graphics);
            graphics.setColor(BACKGROUND);
            graphics.fillRect(0, 0, canvas.getWidth(), canvas.getHeight());
            graphics.setColor(TEXT);
            graphics.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 25));
            graphics.drawString("Resolved UI atlas semantic review", 18, 34);
            graphics.setColor(MUTED);
            graphics.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 13));
            graphics.drawString("612 approved semantic assets, 7 rejected fragments, and no unresolved assignments.", 18, 56);

            int y = 76;
            for (UiAtlasSliceIndex.Sheet sheet : index.sheets()) {
                var reviewed = index.reviewedSlicesFor(sheet.sheetId());
                long approved = reviewed.stream().filter(UiAtlasSliceIndex.Slice::approved).count();
                long rejected = reviewed.stream().filter(UiAtlasSliceIndex.Slice::rejected).count();
                graphics.setColor(CELL);
                graphics.fillRoundRect(18, y, GALLERY_WIDTH - 36, 42, 12, 12);
                graphics.setColor(TEXT);
                graphics.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 17));
                graphics.drawString(sheet.sheetId(), 30, y + 20);
                graphics.setColor(MUTED);
                graphics.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 11));
                graphics.drawString(approved + " approved / " + rejected + " rejected / 0 assigned", 30, y + 36);
                y += 48;

                for (int item = 0; item < reviewed.size(); item++) {
                    int column = item % GALLERY_COLUMNS;
                    int row = item / GALLERY_COLUMNS;
                    drawReviewCell(index, graphics, reviewed.get(item),
                            10 + column * GALLERY_CELL_WIDTH,
                            y + row * GALLERY_CELL_HEIGHT,
                            GALLERY_CELL_WIDTH - 8, GALLERY_CELL_HEIGHT - 8);
                }
                int rows = Math.max(1, (reviewed.size() + GALLERY_COLUMNS - 1) / GALLERY_COLUMNS);
                y += rows * GALLERY_CELL_HEIGHT + 14;
            }
        } finally {
            graphics.dispose();
        }
        return canvas;
    }

    public static BufferedImage renderOverlayPreview() throws IOException {
        UiAtlasSliceIndex index = UiAtlasSliceIndex.packaged();
        int rows = (index.sheets().size() + OVERLAY_COLUMNS - 1) / OVERLAY_COLUMNS;
        BufferedImage canvas = new BufferedImage(OVERLAY_WIDTH, 70 + rows * OVERLAY_CELL_HEIGHT,
                BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = canvas.createGraphics();
        try {
            prepare(graphics);
            graphics.setColor(BACKGROUND);
            graphics.fillRect(0, 0, canvas.getWidth(), canvas.getHeight());
            graphics.setColor(TEXT);
            graphics.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 25));
            graphics.drawString("Resolved UI atlas boundary review", 18, 34);
            graphics.setColor(MUTED);
            graphics.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 13));
            graphics.drawString("Green A rectangles are approved; gray X rectangles are rejected; confidence colors remain candidates.", 18, 56);

            for (int sheetIndex = 0; sheetIndex < index.sheets().size(); sheetIndex++) {
                UiAtlasSliceIndex.Sheet sheet = index.sheets().get(sheetIndex);
                int x = 10 + (sheetIndex % OVERLAY_COLUMNS) * OVERLAY_CELL_WIDTH;
                int y = 70 + (sheetIndex / OVERLAY_COLUMNS) * OVERLAY_CELL_HEIGHT;
                drawOverlayCell(index, graphics, sheet, x, y);
            }
        } finally {
            graphics.dispose();
        }
        return canvas;
    }

    public static BufferedImage renderRejectedPreview() throws IOException {
        UiAtlasSliceIndex index = UiAtlasSliceIndex.packaged();
        var rejected = index.rejectedSlices();
        int rows = Math.max(1, (rejected.size() + REJECTED_COLUMNS - 1) / REJECTED_COLUMNS);
        BufferedImage canvas = new BufferedImage(REJECTED_WIDTH, 176 + rows * REJECTED_CELL_HEIGHT,
                BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = canvas.createGraphics();
        try {
            prepare(graphics);
            graphics.setColor(BACKGROUND);
            graphics.fillRect(0, 0, canvas.getWidth(), canvas.getHeight());
            graphics.setColor(TEXT);
            graphics.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 25));
            graphics.drawString("Explicitly rejected UI atlas regions", 18, 34);
            graphics.setColor(MUTED);
            graphics.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 13));
            graphics.drawString("These seven fragments remain auditable by stable id but have no semantic lookup or runtime role.", 18, 56);

            for (int item = 0; item < rejected.size(); item++) {
                int x = 10 + (item % REJECTED_COLUMNS) * REJECTED_CELL_WIDTH;
                int y = 78 + (item / REJECTED_COLUMNS) * REJECTED_CELL_HEIGHT;
                drawRejectedCell(index, graphics, rejected.get(item), x, y,
                        REJECTED_CELL_WIDTH - 8, REJECTED_CELL_HEIGHT - 8);
            }
        } finally {
            graphics.dispose();
        }
        return canvas;
    }

    public static void writeSlicingPreview(Path output) throws IOException {
        writePng(renderSlicingPreview(), output);
    }

    public static void writeOverlayPreview(Path output) throws IOException {
        writePng(renderOverlayPreview(), output);
    }

    public static void writeRejectedPreview(Path output) throws IOException {
        writePng(renderRejectedPreview(), output);
    }

    public static void verifyContract() throws Exception {
        UiAtlasSliceIndex index = UiAtlasSliceIndex.packaged();
        require(index.approvedSlices().size() == 612, "Expected 612 approved UI atlas assets.");
        require(index.rejectedSlices().size() == 7, "Expected seven rejected UI atlas regions.");
        require(index.assignedSlices().isEmpty(), "Resolved UI atlas review cannot retain assignments.");
        BufferedImage slicing = renderSlicingPreview();
        require(slicing.getWidth() == GALLERY_WIDTH && slicing.getHeight() == slicingHeight(index),
                "Semantic slicing preview dimensions changed.");
        BufferedImage overlay = renderOverlayPreview();
        require(overlay.getWidth() == OVERLAY_WIDTH && overlay.getHeight() > 3000,
                "Semantic overlay preview dimensions changed.");
        BufferedImage rejected = renderRejectedPreview();
        require(rejected.getWidth() == REJECTED_WIDTH && rejected.getHeight() > 500,
                "Rejected preview dimensions changed.");
    }

    public static void main(String[] args) throws Exception {
        if (args.length == 2 && args[0].equals("--render-slices")) {
            writeSlicingPreview(Path.of(args[1]));
            System.out.println("Wrote resolved UI atlas semantic preview to " + Path.of(args[1]).toAbsolutePath());
            return;
        }
        if (args.length == 2 && args[0].equals("--render-overlays")) {
            writeOverlayPreview(Path.of(args[1]));
            System.out.println("Wrote resolved UI atlas boundary preview to " + Path.of(args[1]).toAbsolutePath());
            return;
        }
        if (args.length == 2 && args[0].equals("--render-rejected")) {
            writeRejectedPreview(Path.of(args[1]));
            System.out.println("Wrote rejected UI atlas preview to " + Path.of(args[1]).toAbsolutePath());
            return;
        }
        if (args.length == 0 || (args.length == 1 && args[0].equals("--verify"))) {
            verifyContract();
            System.out.println("Resolved UI atlas semantic previews passed: 612 approved assets and 7 rejected regions.");
            return;
        }
        System.err.println("Usage: UiAtlasSemanticPreview [--verify | --render-slices <output.png>"
                + " | --render-overlays <output.png> | --render-rejected <output.png>]");
        System.exit(2);
    }

    private static int slicingHeight(UiAtlasSliceIndex index) {
        int height = 76;
        for (UiAtlasSliceIndex.Sheet sheet : index.sheets()) {
            int count = index.reviewedSlicesFor(sheet.sheetId()).size();
            int rows = Math.max(1, (count + GALLERY_COLUMNS - 1) / GALLERY_COLUMNS);
            height += 48 + rows * GALLERY_CELL_HEIGHT + 14;
        }
        return height;
    }

    private static void drawReviewCell(UiAtlasSliceIndex index, Graphics2D graphics,
                                       UiAtlasSliceIndex.Slice slice,
                                       int x, int y, int width, int height) throws IOException {
        Color statusColor = slice.approved() ? APPROVED : REJECTED;
        graphics.setColor(CELL);
        graphics.fillRect(x, y, width, height);
        graphics.setColor(statusColor);
        graphics.drawRect(x, y, width - 1, height - 1);
        graphics.setFont(new Font(Font.MONOSPACED, Font.BOLD, 10));
        graphics.drawString(slice.assetId() + (slice.approved() ? " A" : " X"), x + 4, y + 12);

        BufferedImage source = index.crop(slice.assetId());
        int imageX = x + 6;
        int imageY = y + 17;
        int imageWidth = width - 12;
        int imageHeight = height - 42;
        double factor = Math.min(imageWidth / (double) source.getWidth(),
                imageHeight / (double) source.getHeight());
        factor = Math.min(factor, 4.0);
        int drawWidth = Math.max(1, (int) Math.round(source.getWidth() * factor));
        int drawHeight = Math.max(1, (int) Math.round(source.getHeight() * factor));
        graphics.drawImage(source, imageX + (imageWidth - drawWidth) / 2,
                imageY + (imageHeight - drawHeight) / 2, drawWidth, drawHeight, null);

        graphics.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 8));
        graphics.setColor(MUTED);
        String label = slice.approved() ? slice.semanticName() : "REJECTED " + slice.kind();
        String[] lines = splitLabel(label, 30);
        graphics.drawString(lines[0], x + 4, y + height - 17);
        if (!lines[1].isBlank()) graphics.drawString(lines[1], x + 4, y + height - 7);
    }

    private static void drawOverlayCell(UiAtlasSliceIndex index, Graphics2D graphics,
                                        UiAtlasSliceIndex.Sheet sheet, int x, int y) throws IOException {
        BufferedImage overlay = index.reviewOverlay(sheet.sheetId());
        int header = 34;
        int availableWidth = OVERLAY_CELL_WIDTH - 20;
        int availableHeight = OVERLAY_CELL_HEIGHT - header - 18;
        double factor = Math.min(availableWidth / (double) overlay.getWidth(),
                availableHeight / (double) overlay.getHeight());
        int drawWidth = (int) Math.round(overlay.getWidth() * factor);
        int drawHeight = (int) Math.round(overlay.getHeight() * factor);
        graphics.setColor(CELL);
        graphics.fillRoundRect(x, y, OVERLAY_CELL_WIDTH - 10, OVERLAY_CELL_HEIGHT - 10, 12, 12);
        graphics.setColor(TEXT);
        graphics.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 15));
        graphics.drawString(sheet.sheetId(), x + 12, y + 21);
        graphics.drawImage(overlay, x + (OVERLAY_CELL_WIDTH - drawWidth) / 2,
                y + header, drawWidth, drawHeight, null);
    }

    private static void drawRejectedCell(UiAtlasSliceIndex index, Graphics2D graphics,
                                         UiAtlasSliceIndex.Slice slice,
                                         int x, int y, int width, int height) throws IOException {
        graphics.setColor(CELL);
        graphics.fillRect(x, y, width, height);
        graphics.setColor(REJECTED);
        graphics.drawRect(x, y, width - 1, height - 1);
        graphics.setFont(new Font(Font.MONOSPACED, Font.BOLD, 12));
        graphics.drawString(slice.assetId() + " X", x + 7, y + 16);

        BufferedImage source = index.crop(slice.assetId());
        int imageX = x + 8;
        int imageY = y + 24;
        int imageWidth = width - 16;
        int imageHeight = height - 76;
        double factor = Math.min(imageWidth / (double) source.getWidth(),
                imageHeight / (double) source.getHeight());
        factor = Math.min(factor, 6.0);
        int drawWidth = Math.max(1, (int) Math.round(source.getWidth() * factor));
        int drawHeight = Math.max(1, (int) Math.round(source.getHeight() * factor));
        graphics.drawImage(source, imageX + (imageWidth - drawWidth) / 2,
                imageY + (imageHeight - drawHeight) / 2, drawWidth, drawHeight, null);

        graphics.setColor(MUTED);
        graphics.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 9));
        graphics.drawString(slice.kind() + " / " + slice.confidence(), x + 7, y + height - 39);
        graphics.drawString("rect " + slice.x() + "," + slice.y() + " " + slice.width() + "x" + slice.height(),
                x + 7, y + height - 27);
        graphics.drawString(truncate(slice.notes(), 48), x + 7, y + height - 13);
    }

    private static String[] splitLabel(String value, int maximum) {
        if (value == null || value.isBlank()) return new String[] {"", ""};
        if (value.length() <= maximum) return new String[] {value, ""};
        int split = value.lastIndexOf('-', maximum);
        if (split < maximum / 2) split = maximum;
        int secondStart = Math.min(value.length(), split + (value.charAt(split) == '-' ? 1 : 0));
        return new String[] {truncate(value.substring(0, split), maximum),
                truncate(value.substring(secondStart), maximum)};
    }

    private static String truncate(String value, int maximum) {
        if (value == null || value.length() <= maximum) return value == null ? "" : value;
        return value.substring(0, Math.max(0, maximum - 1)) + "…";
    }

    private static void prepare(Graphics2D graphics) {
        graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
    }

    private static void writePng(BufferedImage image, Path output) throws IOException {
        Path parent = output.toAbsolutePath().normalize().getParent();
        if (parent != null) Files.createDirectories(parent);
        if (!ImageIO.write(image, "png", output.toFile())) {
            throw new IOException("PNG writer unavailable for " + output);
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }
}
