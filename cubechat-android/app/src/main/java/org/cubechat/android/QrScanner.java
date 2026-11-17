package org.cubechat.android;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.ImageFormat;
import android.hardware.Camera;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.Surface;
import android.view.SurfaceHolder;
import android.view.SurfaceView;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.google.zxing.BinaryBitmap;
import com.google.zxing.PlanarYUVLuminanceSource;
import com.google.zxing.ReaderException;
import com.google.zxing.common.HybridBinarizer;
import com.google.zxing.qrcode.QRCodeReader;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Decodes a local camera frame without storing or uploading an image. */
@SuppressWarnings("deprecation")
public final class QrScanner extends Activity implements SurfaceHolder.Callback {
    static final String RESULT_CODE = "pairingCode";
    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService decoding = Executors.newSingleThreadExecutor();
    private final QRCodeReader reader = new QRCodeReader();
    private SurfaceView preview;
    private TextView hint;
    private Camera camera;
    private boolean resumed, ready;
    private int generation;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_SECURE);
        LinearLayout layout = new LinearLayout(this);
        layout.setFitsSystemWindows(true);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setBackgroundColor(Color.rgb(16, 31, 25));
        hint = new TextView(this);
        hint.setText("Point the camera at the other phone’s CubeChat invite.");
        hint.setTextSize(19);
        hint.setTextColor(Color.WHITE);
        hint.setPadding(dp(20), dp(20), dp(20), dp(14));
        layout.addView(hint);
        FrameLayout frame = new FrameLayout(this);
        preview = new SurfaceView(this);
        preview.getHolder().addCallback(this);
        frame.addView(preview, new FrameLayout.LayoutParams(-1, -1, Gravity.CENTER));
        layout.addView(frame, new LinearLayout.LayoutParams(-1, 0, 1));
        Button cancel = new Button(this);
        cancel.setText("Back to pairing");
        cancel.setAllCaps(false);
        cancel.setOnClickListener(v -> finish());
        layout.addView(cancel, new LinearLayout.LayoutParams(-1, dp(56)));
        setContentView(layout);
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    @Override public void surfaceCreated(SurfaceHolder holder) { ready = true; open(); }
    @Override public void surfaceChanged(SurfaceHolder holder, int format, int w, int h) {}
    @Override public void surfaceDestroyed(SurfaceHolder holder) { ready = false; release(); }
    @Override protected void onResume() { super.onResume(); resumed = true; open(); }
    @Override protected void onPause() { resumed = false; release(); super.onPause(); }
    @Override protected void onDestroy() { decoding.shutdownNow(); super.onDestroy(); }

    private void open() {
        if (!resumed || !ready || camera != null) return;
        try {
            int id = 0;
            Camera.CameraInfo info = new Camera.CameraInfo();
            for (int i = 0; i < Camera.getNumberOfCameras(); i++) {
                Camera.getCameraInfo(i, info);
                if (info.facing == Camera.CameraInfo.CAMERA_FACING_BACK) { id = i; break; }
            }
            Camera.getCameraInfo(id, info);
            camera = Camera.open(id);
            Camera.Parameters params = camera.getParameters();
            List<String> focus = params.getSupportedFocusModes();
            if (focus != null && focus.contains(Camera.Parameters.FOCUS_MODE_CONTINUOUS_PICTURE)) {
                params.setFocusMode(Camera.Parameters.FOCUS_MODE_CONTINUOUS_PICTURE);
            }
            Camera.Size chosen = null;
            for (Camera.Size size : params.getSupportedPreviewSizes()) {
                if (size.width * size.height <= 1280 * 960 && (chosen == null ||
                        size.width * size.height > chosen.width * chosen.height)) chosen = size;
            }
            if (chosen != null) params.setPreviewSize(chosen.width, chosen.height);
            params.setPreviewFormat(ImageFormat.NV21);
            camera.setParameters(params);
            int rotation = getWindowManager().getDefaultDisplay().getRotation();
            int degrees = rotation == Surface.ROTATION_90 ? 90 : rotation == Surface.ROTATION_180 ? 180
                    : rotation == Surface.ROTATION_270 ? 270 : 0;
            int angle = info.facing == Camera.CameraInfo.CAMERA_FACING_FRONT
                    ? (360 - (info.orientation + degrees) % 360) % 360
                    : (info.orientation - degrees + 360) % 360;
            camera.setDisplayOrientation(angle);
            camera.setPreviewDisplay(preview.getHolder());
            camera.startPreview();
            capture();
        } catch (Exception e) {
            release();
            hint.setText("Camera unavailable. Return to pairing and paste the invite code.");
        }
    }

    private void capture() {
        Camera current = camera;
        if (current == null || !resumed || !ready) return;
        final int ticket = generation;
        Camera.Size size = current.getParameters().getPreviewSize();
        current.setOneShotPreviewCallback((bytes, source) -> {
            if (bytes == null || decoding.isShutdown() || ticket != generation) return;
            decoding.execute(() -> {
                String code = null;
                try {
                    PlanarYUVLuminanceSource image = new PlanarYUVLuminanceSource(bytes,
                            size.width, size.height, 0, 0, size.width, size.height, false);
                    code = reader.decode(new BinaryBitmap(new HybridBinarizer(image))).getText();
                } catch (ReaderException ignored) {
                    // A partial code in a live preview is normal; inspect the next frame.
                } finally { reader.reset(); }
                final String result = code;
                main.post(() -> {
                    if (ticket != generation || camera == null || !resumed) return;
                    if (result == null) main.postDelayed(this::capture, 100);
                    else {
                        setResult(RESULT_OK, new Intent().putExtra(RESULT_CODE, result));
                        finish();
                    }
                });
            });
        });
    }

    private void release() {
        generation++;
        main.removeCallbacksAndMessages(null);
        if (camera != null) {
            try { camera.setOneShotPreviewCallback(null); camera.stopPreview(); }
            catch (RuntimeException ignored) {}
            camera.release();
            camera = null;
        }
    }
}
