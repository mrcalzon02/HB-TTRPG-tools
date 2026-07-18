package io.github.mrcalzon02.barotrauma.simulation;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/** Deterministic transit challenge resolver shared by NPC and player voyages. */
public final class TransitResolutionEngine {
    private TransitResolutionEngine() { }

    public static Resolution resolve(Transitant vessel, TransitContext context) {
        Objects.requireNonNull(vessel, "vessel");
        Objects.requireNonNull(context, "context");
        long seed = seed(vessel.vesselId(), context);
        Hazard hazard = Hazard.values()[bounded(seed, 7, Hazard.values().length)];
        int challenge = clamp(18 + context.locationLevel() * 6 + context.stationThreat() / 3
                + hazard.challengeModifier + context.missionType().challengeModifier, 1, 100);
        int skill = switch (hazard.skill) {
            case NAVIGATION -> vessel.navigation();
            case ENGINEERING -> vessel.engineering();
            case COMBAT -> vessel.combat();
            case CREW -> vessel.crewQuality();
        };
        int roll = 1 + bounded(seed, 17, 100);
        int effective = clamp((skill * 2 + vessel.crewQuality()) / 3 + roll / 2, 1, 150);
        int margin = effective - challenge;
        Outcome outcome = outcome(margin);
        int hullDelta = switch (outcome) {
            case TRIUMPH, SUCCESS -> 0;
            case COSTLY_SUCCESS -> -Math.max(1, hazard.damage / 3);
            case SETBACK -> -Math.max(2, hazard.damage);
            case DISASTER -> -Math.max(5, hazard.damage * 2);
        };
        int suppliesDelta = -switch (outcome) {
            case TRIUMPH -> 0;
            case SUCCESS -> 1;
            case COSTLY_SUCCESS -> 2;
            case SETBACK -> 4;
            case DISASTER -> 8;
        };
        int delayTicks = switch (outcome) {
            case TRIUMPH -> 0;
            case SUCCESS -> 1;
            case COSTLY_SUCCESS -> 2;
            case SETBACK -> 4;
            case DISASTER -> 8;
        };
        int missionProgress = switch (outcome) {
            case TRIUMPH -> 30;
            case SUCCESS -> 22;
            case COSTLY_SUCCESS -> 15;
            case SETBACK -> 6;
            case DISASTER -> 0;
        };
        String narrative = narrative(vessel.displayName(), hazard, outcome, context.missionType());
        return new Resolution(hazard, challenge, roll, effective, margin, outcome,
                hullDelta, suppliesDelta, delayTicks, missionProgress, narrative, seed);
    }

    private static Outcome outcome(int margin) {
        if (margin >= 35) return Outcome.TRIUMPH;
        if (margin >= 10) return Outcome.SUCCESS;
        if (margin >= 0) return Outcome.COSTLY_SUCCESS;
        if (margin >= -25) return Outcome.SETBACK;
        return Outcome.DISASTER;
    }

    private static String narrative(String name, Hazard hazard, Outcome outcome, MissionType mission) {
        String action = switch (outcome) {
            case TRIUMPH -> "overcame the danger decisively";
            case SUCCESS -> "cleared the danger and maintained the voyage";
            case COSTLY_SUCCESS -> "forced a passage at measurable cost";
            case SETBACK -> "was delayed and damaged while containing the danger";
            case DISASTER -> "suffered a severe failure and may require rescue";
        };
        return name + " encountered " + hazard.displayName + " during "
                + mission.displayName + " operations and " + action + ".";
    }

