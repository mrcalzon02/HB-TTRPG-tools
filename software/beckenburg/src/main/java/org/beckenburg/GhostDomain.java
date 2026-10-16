package org.beckenburg;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.Random;

/**
 * Single host-style rule authority for ghost actions. AI and human controllers submit identical
 * Command records. Source is attribution ONLY: it must never change costs or outcomes.
 * No networking or remote command authentication is implied by this local implementation.
 */
public final class GhostDomain {
    public enum Action { DRIFT, WHISPER, DISTURB, MANIFEST, STRIKE }
    public enum Source { AI, HUMAN }
    public record Command(Action action, int targetRoom, long sequence, Source source) {
        public Command {
            Objects.requireNonNull(action, "action");
            Objects.requireNonNull(source, "source");
        }
    }
    /** No hunter coordinates, private journal, role, health or inventory may leak to a controller. */
    public record Observation(int tick, int room, int anchorRoom, int energy,
            boolean manifested, boolean hearsHunter, List<Integer> exits, List<Action> legalActions) {
        public Observation {
            exits = List.copyOf(exits);
            legalActions = List.copyOf(legalActions);
        }
    }
    public record Resolution(boolean applied, String reason, Action action, int room, int energy,
            int fear, int harm, boolean manifested) { }

    private static final int[] COST = { 2, 6, 8, 18, 30 };
    private static final int[] COOLDOWN = { 35, 22, 30, 78, 90 };
    private final int anchorRoom;
    private final HouseMap map;
    private final int[] lastActionTick = new int[Action.values().length];
    private int room, tick, energy = 100, manifestUntil;
    private boolean hearsHunter;
    private long lastSequence = -1;

    public GhostDomain(int anchorRoom) { this(new HouseMap(), anchorRoom); }
    public GhostDomain(HouseMap map, int anchorRoom) {
        this.map=Objects.requireNonNull(map, "map");
        if (anchorRoom < 0 || anchorRoom >= map.interiorRoomCount()) throw new IllegalArgumentException("invalid anchor room");
        this.anchorRoom = anchorRoom;
        this.room = anchorRoom;
        Arrays.fill(lastActionTick, -100000);
    }
    public int room() { return room; }
    public int energy() { return energy; }
    public int tickCount() { return tick; }
    public boolean manifested() { return tick > 0 && tick <= manifestUntil; }

    /** Called exactly once each 100ms simulation step, independent of renderer FPS. */
    public void advance(int nextTick, int hunterRoom) {
        if (nextTick != tick + 1) throw new IllegalArgumentException("ghost tick must advance exactly once");
        tick = nextTick;
        hearsHunter = hunterRoom >= 0 && hunterRoom == room;
        if (tick % 3 == 0) energy = Math.min(100, energy + 1);
    }
    private List<Integer> exits(int current) {
        return map.ghostExits(current);
    }
    private boolean valid(Action a, int target) {
        if (energy < COST[a.ordinal()] || tick - lastActionTick[a.ordinal()] < COOLDOWN[a.ordinal()]) return false;
        if (a == Action.DRIFT) return exits(room).contains(target);
        if (target != room) return false;
        return switch (a) {
            case MANIFEST -> tick >= 80 && hearsHunter && !manifested();
            case STRIKE -> tick > 160 && hearsHunter && manifested();
            case WHISPER, DISTURB -> true;
            case DRIFT -> throw new AssertionError();
        };
    }
    /** Only the host calls this; clients cannot provide their own observations. */
    public Observation observe() {
        List<Action> allowed = new ArrayList<>();
        for (Action action : Action.values()) {
            if (action == Action.DRIFT ? exits(room).stream().anyMatch(to -> valid(action, to)) : valid(action, room)) {
                allowed.add(action);
            }
        }
        return new Observation(tick, room, anchorRoom, energy, manifested(), hearsHunter,
                exits(room), allowed);
    }
    public Resolution dispatch(Command command) {
        Objects.requireNonNull(command, "command");
        // Consume rejected sequence numbers too: a retried forged request must not be reusable.
        if (command.sequence() <= lastSequence || command.sequence() < 0)
            return rejected(command, "duplicate or stale command");
        lastSequence = command.sequence();
        if (!valid(command.action(), command.targetRoom()))
            return rejected(command, "insufficient energy, cooldown or invalid target/state");
        Action a = command.action();
        energy -= COST[a.ordinal()];
        lastActionTick[a.ordinal()] = tick;
        int fear = 0, harm = 0;
        switch (a) {
            case DRIFT -> room = command.targetRoom();
            case WHISPER -> fear = hearsHunter ? 2 : 0;
            case DISTURB -> fear = hearsHunter ? 1 : 0;
            case MANIFEST -> manifestUntil = tick + 49;
            case STRIKE -> { harm = 12; fear = 6; manifestUntil = tick + 6; }
        }
        return new Resolution(true, "accepted", a, room, energy, fear, harm, manifested());
    }
    private Resolution rejected(Command command, String why) {
        return new Resolution(false, why, command.action(), room, energy, 0, 0, manifested());
    }

    /** A decision maker, not a second world mutation path. It sees only Observation. */
    public static final class AiController {
        private final Random rng;
        private long sequence;
        public AiController(long seed) { rng = new Random(seed); }
        public Command decide(Observation observation) {
            Objects.requireNonNull(observation, "observation");
            Action a = null;
            int target = observation.room();
            List<Action> legal = observation.legalActions();
            if (observation.hearsHunter() && legal.contains(Action.STRIKE)) a = Action.STRIKE;
            else if (observation.hearsHunter() && legal.contains(Action.MANIFEST)) a = Action.MANIFEST;
            else if (observation.tick() % 29 == 0 && legal.contains(Action.WHISPER)) a = Action.WHISPER;
            else if (observation.tick() % 41 == 0 && legal.contains(Action.DISTURB)) a = Action.DISTURB;
            else if (observation.tick() % 35 == 0 && !observation.hearsHunter()
                    && legal.contains(Action.DRIFT) && !observation.exits().isEmpty()) {
                a = Action.DRIFT;
                target = observation.exits().get(rng.nextInt(observation.exits().size()));
            }
            return a == null ? null : new Command(a, target, ++sequence, Source.AI);
        }
    }
}
