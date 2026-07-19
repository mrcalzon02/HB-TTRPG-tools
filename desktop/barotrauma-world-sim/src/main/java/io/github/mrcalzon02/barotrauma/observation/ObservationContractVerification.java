package io.github.mrcalzon02.barotrauma.observation;

import io.github.mrcalzon02.barotrauma.observation.ObservationContracts.CauseFactor;
import io.github.mrcalzon02.barotrauma.observation.ObservationContracts.Confidence;
import io.github.mrcalzon02.barotrauma.observation.ObservationContracts.EntityRef;
import io.github.mrcalzon02.barotrauma.observation.ObservationContracts.FlowStatus;
import io.github.mrcalzon02.barotrauma.observation.ObservationContracts.ObservationCause;
import io.github.mrcalzon02.barotrauma.observation.ObservationContracts.ObservationEvent;
import io.github.mrcalzon02.barotrauma.observation.ObservationContracts.ObservationEventCategory;
import io.github.mrcalzon02.barotrauma.observation.ObservationContracts.ObservedEntityType;
import io.github.mrcalzon02.barotrauma.observation.ObservationContracts.PopulationDelta;
import io.github.mrcalzon02.barotrauma.observation.ObservationContracts.SnapshotIdentity;
import io.github.mrcalzon02.barotrauma.observation.ObservationContracts.VisibilityMode;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Dependency-free Milestone 1.1 contract for observation vocabulary, invariants, IDs, and codecs. */
public final class ObservationContractVerification {
    private ObservationContractVerification() { }

