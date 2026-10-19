package org.beckenburg;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

/** Convert the curated CC0 Kenney GLBs into embedded-texture Java renderer assets.
 * The source ZIP is retained; the shipped application receives only used meshes.
 */
public final class KenneyMedievalAssets {
    private KenneyMedievalAssets(){}
    public static final List<String> NAMES=List.of(
        "wall-fortified", "wall-fortified-window", "wall-fortified-gate",
        "wall-pane-wood-window", "tower", "tower-top", "tower-base",
        "battlement", "battlement-corner-outer", "column", "column-damaged",
        "structure-wall", "stairs-stone", "detail-crate", "detail-barrel"
    );
    public static String resourceName(String name){
        if(!NAMES.contains(name))throw new IllegalArgumentException("Not curated: "+name);
        return "kenney_medieval_"+name.replace('-', '_');
    }
    private static byte[] converted(byte[] glb,ZipFile source)throws IOException {
        ByteBuffer header=ByteBuffer.wrap(glb).order(ByteOrder.LITTLE_ENDIAN);
        if(glb.length<28 || header.getInt(0)!=0x46546c67 || header.getInt(4)!=2
                || header.getInt(8)!=glb.length || header.getInt(16)!=0x4e4f534a)
            throw new IOException("Invalid source GLB");
        int jsonLength=header.getInt(12),binOffset=20+jsonLength;
        if(binOffset+8>glb.length || header.getInt(binOffset+4)!=0x004e4942)
            throw new IOException("Missing GLB binary buffer");
        int binLength=header.getInt(binOffset);
        if(binLength<0 || (long)binOffset+8+binLength>glb.length)
            throw new IOException("Invalid GLB buffer bounds");
        String json=new String(glb,20,jsonLength,StandardCharsets.UTF_8).trim();
        // This source declares unlit shading as required. Our CPU renderer handles that.
        String required="\"extensionsRequired\":[\"KHR_materials_unlit\"],";
        if(!json.contains(required))throw new IOException("Unexpected Kenney GLB extensions");
        json=json.replace(required,"");
        ByteArrayOutputStream data=new ByteArrayOutputStream();
        data.write(glb,binOffset+8,binLength);
        int existingViews=countViews(json);
        StringBuilder appendedViews=new StringBuilder();
        String marker="\"images\":[";
        int section=json.indexOf(marker),stop=section<0?-1:json.indexOf(']',section);
        if(section<0 || stop<0)throw new IOException("Missing source image list");
        String sourceImages=json.substring(section+marker.length(),stop);
        StringBuilder replacement=new StringBuilder();int count=0;
        for(String entry:sourceImages.split("\\},\\{")){
            String cleaned=entry.replace("{","").replace("}","");
            String begin="\"uri\":\"Textures/",mid="\",\"name\":\"";
            int pathAt=cleaned.indexOf(begin),nameAt=cleaned.indexOf(mid);
            if(pathAt<0 || nameAt<0 || !cleaned.endsWith("\""))
                throw new IOException("Unexpected Kenney image declaration");
            String file=cleaned.substring(pathAt+begin.length(),nameAt);
            String name=cleaned.substring(nameAt+mid.length(),cleaned.length()-1);
            if(!file.matches("[A-Za-z0-9]+\\.png") || !name.matches("[A-Za-z0-9]+"))
                throw new IOException("Unexpected Kenney texture path");
            ZipEntry png=source.getEntry("Models/GLB format/Textures/"+file);
            if(png==null || png.getSize()<16 || png.getSize()>1024*1024)
                throw new IOException("Missing licensed texture "+file);
            int offset=data.size();byte[] image=source.getInputStream(png).readAllBytes();
            data.write(image);while(data.size()%4!=0)data.write(0);
            if(appendedViews.length()!=0)appendedViews.append(',');
            appendedViews.append("{\"buffer\":0,\"byteOffset\":").append(offset)
                    .append(",\"byteLength\":").append(image.length).append('}');
            if(count>0)replacement.append(',');
            replacement.append("{\"bufferView\":").append(existingViews+count)
                    .append(",\"mimeType\":\"image/png\",\"name\":\"").append(name).append("\"}");
            count++;
        }
        if(count==0)throw new IOException("No Kenney textures converted");
        json=json.substring(0,section+marker.length())+replacement+json.substring(stop);
        int viewStart=json.indexOf("\"bufferViews\":[");
        int viewEnd=json.indexOf(']',viewStart);
        if(viewStart<0 || viewEnd<0)throw new IOException("Malformed Kenney view array");
        json=json.substring(0,viewEnd)+","+appendedViews+json.substring(viewEnd);
        String bufferMarker="\"buffers\":[{\"byteLength\":";
        int bufferAt=json.indexOf(bufferMarker);
        int bufferEnd=bufferAt<0?-1:json.indexOf("}]",bufferAt);
        if(bufferAt<0 || bufferEnd<0)throw new IOException("Unexpected Kenney buffer layout");
        json=json.substring(0,bufferAt)+bufferMarker+data.size()+json.substring(bufferEnd);
        byte[] j=json.getBytes(StandardCharsets.UTF_8);
        int jsonPadding=(4-j.length%4)%4;byte[] b=data.toByteArray();
        int total=12+8+j.length+jsonPadding+8+b.length;
        ByteBuffer out=ByteBuffer.allocate(total).order(ByteOrder.LITTLE_ENDIAN);
        out.putInt(0x46546c67).putInt(2).putInt(total);
        out.putInt(j.length+jsonPadding).putInt(0x4e4f534a).put(j);
        for(int i=0;i<jsonPadding;i++)out.put((byte)' ');
        out.putInt(b.length).putInt(0x004e4942).put(b);
        return out.array();
    }
    private static int countViews(String json)throws IOException{
        int start=json.indexOf("\"bufferViews\":[");
        int end=json.indexOf(']',start);
        if(start<0 || end<0)throw new IOException("Missing source views");
        String value=json.substring(start+15,end);
        return value.isBlank()?0:(int)value.chars().filter(c->c=='{').count();
    }
    public static void extract(Path archive,Path destination)throws IOException {
        Files.createDirectories(destination);
        try(ZipFile zip=new ZipFile(archive.toFile())){
            ZipEntry license=zip.getEntry("License.txt");
            if(license==null || !new String(zip.getInputStream(license).readAllBytes(),
                    StandardCharsets.UTF_8).contains("Creative Commons Zero, CC0"))
                throw new IOException("Kenney archive missing verified CC0 license");
            for(String name:NAMES){
                ZipEntry entry=zip.getEntry("Models/GLB format/"+name+".glb");
                if(entry==null || entry.isDirectory() || entry.getSize()<20 || entry.getSize()>4_000_000)
                    throw new IOException("Missing or oversized curated GLB: "+name);
                byte[] bytes=zip.getInputStream(entry).readAllBytes();
                if(bytes.length!=entry.getSize() || bytes.length<20 || bytes[0]!='g'
                    || bytes[1]!='l' || bytes[2]!='T' || bytes[3]!='F')
                    throw new IOException("Invalid GLB content: "+name);
                Files.write(destination.resolve(resourceName(name)+".glb"),converted(bytes,zip));
            }
        }
    }
    public static void main(String[] args)throws Exception {
        if(args.length!=2)throw new IllegalArgumentException("archive destination");
        extract(Path.of(args[0]),Path.of(args[1]));
        System.out.println("Prepared "+NAMES.size()+" CC0 medieval castle meshes");
    }
}
