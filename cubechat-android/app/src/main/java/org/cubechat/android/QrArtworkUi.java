package org.cubechat.android;

import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.SeekBar;
import android.widget.TextView;
import android.widget.Toast;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.BooleanSupplier;

/**
 * Opt-in image QR editor. Keeps the invite and pixels in memory, never sends
 * them to a service, never writes without an explicit SAF destination, and
 * verifies the exact composed code with ZXing before enabling Save.
 *
 * The original visible QR export is always still available in MainActivity.
 * Offline decode is NOT a guarantee of camera or print performance.
 */
final class QrArtworkUi {
    static final int PICK_IMAGE = 6;
    static final int SAVE_IMAGE = 7;
    private static final int MAX_IMAGE_DIMENSION = 1600;
    private static final int MAX_SOURCE_DIMENSION = 30000;

    private final MainActivity host;
    private final String invite;
    private final BooleanSupplier stillCurrent;
    private final Runnable onClosed;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Runnable deferredPreview = this::requestRender;
    private boolean closed;
    private volatile int generation;
    private int[] background;
    private int[] verifiedOutput;
    private int width, height;
    private boolean[][] qr;
    private AlertDialog dialog;
    private Bitmap previewBitmap;
    private ImageView preview;
    private TextView status, percentage;
    private SeekBar visibility;
    private Button save;

    QrArtworkUi(MainActivity host, String invite, BooleanSupplier stillCurrent,
                Runnable onClosed) {
        this.host = host;
        this.invite = invite;
        this.stillCurrent = stillCurrent;
        this.onClosed = onClosed;
    }

    void chooseImage() {
        if (closed || !stillCurrent.getAsBoolean()) { close(); return; }
        Intent choose = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        choose.addCategory(Intent.CATEGORY_OPENABLE);
        choose.setType("image/*");
        host.startActivityForResult(choose, PICK_IMAGE);
    }

    boolean consume(int request, int result, Intent data) {
        if (request != PICK_IMAGE && request != SAVE_IMAGE) return false;
        if (closed) return true;
        if (!stillCurrent.getAsBoolean()) {
            close();
            return true;
        }
        if (request == PICK_IMAGE) {
            if (result != MainActivity.RESULT_OK || data == null || data.getData() == null) {
                if (dialog == null) close();
                return true;
            }
            openEditor(data.getData());
        } else if (result == MainActivity.RESULT_OK && data != null
                && data.getData() != null && verifiedOutput != null) {
            saveVerifiedPng(data.getData());
        }
        return true;
    }

