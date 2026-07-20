package io.github.mrcalzon02.barotrauma.assets;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Stream;

/**
 * Immutable, local-only catalogue of media in a user-owned Barotrauma installation.
 * The catalogue stores portable paths and metadata; it never copies donor files.
 */
public final class BarotraumaAssetCatalog {
    private static final int MAX_CATALOG_ENTRIES = 40_000;
    private static final int MAX_INDEX_LINE_LENGTH = 131_072;
    private static final Set<String> IMAGE_EXTENSIONS = Set.of(
            "png", "jpg", "jpeg", "bmp", "gif", "tga", "tif", "tiff", "dds", "svg", "ico");
    private static final Set<String> AUDIO_EXTENSIONS = Set.of("ogg", "wav", "mp3", "flac");
    private static final Set<String> FONT_EXTENSIONS = Set.of("ttf", "otf");
    private static final Set<String> VIDEO_EXTENSIONS = Set.of("webm", "mp4");

    private BarotraumaAssetCatalog() { }

    /** Builds a fresh catalogue from the official Content tree only. */
    public static Catalog scan(Path installationRoot) throws IOException {
        Path root = validateInstallationRoot(installationRoot);
        Path content = root.resolve("Content");
        List<Path> mediaFiles;
        try (Stream<Path> stream = Files.walk(content)) {
            mediaFiles = stream
                    .filter(path -> Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS))
                    .filter(path -> !Files.isSymbolicLink(path))
                    .filter(BarotraumaAssetCatalog::isSupported)
                    .sorted(Comparator.comparing(path -> portable(root.relativize(path))))
                    .limit(MAX_CATALOG_ENTRIES + 1L)
                    .toList();
        }
        boolean truncated = mediaFiles.size() > MAX_CATALOG_ENTRIES;
        if (truncated) mediaFiles = mediaFiles.subList(0, MAX_CATALOG_ENTRIES);

