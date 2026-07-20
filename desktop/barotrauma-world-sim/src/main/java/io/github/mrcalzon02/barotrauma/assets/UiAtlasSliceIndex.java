package io.github.mrcalzon02.barotrauma.assets;

import javax.imageio.ImageIO;
import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * Deterministic first-pass sprite index for the ten packaged sci-fi UI atlases.
 *
 * <p>The original PNG files remain unchanged. The index identifies candidate source rectangles in memory,
 * assigns stable reading-order ids, records semantic sheet zones, and can emit full-resolution review overlays
 * or tab-separated maps. Runtime UI binding is intentionally separate and should only select reviewed slices.</p>
 */
public final class UiAtlasSliceIndex {
    private static final int FOREGROUND_THRESHOLD = 12;
    private static final int CLOSE_ITERATIONS = 1;
    private static final int DILATE_ITERATIONS = 3;
    private static final int MIN_COMPONENT_AREA = 25;
    private static final int MIN_TIGHT_RECTANGLE_AREA = 100;
    private static final int READING_ROW_HEIGHT = 18;

    private static final List<SheetDefinition> DEFINITIONS = List.of(
            sheet("futuristic-hud", "fhud", "futuristic_hud_interface_design_assets.png", 228,
                    "Dense navigation, radar, telemetry, status, ship schematic, gauges, badges, and footer chrome.",
                    zone("top-left-controls", 0, 0, 320, 350),
                    zone("left-status-and-operations", 0, 350, 320, 610),
                    zone("left-ship-and-map", 0, 610, 320, 930),
                    zone("left-footer-tabs-and-rulers", 0, 930, 560, 1254),
                    zone("center-control-bars", 320, 0, 620, 350),
                    zone("center-analytics-panels", 320, 350, 820, 1000),
                    zone("right-radar-and-telemetry", 820, 0, 1254, 820),
                    zone("right-badges-and-footer", 820, 820, 1254, 1254)),
            sheet("medical-ui", "med", "futuristic_sci_fi_medical_ui_kit.png", 211,
                    "Medical navigation, physiology icons, diagnostics, body panels, laboratory controls, health icons, gauges, and panel chrome.",
                    zone("left-navigation-and-cards", 0, 0, 235, 600),
                    zone("top-physiology-and-resource-bars", 235, 0, 900, 340),
                    zone("right-medical-icon-grid", 900, 0, 1254, 620),
                    zone("center-diagnostics-and-body-panels", 235, 340, 930, 760),
                    zone("left-storage-and-file-controls", 0, 600, 235, 850),
                    zone("bottom-instrumentation-and-science", 0, 760, 930, 1254),
                    zone("right-control-buttons-and-panels", 930, 620, 1254, 1254)),
            sheet("futuristic-ui-elements", "fue", "futuristic_ui_elements_and_hud_assets.png", 224,
                    "General controls, hand pointers, progress bars, radar, world map, panels, textures, badges, gauges, and action buttons.",
                    zone("top-left-controls-and-icons", 0, 0, 350, 430),
                    zone("top-center-progress-and-pointers", 350, 0, 820, 430),
                    zone("top-right-status-icons-and-dials", 820, 0, 1254, 430),
                    zone("center-left-monitors-and-controls", 0, 430, 350, 850),
                    zone("center-panels-and-textures", 350, 430, 930, 920),
                    zone("center-right-lists-and-badges", 930, 430, 1254, 920),
                    zone("bottom-maps-radar-and-footer", 0, 850, 930, 1254),
                    zone("bottom-right-action-buttons", 930, 850, 1254, 1254)),
            sheet("retro-futuristic-ui", "retro", "retro_futuristic_ui_assets_sprite_sheet.png", 268,
                    "Tabs, navigation buttons, status rows, modal actions, gauges, map markers, side rail controls, and panel frames.",
                    zone("top-tabs-and-navigation", 0, 0, 470, 230),
                    zone("top-icons-and-media-controls", 470, 0, 1000, 300),
                    zone("top-right-view-controls", 1000, 0, 1254, 470),
                    zone("left-status-and-actions", 0, 230, 360, 1120),
                    zone("center-panels-and-selection-controls", 360, 230, 820, 1254),
                    zone("right-gauges-progress-and-map-markers", 820, 470, 1254, 1254)),
            sheet("game-hud-icons", "game", "sci_fi_game_hud_icon_atlas.png", 287,
                    "Equipment, weapons, tools, armor, inventory slots, rank badges, currency, radar, controls, and item cards.",
                    zone("top-left-panels-and-bars", 0, 0, 520, 350),
                    zone("top-center-target-panels", 520, 0, 820, 560),
                    zone("top-right-equipment-icons", 820, 0, 1254, 620),
                    zone("left-controls-and-indicators", 0, 350, 520, 900),
                    zone("center-radar-and-shortcuts", 520, 560, 820, 1120),
                    zone("right-tools-ranks-and-ammunition", 820, 620, 1254, 1120),
                    zone("bottom-progress-and-cards", 0, 900, 1254, 1254)),
            sheet("hud-design", "hdd", "sci_fi_hud_asset_sheet_design.png", 284,
                    "Retro HUD symbols, panels, topographic maps, radar, gauges, sliders, progress bars, toggles, and interface textures.",
                    zone("top-symbols-and-status", 0, 0, 1254, 300),
                    zone("upper-panels-and-controls", 0, 300, 820, 650),
                    zone("upper-right-sliders-and-toggles", 820, 300, 1254, 720),
                    zone("middle-maps-panels-and-ranks", 0, 650, 820, 1050),
                    zone("middle-right-progress-and-dials", 820, 720, 1254, 1100),
                    zone("bottom-bars-buttons-and-power-dial", 0, 1050, 1254, 1254)),
            sheet("hud-elements", "hdel", "sci_fi_hud_elements_and_icons_sheet.png", 329,
                    "World map, location markers, vehicles, satellite icons, radar, mission labels, gauges, progress bars, and dense icon rows.",
                    zone("top-world-map-and-navigation", 0, 0, 820, 330),
                    zone("top-right-status-and-list-controls", 820, 0, 1254, 360),
                    zone("upper-radar-and-planet-panels", 0, 330, 820, 700),
                    zone("upper-right-gauges-and-sliders", 820, 360, 1254, 720),
                    zone("middle-maps-progress-and-mission-buttons", 0, 700, 1000, 1010),
                    zone("middle-right-texture-panels", 1000, 720, 1254, 1010),
                    zone("bottom-icon-library", 0, 1010, 1000, 1254),
                    zone("bottom-right-mini-panels-and-badges", 1000, 1010, 1254, 1254)),
            sheet("hud-collage", "hcol", "sci_fi_hud_sprite_sheet_collage.png", 272,
                    "Application navigation, waveform controls, status alerts, system selectors, gauges, world map, radar, footer frames, and general icon library.",
                    zone("left-navigation-and-numeric-controls", 0, 0, 470, 470),
                    zone("top-center-waveform-and-settings", 470, 0, 860, 470),
                    zone("top-right-system-icons-and-rail", 860, 0, 1254, 470),
                    zone("center-left-map-and-data-panels", 0, 470, 470, 950),
                    zone("center-controls-and-gauges", 470, 470, 850, 980),
                    zone("center-right-alerts-and-icons", 850, 470, 1254, 980),
                    zone("bottom-left-progress-and-warning-tiles", 0, 950, 500, 1254),
                    zone("bottom-center-science-and-ship-panels", 500, 950, 850, 1254),
                    zone("bottom-right-footer-frames", 850, 950, 1254, 1254)),
            sheet("ui-collage", "uic", "sci_fi_ui_asset_sheet_collage.png", 214,
                    "Communications navigation, message cards, channel status, waveform, radar, network maps, message controls, filters, gauges, and communication panels.",
                    zone("left-communications-navigation", 0, 0, 220, 570),
                    zone("top-message-cards-and-channel-icons", 220, 0, 820, 390),
                    zone("top-right-signal-bars-and-panels", 820, 0, 1254, 520),
                    zone("center-waveform-radar-and-network", 0, 390, 820, 850),
                    zone("center-right-message-controls", 820, 520, 1254, 900),
                    zone("bottom-filters-and-channel-panels", 0, 850, 820, 1254),
                    zone("bottom-right-gauges-and-alert-icons", 820, 900, 1254, 1254)),
            sheet("tech-interface", "tech", "tech_interface_asset_compilation_sheet.png", 232,
                    "Faction emblems, technical icons, warnings, progress bars, maps, network diagrams, gauges, objective alerts, location pins, textures, and footer cells.",
                    zone("top-left-faction-emblems", 0, 0, 650, 300),
                    zone("top-right-system-icons-and-warnings", 650, 0, 1254, 300),
                    zone("upper-controls-and-data-panels", 0, 300, 980, 620),
                    zone("upper-right-maps-and-networks", 980, 300, 1254, 720),
                    zone("middle-navigation-networks-and-ranks", 0, 620, 650, 930),
                    zone("middle-alerts-and-location-markers", 650, 720, 1254, 1030),
                    zone("bottom-gauges-charts-and-status", 0, 930, 980, 1254),
                    zone("bottom-right-textures-and-cells", 980, 1030, 1254, 1254))
    );

