package io.github.mrcalzon02.barotrauma.observation;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

/** Stable, dependency-free vocabulary and invariants for desktop passive-world observation. */
public final class ObservationContracts {
    public static final String CONTRACT_VERSION = "barotrauma-world-observation-contract-1";
    public static final String RULES_VERSION = "desktop-observation-rules-1";

    private ObservationContracts() { }

    public enum ObservationEventCategory {
        POPULATION, SETTLEMENT, FACTION, CREATURE, MIGRATION, HABITAT, RESOURCE,
        TRADE, FLEET, DISASTER, RESEARCH, MISSION, SYSTEM
    }

    public enum ObservedEntityType {
        WORLD, LOCATION, STATION, FACTION, VESSEL, NPC_POPULATION, CREATURE_POPULATION,
        CREATURE_TERRITORY, ROUTE, RESOURCE_SITE, MISSION, OBSERVATION_EVENT
    }

    public enum ObservationCause {
        BIRTHS, DEATHS, IMMIGRATION, EMIGRATION, FOUNDING, EVACUATION, ABANDONMENT,
        RECLAMATION, SUPPLY_SHORTAGE, SUPPLY_RECOVERY, SECURITY_CHANGE, HABITAT_CHANGE,
        PREDATION, REPRODUCTION, STARVATION, HUNTING, MIGRATION, DISPLACEMENT,
        EXTRACTION, TRADE_ACTIVITY, DISASTER, MISSION_OUTCOME, MANUAL_IMPORT,
        SYSTEM_INITIALIZATION, OTHER
    }

    public enum PopulationTerm {
        BIRTHS(true), IMMIGRATION(true), OTHER_GAINS(true),
        DEATHS(false), EMIGRATION(false), HUNTING_LOSSES(false),
        DISASTER_LOSSES(false), OTHER_LOSSES(false);

        private final boolean gain;

        PopulationTerm(boolean gain) { this.gain = gain; }

        public boolean gain() { return gain; }
    }

    public enum FlowStatus {
        PLANNED, PREPARING, IN_TRANSIT, RETURNING, ARRIVED, FAILED, CANCELLED;

        public boolean terminal() {
            return this == ARRIVED || this == FAILED || this == CANCELLED;
        }

        public boolean mayTransitionTo(FlowStatus next) {
            Objects.requireNonNull(next, "next");
            if (next == this) return true;
            return switch (this) {
                case PLANNED -> next == PREPARING || next == CANCELLED;
                case PREPARING -> next == IN_TRANSIT || next == FAILED || next == CANCELLED;
                case IN_TRANSIT -> next == ARRIVED || next == RETURNING || next == FAILED;
                case RETURNING -> next == ARRIVED || next == FAILED || next == CANCELLED;
                case ARRIVED, FAILED, CANCELLED -> false;
            };
        }
    }

    public enum TerritoryStatus {
        DORMANT, FORAGING, NESTING, MIGRATING, EXPANDING, OVERPOPULATED, COLLAPSING, DISPLACED
    }

    public enum VisibilityMode {
        OMNISCIENT, INTELLIGENCE
    }

    public enum Confidence {
        UNKNOWN(0), LOW(25), MODERATE(50), HIGH(75), CONFIRMED(100);

        private final int score;

        Confidence(int score) { this.score = score; }

        public int score() { return score; }
    }

    public record EntityRef(ObservedEntityType type, UUID entityId, String label) {
        public EntityRef {
            Objects.requireNonNull(type, "type");
            Objects.requireNonNull(entityId, "entityId");
            label = requireText(label, "label", 200);
        }
    }

    public record CauseFactor(ObservationCause cause, int weight, String evidenceKey) {
        public CauseFactor {
            Objects.requireNonNull(cause, "cause");
            if (weight < 1 || weight > 100) {
                throw new IllegalArgumentException("Cause weight must be between 1 and 100.");
            }
            evidenceKey = requireText(evidenceKey, "evidenceKey", 240);
        }
    }

