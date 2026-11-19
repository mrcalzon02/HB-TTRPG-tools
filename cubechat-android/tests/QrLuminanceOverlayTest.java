package org.cubechat.android;

import java.util.Arrays;

/**
 * Host-only compositing tests. No QR invites, keys, network access, or device
 * camera operations. The matrix is synthetic; these are NOT decoder tests.
 */
public final class QrLuminanceOverlayTest {
    private static int assertions;

    private static void check(boolean condition, String reason) {
        assertions++;
        if (!condition) throw new AssertionError(reason);
    }

    private static void rejects(Runnable run, String reason) {
        try {
            run.run();
            throw new AssertionError("Accepted invalid QR geometry: " + reason);
        } catch (IllegalArgumentException expected) {
            check(true, reason);
        }
    }

    private static boolean[][] qr() {
        boolean[][] qr = new boolean[29][29];
        for (int y = 4; y < 25; y++)
            for (int x = 4; x < 25; x++)
                qr[y][x] = (x % 2) == 0;
        return qr;
    }

    private static double luminance(int rgb) {
        return .2126 * ((rgb >>> 16) & 255)
                + .7152 * ((rgb >>> 8) & 255)
                + .0722 * (rgb & 255);
    }

    public static void main(String[] args) {
        final int width = 320, height = 320, side = 232, offset = 44;
        int[] original = new int[width * height];
        Arrays.fill(original, 0xff5599bb);
        boolean[][] modules = qr();
        int[] originalSnapshot = original.clone();

        int[] unchanged = QrLuminanceOverlay.modulate(
                original, width, height, modules, offset, offset, side, 0.0f);
        check(Arrays.equals(unchanged, original), "zero strength does not alter image");
        check(Arrays.equals(original, originalSnapshot), "source buffer never mutated");

        int[] blended = QrLuminanceOverlay.modulate(
                original, width, height, modules, offset, offset, side, 0.78f);
        check(blended[0] == original[0], "pixels outside overlay stay untouched");
        check(blended[width * (height - 1) + width - 1] == original[0],
                "opposite outside corner stays untouched");
        check(blended[(offset + 2) * width + offset + 2] != original[0],
                "quiet zone is brightened rather than erased");
        int black = blended[(offset + 12 * 8 + 4) * width + offset + 12 * 8 + 4];
        int white = blended[(offset + 12 * 8 + 4) * width + offset + 13 * 8 + 4];
        check(luminance(white) - luminance(black) > 110,
                "adjacent modules remain distinguishable after modulation");
        check(((black >>> 24) & 255) == 255, "original alpha channel preserved");
        check(luminance(black) < luminance(original[0]), "black module darkens local brightness");
        check(luminance(white) > luminance(original[0]), "white module brightens local brightness");

        int[] stronger = QrLuminanceOverlay.modulate(
                original, width, height, modules, offset, offset, side, 1.0f);
        double strongBlack = luminance(stronger[(offset + 12 * 8 + 4) * width + offset + 12 * 8 + 4]);
        double strongWhite = luminance(stronger[(offset + 12 * 8 + 4) * width + offset + 13 * 8 + 4]);
        check(Math.abs(strongBlack - 18) < 1.5, "full-strength black target exact");
        check(Math.abs(strongWhite - 238) < 1.5, "full-strength white target exact");

        int colorful = blended[(offset + 12 * 8 + 4) * width + offset + 12 * 8 + 4];
        check((colorful & 255) >= ((colorful >>> 8) & 255)
                        && ((colorful >>> 8) & 255) >= ((colorful >>> 16) & 255),
                "original blue-green-red ordering preserved when possible");

        rejects(() -> QrLuminanceOverlay.modulate(
                original, width, height, modules, offset, offset, side, -0.1f),
                "negative strength");
        rejects(() -> QrLuminanceOverlay.modulate(
                original, width, height, modules, offset, offset, side, Float.NaN),
                "NaN strength");
        rejects(() -> QrLuminanceOverlay.modulate(
                original, width, height, modules, offset, offset, 100, .8f),
                "insufficient pixels per module");
        rejects(() -> QrLuminanceOverlay.modulate(
                original, width, height, modules, 300, offset, side, .8f),
                "QR exceeds image bounds");
        rejects(() -> QrLuminanceOverlay.modulate(
                original, width + 1, height, modules, offset, offset, side, .8f),
                "wrong image dimensions");

        boolean[][] badZone = qr();
        badZone[0][5] = true;
        rejects(() -> QrLuminanceOverlay.modulate(
                original, width, height, badZone, offset, offset, side, .8f),
                "missing four-module quiet zone");

        check(Arrays.equals(original, originalSnapshot),
                "rendering never mutates the caller's image");
        System.out.println("QrLuminanceOverlay: " + assertions
                + " host assertions passed; synthetic patterns only, decoder still required");
    }
}
