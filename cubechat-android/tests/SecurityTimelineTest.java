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
        // A drop-only bucket cannot carry cell statistics: no cell report ever
        // populated those fields. Reject corrupted persisted aggregates on restart.
        invalid(() -> SecurityTimeline.decode("v1\n" + now
                + ",0,10,0,2,1,1,-90\n", now));
        invalid(() -> SecurityTimeline.decode("v1\n" + now
                + ",0,10,0,0,0,0,-90\n", now));
        check(SecurityTimeline.decode("v1\n" + now
                + ",2,10,0,0,0,0,-1\n", now).snapshot(now,
                        SecurityTimeline.MAX_AGE_MS).size() == 1,
                "legitimate drop-only bucket survives restart");
        // A persisted snapshot can contain at most MAX_BUCKETS data rows. An
        // extra valid-looking row must not be silently dropped on restart.
        StringBuilder fullWire = new StringBuilder("v1\n");
        for (int i = 0; i < SecurityTimeline.MAX_BUCKETS; i++) {
            fullWire.append(i * SecurityTimeline.BUCKET_MS)
                    .append(",1,5,0,0,0,0,-1\n");
        }
        long newest = (SecurityTimeline.MAX_BUCKETS - 1L) * SecurityTimeline.BUCKET_MS;
        check(SecurityTimeline.decode(fullWire.toString(), newest)
                .snapshot(newest, SecurityTimeline.MAX_AGE_MS).size()
                == SecurityTimeline.MAX_BUCKETS, "full legitimate history survives restore");
        String excess = fullWire + String.valueOf(SecurityTimeline.MAX_BUCKETS * SecurityTimeline.BUCKET_MS)
                + ",1,5,0,0,0,0,-1\n";
        long excessNow = SecurityTimeline.MAX_BUCKETS * SecurityTimeline.BUCKET_MS;
        invalid(() -> SecurityTimeline.decode(excess, excessNow));
        invalid(() -> SecurityTimeline.decode(excess.substring(0, excess.length() - 1), excessNow));
        invalid(() -> t.recordCellReport(now, 2, 3, 0, -90));
        invalid(() -> t.recordCellReport(now, 2, 1, 1, -161));
        invalid(() -> t.recordDrops(now, -1, 0));
        invalid(() -> t.snapshot(now, 60_000));
        check(SecurityTimeline.validRetention(6 * SecurityTimeline.HOUR_MS), "6h retention");
        check(SecurityTimeline.validRetention(24 * SecurityTimeline.HOUR_MS), "24h retention");
        check(SecurityTimeline.validRetention(72 * SecurityTimeline.HOUR_MS), "3d retention");
        check(SecurityTimeline.validRetention(SecurityTimeline.MAX_AGE_MS), "7d retention");
        t.recordDrops(now - 80 * SecurityTimeline.HOUR_MS, 15, 1500);
        check(t.snapshot(now, 72 * SecurityTimeline.HOUR_MS).size() == 1, "72h expiry");
        t.recordDrops(now - 5 * SecurityTimeline.HOUR_MS, 1, 8);
        check(t.snapshot(now, 6 * SecurityTimeline.HOUR_MS).size() == 2, "6h valid");
        t.recordDrops(now - 7 * SecurityTimeline.HOUR_MS, 1, 8);
        check(t.snapshot(now, 6 * SecurityTimeline.HOUR_MS).size() == 2, "6h expired");
        // Even when no new packets or cell samples arrive, an expired stored row
        // must be detectable so the encrypted snapshot can be rewritten on idle flush.
        SecurityTimeline idle = new SecurityTimeline();
        idle.recordDrops(now, 2, 64);
        check(!idle.prune(now + 5 * SecurityTimeline.HOUR_MS,
                6 * SecurityTimeline.HOUR_MS), "unexpired idle history unchanged");
        check(idle.prune(now + 7 * SecurityTimeline.HOUR_MS,
                6 * SecurityTimeline.HOUR_MS), "idle expiry signals durable rewrite");
        check(idle.snapshot(now + 7 * SecurityTimeline.HOUR_MS,
                6 * SecurityTimeline.HOUR_MS).isEmpty(), "expired idle history empty");
        check(!idle.prune(now + 8 * SecurityTimeline.HOUR_MS,
                6 * SecurityTimeline.HOUR_MS), "no repeated dirty work after expiry");
        // A transient device-clock jump must not strand future buckets after
        // the clock is corrected, nor silently discard new corrected-time drops.
        SecurityTimeline clockJump = new SecurityTimeline();
        long impossibleFuture = now + 2 * SecurityTimeline.MAX_AGE_MS;
        clockJump.recordDrops(now, 1, 10);
        clockJump.recordDrops(impossibleFuture, 7, 70);
        check(clockJump.prune(now, 6 * SecurityTimeline.HOUR_MS),
                "clock rollback removes future rows and signals encrypted rewrite");
        check(clockJump.snapshot(now, 6 * SecurityTimeline.HOUR_MS).isEmpty(),
                "far-future aggregate not visible after clock correction");
        clockJump.recordDrops(now + SecurityTimeline.BUCKET_MS, 2, 20);
        List<SecurityTimeline.Bucket> corrected = clockJump.snapshot(
                now + SecurityTimeline.BUCKET_MS, 6 * SecurityTimeline.HOUR_MS);
        check(corrected.size() == 1 && corrected.get(0).droppedPackets == 2,
                "corrected wall clock accepts new history instead of orphaning buckets");
        String correctedWire = clockJump.encode(now + SecurityTimeline.BUCKET_MS);
        check(SecurityTimeline.decode(correctedWire, now + SecurityTimeline.BUCKET_MS)
                .encode(now + SecurityTimeline.BUCKET_MS).equals(correctedWire),
                "corrected history persists and roundtrips");
        // Even a correction shorter than the seven-day storage cap must drop
        // future samples and allow the selected six-hour retention to keep new ones.
        SecurityTimeline smallJump = new SecurityTimeline();
        smallJump.recordDrops(now + 12 * SecurityTimeline.HOUR_MS, 5, 50);
        check(smallJump.prune(now, 6 * SecurityTimeline.HOUR_MS),
                "shorter rollback evicts future clock samples");
        smallJump.recordDrops(now, 3, 30);
        check(smallJump.snapshot(now, 6 * SecurityTimeline.HOUR_MS).size() == 1,
                "six-hour retention accepts corrected-time samples");
        // Decoding data recorded with a future clock preserves only genuine
        // in-range samples and retains the existing v1 encoding contract.
        String futureWire = "v1\n" + now + ",1,10,0,0,0,0,-1\n"
                + impossibleFuture + ",7,70,0,0,0,0,-1\n";
        SecurityTimeline restoredClock = SecurityTimeline.decode(futureWire, now);
        check(restoredClock.snapshot(now, 6 * SecurityTimeline.HOUR_MS).size() == 1,
                "future persisted bucket discarded on restore");
        check(SecurityTimeline.decode(restoredClock.encode(now), now)
                .snapshot(now, 6 * SecurityTimeline.HOUR_MS).size() == 1,
                "valid persisted bucket survives normalized roundtrip");
        // Extreme nonnegative wall-clock values must not overflow the future
        // cutoff and delete a legitimately aligned current bucket.
        SecurityTimeline extremeClock = new SecurityTimeline();
        extremeClock.recordDrops(Long.MAX_VALUE, 1, 1);
        check(extremeClock.snapshot(Long.MAX_VALUE, SecurityTimeline.MAX_AGE_MS)
                .size() == 1, "future cutoff does not overflow long timestamp");
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
        // A delayed observation older than the retained window must not be
        // mistaken for a device-clock rollback and purge recent valid history.
        SecurityTimeline late = new SecurityTimeline();
        late.recordDrops(now, 4, 40);
        late.recordCellReport(now, 2, 1, 1, -90);
        long tooOld = now - SecurityTimeline.MAX_AGE_MS - SecurityTimeline.BUCKET_MS;
        late.recordDrops(tooOld, 100, 1000);
        check(late.snapshot(now, SecurityTimeline.MAX_AGE_MS).size() == 1,
                "ancient delayed drop must not purge current history");
        check(late.snapshot(now, SecurityTimeline.MAX_AGE_MS).get(0).droppedPackets == 4,
                "ancient delayed drop cannot replace current counters");
        late.recordCellReport(tooOld, 1, 1, 1, -120);
        check(late.snapshot(now, SecurityTimeline.MAX_AGE_MS).get(0).servingDbm == -90,
                "ancient delayed cell report cannot replace current history");
        // Explicit clock correction still uses prune(), as tested above.
        SecurityTimeline sparse = new SecurityTimeline();
        sparse.recordCellReport(now - 3 * SecurityTimeline.BUCKET_MS, 1, 1, 1, -80);
        sparse.recordDrops(now, 1, 10);
        List<SecurityTimeline.Bucket> sparseRows = sparse.snapshot(
                now, SecurityTimeline.MAX_AGE_MS);
        check(sparseRows.size() == 2, "missing reports remain gaps, never filled with zeros");
        check(sparseRows.get(1).cellReports == 0
                && sparseRows.get(1).servingDbm == SecurityTimeline.UNKNOWN_SIGNAL,
                "drop-only bucket has unknown signal rather than inferred zero");
        SecurityTimeline purge = new SecurityTimeline();
        for (int i = 0; i < 8; i++)
            purge.recordDrops(now - (8 - i) * SecurityTimeline.HOUR_MS, 1, 1);
        check(purge.prune(now, 6 * SecurityTimeline.HOUR_MS),
                "retention removes multiple expired buckets");
        check(purge.snapshot(now, 6 * SecurityTimeline.HOUR_MS).size() == 6,
                "six-hour window retains only valid recent buckets");
        purge.clear();
        check("v1\n".equals(purge.encode(now)), "cleared timeline has no persisted bucket rows");
        check(SecurityTimeline.decode(purge.encode(now), now).snapshot(
                now, SecurityTimeline.MAX_AGE_MS).isEmpty(),
                "clear then encode-decode cannot revive deleted observations");
        invalid(() -> SecurityTimeline.decode("v1\n" + "x".repeat(512_001), now));
        invalid(() -> SecurityTimeline.decode("v1\n" + now + ",1,2,3,4,5,6,-90,1\n", now));
        invalid(() -> SecurityTimeline.decode("v1\n" + now + ",1,2,0,0,0,0,-1\n\n", now));
        invalid(() -> late.recordDrops(-1, 0, 0));
        System.out.println("SecurityTimelineTest: " + checks + "/" + checks + " checks passed");
    }
}
