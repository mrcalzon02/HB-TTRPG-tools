package org.cubechat.android;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.ReaderException;
import com.google.zxing.RGBLuminanceSource;
import com.google.zxing.WriterException;
import com.google.zxing.EncodeHintType;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.common.HybridBinarizer;
import com.google.zxing.qrcode.QRCodeReader;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;

import java.util.EnumMap;
import java.util.Map;

/**
 * Creates QR modules and independently round-trips a composited image through
 * CubeChat's existing ZXing reader. No pairing keys are persisted or logged.
 *
 * Decoder success only proves this exact image is readable in memory; it does
 * NOT guarantee camera/print/compressed-copy reliability or conceal the code.
 */
final class QrArtworkRender {
    static final class Result {
        final int[] pixels;
        final QrArtworkGeometry.Placement placement;
        final boolean scannerVerified;

        Result(int[] pixels, QrArtworkGeometry.Placement placement, boolean scannerVerified) {
            this.pixels = pixels;
            this.placement = placement;
            this.scannerVerified = scannerVerified;
        }
    }

    private QrArtworkRender() { }

    static boolean[][] modules(String invite) throws WriterException {
        if (invite == null || invite.isEmpty())
            throw new IllegalArgumentException("Invite is empty");
        WriterException last = null;
        for (ErrorCorrectionLevel correction :
                new ErrorCorrectionLevel[] {ErrorCorrectionLevel.H,
                        ErrorCorrectionLevel.Q, ErrorCorrectionLevel.M}) {
            Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
            hints.put(EncodeHintType.ERROR_CORRECTION, correction);
            hints.put(EncodeHintType.MARGIN, QrLuminanceOverlay.REQUIRED_QUIET_MODULES);
            try {
                BitMatrix bits = new QRCodeWriter().encode(
                        invite, BarcodeFormat.QR_CODE, 1, 1, hints);
                int n = bits.getWidth();
                if (n > 185) continue;
                boolean[][] grid = new boolean[n][n];
                for (int y = 0; y < n; y++)
                    for (int x = 0; x < n; x++)
                        grid[y][x] = bits.get(x, y);
                return grid;
            } catch (WriterException tooLong) {
                last = tooLong;
            }
        }
        throw new WriterException("This invite is too large for an artwork QR");
    }

    static Result render(int[] picture, int width, int height, boolean[][] qr,
                         String expectedInvite, float strength) {
        QrArtworkGeometry.Placement placement =
                QrArtworkGeometry.centered(width, height, qr.length);
        int[] blended = QrLuminanceOverlay.modulate(picture, width, height, qr,
                placement.left, placement.top, placement.side, strength);
        return new Result(blended, placement, verifies(blended, width, height, expectedInvite));
    }

    static boolean verifies(int[] image, int width, int height, String expectedInvite) {
        if (expectedInvite == null || expectedInvite.isEmpty()
                || image == null || width < 1 || height < 1
                || (long) width * height != image.length) return false;
        try {
            BinaryBitmap binary = new BinaryBitmap(new HybridBinarizer(
                    new RGBLuminanceSource(width, height, image)));
            return expectedInvite.equals(new QRCodeReader().decode(binary).getText());
        } catch (ReaderException | IllegalArgumentException invalid) {
            return false;
        }
    }
}
