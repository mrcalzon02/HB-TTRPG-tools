package io.github.mrcalzon02.barotrauma.assets;

import io.github.mrcalzon02.barotrauma.assets.BarotraumaDonorAssets.Candidate;

import javax.imageio.ImageIO;
import javax.swing.ImageIcon;
import java.awt.AlphaComposite;
import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Authoritative semantic visual catalogue for the desktop application.
 *
 * <p>Resolution order is user-owned donor installation, reviewed packaged atlas asset, then independent Java2D
 * emergency fallback. The browser never uses the donor path; it consumes the reviewed packaged atlases directly.</p>
 */
public final class BarotraumaAssetCatalogue {
    private static final Map<VisualRole, SceneAtlasIndex.BackgroundRole> PACKAGED_SCENE_ROLES = packagedSceneRoles();
    private static final Map<VisualRole, String> PACKAGED_UI_ROLES = packagedUiRoles();

    private final BarotraumaDonorAssets donors;
    private final BarotraumaDonorSpriteIndex donorSprites = new BarotraumaDonorSpriteIndex();
    private final Map<VisualRole, ResolvedGraphic> resolvedCache = new ConcurrentHashMap<>();
    private volatile SceneAtlasIndex packagedScenes;
    private volatile UiAtlasSliceIndex packagedUi;

    public BarotraumaAssetCatalogue() {
        this(new BarotraumaDonorAssets());
    }

    public BarotraumaAssetCatalogue(BarotraumaDonorAssets donors) {
        this.donors = Objects.requireNonNull(donors, "donors");
    }

    public void clearCache() {
        resolvedCache.clear();
        donorSprites.clear();
        packagedScenes = null;
        packagedUi = null;
    }

    public Optional<Candidate> activeDonor() {
        return donors.activeDonor();
    }

    public ResolvedGraphic resolve(VisualRole role) {
        Objects.requireNonNull(role, "role");
        return resolvedCache.computeIfAbsent(role, this::resolveUncached);
    }

    public BufferedImage loadImage(VisualRole role, int width, int height) throws IOException {
        if (width < 1 || height < 1) throw new IllegalArgumentException("Asset dimensions must be positive.");
        ResolvedGraphic resolved = resolve(role);
        BufferedImage source = switch (resolved.source()) {
            case DONOR_INSTALLATION -> loadDonor(resolved);
            case PACKAGED_ATLAS -> loadPackaged(role);
            case PROCEDURAL_FALLBACK -> null;
        };
        if (source == null && resolved.source() == GraphicSource.DONOR_INSTALLATION) {
            source = loadPackaged(role);
        }
        if (source == null) source = BarotraumaProceduralVisuals.render(role, width, height);
        return scale(source, width, height, role.scaleMode());
    }

    public ImageIcon loadIcon(VisualRole role, int width, int height) throws IOException {
        return new ImageIcon(loadImage(role, width, height));
    }

    /** Preserves the historical donor/non-donor summary while rows report the exact source tier. */
    public CoverageReport coverage() {
        int donorCount = 0;
        List<CoverageRow> rows = new ArrayList<>();
        for (VisualRole role : VisualRole.values()) {
            ResolvedGraphic graphic = resolve(role);
            if (graphic.source() == GraphicSource.DONOR_INSTALLATION) donorCount++;
            rows.add(new CoverageRow(role, graphic.source(), graphic.file(),
                    graphic.sourceRectangle(), graphic.detail()));
        }
        return new CoverageReport(donorCount, VisualRole.values().length - donorCount, List.copyOf(rows));
    }

