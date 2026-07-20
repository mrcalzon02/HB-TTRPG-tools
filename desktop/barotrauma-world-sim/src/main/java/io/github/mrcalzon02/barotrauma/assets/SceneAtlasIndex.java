package io.github.mrcalzon02.barotrauma.assets;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

/**
 * Authoritative exact-cell index for the twenty packaged 3x2 scene-background atlases.
 *
 * <p>The original PNGs remain untouched. Reviewed source rectangles and semantic assignments live in two
 * human-readable packaged maps. This class is the single loader, validator, cropper, and role selector for them.</p>
 */
public final class SceneAtlasIndex {
    private static final int SOURCE_WIDTH = 2048;
    private static final int SOURCE_HEIGHT = 768;
    private static final int EXPECTED_ATLASES = 20;
    private static final int EXPECTED_SCENES = 120;
    private static final int EXPECTED_SCENES_PER_FAMILY = 60;
    private static final int EXPECTED_SCENES_PER_ATLAS = 6;

    private static final List<String> REVIEW_MAPS = List.of(
            "/io/github/mrcalzon02/barotrauma/assets/scene-atlas-exterior.tsv",
            "/io/github/mrcalzon02/barotrauma/assets/scene-atlas-interior.tsv");

    private static final Map<BackgroundRole, String> DEFAULT_BACKGROUNDS = defaultBackgrounds();

    private final Map<String, SceneCell> byId;
    private final Map<String, SceneCell> bySemanticName;
    private final Map<String, List<SceneCell>> byAtlas;
    private final Map<SceneFamily, List<SceneCell>> byFamily;
    private final Map<String, BufferedImage> sources;

    private SceneAtlasIndex(Map<String, SceneCell> byId,
                            Map<String, SceneCell> bySemanticName,
                            Map<String, List<SceneCell>> byAtlas,
                            Map<SceneFamily, List<SceneCell>> byFamily,
                            Map<String, BufferedImage> sources) {
        this.byId = Collections.unmodifiableMap(new LinkedHashMap<>(byId));
        this.bySemanticName = Collections.unmodifiableMap(new LinkedHashMap<>(bySemanticName));
        LinkedHashMap<String, List<SceneCell>> atlasCopy = new LinkedHashMap<>();
        byAtlas.forEach((key, value) -> atlasCopy.put(key, List.copyOf(value)));
        this.byAtlas = Collections.unmodifiableMap(atlasCopy);
        EnumMap<SceneFamily, List<SceneCell>> familyCopy = new EnumMap<>(SceneFamily.class);
        byFamily.forEach((key, value) -> familyCopy.put(key, List.copyOf(value)));
        this.byFamily = Collections.unmodifiableMap(familyCopy);
        this.sources = Collections.unmodifiableMap(new LinkedHashMap<>(sources));
    }

    public static SceneAtlasIndex packaged() throws IOException {
        List<SceneCell> reviewed = new ArrayList<>(EXPECTED_SCENES);
        for (String resource : REVIEW_MAPS) reviewed.addAll(readReviewMap(resource));

        LinkedHashMap<String, SceneCell> byId = new LinkedHashMap<>();
        LinkedHashMap<String, SceneCell> bySemantic = new LinkedHashMap<>();
        LinkedHashMap<String, List<SceneCell>> byAtlas = new LinkedHashMap<>();
        EnumMap<SceneFamily, List<SceneCell>> byFamily = new EnumMap<>(SceneFamily.class);
        LinkedHashMap<String, BufferedImage> sources = new LinkedHashMap<>();

        for (SceneCell cell : reviewed) {
            if (byId.putIfAbsent(cell.sceneId(), cell) != null) {
                throw new IOException("Duplicate packaged scene id: " + cell.sceneId());
            }
            if (bySemantic.putIfAbsent(cell.semanticName(), cell) != null) {
                throw new IOException("Duplicate packaged scene semantic name: " + cell.semanticName());
            }
            byAtlas.computeIfAbsent(cell.atlasId(), ignored -> new ArrayList<>()).add(cell);
            byFamily.computeIfAbsent(cell.family(), ignored -> new ArrayList<>()).add(cell);
            if (!sources.containsKey(cell.atlasId())) {
                BufferedImage source = readSource(cell.resource());
                if (source.getWidth() != SOURCE_WIDTH || source.getHeight() != SOURCE_HEIGHT) {
                    throw new IOException("Scene atlas dimensions changed for " + cell.atlasId()
                            + ": expected " + SOURCE_WIDTH + "x" + SOURCE_HEIGHT + " but found "
                            + source.getWidth() + "x" + source.getHeight() + ".");
                }
                sources.put(cell.atlasId(), source);
            }
        }

        Comparator<SceneCell> readingOrder = Comparator.comparingInt(SceneCell::row)
                .thenComparingInt(SceneCell::column);
        byAtlas.values().forEach(cells -> cells.sort(readingOrder));
        byFamily.values().forEach(cells -> cells.sort(Comparator.comparing(SceneCell::atlasId)
                .thenComparing(readingOrder)));

        SceneAtlasIndex index = new SceneAtlasIndex(byId, bySemantic, byAtlas, byFamily, sources);
        index.verifyStructure();
        return index;
    }

