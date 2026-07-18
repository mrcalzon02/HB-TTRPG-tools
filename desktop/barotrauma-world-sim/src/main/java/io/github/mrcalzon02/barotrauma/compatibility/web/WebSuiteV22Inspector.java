package io.github.mrcalzon02.barotrauma.compatibility.web;

import io.github.mrcalzon02.barotrauma.domain.identity.IdentityContracts;
import io.github.mrcalzon02.barotrauma.domain.identity.IdentityContracts.SourceArtifactIdentity;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

/** Read-only compatibility inspector for browser-suite version 22 exports. */
public final class WebSuiteV22Inspector {
    public static final int SUPPORTED_VERSION = 22;
    public static final long MAX_BYTES = 64L * 1024L * 1024L;
    private static final int MAX_DEPTH = 256;

    private WebSuiteV22Inspector() {}

    public static InspectionReport inspect(Path source) throws IOException, InspectionException {
        Objects.requireNonNull(source, "source");
        if (!Files.isRegularFile(source)) throw new InspectionException("The selected source is not a regular file.");
        long length = Files.size(source);
        if (length > MAX_BYTES) throw new InspectionException("The selected suite export exceeds the 64 MiB inspection limit.");
        return inspect(Files.readAllBytes(source), source.getFileName().toString());
    }

    public static InspectionReport inspect(byte[] bytes, String sourceName) throws InspectionException {
        Objects.requireNonNull(bytes, "bytes");
        if (bytes.length == 0) throw new InspectionException("The selected suite export is empty.");
        if (bytes.length > MAX_BYTES) throw new InspectionException("The selected suite export exceeds the 64 MiB inspection limit.");

        Map<String, Object> envelope;
        try {
            envelope = object(new Parser(new String(bytes, StandardCharsets.UTF_8)).parse(),
                    "The suite export root must be a JSON object.");
        } catch (ParseException exception) {
            throw new InspectionException("The selected file is not valid strict JSON: " + exception.getMessage(), exception);
        }

        int version = integer(envelope.get("version"), -1);
        if (version != SUPPORTED_VERSION) {
            throw new InspectionException("Unsupported Barotrauma suite export version " + version
                    + "; this inspector accepts version 22.");
        }
        Map<String, Object> state = object(envelope.get("state"),
                "A version-22 suite export must contain a state object.");
        List<String> warnings = new ArrayList<>();

        String masterWorldId = first(text(envelope.get("masterWorldId")),
                nestedText(state, "world", "masterWorldId"), nestedText(state, "worldHub", "masterWorldId"));
        if (masterWorldId.isBlank()) warnings.add("No masterWorldId was found.");

        Map<String, Object> map = map(nested(state, "world", "map"));
        List<Object> nodes = list(map.get("nodes"));
        int rings = integer(map.get("rings"), maxRing(nodes));
        int stations = stationCount(nodes);
        if (rings != 48) warnings.add("World reports " + rings + " rings; desktop baseline expects 48.");
        if (nodes.size() != 960) warnings.add("World contains " + nodes.size() + " locations; desktop baseline expects 960.");
        if (stations != 180) warnings.add("Map exposes " + stations + " recognizable stations; desktop baseline expects 180.");

        Map<String, Object> economy = map(state.get("worldEconomy"));
        if (economy.isEmpty()) economy = map(nested(state, "world", "economy"));
        EconomySummary economySummary = economy(economy);

        String activeName = first(nestedText(state, "submarine", "name"),
                nestedText(state, "operationsDashboard", "activeVesselName"));
        String activeModel = nestedText(state, "submarine", "model");
        int crew = crewCount(state);
        Map<String, String> versions = versions(envelope);
        List<String> families = new ArrayList<>(state.keySet());
        Collections.sort(families);

        return new InspectionReport(
                sourceName == null || sourceName.isBlank() ? "unnamed-suite.json" : sourceName,
                new SourceArtifactIdentity(IdentityContracts.sha256(bytes), bytes.length),
                version,
                instant(envelope.get("exportedAt"), "exportedAt", warnings),
                masterWorldId,
                new WorldSummary(rings, nodes.size(), stations),
                economySummary,
                activeName,
                activeModel,
                crew,
                versions,
                List.copyOf(families),
                List.copyOf(warnings)
        );
    }

