package io.calzon.networkinvestigator;

import java.util.Map;

final class JsonUtil {
    private JsonUtil() {}

    static String quote(String value) {
        if (value == null) return "null";
        StringBuilder out = new StringBuilder(value.length() + 16).append('"');
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            switch (c) {
                case '\\' -> out.append("\\\\");
                case '"' -> out.append("\\\"");
                case '\n' -> out.append("\\n");
                case '\r' -> out.append("\\r");
                case '\t' -> out.append("\\t");
                default -> {
                    if (c < 0x20) out.append(String.format("\\u%04x", (int)c));
                    else out.append(c);
                }
            }
        }
        return out.append('"').toString();
    }

    static String event(EventRecord event) {
        StringBuilder out = new StringBuilder(256);
        out.append('{')
                .append("\"timestamp\":").append(quote(event.timestamp().toString())).append(',')
                .append("\"monotonicNanos\":").append(event.monotonicNanos()).append(',')
                .append("\"type\":").append(quote(event.type())).append(',')
                .append("\"fields\":").append(map(event.fields()))
                .append('}');
        return out.toString();
    }

    static String map(Map<String, String> values) {
        StringBuilder out = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, String> entry : values.entrySet()) {
            if (!first) out.append(',');
            first = false;
            out.append(quote(entry.getKey())).append(':').append(quote(entry.getValue()));
        }
        return out.append('}').toString();
    }
}
