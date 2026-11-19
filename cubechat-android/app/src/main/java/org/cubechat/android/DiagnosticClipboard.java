package org.cubechat.android;

import android.content.ClipData;
import android.content.ClipDescription;
import android.content.ClipboardManager;
import android.content.Context;
import android.os.PersistableBundle;

/**
 * Clipboard UI convenience only. EXTRA_IS_SENSITIVE hides visual previews on
 * compatible Android versions; it does NOT prevent other apps from reading
 * clipboard text. Call only from an explicit user-selected copy action.
 */
final class DiagnosticClipboard {
    private DiagnosticClipboard() { }

    static boolean copy(Context context, String label, String text) {
        ClipboardManager clipboard =
                (ClipboardManager) context.getSystemService(Context.CLIPBOARD_SERVICE);
        if (clipboard == null) return false;
        ClipData data = ClipData.newPlainText(label, text);
        PersistableBundle flags = new PersistableBundle();
        flags.putBoolean(ClipDescription.EXTRA_IS_SENSITIVE, true);
        data.getDescription().setExtras(flags);
        clipboard.setPrimaryClip(data);
        return true;
    }
}