        Path realRoot = root.toRealPath();
        List<Entry> entries = new ArrayList<>(mediaFiles.size());
        for (Path file : mediaFiles) {
            Path realFile = file.toRealPath();
            if (!realFile.startsWith(realRoot)) continue;
            String relative = portable(root.relativize(file));
            entries.add(entry(relative, file.getFileName().toString(), extension(file),
                    Files.size(file), Files.getLastModifiedTime(file).toInstant()));
        }
        return catalog(root, entries, CatalogSource.LIVE_SCAN, 0, truncated);
    }

    /**
     * Reads the retained CSV schema without trusting its FullPath column. Rows outside Content are ignored.
     */
    public static Catalog loadRetainedIndex(Path indexFile, Path installationRoot) throws IOException {
        Objects.requireNonNull(indexFile, "indexFile");
        Path root = validateInstallationRoot(installationRoot);
        List<String> lines = Files.readAllLines(indexFile, StandardCharsets.UTF_8);
        if (lines.isEmpty()) throw new IOException("Asset index is empty: " + indexFile);
        if (lines.size() > MAX_CATALOG_ENTRIES + 10_000) throw new IOException("Asset index has too many rows.");

        List<String> header = parseCsvLine(lines.get(0));
        Map<String, Integer> columns = new HashMap<>();
        for (int index = 0; index < header.size(); index++) {
            String heading = header.get(index).trim();
            if (index == 0 && heading.startsWith("\uFEFF")) heading = heading.substring(1);
            columns.put(heading.toLowerCase(Locale.ROOT), index);
        }
        for (String required : List.of("category", "mediatype", "relativepath", "name", "extension", "bytes", "modifiedutc")) {
            if (!columns.containsKey(required)) throw new IOException("Asset index is missing column: " + required);
        }

        List<Entry> entries = new ArrayList<>();
        int skipped = 0;
        for (int lineNumber = 1; lineNumber < lines.size(); lineNumber++) {
            String line = lines.get(lineNumber);
            if (line.isBlank()) continue;
            if (line.length() > MAX_INDEX_LINE_LENGTH) throw new IOException("Asset index line is too long: " + (lineNumber + 1));
            List<String> row = parseCsvLine(line);
            String relative = normalizePortableRelativePath(value(row, columns, "relativepath").replace('\\', '/'));
            if (!relative.toLowerCase(Locale.ROOT).startsWith("content/")) {
                skipped++;
                continue;
            }
            Category category = Category.fromExternal(value(row, columns, "category"));
            MediaType mediaType = MediaType.fromExternal(value(row, columns, "mediatype"));
            String name = value(row, columns, "name");
            String extension = value(row, columns, "extension").toLowerCase(Locale.ROOT);
            long bytes;
            try { bytes = Long.parseLong(value(row, columns, "bytes")); }
            catch (NumberFormatException exception) { throw new IOException("Invalid byte count on line " + (lineNumber + 1), exception); }
            if (bytes < 0) throw new IOException("Negative byte count on line " + (lineNumber + 1));
            Instant modified;
            try { modified = Instant.parse(value(row, columns, "modifiedutc")); }
            catch (DateTimeParseException exception) { throw new IOException("Invalid timestamp on line " + (lineNumber + 1), exception); }
            entries.add(new Entry(category, mediaType, relative, name, extension, bytes, modified));
            if (entries.size() > MAX_CATALOG_ENTRIES) throw new IOException("Asset index exceeds the catalogue limit.");
        }
        entries.sort(Comparator.comparing(Entry::category).thenComparing(Entry::relativePath));
        return catalog(root, entries, CatalogSource.RETAINED_INDEX, skipped, false);
    }

    private static Catalog catalog(Path root, List<Entry> entries, CatalogSource source,
                                   int skippedRows, boolean truncated) {
        List<Entry> immutable = List.copyOf(entries);
        return new Catalog(root, immutable, source, fingerprint(immutable), skippedRows, truncated);
    }

    private static Entry entry(String relative, String name, String extension, long bytes, Instant modified) {
        MediaType mediaType = mediaType(extension);
        return new Entry(category(relative, name, mediaType), mediaType, relative, name, extension, bytes, modified);
    }

    private static Category category(String relative, String name, MediaType mediaType) {
        String path = relative.toLowerCase(Locale.ROOT);
        String filename = name.toLowerCase(Locale.ROOT);
        if (path.startsWith("content/sounds/music/")) return Category.MUSIC;
        if (path.startsWith("content/sounds/ambient/")) return Category.AMBIENCE;
        if (mediaType == MediaType.AUDIO && path.startsWith("content/characters/")) return Category.CREATURE_AUDIO;
        if (mediaType == MediaType.AUDIO && path.startsWith("content/sounds/ui/")) return Category.UI_AUDIO;
        if (mediaType == MediaType.AUDIO) return Category.SOUND_EFFECTS;
        if (path.startsWith("content/backgroundcreatures/")) return Category.CREATURE_ELEMENTS;
        if (path.startsWith("content/splashscreens/") || filename.contains("background") || filename.contains("banner")) {
            return Category.BACKGROUNDS;
        }
        if (path.startsWith("content/ui/")) return Category.UI_ELEMENTS;
        if (path.startsWith("content/map/")) return Category.MAP_ELEMENTS;
        if (path.startsWith("content/characters/")) return Category.CREATURE_ELEMENTS;
        if (path.startsWith("content/items/")) return Category.ITEM_ELEMENTS;
        if (path.startsWith("content/submarines/")) return Category.SUBMARINE_ELEMENTS;
        if (path.startsWith("content/effects/") || path.startsWith("content/particles/") || path.startsWith("content/lights/")) {
            return Category.EFFECTS;
        }
        if (mediaType == MediaType.FONT) return Category.UI_ELEMENTS;
        if (mediaType == MediaType.VIDEO) return Category.VIDEO;
        return Category.OTHER_MEDIA;
    }

    private static MediaType mediaType(String extension) {
        if (AUDIO_EXTENSIONS.contains(extension)) return MediaType.AUDIO;
        if (FONT_EXTENSIONS.contains(extension)) return MediaType.FONT;
        if (VIDEO_EXTENSIONS.contains(extension)) return MediaType.VIDEO;
        if (extension.equals("xnb")) return MediaType.COMPILED_CONTENT;
        return MediaType.IMAGE;
    }

    private static boolean isSupported(Path path) {
        String extension = extension(path);
        return IMAGE_EXTENSIONS.contains(extension) || AUDIO_EXTENSIONS.contains(extension)
                || FONT_EXTENSIONS.contains(extension) || VIDEO_EXTENSIONS.contains(extension)
                || extension.equals("xnb");
    }

    private static String extension(Path path) {
        String name = path.getFileName().toString();
        int dot = name.lastIndexOf('.');
        return dot < 0 ? "" : name.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private static Path validateInstallationRoot(Path installationRoot) throws IOException {
        Objects.requireNonNull(installationRoot, "installationRoot");
        Path root = installationRoot.toAbsolutePath().normalize();
        if (!Files.isDirectory(root.resolve("Content"))) {
            throw new IOException("The selected installation has no Content directory: " + root);
        }
        return root;
    }

    private static String normalizePortableRelativePath(String relative) throws IOException {
        if (relative.isBlank() || relative.startsWith("/") || relative.matches("^[A-Za-z]:.*")) {
            throw new IOException("Asset index contains an absolute or empty path: " + relative);
        }
        Path normalized = Path.of(relative.replace('/', java.io.File.separatorChar)).normalize();
        if (normalized.isAbsolute() || normalized.startsWith("..")) {
            throw new IOException("Asset index path escapes the donor root: " + relative);
        }
        return portable(normalized);
    }

    private static String portable(Path relative) {
        return relative.toString().replace('\\', '/');
    }

    private static String value(List<String> row, Map<String, Integer> columns, String name) throws IOException {
        int index = columns.get(name);
        if (index >= row.size()) throw new IOException("Asset index row is missing value for " + name);
        return row.get(index);
    }

    private static List<String> parseCsvLine(String line) throws IOException {
        List<String> fields = new ArrayList<>();
        StringBuilder field = new StringBuilder();
        boolean quoted = false;
        for (int index = 0; index < line.length(); index++) {
            char character = line.charAt(index);
            if (character == '"') {
                if (quoted && index + 1 < line.length() && line.charAt(index + 1) == '"') {
                    field.append('"');
                    index++;
                } else {
                    quoted = !quoted;
                }
            } else if (character == ',' && !quoted) {
                fields.add(field.toString());
                field.setLength(0);
            } else {
                field.append(character);
            }
        }
        if (quoted) throw new IOException("Asset index contains an unterminated quoted field.");
        fields.add(field.toString());
        return fields;
    }

    private static String fingerprint(List<Entry> entries) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            for (Entry entry : entries.stream().sorted(Comparator.comparing(Entry::relativePath)).toList()) {
                String evidence = entry.relativePath() + '\0' + entry.bytes() + '\0' + entry.modifiedUtc() + '\n';
                digest.update(evidence.getBytes(StandardCharsets.UTF_8));
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable.", exception);
        }
    }

    public enum Category {
        AMBIENCE("ambience"), BACKGROUNDS("backgrounds"), CREATURE_AUDIO("creature-audio"),
        CREATURE_ELEMENTS("creature-elements"), EFFECTS("effects"), ITEM_ELEMENTS("item-elements"),
        MAP_ELEMENTS("map-elements"), MUSIC("music"), OTHER_MEDIA("other-media"),
        SOUND_EFFECTS("sound-effects"), SUBMARINE_ELEMENTS("submarine-elements"),
        UI_AUDIO("ui-audio"), UI_ELEMENTS("ui-elements"), VIDEO("video");

        private final String externalName;
        Category(String externalName) { this.externalName = externalName; }
        public String externalName() { return externalName; }
        static Category fromExternal(String value) throws IOException {
            for (Category category : values()) if (category.externalName.equalsIgnoreCase(value)) return category;
            throw new IOException("Unknown asset category: " + value);
        }
    }

    public enum MediaType {
        AUDIO("audio"), COMPILED_CONTENT("compiled-content"), FONT("font"), IMAGE("image"), VIDEO("video");

        private final String externalName;
        MediaType(String externalName) { this.externalName = externalName; }
        public String externalName() { return externalName; }
        static MediaType fromExternal(String value) throws IOException {
            for (MediaType type : values()) if (type.externalName.equalsIgnoreCase(value)) return type;
            throw new IOException("Unknown media type: " + value);
        }
    }

    public enum CatalogSource { LIVE_SCAN, RETAINED_INDEX }
    public enum ResolutionStatus { AVAILABLE, MISSING, CHANGED, UNSAFE }

    public record Entry(Category category, MediaType mediaType, String relativePath, String name,
                        String extension, long bytes, Instant modifiedUtc) {
        public Entry {
            Objects.requireNonNull(category, "category");
            Objects.requireNonNull(mediaType, "mediaType");
            Objects.requireNonNull(relativePath, "relativePath");
            Objects.requireNonNull(name, "name");
            Objects.requireNonNull(extension, "extension");
            Objects.requireNonNull(modifiedUtc, "modifiedUtc");
            if (bytes < 0) throw new IllegalArgumentException("bytes must not be negative");
        }
    }

    public record Resolution(Entry entry, ResolutionStatus status, Path file, String detail) { }

    public record Catalog(Path installationRoot, List<Entry> entries, CatalogSource source,
                          String fingerprint, int skippedRows, boolean truncated) {
        public Catalog {
            Objects.requireNonNull(installationRoot, "installationRoot");
            entries = List.copyOf(entries);
            Objects.requireNonNull(source, "source");
            Objects.requireNonNull(fingerprint, "fingerprint");
        }

        public Map<Category, Long> categoryCounts() {
            EnumMap<Category, Long> counts = new EnumMap<>(Category.class);
            for (Entry entry : entries) counts.merge(entry.category(), 1L, Long::sum);
            return Map.copyOf(counts);
        }

        public Resolution resolve(Entry entry) {
            if (!entries.contains(entry)) return new Resolution(entry, ResolutionStatus.UNSAFE, null,
                    "The entry does not belong to this immutable catalogue.");
            try {
                String relative = normalizePortableRelativePath(entry.relativePath());
                if (!relative.equals(entry.relativePath())
                        || !relative.toLowerCase(Locale.ROOT).startsWith("content/")) {
                    return new Resolution(entry, ResolutionStatus.UNSAFE, null,
                            "The path is not a normalized member of the donor Content tree.");
                }
                Path contentRoot = installationRoot.resolve("Content").normalize();
                Path target = installationRoot.resolve(relative.replace('/', java.io.File.separatorChar)).normalize();
                if (!target.startsWith(contentRoot) || Files.isSymbolicLink(target)) {
                    return new Resolution(entry, ResolutionStatus.UNSAFE, null,
                            "The path escapes or links outside the donor Content tree.");
                }
                if (!Files.isRegularFile(target, LinkOption.NOFOLLOW_LINKS)) {
                    return new Resolution(entry, ResolutionStatus.MISSING, null, "The indexed donor file is missing.");
                }
                Path realContentRoot = contentRoot.toRealPath();
                Path realTarget = target.toRealPath();
                if (!realTarget.startsWith(realContentRoot)) {
                    return new Resolution(entry, ResolutionStatus.UNSAFE, null,
                            "The resolved path escapes the donor Content tree.");
                }
                if (Files.size(realTarget) != entry.bytes()) {
                    return new Resolution(entry, ResolutionStatus.CHANGED, realTarget,
                            "The donor file size changed after the catalogue was built.");
                }
                if (!Files.getLastModifiedTime(realTarget, LinkOption.NOFOLLOW_LINKS).toInstant()
                        .equals(entry.modifiedUtc())) {
                    return new Resolution(entry, ResolutionStatus.CHANGED, realTarget,
                            "The donor file modification time changed after the catalogue was built.");
                }
                return new Resolution(entry, ResolutionStatus.AVAILABLE, realTarget, "The donor file is available.");
            } catch (IOException | RuntimeException exception) {
                return new Resolution(entry, ResolutionStatus.UNSAFE, null, exception.getMessage());
            }
        }
    }

    public static void verifyContract() throws Exception {
        Path root = Files.createTempDirectory("barotrauma-asset-catalog-");
        try {
            Path installation = root.resolve("Barotrauma");
            Path content = installation.resolve("Content");
            Files.createDirectories(content.resolve("Sounds/Music"));
            Files.createDirectories(content.resolve("Characters/Crawler"));
            Files.createDirectories(content.resolve("UI"));
            Files.createDirectories(installation.resolve("LocalMods/private"));
            Files.writeString(content.resolve("Sounds/Music/Europa.ogg"), "music", StandardCharsets.UTF_8);
            Files.writeString(content.resolve("Characters/Crawler/crawler.png"), "image", StandardCharsets.UTF_8);
            Files.writeString(content.resolve("UI/interface.ttf"), "font", StandardCharsets.UTF_8);
            Files.writeString(installation.resolve("LocalMods/private/private.png"), "private", StandardCharsets.UTF_8);

            Catalog live = scan(installation);
            require(live.entries().size() == 3, "Live scan did not limit itself to official Content media.");
            require(live.categoryCounts().get(Category.MUSIC) == 1L, "Music categorization failed.");
            require(live.categoryCounts().get(Category.CREATURE_ELEMENTS) == 1L, "Creature categorization failed.");
            Entry music = live.entries().stream().filter(entry -> entry.category() == Category.MUSIC).findFirst().orElseThrow();
            require(live.resolve(music).status() == ResolutionStatus.AVAILABLE, "Available donor resolution failed.");
            Files.writeString(content.resolve("Sounds/Music/Europa.ogg"), "MUSIC", StandardCharsets.UTF_8);
            Files.setLastModifiedTime(content.resolve("Sounds/Music/Europa.ogg"),
                    java.nio.file.attribute.FileTime.from(music.modifiedUtc().plusSeconds(5)));
            require(live.resolve(music).status() == ResolutionStatus.CHANGED,
                    "Same-size donor-file modification detection failed.");
            Files.writeString(content.resolve("Sounds/Music/Europa.ogg"), "changed", StandardCharsets.UTF_8);
            require(live.resolve(music).status() == ResolutionStatus.CHANGED, "Stale donor-file detection failed.");
            Files.delete(content.resolve("Sounds/Music/Europa.ogg"));
            require(live.resolve(music).status() == ResolutionStatus.MISSING, "Missing donor-file detection failed.");

            Path index = root.resolve("importable-assets.csv");
            String interfaceModifiedUtc = Files.getLastModifiedTime(content.resolve("UI/interface.ttf"))
                    .toInstant().toString();
            Files.writeString(index,
                    "\"Category\",\"MediaType\",\"RelativePath\",\"Name\",\"Extension\",\"Bytes\",\"ModifiedUtc\",\"FullPath\"\n"
                            + "\"ui-elements\",\"font\",\"Content/UI/interface.ttf\",\"interface.ttf\",\"ttf\",\"4\",\""
                            + interfaceModifiedUtc + "\",\"ignored\"\n"
                            + "\"other-media\",\"image\",\"LocalMods/private/private.png\",\"private.png\",\"png\",\"7\",\"2026-07-19T00:00:00Z\",\"ignored\"\n"
                            + "\"other-media\",\"image\",\"Content/../LocalMods/private/private.png\",\"private.png\",\"png\",\"7\",\"2026-07-19T00:00:00Z\",\"ignored\"\n",
                    StandardCharsets.UTF_8);
            Catalog retained = loadRetainedIndex(index, installation);
            require(retained.entries().size() == 1 && retained.skippedRows() == 2,
                    "Retained index did not exclude direct and traversed user-created content.");
            require(retained.resolve(retained.entries().get(0)).status() == ResolutionStatus.AVAILABLE,
                    "Retained relative-path resolution failed.");

            Path unsafe = root.resolve("unsafe.csv");
            Files.writeString(unsafe,
                    "Category,MediaType,RelativePath,Name,Extension,Bytes,ModifiedUtc\n"
                            + "other-media,image,../escape.png,escape.png,png,1,2026-07-19T00:00:00Z\n",
                    StandardCharsets.UTF_8);
            boolean rejected = false;
            try { loadRetainedIndex(unsafe, installation); }
            catch (IOException expected) { rejected = true; }
            require(rejected, "Traversal in a retained asset index was not rejected.");
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
        if (args.length == 0) {
            verifyContract();
            System.out.println("Barotrauma local asset catalogue contracts passed.");
            return;
        }
        Catalog catalog;
        if (args.length == 2 && args[0].equals("--scan")) {
            catalog = scan(Path.of(args[1]));
        } else if (args.length == 3 && args[0].equals("--index")) {
            catalog = loadRetainedIndex(Path.of(args[1]), Path.of(args[2]));
        } else {
            System.err.println("Usage: BarotraumaAssetCatalog [--scan INSTALL_ROOT | --index CSV INSTALL_ROOT]");
            System.exit(2);
            return;
        }
        System.out.println("Source: " + catalog.source());
        System.out.println("Candidates: " + catalog.entries().size());
        System.out.println("Skipped rows: " + catalog.skippedRows());
        System.out.println("Fingerprint: " + catalog.fingerprint());
        for (Category category : Category.values()) {
            long count = catalog.categoryCounts().getOrDefault(category, 0L);
            if (count > 0) System.out.println(category.externalName() + ": " + count);
        }
    }
}
