package io.github.mrcalzon02.barotrauma.assets;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Development-only unified review selection for the packaged sci-fi UI atlases.
 *
 * <p>The authoritative crop rectangles remain in {@link UiAtlasSliceIndex}. This class reads one packaged
 * review manifest that selects complete-looking candidates for correction without assigning runtime semantic
 * meanings. Assigned regions cannot be retrieved through the index's approved semantic-name API.</p>
 */
public final class UiAtlasUnifiedReview {
    public static final int EXPECTED_APPROVED = 65;
    public static final int EXPECTED_ASSIGNED = 554;
    public static final int EXPECTED_REVIEWED = EXPECTED_APPROVED + EXPECTED_ASSIGNED;

    private static final String MANIFEST =
            "/io/github/mrcalzon02/barotrauma/assets/ui-atlas-unified-review.tsv";

    private final UiAtlasSliceIndex index;
    private final Map<String, ReviewSelection> selections;

    private UiAtlasUnifiedReview(UiAtlasSliceIndex index, Map<String, ReviewSelection> selections) {
        this.index = Objects.requireNonNull(index, "index");
        this.selections = Collections.unmodifiableMap(new LinkedHashMap<>(selections));
    }

    public static UiAtlasUnifiedReview packaged() throws IOException {
        UiAtlasUnifiedReview review = new UiAtlasUnifiedReview(
                UiAtlasSliceIndex.packaged(), readManifest());
        review.verifySelection();
        return review;
    }

    public UiAtlasSliceIndex index() {
        return index;
    }

    public List<UiAtlasSliceIndex.Slice> assignedSlicesFor(String sheetId) {
        ReviewSelection selection = selections.get(Objects.requireNonNull(sheetId, "sheetId"));
        if (selection == null) return List.of();
        return index.slicesFor(sheetId).stream()
                .filter(slice -> selection.assetIds().contains(slice.assetId()))
                .toList();
    }

    public List<UiAtlasSliceIndex.Slice> assignedSlices() {
        List<UiAtlasSliceIndex.Slice> result = new ArrayList<>();
        for (UiAtlasSliceIndex.Sheet sheet : index.sheets()) {
            result.addAll(assignedSlicesFor(sheet.sheetId()));
        }
        return List.copyOf(result);
    }

    public List<ReviewSlice> reviewedSlicesFor(String sheetId) {
        ReviewSelection selection = selections.get(sheetId);
        Set<String> assigned = selection == null ? Set.of() : selection.assetIds();
        List<ReviewSlice> result = new ArrayList<>();
        for (UiAtlasSliceIndex.Slice slice : index.slicesFor(sheetId)) {
            if (slice.approved()) {
                result.add(new ReviewSlice(slice, "approved"));
            } else if (assigned.contains(slice.assetId())) {
                result.add(new ReviewSlice(slice, "assigned"));
            }
        }
        return List.copyOf(result);
    }

    public List<ReviewSlice> reviewedSlices() {
        List<ReviewSlice> result = new ArrayList<>();
        for (UiAtlasSliceIndex.Sheet sheet : index.sheets()) {
            result.addAll(reviewedSlicesFor(sheet.sheetId()));
        }
        return List.copyOf(result);
    }

    public void writeReviewedMap(Path output) throws IOException {
        Path parent = output.toAbsolutePath().normalize().getParent();
        if (parent != null) Files.createDirectories(parent);
        List<String> lines = new ArrayList<>();
        lines.add("sheet_id\tasset_id\treview_status\tsemantic_name\tx\ty\twidth\theight\tzone\tkind\tconfidence\tnotes");
        for (ReviewSlice review : reviewedSlices()) {
            UiAtlasSliceIndex.Slice slice = review.slice();
            lines.add(String.join("\t",
                    slice.sheetId(), slice.assetId(), review.status(), slice.semanticName(),
                    Integer.toString(slice.x()), Integer.toString(slice.y()),
                    Integer.toString(slice.width()), Integer.toString(slice.height()),
                    slice.zone(), slice.kind(), slice.confidence(), sanitize(slice.notes())));
        }
        Files.write(output, lines, StandardCharsets.UTF_8);
    }

