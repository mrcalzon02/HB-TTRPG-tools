package org.cubechat.android;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.view.KeyEvent;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputConnection;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.ScrollView;
import android.widget.TextView;

final class ChatPreferences {
    private static final int[] SIZES = {15, 17, 20, 24};
    private static final String[] NAMES = {"Compact", "Standard", "Large", "Extra large"};
    private static final int STANDARD = 1;
    private final SharedPreferences prefs;
    private int size;
    private boolean enterSends, privateKeyboard;

    // Android adds NO_ENTER_ACTION to multiline fields even when a user asks for Send.
    // Only change the keyboard action; pasted text and hardware Shift+Enter stay multiline.
    static final class Composer extends EditText {
        Composer(Context context) { super(context); }

        @Override public InputConnection onCreateInputConnection(EditorInfo info) {
            InputConnection connection = super.onCreateInputConnection(info);
            if ((getImeOptions() & EditorInfo.IME_MASK_ACTION) == EditorInfo.IME_ACTION_SEND)
                info.imeOptions &= ~EditorInfo.IME_FLAG_NO_ENTER_ACTION;
            return connection;
        }
    }

    ChatPreferences(Context context) {
        prefs = context.getSharedPreferences("cubechat-composer", Context.MODE_PRIVATE);
        size = prefs.getInt("size", STANDARD);
        if (size < 0 || size >= SIZES.length) size = STANDARD;
        enterSends = prefs.getBoolean("enter-sends", false);
        privateKeyboard = prefs.getBoolean("private-keyboard", true);
    }

    int textSize() { return SIZES[size]; }
    int captionSize() { return Math.max(12, textSize() - 5); }

    void apply(EditText draft, Runnable send) {
        draft.setTextSize(textSize());
        int options = EditorInfo.IME_FLAG_NO_EXTRACT_UI;
        if (privateKeyboard) options |= EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING;
        if (enterSends) options |= EditorInfo.IME_ACTION_SEND;
        draft.setImeOptions(options);
        draft.setOnEditorActionListener((v, action, event) -> {
            if (!enterSends || action != EditorInfo.IME_ACTION_SEND || event != null) return false;
            send.run();
            return true;
        });
        draft.setOnKeyListener((v, code, event) -> {
            if (!enterSends || (code != KeyEvent.KEYCODE_ENTER && code != KeyEvent.KEYCODE_NUMPAD_ENTER)
                    || !event.hasNoModifiers()) return false;
            if (event.getAction() == KeyEvent.ACTION_DOWN && event.getRepeatCount() == 0) send.run();
            return true;
        });
    }

    void show(Activity screen, Runnable changed) {
        int pad = Math.round(18 * screen.getResources().getDisplayMetrics().density);
        LinearLayout content = new LinearLayout(screen);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(pad, pad, pad, pad);
        TextView label = new TextView(screen);
        label.setText("Message and composer text size");
        label.setTextSize(16);
        content.addView(label);
        RadioGroup sizes = new RadioGroup(screen);
        RadioButton[] choices = new RadioButton[SIZES.length];
        for (int i = 0; i < SIZES.length; i++) {
            RadioButton item = new RadioButton(screen);
            item.setId(android.view.View.generateViewId());
            item.setText(NAMES[i]);
            item.setTextSize(SIZES[i]);
            choices[i] = item;
            sizes.addView(item);
        }
        sizes.check(choices[size].getId());
        content.addView(sizes);
        CheckBox enter = new CheckBox(screen);
        enter.setText("Enter sends a message");
        enter.setChecked(enterSends);
        content.addView(enter);
        CheckBox keyboard = new CheckBox(screen);
        keyboard.setText("Ask keyboard not to learn chat text");
        keyboard.setChecked(privateKeyboard);
        content.addView(keyboard);
        ScrollView scroll = new ScrollView(screen);
        scroll.addView(content);
        DisplayPrivacy.dialog(screen).setTitle("Chat preferences").setView(scroll)
                .setNegativeButton("Cancel", null)
                .setNeutralButton("Use defaults", (d, w) -> save(STANDARD, false, true, changed))
                .setPositiveButton("Save", (d, w) -> {
                    int selected = sizes.indexOfChild(sizes.findViewById(sizes.getCheckedRadioButtonId()));
                    if (selected >= 0) save(selected, enter.isChecked(), keyboard.isChecked(), changed);
                }).show();
    }

    private void save(int index, boolean enter, boolean keyboard, Runnable changed) {
        size = index;
        enterSends = enter;
        privateKeyboard = keyboard;
        prefs.edit().putInt("size", size).putBoolean("enter-sends", enterSends)
                .putBoolean("private-keyboard", privateKeyboard).apply();
        changed.run();
    }
}