    public List<String> atlasIds() { return List.copyOf(byAtlas.keySet()); }
    public List<SceneCell> scenes() { return List.copyOf(byId.values()); }

    public List<SceneCell> scenesForAtlas(String atlasId) {
        List<SceneCell> cells = byAtlas.get(Objects.requireNonNull(atlasId, "atlasId"));
        return cells == null ? List.of() : cells;
    }

    public List<SceneCell> scenesForFamily(SceneFamily family) {
        List<SceneCell> cells = byFamily.get(Objects.requireNonNull(family, "family"));
        return cells == null ? List.of() : cells;
    }

    public Optional<SceneCell> find(String sceneId) {
        return Optional.ofNullable(byId.get(Objects.requireNonNull(sceneId, "sceneId")));
    }

    public Optional<SceneCell> findBySemanticName(String semanticName) {
        return Optional.ofNullable(bySemanticName.get(Objects.requireNonNull(semanticName, "semanticName")));
    }

    public SceneCell defaultBackground(BackgroundRole role) throws IOException {
        String semanticName = DEFAULT_BACKGROUNDS.get(Objects.requireNonNull(role, "role"));
        if (semanticName == null) throw new IOException("No packaged scene background assigned to " + role + ".");
        return findBySemanticName(semanticName).orElseThrow(() ->
                new IOException("Assigned packaged scene background is missing: " + semanticName));
    }

    public BufferedImage crop(String sceneId) throws IOException {
        return crop(find(sceneId).orElseThrow(() -> new IOException("Unknown packaged scene id: " + sceneId)));
    }

    public BufferedImage cropBySemanticName(String semanticName) throws IOException {
        return crop(findBySemanticName(semanticName).orElseThrow(() ->
                new IOException("Unknown packaged scene semantic name: " + semanticName)));
    }

    public BufferedImage cropDefaultBackground(BackgroundRole role) throws IOException {
        return crop(defaultBackground(role));
    }

    BufferedImage sourceForReview(String atlasId) throws IOException {
        BufferedImage source = sources.get(Objects.requireNonNull(atlasId, "atlasId"));
        if (source == null) throw new IOException("Unknown packaged scene atlas: " + atlasId);
        return source;
    }

