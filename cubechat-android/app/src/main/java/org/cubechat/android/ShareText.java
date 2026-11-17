package org.cubechat.android;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.function.Consumer;

/** User-initiated Android shares enter the selected conversation's editable draft. */
final class ShareText {
    interface Recipient { void selected(long id, String text); }
    private static final int LIMIT = 4096;
    private final String text;
    private final String problem;

    private ShareText(String text, String problem) {
        this.text = text;
        this.problem = problem;
    }

    static ShareText fromIntent(Intent intent) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) return null;
        if (!"text/plain".equalsIgnoreCase(intent.getType()))
            return new ShareText(null, "Share plain text or a link to a CubeChat conversation.");
        try {
            CharSequence value = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
            if (value == null || value.length() == 0)
                return new ShareText(null, "The other app did not include any text.");
            if (value.length() <= LIMIT) {
                String plain = value.toString();
                if (plain.trim().isEmpty()) return new ShareText(null, "The shared text is empty.");
                if (plain.getBytes(StandardCharsets.UTF_8).length <= LIMIT)
                    return new ShareText(plain, null);
            }
            return new ShareText(null, "Choose a shorter selection. A message can contain up to 4,096 UTF-8 bytes.");
        } catch (RuntimeException e) {
            return new ShareText(null, "CubeChat could not read the shared text.");
        }
    }

    AlertDialog choose(Activity activity, List<ChatStore.Contact> contacts, Recipient recipient) {
        AlertDialog.Builder dialog = DisplayPrivacy.dialog(activity).setTitle("Share to CubeChat");
        if (problem != null || contacts.isEmpty()) {
            return dialog.setMessage(problem != null ? problem : "Pair with a contact first, then share the text again.")
                    .setPositiveButton("Close", null).show();
        }
        String[] names = new String[contacts.size()];
        for (int i = 0; i < names.length; i++) names[i] = contacts.get(i).name;
        return dialog.setItems(names, (d, position) -> recipient.selected(contacts.get(position).id, text))
                .setNegativeButton("Cancel", null).show();
    }

    static AlertDialog apply(Activity activity, String existing, String shared, Consumer<String> edit) {
        if (existing.isEmpty() || existing.equals(shared)) {
            edit.accept(shared);
            return null;
        }
        AlertDialog.Builder dialog = DisplayPrivacy.dialog(activity).setTitle("Keep your current draft?")
                .setMessage("Choose what to put in the message box. You can review it before sending.")
                .setNegativeButton("Keep draft", null)
                .setPositiveButton("Replace", (d, w) -> edit.accept(shared));
        String combined = existing + "\n" + shared;
        if (combined.getBytes(StandardCharsets.UTF_8).length <= LIMIT)
            dialog.setNeutralButton("Append", (d, w) -> edit.accept(combined));
        return dialog.show();
    }
}
