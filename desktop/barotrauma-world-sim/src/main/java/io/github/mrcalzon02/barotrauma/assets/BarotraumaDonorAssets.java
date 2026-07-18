package io.github.mrcalzon02.barotrauma.assets;

import javax.imageio.ImageIO;
import javax.swing.ImageIcon;
import java.awt.Image;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Properties;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * Locates a user-owned Barotrauma installation and resolves graphical assets without redistributing them.
 * The stored configuration is only a local filesystem pointer. Missing or incompatible donor art falls back
 * to PNG resources packaged with the toolbox.
 */
public final class BarotraumaDonorAssets {
    public static final String BAROTRAUMA_APP_ID = "602960";
    private static final Pattern VDF_PATH = Pattern.compile("\\\"path\\\"\\s+\\\"([^\\\"]+)\\\"");
    private static final Set<String> IMAGE_EXTENSIONS = Set.of("png", "jpg", "jpeg");
    private static final int MAX_SCAN_FILES = 40_000;

    private final Path configurationFile;

    public BarotraumaDonorAssets() {
        this(defaultConfigurationFile());
    }

    public BarotraumaDonorAssets(Path configurationFile) {
        this.configurationFile = configurationFile.toAbsolutePath().normalize();
    }

    public static Path defaultConfigurationFile() {
        return Path.of(System.getProperty("user.home", "."), ".barotrauma-world-sim", "assets.properties")
                .toAbsolutePath().normalize();
    }

    public Configuration loadConfiguration() throws IOException {
        if (!Files.isRegularFile(configurationFile)) return Configuration.fallback();
        Properties properties = new Properties();
        try (InputStream input = Files.newInputStream(configurationFile)) { properties.load(input); }
        Mode mode;
        try { mode = Mode.valueOf(properties.getProperty("mode", Mode.FALLBACK.name())); }
        catch (IllegalArgumentException exception) { mode = Mode.FALLBACK; }
        String path = properties.getProperty("donorRoot", "").trim();
        Path root = path.isBlank() ? null : Path.of(path).toAbsolutePath().normalize();
        Instant updated;
        try { updated = Instant.parse(properties.getProperty("updatedAt", Instant.EPOCH.toString())); }
        catch (RuntimeException exception) { updated = Instant.EPOCH; }
        return new Configuration(mode, root, updated);
    }

    public void saveConfiguration(Mode mode, Path donorRoot) throws IOException {
        Objects.requireNonNull(mode, "mode");
        Path normalized = donorRoot == null ? null : normalizeSelectedPath(donorRoot);
        if (mode == Mode.MANUAL || (mode == Mode.AUTO && normalized != null)) {
            Candidate validation = inspectCandidate(normalized, DiscoverySource.MANUAL_SELECTION);
            if (!validation.valid()) throw new IOException(validation.detail());
            normalized = validation.installationRoot();
        }
        Files.createDirectories(configurationFile.getParent());
        Properties properties = new Properties();
        properties.setProperty("mode", mode.name());
        properties.setProperty("donorRoot", normalized == null ? "" : normalized.toString());
        properties.setProperty("updatedAt", Instant.now().toString());
        try (OutputStream output = Files.newOutputStream(configurationFile, StandardOpenOption.CREATE,
                StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE)) {
            properties.store(output, "Barotrauma World Simulation Toolbox local donor-asset pointer");
        }
    }

    public List<Candidate> discoverInstallations() {
        LinkedHashSet<Path> roots = new LinkedHashSet<>();
        String property = System.getProperty("barotrauma.home", "").trim();
        String environment = System.getenv().getOrDefault("BAROTRAUMA_HOME", "").trim();
        if (!property.isBlank()) roots.add(Path.of(property));
        if (!environment.isBlank()) roots.add(Path.of(environment));
        try {
            Configuration saved = loadConfiguration();
            if (saved.donorRoot() != null) roots.add(saved.donorRoot());
        } catch (IOException ignored) { }

        for (Path steamRoot : defaultSteamRoots()) {
            roots.add(steamRoot.resolve("steamapps").resolve("common").resolve("Barotrauma"));
            for (Path library : steamLibraries(steamRoot)) {
                roots.add(library.resolve("steamapps").resolve("common").resolve("Barotrauma"));
            }
        }

        List<Candidate> candidates = new ArrayList<>();
        for (Path root : roots) {
            Candidate candidate = inspectCandidate(root, DiscoverySource.AUTO_DISCOVERY);
            if (candidate.valid()) candidates.add(candidate);
        }
        candidates.sort(Comparator.comparing(candidate -> candidate.installationRoot().toString()));
        return List.copyOf(candidates);
    }