    private static EconomySummary economy(Map<String, Object> economy) {
        Map<String, Object> vessels = map(economy.get("vessels"));
        int npc = 0, player = 0, other = 0;
        for (Object raw : vessels.values()) {
            String kind = text(map(raw).get("kind")).toLowerCase(Locale.ROOT);
            if (kind.equals("npc")) npc++; else if (kind.equals("player")) player++; else other++;
        }
        return new EconomySummary(vessels.size(), npc, player, other,
                map(economy.get("stationEconomies")).size(),
                instantQuiet(nested(economy, "simulation", "lastSimulatedAt")),
                longInteger(nested(economy, "simulation", "tickSequence"), 0));
    }

    private static int crewCount(Map<String, Object> state) {
        List<Object> records = list(nested(state, "submarine", "crewRoster"));
        if (records.isEmpty()) records = list(nested(state, "crewManagement", "crew"));
        if (records.isEmpty()) records = list(nested(state, "submarine", "crewAssignments"));
        return records.size();
    }

    private static int stationCount(List<Object> nodes) {
        int result = 0;
        for (Object raw : nodes) {
            Map<String, Object> node = map(raw);
            String type = first(text(node.get("type")), text(node.get("kind")), text(node.get("nodeType"))).toLowerCase(Locale.ROOT);
            if (type.equals("station") || type.equals("outpost") || type.equals("city")
                    || Boolean.TRUE.equals(node.get("station")) || Boolean.TRUE.equals(node.get("isStation"))) result++;
        }
        return result;
    }

    private static int maxRing(List<Object> nodes) {
        int result = 0;
        for (Object raw : nodes) result = Math.max(result, integer(map(raw).get("ring"), 0));
        return result;
    }

    private static Map<String, String> versions(Map<String, Object> envelope) {
        Map<String, String> result = new LinkedHashMap<>();
        for (String key : List.of("catalogueVersion", "submarineRosterVersion", "customContentSchemaVersion",
                "itemFunctionalityVersion", "worldStateSchemaVersion", "factionRegistryVersion",
                "locationLevelRegistryVersion", "creatureRegistryVersion", "routeCrossingVersion",
                "routeEventResolutionVersion", "worldEconomyVersion", "dashboardManagementAuthVersion",
                "dashboardManagementRecoveryVersion", "expeditionIntegrationVersion",
                "activeSubmarineDashboardVersion", "activeTransitTurnVersion", "worldScaleVersion")) {
            String value = scalar(envelope.get(key));
            if (!value.isBlank()) result.put(key, value);
        }
        return Map.copyOf(result);
    }

    private static Object nested(Map<String, Object> root, String... path) {
        Object current = root;
        for (String key : path) {
            if (!(current instanceof Map<?, ?> value)) return null;
            current = value.get(key);
        }
        return current;
    }

    private static String nestedText(Map<String, Object> root, String... path) { return text(nested(root, path)); }
    private static String text(Object value) { return value instanceof String s ? s.trim() : ""; }
    private static String scalar(Object value) { return value instanceof String || value instanceof BigDecimal || value instanceof Boolean ? value.toString().trim() : ""; }
    private static String first(String... values) { for (String value : values) if (value != null && !value.isBlank()) return value; return ""; }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> map(Object value) { return value instanceof Map<?, ?> m ? (Map<String, Object>) m : Map.of(); }
    @SuppressWarnings("unchecked")
    private static List<Object> list(Object value) { return value instanceof List<?> l ? (List<Object>) l : List.of(); }
    @SuppressWarnings("unchecked")
    private static Map<String, Object> object(Object value, String error) throws InspectionException {
        if (!(value instanceof Map<?, ?> m)) throw new InspectionException(error);
        return (Map<String, Object>) m;
    }

    private static int integer(Object value, int fallback) {
        try { return value instanceof BigDecimal n ? n.intValueExact() : fallback; }
        catch (ArithmeticException ignored) { return fallback; }
    }
    private static long longInteger(Object value, long fallback) {
        try { return value instanceof BigDecimal n ? n.longValueExact() : fallback; }
        catch (ArithmeticException ignored) { return fallback; }
    }
    private static Instant instant(Object value, String field, List<String> warnings) {
        String text = text(value);
        if (text.isBlank()) return null;
        try { return Instant.parse(text); }
        catch (DateTimeParseException exception) { warnings.add(field + " is not an ISO-8601 instant: " + text); return null; }
    }
    private static Instant instantQuiet(Object value) {
        try { String text = text(value); return text.isBlank() ? null : Instant.parse(text); }
        catch (DateTimeParseException exception) { return null; }
    }

