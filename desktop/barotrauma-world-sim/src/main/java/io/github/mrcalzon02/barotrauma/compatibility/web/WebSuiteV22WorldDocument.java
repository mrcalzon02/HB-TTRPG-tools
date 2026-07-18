package io.github.mrcalzon02.barotrauma.compatibility.web;

import io.github.mrcalzon02.barotrauma.compatibility.web.WebSuiteV22Inspector.InspectionException;
import io.github.mrcalzon02.barotrauma.compatibility.web.WebSuiteV22Inspector.InspectionReport;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/** Detailed normalized representation of the master-world portion of one suite-version-22 export. */
public final class WebSuiteV22WorldDocument {
    private static final int MAX_DEPTH = 256;

    private WebSuiteV22WorldDocument() { }

    public static WorldDocument inspect(Path source) throws IOException, InspectionException, NormalizationException {
        Objects.requireNonNull(source, "source");
        if (!Files.isRegularFile(source)) throw new NormalizationException("The selected source is not a regular file.");
        long size = Files.size(source);
        if (size > WebSuiteV22Inspector.MAX_BYTES) {
            throw new NormalizationException("The selected suite export exceeds the 64 MiB import limit.");
        }
        return inspect(Files.readAllBytes(source), source.getFileName().toString());
    }

    public static WorldDocument inspect(byte[] bytes, String sourceName)
            throws InspectionException, NormalizationException {
        InspectionReport inspection = WebSuiteV22Inspector.inspect(bytes, sourceName);
        Map<String, Object> envelope;
        try {
            envelope = object(new Parser(new String(bytes, StandardCharsets.UTF_8)).parse(),
                    "The suite export root must be a JSON object.");
        } catch (ParseException exception) {
            throw new NormalizationException("The suite export could not be normalized as strict JSON: "
                    + exception.getMessage(), exception);
        }
        Map<String, Object> state = object(envelope.get("state"),
                "A version-22 suite export must contain a state object.");
        Map<String, Object> world = map(state.get("world"));
        Map<String, Object> map = map(world.get("map"));
        if (map.isEmpty()) map = map(state.get("worldMap"));
        if (map.isEmpty()) map = map(state.get("map"));

        List<Object> rawNodes = list(map.get("nodes"));
        if (rawNodes.isEmpty()) rawNodes = list(map.get("locations"));
        if (rawNodes.isEmpty()) rawNodes = list(world.get("locations"));

        Map<String, Object> economy = map(state.get("worldEconomy"));
        if (economy.isEmpty()) economy = map(world.get("economy"));
        Map<String, Object> stationEconomies = map(economy.get("stationEconomies"));

        List<String> warnings = new ArrayList<>(inspection.warnings());
        List<LocationRecord> locations = new ArrayList<>();
        List<StationRecord> stations = new ArrayList<>();
        Set<String> sourceIds = new HashSet<>();
        String digestPrefix = inspection.artifactIdentity().digest().value().substring(0, 12);

        for (int ordinal = 0; ordinal < rawNodes.size(); ordinal++) {
            Map<String, Object> node = map(rawNodes.get(ordinal));
            if (node.isEmpty()) {
                throw new NormalizationException("World location " + ordinal + " is not a JSON object.");
            }
            String sourceId = first(
                    scalar(node.get("id")), scalar(node.get("locationId")), scalar(node.get("nodeId")),
                    scalar(node.get("key")), scalar(node.get("uuid"))
            );
            if (sourceId.isBlank()) {
                sourceId = "generated-" + ordinal + "-" + digestPrefix;
                warnings.add("Location " + ordinal + " had no source ID; deterministic fallback " + sourceId + " was assigned.");
            }
            if (!sourceIds.add(sourceId)) {
                throw new NormalizationException("Duplicate world location source ID: " + sourceId);
            }

            String name = first(text(node.get("name")), text(node.get("displayName")),
                    text(node.get("label")), "Location " + (ordinal + 1));
            String type = first(text(node.get("type")), text(node.get("kind")), text(node.get("nodeType")));
            int ring = nonNegativeInteger(firstObject(node.get("ring"), node.get("ringIndex")), 0);
            int level = nonNegativeInteger(firstObject(node.get("level"), node.get("locationLevel"),
                    node.get("depthLevel")), 0);
            Map<String, Object> position = map(node.get("position"));
            Double x = decimal(firstObject(node.get("x"), node.get("mapX"), position.get("x")));
            Double y = decimal(firstObject(node.get("y"), node.get("mapY"), position.get("y")));
            String biome = first(scalar(node.get("biome")), scalar(node.get("biomeId")),
                    scalar(node.get("region")));
            String faction = first(scalar(node.get("faction")), scalar(node.get("factionId")),
                    scalar(node.get("factionKey")), scalar(node.get("ownerFaction")));
            boolean station = station(node, type);

            LocationRecord location = new LocationRecord(sourceId, ordinal, name, type, ring, level,
                    x, y, biome, faction, station);
            locations.add(location);
            if (station) {
                String stationSourceId = first(scalar(node.get("stationId")), scalar(node.get("outpostId")), sourceId);
                String stationType = first(text(node.get("stationType")), text(node.get("outpostType")), type);
                boolean hasEconomy = stationEconomies.containsKey(stationSourceId)
                        || stationEconomies.containsKey(sourceId)
                        || stationEconomies.containsKey(name);
                stations.add(new StationRecord(stationSourceId, sourceId, name, stationType, faction, hasEconomy));
            }
        }

        Instant canonicalTime = firstInstant(warnings, "canonical world time",
                nested(state, "world", "canonicalTime"), nested(state, "world", "clock", "canonicalTime"),
                nested(state, "publicWorldState", "canonicalTime"), state.get("canonicalTime"),
                nested(economy, "simulation", "canonicalTime"), nested(economy, "simulation", "lastSimulatedAt"));
        Instant realEpoch = firstInstant(warnings, "real-world epoch",
                envelope.get("realEpoch"), nested(state, "world", "realEpoch"),
                nested(state, "world", "clock", "realEpoch"), nested(state, "publicWorldState", "realEpoch"));
        Double shellRadius = decimal(firstObject(map.get("shellRadius"), map.get("radius"),
                world.get("shellRadius"), nested(state, "worldScale", "shellRadius"),
                envelope.get("worldShellRadius")));

        SimulationMetadata simulation = new SimulationMetadata(
                canonicalTime,
                realEpoch,
                inspection.economy().lastSimulatedAt(),
                inspection.economy().tickSequence(),
                inspection.economy().totalVessels(),
                inspection.economy().stationEconomies()
        );
        return new WorldDocument(
                inspection,
                shellRadius,
                List.copyOf(locations),
                List.copyOf(stations),
                simulation,
                List.copyOf(warnings)
        );
    }