    private ResolvedGraphic resolveUncached(VisualRole role) {
        Optional<Candidate> donor = donors.activeDonor();
        if (donor.isPresent()) {
            Optional<BarotraumaDonorSpriteIndex.DonorGraphic> selected =
                    donorSprites.select(donor.get().contentRoot(), role);
            if (selected.isPresent()) {
                BarotraumaDonorSpriteIndex.DonorGraphic graphic = selected.get();
                return new ResolvedGraphic(role, GraphicSource.DONOR_INSTALLATION, graphic.file(),
                        graphic.sourceRectangle(), donor.get().installationRoot(), graphic.detail());
            }
        }

        try {
            SceneAtlasIndex.BackgroundRole sceneRole = PACKAGED_SCENE_ROLES.get(role);
            if (sceneRole != null) {
                SceneAtlasIndex.SceneCell cell = packagedScenes().defaultBackground(sceneRole);
                return new ResolvedGraphic(role, GraphicSource.PACKAGED_ATLAS, null, null, null,
                        "Reviewed packaged scene atlas: " + cell.semanticName());
            }
            String semanticName = PACKAGED_UI_ROLES.get(role);
            if (semanticName != null && packagedUi().findBySemanticName(semanticName).isPresent()) {
                return new ResolvedGraphic(role, GraphicSource.PACKAGED_ATLAS, null, null, null,
                        "Approved packaged UI atlas asset: " + semanticName);
            }
        } catch (IOException | RuntimeException ignored) {
            // The independent Java2D fallback remains available if packaged resources are absent or invalid.
        }

        return new ResolvedGraphic(role, GraphicSource.PROCEDURAL_FALLBACK, null, null, null,
                "Independent Java2D emergency fallback");
    }

    private BufferedImage loadDonor(ResolvedGraphic resolved) {
        if (resolved.file() == null) return null;
        try {
            BufferedImage source = ImageIO.read(resolved.file().toFile());
            if (source != null && resolved.sourceRectangle() != null) source = crop(source, resolved.sourceRectangle());
            return source;
        } catch (IOException | RuntimeException ignored) {
            return null;
        }
    }

    private BufferedImage loadPackaged(VisualRole role) {
        try {
            SceneAtlasIndex.BackgroundRole sceneRole = PACKAGED_SCENE_ROLES.get(role);
            if (sceneRole != null) return packagedScenes().cropDefaultBackground(sceneRole);
            String semanticName = PACKAGED_UI_ROLES.get(role);
            return semanticName == null ? null : packagedUi().cropBySemanticName(semanticName);
        } catch (IOException | RuntimeException ignored) {
            return null;
        }
    }

    private SceneAtlasIndex packagedScenes() throws IOException {
        SceneAtlasIndex existing = packagedScenes;
        if (existing != null) return existing;
        synchronized (this) {
            if (packagedScenes == null) packagedScenes = SceneAtlasIndex.packaged();
            return packagedScenes;
        }
    }

    private UiAtlasSliceIndex packagedUi() throws IOException {
        UiAtlasSliceIndex existing = packagedUi;
        if (existing != null) return existing;
        synchronized (this) {
            if (packagedUi == null) packagedUi = UiAtlasSliceIndex.packaged();
            return packagedUi;
        }
    }

    private static BufferedImage crop(BufferedImage source, SourceRectangle rectangle) {
        int x = Math.max(0, rectangle.x());
        int y = Math.max(0, rectangle.y());
        int width = Math.min(rectangle.width(), source.getWidth() - x);
        int height = Math.min(rectangle.height(), source.getHeight() - y);
        if (width < 1 || height < 1) return source;
        BufferedImage copy = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = copy.createGraphics();
        try {
            graphics.setComposite(AlphaComposite.Src);
            graphics.drawImage(source, 0, 0, width, height, x, y, x + width, y + height, null);
        } finally {
            graphics.dispose();
        }
        return copy;
    }

    private static BufferedImage scale(BufferedImage source, int width, int height, ScaleMode mode) {
        BufferedImage target = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = target.createGraphics();
        try {
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            if (mode == ScaleMode.STRETCH) {
                graphics.drawImage(source, 0, 0, width, height, null);
                return target;
            }
            double factor = mode == ScaleMode.COVER
                    ? Math.max(width / (double) source.getWidth(), height / (double) source.getHeight())
                    : Math.min(width / (double) source.getWidth(), height / (double) source.getHeight());
            int drawWidth = Math.max(1, (int) Math.round(source.getWidth() * factor));
            int drawHeight = Math.max(1, (int) Math.round(source.getHeight() * factor));
            int x = (width - drawWidth) / 2;
            int y = (height - drawHeight) / 2;
            graphics.drawImage(source.getScaledInstance(drawWidth, drawHeight, Image.SCALE_SMOOTH), x, y, null);
            return target;
        } finally {
            graphics.dispose();
        }
    }