    private void openEditor(Uri input) {
        if (dialog == null) {
            LinearLayout content = new LinearLayout(host);
            content.setOrientation(LinearLayout.VERTICAL);
            content.setPadding(host.dp(16), host.dp(8), host.dp(16), host.dp(8));
            TextView explanation = label("The QR is blended through image brightness. "
                    + "It remains readable by anyone who can scan the picture; "
                    + "a pairing key card is private even when it looks hidden.", 14);
            content.addView(explanation);
            preview = new ImageView(host);
            preview.setContentDescription("Brightness-modulated QR preview");
            preview.setAdjustViewBounds(true);
            preview.setScaleType(ImageView.ScaleType.FIT_CENTER);
            content.addView(preview, new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, host.dp(280)));
            percentage = label("Visibility 78% · release slider to verify", 15);
            content.addView(percentage);
            visibility = new SeekBar(host);
            visibility.setContentDescription("QR artwork contrast visibility");
            visibility.setMax(100);
            visibility.setProgress(78);
            content.addView(visibility);
            status = label("Reading image locally…", 14);
            status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
            content.addView(status);
            Button replace = new Button(host);
            replace.setText("Choose a different image");
            replace.setOnClickListener(v -> chooseImage());
            content.addView(replace);
            save = new Button(host);
            save.setText("Save verified artwork PNG");
            save.setEnabled(false);
            save.setOnClickListener(v -> chooseSaveLocation());
            content.addView(save);
            TextView footnote = label("Only the finished image is saved. "
                    + "Verification uses CubeChat's local QR decoder; cameras, "
                    + "printing and recompression can still fail. "
                    + "The normal high-contrast QR remains available.", 13);
            content.addView(footnote);
            visibility.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
                @Override public void onProgressChanged(SeekBar bar, int value, boolean user) {
                    percentage.setText("Visibility " + value + "% · release slider to verify");
                    if (user) {
                        generation++;
                        verifiedOutput = null;
                        save.setEnabled(false);
                        status.setText("Verifying this brightness…");
                        mainHandler.removeCallbacks(deferredPreview);
                        mainHandler.postDelayed(deferredPreview, 180L);
                    }
                }
                @Override public void onStartTrackingTouch(SeekBar bar) { }
                @Override public void onStopTrackingTouch(SeekBar bar) {
                    mainHandler.removeCallbacks(deferredPreview);
                    requestRender();
                }
            });
            ScrollView scroll = new ScrollView(host);
            scroll.addView(content);
            dialog = DisplayPrivacy.dialog(host)
                    .setTitle("QR artwork · brightness")
                    .setView(scroll)
                    .setNegativeButton("Close", null)
                    .create();
            dialog.setOnDismissListener(d -> close());
            dialog.show();
        }

        final int ticket = ++generation;
        // A failed replacement must not allow the previous photo's QR to be
        // saved under the guise of a newly selected artwork file.
        background = null;
        qr = null;
        verifiedOutput = null;
        save.setEnabled(false);
        if (preview != null) preview.setImageDrawable(null);
        if (previewBitmap != null) {
            previewBitmap.recycle();
            previewBitmap = null;
        }
        status.setText("Reading image locally…");
        worker.execute(() -> {
            try {
                boolean[][] modules = QrArtworkRender.modules(invite);
                Photo image = readImage(input);
                QrArtworkGeometry.centered(image.width, image.height, modules.length);
                host.runOnUiThread(() -> {
                    if (closed || ticket != generation || !stillCurrent.getAsBoolean()) return;
                    background = image.pixels;
                    width = image.width;
                    height = image.height;
                    qr = modules;
                    requestRender();
                });
            } catch (Exception | OutOfMemoryError failure) {
                host.runOnUiThread(() -> {
                    if (!closed && ticket == generation)
                        status.setText("Cannot use this image. Choose a larger, readable photo.");
                });
            }
        });
    }

    private void requestRender() {
        if (closed || background == null || qr == null) return;
        if (!stillCurrent.getAsBoolean()) { close(); return; }
        final int ticket = ++generation;
        final int[] photo = background;
        final boolean[][] matrix = qr;
        final int w = width, h = height;
        final float strength = visibility.getProgress() / 100.0f;
        verifiedOutput = null;
        save.setEnabled(false);
        status.setText("Verifying composed QR locally…");
        worker.execute(() -> {
            if (closed || ticket != generation) return;
            try {
                QrArtworkRender.Result result =
                        QrArtworkRender.render(photo, w, h, matrix, invite, strength);
                if (closed || ticket != generation) return;
                Bitmap bitmap = Bitmap.createBitmap(result.pixels, w, h, Bitmap.Config.ARGB_8888);
                host.runOnUiThread(() -> {
                    if (closed || ticket != generation || !stillCurrent.getAsBoolean()) {
                        bitmap.recycle();
                        return;
                    }
                    Bitmap old = previewBitmap;
                    previewBitmap = bitmap;
                    preview.setImageBitmap(bitmap);
                    if (old != null && old != bitmap) old.recycle();
                    if (result.scannerVerified) {
                        verifiedOutput = result.pixels;
                        save.setEnabled(true);
                        status.setText("Scan verified locally · PNG save enabled. "
                                + "This is not a real-camera test.");
                    } else {
                        verifiedOutput = null;
                        save.setEnabled(false);
                        status.setText("QR not readable at this brightness. "
                                + "Increase visibility or choose a different image.");
                    }
                });
            } catch (Exception | OutOfMemoryError failure) {
                host.runOnUiThread(() -> {
                    if (!closed && ticket == generation) {
                        verifiedOutput = null;
                        save.setEnabled(false);
                        status.setText("Artwork could not be rendered. Choose another photo.");
                    }
                });
            }
        });
    }

    private void chooseSaveLocation() {
        if (closed || !stillCurrent.getAsBoolean() || verifiedOutput == null) {
            status.setText("Reopen or verify the current invite before saving.");
            save.setEnabled(false);
            return;
        }
        Intent create = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        create.addCategory(Intent.CATEGORY_OPENABLE);
        create.setType("image/png");
        create.putExtra(Intent.EXTRA_TITLE, "CubeChat-artwork-key-card.png");
        host.startActivityForResult(create, SAVE_IMAGE);
    }

    private void saveVerifiedPng(Uri target) {
        if (!stillCurrent.getAsBoolean() || verifiedOutput == null) {
            status.setText("This invite or artwork has changed. Verify it again.");
            save.setEnabled(false);
            return;
        }
        final int[] pixels = verifiedOutput;
        final int w = width, h = height;
        final int ticket = ++generation;
        save.setEnabled(false);
        status.setText("Checking the encoded PNG before saving…");
        worker.execute(() -> {
            Bitmap encoded = null, decoded = null;
            try {
                // Validate the exact PNG bytes before opening the destination:
                // a decoder failure must not create a plausible broken key card.
                encoded = Bitmap.createBitmap(pixels, w, h, Bitmap.Config.ARGB_8888);
                ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                if (!encoded.compress(Bitmap.CompressFormat.PNG, 100, buffer))
                    throw new IOException("PNG encoding unavailable");
                byte[] png = buffer.toByteArray();
                decoded = BitmapFactory.decodeByteArray(png, 0, png.length);
                if (decoded == null || decoded.getWidth() != w || decoded.getHeight() != h)
                    throw new IOException("PNG round-trip failed");
                int[] readback = new int[w * h];
                decoded.getPixels(readback, 0, w, 0, 0, w, h);
                if (!QrArtworkRender.verifies(readback, w, h, invite))
                    throw new IOException("Final PNG QR was not readable");
                if (closed || ticket != generation || !stillCurrent.getAsBoolean()) return;
                try (OutputStream out = host.getContentResolver().openOutputStream(target, "wt")) {
                    if (out == null) throw new IOException("Destination unavailable");
                    out.write(png);
                    out.flush();
                }
                host.runOnUiThread(() -> {
                    if (!closed && ticket == generation) {
                        status.setText("Verified artwork PNG saved. Keep the key card private.");
                        save.setEnabled(true);
                        Toast.makeText(host, "Verified artwork saved", Toast.LENGTH_SHORT).show();
                    }
                });
            } catch (Exception | OutOfMemoryError failure) {
                host.runOnUiThread(() -> {
                    if (!closed && ticket == generation) {
                        status.setText("Artwork PNG could not be verified or saved. "
                                + "Use the plain QR or try again.");
                        save.setEnabled(verifiedOutput != null);
                    }
                });
            } finally {
                if (decoded != null) decoded.recycle();
                if (encoded != null) encoded.recycle();
            }
        });
    }

    private Photo readImage(Uri uri) throws IOException {
        BitmapFactory.Options bounds = new BitmapFactory.Options();
        bounds.inJustDecodeBounds = true;
        try (InputStream input = host.getContentResolver().openInputStream(uri)) {
            if (input == null) throw new IOException("Image unavailable");
            BitmapFactory.decodeStream(input, null, bounds);
        }
        if (bounds.outWidth < 1 || bounds.outHeight < 1
                || bounds.outWidth > MAX_SOURCE_DIMENSION
                || bounds.outHeight > MAX_SOURCE_DIMENSION)
            throw new IOException("Unsupported image size");
        BitmapFactory.Options options = new BitmapFactory.Options();
        options.inPreferredConfig = Bitmap.Config.ARGB_8888;
        options.inSampleSize = 1;
        while (Math.max(bounds.outWidth / options.inSampleSize,
                bounds.outHeight / options.inSampleSize) > MAX_IMAGE_DIMENSION)
            options.inSampleSize *= 2;
        Bitmap decoded = null;
        try (InputStream input = host.getContentResolver().openInputStream(uri)) {
            if (input == null) throw new IOException("Image unavailable");
            decoded = BitmapFactory.decodeStream(input, null, options);
            if (decoded == null) throw new IOException("Cannot decode image");
            int w = decoded.getWidth(), h = decoded.getHeight();
            if ((long) w * h > (long) MAX_IMAGE_DIMENSION * MAX_IMAGE_DIMENSION)
                throw new IOException("Image exceeds memory budget");
            int[] pixels = new int[w * h];
            decoded.getPixels(pixels, 0, w, 0, 0, w, h);
            // Flatten transparent pictures against white; a transparent QR
            // would vanish in different viewers and could fail to scan.
            for (int i = 0; i < pixels.length; i++) {
                int color = pixels[i];
                int a = color >>> 24;
                if (a == 255) continue;
                int r = ((color >>> 16) & 255) * a + 255 * (255 - a);
                int g = ((color >>> 8) & 255) * a + 255 * (255 - a);
                int b = (color & 255) * a + 255 * (255 - a);
                pixels[i] = 0xff000000 | ((r / 255) << 16)
                        | ((g / 255) << 8) | (b / 255);
            }
            return new Photo(pixels, w, h);
        } finally {
            if (decoded != null) decoded.recycle();
        }
    }

    private TextView label(String text, int size) {
        TextView label = new TextView(host);
        label.setText(text);
        label.setTextSize(size);
        label.setPadding(0, host.dp(6), 0, host.dp(6));
        return label;
    }

    void close() {
        if (closed) return;
        closed = true;
        generation++;
        mainHandler.removeCallbacks(deferredPreview);
        worker.shutdownNow();
        background = null;
        verifiedOutput = null;
        qr = null;
        if (preview != null) preview.setImageDrawable(null);
        if (previewBitmap != null) {
            previewBitmap.recycle();
            previewBitmap = null;
        }
        AlertDialog previous = dialog;
        dialog = null;
        if (previous != null && previous.isShowing()) previous.dismiss();
        onClosed.run();
    }

    private static final class Photo {
        final int[] pixels;
        final int width, height;
        Photo(int[] pixels, int width, int height) {
            this.pixels = pixels;
            this.width = width;
            this.height = height;
        }
    }
}
