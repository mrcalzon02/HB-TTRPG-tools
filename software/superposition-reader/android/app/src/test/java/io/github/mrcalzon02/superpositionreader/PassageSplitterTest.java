package io.github.mrcalzon02.superpositionreader;

import org.junit.Test;
import java.util.List;
import static org.junit.Assert.*;

public class PassageSplitterTest {
    @Test public void longUnpunctuatedTextIsNotLost() {
        String source = "word ".repeat(300).trim();
        List<String> chunks = PassageSplitter.split(source, 220);
        assertTrue(chunks.size() >= 6);
        for (String s : chunks) assertTrue(s.length() <= 220);
        assertEquals(source, String.join(" ", chunks));
    }
    @Test public void paragraphAndSentenceBreaksPreserveContent() {
        String input = "A sentence. A second one!\n\nA separate chapter.";
        List<String> chunks = PassageSplitter.split(input, 100);
        assertEquals(2, chunks.size());
        assertEquals("A sentence. A second one!", chunks.get(0));
        assertEquals("A separate chapter.", chunks.get(1));
    }
}