    public record PopulationDelta(long births, long immigration, long deaths, long emigration,
                                  long huntingLosses, long disasterLosses,
                                  long otherGains, long otherLosses) {
        public PopulationDelta {
            requireNonnegative("births", births);
            requireNonnegative("immigration", immigration);
            requireNonnegative("deaths", deaths);
            requireNonnegative("emigration", emigration);
            requireNonnegative("huntingLosses", huntingLosses);
            requireNonnegative("disasterLosses", disasterLosses);
            requireNonnegative("otherGains", otherGains);
            requireNonnegative("otherLosses", otherLosses);
        }

        public long gains() {
            return Math.addExact(Math.addExact(births, immigration), otherGains);
        }

        public long losses() {
            return Math.addExact(Math.addExact(Math.addExact(deaths, emigration),
                    Math.addExact(huntingLosses, disasterLosses)), otherLosses);
        }

        public long netChange() {
            return Math.subtractExact(gains(), losses());
        }

        public long applyTo(long currentPopulation) {
            requireNonnegative("currentPopulation", currentPopulation);
            long result = Math.addExact(currentPopulation, netChange());
            if (result < 0) {
                throw new IllegalArgumentException("Population delta would produce a negative population.");
            }
            return result;
        }
    }

    public record SnapshotIdentity(UUID snapshotId, UUID worldId, long tickSequence,
                                   UUID parentSnapshotId, String rulesVersion) {
        public SnapshotIdentity {
            Objects.requireNonNull(snapshotId, "snapshotId");
            Objects.requireNonNull(worldId, "worldId");
            requireNonnegative("tickSequence", tickSequence);
            if (snapshotId.equals(parentSnapshotId)) {
                throw new IllegalArgumentException("A snapshot cannot be its own parent.");
            }
            rulesVersion = requireToken(rulesVersion, "rulesVersion");
        }
    }

    public record ObservationEvent(UUID eventId, UUID worldId, long tickSequence, Instant canonicalTime,
                                   ObservationEventCategory category, EntityRef primaryEntity,
                                   CauseFactor primaryCause, List<CauseFactor> contributingFactors,
                                   long magnitude, VisibilityMode visibility, Confidence confidence,
                                   String summary) {
        public ObservationEvent {
            Objects.requireNonNull(eventId, "eventId");
            Objects.requireNonNull(worldId, "worldId");
            requireNonnegative("tickSequence", tickSequence);
            Objects.requireNonNull(canonicalTime, "canonicalTime");
            Objects.requireNonNull(category, "category");
            Objects.requireNonNull(primaryEntity, "primaryEntity");
            Objects.requireNonNull(primaryCause, "primaryCause");
            contributingFactors = List.copyOf(Objects.requireNonNull(contributingFactors, "contributingFactors"));
            for (CauseFactor factor : contributingFactors) Objects.requireNonNull(factor, "contributing factor");
            requireNonnegative("magnitude", magnitude);
            Objects.requireNonNull(visibility, "visibility");
            Objects.requireNonNull(confidence, "confidence");
            summary = requireText(summary, "summary", 1_000);
        }
    }

    public static UUID deterministicId(UUID worldId, String namespace, String naturalKey,
                                       long tickSequence, long ordinal) {
        Objects.requireNonNull(worldId, "worldId");
        requireNonnegative("tickSequence", tickSequence);
        requireNonnegative("ordinal", ordinal);
        String normalized = worldId + "|" + requireToken(namespace, "namespace").toLowerCase(Locale.ROOT)
                + "|" + requireText(naturalKey, "naturalKey", 500).trim().toLowerCase(Locale.ROOT)
                + "|" + tickSequence + "|" + ordinal;
        return UUID.nameUUIDFromBytes(normalized.getBytes(StandardCharsets.UTF_8));
    }

