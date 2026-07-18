package io.github.mrcalzon02.barotrauma.domain.identity;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Dependency-free identity and duplicate-resolution contracts for imported campaign artifacts.
 */
public final class IdentityContracts {

    private static final Pattern SHA_256_PATTERN = Pattern.compile("[0-9a-f]{64}");

    private IdentityContracts() {
    }

    public static Sha256Digest sha256(byte[] bytes) {
        Objects.requireNonNull(bytes, "bytes");
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return new Sha256Digest(HexFormat.of().formatHex(digest.digest(bytes)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("The Java runtime does not provide SHA-256.", exception);
        }
    }

    public static DuplicateAction resolve(DuplicateEvidence evidence) {
        Objects.requireNonNull(evidence, "evidence");

        if (evidence.exactArtifact()) {
            return DuplicateAction.SKIP_EXACT_ARTIFACT;
        }
        if (evidence.exactSnapshot()) {
            return DuplicateAction.SKIP_EXACT_SNAPSHOT;
        }
        if (evidence.sameCanonicalDefinition() && evidence.knownVesselAssociation()) {
            if (evidence.sourceNewerThanCurrent()) {
                return DuplicateAction.APPEND_NEWER_SNAPSHOT;
            }
            if (evidence.sourceOlderThanCurrent()) {
                return DuplicateAction.RETAIN_OLDER_SNAPSHOT_FOR_REVIEW;
            }
            return DuplicateAction.REVIEW_VESSEL_ASSOCIATION;
        }
        if (evidence.sameCanonicalDefinition() && !evidence.sameDesktopWorld()) {
            return DuplicateAction.REUSE_DEFINITION_CREATE_VESSEL;
        }
        if (evidence.sameCanonicalDefinition()) {
            return DuplicateAction.REVIEW_VESSEL_ASSOCIATION;
        }
        if (evidence.sameDisplayName()) {
            return DuplicateAction.CREATE_DISTINCT_DEFINITION_AND_VESSEL;
        }
        return DuplicateAction.CREATE_NEW_DEFINITION_AND_VESSEL;
    }

    /**
     * Runs a dependency-free contract check suitable for early development and CI smoke validation.
     */
    public static void verifyContract() {
        Sha256Digest knownDigest = sha256("abc".getBytes(StandardCharsets.UTF_8));
        require(
                knownDigest.value().equals("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"),
                "SHA-256 implementation does not match the known vector."
        );

        DuplicateEvidence defaults = DuplicateEvidence.none();
        require(resolve(defaults.withExactArtifact(true)) == DuplicateAction.SKIP_EXACT_ARTIFACT,
                "Exact artifacts must be skipped.");
        require(resolve(defaults.withExactSnapshot(true)) == DuplicateAction.SKIP_EXACT_SNAPSHOT,
                "Exact snapshots must be skipped.");
        require(resolve(new DuplicateEvidence(false, false, true, true, true, true, false, true))
                        == DuplicateAction.APPEND_NEWER_SNAPSHOT,
                "A newer snapshot of an associated vessel must be appended.");
        require(resolve(new DuplicateEvidence(false, false, true, true, true, false, true, true))
                        == DuplicateAction.RETAIN_OLDER_SNAPSHOT_FOR_REVIEW,
                "An older snapshot must not roll back current vessel state automatically.");
        require(resolve(new DuplicateEvidence(false, false, true, false, false, false, false, true))
                        == DuplicateAction.REUSE_DEFINITION_CREATE_VESSEL,
                "A known definition in another world must produce a separate vessel instance.");
        require(resolve(new DuplicateEvidence(false, false, true, true, false, false, false, true))
                        == DuplicateAction.REVIEW_VESSEL_ASSOCIATION,
                "A same-world design without vessel evidence must not auto-merge.");
        require(resolve(new DuplicateEvidence(false, false, false, true, false, false, false, true))
                        == DuplicateAction.CREATE_DISTINCT_DEFINITION_AND_VESSEL,
                "A matching name with different structure must remain distinct.");
        require(resolve(DuplicateEvidence.none()) == DuplicateAction.CREATE_NEW_DEFINITION_AND_VESSEL,
                "Unmatched imports must create new identities.");
    }

    public static void main(String[] args) {
        verifyContract();
        System.out.println("Barotrauma identity contracts passed.");
    }

    private static void require(boolean condition, String message) {
        if (!condition) {
            throw new IllegalStateException(message);
        }
    }

    public record Sha256Digest(String value) {
        public Sha256Digest {
            Objects.requireNonNull(value, "value");
            value = value.trim().toLowerCase(Locale.ROOT);
            if (!SHA_256_PATTERN.matcher(value).matches()) {
                throw new IllegalArgumentException("A SHA-256 digest must contain exactly 64 lowercase hexadecimal characters.");
            }
        }
    }

    public record SourceArtifactIdentity(Sha256Digest digest, long byteLength) {
        public SourceArtifactIdentity {
            Objects.requireNonNull(digest, "digest");
            if (byteLength < 0) {
                throw new IllegalArgumentException("Artifact byte length cannot be negative.");
            }
        }
    }

    public record SubmarineDefinitionIdentity(
            Sha256Digest canonicalXmlDigest,
            Integer officialEqualityCheckValue
    ) {
        public SubmarineDefinitionIdentity {
            Objects.requireNonNull(canonicalXmlDigest, "canonicalXmlDigest");
        }
    }

    public record VesselInstanceIdentity(UUID worldId, UUID vesselId) {
        public VesselInstanceIdentity {
            Objects.requireNonNull(worldId, "worldId");
            Objects.requireNonNull(vesselId, "vesselId");
        }
    }

    public record VesselSnapshotIdentity(
            UUID vesselId,
            Sha256Digest snapshotDigest,
            Instant sourceTimestamp
    ) {
        public VesselSnapshotIdentity {
            Objects.requireNonNull(vesselId, "vesselId");
            Objects.requireNonNull(snapshotDigest, "snapshotDigest");
        }
    }

    public enum DuplicateAction {
        SKIP_EXACT_ARTIFACT,
        SKIP_EXACT_SNAPSHOT,
        REUSE_DEFINITION_CREATE_VESSEL,
        APPEND_NEWER_SNAPSHOT,
        RETAIN_OLDER_SNAPSHOT_FOR_REVIEW,
        REVIEW_VESSEL_ASSOCIATION,
        CREATE_DISTINCT_DEFINITION_AND_VESSEL,
        CREATE_NEW_DEFINITION_AND_VESSEL
    }

    public record DuplicateEvidence(
            boolean exactArtifact,
            boolean exactSnapshot,
            boolean sameCanonicalDefinition,
            boolean sameDesktopWorld,
            boolean knownVesselAssociation,
            boolean sourceNewerThanCurrent,
            boolean sourceOlderThanCurrent,
            boolean sameDisplayName
    ) {
        public DuplicateEvidence {
            if (sourceNewerThanCurrent && sourceOlderThanCurrent) {
                throw new IllegalArgumentException("A source snapshot cannot be both newer and older than current state.");
            }
            if (knownVesselAssociation && !sameCanonicalDefinition) {
                throw new IllegalArgumentException("A vessel association requires matching canonical definition evidence.");
            }
        }

        public static DuplicateEvidence none() {
            return new DuplicateEvidence(false, false, false, false, false, false, false, false);
        }

        public DuplicateEvidence withExactArtifact(boolean value) {
            return new DuplicateEvidence(value, exactSnapshot, sameCanonicalDefinition, sameDesktopWorld,
                    knownVesselAssociation, sourceNewerThanCurrent, sourceOlderThanCurrent, sameDisplayName);
        }

        public DuplicateEvidence withExactSnapshot(boolean value) {
            return new DuplicateEvidence(exactArtifact, value, sameCanonicalDefinition, sameDesktopWorld,
                    knownVesselAssociation, sourceNewerThanCurrent, sourceOlderThanCurrent, sameDisplayName);
        }
    }
}
