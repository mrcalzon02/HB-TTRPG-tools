package io.github.mrcalzon02.barotrauma.assets;

import io.github.mrcalzon02.barotrauma.assets.BarotraumaDonorAssets.Candidate;

import org.w3c.dom.Element;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.imageio.ImageIO;
import javax.swing.ImageIcon;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import java.awt.AlphaComposite;
import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Font;
import java.awt.GradientPaint;
import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.Polygon;
import java.awt.RenderingHints;
import java.awt.geom.Ellipse2D;
import java.awt.geom.Path2D;
import java.awt.geom.RoundRectangle2D;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Random;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Stream;

/**
 * Semantic visual catalogue backed by a user-owned Barotrauma installation.
 *
 * <p>Barotrauma stores many UI and map symbols inside shared texture atlases. This catalogue therefore searches
 * both direct image files and XML sprite/style definitions, preserving source rectangles when an atlas entry is
 * selected. Every semantic role has an independent Java2D fallback so the desktop application remains fully usable
 * when Barotrauma is not installed or a donor texture changes between game versions.</p>
 */
public final class BarotraumaAssetCatalogue {
    private static final Set<String> IMAGE_EXTENSIONS = Set.of("png", "jpg", "jpeg");
    private static final Set<String> INDEX_ROOTS = Set.of("UI", "Map", "Characters", "Items", "Missions", "Factions");
    private static final int MAX_INDEX_FILES = 60_000;
    private static final int MAX_XML_BYTES = 4_000_000;

    private final BarotraumaDonorAssets donors;
    private final Map<VisualRole, ResolvedGraphic> resolvedCache = new ConcurrentHashMap<>();
    private volatile AssetIndex cachedIndex;

    public BarotraumaAssetCatalogue() {
        this(new BarotraumaDonorAssets());
    }

    public BarotraumaAssetCatalogue(BarotraumaDonorAssets donors) {
        this.donors = Objects.requireNonNull(donors, "donors");
    }

    public void clearCache() {
        resolvedCache.clear();
        cachedIndex = null;
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
        BufferedImage source = null;
        if (resolved.file() != null) {
            try {
                source = ImageIO.read(resolved.file().toFile());
                if (source != null && resolved.sourceRectangle() != null) {
                    source = crop(source, resolved.sourceRectangle());
                }
            } catch (IOException | RuntimeException ignored) {
                source = null;
            }
        }
        if (source == null) return ProceduralFallbacks.render(role, width, height);
        return scale(source, width, height, role.scaleMode());
    }

    public ImageIcon loadIcon(VisualRole role, int width, int height) throws IOException {
        return new ImageIcon(loadImage(role, width, height));
    }

    public CoverageReport coverage() {
        int donor = 0;
        List<CoverageRow> rows = new ArrayList<>();
        for (VisualRole role : VisualRole.values()) {
            ResolvedGraphic graphic = resolve(role);
            if (graphic.source() == GraphicSource.DONOR_INSTALLATION) donor++;
            rows.add(new CoverageRow(role, graphic.source(), graphic.file(), graphic.sourceRectangle(), graphic.detail()));
        }
        return new CoverageReport(donor, VisualRole.values().length - donor, List.copyOf(rows));
    }

    private ResolvedGraphic resolveUncached(VisualRole role) {
        Optional<Candidate> donor = donors.activeDonor();
        if (donor.isPresent()) {
            AssetIndex index = indexFor(donor.get().contentRoot());
            Optional<IndexedGraphic> selected = select(index, role);
            if (selected.isPresent()) {
                IndexedGraphic graphic = selected.get();
                return new ResolvedGraphic(role, GraphicSource.DONOR_INSTALLATION, graphic.file(),
                        graphic.sourceRectangle(), donor.get().installationRoot(), graphic.detail());
            }
        }
        return new ResolvedGraphic(role, GraphicSource.PROCEDURAL_FALLBACK, null, null, null,
                "Independent Java2D fallback");
    }

    private AssetIndex indexFor(Path contentRoot) {
        AssetIndex existing = cachedIndex;
        Path normalized = contentRoot.toAbsolutePath().normalize();
        if (existing != null && existing.contentRoot().equals(normalized)) return existing;
        synchronized (this) {
            existing = cachedIndex;
            if (existing != null && existing.contentRoot().equals(normalized)) return existing;
            AssetIndex created = buildIndex(normalized);
            cachedIndex = created;
            resolvedCache.clear();
            return created;
        }
    }

