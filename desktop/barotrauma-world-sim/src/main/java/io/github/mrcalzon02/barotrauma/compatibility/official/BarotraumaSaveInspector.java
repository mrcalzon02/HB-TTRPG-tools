package io.github.mrcalzon02.barotrauma.compatibility.official;

import io.github.mrcalzon02.barotrauma.domain.identity.IdentityContracts;
import io.github.mrcalzon02.barotrauma.domain.identity.IdentityContracts.SourceArtifactIdentity;
import io.github.mrcalzon02.barotrauma.domain.identity.IdentityContracts.SubmarineDefinitionIdentity;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.EOFException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
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
import java.util.zip.GZIPInputStream;

/** Read-only inspector for official Barotrauma .save archives and standalone .sub files. */
public final class BarotraumaSaveInspector {
    public static final long MAX_SOURCE_BYTES = 512L * 1024L * 1024L;
    public static final long MAX_TOTAL_EXPANDED_BYTES = 768L * 1024L * 1024L;
    public static final int MAX_ENTRY_BYTES = 192 * 1024 * 1024;
    public static final int MAX_ENTRY_COUNT = 2048;
    public static final int MAX_NAME_CHARS = 255;

    private BarotraumaSaveInspector() {}

    public static Inspection inspect(Path source) throws IOException, InspectionException {
        Objects.requireNonNull(source, "source");
        if (!Files.isRegularFile(source)) throw new InspectionException("The selected source is not a regular file.");
        long length = Files.size(source);
        if (length <= 0) throw new InspectionException("The selected source is empty.");
        if (length > MAX_SOURCE_BYTES) throw new InspectionException("The selected source exceeds the 512 MiB inspection limit.");
        byte[] bytes = Files.readAllBytes(source);
        String name = source.getFileName().toString();
        String extension = extension(name);
        return switch (extension) {
            case ".save" -> inspectCampaign(bytes, name);
            case ".sub" -> inspectStandaloneSubmarine(bytes, name);
            default -> throw new InspectionException("Unsupported source extension " + extension + "; expected .save or .sub.");
        };
    }

    public static CampaignInspection inspectCampaign(byte[] bytes, String sourceName) throws InspectionException {
        SourceArtifactIdentity artifact = artifact(bytes);
        Map<String, byte[]> entries = decodeCampaignArchive(bytes);
        byte[] sessionBytes = findEntry(entries, "gamesession.xml");
        if (sessionBytes == null) throw new InspectionException("Campaign archive does not contain gamesession.xml.");

        Document session = parseXml(sessionBytes, "gamesession.xml");
        Element root = session.getDocumentElement();
        if (root == null) throw new InspectionException("gamesession.xml has no document root.");
        String version = attribute(root, "version");
        if (version.isBlank()) throw new InspectionException("gamesession.xml does not declare a version attribute.");

        List<String> warnings = new ArrayList<>();
        String selectedName = attribute(root, "submarine");
        Instant saveTime = parseInstant(attribute(root, "savetime"), warnings, "gamesession savetime");
        List<String> ownedNames = ownedSubmarineNames(root);
        List<String> contentPackages = contentPackages(root);
        List<SubmarineInspection> submarines = new ArrayList<>();

        for (Map.Entry<String, byte[]> entry : entries.entrySet()) {
            if (entry.getKey().toLowerCase(Locale.ROOT).endsWith(".sub")) {
                submarines.add(inspectSubmarinePayload(entry.getValue(), entry.getKey(), artifact(entry.getValue())));
            }
        }
        submarines.sort(Comparator.comparing(SubmarineInspection::name, String.CASE_INSENSITIVE_ORDER));

        Set<String> availableNames = new HashSet<>();
        for (SubmarineInspection submarine : submarines) availableNames.add(submarine.name().toLowerCase(Locale.ROOT));
        if (!selectedName.isBlank() && !availableNames.contains(selectedName.toLowerCase(Locale.ROOT))) {
            warnings.add("Selected submarine '" + selectedName + "' has no matching .sub payload in the archive.");
        }
        for (String owned : ownedNames) {
            if (!availableNames.contains(owned.toLowerCase(Locale.ROOT))) {
                warnings.add("Owned submarine '" + owned + "' has no matching .sub payload in the archive.");
            }
        }

        return new CampaignInspection(sourceName, artifact, version, saveTime, selectedName,
                List.copyOf(ownedNames), List.copyOf(contentPackages), entries.size(),
                List.copyOf(submarines), List.copyOf(warnings));
    }

