package org.cubechat.android;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.view.View;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/** Small dependency-free time graph; gaps in cellular samples are not interpolated. */
final class SecurityHistoryGraph extends View {
    enum Metric { DROPPED_PACKETS, SERVING_SIGNAL }
    private static final int SLOTS = 72;
    private final List<SecurityTimeline.Bucket> samples;
    private final Metric metric;
    private final long windowMs;
    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final float density, scaledDensity;

    SecurityHistoryGraph(Context context, List<SecurityTimeline.Bucket> samples,
                         Metric metric, long windowMs) {
        super(context);
        this.samples = samples;
        this.metric = metric;
        this.windowMs = windowMs;
        density = getResources().getDisplayMetrics().density;
        scaledDensity = getResources().getDisplayMetrics().scaledDensity;
        setMinimumHeight(dp(172));
        setContentDescription(metric == Metric.DROPPED_PACKETS
                ? "Time series of IP packets discarded by the CubeChat VPN"
                : "Time series of Android-reported serving-cell signal samples with gaps");
    }
    private int dp(float v) { return Math.round(v * density); }
    private void ink(int color, int sp) {
        paint.setColor(color); paint.setTextSize(sp * scaledDensity);
        paint.setStrokeWidth(dp(1)); paint.setStyle(Paint.Style.FILL);
    }
    @Override protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        setMeasuredDimension(MeasureSpec.getSize(widthMeasureSpec), dp(172));
    }
    @Override protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        float left = dp(50), right = getWidth() - dp(13);
        float top = dp(10), bottom = getHeight() - dp(38);
        if (right <= left || bottom <= top) return;
        long end = System.currentTimeMillis();
        long start = Math.max(0, end - windowMs);
        double[] packetCounts = new double[SLOTS];
        int[] signalValues = new int[SLOTS];
        boolean[] hasSignal = new boolean[SLOTS];
        boolean seen = false;
        for (SecurityTimeline.Bucket b : samples) {
            if (b.startMs < start || b.startMs > end) continue;
            int slot = (int) Math.min(SLOTS - 1, (b.startMs - start) * SLOTS / windowMs);
            if (b.droppedPackets > 0) {
                packetCounts[slot] += b.droppedPackets;
                if (metric == Metric.DROPPED_PACKETS) seen = true;
            }
            if (b.cellReports > 0 && b.servingDbm != SecurityTimeline.UNKNOWN_SIGNAL) {
                signalValues[slot] = b.servingDbm;
                hasSignal[slot] = true;
                if (metric == Metric.SERVING_SIGNAL) seen = true;
            }
        }
        ink(0xffc9d3cf, 12);
        canvas.drawLine(left, top, left, bottom, paint);
        canvas.drawLine(left, bottom, right, bottom, paint);
        if (metric == Metric.DROPPED_PACKETS) {
            double maximum = 1;
            for (double packets : packetCounts) maximum = Math.max(maximum, packets);
            ink(0xff4c6157, 11);
            canvas.drawText(compact(maximum), dp(2), top + dp(12), paint);
            canvas.drawText("0", dp(32), bottom, paint);
            ink(0xff286a71, 12);
            float step = (right - left) / SLOTS;
            for (int i = 0; i < SLOTS; i++) {
                if (packetCounts[i] <= 0) continue;
                float height = (float) (packetCounts[i] / maximum * (bottom - top));
                canvas.drawRect(left + i * step, bottom - height,
                        left + (i + 1) * step - Math.min(1, step * .15f), bottom, paint);
            }
        } else {
            ink(0xff4c6157, 11);
            canvas.drawText("-20", dp(14), top + dp(10), paint);
            canvas.drawText("-90", dp(14), (top + bottom) / 2, paint);
            canvas.drawText("-160", dp(8), bottom, paint);
            ink(0xff286a71, 12);
            paint.setStrokeWidth(dp(2));
            float previousX = 0, previousY = 0;
            int previousIndex = -2;
            for (int i = 0; i < SLOTS; i++) {
                if (!hasSignal[i]) continue;
                float x = left + (i + .5f) * (right - left) / SLOTS;
                float y = bottom - (signalValues[i] + 160) * (bottom - top) / 140f;
                // Adjacent points only. A gap is missing information, not a steady signal.
                if (i == previousIndex + 1) canvas.drawLine(previousX, previousY, x, y, paint);
                canvas.drawCircle(x, y, dp(2), paint);
                previousIndex = i; previousX = x; previousY = y;
            }
        }
        ink(0xff4c6157, 10);
        String pattern = windowMs > 24 * SecurityTimeline.HOUR_MS ? "MM-dd HH:mm" : "HH:mm";
        SimpleDateFormat clock = new SimpleDateFormat(pattern, Locale.getDefault());
        canvas.drawText(clock.format(new Date(start)), left, getHeight() - dp(14), paint);
        String endLabel = clock.format(new Date(end));
        canvas.drawText(endLabel, right - paint.measureText(endLabel), getHeight() - dp(14), paint);
        if (!seen) {
            ink(0xff4c6157, 12);
            canvas.drawText("No measured samples in this interval", left + dp(7), (top + bottom) / 2, paint);
        }
    }
    private static String compact(double value) {
        if (value >= 1_000_000) return String.format(Locale.US, "%.1fm", value / 1_000_000);
        if (value >= 1_000) return String.format(Locale.US, "%.1fk", value / 1_000);
        return Long.toString((long) value);
    }
}