    private static AssetIndex buildIndex(Path contentRoot) {
        LinkedHashSet<Path> images = new LinkedHashSet<>();
        List<StyleSprite> sprites = new ArrayList<>();
        int visited = 0;
        for (String rootName : INDEX_ROOTS) {
            Path root = contentRoot.resolve(rootName);
            if (!Files.isDirectory(root)) continue;
            try (Stream<Path> stream = Files.walk(root)) {
                for (Path path : stream.filter(Files::isRegularFile).limit(MAX_INDEX_FILES).toList()) {
                    if (++visited > MAX_INDEX_FILES) break;
                    if (isImage(path)) {
                        images.add(path.toAbsolutePath().normalize());
                    } else if (isXml(path) && shouldInspectXml(path, rootName)) {
                        sprites.addAll(readStyleSprites(contentRoot, path));
                    }
                }
            } catch (IOException ignored) { }
            if (visited > MAX_INDEX_FILES) break;
        }
        return new AssetIndex(contentRoot, List.copyOf(images), List.copyOf(sprites));
    }

    private static Optional<IndexedGraphic> select(AssetIndex index, VisualRole role) {
        for (String relative : role.preferredRelativePaths()) {
            Path candidate = index.contentRoot().resolve(relative).normalize();
            if (candidate.startsWith(index.contentRoot()) && Files.isRegularFile(candidate)) {
                return Optional.of(new IndexedGraphic(candidate, null, "Preferred donor file: " + relative));
            }
        }

        Optional<ScoredStyle> style = index.styleSprites().stream()
                .map(sprite -> new ScoredStyle(sprite, role.score(sprite.searchText())))
                .filter(scored -> scored.score() > 0)
                .max(Comparator.comparingInt(ScoredStyle::score)
                        .thenComparingInt(scored -> -scored.sprite().file().toString().length()));
        if (style.isPresent()) {
            StyleSprite sprite = style.get().sprite();
            return Optional.of(new IndexedGraphic(sprite.file(), sprite.sourceRectangle(),
                    "Barotrauma style/atlas sprite from " + sprite.definitionFile().getFileName()));
        }

        Optional<ScoredImage> image = index.images().stream()
                .map(path -> new ScoredImage(path, role.score(normalizedSearchText(index.contentRoot(), path))))
                .filter(scored -> scored.score() > 0)
                .max(Comparator.comparingInt(ScoredImage::score)
                        .thenComparingInt(scored -> -scored.path().toString().length()));
        return image.map(scored -> new IndexedGraphic(scored.path(), null,
                "Barotrauma donor image matched by semantic role"));
    }

