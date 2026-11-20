package org.cubechat.android;

/** Host-only placement assertions. No images, camera, keys, or radios. */
public final class QrArtworkGeometryTest {
    private static int count;
    private static void expect(boolean ok, String message) {
        count++;
        if (!ok) throw new AssertionError(message);
    }

    private static void reject(Runnable call) {
        count++;
        try {
            call.run();
            throw new AssertionError("Expected refusal for undersized QR region");
        } catch (IllegalArgumentException expected) { }
    }

    public static void main(String[] args) {
        QrArtworkGeometry.Placement square = QrArtworkGeometry.centered(1024, 1024, 65);
        expect(square.side % 65 == 0, "integer module boundaries");
        expect(square.pixelsPerModule >= 6, "camera-sized modules");
        expect(square.left == square.top, "square image centered");
        expect(square.side + 2 * square.left <= 1024, "image border");

        QrArtworkGeometry.Placement wide = QrArtworkGeometry.centered(1500, 900, 89);
        expect(wide.side <= 900, "landscape quiet zone fits");
        expect(wide.left >= 0 && wide.top >= 0, "nonnegative position");
        expect(wide.side + 2 * wide.left <= 1500, "landscape horizontal bound");
        expect(wide.side + 2 * wide.top <= 900, "landscape vertical bound");

        QrArtworkGeometry.Placement tall = QrArtworkGeometry.centered(900, 1500, 89);
        expect(tall.side == wide.side, "rotation does not change module size");
        expect(tall.left == wide.top && tall.top == wide.left, "rotation centers");

        QrArtworkGeometry.Placement dense = QrArtworkGeometry.centered(1536, 1536, 185);
        expect(dense.pixelsPerModule >= 6, "largest QR fits on large photo");

        reject(() -> QrArtworkGeometry.centered(200, 1200, 185));
        reject(() -> QrArtworkGeometry.centered(1024, 1024, 186));
        reject(() -> QrArtworkGeometry.centered(0, 640, 50));
        reject(() -> QrArtworkGeometry.centered(640, -1, 50));
        expect(true, "all geometry rejections completed");
        System.out.println("QrArtworkGeometry: " + count + " offline checks passed");
    }
}