    public record InspectionReport(String sourceName, SourceArtifactIdentity artifactIdentity, int suiteVersion,
            Instant exportedAt, String masterWorldId, WorldSummary world, EconomySummary economy,
            String activeSubmarineName, String activeSubmarineModel, int crewRecords,
            Map<String, String> componentVersions, List<String> topLevelStateFamilies, List<String> warnings) {
        public InspectionReport {
            componentVersions = Map.copyOf(componentVersions);
            topLevelStateFamilies = List.copyOf(topLevelStateFamilies);
            warnings = List.copyOf(warnings);
        }
        public String toHumanReadableText() {
            StringBuilder out = new StringBuilder("Barotrauma web suite inspection\n")
                    .append("Source: ").append(sourceName).append('\n')
                    .append("SHA-256: ").append(artifactIdentity.digest().value()).append('\n')
                    .append("Bytes: ").append(artifactIdentity.byteLength()).append('\n')
                    .append("Suite version: ").append(suiteVersion).append('\n')
                    .append("Exported at: ").append(exportedAt == null ? "not declared" : exportedAt).append('\n')
                    .append("Master world ID: ").append(masterWorldId.isBlank() ? "not found" : masterWorldId).append('\n')
                    .append("World: ").append(world.rings).append(" rings, ").append(world.locations).append(" locations, ").append(world.stations).append(" stations\n")
                    .append("Economy: ").append(economy.totalVessels).append(" vessels (").append(economy.playerVessels).append(" player, ")
                    .append(economy.npcVessels).append(" NPC, ").append(economy.otherVessels).append(" other), ")
                    .append(economy.stationEconomies).append(" station economies\n")
                    .append("Active submarine: ").append(activeSubmarineName.isBlank() ? "not named" : activeSubmarineName)
                    .append(activeSubmarineModel.isBlank() ? "" : " [" + activeSubmarineModel + "]").append('\n')
                    .append("Crew records: ").append(crewRecords).append('\n')
                    .append("Top-level state families: ").append(String.join(", ", topLevelStateFamilies)).append('\n');
            for (String warning : warnings) out.append("WARNING: ").append(warning).append('\n');
            return out.toString();
        }
    }

    public record WorldSummary(int rings, int locations, int stations) {}
    public record EconomySummary(int totalVessels, int npcVessels, int playerVessels, int otherVessels,
            int stationEconomies, Instant lastSimulatedAt, long tickSequence) {}

    public static final class InspectionException extends Exception {
        public InspectionException(String message) { super(message); }
        public InspectionException(String message, Throwable cause) { super(message, cause); }
    }
    private static final class ParseException extends Exception { private ParseException(String message) { super(message); } }

