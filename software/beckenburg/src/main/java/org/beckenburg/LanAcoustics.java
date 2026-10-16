package org.beckenburg;

import java.util.Arrays;
import java.util.PriorityQueue;

/** Host-side acoustic propagation through actual room thresholds, not player telemetry.
 * The fixed small-room graph keeps calculations deterministic and cheap for Java 17.
 */
public final class LanAcoustics {
    private LanAcoustics() { }

    /** An open door or open-air passage costs 1. A closed door costs 3.
     * Dense cellar masonry and transitions to exposed exterior add absorption.
     * No propagation enters the expedition van (the ghost-safe extraction zone).
     */
    public static int edgeCost(HouseMap map, int from, int to) {
        if (map == null || from < 0 || to < 0 || from >= HouseMap.EXTRACTION_ROOM
                || to >= HouseMap.EXTRACTION_ROOM || !map.ghostExits(from).contains(to))
            return Integer.MAX_VALUE;
        int aRow = from / HouseMap.COLS, bRow = to / HouseMap.COLS;
        int x, z;
        if (aRow == bRow) { // East/west partition at x=8 or 16.
            x = Math.max(from % HouseMap.COLS, to % HouseMap.COLS) * 8;
            z = aRow * 6 + 3;
        } else { // North/south partition at z=6,12,18,24.
            x = (from % HouseMap.COLS) * 8 + 4;
            z = Math.max(aRow, bRow) * 6;
        }
        char threshold = map.tile(x, z);
        int cost = switch (threshold) {
            case 'D' -> map.doorOpen(x, z) ? 1 : 3;
            case 'o', '.' -> 1; // An actual open passage, especially outside.
            default -> 5; // A solid partition can transmit muffled sound, never an open-door bonus.
        };
        if ((from >= 9 && from <= 11) || (to >= 9 && to <= 11)) cost++;
        if (map.outside(from) != map.outside(to)) cost++; // wind / environmental masking
        return cost;
    }

    /** Lowest-cost audible route. Never routes through the ghost-excluded van. */
    public static int cost(HouseMap map, int from, int to) {
        if (map == null || from < 0 || to < 0 || from >= HouseMap.EXTRACTION_ROOM
                || to >= HouseMap.EXTRACTION_ROOM) return Integer.MAX_VALUE;
        int[] best = new int[HouseMap.EXTRACTION_ROOM];
        Arrays.fill(best, Integer.MAX_VALUE);
        best[from] = 0;
        PriorityQueue<int[]> queue = new PriorityQueue<>((a,b) -> Integer.compare(a[1], b[1]));
        queue.add(new int[]{from, 0});
        while (!queue.isEmpty()) {
            int[] state = queue.poll();
            if (state[1] != best[state[0]]) continue;
            if (state[0] == to) return state[1];
            for (int next : map.ghostExits(state[0])) {
                int edge = edgeCost(map, state[0], next);
                if (edge == Integer.MAX_VALUE || state[1] > Integer.MAX_VALUE-edge) continue;
                int value = state[1] + edge;
                if (value < best[next]) { best[next] = value; queue.add(new int[]{next,value}); }
            }
        }
        return Integer.MAX_VALUE;
    }
    public static boolean audible(HouseMap map, int from, int to, LanGhostPursuit.Sound sound) {
        return sound != null && cost(map, from, to) <= sound.budget;
    }
}
