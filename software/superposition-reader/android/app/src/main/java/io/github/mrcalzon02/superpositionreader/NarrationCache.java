package io.github.mrcalzon02.superpositionreader;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Only generated audio is cached, never third-party voice-model weights. */
public final class NarrationCache {
    private final File root;
    public NarrationCache(File appFiles) {
        root=new File(appFiles,"narration");
    }
    public File folder(BookDocument book,String engine,String voice,float rate) throws Exception {
        String fingerprint=book.id+"\n"+engine+"\n"+voice+"\n"+rate;
        byte[] bytes=MessageDigest.getInstance("SHA-256").digest(
                fingerprint.getBytes(StandardCharsets.UTF_8));
        StringBuilder hex=new StringBuilder();
        for(int i=0;i<12;i++)hex.append(String.format(Locale.ROOT,"%02x",bytes[i]&255));
        File target=new File(new File(root,book.id),hex.toString());
        if(!target.isDirectory()&&!target.mkdirs())
            throw new IllegalStateException("Cannot create private narration cache");
        return target;
    }
    public static File segment(File folder,int index) {
        return new File(folder,String.format(Locale.ROOT,"%06d.wav",index));
    }
    public static List<File> chapterFiles(File folder,BookDocument.Chapter chapter) {
        ArrayList<File> files=new ArrayList<>();
        for(int i=chapter.start;i<chapter.end;i++)files.add(segment(folder,i));
        return files;
    }
    public static boolean completed(File folder,BookDocument.Chapter chapter){
        for(File f:chapterFiles(folder,chapter))
            if(!WavAssembler.isValid(f))return false;
        return true;
    }
}