    private static Map<VisualRole, SceneAtlasIndex.BackgroundRole> packagedSceneRoles() {
        EnumMap<VisualRole, SceneAtlasIndex.BackgroundRole> result = new EnumMap<>(VisualRole.class);
        result.put(VisualRole.APP_BACKGROUND, SceneAtlasIndex.BackgroundRole.APPLICATION_SHELL);
        result.put(VisualRole.MAP_BACKGROUND, SceneAtlasIndex.BackgroundRole.WORLD_MAP);
        return Collections.unmodifiableMap(result);
    }

    private static Map<VisualRole, String> packagedUiRoles() {
        EnumMap<VisualRole, String> result = new EnumMap<>(VisualRole.class);
        result.put(VisualRole.PANEL, "medical-large-panel");
        result.put(VisualRole.INNER_PANEL, "medical-grid-panel");
        result.put(VisualRole.BUTTON, "medical-teal-pill-button");
        result.put(VisualRole.TAB, "retro-ui-favorite-tab");
        result.put(VisualRole.LOCATION_MARKER, "retro-ui-map-pin-gold");
        result.put(VisualRole.OUTPOST_MARKER, "retro-ui-map-pin-star");
        result.put(VisualRole.CAVE_MARKER, "hud-elements-mountain-icon");
        result.put(VisualRole.RUIN_MARKER, "retro-ui-map-pin-diamond");
        result.put(VisualRole.BEACON_MARKER, "hud-elements-satellite-a");
        result.put(VisualRole.WRECK_MARKER, "hud-elements-warning-icon");
        result.put(VisualRole.SUBMARINE_MARKER, "hud-elements-submarine");
        result.put(VisualRole.SHUTTLE_MARKER, "hud-elements-shuttle-a");
        result.put(VisualRole.ENEMY_MARKER, "hud-elements-target-icon");
        result.put(VisualRole.RADIATION_MARKER, "medical-hazard-status-icon");
        result.put(VisualRole.ROUTE_ARROW, "hud-elements-navigation-arrow");
        result.put(VisualRole.BROKEN_STATUS, "hud-elements-warning-icon");
        result.put(VisualRole.SAVING_STATUS, "medical-save-icon");
        result.put(VisualRole.GLOW, "hud-elements-status-ring");
        result.put(VisualRole.NOTIFICATION_ICON, "medical-message-icon");
        result.put(VisualRole.WARNING_ICON, "hud-elements-warning-icon");
        result.put(VisualRole.MISSION_ICON, "retro-ui-flag-button");
        result.put(VisualRole.RESEARCH_ICON, "medical-atom-symbol");
        result.put(VisualRole.CARGO_ICON, "game-hud-backpack");
        result.put(VisualRole.CREW_ICON, "retro-ui-crew-button");
        result.put(VisualRole.GEOLOGY_ICON, "hud-elements-mountain-icon");
        result.put(VisualRole.STATION_ICON, "retro-ui-map-pin-star");
        result.put(VisualRole.VESSEL_ICON, "hud-elements-submarine");
        return Collections.unmodifiableMap(result);
    }

    public enum GraphicSource { DONOR_INSTALLATION, PACKAGED_ATLAS, PROCEDURAL_FALLBACK }
    public enum Category { BACKGROUND, CHROME, MAP_MARKER, STATUS, OPERATION }
    public enum ScaleMode { CONTAIN, COVER, STRETCH }