    private BufferedImage crop(SceneCell cell) throws IOException {
        BufferedImage source = sourceForReview(cell.atlasId());
        validateBounds(cell, source);
        BufferedImage result = new BufferedImage(cell.width(), cell.height(), BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = result.createGraphics();
        try {
            graphics.drawImage(source, 0, 0, cell.width(), cell.height(), cell.x(), cell.y(),
                    cell.x() + cell.width(), cell.y() + cell.height(), null);
        } finally {
            graphics.dispose();
        }
        return result;
    }

    public void writeMap(Path output) throws IOException {
        Path parent = output.toAbsolutePath().normalize().getParent();
        if (parent != null) Files.createDirectories(parent);
        List<String> lines = new ArrayList<>();
        lines.add("atlas_id\tfamily\tresource\tscene_id\trow\tcolumn\tx\ty\twidth\theight"
                + "\tsemantic_name\tcategory\tdescription\tintended_use");
        for (SceneCell cell : scenes()) {
            lines.add(String.join("\t", cell.atlasId(), cell.family().name(), cell.resource(), cell.sceneId(),
                    Integer.toString(cell.row()), Integer.toString(cell.column()), Integer.toString(cell.x()),
                    Integer.toString(cell.y()), Integer.toString(cell.width()), Integer.toString(cell.height()),
                    cell.semanticName(), cell.category(), sanitize(cell.description()), sanitize(cell.intendedUse())));
        }
        Files.write(output, lines, StandardCharsets.UTF_8);
    }

    private void verifyStructure() throws IOException {
        if (byAtlas.size() != EXPECTED_ATLASES || byId.size() != EXPECTED_SCENES
                || bySemanticName.size() != EXPECTED_SCENES) {
            throw new IOException("Expected 20 packaged scene atlases and 120 approved scenes.");
        }
        for (SceneFamily family : SceneFamily.values()) {
            if (scenesForFamily(family).size() != EXPECTED_SCENES_PER_FAMILY) {
                throw new IOException("Expected 60 approved " + family + " scenes.");
            }
        }
        for (Map.Entry<String, List<SceneCell>> entry : byAtlas.entrySet()) {
            List<SceneCell> cells = entry.getValue();
            if (cells.size() != EXPECTED_SCENES_PER_ATLAS) {
                throw new IOException("Expected six approved cells for " + entry.getKey() + ".");
            }
            Set<String> positions = new HashSet<>();
            BufferedImage source = sources.get(entry.getKey());
            for (SceneCell cell : cells) {
                if (!positions.add(cell.row() + ":" + cell.column())) {
                    throw new IOException("Duplicate scene cell position in " + entry.getKey() + ".");
                }
                validateBounds(cell, source);
                BufferedImage crop = crop(cell);
                if (crop.getWidth() != cell.width() || crop.getHeight() != cell.height()) {
                    throw new IOException("Scene crop dimensions changed for " + cell.sceneId() + ".");
                }
            }
            verifyNoOverlap(entry.getKey(), cells);
        }
        for (Map.Entry<BackgroundRole, String> entry : DEFAULT_BACKGROUNDS.entrySet()) {
            if (!bySemanticName.containsKey(entry.getValue())) {
                throw new IOException("Missing default background for " + entry.getKey() + ": " + entry.getValue());
            }
        }
    }

    private static List<SceneCell> readReviewMap(String resource) throws IOException {
        try (InputStream input = SceneAtlasIndex.class.getResourceAsStream(resource)) {
            if (input == null) throw new IOException("Packaged scene review map is missing: " + resource);
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(input, StandardCharsets.UTF_8))) {
                String header = reader.readLine();
                if (header == null || !header.startsWith("atlas_id\tfamily\tresource\tscene_id")) {
                    throw new IOException("Invalid packaged scene review map header: " + resource);
                }
                List<SceneCell> cells = new ArrayList<>();
                String line;
                int lineNumber = 1;
                while ((line = reader.readLine()) != null) {
                    lineNumber++;
                    if (line.isBlank()) continue;
                    String[] values = line.split("\\t", -1);
                    if (values.length != 14) {
                        throw new IOException("Invalid packaged scene review row at " + resource + ":" + lineNumber);
                    }
                    try {
                        cells.add(new SceneCell(values[0], SceneFamily.valueOf(values[1]), values[2], values[3],
                                Integer.parseInt(values[4]), Integer.parseInt(values[5]),
                                Integer.parseInt(values[6]), Integer.parseInt(values[7]),
                                Integer.parseInt(values[8]), Integer.parseInt(values[9]),
                                values[10], values[11], values[12], values[13]));
                    } catch (IllegalArgumentException exception) {
                        throw new IOException("Invalid packaged scene review values at "
                                + resource + ":" + lineNumber, exception);
                    }
                }
                return List.copyOf(cells);
            }
        }
    }

    private static BufferedImage readSource(String resource) throws IOException {
        try (InputStream input = SceneAtlasIndex.class.getResourceAsStream(resource)) {
            if (input == null) throw new IOException("Packaged scene atlas is missing: " + resource);
            BufferedImage image = ImageIO.read(input);
            if (image == null) throw new IOException("Packaged scene atlas is unreadable: " + resource);
            return image;
        }
    }

    private static void verifyNoOverlap(String atlasId, List<SceneCell> cells) throws IOException {
        for (int first = 0; first < cells.size(); first++) {
            for (int second = first + 1; second < cells.size(); second++) {
                SceneCell a = cells.get(first);
                SceneCell b = cells.get(second);
                if (a.x() < b.x() + b.width() && a.x() + a.width() > b.x()
                        && a.y() < b.y() + b.height() && a.y() + a.height() > b.y()) {
                    throw new IOException("Scene cells overlap in " + atlasId + ": "
                            + a.sceneId() + " and " + b.sceneId() + ".");
                }
            }
        }
    }

    private static void validateBounds(SceneCell cell, BufferedImage source) throws IOException {
        if (cell.x() < 0 || cell.y() < 0 || cell.width() < 1 || cell.height() < 1
                || cell.x() + cell.width() > source.getWidth()
                || cell.y() + cell.height() > source.getHeight()) {
            throw new IOException("Scene cell exceeds source bounds: " + cell.sceneId());
        }
    }

    private static String sanitize(String value) {
        return value.replace('\t', ' ').replace('\n', ' ').replace('\r', ' ');
    }

    private static Map<BackgroundRole, String> defaultBackgrounds() {
        EnumMap<BackgroundRole, String> result = new EnumMap<>(BackgroundRole.class);
        result.put(BackgroundRole.APPLICATION_SHELL, "interior-command-observation-room");
        result.put(BackgroundRole.WORLD_MAP, "exterior-floodlit-megastructure-basin");
        result.put(BackgroundRole.FLEET_MANAGEMENT, "exterior-flooded-repair-basin");
        result.put(BackgroundRole.LOGISTICS, "interior-operations-table-room");
        result.put(BackgroundRole.OBSERVATION, "interior-panoramic-command-room");
        result.put(BackgroundRole.IMPORT_REVIEW, "interior-white-lit-laboratory-bay");
        result.put(BackgroundRole.REGISTRY, "interior-planning-room");
        result.put(BackgroundRole.SIMULATION, "exterior-dense-flooded-megacity");
        result.put(BackgroundRole.RECOVERY, "exterior-broken-battleship-in-rain");
        return Collections.unmodifiableMap(result);
    }

    public static void verifyContract() throws Exception {
        SceneAtlasIndex index = packaged();
        if (index.atlasIds().size() != EXPECTED_ATLASES || index.scenes().size() != EXPECTED_SCENES) {
            throw new IllegalStateException("Packaged scene atlas totals changed.");
        }
        for (BackgroundRole role : BackgroundRole.values()) {
            BufferedImage crop = index.cropDefaultBackground(role);
            if (crop.getWidth() < 1 || crop.getHeight() < 1) {
                throw new IllegalStateException("Packaged background failed for " + role + ".");
            }
        }
    }

    public static void main(String[] args) throws Exception {
        SceneAtlasIndex index = packaged();
        if (args.length == 1 && args[0].equals("--verify")) {
            verifyContract();
            System.out.println("Packaged scene atlas index passed: 20 atlases and 120 approved background scenes.");
            return;
        }
        if (args.length == 2 && args[0].equals("--write-map")) {
            index.writeMap(Path.of(args[1]));
            return;
        }
        System.err.println("Usage: SceneAtlasIndex --verify | --write-map <output.tsv>");
        System.exit(2);
    }

    public enum SceneFamily { EXTERIOR, INTERIOR }

    public enum BackgroundRole {
        APPLICATION_SHELL, WORLD_MAP, FLEET_MANAGEMENT, LOGISTICS, OBSERVATION,
        IMPORT_REVIEW, REGISTRY, SIMULATION, RECOVERY
    }

    public record SceneCell(String atlasId, SceneFamily family, String resource, String sceneId,
                            int row, int column, int x, int y, int width, int height,
                            String semanticName, String category, String description, String intendedUse) { }
}