    public Candidate inspectCandidate(Path selectedPath, DiscoverySource source) {
        if (selectedPath == null) return Candidate.invalid(null, source, "No donor installation was selected.");
        Path root = normalizeSelectedPath(selectedPath);
        Path content = contentRoot(root).orElse(null);
        if (content == null) {
            return Candidate.invalid(root, source,
                    "The selected directory does not contain a Barotrauma Content tree. Select the Barotrauma game directory, its app bundle, or its Content directory.");
        }
        int markers = 0;
        for (String marker : List.of("UI", "Map", "Characters", "Items")) {
            if (Files.isDirectory(content.resolve(marker))) markers++;
        }
        if (markers < 2) {
            return Candidate.invalid(root, source,
                    "A Content directory was found, but it does not contain enough expected Barotrauma asset folders.");
        }
        Path canonicalRoot = canonicalInstallationRoot(root);
        return new Candidate(canonicalRoot, content.toAbsolutePath().normalize(), source, true,
                "Validated local Barotrauma donor installation.");
    }

    public Optional<Candidate> activeDonor() {
        try {
            Configuration configuration = loadConfiguration();
            if (configuration.mode() == Mode.FALLBACK) return Optional.empty();
            if (configuration.donorRoot() != null) {
                Candidate configured = inspectCandidate(configuration.donorRoot(), DiscoverySource.SAVED_CONFIGURATION);
                if (configured.valid()) return Optional.of(configured);
            }
            if (configuration.mode() == Mode.AUTO) return discoverInstallations().stream().findFirst();
        } catch (IOException ignored) { }
        return Optional.empty();
    }

    public ResolvedAsset resolve(AssetRole role) {
        Objects.requireNonNull(role, "role");
        Optional<Candidate> donor = activeDonor();
        if (donor.isPresent()) {
            Optional<Path> selected = findDonorAsset(donor.get().contentRoot(), role);
            if (selected.isPresent()) {
                return new ResolvedAsset(role, AssetSource.DONOR_INSTALLATION, selected.get(), null,
                        donor.get().installationRoot());
            }
        }
        return new ResolvedAsset(role, AssetSource.PACKAGED_FALLBACK, null, role.fallbackResource(), null);
    }

    public ImageIcon loadIcon(AssetRole role, int width, int height) throws IOException {
        ResolvedAsset resolved = resolve(role);
        BufferedImage image;
        if (resolved.file() != null) {
            image = ImageIO.read(resolved.file().toFile());
        } else {
            try (InputStream input = BarotraumaDonorAssets.class.getResourceAsStream(resolved.classpathResource())) {
                if (input == null) throw new IOException("Packaged fallback asset is missing: " + resolved.classpathResource());
                image = ImageIO.read(input);
            }
        }
        if (image == null) throw new IOException("Unsupported or unreadable image for " + role + ".");
        Image scaled = image.getScaledInstance(width, height, Image.SCALE_SMOOTH);
        return new ImageIcon(scaled);
    }

    private Optional<Path> findDonorAsset(Path content, AssetRole role) {
        for (String relative : role.preferredRelativePaths()) {
            Path candidate = content.resolve(relative).normalize();
            if (candidate.startsWith(content) && Files.isRegularFile(candidate)) return Optional.of(candidate);
        }
        List<Path> searchRoots = new ArrayList<>();
        for (String root : role.searchRoots()) {
            Path candidate = content.resolve(root);
            if (Files.isDirectory(candidate)) searchRoots.add(candidate);
        }
        for (Path root : searchRoots) {
            try (Stream<Path> stream = Files.walk(root)) {
                Optional<Path> result = stream.filter(Files::isRegularFile)
                        .limit(MAX_SCAN_FILES)
                        .filter(BarotraumaDonorAssets::isImage)
                        .filter(path -> role.matches(path.getFileName().toString()))
                        .min(Comparator.comparingInt(path -> path.toString().length()));
                if (result.isPresent()) return result;
            } catch (IOException ignored) { }
        }
        return Optional.empty();
    }

