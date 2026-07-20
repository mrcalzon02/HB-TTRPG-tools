package io.github.mrcalzon02.barotrauma.assets;

import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Font;
import java.awt.GradientPaint;
import java.awt.Graphics2D;
import java.awt.Polygon;
import java.awt.RenderingHints;
import java.awt.geom.Ellipse2D;
import java.awt.geom.Path2D;
import java.awt.geom.RoundRectangle2D;
import java.awt.image.BufferedImage;
import java.util.Random;

/** Independent Java2D emergency visuals used only after donor and packaged atlas resolution fail. */
final class BarotraumaProceduralVisuals {
    private static final Color DEEP = new Color(7, 18, 24);
    private static final Color MID = new Color(18, 47, 57);
    private static final Color EDGE = new Color(83, 154, 164);
    private static final Color LIGHT = new Color(205, 228, 219);
    private static final Color WARM = new Color(226, 177, 92);
    private static final Color DANGER = new Color(201, 75, 68);

    private BarotraumaProceduralVisuals() { }

    static BufferedImage render(BarotraumaAssetCatalogue.VisualRole role, int width, int height) {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = image.createGraphics();
        try {
            graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            switch (role.category()) {
                case BACKGROUND -> drawBackground(graphics, role, width, height);
                case CHROME -> drawChrome(graphics, role, width, height);
                default -> drawIcon(graphics, role, width, height);
            }
        } finally {
            graphics.dispose();
        }
        return image;
    }

    private static void drawBackground(Graphics2D graphics, BarotraumaAssetCatalogue.VisualRole role,
                                       int width, int height) {
        graphics.setPaint(new GradientPaint(0, 0, MID, 0, height, DEEP));
        graphics.fillRect(0, 0, width, height);
        Random random = new Random(0xB4A07L + role.ordinal() * 97L + width * 13L + height);
        graphics.setStroke(new BasicStroke(Math.max(1f, Math.min(width, height) / 260f)));
        for (int index = 0; index < Math.max(24, width * height / 9000); index++) {
            int x = random.nextInt(Math.max(1, width));
            int y = random.nextInt(Math.max(1, height));
            int radius = 2 + random.nextInt(Math.max(3, Math.min(width, height) / 18 + 1));
            graphics.setColor(new Color(110, 190, 194, 18 + random.nextInt(48)));
            graphics.draw(new Ellipse2D.Double(x - radius, y - radius, radius * 2.0, radius * 2.0));
        }
        graphics.setColor(new Color(190, 230, 220, 28));
        for (int y = height / 6; y < height; y += Math.max(18, height / 8)) {
            graphics.drawLine(0, y, width, y + height / 18);
        }
    }

    private static void drawChrome(Graphics2D graphics, BarotraumaAssetCatalogue.VisualRole role,
                                   int width, int height) {
        int arc = Math.max(8, Math.min(width, height) / 5);
        Color fill = switch (role) {
            case BUTTON, TAB -> new Color(28, 61, 68, 235);
            case PROGRESS_FILL -> new Color(74, 155, 143, 240);
            case PROGRESS_TRACK -> new Color(11, 26, 31, 235);
            default -> new Color(12, 31, 38, 235);
        };
        graphics.setColor(fill);
        graphics.fill(new RoundRectangle2D.Double(1, 1, width - 2.0, height - 2.0, arc, arc));
        graphics.setStroke(new BasicStroke(Math.max(1f, Math.min(width, height) / 28f)));
        graphics.setColor(role == BarotraumaAssetCatalogue.VisualRole.PROGRESS_FILL ? LIGHT : EDGE);
        graphics.draw(new RoundRectangle2D.Double(1.5, 1.5, width - 3.0, height - 3.0, arc, arc));
    }