    public static StandaloneSubmarineInspection inspectStandaloneSubmarine(byte[] bytes, String sourceName)
            throws InspectionException {
        SourceArtifactIdentity artifact = artifact(bytes);
        SubmarineInspection submarine = inspectSubmarinePayload(bytes, sourceName, artifact);
        return new StandaloneSubmarineInspection(sourceName, artifact, submarine);
    }

    private static SubmarineInspection inspectSubmarinePayload(byte[] compressedBytes, String sourceName,
            SourceArtifactIdentity payloadArtifact) throws InspectionException {
        byte[] xmlBytes = gunzipSingle(compressedBytes, MAX_ENTRY_BYTES, sourceName);
        Document document = parseXml(xmlBytes, sourceName);
        Element root = document.getDocumentElement();
        if (root == null || !root.getTagName().equalsIgnoreCase("Submarine")) {
            throw new InspectionException(sourceName + " does not contain a Submarine XML root.");
        }
        String canonical = canonicalElement(root);
        Integer checkValue = optionalInt(attribute(root, "checkval"));
        SubmarineDefinitionIdentity definition = new SubmarineDefinitionIdentity(
                IdentityContracts.sha256(canonical.getBytes(StandardCharsets.UTF_8)), checkValue);
        return new SubmarineInspection(
                sourceName,
                payloadArtifact,
                definition,
                attribute(root, "name"),
                attribute(root, "description"),
                attribute(root, "gameversion"),
                attribute(root, "type"),
                attribute(root, "class"),
                optionalInt(attribute(root, "tier")),
                optionalInt(attribute(root, "price")),
                checkValue,
                attribute(root, "dimensions"),
                optionalInt(attribute(root, "cargocapacity")),
                optionalInt(attribute(root, "recommendedcrewsizemin")),
                optionalInt(attribute(root, "recommendedcrewsizemax")),
                attribute(root, "recommendedcrewexperience"),
                splitCsv(attribute(root, "requiredcontentpackages"))
        );
    }

    private static Map<String, byte[]> decodeCampaignArchive(byte[] bytes) throws InspectionException {
        Map<String, byte[]> entries = new LinkedHashMap<>();
        long expanded = 0;
        try (InputStream input = new GZIPInputStream(new ByteArrayInputStream(bytes))) {
            while (true) {
                Integer nameLength = readLittleEndianIntOrEnd(input);
                if (nameLength == null) break;
                if (nameLength < 0 || nameLength > MAX_NAME_CHARS) {
                    throw new InspectionException("Archive entry filename length is outside the supported 0..255 range.");
                }
                byte[] nameBytes = readExactly(input, Math.multiplyExact(nameLength, 2));
                String name = new String(nameBytes, StandardCharsets.UTF_16LE).replace('\\', '/');
                validateEntryName(name);
                int contentLength = readLittleEndianInt(input);
                if (contentLength < 0 || contentLength > MAX_ENTRY_BYTES) {
                    throw new InspectionException("Archive entry '" + name + "' exceeds the per-entry inspection limit.");
                }
                expanded += contentLength;
                if (expanded > MAX_TOTAL_EXPANDED_BYTES) {
                    throw new InspectionException("Campaign archive exceeds the total expanded-size inspection limit.");
                }
                if (entries.size() >= MAX_ENTRY_COUNT) {
                    throw new InspectionException("Campaign archive contains more than " + MAX_ENTRY_COUNT + " entries.");
                }
                if (entries.containsKey(name.toLowerCase(Locale.ROOT))) {
                    throw new InspectionException("Campaign archive contains a duplicate filename: " + name);
                }
                entries.put(name.toLowerCase(Locale.ROOT), readExactly(input, contentLength));
            }
        } catch (EOFException exception) {
            throw new InspectionException("Campaign archive is truncated.", exception);
        } catch (ArithmeticException exception) {
            throw new InspectionException("Campaign archive filename length overflowed.", exception);
        } catch (IOException exception) {
            throw new InspectionException("Campaign archive could not be decompressed.", exception);
        }
        if (entries.isEmpty()) throw new InspectionException("Campaign archive contains no entries.");
        return entries;
    }

