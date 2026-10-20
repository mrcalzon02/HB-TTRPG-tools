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
                || Math.hypot(Math.hypot(viewer.x()-ghost.x(),viewer.z()-ghost.z()),viewer.y()-ghost.y())>VIEW_RANGE
                || Math.abs(viewer.y()-ghost.y())>1.8
                || !map.clearLineOfSight(viewer.x(),viewer.y()+1.3,viewer.z(),ghost.x(),ghost.y()+1.3,ghost.z()))
            return "APPARITION|HIDDEN|" + tick;
        return "APPARITION|VISIBLE|" + Math.round(ghost.x() * 1000)
                + "|" + Math.round(ghost.y()*1000) + "|" + Math.round(ghost.z() * 1000) + "|" + tick;
    }

    /** Physical walls and closed doors occlude the apparition, not just room membership. */
    static boolean lineOfSight(HouseMap map, double x0, double z0, double x1, double z1) {
        if (!Double.isFinite(x0) || !Double.isFinite(z0)
                || !Double.isFinite(x1) || !Double.isFinite(z1)) return false;
        return Math.hypot(x1-x0,z1-z0)<=VIEW_RANGE&&map.clearLineOfSight(x0,z0,x1,z1);
    }
}
