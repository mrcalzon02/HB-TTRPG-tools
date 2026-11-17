package org.cubechat.qacapture;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.widget.TextView;

/** Networkless, test-only default browser. Android delivers the unmodified production ACTION_VIEW here. */
public final class BrowserProbe extends Activity {
    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        SharedPreferences received = getSharedPreferences("received", MODE_PRIVATE);
        Intent intent = getIntent();
        boolean expected = Intent.ACTION_VIEW.equals(intent.getAction())
                && intent.hasCategory(Intent.CATEGORY_BROWSABLE)
                && "https://github.com/mrcalzon02/HB-TTRPG-tools/releases/download/cubechat-android-v0.1.1/CubeChat.apk".equals(intent.getDataString());
        received.edit().putInt("count", received.getInt("count", 0) + 1).commit();
        TextView message = new TextView(this);
        message.setText(expected ? "Observed exact CubeChat release download" : "Unexpected external navigation");
        setContentView(message);
    }
}