    private static List<Path> defaultSteamRoots() {
        String home = System.getProperty("user.home", ".");
        String os = System.getProperty("os.name", "").toLowerCase(Locale.ROOT);
        List<Path> roots = new ArrayList<>();
        if (os.contains("win")) {
            String programFilesX86 = System.getenv().getOrDefault("ProgramFiles(x86)", "C:\\Program Files (x86)");
            String programFiles = System.getenv().getOrDefault("ProgramFiles", "C:\\Program Files");
            roots.add(Path.of(programFilesX86, "Steam"));
            roots.add(Path.of(programFiles, "Steam"));
        } else if (os.contains("mac")) {
            roots.add(Path.of(home, "Library", "Application Support", "Steam"));
        } else {
            roots.add(Path.of(home, ".local", "share", "Steam"));
            roots.add(Path.of(home, ".steam", "steam"));
            roots.add(Path.of(home, ".var", "app", "com.valvesoftware.Steam", ".local", "share", "Steam"));
        }
        return roots;
    }

    private static List<Path> steamLibraries(Path steamRoot) {
        Path vdf = steamRoot.resolve("steamapps").resolve("libraryfolders.vdf");
        if (!Files.isRegularFile(vdf)) return List.of();
        try {
            String text = Files.readString(vdf, StandardCharsets.UTF_8);
            Matcher matcher = VDF_PATH.matcher(text);
            List<Path> result = new ArrayList<>();
            while (matcher.find()) {
                String value = matcher.group(1).replace("\\\\", "\\");
                result.add(Path.of(value).toAbsolutePath().normalize());
            }
            return result;
        } catch (IOException | RuntimeException exception) {
            return List.of();
        }
    }

    private static Optional<Path> contentRoot(Path selected) {
        List<Path> candidates = List.of(
                selected,
                selected.resolve("Content"),
                selected.resolve("Barotrauma.app").resolve("Contents").resolve("MacOS").resolve("Content"),
                selected.resolve("Contents").resolve("MacOS").resolve("Content")
        );
        for (Path candidate : candidates) {
            if (Files.isDirectory(candidate) && candidate.getFileName() != null
                    && candidate.getFileName().toString().equalsIgnoreCase("Content")) {
                return Optional.of(candidate.toAbsolutePath().normalize());
            }
        }
        return Optional.empty();
    }

    private static Path canonicalInstallationRoot(Path selected) {
        Path normalized = selected.toAbsolutePath().normalize();
        if (normalized.getFileName() != null && normalized.getFileName().toString().equalsIgnoreCase("Content")) {
            Path parent = normalized.getParent();
            if (parent != null && parent.getFileName() != null && parent.getFileName().toString().equals("MacOS")) {
                Path contents = parent.getParent();
                if (contents != null && contents.getParent() != null) return contents.getParent();
            }
            return parent == null ? normalized : parent;
        }
        return normalized;
    }

    private static Path normalizeSelectedPath(Path path) {
        Path normalized = path.toAbsolutePath().normalize();
        return Files.isRegularFile(normalized) && normalized.getParent() != null ? normalized.getParent() : normalized;
    }

    private static boolean isImage(Path path) {
        String name = path.getFileName().toString();
        int dot = name.lastIndexOf('.');
        return dot >= 0 && IMAGE_EXTENSIONS.contains(name.substring(dot + 1).toLowerCase(Locale.ROOT));
    }

