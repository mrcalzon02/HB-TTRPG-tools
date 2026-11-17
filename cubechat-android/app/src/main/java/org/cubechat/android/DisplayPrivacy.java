package org.cubechat.android;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.view.WindowManager;

final class DisplayPrivacy {
    private static final String KEY = "hide-screen-captures";

    private static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences("cubechat-display", Context.MODE_PRIVATE);
    }

    static void apply(Activity screen) {
        boolean enabled = preferences(screen).getBoolean(KEY, false);
        if (enabled) screen.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        else screen.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
        if (Build.VERSION.SDK_INT >= 33) screen.setRecentsScreenshotEnabled(!enabled);
    }

    // A dialog has its own window. Apply the same setting before it becomes visible.
    static AlertDialog.Builder dialog(Context context) {
        return new AlertDialog.Builder(context) {
            @Override public AlertDialog create() {
                AlertDialog dialog = super.create();
                if (preferences(context).getBoolean(KEY, false))
                    dialog.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
                return dialog;
            }
        };
    }

    static void choose(Activity screen) {
        boolean enabled = preferences(screen).getBoolean(KEY, false);
        dialog(screen).setTitle("Screen privacy")
                .setMessage((enabled ? "On." : "Off.") + " When on, Android hides CubeChat from screenshots, screen sharing and recent-app previews. You can still show someone your QR in person.")
                .setNegativeButton("Cancel", null)
                .setPositiveButton(enabled ? "Turn off" : "Turn on", (d, w) -> {
                    preferences(screen).edit().putBoolean(KEY, !enabled).apply();
                    apply(screen);
                }).show();
    }
}
