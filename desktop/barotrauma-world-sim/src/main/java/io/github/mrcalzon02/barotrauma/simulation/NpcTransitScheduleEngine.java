package io.github.mrcalzon02.barotrauma.simulation;

import java.util.ArrayList;
import java.util.List;

/** Deterministic conversion from player route exposure to an elapsed-time NPC incident schedule. */
public final class NpcTransitScheduleEngine {
    public static final String POLICY_VERSION = "npc-time-gated-player-parity-v1";
    public static final int ELAPSED_TICKS_PER_PLAYER_CHALLENGE = 3;

    private NpcTransitScheduleEngine() { }

    public static int playerEquivalentChallengeCount(int originRing, int originLevel,
                                                     int destinationRing, int destinationLevel) {
        if (originRing < 0 || originLevel < 0 || destinationRing < 0 || destinationLevel < 0) {
            throw new IllegalArgumentException("Transit route coordinates cannot be negative.");
        }
        int estimate = 2 + Math.abs(originRing - destinationRing) / 8
                + Math.abs(originLevel - destinationLevel);
        return Math.max(2, Math.min(24, estimate));
    }

    public static int elapsedDurationTicks(int playerEquivalentChallengeCount) {
        if (playerEquivalentChallengeCount < 1 || playerEquivalentChallengeCount > 24) {
            throw new IllegalArgumentException("Player-equivalent challenge count must be 1..24.");
        }
        return Math.multiplyExact(playerEquivalentChallengeCount, ELAPSED_TICKS_PER_PLAYER_CHALLENGE);
    }

    public static List<Integer> incidentOffsets(int playerEquivalentChallengeCount, int elapsedDurationTicks) {
        if (playerEquivalentChallengeCount < 1 || elapsedDurationTicks <= playerEquivalentChallengeCount) {
            throw new IllegalArgumentException("NPC incident schedules require time between challenge slots.");
        }
        List<Integer> offsets = new ArrayList<>(playerEquivalentChallengeCount);
        int previous = 0;
        for (int ordinal = 1; ordinal <= playerEquivalentChallengeCount; ordinal++) {
            long numerator = (2L * ordinal - 1L) * elapsedDurationTicks;
            long denominator = 2L * playerEquivalentChallengeCount;
            int offset = (int) ((numerator + denominator - 1L) / denominator);
            offset = Math.max(previous + 1, Math.min(elapsedDurationTicks - 1, offset));
            offsets.add(offset);
            previous = offset;
        }
        return List.copyOf(offsets);
    }

    public static long deterministicIncidentSequence(long startedTick, int incidentOrdinal) {
        if (startedTick < 0 || incidentOrdinal < 1) {
            throw new IllegalArgumentException("Transit incident sequence inputs are invalid.");
        }
        return Math.addExact(Math.multiplyExact(startedTick, 1_000L), incidentOrdinal);
    }

    public static void verifyContract() {
        int challenges = playerEquivalentChallengeCount(48, 1, 34, 5);
        require(challenges == 7, "Player-equivalent route exposure changed unexpectedly.");
        int duration = elapsedDurationTicks(challenges);
        require(duration == 21, "NPC elapsed duration did not preserve the schedule policy ratio.");
        List<Integer> first = incidentOffsets(challenges, duration);
        List<Integer> replay = incidentOffsets(challenges, duration);
        require(first.equals(replay) && first.size() == challenges,
                "NPC incident schedule did not replay deterministically.");
        require(incidentOffsets(4, 12).equals(List.of(2, 5, 8, 11)),
                "NPC incident slots are no longer distributed through the elapsed voyage period.");
        int previous = 0;
        for (int offset : first) {
            require(offset > previous && offset < duration,
                    "NPC incident offsets were not strictly ordered inside the voyage leg.");
            previous = offset;
        }
        require(deterministicIncidentSequence(42, 3) == 42_003L,
                "NPC incident sequence identity changed unexpectedly.");
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    public static void main(String[] args) {
        verifyContract();
        System.out.println("Barotrauma time-gated NPC transit schedule contracts passed.");
    }
}
