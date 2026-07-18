package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.compatibility.web.WebSuiteV22Inspector;
import io.github.mrcalzon02.barotrauma.compatibility.web.WebSuiteV22Inspector.InspectionReport;
import io.github.mrcalzon02.barotrauma.domain.identity.IdentityContracts.Sha256Digest;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.ArtifactAction;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.ImportPlan;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.SourceKind;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldLock;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Types;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/** Atomic normalized import of one inspected browser-suite version-22 master world. */
public final class WebSuiteV22WorldImporter {
    private static final Instant CANONICAL_WORLD_START = Instant.parse("2175-01-01T00:00:00Z");
    private static final Instant DEFAULT_REAL_EPOCH = Instant.parse("2026-06-20T08:00:00Z");
    private static final int MAX_JSON_DEPTH = 256;

    private WebSuiteV22WorldImporter() { }

    public static PreparedWorld inspectAndPrepare(Path source) throws Exception {
        Objects.requireNonNull(source, "source");
        byte[] bytes = Files.readAllBytes(source);
        InspectionReport report = WebSuiteV22Inspector.inspect(bytes, source.getFileName().toString());
        return normalize(bytes, report);
    }

    public static WorldImportResult importWorld(WorldPaths paths, Path source, String actor)
            throws Exception {
        PreparedWorld prepared = inspectAndPrepare(source);
        ImportPlan plan;
        try (SqliteWorldStore store = SqliteWorldStore.open(paths)) {
            plan = store.inspectAndPlan(prepared.report());
        }
        if (plan.artifact().importedAt() != null) {
            throw new SQLException("This version-22 source artifact has already been imported.");
        }
        return commit(paths, prepared, plan, actor);
    }

    public static WorldImportResult commit(WorldPaths paths, PreparedWorld prepared,
                                           ImportPlan plan, String actor)
            throws IOException, SQLException {
        Objects.requireNonNull(paths, "paths");
        Objects.requireNonNull(prepared, "prepared");
        Objects.requireNonNull(plan, "plan");
        requireDriver();
        String effectiveActor = actor == null || actor.isBlank() ? "desktop-user" : actor.trim();

        try (WorldLock ignored = WorldStorageContracts.acquireExclusiveLock(paths);
             Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configure(connection);
            verifySchema(connection);
            return commit(connection, prepared, plan, effectiveActor);
        }
    }

    private static WorldImportResult commit(Connection connection, PreparedWorld prepared,
                                            ImportPlan plan, String actor) throws SQLException {
        boolean originalAutoCommit = connection.getAutoCommit();
        connection.setAutoCommit(false);
        try {
            UUID worldId = readWorldId(connection);
            requirePendingWebArtifact(connection, plan, prepared.report().artifactIdentity().digest());
            requireWorldNotImported(connection, worldId);
            Instant importedAt = Instant.now();
            UUID importId = UUID.randomUUID();

            updateWorldMetadata(connection, worldId, prepared, importedAt);
            insertWorldImport(connection, importId, worldId, plan.artifactId(), prepared, importedAt);
            insertLocations(connection, worldId, prepared.locations());
            insertStations(connection, worldId, prepared.locations());
            insertComponentVersions(connection, worldId, prepared.report().componentVersions());
            insertStateFamilies(connection, worldId, prepared.report().topLevelStateFamilies());
            insertSimulationMetadata(connection, worldId, plan.artifactId(), prepared, importedAt);
            markArtifactImported(connection, plan.artifactId(), importedAt);
            insertAudit(connection, actor, importId, plan.artifactId(), prepared, importedAt);
            connection.commit();

            int stations = (int) prepared.locations().stream().filter(NormalizedLocation::station).count();
            return new WorldImportResult(importId, worldId, plan.artifactId(), importedAt,
                    prepared.report().masterWorldId(), prepared.report().world().rings(),
                    prepared.locations().size(), stations, false, "PAUSED");
        } catch (SQLException | RuntimeException exception) {
            try { connection.rollback(); }
            catch (SQLException rollbackFailure) { exception.addSuppressed(rollbackFailure); }
            throw exception;
        } finally {
            connection.setAutoCommit(originalAutoCommit);
        }
    }