    private static boolean station(Map<String, Object> node, String type) {
        String normalized = type.toLowerCase(Locale.ROOT);
        return normalized.equals("station") || normalized.equals("outpost") || normalized.equals("city")
                || Boolean.TRUE.equals(node.get("station")) || Boolean.TRUE.equals(node.get("isStation"))
                || Boolean.TRUE.equals(node.get("hasStation"));
    }

    private static int nonNegativeInteger(Object value, int fallback) throws NormalizationException {
        int result = integer(value, fallback);
        if (result < 0) throw new NormalizationException("World ring and level values must be non-negative.");
        return result;
    }

    private static Instant firstInstant(List<String> warnings, String label, Object... values) {
        for (Object value : values) {
            String candidate = text(value);
            if (candidate.isBlank()) continue;
            try {
                return Instant.parse(candidate);
            } catch (DateTimeParseException exception) {
                warnings.add(label + " is not an ISO-8601 instant: " + candidate);
                return null;
            }
        }
        return null;
    }

    private static Object nested(Map<String, Object> root, String... path) {
        Object current = root;
        for (String key : path) {
            if (!(current instanceof Map<?, ?> value)) return null;
            current = value.get(key);
        }
        return current;
    }

    private static Object firstObject(Object... values) {
        for (Object value : values) if (value != null) return value;
        return null;
    }

    private static String first(String... values) {
        for (String value : values) if (value != null && !value.isBlank()) return value.trim();
        return "";
    }

    private static String text(Object value) {
        return value instanceof String text ? text.trim() : "";
    }

    private static String scalar(Object value) {
        return value instanceof String || value instanceof BigDecimal || value instanceof Boolean
                ? value.toString().trim() : "";
    }

    private static int integer(Object value, int fallback) {
        try { return value instanceof BigDecimal number ? number.intValueExact() : fallback; }
        catch (ArithmeticException exception) { return fallback; }
    }

