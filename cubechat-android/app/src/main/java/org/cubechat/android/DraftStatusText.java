package org.cubechat.android;

import java.nio.charset.StandardCharsets;

/**
 * Composer status is a local UI hint, not a remote delivery receipt.
 * Only DraftSaveState.succeeded after a real database callback authorizes
 * "Saved locally" for the currently edited text.
 */
final class DraftStatusText {
    static final int LIMIT_BYTES = 4096;

    static final class Summary {
        final int bytes;
        final boolean visible;
        final boolean sendable;
        final boolean problem;
        final String label;

        Summary(int bytes, boolean visible, boolean sendable, boolean problem, String label) {
            this.bytes = bytes;
            this.visible = visible;
            this.sendable = sendable;
            this.problem = problem;
            this.label = label;
        }
    }

    private DraftStatusText() { }

    /** Includes Unicode space separators without losing trim's C0 handling. */
    private static boolean hasNonWhitespace(String text) {
        for (int i = 0; i < text.length();) {
            int cp = text.codePointAt(i);
            if (cp > 0x20 && !Character.isWhitespace(cp) && !Character.isSpaceChar(cp))
                return true;
            i += Character.charCount(cp);
        }
        return false;
    }

    static Summary describe(String draft, boolean contactSelected,
                            boolean saving, boolean failed, boolean dirty) {
        String text = draft == null ? "" : draft;
        int bytes = text.getBytes(StandardCharsets.UTF_8).length;
        boolean over = bytes > LIMIT_BYTES;
        boolean visible = contactSelected && (!text.isEmpty() || saving || failed || dirty);
        boolean sendable = contactSelected && !over && hasNonWhitespace(text);
        String suffix = over ? " · Message too long"
                : failed ? " · Draft not saved · Retry in Draft ⋮"
                : saving ? " · Saving locally…"
                : dirty ? " · Unsaved changes"
                : text.isEmpty() ? "" : " · Saved locally";
        return new Summary(bytes, visible, sendable, over || failed,
                bytes + " / " + LIMIT_BYTES + " bytes" + suffix);
    }
}