    public static void verifyContract() {
        require(ObservationContracts.CONTRACT_VERSION.equals("barotrauma-world-observation-contract-1"),
                "Observation contract version changed unexpectedly.");
        require(ObservationContracts.RULES_VERSION.equals("desktop-observation-rules-1"),
                "Observation rules version changed unexpectedly.");

        require(enumNames(ObservationEventCategory.values()).equals(List.of(
                "POPULATION", "SETTLEMENT", "FACTION", "CREATURE", "MIGRATION", "HABITAT",
                "RESOURCE", "TRADE", "FLEET", "DISASTER", "RESEARCH", "MISSION", "SYSTEM")),
                "Observation event category vocabulary changed without a contract version increment.");
        require(enumNames(ObservedEntityType.values()).equals(List.of(
                "WORLD", "LOCATION", "STATION", "FACTION", "VESSEL", "NPC_POPULATION",
                "CREATURE_POPULATION", "CREATURE_TERRITORY", "ROUTE", "RESOURCE_SITE",
                "MISSION", "OBSERVATION_EVENT")),
                "Observed entity vocabulary changed without a contract version increment.");

        UUID worldId = UUID.fromString("15000000-0000-0000-0000-000000000001");
        UUID stationId = UUID.fromString("15000000-0000-0000-0000-000000000002");
        UUID first = ObservationContracts.deterministicId(worldId, "station-population", stationId.toString(), 42, 0);
        UUID repeated = ObservationContracts.deterministicId(worldId, "station-population", stationId.toString(), 42, 0);
        UUID different = ObservationContracts.deterministicId(worldId, "station-population", stationId.toString(), 42, 1);
        require(first.equals(repeated), "Deterministic observation IDs are not repeatable.");
        require(!first.equals(different), "Distinct observation ordinals collapsed to the same deterministic ID.");

        PopulationDelta delta = new PopulationDelta(12, 5, 3, 4, 2, 1, 1, 0);
        require(delta.gains() == 18, "Population gains were calculated incorrectly.");
        require(delta.losses() == 10, "Population losses were calculated incorrectly.");
        require(delta.netChange() == 8, "Population net change was calculated incorrectly.");
        require(delta.applyTo(100) == 108, "Population delta application was calculated incorrectly.");
        expectFailure(() -> new PopulationDelta(-1, 0, 0, 0, 0, 0, 0, 0),
                "Negative population terms were accepted.");
        expectFailure(() -> new PopulationDelta(0, 0, 20, 0, 0, 0, 0, 0).applyTo(10),
                "A population delta was allowed to produce a negative population.");

        require(FlowStatus.PLANNED.mayTransitionTo(FlowStatus.PREPARING),
                "Planned population flows cannot begin preparation.");
        require(FlowStatus.PREPARING.mayTransitionTo(FlowStatus.IN_TRANSIT),
                "Prepared population flows cannot enter transit.");
        require(FlowStatus.IN_TRANSIT.mayTransitionTo(FlowStatus.RETURNING),
                "In-transit population flows cannot enter a return leg.");
        require(FlowStatus.RETURNING.mayTransitionTo(FlowStatus.ARRIVED),
                "Returning population flows cannot arrive.");
        require(!FlowStatus.ARRIVED.mayTransitionTo(FlowStatus.IN_TRANSIT),
                "A terminal arrived flow was allowed to restart.");
        require(FlowStatus.FAILED.terminal() && FlowStatus.CANCELLED.terminal(),
                "Failed or cancelled population flows are not terminal.");

        CauseFactor primary = new CauseFactor(ObservationCause.SUPPLY_SHORTAGE, 100,
                "station-supply-below-critical-threshold");
        ArrayList<CauseFactor> mutableFactors = new ArrayList<>();
        mutableFactors.add(new CauseFactor(ObservationCause.EMIGRATION, 65, "evacuation-convoy-departed"));
        ObservationEvent event = new ObservationEvent(
                first,
                worldId,
                42,
                Instant.parse("2175-01-01T00:42:00Z"),
                ObservationEventCategory.POPULATION,
                new EntityRef(ObservedEntityType.STATION, stationId, "Nadir Station"),
                primary,
                mutableFactors,
                8,
                VisibilityMode.INTELLIGENCE,
                Confidence.HIGH,
                "Nadir Station contracted after sustained supply shortage and evacuation traffic.");
        mutableFactors.clear();
        require(event.contributingFactors().size() == 1,
                "Observation events retained a mutable contributing-factor list.");

        String encoded = ObservationContracts.encodeEvent(event);
        ObservationEvent decoded = ObservationContracts.decodeEvent(encoded);
        require(decoded.equals(event), "Canonical observation event encoding did not round-trip exactly.");
        require(encoded.equals(ObservationContracts.encodeEvent(decoded)),
                "Canonical observation event encoding is not stable after decoding.");
        expectFailure(() -> ObservationContracts.decodeEvent(encoded.replace(
                        ObservationContracts.CONTRACT_VERSION, "barotrauma-world-observation-contract-999")),
                "An unsupported observation contract version was accepted.");
        expectFailure(() -> new CauseFactor(ObservationCause.OTHER, 0, "invalid-weight"),
                "A zero-weight cause factor was accepted.");

        UUID snapshotId = ObservationContracts.deterministicId(worldId, "snapshot", "tick-42", 42, 0);
        SnapshotIdentity snapshot = new SnapshotIdentity(snapshotId, worldId, 42, null,
                ObservationContracts.RULES_VERSION);
        require(snapshot.tickSequence() == 42 && snapshot.parentSnapshotId() == null,
                "Root snapshot identity was not preserved.");
        expectFailure(() -> new SnapshotIdentity(snapshotId, worldId, 42, snapshotId,
                        ObservationContracts.RULES_VERSION),
                "A snapshot was allowed to reference itself as parent.");
    }

    public static void main(String[] args) {
        verifyContract();
        System.out.println("Desktop observation vocabulary, invariants, deterministic IDs, flow transitions, population accounting, and canonical codec contract passed.");
    }

    private static List<String> enumNames(Enum<?>[] values) {
        return java.util.Arrays.stream(values).map(Enum::name).toList();
    }

    private static void expectFailure(Runnable runnable, String message) {
        try {
            runnable.run();
        } catch (IllegalArgumentException expected) {
            return;
        }
        throw new IllegalStateException(message);
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }
}