    private static final class Parser {
        private final String source;
        private int index;
        private Parser(String source) { this.source = source; }
        private Object parse() throws ParseException {
            whitespace(); Object value = value(0); whitespace();
            if (index != source.length()) throw error("Unexpected trailing content");
            return value;
        }
        private Object value(int depth) throws ParseException {
            if (depth > MAX_DEPTH) throw error("Maximum JSON nesting depth exceeded");
            if (index >= source.length()) throw error("Unexpected end of input");
            return switch (source.charAt(index)) {
                case '{' -> object(depth + 1); case '[' -> array(depth + 1); case '"' -> string();
                case 't' -> literal("true", true); case 'f' -> literal("false", false); case 'n' -> literal("null", null);
                default -> number();
            };
        }
        private Map<String, Object> object(int depth) throws ParseException {
            expect('{'); whitespace(); Map<String, Object> result = new LinkedHashMap<>();
            if (take('}')) return result;
            while (true) {
                whitespace(); if (index >= source.length() || source.charAt(index) != '"') throw error("Expected object key");
                String key = string(); if (result.containsKey(key)) throw error("Duplicate object key: " + key);
                whitespace(); expect(':'); whitespace(); result.put(key, value(depth)); whitespace();
                if (take('}')) return result; expect(',');
            }
        }
        private List<Object> array(int depth) throws ParseException {
            expect('['); whitespace(); List<Object> result = new ArrayList<>(); if (take(']')) return result;
            while (true) { whitespace(); result.add(value(depth)); whitespace(); if (take(']')) return result; expect(','); }
        }
        private String string() throws ParseException {
            expect('"'); StringBuilder out = new StringBuilder();
            while (index < source.length()) {
                char c = source.charAt(index++); if (c == '"') return out.toString();
                if (c == '\\') {
                    if (index >= source.length()) throw error("Unterminated escape"); char e = source.charAt(index++);
                    switch (e) { case '"', '\\', '/' -> out.append(e); case 'b' -> out.append('\b'); case 'f' -> out.append('\f');
                        case 'n' -> out.append('\n'); case 'r' -> out.append('\r'); case 't' -> out.append('\t'); case 'u' -> out.append(unicode());
                        default -> throw error("Unsupported escape"); }
                } else { if (c < 0x20) throw error("Unescaped control character"); out.append(c); }
            }
            throw error("Unterminated string");
        }
        private char unicode() throws ParseException {
            if (index + 4 > source.length()) throw error("Incomplete Unicode escape"); int value = 0;
            for (int i = 0; i < 4; i++) { int digit = Character.digit(source.charAt(index++), 16); if (digit < 0) throw error("Invalid Unicode escape"); value = value * 16 + digit; }
            return (char) value;
        }
        private Object literal(String literal, Object value) throws ParseException {
            if (!source.startsWith(literal, index)) throw error("Expected " + literal); index += literal.length(); return value;
        }
        private BigDecimal number() throws ParseException {
            int start = index; take('-');
            if (take('0')) { if (index < source.length() && Character.isDigit(source.charAt(index))) throw error("Leading zero"); }
            else digits();
            if (take('.')) digits();
            if (index < source.length() && (source.charAt(index) == 'e' || source.charAt(index) == 'E')) { index++; if (!take('+')) take('-'); digits(); }
            if (start == index) throw error("Expected JSON value");
            try { return new BigDecimal(source.substring(start, index)); } catch (NumberFormatException exception) { throw error("Invalid number"); }
        }
        private void digits() throws ParseException { int start = index; while (index < source.length() && Character.isDigit(source.charAt(index))) index++; if (start == index) throw error("Expected digit"); }
        private void whitespace() { while (index < source.length() && " \n\r\t".indexOf(source.charAt(index)) >= 0) index++; }
        private void expect(char expected) throws ParseException { if (!take(expected)) throw error("Expected '" + expected + "'"); }
        private boolean take(char expected) { if (index < source.length() && source.charAt(index) == expected) { index++; return true; } return false; }
        private ParseException error(String message) { return new ParseException(message + " at character " + index + "."); }
    }

    public static void verifyContract() throws Exception {
        String fixture = """
                {"version":22,"exportedAt":"2026-07-17T20:00:00Z","masterWorldId":"EUROPA-TEST","worldEconomyVersion":"1.0.0","state":{
                "world":{"map":{"rings":48,"nodes":[{"id":"station-a","ring":48,"type":"station"},{"id":"route-a","ring":47,"type":"location"}]}},
                "worldEconomy":{"vessels":{"player-1":{"kind":"player"},"npc-1":{"kind":"npc"}},"stationEconomies":{"station-a":{}},"simulation":{"tickSequence":12,"lastSimulatedAt":"2026-07-17T19:59:00Z"}},
                "submarine":{"name":"Test Vessel","model":"Barsuk","crewRoster":[{"id":"crew-1"}]}}}
                """;
        InspectionReport report = inspect(fixture.getBytes(StandardCharsets.UTF_8), "fixture.json");
        require(report.world.rings == 48 && report.world.locations == 2 && report.world.stations == 1, "World summary failed.");
        require(report.economy.totalVessels == 2 && report.economy.playerVessels == 1 && report.economy.npcVessels == 1, "Economy summary failed.");
        require(report.crewRecords == 1, "Crew summary failed.");
        require(report.warnings.size() == 2, "Baseline warnings failed.");
        failure("{\"version\":21,\"state\":{}}", "Unsupported Barotrauma suite export version");
        failure("{\"version\":22,\"version\":22,\"state\":{}}", "Duplicate object key");
        failure("{\"version\":22}", "must contain a state object");
    }

    private static void failure(String json, String expected) throws Exception {
        try { inspect(json.getBytes(StandardCharsets.UTF_8), "invalid.json"); throw new IllegalStateException("Expected failure: " + expected); }
        catch (InspectionException exception) { require(exception.getMessage().contains(expected), "Unexpected failure: " + exception.getMessage()); }
    }
    private static void require(boolean condition, String message) { if (!condition) throw new IllegalStateException(message); }

    public static void main(String[] args) throws Exception {
        if (args.length == 1 && args[0].equals("--verify")) { verifyContract(); System.out.println("Barotrauma version-22 web suite inspection contracts passed."); return; }
        if (args.length != 1) { System.err.println("Usage: WebSuiteV22Inspector <suite-json-path> | --verify"); System.exit(2); }
        System.out.print(inspect(Path.of(args[0])).toHumanReadableText());
    }
}
