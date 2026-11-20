package org.cubechat.android;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import org.junit.Test;

/**
 * Pure-Java ZXing artwork tests. Only a public, deliberately invalid dummy
 * pairing URL is used; no real invite, phone, radio, or network operation.
 */
public final class QrArtworkRenderTest {
    private static final String DUMMY =
            "https://example.invalid/cubechat/pair/EXAMPLE-ONLY-"
            + "ABCDEFGHIJKL1234567890ABCDEFGHIJKL1234567890";

    private static int[] pixels(int w, int h) {
        int[] image = new int[w * h];
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                int r = 68 + x * 90 / w;
                int g = 82 + y * 105 / h;
                int b = 130 + x * 50 / w;
                image[y * w + x] = 0xff000000 | (r << 16) | (g << 8) | b;
            }
        }
        return image;
    }

    @Test public void choosesQrWithQuietZoneAndExactPayload() throws Exception {
        boolean[][] modules = QrArtworkRender.modules(DUMMY);
        assertTrue("QR matrix must include quiet zone", modules.length >= 29);
        for (int x = 0; x < modules.length; x++) {
            for (int y = 0; y < 4; y++) {
                assertFalse(modules[y][x]);
                assertFalse(modules[modules.length - 1 - y][x]);
                assertFalse(modules[x][y]);
                assertFalse(modules[x][modules.length - 1 - y]);
            }
        }
        int[] image = pixels(960, 960);
        int[] snapshot = image.clone();
        QrArtworkRender.Result result = QrArtworkRender.render(
                image, 960, 960, modules, DUMMY, 0.85f);
        assertTrue("The composed image must decode its unchanged invite", result.scannerVerified);
        assertTrue(QrArtworkRender.verifies(result.pixels, 960, 960, DUMMY));
        assertFalse("Modified payload must not validate against original",
                QrArtworkRender.verifies(result.pixels, 960, 960, DUMMY + "changed"));
        assertArrayEquals("Original photograph untouched", snapshot, image);
        assertEquals(0, result.placement.side % modules.length);
    }

    @Test public void opaqueArtworkAlsoScansInLandscape() throws Exception {
        QrArtworkRender.Result result = QrArtworkRender.render(
                pixels(1200, 960), 1200, 960, QrArtworkRender.modules(DUMMY), DUMMY, 1f);
        assertTrue(result.scannerVerified);
        assertEquals(result.placement.left, (1200 - result.placement.side) / 2);
        assertEquals(result.placement.top, (960 - result.placement.side) / 2);
    }

    @Test public void unsafeSizeAndMismatchedPayloadAreRejected() throws Exception {
        boolean[][] qr = QrArtworkRender.modules(DUMMY);
        try {
            QrArtworkRender.render(pixels(100, 100), 100, 100, qr, DUMMY, 0.85f);
            fail("Undersized artwork accepted");
        } catch (IllegalArgumentException expected) {
            assertTrue(expected.getMessage().contains("too small"));
        }
        assertFalse(QrArtworkRender.verifies(new int[0], 0, 0, DUMMY));
        assertFalse(QrArtworkRender.verifies(pixels(960, 960), 960, 960, DUMMY));
        assertFalse(QrArtworkRender.verifies(null, 100, 100, DUMMY));
    }
}
