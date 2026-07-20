package io.github.mrcalzon02.barotrauma.assets;

import org.w3c.dom.Element;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Stream;

/** Desktop-only index of sprites inside a user-owned Barotrauma installation. */
final class BarotraumaDonorSpriteIndex {
    private static final Set<String> IMAGE_EXTENSIONS = Set.of("png", "jpg", "jpeg");
    private static final Set<String> INDEX_ROOTS = Set.of("UI", "Map", "Characters", "Items", "Missions", "Factions");
    private static final int MAX_INDEX_FILES = 60_000;
    private static final int MAX_XML_BYTES = 4_000_000;

    private volatile AssetIndex cachedIndex;

    void clear() {
        cachedIndex = null;
    }

    Optional<DonorGraphic> select(Path contentRoot, BarotraumaAssetCatalogue.VisualRole role) {
        AssetIndex index = indexFor(contentRoot);
        for (String relative : role.preferredRelativePaths()) {
            Path candidate = index.contentRoot().resolve(relative).normalize();
            if (candidate.startsWith(index.contentRoot()) && Files.isRegularFile(candidate)) {
                return Optional.of(new DonorGraphic(candidate, null, "Preferred donor file: " + relative));
            }
        }

        Optional<ScoredStyle> style = index.styleSprites().stream()
                .map(sprite -> new ScoredStyle(sprite, role.score(sprite.searchText())))
                .filter(scored -> scored.score() > 0)
                .max(Comparator.comparingInt(ScoredStyle::score)
                        .thenComparingInt(scored -> -scored.sprite().file().toString().length()));
        if (style.isPresent()) {
            StyleSprite sprite = style.get().sprite();
            return Optional.of(new DonorGraphic(sprite.file(), sprite.sourceRectangle(),
                    "Barotrauma style/atlas sprite from " + sprite.definitionFile().getFileName()));
        }

        return index.images().stream()
                .map(path -> new ScoredImage(path, role.score(normalizedSearchText(index.contentRoot(), path))))
                .filter(scored -> scored.score() > 0)
                .max(Comparator.comparingInt(ScoredImage::score)
                        .thenComparingInt(scored -> -scored.path().toString().length()))
                .map(scored -> new DonorGraphic(scored.path(), null,
                        "Barotrauma donor image matched by semantic role"));
    }

    private AssetIndex indexFor(Path contentRoot) {
        Path normalized = contentRoot.toAbsolutePath().normalize();
        AssetIndex existing = cachedIndex;
        if (existing != null && existing.contentRoot().equals(normalized)) return existing;
        synchronized (this) {
            existing = cachedIndex;
            if (existing == null || !existing.contentRoot().equals(normalized)) {
                existing = buildIndex(normalized);
                cachedIndex = existing;
            }
            return existing;
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
                    if (isImage(path)) images.add(path.toAbsolutePath().normalize());
                    else if (isXml(path) && shouldInspectXml(path, rootName)) {
                        sprites.addAll(readStyleSprites(contentRoot, path));
                    }
                }
            } catch (IOException ignored) { }
            if (visited > MAX_INDEX_FILES) break;
        }
        return new AssetIndex(contentRoot, List.copyOf(images), List.copyOf(sprites));
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
            return List.copyOf(result);
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private static void collectSprites(Path contentRoot, Path definitionFile, Element element,
                                       String inheritedText, List<StyleSprite> result) {
        String searchText = (inheritedText + " " + elementText(element)).toLowerCase(Locale.ROOT);
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

    private static BarotraumaAssetCatalogue.SourceRectangle sourceRectangle(Element element) {
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
                    return new BarotraumaAssetCatalogue.SourceRectangle(x, y, width, height);
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
        if (value.toLowerCase(Locale.ROOT).startsWith("content/")) {
            value = value.substring("content/".length());
        }
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

    record DonorGraphic(Path file, BarotraumaAssetCatalogue.SourceRectangle sourceRectangle, String detail) { }
    private record AssetIndex(Path contentRoot, List<Path> images, List<StyleSprite> styleSprites) { }
    private record StyleSprite(Path file, BarotraumaAssetCatalogue.SourceRectangle sourceRectangle,
                               String searchText, Path definitionFile) { }
    private record ScoredStyle(StyleSprite sprite, int score) { }
    private record ScoredImage(Path path, int score) { }
}