    private static List<StyleSprite> readStyleSprites(Path contentRoot, Path xmlFile) {
        try {
            if (Files.size(xmlFile) > MAX_XML_BYTES) return List.of();
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
            factory.setXIncludeAware(false);
            factory.setExpandEntityReferences(false);
            Element root = factory.newDocumentBuilder().parse(xmlFile.toFile()).getDocumentElement();
            List<StyleSprite> result = new ArrayList<>();
            collectSprites(contentRoot, xmlFile, root, "", result);
            return result;
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private static void collectSprites(Path contentRoot, Path definitionFile, Element element,
                                       String inheritedText, List<StyleSprite> result) {
        String ownText = elementText(element);
        String searchText = (inheritedText + " " + ownText).toLowerCase(Locale.ROOT);
        for (String value : attributeValues(element)) {
            if (!looksLikeImagePath(value)) continue;
            Path image = resolveContentPath(contentRoot, definitionFile.getParent(), value);
            if (image != null && Files.isRegularFile(image)) {
                result.add(new StyleSprite(image, sourceRectangle(element), searchText, definitionFile));
            }
        }
        NodeList children = element.getChildNodes();
        for (int index = 0; index < children.getLength(); index++) {
            Node child = children.item(index);
            if (child instanceof Element childElement) {
                collectSprites(contentRoot, definitionFile, childElement, searchText, result);
            }
        }
    }

    private static String elementText(Element element) {
        StringBuilder text = new StringBuilder(element.getTagName());
        NamedNodeMap attributes = element.getAttributes();
        for (int index = 0; index < attributes.getLength(); index++) {
            Node attribute = attributes.item(index);
            String value = attribute.getNodeValue();
            if (value != null && value.length() <= 512) {
                text.append(' ').append(attribute.getNodeName()).append(' ').append(value);
            }
        }
        return text.toString();
    }

    private static List<String> attributeValues(Element element) {
        List<String> values = new ArrayList<>();
        NamedNodeMap attributes = element.getAttributes();
        for (int index = 0; index < attributes.getLength(); index++) {
            String value = attributes.item(index).getNodeValue();
            if (value != null) values.add(value.trim());
        }
        return values;
    }

    private static SourceRectangle sourceRectangle(Element element) {
        NamedNodeMap attributes = element.getAttributes();
        for (int index = 0; index < attributes.getLength(); index++) {
            Node attribute = attributes.item(index);
            String name = attribute.getNodeName().replace("_", "").replace("-", "")
                    .toLowerCase(Locale.ROOT);
            if (!name.contains("sourcerect")) continue;
            String[] parts = attribute.getNodeValue().trim().split("[,;\\s]+");
            if (parts.length != 4) continue;
            try {
                int x = Integer.parseInt(parts[0]);
                int y = Integer.parseInt(parts[1]);
                int width = Integer.parseInt(parts[2]);
                int height = Integer.parseInt(parts[3]);
                if (x >= 0 && y >= 0 && width > 0 && height > 0) {
                    return new SourceRectangle(x, y, width, height);
                }
            } catch (NumberFormatException ignored) { }
        }
        return null;
    }

    private static Path resolveContentPath(Path contentRoot, Path definitionDirectory, String raw) {
        String value = raw.trim().replace('\\', '/');
        value = value.replace("$ContentDir$/", "").replace("%ContentDir%/", "")
                .replace("$ModDir$/", "").replace("%ModDir%/", "");
        while (value.startsWith("./")) value = value.substring(2);
        if (value.toLowerCase(Locale.ROOT).startsWith("content/")) value = value.substring("content/".length());
        try {
            Path contentCandidate = contentRoot.resolve(value).normalize();
            if (contentCandidate.startsWith(contentRoot) && Files.isRegularFile(contentCandidate)) {
                return contentCandidate;
            }
            Path relativeCandidate = definitionDirectory.resolve(value).normalize();
            if (relativeCandidate.startsWith(contentRoot) && Files.isRegularFile(relativeCandidate)) {
                return relativeCandidate;
            }
        } catch (RuntimeException ignored) { }
        return null;
    }

    private static boolean shouldInspectXml(Path path, String rootName) {
        if (rootName.equals("UI") || rootName.equals("Map")) return true;
        String lower = path.getFileName().toString().toLowerCase(Locale.ROOT);
        return lower.contains("style") || lower.contains("icon") || lower.contains("hud")
                || lower.contains("menu") || lower.contains("campaign");
    }

    private static boolean isXml(Path path) {
        return path.getFileName().toString().toLowerCase(Locale.ROOT).endsWith(".xml");
    }

    private static boolean isImage(Path path) {
        String name = path.getFileName().toString();
        int dot = name.lastIndexOf('.');
        return dot >= 0 && IMAGE_EXTENSIONS.contains(name.substring(dot + 1).toLowerCase(Locale.ROOT));
    }

    private static boolean looksLikeImagePath(String value) {
        String lower = value.toLowerCase(Locale.ROOT);
        return IMAGE_EXTENSIONS.stream().anyMatch(extension -> lower.endsWith("." + extension));
    }

    private static String normalizedSearchText(Path contentRoot, Path path) {
        return contentRoot.relativize(path).toString().replace('\\', '/').toLowerCase(Locale.ROOT);
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

    public enum GraphicSource { DONOR_INSTALLATION, PROCEDURAL_FALLBACK }
    public enum Category { BACKGROUND, CHROME, MAP_MARKER, STATUS, OPERATION }
    public enum ScaleMode { CONTAIN, COVER, STRETCH }

    public enum VisualRole {
        APP_BACKGROUND("Application background", Category.BACKGROUND, ScaleMode.COVER,
                tokens("mainmenubackground", "backgroundsprite", "mainmenu"),
                paths("UI/MainMenuBackground.png", "UI/MainMenu/MainMenuBackground.png", "UI/Backgrounds/MainMenuBackground.png")),
        MAP_BACKGROUND("Europa map background", Category.BACKGROUND, ScaleMode.COVER,
                tokens("mapbackground", "campaignmap", "locationmap", "radiationmap"),
                paths("Map/MapBackground.png", "UI/MapBackground.png", "UI/CampaignMapBackground.png")),
        PANEL("Outer frame", Category.CHROME, ScaleMode.STRETCH,
                tokens("guiframe", "frame", "outerframe"), paths("UI/GUIFrame.png", "UI/Frame.png")),
        INNER_PANEL("Inner frame", Category.CHROME, ScaleMode.STRETCH,
                tokens("innerframe", "itemui", "listbox"), paths("UI/InnerFrame.png")),
        BUTTON("Button", Category.CHROME, ScaleMode.STRETCH,
                tokens("guibutton", "buttonframe", "mainmenuguitextblock"), paths("UI/GUIButton.png", "UI/Button.png")),
        TAB("Tab", Category.CHROME, ScaleMode.STRETCH,
                tokens("tabbutton", "guitab", "tabframe"), paths("UI/TabButton.png", "UI/Tab.png")),
        PROGRESS_TRACK("Progress track", Category.CHROME, ScaleMode.STRETCH,
                tokens("guiprogressbar", "progressbarbackground", "progresstrack"), paths("UI/ProgressBar.png")),
        PROGRESS_FILL("Progress fill", Category.CHROME, ScaleMode.STRETCH,
                tokens("progressbarfill", "progressfill"), paths("UI/ProgressBarFill.png")),
        LOCATION_MARKER("Location", Category.MAP_MARKER, ScaleMode.CONTAIN,
                tokens("sublocationicon", "locationicon", "youareherecircle"), paths("UI/Icons/location.png", "Map/LocationIcon.png")),
        OUTPOST_MARKER("Outpost", Category.MAP_MARKER, ScaleMode.CONTAIN,
                tokens("outposticon", "stationicon"), paths("UI/Icons/outpost.png", "UI/Icons/station.png")),
        CAVE_MARKER("Cave", Category.MAP_MARKER, ScaleMode.CONTAIN,
                tokens("caveicon", "cavemarker"), paths("UI/Icons/cave.png", "Map/CaveIcon.png")),
        RUIN_MARKER("Ruin", Category.MAP_MARKER, ScaleMode.CONTAIN,
                tokens("ruinicon", "ancientruin"), paths("UI/Icons/ruin.png", "Map/RuinIcon.png")),
        BEACON_MARKER("Beacon", Category.MAP_MARKER, ScaleMode.CONTAIN,
                tokens("beaconicon", "beaconstation"), paths("UI/Icons/beacon.png", "Map/BeaconIcon.png")),
        WRECK_MARKER("Wreck", Category.MAP_MARKER, ScaleMode.CONTAIN,
                tokens("wreckicon", "wreckmarker"), paths("UI/Icons/wreck.png", "Map/WreckIcon.png")),
        SUBMARINE_MARKER("Submarine", Category.MAP_MARKER, ScaleMode.CONTAIN,
                tokens("submarinelocationicon", "submarineicon", "subicon"), paths("UI/Icons/submarine.png", "UI/Icons/sub.png")),
        SHUTTLE_MARKER("Shuttle", Category.MAP_MARKER, ScaleMode.CONTAIN,
                tokens("shuttleicon", "shuttlemarker"), paths("UI/Icons/shuttle.png")),
        ENEMY_MARKER("Enemy", Category.MAP_MARKER, ScaleMode.CONTAIN,
                tokens("enemyicon", "hostileicon", "monstericon"), paths("UI/Icons/enemy.png", "UI/Icons/fauna.png")),
        RADIATION_MARKER("Radiation", Category.MAP_MARKER, ScaleMode.CONTAIN,
                tokens("radiationanimspritesheet", "radiation", "radiationicon"), paths("UI/Icons/radiation.png")),
        ROUTE_ARROW("Route arrow", Category.MAP_MARKER, ScaleMode.CONTAIN,
                tokens("arrow", "routearrow", "directionarrow"), paths("UI/Icons/arrow.png")),
        BROKEN_STATUS("Broken", Category.STATUS, ScaleMode.CONTAIN,
                tokens("brokenicon", "damagedicon"), paths("UI/Icons/broken.png")),
        SAVING_STATUS("Saving", Category.STATUS, ScaleMode.CONTAIN,
                tokens("savingindicator", "genericthrobber", "savingicon"), paths("UI/Icons/saving.png")),
        GLOW("Selection glow", Category.STATUS, ScaleMode.CONTAIN,
                tokens("uiglowcircular", "uiglow", "pingcircle", "buttonpulse"), paths("UI/Icons/glow.png")),
        NOTIFICATION_ICON("Notification", Category.STATUS, ScaleMode.CONTAIN,
                tokens("guinotificationbutton", "speechbubbleicon", "notificationicon"), paths("UI/Icons/notification.png")),
        WARNING_ICON("Warning", Category.STATUS, ScaleMode.CONTAIN,
                tokens("warningicon", "iconoverflowindicator", "attentionicon"), paths("UI/Icons/warning.png")),
        MISSION_ICON("Mission", Category.OPERATION, ScaleMode.CONTAIN,
                tokens("missionicon", "campaignmission", "jobicon"), paths("UI/Icons/mission.png")),
        RESEARCH_ICON("Research", Category.OPERATION, ScaleMode.CONTAIN,
                tokens("researchicon", "talentglow", "research"), paths("UI/Icons/research.png")),
        CARGO_ICON("Cargo", Category.OPERATION, ScaleMode.CONTAIN,
                tokens("cargoicon", "inventoryslot", "itemui"), paths("UI/Icons/cargo.png", "UI/Icons/inventory.png")),
        CURRENCY_ICON("Currency", Category.OPERATION, ScaleMode.CONTAIN,
                tokens("crewwalleticonsmall", "walletportraitbg", "moneyicon"), paths("UI/Icons/wallet.png", "UI/Icons/money.png")),
        CREW_ICON("Crew", Category.OPERATION, ScaleMode.CONTAIN,
                tokens("crewicon", "crewlist", "charactericon"), paths("UI/Icons/crew.png")),
        FAUNA_ICON("Fauna", Category.OPERATION, ScaleMode.CONTAIN,
                tokens("enemyicon", "fauna", "crawler", "moloch"), paths("UI/Icons/fauna.png")),
        GEOLOGY_ICON("Geology", Category.OPERATION, ScaleMode.CONTAIN,
                tokens("caveicon", "mineral", "oreicon", "geology"), paths("UI/Icons/ore.png")),
        STATION_ICON("Station", Category.OPERATION, ScaleMode.CONTAIN,
                tokens("outposticon", "station", "outpost"), paths("UI/Icons/station.png", "UI/Icons/outpost.png")),
        VESSEL_ICON("Vessel", Category.OPERATION, ScaleMode.CONTAIN,
                tokens("submarinelocationicon", "submarine", "vessel"), paths("UI/Icons/submarine.png", "UI/Icons/sub.png"));

        private final String label;
        private final Category category;
        private final ScaleMode scaleMode;
        private final List<String> tokens;
        private final List<String> preferredRelativePaths;

        VisualRole(String label, Category category, ScaleMode scaleMode,
                   List<String> tokens, List<String> preferredRelativePaths) {
            this.label = label;
            this.category = category;
            this.scaleMode = scaleMode;
            this.tokens = List.copyOf(tokens);
            this.preferredRelativePaths = List.copyOf(preferredRelativePaths);
        }

        public String label() { return label; }
        public Category category() { return category; }
        public ScaleMode scaleMode() { return scaleMode; }
        public List<String> preferredRelativePaths() { return preferredRelativePaths; }

        int score(String text) {
            String lower = text.toLowerCase(Locale.ROOT).replace("_", "").replace("-", "").replace(" ", "");
            int score = 0;
            for (int index = 0; index < tokens.size(); index++) {
                String token = tokens.get(index).toLowerCase(Locale.ROOT).replace("_", "").replace("-", "").replace(" ", "");
                if (lower.contains(token)) score += 200 - index * 12 + token.length();
            }
            return score;
        }
    }

    public record SourceRectangle(int x, int y, int width, int height) { }
    public record ResolvedGraphic(VisualRole role, GraphicSource source, Path file,
                                  SourceRectangle sourceRectangle, Path donorInstallation, String detail) { }
    public record CoverageRow(VisualRole role, GraphicSource source, Path file,
                              SourceRectangle sourceRectangle, String detail) { }
    public record CoverageReport(int donorCount, int fallbackCount, List<CoverageRow> rows) { }

    private record AssetIndex(Path contentRoot, List<Path> images, List<StyleSprite> styleSprites) { }
    private record StyleSprite(Path file, SourceRectangle sourceRectangle, String searchText, Path definitionFile) { }
    private record IndexedGraphic(Path file, SourceRectangle sourceRectangle, String detail) { }
    private record ScoredStyle(StyleSprite sprite, int score) { }
    private record ScoredImage(Path path, int score) { }

    private static List<String> tokens(String... values) { return List.of(values); }
    private static List<String> paths(String... values) { return List.of(values); }

    private static final class ProceduralFallbacks {
        private static final Color DEEP = new Color(7, 18, 24);
        private static final Color MID = new Color(18, 47, 57);
        private static final Color EDGE = new Color(83, 154, 164);
        private static final Color LIGHT = new Color(205, 228, 219);
        private static final Color WARM = new Color(226, 177, 92);
        private static final Color DANGER = new Color(201, 75, 68);

        private ProceduralFallbacks() { }

        static BufferedImage render(VisualRole role, int width, int height) {
            BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
            Graphics2D g = image.createGraphics();
            try {
                g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
                if (role.category() == Category.BACKGROUND) drawBackground(g, role, width, height);
                else if (role.category() == Category.CHROME) drawChrome(g, role, width, height);
                else drawIcon(g, role, width, height);
            } finally {
                g.dispose();
            }
            return image;
        }

        private static void drawBackground(Graphics2D g, VisualRole role, int width, int height) {
            g.setPaint(new GradientPaint(0, 0, MID, 0, height, DEEP));
            g.fillRect(0, 0, width, height);
            Random random = new Random(0xB4A07L + role.ordinal() * 97L + width * 13L + height);
            g.setStroke(new BasicStroke(Math.max(1f, Math.min(width, height) / 260f)));
            for (int index = 0; index < Math.max(24, width * height / 9000); index++) {
                int x = random.nextInt(Math.max(1, width));
                int y = random.nextInt(Math.max(1, height));
                int radius = 2 + random.nextInt(Math.max(3, Math.min(width, height) / 18 + 1));
                int alpha = 18 + random.nextInt(48);
                g.setColor(new Color(110, 190, 194, alpha));
                g.draw(new Ellipse2D.Double(x - radius, y - radius, radius * 2.0, radius * 2.0));
            }
            g.setColor(new Color(190, 230, 220, 28));
            for (int y = height / 6; y < height; y += Math.max(18, height / 8)) {
                g.drawLine(0, y, width, y + height / 18);
            }
        }

        private static void drawChrome(Graphics2D g, VisualRole role, int width, int height) {
            int arc = Math.max(8, Math.min(width, height) / 5);
            Color fill = switch (role) {
                case BUTTON, TAB -> new Color(28, 61, 68, 235);
                case PROGRESS_FILL -> new Color(74, 155, 143, 240);
                case PROGRESS_TRACK -> new Color(11, 26, 31, 235);
                default -> new Color(12, 31, 38, 235);
            };
            g.setColor(fill);
            g.fill(new RoundRectangle2D.Double(1, 1, width - 2.0, height - 2.0, arc, arc));
            g.setStroke(new BasicStroke(Math.max(1f, Math.min(width, height) / 28f)));
            g.setColor(role == VisualRole.PROGRESS_FILL ? LIGHT : EDGE);
            g.draw(new RoundRectangle2D.Double(1.5, 1.5, width - 3.0, height - 3.0, arc, arc));
            if (role == VisualRole.INNER_PANEL) {
                g.setColor(new Color(190, 230, 220, 24));
                g.draw(new RoundRectangle2D.Double(5, 5, width - 10.0, height - 10.0, Math.max(4, arc - 4), Math.max(4, arc - 4)));
            }
        }

        private static void drawIcon(Graphics2D g, VisualRole role, int width, int height) {
            int size = Math.max(8, Math.min(width, height));
            double cx = width / 2.0;
            double cy = height / 2.0;
            double radius = size * 0.34;
            g.setStroke(new BasicStroke(Math.max(1.5f, size / 12f), BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
            g.setColor(new Color(5, 18, 23, 210));
            g.fill(new Ellipse2D.Double(cx - radius - 3, cy - radius - 3, (radius + 3) * 2, (radius + 3) * 2));
            g.setColor(color(role));

            switch (role) {
                case LOCATION_MARKER -> {
                    g.draw(new Ellipse2D.Double(cx - radius * 0.55, cy - radius * 0.55, radius * 1.1, radius * 1.1));
                    g.fill(new Ellipse2D.Double(cx - radius * 0.13, cy - radius * 0.13, radius * 0.26, radius * 0.26));
                }
                case OUTPOST_MARKER, STATION_ICON -> {
                    Polygon hex = polygon(cx, cy, radius, 6, Math.PI / 6);
                    g.drawPolygon(hex);
                    g.drawLine((int) (cx - radius * 0.5), (int) cy, (int) (cx + radius * 0.5), (int) cy);
                    g.drawLine((int) cx, (int) (cy - radius * 0.5), (int) cx, (int) (cy + radius * 0.5));
                }
                case CAVE_MARKER, GEOLOGY_ICON -> {
                    Path2D cave = new Path2D.Double();
                    cave.moveTo(cx - radius, cy + radius * 0.65);
                    cave.lineTo(cx - radius * 0.55, cy - radius * 0.35);
                    cave.lineTo(cx, cy - radius);
                    cave.lineTo(cx + radius * 0.65, cy - radius * 0.25);
                    cave.lineTo(cx + radius, cy + radius * 0.65);
                    cave.closePath();
                    g.draw(cave);
                    g.draw(new Ellipse2D.Double(cx - radius * 0.25, cy, radius * 0.5, radius * 0.65));
                }
                case RUIN_MARKER -> {
                    g.drawRect((int) (cx - radius * 0.75), (int) (cy - radius * 0.65), (int) (radius * 1.5), (int) (radius * 1.3));
                    g.drawLine((int) (cx - radius * 0.75), (int) (cy - radius * 0.2), (int) (cx + radius * 0.75), (int) (cy - radius * 0.2));
                    g.drawLine((int) cx, (int) (cy - radius * 0.65), (int) cx, (int) (cy + radius * 0.65));
                }
                case BEACON_MARKER -> {
                    g.drawLine((int) cx, (int) (cy - radius), (int) cx, (int) (cy + radius));
                    g.draw(new Ellipse2D.Double(cx - radius * 0.22, cy - radius * 0.95, radius * 0.44, radius * 0.44));
                    g.drawArc((int) (cx - radius * 0.75), (int) (cy - radius * 0.75), (int) (radius * 1.5), (int) (radius * 1.5), 25, 130);
                }
                case WRECK_MARKER -> {
                    g.drawLine((int) (cx - radius), (int) (cy - radius * 0.55), (int) (cx + radius), (int) (cy + radius * 0.55));
                    g.drawLine((int) (cx - radius), (int) (cy + radius * 0.55), (int) (cx + radius), (int) (cy - radius * 0.55));
                    g.draw(new Ellipse2D.Double(cx - radius * 0.9, cy - radius * 0.45, radius * 1.8, radius * 0.9));
                }
                case SUBMARINE_MARKER, SHUTTLE_MARKER, VESSEL_ICON -> drawSubmarine(g, cx, cy, radius);
                case ENEMY_MARKER, FAUNA_ICON -> {
                    g.draw(new Ellipse2D.Double(cx - radius * 0.8, cy - radius * 0.55, radius * 1.6, radius * 1.1));
                    g.fill(new Ellipse2D.Double(cx - radius * 0.3, cy - radius * 0.13, radius * 0.18, radius * 0.18));
                    g.fill(new Ellipse2D.Double(cx + radius * 0.12, cy - radius * 0.13, radius * 0.18, radius * 0.18));
                    g.drawArc((int) (cx - radius * 0.4), (int) (cy - radius * 0.05), (int) (radius * 0.8), (int) (radius * 0.55), 200, 140);
                }
                case RADIATION_MARKER -> {
                    g.draw(new Ellipse2D.Double(cx - radius * 0.17, cy - radius * 0.17, radius * 0.34, radius * 0.34));
                    for (int index = 0; index < 3; index++) {
                        double angle = index * Math.PI * 2 / 3 - Math.PI / 2;
                        Polygon blade = new Polygon();
                        blade.addPoint((int) (cx + Math.cos(angle - 0.45) * radius * 0.35), (int) (cy + Math.sin(angle - 0.45) * radius * 0.35));
                        blade.addPoint((int) (cx + Math.cos(angle) * radius), (int) (cy + Math.sin(angle) * radius));
                        blade.addPoint((int) (cx + Math.cos(angle + 0.45) * radius * 0.35), (int) (cy + Math.sin(angle + 0.45) * radius * 0.35));
                        g.fillPolygon(blade);
                    }
                }
                case ROUTE_ARROW -> {
                    g.drawLine((int) (cx - radius), (int) cy, (int) (cx + radius * 0.65), (int) cy);
                    g.drawLine((int) (cx + radius * 0.65), (int) cy, (int) (cx + radius * 0.15), (int) (cy - radius * 0.5));
                    g.drawLine((int) (cx + radius * 0.65), (int) cy, (int) (cx + radius * 0.15), (int) (cy + radius * 0.5));
                }
                case BROKEN_STATUS, WARNING_ICON -> drawGlyph(g, role == VisualRole.BROKEN_STATUS ? "!" : "△", width, height, size);
                case SAVING_STATUS -> {
                    g.drawArc((int) (cx - radius), (int) (cy - radius), (int) (radius * 2), (int) (radius * 2), 30, 280);
                    g.drawLine((int) (cx + radius * 0.75), (int) (cy - radius * 0.45), (int) (cx + radius), (int) (cy - radius * 0.15));
                }
                case GLOW -> {
                    for (int index = 0; index < 3; index++) {
                        double r = radius * (0.45 + index * 0.27);
                        g.draw(new Ellipse2D.Double(cx - r, cy - r, r * 2, r * 2));
                    }
                }
                case NOTIFICATION_ICON -> {
                    g.draw(new RoundRectangle2D.Double(cx - radius, cy - radius * 0.7, radius * 2, radius * 1.35, radius * 0.35, radius * 0.35));
                    g.drawLine((int) (cx - radius * 0.35), (int) (cy + radius * 0.65), (int) (cx - radius * 0.55), (int) (cy + radius));
                }
                case MISSION_ICON -> drawGlyph(g, "M", width, height, size);
                case RESEARCH_ICON -> drawGlyph(g, "R", width, height, size);
                case CARGO_ICON -> {
                    g.drawRect((int) (cx - radius * 0.75), (int) (cy - radius * 0.65), (int) (radius * 1.5), (int) (radius * 1.3));
                    g.drawLine((int) (cx - radius * 0.75), (int) (cy - radius * 0.1), (int) (cx + radius * 0.75), (int) (cy - radius * 0.1));
                }
                case CURRENCY_ICON -> drawGlyph(g, "¢", width, height, size);
                case CREW_ICON -> {
                    g.draw(new Ellipse2D.Double(cx - radius * 0.28, cy - radius * 0.8, radius * 0.56, radius * 0.56));
                    g.drawArc((int) (cx - radius * 0.7), (int) (cy - radius * 0.2), (int) (radius * 1.4), (int) (radius * 1.2), 0, 180);
                }
                default -> drawGlyph(g, role.label().substring(0, 1), width, height, size);
            }
        }

        private static void drawSubmarine(Graphics2D g, double cx, double cy, double radius) {
            g.draw(new Ellipse2D.Double(cx - radius, cy - radius * 0.42, radius * 2, radius * 0.84));
            g.drawRect((int) (cx - radius * 0.15), (int) (cy - radius * 0.72), (int) (radius * 0.45), (int) (radius * 0.3));
            g.drawLine((int) (cx - radius), (int) cy, (int) (cx - radius * 1.25), (int) (cy - radius * 0.45));
            g.drawLine((int) (cx - radius), (int) cy, (int) (cx - radius * 1.25), (int) (cy + radius * 0.45));
        }

        private static void drawGlyph(Graphics2D g, String glyph, int width, int height, int size) {
            Font font = new Font(Font.SANS_SERIF, Font.BOLD, Math.max(10, (int) (size * 0.72)));
            g.setFont(font);
            var metrics = g.getFontMetrics();
            int x = (width - metrics.stringWidth(glyph)) / 2;
            int y = (height - metrics.getHeight()) / 2 + metrics.getAscent();
            g.drawString(glyph, x, y);
        }

        private static Polygon polygon(double cx, double cy, double radius, int sides, double rotation) {
            Polygon polygon = new Polygon();
            for (int index = 0; index < sides; index++) {
                double angle = rotation + index * Math.PI * 2 / sides;
                polygon.addPoint((int) Math.round(cx + Math.cos(angle) * radius),
                        (int) Math.round(cy + Math.sin(angle) * radius));
            }
            return polygon;
        }

        private static Color color(VisualRole role) {
            return switch (role) {
                case ENEMY_MARKER, FAUNA_ICON, BROKEN_STATUS, WARNING_ICON, RADIATION_MARKER -> DANGER;
                case MISSION_ICON, CURRENCY_ICON, BEACON_MARKER -> WARM;
                case RESEARCH_ICON, GEOLOGY_ICON, CAVE_MARKER, RUIN_MARKER -> new Color(162, 143, 194);
                default -> LIGHT;
            };
        }
    }

    public static void verifyContract() throws Exception {
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
            ResolvedGraphic submarine = catalogue.resolve(VisualRole.SUBMARINE_MARKER);
            require(submarine.source() == GraphicSource.DONOR_INSTALLATION
                            && submarine.sourceRectangle() != null
                            && submarine.sourceRectangle().width() == 8,
                    "Atlas-backed submarine marker was not resolved from the donor style XML.");
            BufferedImage cropped = catalogue.loadImage(VisualRole.SUBMARINE_MARKER, 32, 32);
            require(cropped.getWidth() == 32 && cropped.getHeight() == 32,
                    "Atlas-backed donor marker was not cropped and scaled.");

            donorAssets.saveConfiguration(BarotraumaDonorAssets.Mode.FALLBACK, null);
            catalogue.clearCache();
            for (VisualRole role : VisualRole.values()) {
                BufferedImage fallback = catalogue.loadImage(role, 48, 36);
                require(fallback.getWidth() == 48 && fallback.getHeight() == 36,
                        role + " procedural fallback could not be rendered.");
                require(catalogue.resolve(role).source() == GraphicSource.PROCEDURAL_FALLBACK,
                        role + " did not resolve to the independent fallback in fallback-only mode.");
            }
        } finally {
            try (Stream<Path> stream = Files.walk(root)) {
                for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
            }
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Barotrauma semantic donor-asset catalogue and procedural fallbacks passed.");
    }
}
