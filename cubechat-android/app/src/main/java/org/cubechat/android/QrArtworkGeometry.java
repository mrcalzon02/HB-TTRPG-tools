package org.cubechat.android;

/**
 * Offline placement rules for QR artwork. The whole QR, including its
 * four-module quiet zone, stays inside the existing image. There is no crop,
 * stretch, rotation, or app-level key handling in this geometry model.
 */
final class QrArtworkGeometry {
    static final class Placement {
        final int left, top, side, pixelsPerModule;
        Placement(int left, int top, int side, int pixelsPerModule) {
            this.left = left;
            this.top = top;
            this.side = side;
            this.pixelsPerModule = pixelsPerModule;
        }
    }

    private QrArtworkGeometry() { }

    static Placement centered(int width, int height, int modules) {
        if (width < 1 || height < 1 || modules < 21 || modules > 185)
            throw new IllegalArgumentException("Invalid artwork or QR dimensions");
        // Leave a thin image border and favor exact integer module edges.
        int smallest = Math.min(width, height);
        int available = smallest - Math.max(8, smallest / 16);
        int pixelsPerModule = available / modules;
        if (pixelsPerModule < QrLuminanceOverlay.MIN_PIXELS_PER_MODULE)
            throw new IllegalArgumentException("Image too small for this pairing QR. Choose a larger image.");
        int side = pixelsPerModule * modules;
        return new Placement((width - side) / 2, (height - side) / 2,
                side, pixelsPerModule);
    }
}
