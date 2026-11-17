package org.cubechat.android;

import android.app.Activity;
import android.app.AlertDialog;
import android.text.Editable;
import android.text.InputType;
import android.text.TextWatcher;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.TextView;
import java.text.DateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.function.IntConsumer;

final class FindMessages {
    static void show(Activity screen, List<PeerLink.Message> messages, IntConsumer selected) {
        LinearLayout content = new LinearLayout(screen);
        content.setOrientation(LinearLayout.VERTICAL);
        int margin = Math.round(16 * screen.getResources().getDisplayMetrics().density);
        content.setPadding(margin, 0, margin, 0);
        EditText field = new EditText(screen);
        field.setSingleLine();
        field.setHint("Search recent messages");
        field.setSaveEnabled(false);
        field.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);
        if (android.os.Build.VERSION.SDK_INT >= 26)
            field.setImeOptions(android.view.inputmethod.EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING |
                    android.view.inputmethod.EditorInfo.IME_ACTION_DONE);
        content.addView(field);
        TextView count = new TextView(screen);
        count.setPadding(0, margin / 2, 0, margin / 2);
        count.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        content.addView(count);
        ListView list = new ListView(screen);
        list.setSaveEnabled(false);
        content.addView(list, new LinearLayout.LayoutParams(-1, -2));
        List<Integer> indices = new ArrayList<>();
        ArrayAdapter<String> results = new ArrayAdapter<>(screen, android.R.layout.simple_list_item_1);
        results.setNotifyOnChange(false);
        list.setAdapter(results);
        DateFormat clock = android.text.format.DateFormat.getTimeFormat(screen);
        Runnable search = () -> {
            indices.clear();
            results.clear();
            String query = field.getText().toString().trim().toLowerCase(Locale.ROOT);
            if (!query.isEmpty()) {
                for (int i = messages.size() - 1; i >= 0; i--) {
                    PeerLink.Message message = messages.get(i);
                    if (!message.text.toLowerCase(Locale.ROOT).contains(query)) continue;
                    String line = message.text.replace('\n', ' ');
                    if (line.length() > 120) line = line.substring(0, 120) + "…";
                    results.add((message.outgoing ? "You" : "Peer") + " · " + clock.format(new Date(message.time)) + "\n" + line);
                    indices.add(i);
                }
            }
            count.setText(query.isEmpty() ? "Search the latest " + messages.size() + " messages in this conversation."
                    : indices.size() + (indices.size() == 1 ? " match" : " matches") + " in the latest " + messages.size() + " messages");
            results.notifyDataSetChanged();
        };
        field.addTextChangedListener(new TextWatcher() {
            public void beforeTextChanged(CharSequence text, int start, int count, int after) {}
            public void afterTextChanged(Editable editable) { search.run(); }
            public void onTextChanged(CharSequence text, int start, int before, int count) {}
        });
        search.run();
        AlertDialog dialog = DisplayPrivacy.dialog(screen).setTitle("Find in conversation").setView(content)
                .setNegativeButton("Close", null).create();
        list.setOnItemClickListener((parent, view, position, id) -> {
            int index = indices.get(position);
            dialog.dismiss();
            selected.accept(index);
        });
        dialog.show();
    }
}
