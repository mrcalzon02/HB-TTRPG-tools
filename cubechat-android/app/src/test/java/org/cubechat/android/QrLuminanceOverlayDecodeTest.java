package org.cubechat.android;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.RGBLuminanceSource;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.common.HybridBinarizer;
import com.google.zxing.qrcode.QRCodeReader;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.EncodeHintType;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import java.util.EnumMap;
import java.util.Map;
import org.junit.Test;

/**
 * Offline ZXing roundtrip of modulated QR artwork. Dummy public data only:
 * NEVER place real invite keys in checked-in test images or fixtures.
 * No camera, storage access, telephony, or network operations.
 */
public final class QrLuminanceOverlayDecodeTest {
    private static final int SIDE = 768;
    private static final String DUMMY =
            "https://example.invalid/cubechat/pair/DEMO-ONLY-"
            + "ABC123ABC123ABC123ABC123";

    private static boolean[][] encode() throws Exception {
        Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
        hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.H);
        hints.put(EncodeHintType.MARGIN, 4);
        BitMatrix matrix = new QRCodeWriter().encode(
                DUMMY, BarcodeFormat.QR_CODE, 1, 1, hints);
        int n = matrix.getWidth();
        assertEquals(n, matrix.getHeight());
        assertTrue("Each module must remain camera-readable",
                SIDE >= n * QrLuminanceOverlay.MIN_PIXELS_PER_MODULE);
        boolean[][] modules = new boolean[n][n];
        for (int y = 0; y < n; y++)
            for (int x = 0; x < n; x++)
                modules[y][x] = matrix.get(x, y);
        return modules;
    }

    private static int[] artwork(boolean textured) {
        int[] out = new int[SIDE * SIDE];
        for (int y = 0; y < SIDE; y++) {
            for (int x = 0; x < SIDE; x++) {
                int r = textured ? 80 + (x * 89 / SIDE) : 140;
                int g = textured ? 70 + (y * 110 / SIDE) : 132;
                int b = textured ? 110 + ((x + y) * 75 / (2 * SIDE)) : 155;
                out[y * SIDE + x] = 0xff000000 | (r << 16) | (g << 8) | b;
            }
        }
        return out;
    }

    private static String scan(int[] argb) throws Exception {
        RGBLuminanceSource pixels = new RGBLuminanceSource(SIDE, SIDE, argb);
        BinaryBitmap binary = new BinaryBitmap(new HybridBinarizer(pixels));
        return new QRCodeReader().decode(binary).getText();
    }

    @Test public void scanFromPlainImage() throws Exception {
        int[] background = artwork(false);
        int[] overlay = QrLuminanceOverlay.modulate(
                background, SIDE, SIDE, encode(), 0, 0, SIDE, 0.78f);
        assertEquals("ZXing must recover the unchanged pairing payload", DUMMY, scan(overlay));
        assertFalse("Original image must not be overwritten",
                background[0] == overlay[0]);
    }

    @Test public void scanFromGradientImage() throws Exception {
        int[] overlay = QrLuminanceOverlay.modulate(
                artwork(true), SIDE, SIDE, encode(), 0, 0, SIDE, 0.78f);
        assertEquals("Gradient image must decode at intended default strength",
                DUMMY, scan(overlay));
    }
}