    private final Map<String, Sheet> sheets;
    private final Map<String, Slice> slices;
    private final Map<String, List<Slice>> slicesBySheet;
    private final Map<String, BufferedImage> sourceCache = new LinkedHashMap<>();

    private UiAtlasSliceIndex(Map<String, Sheet> sheets, Map<String, Slice> slices,
                              Map<String, List<Slice>> slicesBySheet,
                              Map<String, BufferedImage> loadedSources) {
        this.sheets = Collections.unmodifiableMap(new LinkedHashMap<>(sheets));
        this.slices = Collections.unmodifiableMap(new LinkedHashMap<>(slices));
        LinkedHashMap<String, List<Slice>> immutableBySheet = new LinkedHashMap<>();
        slicesBySheet.forEach((key, value) -> immutableBySheet.put(key, List.copyOf(value)));
        this.slicesBySheet = Collections.unmodifiableMap(immutableBySheet);
        this.sourceCache.putAll(loadedSources);
    }

    public static UiAtlasSliceIndex packaged() throws IOException {
        LinkedHashMap<String, Sheet> sheets = new LinkedHashMap<>();
        LinkedHashMap<String, Slice> slices = new LinkedHashMap<>();
        LinkedHashMap<String, List<Slice>> bySheet = new LinkedHashMap<>();
        LinkedHashMap<String, BufferedImage> sources = new LinkedHashMap<>();

        for (SheetDefinition definition : DEFINITIONS) {
            BufferedImage source = readSource(definition.resource());
            List<Slice> detected = detect(definition, source);
            if (detected.size() != definition.expectedCandidates()) {
                throw new IOException("UI atlas detector changed for " + definition.sheetId()
                        + ": expected " + definition.expectedCandidates() + " candidates but found "
                        + detected.size() + ".");
            }
            ConfidenceCounts counts = confidenceCounts(detected);
            Sheet sheet = new Sheet(definition.sheetId(), definition.resource(), source.getWidth(), source.getHeight(),
                    detected.size(), counts.high(), counts.medium(), counts.low(), definition.description());
            sheets.put(sheet.sheetId(), sheet);
            bySheet.put(sheet.sheetId(), detected);
            sources.put(sheet.sheetId(), source);
            for (Slice slice : detected) {
                if (slices.putIfAbsent(slice.assetId(), slice) != null) {
                    throw new IOException("Duplicate UI atlas asset id: " + slice.assetId());
                }
            }
        }
        return new UiAtlasSliceIndex(sheets, slices, bySheet, sources);
    }