    public enum VisualRole {
        APP_BACKGROUND("Application background", Category.BACKGROUND, ScaleMode.COVER),
        MAP_BACKGROUND("Europa map background", Category.BACKGROUND, ScaleMode.COVER),
        PANEL("Outer frame", Category.CHROME, ScaleMode.STRETCH),
        INNER_PANEL("Inner frame", Category.CHROME, ScaleMode.STRETCH),
        BUTTON("Button", Category.CHROME, ScaleMode.STRETCH),
        TAB("Tab", Category.CHROME, ScaleMode.STRETCH),
        PROGRESS_TRACK("Progress track", Category.CHROME, ScaleMode.STRETCH),
        PROGRESS_FILL("Progress fill", Category.CHROME, ScaleMode.STRETCH),
        LOCATION_MARKER("Location", Category.MAP_MARKER, ScaleMode.CONTAIN),
        OUTPOST_MARKER("Outpost", Category.MAP_MARKER, ScaleMode.CONTAIN),
        CAVE_MARKER("Cave", Category.MAP_MARKER, ScaleMode.CONTAIN),
        RUIN_MARKER("Ruin", Category.MAP_MARKER, ScaleMode.CONTAIN),
        BEACON_MARKER("Beacon", Category.MAP_MARKER, ScaleMode.CONTAIN),
        WRECK_MARKER("Wreck", Category.MAP_MARKER, ScaleMode.CONTAIN),
        SUBMARINE_MARKER("Submarine", Category.MAP_MARKER, ScaleMode.CONTAIN),
        SHUTTLE_MARKER("Shuttle", Category.MAP_MARKER, ScaleMode.CONTAIN),
        ENEMY_MARKER("Enemy", Category.MAP_MARKER, ScaleMode.CONTAIN),
        RADIATION_MARKER("Radiation", Category.MAP_MARKER, ScaleMode.CONTAIN),
        ROUTE_ARROW("Route arrow", Category.MAP_MARKER, ScaleMode.CONTAIN),
        BROKEN_STATUS("Broken", Category.STATUS, ScaleMode.CONTAIN),
        SAVING_STATUS("Saving", Category.STATUS, ScaleMode.CONTAIN),
        GLOW("Selection glow", Category.STATUS, ScaleMode.CONTAIN),
        NOTIFICATION_ICON("Notification", Category.STATUS, ScaleMode.CONTAIN),
        WARNING_ICON("Warning", Category.STATUS, ScaleMode.CONTAIN),
        MISSION_ICON("Mission", Category.OPERATION, ScaleMode.CONTAIN),
        RESEARCH_ICON("Research", Category.OPERATION, ScaleMode.CONTAIN),
        CARGO_ICON("Cargo", Category.OPERATION, ScaleMode.CONTAIN),
        CURRENCY_ICON("Currency", Category.OPERATION, ScaleMode.CONTAIN),
        CREW_ICON("Crew", Category.OPERATION, ScaleMode.CONTAIN),
        FAUNA_ICON("Fauna", Category.OPERATION, ScaleMode.CONTAIN),
        GEOLOGY_ICON("Geology", Category.OPERATION, ScaleMode.CONTAIN),
        STATION_ICON("Station", Category.OPERATION, ScaleMode.CONTAIN),
        VESSEL_ICON("Vessel", Category.OPERATION, ScaleMode.CONTAIN);

        private final String label;
        private final Category category;
        private final ScaleMode scaleMode;

        VisualRole(String label, Category category, ScaleMode scaleMode) {
            this.label = label;
            this.category = category;
            this.scaleMode = scaleMode;
        }

        public String label() { return label; }
        public Category category() { return category; }
        public ScaleMode scaleMode() { return scaleMode; }
        public List<String> preferredRelativePaths() { return BarotraumaDonorRoleRules.preferredPaths(this); }

        int score(String text) { return BarotraumaDonorRoleRules.score(this, text); }
    }
    public record SourceRectangle(int x, int y, int width, int height) { }
    public record ResolvedGraphic(VisualRole role, GraphicSource source, Path file,
                                  SourceRectangle sourceRectangle, Path donorInstallation, String detail) { }
    public record CoverageRow(VisualRole role, GraphicSource source, Path file,
                              SourceRectangle sourceRectangle, String detail) { }
    public record CoverageReport(int donorCount, int fallbackCount, List<CoverageRow> rows) { }


    public static void verifyContract() throws Exception {
        BarotraumaAssetCatalogueVerification.verifyContract();
    }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Barotrauma desktop visual catalogue passed donor, packaged atlas, and Java2D fallback verification.");
    }
}
