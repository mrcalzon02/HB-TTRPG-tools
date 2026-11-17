package org.cubechat.android;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/** Native crypto and the exact lab transform, running in an offline bundled WebView. */
public final class CubeProfile implements PeerLink.Codec {
    private final Handler main = new Handler(Looper.getMainLooper());
    private final CountDownLatch loaded = new CountDownLatch(1);
    private final WebView engine;
    private final CubeEnvelope envelopes = new CubeEnvelope(this::transform);
    private volatile boolean available;
    private volatile boolean closed;

    public CubeProfile(Context context) {
        if (Looper.myLooper() != Looper.getMainLooper()) throw new IllegalStateException("Initialize profile on UI thread");
        engine = new WebView(context.getApplicationContext());
        engine.getSettings().setJavaScriptEnabled(true);
        engine.getSettings().setAllowFileAccess(false);
        engine.getSettings().setAllowContentAccess(false);
        engine.getSettings().setBlockNetworkLoads(true);
        engine.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return true; }
            @Override public void onPageFinished(WebView view, String url) {
                if (closed) return;
                view.evaluateJavascript("typeof CubeChatTransform === 'function'", result -> {
                    if (closed) return;
                    if (!"true".equals(result) && url.endsWith("/cube-profile.html")) {
                        view.loadUrl("file:///android_asset/cube-profile-legacy.html");
                        return;
                    }
                    available = "true".equals(result);
                    loaded.countDown();
                });
            }
        });
        engine.loadUrl("file:///android_asset/cube-profile.html");
    }

    @Override public JSONObject seal(String key, String channel, long sequence, String text) throws Exception {
        return envelopes.seal(key, channel, sequence, text);
    }

    @Override public String open(String key, String channel, JSONObject envelope) throws Exception {
        return envelopes.open(key, channel, envelope);
    }

    private String transform(String operation, String key, String data) throws Exception {
        if (Looper.myLooper() == Looper.getMainLooper()) throw new IllegalStateException("Run the profile on a worker thread");
        if (closed || !loaded.await(15, TimeUnit.SECONDS) || !available) {
            throw new IllegalStateException("Cube engine unavailable. Check Android System WebView and reopen CubeChat.");
        }
        String expression = "CubeChatTransform(" + JSONObject.quote(operation) + "," + JSONObject.quote(key)
                + "," + JSONObject.quote(data) + ")";
        CountDownLatch complete = new CountDownLatch(1);
        AtomicReference<String> output = new AtomicReference<>();
        main.post(() -> {
            if (closed) { complete.countDown(); return; }
            engine.evaluateJavascript(expression, value -> { output.set(value); complete.countDown(); });
        });
        if (!complete.await(30, TimeUnit.SECONDS) || output.get() == null) throw new IllegalStateException("Cube engine interrupted");
        JSONObject result = new JSONObject(output.get());
        if (result.has("error")) throw new IllegalArgumentException(result.getString("error"));
        return result.getString("value");
    }

    public void close() {
        closed = true;
        loaded.countDown();
        engine.destroy();
    }
}