    public List<Sheet> sheets() {
        return List.copyOf(sheets.values());
    }

    public List<Slice> slices() {
        return List.copyOf(slices.values());
    }

    public Optional<Slice> find(String assetId) {
        return Optional.ofNullable(slices.get(Objects.requireNonNull(assetId, "assetId")));
    }

    public List<Slice> slicesFor(String sheetId) {
        List<Slice> result = slicesBySheet.get(Objects.requireNonNull(sheetId, "sheetId"));
        return result == null ? List.of() : result;
    }

    /** Returns a fresh exact-size crop. No scaling, padding, or file export is performed. */
    public BufferedImage crop(String assetId) throws IOException {
        Slice slice = find(assetId).orElseThrow(() ->
                new IOException("Unknown packaged UI atlas asset id: " + assetId));
        BufferedImage source = source(slice.sheetId());
        validateBounds(slice, source.getWidth(), source.getHeight());
        BufferedImage crop = new BufferedImage(slice.width(), slice.height(), BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = crop.createGraphics();
        try {
            graphics.drawImage(source, 0, 0, slice.width(), slice.height(),
                    slice.x(), slice.y(), slice.x() + slice.width(), slice.y() + slice.height(), null);
        } finally {
            graphics.dispose();
        }
        return crop;
    }

    /** Creates a full-resolution review image without modifying or replacing the source atlas. */
    public BufferedImage reviewOverlay(String sheetId) throws IOException {
        Sheet sheet = sheets.get(Objects.requireNonNull(sheetId, "sheetId"));
        if (sheet == null) throw new IOException("Unknown packaged UI atlas sheet: " + sheetId);
        BufferedImage source = source(sheetId);
        BufferedImage overlay = new BufferedImage(source.getWidth(), source.getHeight(), BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = overlay.createGraphics();
        try {
            graphics.drawImage(source, 0, 0, null);
            graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_OFF);
            graphics.setStroke(new BasicStroke(1f));
            graphics.setFont(new Font(Font.MONOSPACED, Font.BOLD, 9));
            for (Slice slice : slicesFor(sheetId)) {
                Color color = switch (slice.confidence()) {
                    case "high" -> Color.RED;
                    case "medium" -> Color.ORANGE;
                    default -> Color.MAGENTA;
                };
                graphics.setColor(color);
                graphics.drawRect(slice.x(), slice.y(), slice.width() - 1, slice.height() - 1);
                graphics.setColor(Color.YELLOW);
                String suffix = slice.assetId().substring(slice.assetId().lastIndexOf('-') + 1);
                graphics.drawString(suffix, slice.x() + 1, Math.min(source.getHeight() - 1, slice.y() + 9));
            }
        } finally {
            graphics.dispose();
        }
        return overlay;
    }

    public void writeReviewOverlay(String sheetId, Path output) throws IOException {
        Path parent = output.toAbsolutePath().normalize().getParent();
        if (parent != null) Files.createDirectories(parent);
        if (!ImageIO.write(reviewOverlay(sheetId), "png", output.toFile())) {
            throw new IOException("PNG writer unavailable for " + output);
        }
    }

    public void writeReviewOverlays(Path outputDirectory) throws IOException {
        Files.createDirectories(outputDirectory);
        for (Sheet sheet : sheets.values()) {
            writeReviewOverlay(sheet.sheetId(),
                    outputDirectory.resolve(sheet.sheetId() + "-slice-review.png"));
        }
    }

    public void writeSliceMap(String sheetId, Path output) throws IOException {
        if (!sheets.containsKey(sheetId)) throw new IOException("Unknown packaged UI atlas sheet: " + sheetId);
        Path parent = output.toAbsolutePath().normalize().getParent();
        if (parent != null) Files.createDirectories(parent);
        List<String> lines = new ArrayList<>();
        lines.add("sheet_id\tasset_id\tresource\tx\ty\twidth\theight\tzone\tkind\tconfidence\tstatus\tnotes");
        for (Slice slice : slicesFor(sheetId)) {
            lines.add(String.join("\t",
                    slice.sheetId(), slice.assetId(), slice.resource(),
                    Integer.toString(slice.x()), Integer.toString(slice.y()),
                    Integer.toString(slice.width()), Integer.toString(slice.height()),
                    slice.zone(), slice.kind(), slice.confidence(), slice.status(), slice.notes()));
        }
        Files.write(output, lines, StandardCharsets.UTF_8);
    }

    public void writeSliceMaps(Path outputDirectory) throws IOException {
        Files.createDirectories(outputDirectory);
        for (Sheet sheet : sheets.values()) {
            writeSliceMap(sheet.sheetId(), outputDirectory.resolve(sheet.sheetId() + ".tsv"));
        }
    }

    private BufferedImage source(String sheetId) throws IOException {
        BufferedImage source = sourceCache.get(sheetId);
        if (source == null) throw new IOException("Unknown packaged UI atlas sheet: " + sheetId);
        return source;
    }

    private static BufferedImage readSource(String resource) throws IOException {
        try (InputStream input = UiAtlasSliceIndex.class.getResourceAsStream(resource)) {
            if (input == null) throw new IOException("Packaged UI atlas is missing: " + resource);
            BufferedImage image = ImageIO.read(input);
            if (image == null) throw new IOException("Packaged UI atlas is unreadable: " + resource);
            return image;
        }
    }

    private static List<Slice> detect(SheetDefinition definition, BufferedImage source) {
        int width = source.getWidth();
        int height = source.getHeight();
        boolean[] original = foregroundMask(source);
        boolean[] closed = erode(dilate(original, width, height, CLOSE_ITERATIONS),
                width, height, CLOSE_ITERATIONS);
        boolean[] expanded = dilate(closed, width, height, DILATE_ITERATIONS);
        List<Component> components = components(expanded, width, height);
        List<RectangleCandidate> rectangles = new ArrayList<>();

        for (Component component : components) {
            if (component.area() < MIN_COMPONENT_AREA) continue;
            int x0 = Math.max(0, component.x() - DILATE_ITERATIONS - 2);
            int y0 = Math.max(0, component.y() - DILATE_ITERATIONS - 2);
            int x1 = Math.min(width, component.x() + component.width() + DILATE_ITERATIONS + 2);
            int y1 = Math.min(height, component.y() + component.height() + DILATE_ITERATIONS + 2);

            int tightX0 = width;
            int tightY0 = height;
            int tightX1 = -1;
            int tightY1 = -1;
            for (int y = y0; y < y1; y++) {
                int row = y * width;
                for (int x = x0; x < x1; x++) {
                    if (!original[row + x]) continue;
                    tightX0 = Math.min(tightX0, x);
                    tightY0 = Math.min(tightY0, y);
                    tightX1 = Math.max(tightX1, x);
                    tightY1 = Math.max(tightY1, y);
                }
            }
            if (tightX1 < tightX0 || tightY1 < tightY0) continue;
            int tightWidth = tightX1 - tightX0 + 1;
            int tightHeight = tightY1 - tightY0 + 1;
            if ((long) tightWidth * tightHeight < MIN_TIGHT_RECTANGLE_AREA) continue;
            rectangles.add(new RectangleCandidate(tightX0, tightY0, tightWidth, tightHeight));
        }

        rectangles.sort(Comparator
                .comparingInt((RectangleCandidate rectangle) -> rectangle.y() / READING_ROW_HEIGHT)
                .thenComparingInt(RectangleCandidate::x)
                .thenComparingInt(RectangleCandidate::y));

        List<Slice> slices = new ArrayList<>(rectangles.size());
        for (int index = 0; index < rectangles.size(); index++) {
            RectangleCandidate rectangle = rectangles.get(index);
            double fill = fillRatio(original, width, rectangle);
            String kind = kind(rectangle.width(), rectangle.height());
            String confidence = confidence(rectangle.width(), rectangle.height(), fill);
            String notes = notes(rectangle.width(), rectangle.height(), fill, kind);
            String assetId = definition.code() + "-" + String.format("%03d", index + 1);
            String zone = zone(definition.zones(),
                    rectangle.x() + rectangle.width() / 2.0,
                    rectangle.y() + rectangle.height() / 2.0);
            slices.add(new Slice(definition.sheetId(), assetId, definition.resource(),
                    rectangle.x(), rectangle.y(), rectangle.width(), rectangle.height(),
                    zone, kind, confidence, "candidate", notes));
        }
        return List.copyOf(slices);
    }

    private static boolean[] foregroundMask(BufferedImage source) {
        int width = source.getWidth();
        int height = source.getHeight();
        int[] pixels = source.getRGB(0, 0, width, height, null, 0, width);
        boolean[] mask = new boolean[pixels.length];
        for (int index = 0; index < pixels.length; index++) {
            int pixel = pixels[index];
            int red = (pixel >>> 16) & 0xff;
            int green = (pixel >>> 8) & 0xff;
            int blue = pixel & 0xff;
            mask[index] = Math.max(red, Math.max(green, blue)) > FOREGROUND_THRESHOLD;
        }
        return mask;
    }

    private static boolean[] dilate(boolean[] input, int width, int height, int iterations) {
        boolean[] current = input;
        for (int iteration = 0; iteration < iterations; iteration++) {
            boolean[] next = new boolean[input.length];
            for (int y = 0; y < height; y++) {
                for (int x = 0; x < width; x++) {
                    boolean found = false;
                    for (int dy = -1; dy <= 1 && !found; dy++) {
                        int yy = y + dy;
                        if (yy < 0 || yy >= height) continue;
                        int row = yy * width;
                        for (int dx = -1; dx <= 1; dx++) {
                            int xx = x + dx;
                            if (xx < 0 || xx >= width) continue;
                            if (current[row + xx]) {
                                found = true;
                                break;
                            }
                        }
                    }
                    next[y * width + x] = found;
                }
            }
            current = next;
        }
        return current;
    }

    private static boolean[] erode(boolean[] input, int width, int height, int iterations) {
        boolean[] current = input;
        for (int iteration = 0; iteration < iterations; iteration++) {
            boolean[] next = new boolean[input.length];
            for (int y = 0; y < height; y++) {
                for (int x = 0; x < width; x++) {
                    boolean all = true;
                    for (int dy = -1; dy <= 1 && all; dy++) {
                        int yy = y + dy;
                        if (yy < 0 || yy >= height) continue;
                        int row = yy * width;
                        for (int dx = -1; dx <= 1; dx++) {
                            int xx = x + dx;
                            if (xx < 0 || xx >= width) continue;
                            if (!current[row + xx]) {
                                all = false;
                                break;
                            }
                        }
                    }
                    next[y * width + x] = all;
                }
            }
            current = next;
        }
        return current;
    }

    private static List<Component> components(boolean[] mask, int width, int height) {
        boolean[] visited = new boolean[mask.length];
        int[] queue = new int[mask.length];
        List<Component> components = new ArrayList<>();
        for (int start = 0; start < mask.length; start++) {
            if (!mask[start] || visited[start]) continue;
            int head = 0;
            int tail = 0;
            queue[tail++] = start;
            visited[start] = true;
            int minX = width;
            int minY = height;
            int maxX = -1;
            int maxY = -1;
            int area = 0;
            while (head < tail) {
                int point = queue[head++];
                int y = point / width;
                int x = point - y * width;
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
                area++;
                for (int dy = -1; dy <= 1; dy++) {
                    int yy = y + dy;
                    if (yy < 0 || yy >= height) continue;
                    int row = yy * width;
                    for (int dx = -1; dx <= 1; dx++) {
                        if (dx == 0 && dy == 0) continue;
                        int xx = x + dx;
                        if (xx < 0 || xx >= width) continue;
                        int neighbor = row + xx;
                        if (mask[neighbor] && !visited[neighbor]) {
                            visited[neighbor] = true;
                            queue[tail++] = neighbor;
                        }
                    }
                }
            }
            components.add(new Component(minX, minY, maxX - minX + 1, maxY - minY + 1, area));
        }
        return components;
    }

    private static double fillRatio(boolean[] original, int sourceWidth, RectangleCandidate rectangle) {
        int foreground = 0;
        for (int y = rectangle.y(); y < rectangle.y() + rectangle.height(); y++) {
            int row = y * sourceWidth;
            for (int x = rectangle.x(); x < rectangle.x() + rectangle.width(); x++) {
                if (original[row + x]) foreground++;
            }
        }
        return foreground / (double) (rectangle.width() * rectangle.height());
    }

    private static String kind(int width, int height) {
        double ratio = width / (double) height;
        if (width >= 180 && height >= 100) return "panel";
        if (width >= 140 && height < 70) return "horizontal-strip";
        if (height >= 140 && width < 70) return "vertical-strip";
        if (ratio >= 0.72 && ratio <= 1.38 && width >= 20 && width <= 110 && height >= 20 && height <= 110) {
            return "icon-or-button";
        }
        if (width >= 90 && height >= 45) return "control-or-card";
        if (width < 22 || height < 22) return "micro-glyph";
        if (ratio > 3.5) return "horizontal-control";
        if (ratio < 0.28) return "vertical-control";
        return "symbol-or-control";
    }

    private static String confidence(int width, int height, double fill) {
        long area = (long) width * height;
        if (width < 6 || height < 6 || area < 100 || width > 500 || height > 500 || fill < 0.018) return "low";
        if (width < 12 || height < 12 || area < 180 || fill < 0.04) return "medium";
        return "high";
    }

    private static String notes(int width, int height, double fill, String kind) {
        List<String> notes = new ArrayList<>();
        if (kind.equals("micro-glyph")) notes.add("tiny glyph; review antialias edge");
        if (width / (double) height > 12) notes.add("very wide strip; verify endpoints");
        if (height / (double) width > 12) notes.add("very tall strip; verify endpoints");
        if (fill < 0.04) notes.add("sparse or hollow asset");
        if (width > 350 || height > 350) notes.add("large region; may contain adjacent elements");
        return String.join("; ", notes);
    }

    private static String zone(List<Zone> zones, double centerX, double centerY) {
        Zone selected = null;
        int selectedArea = Integer.MAX_VALUE;
        for (Zone zone : zones) {
            if (!zone.contains(centerX, centerY)) continue;
            int area = (zone.x1() - zone.x0()) * (zone.y1() - zone.y0());
            if (area < selectedArea) {
                selected = zone;
                selectedArea = area;
            }
        }
        return selected == null ? "unclassified" : selected.name();
    }

    private static ConfidenceCounts confidenceCounts(List<Slice> slices) {
        int high = 0;
        int medium = 0;
        int low = 0;
        for (Slice slice : slices) {
            switch (slice.confidence()) {
                case "high" -> high++;
                case "medium" -> medium++;
                default -> low++;
            }
        }
        return new ConfidenceCounts(high, medium, low);
    }

    private static void validateBounds(Slice slice, int sourceWidth, int sourceHeight) throws IOException {
        if (slice.x() < 0 || slice.y() < 0 || slice.width() < 1 || slice.height() < 1
                || slice.x() + slice.width() > sourceWidth || slice.y() + slice.height() > sourceHeight) {
            throw new IOException("UI atlas slice exceeds source bounds: " + slice.assetId());
        }
    }

    public static void verifyContract() throws Exception {
        UiAtlasSliceIndex index = packaged();
        if (index.sheets().size() != 10) {
            throw new IllegalStateException("Expected ten packaged UI atlas sheets.");
        }
        if (index.slices().size() != 2549) {
            throw new IllegalStateException("Expected 2,549 first-pass UI atlas slice candidates.");
        }
        for (Sheet sheet : index.sheets()) {
            BufferedImage source = index.source(sheet.sheetId());
            for (Slice slice : index.slicesFor(sheet.sheetId())) {
                validateBounds(slice, source.getWidth(), source.getHeight());
                BufferedImage crop = index.crop(slice.assetId());
                if (crop.getWidth() != slice.width() || crop.getHeight() != slice.height()) {
                    throw new IllegalStateException("UI atlas crop dimensions changed for " + slice.assetId());
                }
            }
        }
    }

    public static void main(String[] args) throws Exception {
        UiAtlasSliceIndex index = packaged();
        if (args.length == 3 && args[0].equals("--render-review")) {
            index.writeReviewOverlay(args[1], Path.of(args[2]));
            System.out.println("Wrote " + args[1] + " review overlay to " + Path.of(args[2]).toAbsolutePath());
            return;
        }
        if (args.length == 2 && args[0].equals("--render-review-all")) {
            index.writeReviewOverlays(Path.of(args[1]));
            System.out.println("Wrote all UI atlas review overlays to " + Path.of(args[1]).toAbsolutePath());
            return;
        }
        if (args.length == 3 && args[0].equals("--write-map")) {
            index.writeSliceMap(args[1], Path.of(args[2]));
            System.out.println("Wrote " + args[1] + " slice map to " + Path.of(args[2]).toAbsolutePath());
            return;
        }
        if (args.length == 2 && args[0].equals("--write-map-all")) {
            index.writeSliceMaps(Path.of(args[1]));
            System.out.println("Wrote all UI atlas slice maps to " + Path.of(args[1]).toAbsolutePath());
            return;
        }
        if (args.length == 0 || (args.length == 1 && args[0].equals("--verify"))) {
            verifyContract();
            System.out.println("Packaged UI atlas detector passed: 10 sheets and 2,549 candidate assets.");
            return;
        }
        System.err.println("Usage: UiAtlasSliceIndex [--verify | --render-review <sheet-id> <output.png>"
                + " | --render-review-all <directory> | --write-map <sheet-id> <output.tsv>"
                + " | --write-map-all <directory>]");
        System.exit(2);
    }

    private static SheetDefinition sheet(String id, String code, String filename, int expectedCandidates,
                                         String description, Zone... zones) {
        String resource = "/io/github/mrcalzon02/barotrauma/assets/sci_fi_ui_asset_sheets_10_images/" + filename;
        return new SheetDefinition(id, code, resource, expectedCandidates, description, List.of(zones));
    }

    private static Zone zone(String name, int x0, int y0, int x1, int y1) {
        return new Zone(name, x0, y0, x1, y1);
    }

    public record Sheet(String sheetId, String resource, int width, int height, int candidateCount,
                        int highConfidenceCount, int mediumConfidenceCount, int lowConfidenceCount,
                        String description) { }

    public record Slice(String sheetId, String assetId, String resource,
                        int x, int y, int width, int height,
                        String zone, String kind, String confidence, String status, String notes) {
        public boolean approved() {
            return status.equals("approved");
        }
    }

    private record SheetDefinition(String sheetId, String code, String resource, int expectedCandidates,
                                   String description, List<Zone> zones) { }
    private record Zone(String name, int x0, int y0, int x1, int y1) {
        boolean contains(double x, double y) {
            return x >= x0 && x < x1 && y >= y0 && y < y1;
        }
    }
    private record Component(int x, int y, int width, int height, int area) { }
    private record RectangleCandidate(int x, int y, int width, int height) { }
    private record ConfidenceCounts(int high, int medium, int low) { }
}