    private static PreparedWorld normalize(byte[] bytes, InspectionReport report) throws IOException {
        Map<String, Object> envelope;
        try {
            envelope = object(new JsonParser(new String(bytes, StandardCharsets.UTF_8)).parse());
        } catch (JsonException exception) {
            throw new IOException("The already inspected version-22 source could not be normalized: "
                    + exception.getMessage(), exception);
        }
        Map<String, Object> state = map(envelope.get("state"));
        Map<String, Object> world = map(state.get("world"));
        Map<String, Object> map = map(world.get("map"));
        List<Object> rawNodes = list(map.get("nodes"));
        Map<String, Object> economy = map(state.get("worldEconomy"));
        if (economy.isEmpty()) economy = map(world.get("economy"));
        Map<String, Object> stationEconomies = map(economy.get("stationEconomies"));

        List<NormalizedLocation> locations = new ArrayList<>();
        Set<String> sourceIds = new HashSet<>();
        for (int ordinal = 0; ordinal < rawNodes.size(); ordinal++) {
            Map<String, Object> node = map(rawNodes.get(ordinal));
            String sourceId = first(text(node.get("id")), text(node.get("locationId")),
                    text(node.get("key")), text(node.get("identifier")));
            if (sourceId.isBlank()) sourceId = String.format(Locale.ROOT, "location-%04d", ordinal + 1);
            if (!sourceIds.add(sourceId)) {
                throw new IOException("The version-22 map contains duplicate location identity: " + sourceId);
            }
            String name = first(text(node.get("name")), text(node.get("displayName")),
                    text(node.get("title")), sourceId);
            String type = first(text(node.get("type")), text(node.get("kind")), text(node.get("nodeType")));
            int ring = integer(node.get("ring"), integer(node.get("ringIndex"), 0));
            int level = integer(node.get("level"), integer(node.get("locationLevel"), 0));
            Double x = decimal(node.get("x"));
            Double y = decimal(node.get("y"));
            Map<String, Object> position = map(node.get("position"));
            if (x == null) x = decimal(position.get("x"));
            if (y == null) y = decimal(position.get("y"));
            String biome = first(text(node.get("biome")), nestedText(node, "biome", "name"),
                    nestedText(node, "biome", "id"));
            String faction = first(text(node.get("faction")), nestedText(node, "faction", "name"),
                    nestedText(node, "faction", "id"));
            boolean station = station(node, type);
            boolean hasEconomy = stationEconomies.containsKey(sourceId);
            locations.add(new NormalizedLocation(sourceId, ordinal, name, type, ring, level,
                    x, y, biome, faction, station, hasEconomy));
        }

        int normalizedStations = (int) locations.stream().filter(NormalizedLocation::station).count();
        if (locations.size() != report.world().locations()) {
            throw new IOException("Normalized location count does not match inspection report.");
        }
        if (normalizedStations != report.world().stations()) {
            throw new IOException("Normalized station count does not match inspection report.");
        }
        if (report.masterWorldId() == null || report.masterWorldId().isBlank()) {
            throw new IOException("A normalized desktop-world import requires masterWorldId.");
        }

        Instant canonicalTime = firstInstant(
                nested(state, "world", "canonicalTime"),
                nested(state, "world", "currentTime"),
                nested(state, "worldHub", "canonicalTime"),
                envelope.get("canonicalTime"));
        Instant realEpoch = firstInstant(
                nested(state, "world", "realEpoch"),
                nested(state, "worldHub", "realEpoch"),
                envelope.get("realEpoch"));
        Double shellRadius = firstDecimal(map.get("shellRadius"), world.get("shellRadius"),
                nested(state, "worldHub", "shellRadius"));

        return new PreparedWorld(report, List.copyOf(locations),
                canonicalTime == null ? CANONICAL_WORLD_START : canonicalTime,
                realEpoch == null ? DEFAULT_REAL_EPOCH : realEpoch,
                shellRadius);
    }