    private static void drawIcon(Graphics2D graphics, BarotraumaAssetCatalogue.VisualRole role,
                                 int width, int height) {
        int size = Math.max(8, Math.min(width, height));
        double centerX = width / 2.0;
        double centerY = height / 2.0;
        double radius = size * 0.34;
        graphics.setStroke(new BasicStroke(Math.max(1.5f, size / 12f),
                BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
        graphics.setColor(new Color(5, 18, 23, 210));
        graphics.fill(new Ellipse2D.Double(centerX - radius - 3, centerY - radius - 3,
                (radius + 3) * 2, (radius + 3) * 2));
        graphics.setColor(color(role));

        switch (role) {
            case LOCATION_MARKER -> {
                graphics.draw(new Ellipse2D.Double(centerX - radius * 0.55, centerY - radius * 0.55,
                        radius * 1.1, radius * 1.1));
                graphics.fill(new Ellipse2D.Double(centerX - radius * 0.13, centerY - radius * 0.13,
                        radius * 0.26, radius * 0.26));
            }
            case OUTPOST_MARKER, STATION_ICON -> {
                Polygon hex = polygon(centerX, centerY, radius, 6, Math.PI / 6);
                graphics.drawPolygon(hex);
                graphics.drawLine((int) (centerX - radius * 0.5), (int) centerY,
                        (int) (centerX + radius * 0.5), (int) centerY);
                graphics.drawLine((int) centerX, (int) (centerY - radius * 0.5),
                        (int) centerX, (int) (centerY + radius * 0.5));
            }
            case CAVE_MARKER, GEOLOGY_ICON -> {
                Path2D cave = new Path2D.Double();
                cave.moveTo(centerX - radius, centerY + radius * 0.65);
                cave.lineTo(centerX - radius * 0.55, centerY - radius * 0.35);
                cave.lineTo(centerX, centerY - radius);
                cave.lineTo(centerX + radius * 0.65, centerY - radius * 0.25);
                cave.lineTo(centerX + radius, centerY + radius * 0.65);
                cave.closePath();
                graphics.draw(cave);
            }
            case SUBMARINE_MARKER, SHUTTLE_MARKER, VESSEL_ICON -> drawSubmarine(graphics, centerX, centerY, radius);
            case ROUTE_ARROW -> {
                graphics.drawLine((int) (centerX - radius), (int) centerY,
                        (int) (centerX + radius * 0.65), (int) centerY);
                graphics.drawLine((int) (centerX + radius * 0.65), (int) centerY,
                        (int) (centerX + radius * 0.15), (int) (centerY - radius * 0.5));
                graphics.drawLine((int) (centerX + radius * 0.65), (int) centerY,
                        (int) (centerX + radius * 0.15), (int) (centerY + radius * 0.5));
            }
            case GLOW -> {
                for (int index = 0; index < 3; index++) {
                    double ring = radius * (0.45 + index * 0.27);
                    graphics.draw(new Ellipse2D.Double(centerX - ring, centerY - ring, ring * 2, ring * 2));
                }
            }
            case CARGO_ICON -> graphics.drawRect((int) (centerX - radius * 0.75),
                    (int) (centerY - radius * 0.65), (int) (radius * 1.5), (int) (radius * 1.3));
            case CREW_ICON -> {
                graphics.draw(new Ellipse2D.Double(centerX - radius * 0.28, centerY - radius * 0.8,
                        radius * 0.56, radius * 0.56));
                graphics.drawArc((int) (centerX - radius * 0.7), (int) (centerY - radius * 0.2),
                        (int) (radius * 1.4), (int) (radius * 1.2), 0, 180);
            }
            case ENEMY_MARKER, FAUNA_ICON -> drawGlyph(graphics, "!", width, height, size);
            case BROKEN_STATUS, WARNING_ICON, RADIATION_MARKER -> drawGlyph(graphics, "△", width, height, size);
            case SAVING_STATUS -> drawGlyph(graphics, "↻", width, height, size);
            case NOTIFICATION_ICON -> drawGlyph(graphics, "•", width, height, size);
            case MISSION_ICON -> drawGlyph(graphics, "M", width, height, size);
            case RESEARCH_ICON -> drawGlyph(graphics, "R", width, height, size);
            case CURRENCY_ICON -> drawGlyph(graphics, "¢", width, height, size);
            default -> drawGlyph(graphics, role.label().substring(0, 1), width, height, size);
        }
    }

    private static void drawSubmarine(Graphics2D graphics, double centerX, double centerY, double radius) {
        graphics.draw(new Ellipse2D.Double(centerX - radius, centerY - radius * 0.42,
                radius * 2, radius * 0.84));
        graphics.drawRect((int) (centerX - radius * 0.15), (int) (centerY - radius * 0.72),
                (int) (radius * 0.45), (int) (radius * 0.3));
    }

    private static void drawGlyph(Graphics2D graphics, String glyph, int width, int height, int size) {
        Font font = new Font(Font.SANS_SERIF, Font.BOLD, Math.max(10, (int) (size * 0.72)));
        graphics.setFont(font);
        var metrics = graphics.getFontMetrics();
        int x = (width - metrics.stringWidth(glyph)) / 2;
        int y = (height - metrics.getHeight()) / 2 + metrics.getAscent();
        graphics.drawString(glyph, x, y);
    }

    private static Polygon polygon(double centerX, double centerY, double radius, int sides, double rotation) {
        Polygon polygon = new Polygon();
        for (int index = 0; index < sides; index++) {
            double angle = rotation + index * Math.PI * 2 / sides;
            polygon.addPoint((int) Math.round(centerX + Math.cos(angle) * radius),
                    (int) Math.round(centerY + Math.sin(angle) * radius));
        }
        return polygon;
    }

    private static Color color(BarotraumaAssetCatalogue.VisualRole role) {
        return switch (role) {
            case ENEMY_MARKER, FAUNA_ICON, BROKEN_STATUS, WARNING_ICON, RADIATION_MARKER -> DANGER;
            case MISSION_ICON, CURRENCY_ICON, BEACON_MARKER -> WARM;
            case RESEARCH_ICON, GEOLOGY_ICON, CAVE_MARKER, RUIN_MARKER -> new Color(162, 143, 194);
            default -> LIGHT;
        };
    }
}