    public void verifySelection() throws IOException {
        if (index.approvedSlices().size() != EXPECTED_APPROVED) {
            throw new IOException("Expected " + EXPECTED_APPROVED + " approved medical assets.");
        }
        int declared = selections.values().stream()
                .mapToInt(selection -> selection.assetIds().size()).sum();
        if (declared != EXPECTED_ASSIGNED) {
            throw new IOException("Expected " + EXPECTED_ASSIGNED
                    + " declared assigned regions but found " + declared + ".");
        }
        if (assignedSlices().size() != EXPECTED_ASSIGNED) {
            throw new IOException("Assigned UI atlas candidate resolution changed.");
        }
        if (reviewedSlices().size() != EXPECTED_REVIEWED) {
            throw new IOException("Expected " + EXPECTED_REVIEWED + " reviewed regions.");
        }

        for (ReviewSelection selection : selections.values()) {
            List<UiAtlasSliceIndex.Slice> slices = index.slicesFor(selection.sheetId());
            if (slices.isEmpty()) {
                throw new IOException("Unknown UI atlas review sheet: " + selection.sheetId());
            }
            for (String assetId : selection.assetIds()) {
                UiAtlasSliceIndex.Slice slice = index.find(assetId).orElseThrow(() ->
                        new IOException("Assigned UI atlas candidate is missing: " + assetId));
                if (!slice.sheetId().equals(selection.sheetId())) {
                    throw new IOException("Assigned candidate belongs to the wrong sheet: " + assetId);
                }
                if (slice.approved()) {
                    throw new IOException("Approved UI atlas asset cannot also be assigned: " + assetId);
                }
            }
            String actual = fingerprint(slices, selection.assetIds());
            if (!selection.fingerprint().equals(actual)) {
                throw new IOException("Assigned UI atlas rectangles changed for " + selection.sheetId()
                        + ": expected " + selection.fingerprint() + " but found " + actual + ".");
            }
        }
    }

    public static void verifyContract() throws Exception {
        UiAtlasUnifiedReview review = packaged();
        UiAtlasUnifiedReviewPreview.verifyContract(review);
    }

    public static void main(String[] args) throws Exception {
        UiAtlasUnifiedReview review = packaged();
        if (args.length == 2 && args[0].equals("--render-slices")) {
            UiAtlasUnifiedReviewPreview.writeSlicingPreview(review, Path.of(args[1]));
            System.out.println("Wrote unified UI atlas slicing preview to " + Path.of(args[1]).toAbsolutePath());
            return;
        }
        if (args.length == 2 && args[0].equals("--render-overlays")) {
            UiAtlasUnifiedReviewPreview.writeOverlayPreview(review, Path.of(args[1]));
            System.out.println("Wrote unified UI atlas overlay preview to " + Path.of(args[1]).toAbsolutePath());
            return;
        }
        if (args.length == 2 && args[0].equals("--write-map")) {
            review.writeReviewedMap(Path.of(args[1]));
            System.out.println("Wrote unified UI atlas reviewed map to " + Path.of(args[1]).toAbsolutePath());
            return;
        }
        if (args.length == 0 || (args.length == 1 && args[0].equals("--verify"))) {
            verifyContract();
            System.out.println("Unified UI atlas review passed: 65 approved and 554 assigned regions.");
            return;
        }
        System.err.println("Usage: UiAtlasUnifiedReview [--verify | --render-slices <output.png>"
                + " | --render-overlays <output.png> | --write-map <output.tsv>]");
        System.exit(2);
    }

    private static Map<String, ReviewSelection> readManifest() throws IOException {
        InputStream input = UiAtlasUnifiedReview.class.getResourceAsStream(MANIFEST);
        if (input == null) throw new IOException("Packaged UI atlas review manifest is missing.");
        LinkedHashMap<String, ReviewSelection> result = new LinkedHashMap<>();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(input, StandardCharsets.UTF_8))) {
            String header = reader.readLine();
            if (!"sheet_id\tfingerprint\tasset_ids".equals(header)) {
                throw new IOException("Unexpected UI atlas review manifest header.");
            }
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) continue;
                String[] columns = line.split("\t", -1);
                if (columns.length != 3) throw new IOException("Malformed UI atlas review manifest row.");
                LinkedHashSet<String> ids = new LinkedHashSet<>();
                for (String id : columns[2].split(",")) {
                    if (!id.isBlank() && !ids.add(id)) {
                        throw new IOException("Duplicate UI atlas review id: " + id);
                    }
                }
                ReviewSelection selection = new ReviewSelection(
                        columns[0], columns[1], Collections.unmodifiableSet(ids));
                if (result.putIfAbsent(selection.sheetId(), selection) != null) {
                    throw new IOException("Duplicate UI atlas review sheet: " + selection.sheetId());
                }
            }
        }
        return result;
    }

    private static String fingerprint(List<UiAtlasSliceIndex.Slice> slices, Set<String> ids) {
        long hash = 0xcbf29ce484222325L;
        for (UiAtlasSliceIndex.Slice slice : slices) {
            if (!ids.contains(slice.assetId())) continue;
            String value = slice.assetId() + ":" + slice.x() + "," + slice.y() + ","
                    + slice.width() + "," + slice.height() + ";";
            for (int index = 0; index < value.length(); index++) {
                hash ^= value.charAt(index);
                hash *= 0x100000001b3L;
            }
        }
        return Long.toUnsignedString(hash, 16);
    }

    private static String sanitize(String value) {
        return value.replace('\t', ' ').replace('\r', ' ').replace('\n', ' ');
    }

    public record ReviewSlice(UiAtlasSliceIndex.Slice slice, String status) {
        public ReviewSlice {
            Objects.requireNonNull(slice, "slice");
            if (!status.equals("approved") && !status.equals("assigned")) {
                throw new IllegalArgumentException("Unsupported review status: " + status);
            }
        }

        public boolean approved() {
            return status.equals("approved");
        }
    }

    private record ReviewSelection(String sheetId, String fingerprint, Set<String> assetIds) { }
}
