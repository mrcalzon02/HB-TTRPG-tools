package io.github.mrcalzon02.superpositionreader;

import java.util.ArrayList;
import java.util.List;

/** Keeps all words and punctuation while respecting TTS's short-input limits. */
public final class PassageSplitter {
    private PassageSplitter() {}

    public static List<String> split(String input, int maxChars) {
        if (maxChars < 80) throw new IllegalArgumentException("Passage size too small");
        ArrayList<String> out = new ArrayList<>();
        if (input == null || input.trim().isEmpty()) return out;
        String normalized = input.replace("\r\n", "\n").replace('\r', '\n')
                .replaceAll("[ \t]+", " ");
        String[] paragraphs = normalized.split("\\n\\s*\\n");
        for (String paragraph : paragraphs) {
            paragraph = paragraph.replaceAll("\\s+", " ").trim();
            if (paragraph.isEmpty()) continue;
            String[] sentences = paragraph.split("(?<=[.!?])\\s+");
            StringBuilder buffer = new StringBuilder();
            for (String sentence : sentences) {
                sentence = sentence.trim();
                if (sentence.isEmpty()) continue;
                while (sentence.length() > maxChars) {
                    if (buffer.length() > 0) {
                        out.add(buffer.toString());
                        buffer.setLength(0);
                    }
                    int cut = sentence.lastIndexOf(' ', maxChars);
                    if (cut < maxChars / 3) cut = maxChars;
                    out.add(sentence.substring(0, cut).trim());
                    sentence = sentence.substring(cut).trim();
                }
                if (sentence.isEmpty()) continue;
                if (buffer.length() > 0 && buffer.length() + 1 + sentence.length() > maxChars) {
                    out.add(buffer.toString());
                    buffer.setLength(0);
                }
                if (buffer.length() > 0) buffer.append(' ');
                buffer.append(sentence);
            }
            if (buffer.length() > 0) out.add(buffer.toString());
        }
        return out;
    }
}
