import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
class CubeChatBlackFrame {
    public static void main(String[] args) throws Exception {
        BufferedImage image=ImageIO.read(System.in);
        for(int y=image.getHeight()/8;y<image.getHeight()*7/8;y+=2)
            for(int x=image.getWidth()/10;x<image.getWidth()*9/10;x+=2){
                int c=image.getRGB(x,y);
                if(((c>>16)&255)>=20 || ((c>>8)&255)>=20 || (c&255)>=20){System.out.print("visible");return;}
            }
        System.out.print("hidden");
    }
}