    private static void requirePendingWebArtifact(Connection connection, ImportPlan plan,
                                                   Sha256Digest digest) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT sha256, source_kind, imported_at FROM import_artifact WHERE artifact_id = ?")) {
            statement.setString(1, plan.artifactId().toString());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("World import references an unknown inspection artifact.");
                if (!result.getString("sha256").equals(digest.value())) {
                    throw new SQLException("World source SHA-256 does not match its inspection record.");
                }
                if (!result.getString("source_kind").equals(SourceKind.WEB_SUITE_V22.databaseValue())) {
                    throw new SQLException("Normalized world import accepts version-22 browser-suite sources only.");
                }
                if (result.getString("imported_at") != null) {
                    throw new SQLException("The inspected version-22 source has already been imported.");
                }
            }
        }
    }

    private static void requireWorldNotImported(Connection connection, UUID worldId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT import_id FROM world_import WHERE world_id = ?")) {
            statement.setString(1, worldId.toString());
            try (ResultSet result = statement.executeQuery()) {
                if (result.next()) {
                    throw new SQLException("This desktop world already contains a normalized master-world import.");
                }
            }
        }
    }

    private static void updateWorldMetadata(Connection connection, UUID worldId,
                                            PreparedWorld prepared, Instant importedAt) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "UPDATE world_metadata SET canonical_time = ?, master_world_id = ?, "
                        + "source_suite_version = ?, source_exported_at = ? WHERE world_id = ?")) {
            setInstant(statement, 1, prepared.canonicalTime());
            statement.setString(2, prepared.report().masterWorldId());
            statement.setInt(3, prepared.report().suiteVersion());
            setInstant(statement, 4, prepared.report().exportedAt());
            statement.setString(5, worldId.toString());
            if (statement.executeUpdate() != 1) throw new SQLException("Desktop world metadata row is missing.");
        }
    }

    private static void insertWorldImport(Connection connection, UUID importId, UUID worldId,
                                          UUID artifactId, PreparedWorld prepared, Instant importedAt)
            throws SQLException {
        InspectionReport report = prepared.report();
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO world_import(import_id, world_id, artifact_id, suite_version, master_world_id, "
                        + "exported_at, imported_at, rings, location_count, station_count, shell_radius, "
                        + "active_submarine_name, active_submarine_model, crew_records, economy_vessels, economy_stations) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")) {
            statement.setString(1, importId.toString());
            statement.setString(2, worldId.toString());
            statement.setString(3, artifactId.toString());
            statement.setInt(4, report.suiteVersion());
            statement.setString(5, report.masterWorldId());
            setInstant(statement, 6, report.exportedAt());
            statement.setString(7, importedAt.toString());
            statement.setInt(8, report.world().rings());
            statement.setInt(9, prepared.locations().size());
            statement.setInt(10, (int) prepared.locations().stream().filter(NormalizedLocation::station).count());
            setDouble(statement, 11, prepared.shellRadius());
            statement.setString(12, emptyToNull(report.activeSubmarineName()));
            statement.setString(13, emptyToNull(report.activeSubmarineModel()));
            statement.setInt(14, report.crewRecords());
            statement.setInt(15, report.economy().totalVessels());
            statement.setInt(16, report.economy().stationEconomies());
            statement.executeUpdate();
        }
    }

    private static void insertLocations(Connection connection, UUID worldId,
                                        List<NormalizedLocation> locations) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO world_location(location_id, world_id, source_location_id, source_ordinal, "
                        + "display_name, location_type, ring, location_level, map_x, map_y, biome, faction, is_station) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")) {
            for (NormalizedLocation location : locations) {
                UUID locationId = stableId(worldId, "location", location.sourceId());
                statement.setString(1, locationId.toString());
                statement.setString(2, worldId.toString());
                statement.setString(3, location.sourceId());
                statement.setInt(4, location.ordinal());
                statement.setString(5, location.displayName());
                statement.setString(6, emptyToNull(location.type()));
                statement.setInt(7, location.ring());
                statement.setInt(8, location.level());
                setDouble(statement, 9, location.x());
                setDouble(statement, 10, location.y());
                statement.setString(11, emptyToNull(location.biome()));
                statement.setString(12, emptyToNull(location.faction()));
                statement.setInt(13, location.station() ? 1 : 0);
                statement.addBatch();
            }
            statement.executeBatch();
        }
    }

    private static void insertStations(Connection connection, UUID worldId,
                                       List<NormalizedLocation> locations) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO world_station(station_id, world_id, location_id, source_station_id, "
                        + "display_name, station_type, faction, has_economy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")) {
            for (NormalizedLocation location : locations) {
                if (!location.station()) continue;
                statement.setString(1, stableId(worldId, "station", location.sourceId()).toString());
                statement.setString(2, worldId.toString());
                statement.setString(3, stableId(worldId, "location", location.sourceId()).toString());
                statement.setString(4, location.sourceId());
                statement.setString(5, location.displayName());
                statement.setString(6, emptyToNull(location.type()));
                statement.setString(7, emptyToNull(location.faction()));
                statement.setInt(8, location.hasEconomy() ? 1 : 0);
                statement.addBatch();
            }
            statement.executeBatch();
        }
    }

    private static void insertComponentVersions(Connection connection, UUID worldId,
                                                Map<String, String> versions) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO world_component_version(world_id, component_key, component_version) VALUES (?, ?, ?)")) {
            for (Map.Entry<String, String> entry : versions.entrySet()) {
                statement.setString(1, worldId.toString());
                statement.setString(2, entry.getKey());
                statement.setString(3, entry.getValue());
                statement.addBatch();
            }
            statement.executeBatch();
        }
    }

    private static void insertStateFamilies(Connection connection, UUID worldId,
                                            List<String> families) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO world_state_family(world_id, family_key) VALUES (?, ?)")) {
            for (String family : families) {
                statement.setString(1, worldId.toString());
                statement.setString(2, family);
                statement.addBatch();
            }
            statement.executeBatch();
        }
    }

    private static void insertSimulationMetadata(Connection connection, UUID worldId,
                                                 UUID artifactId, PreparedWorld prepared,
                                                 Instant importedAt) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO world_simulation_metadata(world_id, canonical_time, real_epoch, last_simulated_at, "
                        + "imported_tick_sequence, imported_at, source_artifact_id, simulation_enabled, scheduler_state) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'PAUSED')")) {
            statement.setString(1, worldId.toString());
            setInstant(statement, 2, prepared.canonicalTime());
            setInstant(statement, 3, prepared.realEpoch());
            setInstant(statement, 4, prepared.report().economy().lastSimulatedAt());
            statement.setLong(5, prepared.report().economy().tickSequence());
            statement.setString(6, importedAt.toString());
            statement.setString(7, artifactId.toString());
            statement.executeUpdate();
        }
    }

    private static void markArtifactImported(Connection connection, UUID artifactId, Instant importedAt)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "UPDATE import_artifact SET imported_at = ? WHERE artifact_id = ? AND imported_at IS NULL")) {
            statement.setString(1, importedAt.toString());
            statement.setString(2, artifactId.toString());
            if (statement.executeUpdate() != 1) {
                throw new SQLException("The inspected world source changed state before commit.");
            }
        }
    }

    private static void insertAudit(Connection connection, String actor, UUID importId,
                                    UUID artifactId, PreparedWorld prepared, Instant importedAt)
            throws SQLException {
        String details = "{\"artifactId\":\"" + artifactId + "\",\"masterWorldId\":\""
                + json(prepared.report().masterWorldId()) + "\",\"locations\":"
                + prepared.locations().size() + ",\"stations\":"
                + prepared.locations().stream().filter(NormalizedLocation::station).count()
                + ",\"simulationEnabled\":false,\"schedulerState\":\"PAUSED\",\"importedAt\":\""
                + importedAt + "\"}";
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO audit_entry(occurred_at, actor, action, entity_type, entity_id, details_json) "
                        + "VALUES (?, ?, 'web_suite_world_imported', 'world_import', ?, ?)")) {
            statement.setString(1, importedAt.toString());
            statement.setString(2, actor);
            statement.setString(3, importId.toString());
            statement.setString(4, details);
            statement.executeUpdate();
        }
    }

    private static UUID readWorldId(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT world_id FROM world_metadata LIMIT 1")) {
            if (!result.next()) throw new SQLException("Desktop world metadata row is missing.");
            return UUID.fromString(result.getString(1));
        }
    }

    private static void configure(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys = ON");
            statement.execute("PRAGMA busy_timeout = 5000");
            statement.execute("PRAGMA journal_mode = WAL");
            statement.execute("PRAGMA synchronous = FULL");
        }
    }

    private static void verifySchema(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COALESCE(MAX(version), 0) FROM schema_migration")) {
            int version = result.next() ? result.getInt(1) : 0;
            if (version != WorldStorageContracts.DATABASE_SCHEMA_VERSION) {
                throw new SQLException("Normalized world import requires database schema "
                        + WorldStorageContracts.DATABASE_SCHEMA_VERSION + "; found " + version + ".");
            }
        }
    }

    private static UUID stableId(UUID worldId, String kind, String sourceId) {
        return UUID.nameUUIDFromBytes((worldId + ":" + kind + ":" + sourceId)
                .getBytes(StandardCharsets.UTF_8));
    }

    private static boolean station(Map<String, Object> node, String type) {
        String normalized = type.toLowerCase(Locale.ROOT);
        return normalized.equals("station") || normalized.equals("outpost") || normalized.equals("city")
                || Boolean.TRUE.equals(node.get("station")) || Boolean.TRUE.equals(node.get("isStation"));
    }

    private static Object nested(Map<String, Object> root, String... path) {
        Object current = root;
        for (String key : path) {
            if (!(current instanceof Map<?, ?> value)) return null;
            current = value.get(key);
        }
        return current;
    }

    private static String nestedText(Map<String, Object> root, String... path) {
        return text(nested(root, path));
    }

    private static Instant firstInstant(Object... values) {
        for (Object value : values) {
            String text = text(value);
            if (text.isBlank()) continue;
            try { return Instant.parse(text); }
            catch (DateTimeParseException ignored) { }
        }
        return null;
    }

    private static Double firstDecimal(Object... values) {
        for (Object value : values) {
            Double result = decimal(value);
            if (result != null) return result;
        }
        return null;
    }

    private static int integer(Object value, int fallback) {
        try { return value instanceof BigDecimal number ? number.intValueExact() : fallback; }
        catch (ArithmeticException ignored) { return fallback; }
    }

    private static Double decimal(Object value) {
        return value instanceof BigDecimal number ? number.doubleValue() : null;
    }

    private static String first(String... values) {
        for (String value : values) if (value != null && !value.isBlank()) return value.trim();
        return "";
    }

    private static String text(Object value) {
        return value instanceof String string ? string.trim() : "";
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> map(Object value) {
        return value instanceof Map<?, ?> map ? (Map<String, Object>) map : Map.of();
    }

    @SuppressWarnings("unchecked")
    private static List<Object> list(Object value) {
        return value instanceof List<?> list ? (List<Object>) list : List.of();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> object(Object value) throws JsonException {
        if (!(value instanceof Map<?, ?> map)) throw new JsonException("JSON root must be an object.");
        return (Map<String, Object>) map;
    }

    private static void setInstant(PreparedStatement statement, int index, Instant value) throws SQLException {
        if (value == null) statement.setNull(index, Types.VARCHAR);
        else statement.setString(index, value.toString());
    }

    private static void setDouble(PreparedStatement statement, int index, Double value) throws SQLException {
        if (value == null) statement.setNull(index, Types.REAL);
        else statement.setDouble(index, value);
    }

    private static String emptyToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String json(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t");
    }

    private static void requireDriver() throws SQLException {
        try { Class.forName("org.sqlite.JDBC"); }
        catch (ClassNotFoundException exception) {
            throw new SQLException("The Xerial SQLite JDBC driver is unavailable.", exception);
        }
    }

    public record PreparedWorld(InspectionReport report, List<NormalizedLocation> locations,
                                Instant canonicalTime, Instant realEpoch, Double shellRadius) {
        public PreparedWorld { locations = List.copyOf(locations); }
    }

    public record NormalizedLocation(String sourceId, int ordinal, String displayName, String type,
                                     int ring, int level, Double x, Double y, String biome,
                                     String faction, boolean station, boolean hasEconomy) { }

    public record WorldImportResult(UUID importId, UUID worldId, UUID artifactId, Instant importedAt,
                                    String masterWorldId, int rings, int locations, int stations,
                                    boolean simulationEnabled, String schedulerState) { }

    private static final class JsonException extends Exception {
        private JsonException(String message) { super(message); }
    }

    private static final class JsonParser {
        private final String source;
        private int index;
        private JsonParser(String source) { this.source = source; }
        private Object parse() throws JsonException {
            whitespace();
            Object value = value(0);
            whitespace();
            if (index != source.length()) throw error("Unexpected trailing content");
            return value;
        }
        private Object value(int depth) throws JsonException {
            if (depth > MAX_JSON_DEPTH) throw error("Maximum JSON nesting exceeded");
            if (index >= source.length()) throw error("Unexpected end of input");
            return switch (source.charAt(index)) {
                case '{' -> object(depth + 1);
                case '[' -> array(depth + 1);
                case '"' -> string();
                case 't' -> literal("true", true);
                case 'f' -> literal("false", false);
                case 'n' -> literal("null", null);
                default -> number();
            };
        }
        private Map<String, Object> object(int depth) throws JsonException {
            expect('{'); whitespace();
            Map<String, Object> result = new LinkedHashMap<>();
            if (take('}')) return result;
            while (true) {
                whitespace();
                if (index >= source.length() || source.charAt(index) != '"') throw error("Expected object key");
                String key = string();
                if (result.containsKey(key)) throw error("Duplicate object key: " + key);
                whitespace(); expect(':'); whitespace();
                result.put(key, value(depth)); whitespace();
                if (take('}')) return result;
                expect(',');
            }
        }
        private List<Object> array(int depth) throws JsonException {
            expect('['); whitespace();
            List<Object> result = new ArrayList<>();
            if (take(']')) return result;
            while (true) {
                whitespace(); result.add(value(depth)); whitespace();
                if (take(']')) return result;
                expect(',');
            }
        }
        private String string() throws JsonException {
            expect('"');
            StringBuilder output = new StringBuilder();
            while (index < source.length()) {
                char character = source.charAt(index++);
                if (character == '"') return output.toString();
                if (character == '\\') {
                    if (index >= source.length()) throw error("Unterminated escape");
                    char escaped = source.charAt(index++);
                    switch (escaped) {
                        case '"', '\\', '/' -> output.append(escaped);
                        case 'b' -> output.append('\b');
                        case 'f' -> output.append('\f');
                        case 'n' -> output.append('\n');
                        case 'r' -> output.append('\r');
                        case 't' -> output.append('\t');
                        case 'u' -> output.append(unicode());
                        default -> throw error("Unsupported escape");
                    }
                } else {
                    if (character < 0x20) throw error("Unescaped control character");
                    output.append(character);
                }
            }
            throw error("Unterminated string");
        }
        private char unicode() throws JsonException {
            if (index + 4 > source.length()) throw error("Incomplete Unicode escape");
            int value = 0;
            for (int count = 0; count < 4; count++) {
                int digit = Character.digit(source.charAt(index++), 16);
                if (digit < 0) throw error("Invalid Unicode escape");
                value = value * 16 + digit;
            }
            return (char) value;
        }
        private Object literal(String literal, Object value) throws JsonException {
            if (!source.startsWith(literal, index)) throw error("Expected " + literal);
            index += literal.length();
            return value;
        }
        private BigDecimal number() throws JsonException {
            int start = index;
            take('-');
            if (take('0')) {
                if (index < source.length() && Character.isDigit(source.charAt(index))) throw error("Leading zero");
            } else digits();
            if (take('.')) digits();
            if (index < source.length() && (source.charAt(index) == 'e' || source.charAt(index) == 'E')) {
                index++;
                if (!take('+')) take('-');
                digits();
            }
            if (start == index) throw error("Expected JSON value");
            try { return new BigDecimal(source.substring(start, index)); }
            catch (NumberFormatException exception) { throw error("Invalid number"); }
        }
        private void digits() throws JsonException {
            int start = index;
            while (index < source.length() && Character.isDigit(source.charAt(index))) index++;
            if (start == index) throw error("Expected digit");
        }
        private void whitespace() {
            while (index < source.length() && " \n\r\t".indexOf(source.charAt(index)) >= 0) index++;
        }
        private void expect(char expected) throws JsonException {
            if (!take(expected)) throw error("Expected '" + expected + "'");
        }
        private boolean take(char expected) {
            if (index < source.length() && source.charAt(index) == expected) {
                index++;
                return true;
            }
            return false;
        }
        private JsonException error(String message) {
            return new JsonException(message + " at character " + index + ".");
        }
    }

    public static void verifyContract() throws Exception {
        Path root = Files.createTempDirectory("barotrauma-web-world-import-");
        try {
            UUID worldId = UUID.fromString("91000000-0000-0000-0000-000000000001");
            WorldPaths paths = WorldStorageContracts.createWorld(root, "Normalized Europa", worldId);
            String fixture = """
                    {"version":22,"exportedAt":"2026-07-17T20:00:00Z","masterWorldId":"EUROPA-NORMALIZED",
                    "worldEconomyVersion":"1.0.0","state":{"world":{"canonicalTime":"2175-04-03T12:00:00Z",
                    "realEpoch":"2026-06-20T08:00:00Z","map":{"rings":48,"shellRadius":7008,
                    "nodes":[{"id":"station-a","name":"Aster Station","ring":48,"level":1,"type":"station","x":1,"y":2,"faction":"Coalition"},
                    {"id":"route-a","name":"Aster Trench","ring":47,"level":2,"type":"location","position":{"x":3,"y":4}},
                    {"id":"station-b","name":"Borealis","ring":46,"level":3,"kind":"outpost","isStation":true}]}},
                    "worldEconomy":{"vessels":{"player-1":{"kind":"player"},"npc-1":{"kind":"npc"}},
                    "stationEconomies":{"station-a":{},"station-b":{}},"simulation":{"tickSequence":12,
                    "lastSimulatedAt":"2026-07-17T19:59:00Z"}},"submarine":{"name":"Test Vessel","model":"Barsuk",
                    "crewRoster":[{"id":"crew-1"}]}}}
                    """;
            Path source = root.resolve("world-v22.json");
            Files.writeString(source, fixture, StandardCharsets.UTF_8);
            WorldImportResult result = importWorld(paths, source, "world-import-test");
            require(result.locations() == 3 && result.stations() == 2, "Normalized map counts failed.");
            require(!result.simulationEnabled() && result.schedulerState().equals("PAUSED"),
                    "World import activated simulation unexpectedly.");
            try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
                require(count(connection, "world_import") == 1, "World import row missing.");
                require(count(connection, "world_location") == 3, "Location rows missing.");
                require(count(connection, "world_station") == 2, "Station rows missing.");
                require(count(connection, "world_component_version") == 1, "Component version rows missing.");
                require(count(connection, "world_state_family") == 3, "State family rows missing.");
                try (Statement statement = connection.createStatement();
                     ResultSet row = statement.executeQuery(
                             "SELECT simulation_enabled, scheduler_state, imported_tick_sequence "
                                     + "FROM world_simulation_metadata")) {
                    require(row.next() && row.getInt(1) == 0 && row.getString(2).equals("PAUSED")
                                    && row.getLong(3) == 12,
                            "Paused simulation metadata failed.");
                }
            }
            try {
                importWorld(paths, source, "world-import-test");
                throw new IllegalStateException("Repeated world import unexpectedly succeeded.");
            } catch (SQLException expected) {
                require(expected.getMessage().contains("already"), "Unexpected repeated-import failure.");
            }
        } finally {
            deleteTree(root);
        }
    }

    private static long count(Connection connection, String table) throws SQLException {
        if (!Set.of("world_import", "world_location", "world_station",
                "world_component_version", "world_state_family").contains(table)) {
            throw new IllegalArgumentException("Unsupported verification table.");
        }
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COUNT(*) FROM " + table)) {
            return result.next() ? result.getLong(1) : 0;
        }
    }

    private static void deleteTree(Path root) throws IOException {
        if (!Files.exists(root)) return;
        try (var stream = Files.walk(root)) {
            for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    public static void main(String[] args) throws Exception {
        if (args.length == 1 && args[0].equals("--verify")) {
            SqliteWorldStore.verifyContract();
            verifyContract();
            System.out.println("Barotrauma schema and normalized version-22 world import contracts passed.");
            return;
        }
        if (args.length != 2) {
            System.err.println("Usage: WebSuiteV22WorldImporter <world-directory> <suite-json> | --verify");
            System.exit(2);
        }
        WorldImportResult result = importWorld(
                WorldStorageContracts.openWorld(Path.of(args[0])), Path.of(args[1]), "desktop-cli");
        System.out.println("Imported " + result.locations() + " locations and " + result.stations()
                + " stations into world " + result.worldId() + "; scheduler remains " + result.schedulerState() + ".");
    }
}