    public static void verifyContract() throws Exception {
        Path root = Files.createTempDirectory("barotrauma-donor-assets-");
        try {
            Path installation = root.resolve("SteamLibrary/steamapps/common/Barotrauma");
            Path content = installation.resolve("Content");
            for (String folder : List.of("UI", "Map", "Characters", "Items")) Files.createDirectories(content.resolve(folder));
            BufferedImage testImage = new BufferedImage(4, 4, BufferedImage.TYPE_INT_ARGB);
            ImageIO.write(testImage, "png", content.resolve("UI/station_test.png").toFile());

            BarotraumaDonorAssets assets = new BarotraumaDonorAssets(root.resolve("config/assets.properties"));
            Candidate candidate = assets.inspectCandidate(installation, DiscoverySource.MANUAL_SELECTION);
            require(candidate.valid(), "A valid donor installation was rejected.");
            assets.saveConfiguration(Mode.MANUAL, installation);
            require(assets.activeDonor().isPresent(), "Saved donor installation was not restored.");
            ResolvedAsset donor = assets.resolve(AssetRole.STATION);
            require(donor.source() == AssetSource.DONOR_INSTALLATION && donor.file() != null,
                    "Donor-first asset resolution failed.");
            assets.saveConfiguration(Mode.AUTO, null);
            require(assets.loadConfiguration().mode() == Mode.AUTO
                            && assets.loadConfiguration().donorRoot() == null,
                    "Automatic discovery could not be configured before donor installation.");
            assets.saveConfiguration(Mode.FALLBACK, null);
            require(assets.resolve(AssetRole.STATION).source() == AssetSource.PACKAGED_FALLBACK,
                    "Fallback-only asset resolution failed.");
        } finally {
            try (Stream<Path> stream = Files.walk(root)) {
                for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
            }
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    public enum Mode { AUTO, MANUAL, FALLBACK }
    public enum DiscoverySource { AUTO_DISCOVERY, MANUAL_SELECTION, SAVED_CONFIGURATION }
    public enum AssetSource { DONOR_INSTALLATION, PACKAGED_FALLBACK }

    public enum AssetRole {
        STATION("/io/github/mrcalzon02/barotrauma/assets/fallback/fallback-station.png",
                List.of("UI", "Map"), List.of("station", "outpost"),
                List.of("UI/Icons/station.png", "UI/Icons/outpost.png")),
        VESSEL("/io/github/mrcalzon02/barotrauma/assets/fallback/fallback-vessel.png",
                List.of("UI", "Map", "Submarines"), List.of("submarine", "sub", "vessel"),
                List.of("UI/Icons/submarine.png", "UI/Icons/sub.png")),
        FAUNA("/io/github/mrcalzon02/barotrauma/assets/fallback/fallback-fauna.png",
                List.of("Characters", "UI"), List.of("crawler", "moloch", "fauna", "monster"),
                List.of("UI/Icons/fauna.png")),
        GEOLOGY("/io/github/mrcalzon02/barotrauma/assets/fallback/fallback-geology.png",
                List.of("Map", "Items", "UI"), List.of("rock", "cave", "mineral", "ore", "geology"),
                List.of("UI/Icons/ore.png"));

        private final String fallbackResource;
        private final List<String> searchRoots;
        private final List<String> keywords;
        private final List<String> preferredRelativePaths;

        AssetRole(String fallbackResource, List<String> searchRoots, List<String> keywords,
                  List<String> preferredRelativePaths) {
            this.fallbackResource = fallbackResource;
            this.searchRoots = List.copyOf(searchRoots);
            this.keywords = List.copyOf(keywords);
            this.preferredRelativePaths = List.copyOf(preferredRelativePaths);
        }

        public String fallbackResource() { return fallbackResource; }
        public List<String> searchRoots() { return searchRoots; }
        public List<String> preferredRelativePaths() { return preferredRelativePaths; }
        boolean matches(String filename) {
            String lower = filename.toLowerCase(Locale.ROOT);
            return keywords.stream().anyMatch(lower::contains);
        }
    }

    public record Configuration(Mode mode, Path donorRoot, Instant updatedAt) {
        public Configuration {
            Objects.requireNonNull(mode, "mode");
            Objects.requireNonNull(updatedAt, "updatedAt");
        }
        static Configuration fallback() { return new Configuration(Mode.FALLBACK, null, Instant.EPOCH); }
    }

    public record Candidate(Path installationRoot, Path contentRoot, DiscoverySource source,
                            boolean valid, String detail) {
        public Candidate {
            Objects.requireNonNull(source, "source");
            Objects.requireNonNull(detail, "detail");
        }
        static Candidate invalid(Path root, DiscoverySource source, String detail) {
            return new Candidate(root, null, source, false, detail);
        }
    }

    public record ResolvedAsset(AssetRole role, AssetSource source, Path file, String classpathResource,
                                Path donorInstallation) { }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Barotrauma donor-asset discovery and fallback contracts passed.");
    }
}