    private static void validateEntryName(String name) throws InspectionException {
        if (name.isBlank() || name.startsWith("/") || name.startsWith("\\") || name.indexOf('\0') >= 0) {
            throw new InspectionException("Campaign archive contains an unsafe or empty filename.");
        }
        String[] segments = name.split("/");
        for (String segment : segments) {
            if (segment.isBlank() || segment.equals(".") || segment.equals("..")) {
                throw new InspectionException("Campaign archive contains an unsafe path: " + name);
            }
        }
        if (segments[0].matches("^[A-Za-z]:.*")) {
            throw new InspectionException("Campaign archive contains an absolute drive path: " + name);
        }
    }

    private static byte[] gunzipSingle(byte[] bytes, int limit, String label) throws InspectionException {
        try (InputStream input = new GZIPInputStream(new ByteArrayInputStream(bytes));
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int read;
            int total = 0;
            while ((read = input.read(buffer)) >= 0) {
                total += read;
                if (total > limit) throw new InspectionException(label + " expands beyond the inspection limit.");
                output.write(buffer, 0, read);
            }
            return output.toByteArray();
        } catch (IOException exception) {
            throw new InspectionException(label + " is not a valid GZip-compressed submarine file.", exception);
        }
    }

    private static Document parseXml(byte[] bytes, String label) throws InspectionException {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(false);
            factory.setXIncludeAware(false);
            factory.setExpandEntityReferences(false);
            factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
            DocumentBuilder builder = factory.newDocumentBuilder();
            return builder.parse(new ByteArrayInputStream(bytes));
        } catch (ParserConfigurationException | SAXException | IOException exception) {
            throw new InspectionException(label + " contains invalid or unsafe XML.", exception);
        }
    }

    private static String canonicalElement(Element element) {
        StringBuilder out = new StringBuilder();
        appendCanonical(element, out);
        return out.toString();
    }

    private static void appendCanonical(Element element, StringBuilder out) {
        out.append('<').append(element.getTagName());
        NamedNodeMap attributes = element.getAttributes();
        List<Node> sorted = new ArrayList<>();
        for (int i = 0; i < attributes.getLength(); i++) sorted.add(attributes.item(i));
        sorted.sort(Comparator.comparing(Node::getNodeName));
        for (Node attribute : sorted) {
            out.append(' ').append(attribute.getNodeName()).append("=\"").append(escape(attribute.getNodeValue())).append('"');
        }
        out.append('>');
        NodeList children = element.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            Node child = children.item(i);
            if (child instanceof Element childElement) appendCanonical(childElement, out);
            else if (child.getNodeType() == Node.TEXT_NODE || child.getNodeType() == Node.CDATA_SECTION_NODE) {
                String text = child.getNodeValue().trim();
                if (!text.isEmpty()) out.append(escape(text));
            }
        }
        out.append("</").append(element.getTagName()).append('>');
    }

    private static String escape(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private static List<String> ownedSubmarineNames(Element root) {
        List<String> result = new ArrayList<>();
        Element owned = firstChild(root, "ownedsubmarines");
        if (owned == null) return result;
        NodeList children = owned.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            if (children.item(i) instanceof Element element) {
                String name = attribute(element, "name");
                if (!name.isBlank()) result.add(name);
            }
        }
        return result;
    }

    private static List<String> contentPackages(Element root) {
        List<String> result = new ArrayList<>();
        result.addAll(splitPipe(attribute(root, "selectedcontentpackagenames")));
        if (result.isEmpty()) result.addAll(splitPipe(attribute(root, "selectedcontentpackages")));
        return result;
    }

    private static Element firstChild(Element root, String name) {
        NodeList children = root.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            if (children.item(i) instanceof Element element && element.getTagName().equalsIgnoreCase(name)) return element;
        }
        return null;
    }

    private static String attribute(Element element, String name) {
        return element.hasAttribute(name) ? element.getAttribute(name).trim() : "";
    }
    private static Integer optionalInt(String value) {
        try { return value.isBlank() ? null : Integer.valueOf(value); } catch (NumberFormatException ignored) { return null; }
    }
    private static List<String> splitCsv(String value) {
        if (value.isBlank()) return List.of();
        List<String> result = new ArrayList<>();
        for (String part : value.split(",")) if (!part.isBlank()) result.add(part.trim());
        return List.copyOf(result);
    }
    private static List<String> splitPipe(String value) {
        if (value.isBlank()) return List.of();
        List<String> result = new ArrayList<>();
        for (String part : value.split("(?<!\\\\)\\|")) if (!part.isBlank()) result.add(part.replace("\\|", "|").trim());
        return result;
    }
    private static Instant parseInstant(String value, List<String> warnings, String field) {
        if (value.isBlank()) return null;
        try { return Instant.parse(value); }
        catch (DateTimeParseException exception) { warnings.add(field + " is not an ISO-8601 instant: " + value); return null; }
    }
    private static String extension(String name) {
        int dot = name.lastIndexOf('.'); return dot < 0 ? "" : name.substring(dot).toLowerCase(Locale.ROOT);
    }
    private static SourceArtifactIdentity artifact(byte[] bytes) {
        return new SourceArtifactIdentity(IdentityContracts.sha256(bytes), bytes.length);
    }
    private static byte[] findEntry(Map<String, byte[]> entries, String name) { return entries.get(name.toLowerCase(Locale.ROOT)); }

    private static Integer readLittleEndianIntOrEnd(InputStream input) throws IOException {
        int first = input.read();
        if (first < 0) return null;
        int b1 = input.read(), b2 = input.read(), b3 = input.read();
        if ((b1 | b2 | b3) < 0) throw new EOFException();
        return first | (b1 << 8) | (b2 << 16) | (b3 << 24);
    }
    private static int readLittleEndianInt(InputStream input) throws IOException {
        Integer value = readLittleEndianIntOrEnd(input); if (value == null) throw new EOFException(); return value;
    }
    private static byte[] readExactly(InputStream input, int length) throws IOException {
        byte[] bytes = input.readNBytes(length); if (bytes.length != length) throw new EOFException(); return bytes;
    }

    public sealed interface Inspection permits CampaignInspection, StandaloneSubmarineInspection {
        String sourceName();
        SourceArtifactIdentity artifactIdentity();
    }
    public record CampaignInspection(String sourceName, SourceArtifactIdentity artifactIdentity, String gameVersion,
            Instant saveTime, String selectedSubmarineName, List<String> ownedSubmarineNames,
            List<String> contentPackages, int archiveEntryCount, List<SubmarineInspection> submarines,
            List<String> warnings) implements Inspection {
        public CampaignInspection {
            ownedSubmarineNames = List.copyOf(ownedSubmarineNames); contentPackages = List.copyOf(contentPackages);
            submarines = List.copyOf(submarines); warnings = List.copyOf(warnings);
        }
    }
    public record StandaloneSubmarineInspection(String sourceName, SourceArtifactIdentity artifactIdentity,
            SubmarineInspection submarine) implements Inspection {}
    public record SubmarineInspection(String sourceName, SourceArtifactIdentity payloadIdentity,
            SubmarineDefinitionIdentity definitionIdentity, String name, String description, String gameVersion,
            String type, String submarineClass, Integer tier, Integer price, Integer equalityCheckValue,
            String dimensions, Integer cargoCapacity, Integer recommendedCrewMin, Integer recommendedCrewMax,
            String recommendedCrewExperience, List<String> requiredContentPackages) {
        public SubmarineInspection { requiredContentPackages = List.copyOf(requiredContentPackages); }
    }
    public static final class InspectionException extends Exception {
        public InspectionException(String message) { super(message); }
        public InspectionException(String message, Throwable cause) { super(message, cause); }
    }

    public static void verifyContract() throws Exception {
        byte[] submarine = gzip("<Submarine name=\"Test Boat\" description=\"Fixture\" gameversion=\"1.0.0\" type=\"Player\" class=\"Scout\" tier=\"1\" price=\"1000\" checkval=\"7\" dimensions=\"100,50\" cargocapacity=\"12\" recommendedcrewsizemin=\"2\" recommendedcrewsizemax=\"5\" recommendedcrewexperience=\"CrewExperienceLow\" requiredcontentpackages=\"Vanilla\"><Item ID=\"1\" /></Submarine>".getBytes(StandardCharsets.UTF_8));
        StandaloneSubmarineInspection standalone = inspectStandaloneSubmarine(submarine, "test.sub");
        require(standalone.submarine.name.equals("Test Boat"), "Standalone submarine metadata failed.");
        require(standalone.submarine.equalityCheckValue == 7, "Submarine check value failed.");

        byte[] session = "<Gamesession version=\"1.0.0\" submarine=\"Test Boat\" savetime=\"2026-07-17T20:00:00Z\" selectedcontentpackagenames=\"Vanilla|Example Mod\"><ownedsubmarines><submarine name=\"Test Boat\" /></ownedsubmarines></Gamesession>".getBytes(StandardCharsets.UTF_8);
        byte[] save = campaignArchive(Map.of("gamesession.xml", session, "Test Boat.sub", submarine));
        CampaignInspection campaign = inspectCampaign(save, "test.save");
        require(campaign.archiveEntryCount == 2 && campaign.submarines.size() == 1, "Campaign archive summary failed.");
        require(campaign.warnings.isEmpty(), "Fixture campaign produced unexpected warnings.");

        expectFailure(campaignArchive(Map.of("../escape.xml", session)), "unsafe path");
        expectFailure(campaignArchive(Map.of("other.xml", session)), "does not contain gamesession.xml");
    }

    private static byte[] gzip(byte[] bytes) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try (java.util.zip.GZIPOutputStream gzip = new java.util.zip.GZIPOutputStream(output)) { gzip.write(bytes); }
        return output.toByteArray();
    }
    private static byte[] campaignArchive(Map<String, byte[]> entries) throws IOException {
        ByteArrayOutputStream raw = new ByteArrayOutputStream();
        for (Map.Entry<String, byte[]> entry : entries.entrySet()) {
            writeLittleEndianInt(raw, entry.getKey().length());
            raw.write(entry.getKey().getBytes(StandardCharsets.UTF_16LE));
            writeLittleEndianInt(raw, entry.getValue().length);
            raw.write(entry.getValue());
        }
        return gzip(raw.toByteArray());
    }
    private static void writeLittleEndianInt(ByteArrayOutputStream output, int value) {
        output.write(value & 0xff); output.write((value >>> 8) & 0xff); output.write((value >>> 16) & 0xff); output.write((value >>> 24) & 0xff);
    }
    private static void expectFailure(byte[] bytes, String text) throws Exception {
        try { inspectCampaign(bytes, "invalid.save"); throw new IllegalStateException("Expected failure containing " + text); }
        catch (InspectionException exception) { require(exception.getMessage().contains(text), "Unexpected failure: " + exception.getMessage()); }
    }
    private static void require(boolean condition, String message) { if (!condition) throw new IllegalStateException(message); }

    public static void main(String[] args) throws Exception {
        if (args.length == 1 && args[0].equals("--verify")) {
            verifyContract(); System.out.println("Barotrauma official save inspection contracts passed."); return;
        }
        if (args.length != 1) { System.err.println("Usage: BarotraumaSaveInspector <file.save|file.sub> | --verify"); System.exit(2); }
        Inspection inspection = inspect(Path.of(args[0]));
        if (inspection instanceof CampaignInspection campaign) {
            System.out.println("Campaign " + campaign.sourceName + ": version " + campaign.gameVersion + ", "
                    + campaign.archiveEntryCount + " entries, " + campaign.submarines.size() + " submarines.");
            for (String warning : campaign.warnings) System.out.println("WARNING: " + warning);
        } else if (inspection instanceof StandaloneSubmarineInspection standalone) {
            System.out.println("Submarine " + standalone.submarine.name + " [" + standalone.submarine.submarineClass + "]");
            System.out.println("Definition SHA-256: " + standalone.submarine.definitionIdentity.canonicalXmlDigest().value());
        }
    }
}
