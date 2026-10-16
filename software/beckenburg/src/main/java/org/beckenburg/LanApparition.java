package org.beckenburg;

import java.util.Objects;

/** Per-hunter apparition disclosure. The ghost never receives hunter transforms; only
 * authorized, currently manifested, unobstructed ghosts are projected to a 3D hunter.
 */
public final class LanApparition {
    public static final double VIEW_RANGE = 10.0;
    private LanApparition() { }

    public static String frame(HouseMap map, LanWorld.Body viewer, boolean worldMode,
                               LanGhostSpatial.Pose ghost, boolean manifested, int tick) {
        Objects.requireNonNull(map); Objects.requireNonNull(viewer); Objects.requireNonNull(ghost);
        if (tick < 0) throw new IllegalArgumentException("invalid simulation tick");
        if (!worldMode || !manifested || viewer.room() != ghost.room()
                || !lineOfSight(map, viewer.x(), viewer.z(), ghost.x(), ghost.z()))
            return "APPARITION|HIDDEN|" + tick;
        return "APPARITION|VISIBLE|" + Math.round(ghost.x() * 1000)
                + "|" + Math.round(ghost.z() * 1000) + "|" + tick;
    }

    /** Physical walls and closed doors occlude the apparition, not just room membership. */
    static boolean lineOfSight(HouseMap map, double x0, double z0, double x1, double z1) {
        if (!Double.isFinite(x0) || !Double.isFinite(z0)
                || !Double.isFinite(x1) || !Double.isFinite(z1)) return false;
        double d = Math.hypot(x1 - x0, z1 - z0);
        if (d > VIEW_RANGE) return false;
        int steps = Math.max(1, (int)Math.ceil(d / .10));
        for (int n = 1; n < steps; n++) {
            double k = (double)n / steps;
            if (map.solid((int)Math.floor(x0 + (x1-x0)*k),
                          (int)Math.floor(z0 + (z1-z0)*k))) return false;
        }
        return true;
    }
}
