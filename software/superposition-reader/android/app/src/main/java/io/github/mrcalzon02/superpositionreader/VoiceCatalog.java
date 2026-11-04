package io.github.mrcalzon02.superpositionreader;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/** Only labels are built in. Actual voice objects always come from Android's TTS engine. */
public final class VoiceCatalog {
    private static final Map<String, String> NAMES;
    static {
        LinkedHashMap<String, String> names = new LinkedHashMap<>();
        names.put("en-gb-x-rjs-local", "RJS");
        names.put("en-gb-x-gba-local", "GBA");
        names.put("en-gb-x-gbb-local", "GBB");
        names.put("en-gb-x-gbc-local", "GBC");
        names.put("en-gb-x-gbd-local", "GBD");
        names.put("en-gb-x-gbg-local", "GBG");
        NAMES = Collections.unmodifiableMap(names);
    }
    private VoiceCatalog() {}
    public static Map<String, String> expectedBritishVoices() { return NAMES; }
    public static String label(String name) {
        if (name == null) return "";
        String match = NAMES.get(name.toLowerCase(Locale.ROOT));
        return match == null ? name : match + " · " + name;
    }
    public static boolean isBritish(String language, String country) {
        return "en".equalsIgnoreCase(language) && "GB".equalsIgnoreCase(country);
    }
}
