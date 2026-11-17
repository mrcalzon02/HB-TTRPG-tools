import java.awt.image.BufferedImage;
import java.util.Map;
import javax.imageio.ImageIO;

import com.google.zxing.Binarizer;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.DecodeHintType;
import com.google.zxing.LuminanceSource;
import com.google.zxing.ReaderException;
import com.google.zxing.RGBLuminanceSource;
import com.google.zxing.Result;
import com.google.zxing.common.GlobalHistogramBinarizer;
import com.google.zxing.common.HybridBinarizer;
import com.google.zxing.qrcode.QRCodeReader;

/** Read an actual rendered invitation, keeping the invite out of diagnostics. */
public final class CubeChatQrReader {
    private static Result decode(LuminanceSource source) {
        Binarizer[] binarizers = {new HybridBinarizer(source), new GlobalHistogramBinarizer(source)};
        for (Binarizer binarizer : binarizers) {
            BinaryBitmap image = new BinaryBitmap(binarizer);
            for (DecodeHintType hint : new DecodeHintType[]{DecodeHintType.TRY_HARDER, DecodeHintType.PURE_BARCODE}) {
                try {
                    return new QRCodeReader().decode(image, Map.of(hint, true));
                } catch (ReaderException ignored) {
                    // The displayed image may need the alternative sampler.
                }
            }
        }
        return null;
    }

    public static void main(String[] bounds) throws Exception {
        BufferedImage screen = ImageIO.read(System.in);
        int x = Integer.parseInt(bounds[0]);
        int y = Integer.parseInt(bounds[1]);
        int width = Integer.parseInt(bounds[2]) - x;
        int height = Integer.parseInt(bounds[3]) - y;
        int[] pixels = screen.getRGB(x, y, width, height, null, 0, width);
        LuminanceSource view = new RGBLuminanceSource(width, height, pixels);
        Result result = decode(view);
        if (result == null && width != height) {
            // Android uses FIT_CENTER in a rectangular ImageView for its square QR.
            int side = Math.min(width, height);
            result = decode(view.crop((width - side) / 2, (height - side) / 2, side, side));
        }
        if (result != null) {
            System.out.print(result.getText());
            return;
        }
        int min = 255, max = 0, dark = 0;
        for (byte value : view.getMatrix()) {
            int gray = value & 255;
            min = Math.min(min, gray);
            max = Math.max(max, gray);
            if (gray < 128) dark++;
        }
        System.err.printf("QR_STATS min=%d max=%d dark=%d total=%d%n", min, max, dark, pixels.length);
        System.exit(2);
    }
}
