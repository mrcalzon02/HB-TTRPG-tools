package org.cubechat.android;

import java.util.List;

public final class SecurityTimelineTest {
    private static int checks;
    private static void check(boolean ok, String reason) {
        checks++; if (!ok) throw new AssertionError(reason);
    }
    private static void invalid(Runnable action) {
        boolean rejected = false;
        try { action.run(); } catch (IllegalArgumentException expected) { rejected = true; }
        check(rejected, "Expected invalid input to be rejected");
    }
    public static void main(String[] args) {
        long now = 200 * SecurityTimeline.HOUR_MS;
        SecurityTimeline t = new SecurityTimeline();
        check(t.snapshot(now, 72 * SecurityTimeline.HOUR_MS).isEmpty(), "empty");
        t.recordDrops(now, 4, 2048);
        t.recordDrops(now + 1000, 3, 512);
        t.recordCellReport(now, 3, 2, 1, -90);
        t.recordCellReport(now + 3000, 2, 2, 1, -86);
        List<SecurityTimeline.Bucket> b = t.snapshot(now + 4000, 72 * SecurityTimeline.HOUR_MS);
        check(b.size() == 1, "bucket aggregation");
        check(b.get(0).droppedPackets == 7, "packets");
        check(b.get(0).droppedBytes == 2560, "bytes");
        check(b.get(0).cellReports == 2, "report count");
        check(b.get(0).reportedCells == 2, "last cell sample");
        check(b.get(0).servingDbm == -86, "last serving signal");
        String wire = t.encode(now);
        SecurityTimeline decoded = SecurityTimeline.decode(wire, now);
        check(decoded.encode(now).equals(wire), "codec roundtrip");
        invalid(() -> SecurityTimeline.decode("v1\n1,2,3,4,5,6,7,8\n", now));
        invalid(() -> SecurityTimeline.decode("v1\n" + now + ",-1,0,0,0,0,0,-1\n", now));
        invalid(() -> SecurityTimeline.decode("v1\n" + now + ",1,0,0,0,0,0,-1\n" + now + ",1,0,0,0,0,0,-1\n", now));
        invalid(() -> SecurityTimeline.decode("garbage", now));
        invalid(() -> t.recordCellReport(now, 2, 3, 0, -90));
        invalid(() -> t.recordCellReport(now, 2, 1, 1, -161));
        invalid(() -> t.recordDrops(now, -1, 0));
        invalid(() -> t.snapshot(now, 60_000));
        check(SecurityTimeline.validRetention(6 * SecurityTimeline.HOUR_MS), "6h retention");
        check(SecurityTimeline.validRetention(SecurityTimeline.MAX_AGE_MS), "7d retention");
        t.recordDrops(now - 80 * SecurityTimeline.HOUR_MS, 15, 1500);
        check(t.snapshot(now, 72 * SecurityTimeline.HOUR_MS).size() == 1, "72h expiry");
        t.recordDrops(now - 5 * SecurityTimeline.HOUR_MS, 1, 8);
        check(t.snapshot(now, 6 * SecurityTimeline.HOUR_MS).size() == 2, "6h valid");
        t.recordDrops(now - 7 * SecurityTimeline.HOUR_MS, 1, 8);
        check(t.snapshot(now, 6 * SecurityTimeline.HOUR_MS).size() == 2, "6h expired");
        t.clear();
        check(t.snapshot(now, 72 * SecurityTimeline.HOUR_MS).isEmpty(), "manual and purge clear");
        // Bounded 5-minute buckets, dropping the oldest without carrying sensitive raw events.
        SecurityTimeline many = new SecurityTimeline();
        for (int i = 0; i < 2400; i++) many.recordDrops(i * SecurityTimeline.BUCKET_MS, 1, 5);
        check(many.snapshot(2399 * SecurityTimeline.BUCKET_MS, SecurityTimeline.MAX_AGE_MS).size()
                <= SecurityTimeline.MAX_BUCKETS, "capacity cap");
        check(many.snapshot(2399 * SecurityTimeline.BUCKET_MS, 6 * SecurityTimeline.HOUR_MS).size()
                <= 73, "6h capacity");
        // Overflow must saturate, never wrap negative.
        SecurityTimeline overflow = new SecurityTimeline();
        overflow.recordDrops(now, Long.MAX_VALUE, Long.MAX_VALUE);
        overflow.recordDrops(now, 1, 1);
        check(overflow.snapshot(now, SecurityTimeline.MAX_AGE_MS).get(0).droppedBytes == Long.MAX_VALUE,
                "saturated bytes");
        check(overflow.snapshot(now, SecurityTimeline.MAX_AGE_MS).get(0).droppedPackets == Long.MAX_VALUE,
                "saturated packets");
        System.out.println("SecurityTimelineTest: " + checks + "/" + checks + " checks passed");
    }
}
