package io.github.mrcalzon02.superpositionreader;

import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;
import java.io.File;
import java.nio.charset.StandardCharsets;
import static org.junit.Assert.*;

public class NarrationCacheTest {
    @Rule public TemporaryFolder tmp=new TemporaryFolder();

    @Test public void cacheSeparatesEnginesVoicesAndRatesForSameOriginalBook() throws Exception {
        BookDocument book=BookDocument.fromBytes("example.txt",
                "The first chapter begins. The second passage follows."
                .getBytes(StandardCharsets.UTF_8));
        NarrationCache cache=new NarrationCache(tmp.getRoot());
        File rjs=cache.folder(book,"com.google.android.tts","en-gb-x-rjs-local",1f);
        File gba=cache.folder(book,"com.google.android.tts","en-gb-x-gba-local",1f);
        File fast=cache.folder(book,"com.google.android.tts","en-gb-x-rjs-local",1.25f);
        File other=cache.folder(book,"other.tts.engine","en-gb-x-rjs-local",1f);
        assertNotEquals(rjs,gba);
        assertNotEquals(rjs,fast);
        assertNotEquals(rjs,other);
        assertEquals(rjs,cache.folder(book,"com.google.android.tts","en-gb-x-rjs-local",1f));
        assertFalse(NarrationCache.completed(rjs,book.chapters.get(0)));
        assertTrue(NarrationCache.segment(rjs,0).getName().endsWith(".wav"));
        assertEquals(16,book.id.length());
    }
}
