package io.github.mrcalzon02.barotrauma.assets;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.stream.Stream;

/** Contract verification for the authoritative desktop visual catalogue. */
final class BarotraumaAssetCatalogueVerification {
    private BarotraumaAssetCatalogueVerification() { }

    static void verifyContract() throws Exception {
        Path root = Files.createTempDirectory("barotrauma-asset-catalogue-");
        try {
            Path installation = root.resolve("Barotrauma");
            Path content = installation.resolve("Content");
            Files.createDirectories(content.resolve("UI"));
            Files.createDirectories(content.resolve("Map"));
            Files.createDirectories(content.resolve("Characters"));
            Files.createDirectories(content.resolve("Items"));

            BufferedImage atlas = new BufferedImage(16, 8, BufferedImage.TYPE_INT_ARGB);
            Graphics2D graphics = atlas.createGraphics();
            graphics.setColor(Color.CYAN);
            graphics.fillRect(0, 0, 8, 8);
            graphics.setColor(Color.ORANGE);
            graphics.fillRect(8, 0, 8, 8);
            graphics.dispose();
            ImageIO.write(atlas, "png", content.resolve("UI/atlas.png").toFile());
            Files.writeString(content.resolve("UI/style.xml"),
                    "<styles><SubmarineLocationIcon texture=\"Content/UI/atlas.png\" sourcerect=\"0,0,8,8\"/>"
                            + "<OutpostIcon texture=\"Content/UI/atlas.png\" sourcerect=\"8,0,8,8\"/></styles>",
                    StandardCharsets.UTF_8);

            BarotraumaDonorAssets donorAssets = new BarotraumaDonorAssets(root.resolve("assets.properties"));
            donorAssets.saveConfiguration(BarotraumaDonorAssets.Mode.MANUAL, installation);
            BarotraumaAssetCatalogue catalogue = new BarotraumaAssetCatalogue(donorAssets);
            BarotraumaAssetCatalogue.ResolvedGraphic submarine =
                    catalogue.resolve(BarotraumaAssetCatalogue.VisualRole.SUBMARINE_MARKER);
            require(submarine.source() == BarotraumaAssetCatalogue.GraphicSource.DONOR_INSTALLATION
                            && submarine.sourceRectangle() != null
                            && submarine.sourceRectangle().width() == 8,
                    "Atlas-backed submarine marker was not resolved from donor style XML.");
            BufferedImage cropped = catalogue.loadImage(BarotraumaAssetCatalogue.VisualRole.SUBMARINE_MARKER, 32, 32);
            require(cropped.getWidth() == 32 && cropped.getHeight() == 32,
                    "Atlas-backed donor marker was not cropped and scaled.");

            donorAssets.saveConfiguration(BarotraumaDonorAssets.Mode.FALLBACK, null);
            catalogue.clearCache();
            for (BarotraumaAssetCatalogue.VisualRole role : BarotraumaAssetCatalogue.VisualRole.values()) {
                BufferedImage fallback = catalogue.loadImage(role, 48, 36);
                require(fallback.getWidth() == 48 && fallback.getHeight() == 36,
                        role + " fallback could not be rendered.");
                BarotraumaAssetCatalogue.GraphicSource expected = switch (role) {
                    case APP_BACKGROUND, MAP_BACKGROUND, PANEL, INNER_PANEL, BUTTON, TAB,
                            LOCATION_MARKER, OUTPOST_MARKER, CAVE_MARKER, RUIN_MARKER, BEACON_MARKER,
                            WRECK_MARKER, SUBMARINE_MARKER, SHUTTLE_MARKER, ENEMY_MARKER, RADIATION_MARKER,
                            ROUTE_ARROW, BROKEN_STATUS, SAVING_STATUS, GLOW, NOTIFICATION_ICON, WARNING_ICON,
                            MISSION_ICON, RESEARCH_ICON, CARGO_ICON, CREW_ICON, GEOLOGY_ICON, STATION_ICON,
                            VESSEL_ICON -> BarotraumaAssetCatalogue.GraphicSource.PACKAGED_ATLAS;
                    default -> BarotraumaAssetCatalogue.GraphicSource.PROCEDURAL_FALLBACK;
                };
                require(catalogue.resolve(role).source() == expected,
                        role + " did not resolve through the expected fallback tier.");
            }
            require(catalogue.resolve(BarotraumaAssetCatalogue.VisualRole.APP_BACKGROUND).detail().contains("scene atlas"),
                    "Application background did not identify its packaged scene.");
            require(catalogue.resolve(BarotraumaAssetCatalogue.VisualRole.PANEL).detail().contains("medical-large-panel"),
                    "Core panel did not identify its approved packaged UI semantic.");
        } finally {
            try (Stream<Path> stream = Files.walk(root)) {
                for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
            }
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }
}
