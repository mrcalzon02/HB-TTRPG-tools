package org.cubechat.android;

import android.app.Activity;
import android.app.AlertDialog;
import android.text.Editable;
import android.text.InputFilter;
import android.text.InputType;
import android.text.TextWatcher;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.widget.ArrayAdapter;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.TextView;

import java.text.DateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.function.IntConsumer;

/** Searches only the already-decrypted, in-memory conversation snapshot. */
final class FindMessages {
    private FindMessages() { }

    static void show(Activity screen, List<PeerLink.Message> messages, IntConsumer selected) {
        LinearLayout content = new LinearLayout(screen);
        content.setOrientation(LinearLayout.VERTICAL);
        float density = screen.getResources().getDisplayMetrics().density;
        int margin = Math.round(16 * density);
        content.setPadding(margin, 0, margin, 0);

        EditText field = new EditText(screen);
        field.setSingleLine(true);
        field.setHint("Find a word or phrase");
        field.setContentDescription("Find a word or phrase in this conversation");
        field.setSaveEnabled(false);
        field.setFilters(new InputFilter[] { new InputFilter.LengthFilter(256) });
        field.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);
        int action = EditorInfo.IME_ACTION_SEARCH;
        if (android.os.Build.VERSION.SDK_INT >= 26)
            action |= EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING;
        field.setImeOptions(action);
        content.addView(field);

        RadioGroup filters = new RadioGroup(screen);
        filters.setOrientation(RadioGroup.HORIZONTAL);
        RadioButton all = filter(screen, "All");
        RadioButton you = filter(screen, "You");
        RadioButton peer = filter(screen, "Peer");
        filters.addView(all);
        filters.addView(you);
        filters.addView(peer);
        filters.check(all.getId());
        content.addView(filters);

        TextView count = new TextView(screen);
        count.setPadding(0, margin / 2, 0, margin / 2);
        count.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        content.addView(count);

        ListView list = new ListView(screen);
        list.setSaveEnabled(false);
        list.setContentDescription("Matching messages, newest first");
        // Keep the modal usable on small phones without rendering one giant
        // scrolling column if every message matches.
        int maxHeight = Math.min(Math.round(340 * density),
                screen.getResources().getDisplayMetrics().heightPixels / 2);
        content.addView(list, new LinearLayout.LayoutParams(-1, maxHeight));

        List<MessageSearch.Entry> searchable = new ArrayList<>(messages.size());
        for (PeerLink.Message message : messages)
            searchable.add(new MessageSearch.Entry(message.text, message.outgoing));
        List<Integer> indices = new ArrayList<>();
        ArrayAdapter<String> results =
                new ArrayAdapter<>(screen, android.R.layout.simple_list_item_1);
        results.setNotifyOnChange(false);
        list.setAdapter(results);
        DateFormat clock = android.text.format.DateFormat.getTimeFormat(screen);
        final MessageSearch.Sender[] sender = { MessageSearch.Sender.ALL };

        Runnable search = () -> {
            String query = field.getText().toString();
            MessageSearch.Result found = MessageSearch.find(searchable, query, sender[0]);
            indices.clear();
            results.clear();
            for (MessageSearch.Hit hit : found.shown) {
                PeerLink.Message original = messages.get(hit.index);
                String preview = (original.outgoing ? "You" : "Peer") + " · "
                        + clock.format(new Date(original.time)) + "\n" + hit.excerpt;
                indices.add(hit.index);
                results.add(preview);
            }
            if (query.trim().isEmpty()) {
                count.setText("Search the latest " + found.inspected
                        + " messages in this conversation.");
            } else if (found.matches > found.shown.size()) {
                count.setText(found.matches + " matches · showing newest "
                        + found.shown.size() + ". Add more text to narrow results.");
            } else {
                count.setText(found.matches + (found.matches == 1 ? " match" : " matches")
                        + " in the latest " + found.inspected + " messages");
            }
            results.notifyDataSetChanged();
        };

        filters.setOnCheckedChangeListener((group, id) -> {
            sender[0] = id == you.getId() ? MessageSearch.Sender.YOU
                    : id == peer.getId() ? MessageSearch.Sender.PEER
                    : MessageSearch.Sender.ALL;
            search.run();
        });
        field.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence text, int start, int count, int after) { }
            @Override public void afterTextChanged(Editable editable) { search.run(); }
            @Override public void onTextChanged(CharSequence text, int start, int before, int count) { }
        });
        search.run();

        AlertDialog dialog = DisplayPrivacy.dialog(screen)
                .setTitle("Find in conversation").setView(content)
                .setNegativeButton("Close", null).create();
        list.setOnItemClickListener((parent, view, position, id) -> {
            if (position < 0 || position >= indices.size()) return;
            int index = indices.get(position);
            dialog.dismiss();
            selected.accept(index);
        });
        dialog.setOnDismissListener(d -> {
            // Search text is never persisted. Clear query and view contents
            // when the dialog closes, especially on a shared device.
            field.setText("");
            indices.clear();
            results.clear();
        });
        dialog.show();
    }

    private static RadioButton filter(Activity screen, String title) {
        RadioButton button = new RadioButton(screen);
        button.setId(View.generateViewId());
        button.setText(title);
        button.setTextSize(15);
        button.setPadding(0, 0, Math.round(10 *
                screen.getResources().getDisplayMetrics().density), 0);
        return button;
    }
}
