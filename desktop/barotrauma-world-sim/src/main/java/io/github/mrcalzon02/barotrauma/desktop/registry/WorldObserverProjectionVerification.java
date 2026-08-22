package io.github.mrcalzon02.barotrauma.desktop.registry;

import java.awt.Point;

/** Headless verification for living-observer route projection behavior. */
public final class WorldObserverProjectionVerification {
    private WorldObserverProjectionVerification() { }

    public static void main(String[] args) {
        require(WorldObserverProjection.routeFraction(0, 10) == 0.0,
                "Zero progress must remain at the route origin.");
        require(WorldObserverProjection.routeFraction(5, 10) == 0.5,
                "Half route progress must produce a half-route fraction.");
        require(WorldObserverProjection.routeFraction(20, 10) == 1.0,
                "Progress beyond the required route ticks must clamp to the destination.");
        require(WorldObserverProjection.routeFraction(-4, 10) == 0.0,
                "Negative route progress must clamp to the origin.");
        require(WorldObserverProjection.routeFraction(4, 0) == 0.0,
                "Routes without a positive duration must remain at the origin.");

        Point midpoint = WorldObserverProjection.interpolate(new Point(100, 200), new Point(300, 400), 5, 10);
        require(midpoint.equals(new Point(200, 300)),
                "Mid-route projection must interpolate between origin and destination.");

        Point destination = WorldObserverProjection.interpolate(new Point(100, 200), new Point(300, 400), 50, 10);
        require(destination.equals(new Point(300, 400)),
                "Over-complete route projection must clamp to the destination.");

        System.out.println("Living world observer route projection verification passed.");
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }
}
