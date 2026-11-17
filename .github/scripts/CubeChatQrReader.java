import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.RGBLuminanceSource;
import com.google.zxing.common.HybridBinarizer;
import com.google.zxing.qrcode.QRCodeReader;

public final class CubeChatQrReader {
    public static void main(String[] bounds) throws Exception {
        BufferedImage screen = ImageIO.read(System.in);
        int x = Integer.parseInt(bounds[0]);
        int y = Integer.parseInt(bounds[1]);
        int width = Integer.parseInt(bounds[2]) - x;
        int height = Integer.parseInt(bounds[3]) - y;
        int[] pixels = screen.getRGB(x, y, width, height, null, 0, width);
        var source = new RGBLuminanceSource(width, height, pixels);
        var bitmap = new BinaryBitmap(new HybridBinarizer(source));
        System.out.print(new QRCodeReader().decode(bitmap).getText());
    }
}
