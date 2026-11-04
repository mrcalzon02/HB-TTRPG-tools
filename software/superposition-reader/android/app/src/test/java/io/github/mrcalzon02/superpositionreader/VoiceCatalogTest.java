package io.github.mrcalzon02.superpositionreader;

import org.junit.Test;
import static org.junit.Assert.*;

public class VoiceCatalogTest {
    @Test public void googleVoiceNamesRemainStableAndNeverFabricateAvailability() {
        assertEquals(6, VoiceCatalog.expectedBritishVoices().size());
        assertEquals("RJS · en-gb-x-rjs-local", VoiceCatalog.label("en-gb-x-rjs-local"));
        assertEquals("GBA · en-gb-x-gba-local", VoiceCatalog.label("EN-GB-X-GBA-LOCAL"));
        assertEquals("other-voice", VoiceCatalog.label("other-voice"));
        assertTrue(VoiceCatalog.isBritish("en", "GB"));
        assertFalse(VoiceCatalog.isBritish("en", "US"));
    }
}
