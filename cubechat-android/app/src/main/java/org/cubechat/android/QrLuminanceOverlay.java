package org.cubechat.android;

import java.util.Arrays;
import java.util.Objects;

/**
 * Experimental, opt-in RGB luminance modulation for placing an existing QR
 * matrix over an image. The QR matrix MUST already contain its quiet zone.
 *
 * This is a visual encoding, NOT encryption or confidentiality. Anybody who
 * can decode the image can recover the pairing invite and its key material.
 *
 * It never draws over or modifies the original ARGB buffer. The ordinary black
 * and white QR export remains the fallback until a decoder confirms the new
 * image round-trips reliably.
 */
final class QrLuminanceOverlay {
    static final int MIN_PIXELS_PER_MODULE = 6;
    static final int REQUIRED_QUIET_MODULES = 4;

    private QrLuminanceOverlay() { }

    /**
     * Render one QR square into the existing picture. strength=0 leaves it
     * unchanged; strength=1 makes QR luminance near black/white.
     *
     * For each output pixel we target Y'=0.2126R+0.7152G+0.0722B (sRGB
     * encoded luma), preserving input chroma as far as the RGB gamut permits.
     * This is a pragmatic camera-readability operation, not linear-light HDR.
     */
    static int[] modulate(int[] argb, int width, int height, boolean[][] qr,
                          int left, int top, int side, float strength) {
        Objects.requireNonNull(argb, "picture");
        Objects.requireNonNull(qr, "QR matrix");
        if (width <= 0 || height <= 0 || (long) width * height != argb.length)
            throw new IllegalArgumentException("Image dimensions do not match pixels");
        if (!Float.isFinite(strength) || strength < 0 || strength > 1)
            throw new IllegalArgumentException("Strength must be between 0 and 1");
        int modules = qr.length;
        if (modules < 21 || modules > 185)
            throw new IllegalArgumentException("Unsupported QR matrix dimensions");
        for (boolean[] row : qr)
            if (row == null || row.length != modules)
                throw new IllegalArgumentException("QR matrix must be square");
        if (left < 0 || top < 0 || side < modules * MIN_PIXELS_PER_MODULE
                || (long) left + side > width || (long) top + side > height)
            throw new IllegalArgumentException("QR image area too small or outside picture");
        requireQuietZone(qr);

        int[] result = Arrays.copyOf(argb, argb.length);
        final double dark = 18.0;
        final double light = 238.0;
        for (int py = 0; py < side; py++) {
            int moduleY = py * modules / side;
            for (int px = 0; px < side; px++) {
                int moduleX = px * modules / side;
                int index = (top + py) * width + left + px;
                int rgb = argb[index];
                double red = (rgb >>> 16) & 255;
                double green = (rgb >>> 8) & 255;
                double blue = rgb & 255;
                double y = .2126 * red + .7152 * green + .0722 * blue;
                double goal = qr[moduleY][moduleX] ? dark : light;
                double target = y + strength * (goal - y);

                // Maintain the original pixel's hue/saturation where feasible.
                // When a channel would clip, scale chroma rather than let a
                // clipping artifact change the intended QR luminance.
                double dr = red - y, dg = green - y, db = blue - y;
                double saturation = Math.min(1.0, Math.min(
                        safeScale(target, dr), Math.min(
                                safeScale(target, dg), safeScale(target, db))));
                int r = clamp(target + saturation * dr);
                int g = clamp(target + saturation * dg);
                int b = clamp(target + saturation * db);
                result[index] = (rgb & 0xff000000) | (r << 16) | (g << 8) | b;
            }
        }
        return result;
    }

    private static double safeScale(double target, double difference) {
        if (difference > 0) return (255.0 - target) / difference;
        if (difference < 0) return target / -difference;
        return 1.0;
    }

    private static int clamp(double value) {
        return Math.max(0, Math.min(255, (int) Math.round(value)));
    }

    /**
     * The four-module white border is essential to finding the QR.
     * Do not disguise a missing border as a scan-ready export.
     */
    private static void requireQuietZone(boolean[][] qr) {
        int n = qr.length;
        for (int y = 0; y < n; y++) {
            for (int x = 0; x < n; x++) {
                if ((x < REQUIRED_QUIET_MODULES
                        || y < REQUIRED_QUIET_MODULES
                        || x >= n - REQUIRED_QUIET_MODULES
                        || y >= n - REQUIRED_QUIET_MODULES) && qr[y][x])
                    throw new IllegalArgumentException("QR matrix needs a four-module quiet zone");
            }
        }
    }
}