    public static String encodeEvent(ObservationEvent event) {
        Objects.requireNonNull(event, "event");
        return String.join(";",
                CONTRACT_VERSION,
                event.eventId().toString(),
                event.worldId().toString(),
                Long.toString(event.tickSequence()),
                event.canonicalTime().toString(),
                event.category().name(),
                event.primaryEntity().type().name(),
                event.primaryEntity().entityId().toString(),
                encodeText(event.primaryEntity().label()),
                event.primaryCause().cause().name(),
                Integer.toString(event.primaryCause().weight()),
                encodeText(event.primaryCause().evidenceKey()),
                Long.toString(event.magnitude()),
                event.visibility().name(),
                event.confidence().name(),
                encodeText(event.summary()),
                encodeFactors(event.contributingFactors()));
    }

    public static ObservationEvent decodeEvent(String encoded) {
        String[] fields = Objects.requireNonNull(encoded, "encoded").split(";", -1);
        if (fields.length != 17) throw new IllegalArgumentException("Observation event field count is invalid.");
        if (!CONTRACT_VERSION.equals(fields[0])) {
            throw new IllegalArgumentException("Unsupported observation contract version: " + fields[0]);
        }
        return new ObservationEvent(
                UUID.fromString(fields[1]),
                UUID.fromString(fields[2]),
                parseNonnegativeLong(fields[3], "tickSequence"),
                Instant.parse(fields[4]),
                ObservationEventCategory.valueOf(fields[5]),
                new EntityRef(ObservedEntityType.valueOf(fields[6]), UUID.fromString(fields[7]), decodeText(fields[8])),
                new CauseFactor(ObservationCause.valueOf(fields[9]), parseInt(fields[10], "causeWeight"), decodeText(fields[11])),
                decodeFactors(fields[16]),
                parseNonnegativeLong(fields[12], "magnitude"),
                VisibilityMode.valueOf(fields[13]),
                Confidence.valueOf(fields[14]),
                decodeText(fields[15]));
    }

    private static String encodeFactors(List<CauseFactor> factors) {
        if (factors.isEmpty()) return "-";
        List<String> encoded = new ArrayList<>(factors.size());
        for (CauseFactor factor : factors) {
            encoded.add(factor.cause().name() + "~" + factor.weight() + "~" + encodeText(factor.evidenceKey()));
        }
        return String.join(",", encoded);
    }

    private static List<CauseFactor> decodeFactors(String encoded) {
        if (encoded.equals("-") || encoded.isEmpty()) return List.of();
        List<CauseFactor> factors = new ArrayList<>();
        for (String item : encoded.split(",", -1)) {
            String[] fields = item.split("~", -1);
            if (fields.length != 3) throw new IllegalArgumentException("Contributing factor field count is invalid.");
            factors.add(new CauseFactor(ObservationCause.valueOf(fields[0]),
                    parseInt(fields[1], "factorWeight"), decodeText(fields[2])));
        }
        return List.copyOf(factors);
    }

    private static String encodeText(String value) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    private static String decodeText(String value) {
        try {
            return new String(Base64.getUrlDecoder().decode(value), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Observation text is not valid Base64URL data.", exception);
        }
    }

    private static long parseNonnegativeLong(String value, String name) {
        try {
            long parsed = Long.parseLong(value);
            requireNonnegative(name, parsed);
            return parsed;
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException(name + " is not a valid long.", exception);
        }
    }

    private static int parseInt(String value, String name) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException(name + " is not a valid integer.", exception);
        }
    }

    private static String requireText(String value, String name, int maximumLength) {
        Objects.requireNonNull(value, name);
        String normalized = value.trim();
        if (normalized.isEmpty()) throw new IllegalArgumentException(name + " must not be blank.");
        if (normalized.length() > maximumLength) {
            throw new IllegalArgumentException(name + " exceeds " + maximumLength + " characters.");
        }
        return normalized;
    }

    private static String requireToken(String value, String name) {
        String token = requireText(value, name, 120);
        if (!token.matches("[A-Za-z0-9][A-Za-z0-9._-]*")) {
            throw new IllegalArgumentException(name + " must be a stable ASCII token.");
        }
        return token;
    }

    private static void requireNonnegative(String name, long value) {
        if (value < 0) throw new IllegalArgumentException(name + " must not be negative.");
    }
}