    private static Double decimal(Object value) {
        return value instanceof BigDecimal number ? number.doubleValue() : null;
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
    private static Map<String, Object> object(Object value, String error) throws NormalizationException {
        if (!(value instanceof Map<?, ?> map)) throw new NormalizationException(error);
        return (Map<String, Object>) map;
    }

    public record WorldDocument(
            InspectionReport inspection,
            Double shellRadius,
            List<LocationRecord> locations,
            List<StationRecord> stations,
            SimulationMetadata simulation,
            List<String> warnings
    ) {
        public WorldDocument {
            Objects.requireNonNull(inspection, "inspection");
            locations = List.copyOf(locations);
            stations = List.copyOf(stations);
            Objects.requireNonNull(simulation, "simulation");
            warnings = List.copyOf(warnings);
        }

        public String toHumanReadableText() {
            return inspection.toHumanReadableText()
                    + "Normalized world document\n"
                    + "Canonical time: " + value(simulation.canonicalTime()) + "\n"
                    + "Real epoch: " + value(simulation.realEpoch()) + "\n"
                    + "Shell radius: " + value(shellRadius) + "\n"
                    + "Normalized locations: " + locations.size() + "\n"
                    + "Normalized stations: " + stations.size() + "\n"
                    + "Imported scheduler state: PAUSED (simulation not activated)\n";
        }

        private static String value(Object value) {
            return value == null ? "not declared" : value.toString();
        }
    }

    public record LocationRecord(
            String sourceId,
            int ordinal,
            String displayName,
            String locationType,
            int ring,
            int level,
            Double mapX,
            Double mapY,
            String biome,
            String faction,
            boolean station
    ) { }

    public record StationRecord(
            String sourceId,
            String locationSourceId,
            String displayName,
            String stationType,
            String faction,
            boolean economyPresent
    ) { }

    public record SimulationMetadata(
            Instant canonicalTime,
            Instant realEpoch,
            Instant lastSimulatedAt,
            long importedTickSequence,
            int economyVessels,
            int economyStations
    ) {
        public SimulationMetadata {
            if (importedTickSequence < 0) throw new IllegalArgumentException("Imported tick sequence cannot be negative.");
            if (economyVessels < 0 || economyStations < 0) {
                throw new IllegalArgumentException("Imported economy counts cannot be negative.");
            }
        }
    }

    public static final class NormalizationException extends Exception {
        public NormalizationException(String message) { super(message); }
        public NormalizationException(String message, Throwable cause) { super(message, cause); }
    }

    private static final class ParseException extends Exception {
        private ParseException(String message) { super(message); }
    }

    private static final class Parser {
        private final String source;
        private int index;

        private Parser(String source) { this.source = source; }

        private Object parse() throws ParseException {
            whitespace();
            Object value = value(0);
            whitespace();
            if (index != source.length()) throw error("Unexpected trailing content");
            return value;
        }

        private Object value(int depth) throws ParseException {
            if (depth > MAX_DEPTH) throw error("Maximum JSON nesting depth exceeded");
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

        private Map<String, Object> object(int depth) throws ParseException {
            expect('{');
            whitespace();
            Map<String, Object> result = new LinkedHashMap<>();
            if (take('}')) return result;
            while (true) {
                whitespace();
                if (index >= source.length() || source.charAt(index) != '"') throw error("Expected object key");
                String key = string();
                if (result.containsKey(key)) throw error("Duplicate object key: " + key);
                whitespace();
                expect(':');
                whitespace();
                result.put(key, value(depth));
                whitespace();
                if (take('}')) return result;
                expect(',');
            }
        }

        private List<Object> array(int depth) throws ParseException {
            expect('[');
            whitespace();
            List<Object> result = new ArrayList<>();
            if (take(']')) return result;
            while (true) {
                whitespace();
                result.add(value(depth));
                whitespace();
                if (take(']')) return result;
                expect(',');
            }
        }

        private String string() throws ParseException {
            expect('"');
            StringBuilder result = new StringBuilder();
            while (index < source.length()) {
                char current = source.charAt(index++);
                if (current == '"') return result.toString();
                if (current == '\\') {
                    if (index >= source.length()) throw error("Unterminated escape");
                    char escaped = source.charAt(index++);
                    switch (escaped) {
                        case '"', '\\', '/' -> result.append(escaped);
                        case 'b' -> result.append('\b');
                        case 'f' -> result.append('\f');
                        case 'n' -> result.append('\n');
                        case 'r' -> result.append('\r');
                        case 't' -> result.append('\t');
                        case 'u' -> result.append(unicode());
                        default -> throw error("Unsupported escape");
                    }
                } else {
                    if (current < 0x20) throw error("Unescaped control character");
                    result.append(current);
                }
            }
            throw error("Unterminated string");
        }

        private char unicode() throws ParseException {
            if (index + 4 > source.length()) throw error("Incomplete Unicode escape");
            int result = 0;
            for (int offset = 0; offset < 4; offset++) {
                int digit = Character.digit(source.charAt(index++), 16);
                if (digit < 0) throw error("Invalid Unicode escape");
                result = result * 16 + digit;
            }
            return (char) result;
        }

        private Object literal(String literal, Object value) throws ParseException {
            if (!source.startsWith(literal, index)) throw error("Expected " + literal);
            index += literal.length();
            return value;
        }

        private BigDecimal number() throws ParseException {
            int start = index;
            take('-');
            if (take('0')) {
                if (index < source.length() && Character.isDigit(source.charAt(index))) throw error("Leading zero");
            } else {
                digits();
            }
            if (take('.')) digits();
            if (index < source.length() && (source.charAt(index) == 'e' || source.charAt(index) == 'E')) {
                index++;
                if (!take('+')) take('-');
                digits();
            }
            if (start == index) throw error("Expected JSON value");
            try {
                return new BigDecimal(source.substring(start, index));
            } catch (NumberFormatException exception) {
                throw error("Invalid number");
            }
        }

        private void digits() throws ParseException {
            int start = index;
            while (index < source.length() && Character.isDigit(source.charAt(index))) index++;
            if (start == index) throw error("Expected digit");
        }

        private void whitespace() {
            while (index < source.length() && " \n\r\t".indexOf(source.charAt(index)) >= 0) index++;
        }

        private void expect(char expected) throws ParseException {
            if (!take(expected)) throw error("Expected '" + expected + "'");
        }

        private boolean take(char expected) {
            if (index < source.length() && source.charAt(index) == expected) {
                index++;
                return true;
            }
            return false;
        }

        private ParseException error(String message) {
            return new ParseException(message + " at character " + index + ".");
        }
    }

    public static void verifyContract() throws Exception {
        String fixture = """
                {"version":22,"exportedAt":"2026-07-17T20:00:00Z","masterWorldId":"EUROPA-NORMALIZED",
                "worldEconomyVersion":"1.0.0","state":{"world":{"canonicalTime":"2175-01-01T00:00:00Z",
                "realEpoch":"2026-06-20T08:00:00Z","map":{"rings":48,"shellRadius":7008,"nodes":[
                {"id":"station-a","name":"Alpha Station","ring":48,"level":1,"type":"station","position":{"x":10,"y":20},"faction":"coalition"},
                {"id":"route-a","name":"Route A","ring":47,"level":2,"type":"location","x":30,"y":40,"biome":"cold-caverns"},
                {"name":"Fallback Node","ring":46,"type":"location"}]}},
                "worldEconomy":{"vessels":{"player-1":{"kind":"player"}},"stationEconomies":{"station-a":{}},
                "simulation":{"tickSequence":12,"lastSimulatedAt":"2175-01-02T00:00:00Z"}}}}
                """;
        WorldDocument document = inspect(fixture.getBytes(StandardCharsets.UTF_8), "normalized-fixture.json");
        require(document.locations().size() == 3, "Location normalization failed.");
        require(document.stations().size() == 1 && document.stations().get(0).economyPresent(),
                "Station normalization failed.");
        require(document.simulation().canonicalTime().equals(Instant.parse("2175-01-01T00:00:00Z")),
                "Canonical time normalization failed.");
        require(document.shellRadius().equals(7008.0), "Shell-radius normalization failed.");
        require(document.locations().get(2).sourceId().startsWith("generated-2-"),
                "Deterministic source-ID fallback failed.");
        failure(fixture.replace("\"route-a\"", "\"station-a\""), "Duplicate world location source ID");
    }

    private static void failure(String json, String expected) throws Exception {
        try {
            inspect(json.getBytes(StandardCharsets.UTF_8), "invalid-normalized.json");
            throw new IllegalStateException("Expected normalization failure: " + expected);
        } catch (NormalizationException exception) {
            require(exception.getMessage().contains(expected), "Unexpected normalization failure: " + exception.getMessage());
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    public static void main(String[] args) throws Exception {
        if (args.length == 1 && args[0].equals("--verify")) {
            verifyContract();
            System.out.println("Barotrauma version-22 normalized world contracts passed.");
            return;
        }
        if (args.length != 1) {
            System.err.println("Usage: WebSuiteV22WorldDocument <suite-json-path> | --verify");
            System.exit(2);
        }
        System.out.print(inspect(Path.of(args[0])).toHumanReadableText());
    }
}
