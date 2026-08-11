package com.hbttrpg.livesignals;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.util.ArrayList;
import java.util.List;

public final class MainActivity extends Activity {
    private static final String LAB_URL =
            "https://mrcalzon02.github.io/HB-TTRPG-tools/index.html#scientific-tools";
    private static final String ALLOWED_HOST = "mrcalzon02.github.io";
    private static final String ALLOWED_PATH_PREFIX = "/HB-TTRPG-tools/";
    private static final int SIGNAL_PERMISSION_REQUEST = 1001;

    private WebView webView;
    private LiveSignalsNativeBridge nativeBridge;
    private boolean pageReady = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestSignalPermissions();

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        nativeBridge = new LiveSignalsNativeBridge(this, webView);
        webView.addJavascriptInterface(new JsApi(), "LiveSignalsNative");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                boolean allowed = "https".equalsIgnoreCase(uri.getScheme())
                        && ALLOWED_HOST.equalsIgnoreCase(uri.getHost())
                        && uri.getPath() != null
                        && uri.getPath().startsWith(ALLOWED_PATH_PREFIX);
                if (allowed) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception ignored) {
                    // External navigation is never loaded inside the privileged bridge WebView.
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                Uri uri = Uri.parse(url);
                if (ALLOWED_HOST.equalsIgnoreCase(uri.getHost())
                        && uri.getPath() != null
                        && uri.getPath().startsWith(ALLOWED_PATH_PREFIX)) {
                    installBridgeJavascript();
                    pageReady = true;
                    nativeBridge.startPassive();
                }
            }
        });
        webView.loadUrl(LAB_URL);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (pageReady && nativeBridge != null) nativeBridge.startPassive();
    }

    @Override
    protected void onPause() {
        if (nativeBridge != null) nativeBridge.stopPassive();
        super.onPause();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != SIGNAL_PERMISSION_REQUEST || nativeBridge == null) return;

        // Passive collection may have initialized while the runtime permission dialog was still
        // open. Restart every collector so newly granted cellular/BLE/Wi-Fi/location channels are
        // immediately inventoried instead of remaining falsely marked unavailable until relaunch.
        nativeBridge.stopPassive();
        if (pageReady) nativeBridge.startPassive();
        refreshWebBridgeCapabilities();
    }

    @Override
    protected void onDestroy() {
        if (nativeBridge != null) nativeBridge.close();
        if (webView != null) {
            webView.removeJavascriptInterface("LiveSignalsNative");
            webView.destroy();
        }
        super.onDestroy();
    }

    private void installBridgeJavascript() {
        String script = """
            (() => {
              const native = window.LiveSignalsNative;
              if (!native) return;
              const pending = window.__liveSignalsNativePending ||= new Map();
              window.AndroidLiveSignalsBridge = {
                id: 'android-native-webview',
                getCapabilities() {
                  return JSON.parse(native.getCapabilitiesJson());
                },
                startPassive() {
                  native.startPassive();
                  return true;
                },
                stopPassive() {
                  native.stopPassive();
                  return true;
                },
                runActiveScan(plan) {
                  return new Promise((resolve, reject) => {
                    const requestId = crypto.randomUUID ? crypto.randomUUID() :
                      ('lsl-' + Date.now() + '-' + Math.random().toString(36).slice(2));
                    pending.set(requestId, {resolve, reject});
                    native.runActiveScan(requestId, JSON.stringify(plan || {}));
                  });
                }
              };
              window.LiveSignalsHardwareBridge = window.AndroidLiveSignalsBridge;
              window.__liveSignalsNativeResolve = (requestId, ok, jsonPayload) => {
                const entry = pending.get(requestId);
                if (!entry) return;
                pending.delete(requestId);
                try {
                  const payload = JSON.parse(jsonPayload || 'null');
                  if (ok) entry.resolve(payload);
                  else entry.reject(new Error(payload?.error || 'Native Active Scan failed'));
                } catch (error) {
                  entry.reject(error);
                }
              };
            })();
            """;
        webView.evaluateJavascript(script, null);
    }

    private void refreshWebBridgeCapabilities() {
        if (!pageReady || webView == null) return;
        webView.evaluateJavascript("""
            (() => {
              try {
                if (window.LiveSignalsLaboratory?.registerHardwareBridge && window.AndroidLiveSignalsBridge) {
                  window.LiveSignalsLaboratory.registerHardwareBridge(window.AndroidLiveSignalsBridge);
                }
                window.LiveSignalsLaboratory?.refreshHardwareBridgeCapabilities?.();
              } catch (error) {
                // The laboratory may not be mounted yet; capabilities will be read when it opens.
              }
            })();
            """, null);
    }

    private void requestSignalPermissions() {
        List<String> requested = new ArrayList<>();
        addIfMissing(requested, Manifest.permission.ACCESS_FINE_LOCATION);
        addIfMissing(requested, Manifest.permission.ACCESS_COARSE_LOCATION);
        addIfMissing(requested, Manifest.permission.READ_PHONE_STATE);
        addIfMissing(requested, Manifest.permission.BLUETOOTH_SCAN);
        addIfMissing(requested, Manifest.permission.NEARBY_WIFI_DEVICES);
        if (!requested.isEmpty()) requestPermissions(requested.toArray(new String[0]), SIGNAL_PERMISSION_REQUEST);
    }

    private void addIfMissing(List<String> out, String permission) {
        if (checkSelfPermission(permission) != PackageManager.PERMISSION_GRANTED) out.add(permission);
    }

    public final class JsApi {
        @JavascriptInterface
        public String getCapabilitiesJson() {
            return nativeBridge.getCapabilitiesJson().toString();
        }

        @JavascriptInterface
        public void startPassive() {
            runOnUiThread(() -> nativeBridge.startPassive());
        }

        @JavascriptInterface
        public void stopPassive() {
            runOnUiThread(() -> nativeBridge.stopPassive());
        }

        @JavascriptInterface
        public void runActiveScan(String requestId, String planJson) {
            runOnUiThread(() -> nativeBridge.runActiveScan(requestId, planJson));
        }
    }
}
