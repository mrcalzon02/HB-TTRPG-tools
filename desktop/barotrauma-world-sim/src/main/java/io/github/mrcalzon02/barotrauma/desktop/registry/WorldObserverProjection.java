package io.github.mrcalzon02.barotrauma.desktop.registry;

import java.awt.Point;
import java.util.Objects;

/** Pure presentation math for projecting committed route progress into the observer viewport. */
public final class WorldObserverProjection {
    private WorldObserverProjection() { }

    public static double routeFraction(int progress, int requiredTicks) {
        if (requiredTicks <= 0) return 0.0;
        double fraction = progress / (double) requiredTicks;
        return Math.max(0.0, Math.min(1.0, fraction));
    }

    public static Point interpolate(Point from, Point to, int progress, int requiredTicks) {
        Objects.requireNonNull(from, "from");
        Objects.requireNonNull(to, "to");
        double fraction = routeFraction(progress, requiredTicks);
        return new Point(
                (int) Math.round(from.x + (to.x - from.x) * fraction),
                (int) Math.round(from.y + (to.y - from.y) * fraction));
    }
}
