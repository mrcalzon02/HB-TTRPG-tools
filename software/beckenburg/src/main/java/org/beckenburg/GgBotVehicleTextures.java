package org.beckenburg;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import javax.imageio.ImageIO;

/**
 * Rebuild the imported CC0 GGBot GLBs with GGBot's actual original 128x128
 * colour atlases (rather than the 2x2 solid-grey placeholders).
 *
 * This uses the exact August 2023 official OpenGameArt rehost or the same
 * owner-supplied archive. SHA pin prevents surprise changes. Neither texture
 * downloads nor image decoding happen during gameplay.
 */
public final class GgBotVehicleTextures {
    private GgBotVehicleTextures(){}
    public static final String SOURCE_URL=
        "https://opengameart.org/sites/default/files/psx_style_cars_by_ggbot_august2023.zip";
    public static final String SHA256=
        "DB67B0B0FBAA02454A5D000DC9EC1CC53F360E8F41AB44F3FB1C7E8F71E699E4";
    public record Vehicle(String resource,String directory,String preferred){}
    public static final List<Vehicle> VEHICLES=List.of(
        new Vehicle("ggbot_car01","Car 01/","car_blue.png"),
        new Vehicle("ggbot_car07","Car 07/","car_red.png"),
        new Vehicle("ggbot_car08_van_shell","Car 08/","Car8_grey.png")
    );
    private static byte[] image(ZipFile zip,Vehicle vehicle)throws IOException{
        ZipEntry desired=null,fallback=null;
        for(java.util.Enumeration<? extends ZipEntry> e=zip.entries();e.hasMoreElements();){
            ZipEntry entry=e.nextElement();
            String path=entry.getName();
            if(entry.isDirectory()||!path.startsWith(vehicle.directory())||
                !path.toLowerCase(Locale.ROOT).endsWith(".png"))continue;
            if(path.equalsIgnoreCase(vehicle.directory()+vehicle.preferred()))
                desired=entry;
            if(fallback==null &&
                !path.toLowerCase(Locale.ROOT).contains("snow"))fallback=entry;
        }
        ZipEntry selected=desired!=null?desired:fallback;
        if(selected==null||selected.getSize()>256_000||selected.getSize()<100)
            throw new IOException("GGBot colour atlas absent: "+vehicle.directory());
        byte[] png=zip.getInputStream(selected).readAllBytes();
        BufferedImage decoded=ImageIO.read(new java.io.ByteArrayInputStream(png));
        if(decoded==null||decoded.getWidth()!=128||decoded.getHeight()!=128)
            throw new IOException("GGBot texture must be original 128x128 atlas: "+selected);
        System.out.println("GGBOT ORIGINAL "+vehicle.resource()+" <- "+
            selected.getName()+" ("+png.length+" bytes)");
        return png;
    }
    public static byte[] replaceAtlas(byte[] glb,byte[] png)throws IOException{
        ByteBuffer source=ByteBuffer.wrap(glb).order(ByteOrder.LITTLE_ENDIAN);
        if(glb.length<30||source.getInt(0)!=0x46546c67||source.getInt(4)!=2||
            source.getInt(8)!=glb.length||source.getInt(16)!=0x4e4f534a)
            throw new IOException("Not a valid imported GGBot GLB");
        int jsonLength=source.getInt(12),pos=20+jsonLength;
        if(pos+8>glb.length||source.getInt(pos+4)!=0x004e4942)
            throw new IOException("GGBot GLB missing binary chunk");
        int binLength=source.getInt(pos);
        if(binLength<0||pos+8L+binLength>glb.length)
            throw new IOException("GGBot GLB binary range incorrect");
        String json=new String(glb,20,jsonLength,StandardCharsets.UTF_8).trim();
        String views="\"bufferViews\":[",images="\"images\":[",
            buffers="\"buffers\":[{\"byteLength\":";
        int vStart=json.indexOf(views),vEnd=json.indexOf(']',vStart+views.length());
        int iStart=json.indexOf(images),iEnd=json.indexOf(']',iStart+images.length());
        int bStart=json.indexOf(buffers);
        if(vStart<0||vEnd<0||iStart<0||iEnd<0||bStart<0)
            throw new IOException("Unexpected GLB image/view/buffer format");
        String viewList=json.substring(vStart+views.length(),vEnd);
        int number=(int)viewList.chars().filter(x->x=='{').count();
        String imageList=json.substring(iStart+images.length(),iEnd);
        if(!imageList.matches("\\{\"bufferView\":[0-9]+,\"mimeType\":\"image/png\"\\}"))
            throw new IOException("GGBot importer expected one embedded colour PNG");
        imageList=imageList.replaceFirst("\"bufferView\":[0-9]+",
            "\"bufferView\":"+number);
        json=json.substring(0,iStart+images.length())+imageList+json.substring(iEnd);
        // Append independent 128x128 texture buffer view, preserving the
        // source vehicle's original POSITION and TEXCOORD_0 attributes.
        String newView="{\"buffer\":0,\"byteOffset\":"+binLength+
            ",\"byteLength\":"+png.length+"}";
        vStart=json.indexOf(views);vEnd=json.indexOf(']',vStart+views.length());
        json=json.substring(0,vEnd)+","+newView+json.substring(vEnd);
        ByteArrayOutputStream bin=new ByteArrayOutputStream();
        bin.write(glb,pos+8,binLength);
        bin.write(png);
        while(bin.size()%4!=0)bin.write(0);
        int bAt=json.indexOf(buffers);
        int bEnd=json.indexOf('}',bAt+buffers.length());
        if(bAt<0||bEnd<0)throw new IOException("GGBot GLB buffer length absent");
        json=json.substring(0,bAt)+buffers+bin.size()+json.substring(bEnd);
        // Placeholder models carried a 40% solid-grey tint; keeping it would
        // distort the real blue/red/grey painted original 128px atlas.
        json=json.replaceAll("\"baseColorFactor\":\\[[^]]+\\]",
            "\"baseColorFactor\":[1,1,1,1]");
        byte[] jb=json.getBytes(StandardCharsets.UTF_8),bb=bin.toByteArray();
        int pad=(4-jb.length%4)%4;
        int total=12+8+jb.length+pad+8+bb.length;
        if(total>4_000_000)throw new IOException("Textured GGBot GLB over runtime budget");
        ByteBuffer output=ByteBuffer.allocate(total).order(ByteOrder.LITTLE_ENDIAN);
        output.putInt(0x46546c67).putInt(2).putInt(total);
        output.putInt(jb.length+pad).putInt(0x4e4f534a).put(jb);
        while(pad-->0)output.put((byte)' ');
        output.putInt(bb.length).putInt(0x004e4942).put(bb);
        return output.array();
    }
    public static void convert(Path archive,Path originalModels,Path outputModels)throws Exception{
        byte[] source=Files.readAllBytes(archive);
        if(source.length>5_000_000)throw new IOException("Original GGBot archive over size budget");
        byte[] hash=MessageDigest.getInstance("SHA-256").digest(source);
        if(!SHA256.equals(HexFormat.of().withUpperCase().formatHex(hash)))
            throw new IOException("Unexpected original GGBot asset pack hash");
        Files.createDirectories(outputModels);
        try(ZipFile zip=new ZipFile(archive.toFile())){
            for(Vehicle v:VEHICLES){
                byte[] png=image(zip,v);
                byte[] glb=Files.readAllBytes(originalModels.resolve(v.resource()+".glb"));
                Files.write(outputModels.resolve(v.resource()+".glb"),replaceAtlas(glb,png));
            }
        }
    }
    public static void main(String[] args)throws Exception{
        if(args.length!=3)throw new IllegalArgumentException(
            "archive original-models-directory destination-models-directory");
        convert(Path.of(args[0]),Path.of(args[1]),Path.of(args[2]));
        System.out.println("PASS three GGBot licensed cars carry their real 128x128 PNG atlases");
    }
}