    private static long seed(UUID vesselId, TransitContext context) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            digest.update(context.worldId().toString().getBytes(StandardCharsets.UTF_8));
            digest.update(vesselId.toString().getBytes(StandardCharsets.UTF_8));
            digest.update(context.routeId().getBytes(StandardCharsets.UTF_8));
            digest.update(context.missionType().name().getBytes(StandardCharsets.UTF_8));
            digest.update(ByteBuffer.allocate(Long.BYTES).putLong(context.tickSequence()).array());
            return ByteBuffer.wrap(digest.digest()).getLong();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable.", exception);
        }
    }

    private static int bounded(long seed, int shift, int bound) {
        if (bound <= 0) throw new IllegalArgumentException("Deterministic bound must be positive.");
        int effectiveShift = Math.floorMod(shift, Long.SIZE);
        long mixed = seed ^ Long.rotateLeft(seed, effectiveShift) ^ 0x9E3779B97F4A7C15L;
        return (int) Math.floorMod(mixed, bound);
    }

    private static int clamp(int value, int minimum, int maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }

    private enum Skill { NAVIGATION, ENGINEERING, COMBAT, CREW }

    public enum Hazard {
        THERMAL_VENT("an unstable thermal vent field", Skill.NAVIGATION, 8, 8),
        ICE_SHEAR("a moving ice-shear front", Skill.NAVIGATION, 12, 10),
        BALLAST_FAILURE("a cascading ballast-control failure", Skill.ENGINEERING, 10, 12),
        REACTOR_INSTABILITY("reactor instability under transit load", Skill.ENGINEERING, 14, 14),
        FAUNA_CONTACT("hostile Europan fauna", Skill.COMBAT, 15, 16),
        ABYSSAL_PREDATOR("an abyssal predator contact", Skill.COMBAT, 22, 20),
        CURRENT_REVERSAL("a violent current reversal", Skill.CREW, 6, 7),
        NAVIGATION_VOID("a charting gap and instrument blackout", Skill.CREW, 10, 9);

        private final String displayName;
        private final Skill skill;
        private final int challengeModifier;
        private final int damage;

        Hazard(String displayName, Skill skill, int challengeModifier, int damage) {
            this.displayName = displayName;
            this.skill = skill;
            this.challengeModifier = challengeModifier;
            this.damage = damage;
        }

        public String displayName() { return displayName; }
    }

    public enum Outcome { TRIUMPH, SUCCESS, COSTLY_SUCCESS, SETBACK, DISASTER }

    public enum MissionType {
        TRADE("trade", 0),
        MINING("mining", 5),
        FAUNA_CLEARING("fauna-clearing", 15),
        DEFENSE("station-defense", 12),
        RESEARCH("research", 7),
        SALVAGE("salvage", 10),
        TRANSIT("transit", 0);

        private final String displayName;
        private final int challengeModifier;
        MissionType(String displayName, int challengeModifier) {
            this.displayName = displayName;
            this.challengeModifier = challengeModifier;
        }
        public String displayName() { return displayName; }
    }

    public record Transitant(
            UUID vesselId,
            String displayName,
            int navigation,
            int engineering,
            int combat,
            int crewQuality,
            int hull,
            int supplies
    ) {
        public Transitant {
            Objects.requireNonNull(vesselId, "vesselId");
            displayName = Objects.requireNonNull(displayName, "displayName").trim();
            if (displayName.isEmpty()) throw new IllegalArgumentException("Vessel name cannot be empty.");
            for (int value : new int[]{navigation, engineering, combat, crewQuality}) {
                if (value < 1 || value > 100) throw new IllegalArgumentException("Transit skill must be 1..100.");
            }
            if (hull < 0 || hull > 100 || supplies < 0) {
                throw new IllegalArgumentException("Transit hull or supplies are invalid.");
            }
        }
    }

    public record TransitContext(
            UUID worldId,
            String routeId,
            long tickSequence,
            int locationLevel,
            int stationThreat,
            MissionType missionType
    ) {
        public TransitContext {
            Objects.requireNonNull(worldId, "worldId");
            routeId = Objects.requireNonNull(routeId, "routeId").trim();
            if (routeId.isEmpty()) throw new IllegalArgumentException("Route identity cannot be empty.");
            if (tickSequence < 0 || locationLevel < 0 || stationThreat < 0 || stationThreat > 100) {
                throw new IllegalArgumentException("Transit context values are invalid.");
            }
            Objects.requireNonNull(missionType, "missionType");
        }
    }

    public record Resolution(
            Hazard hazard,
            int challenge,
            int roll,
            int effectiveCapability,
            int margin,
            Outcome outcome,
            int hullDelta,
            int suppliesDelta,
            int delayTicks,
            int missionProgress,
            String narrative,
            long deterministicSeed
    ) {
        public Resolution {
            Objects.requireNonNull(hazard, "hazard");
            Objects.requireNonNull(outcome, "outcome");
            Objects.requireNonNull(narrative, "narrative");
        }
    }

    public static void verifyContract() {
        UUID world = UUID.fromString("97000000-0000-0000-0000-000000000001");
        Transitant vessel = new Transitant(
                UUID.fromString("97000000-0000-0000-0000-000000000002"),
                "Contract Mariner", 64, 58, 62, 60, 100, 100);
        TransitContext context = new TransitContext(world, "alpha-to-beta", 42, 4, 35,
                MissionType.FAUNA_CLEARING);
        Resolution first = resolve(vessel, context);
        Resolution replay = resolve(vessel, context);
        require(first.equals(replay), "Transit replay was not deterministic.");
        require(first.challenge() >= 1 && first.challenge() <= 100,
                "Transit challenge escaped its bounds.");
        require(first.roll() >= 1 && first.roll() <= 100,
                "Transit roll escaped its bounds.");
        Transitant player = new Transitant(vessel.vesselId(), vessel.displayName(), vessel.navigation(),
                vessel.engineering(), vessel.combat(), vessel.crewQuality(), vessel.hull(), vessel.supplies());
        require(resolve(player, context).equals(first),
                "Player and NPC transit inputs did not use the same resolution system.");

        Set<Hazard> observed = new HashSet<>();
        for (long tick = 42; tick < 74; tick++) {
            observed.add(resolve(vessel, new TransitContext(world, "alpha-to-beta", tick, 4, 35,
                    MissionType.FAUNA_CLEARING)).hazard());
        }
        require(observed.size() >= 4,
                "Deterministic transit sequence did not produce adequate hazard diversity: " + observed);
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    public static void main(String[] args) {
        verifyContract();
        System.out.println("Barotrauma shared transit resolution contracts passed.");
    }
}
