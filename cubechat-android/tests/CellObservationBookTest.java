package org.cubechat.android;

import java.util.Arrays;
import java.util.Collections;
import java.util.Map;

/** Offline host smoke tests; no Android framework, modem, location or radio traffic. */
public final class CellObservationBookTest {
    private static int assertions;
    private static void check(boolean condition, String title) {
        assertions++;
        if (!condition) throw new AssertionError(title);
    }
    private static CellObservation cell(long id, long ageMs, boolean registered) {
        return new CellObservation("LTE", "310", "260", id, 4152, 117, 1800, -88, registered, ageMs);
    }

    public static void main(String[] ignored) {
        CellObservationBook book = new CellObservationBook();
        check(book.size() == 0, "empty book");
        check(book.record(null, 1000).isEmpty(), "null input");
        check(book.record(Collections.emptyList(), 1000).isEmpty(), "empty snapshot");
        check(book.record(Arrays.asList(cell(8, 0, true)), -1).isEmpty(), "negative clock");
        Map<String, CellObservationBook.Evidence> first = book.record(Arrays.asList(cell(8, 100, true)), 200_000);
        check(first.size() == 1 && book.size() == 1, "one unique cell");
        check(book.find(cell(8, 0, false)).observations == 1, "identity independent of registered bit");
        book.record(Arrays.asList(cell(8, 100, true), cell(8, 100, false)), 200_000);
        check(book.find(cell(8, 0, true)).observations == 1, "reused timestamp must not inflate seniority");
        book.record(Arrays.asList(cell(8, 99, true)), 200_010);
        check(book.find(cell(8, 0, true)).observations == 1, "rapid refresh not new observation");
        book.record(Arrays.asList(cell(8, 0, true)), 220_000);
        check(book.find(cell(8, 0, true)).observations == 2, "later modem observation counts");
        book.record(Arrays.asList(cell(8, 0, true)), 800_000);
        check(book.find(cell(8, 0, true)).repeatedThisSession, "three distinct readings over ten minutes");
        check(book.find(cell(8, 0, true)).label().contains("still unverified"), "seniority not physical trust");
        book.record(Arrays.asList(cell(99, 120_001, false)), 900_000);
        check(book.find(cell(99, 0, false)) == null, "stale observation cannot establish history");
        book.record(Arrays.asList(cell(99, -1, false)), 900_000);
        check(book.find(cell(99, 0, false)) == null, "unknown timestamp cannot establish history");
        CellObservation unknown = new CellObservation("LTE", "310", "260", Integer.MAX_VALUE,
                Integer.MAX_VALUE, 0, 0, 500, true, 0);
        check(unknown.identityKey() == null && unknown.signalDbm == -1, "Android unavailable sentinel normalized");
        check(book.record(Arrays.asList(unknown), 900_000).isEmpty(), "missing identity does not pollute baseline");
        CellObservation malformedOperator = new CellObservation("NR", "3O0", "260", 42, 5, 0, 1, -85, true, 0);
        check(malformedOperator.identityKey() == null, "malformed operator skipped");
        CellObservation noAge = cell(1, -1, true);
        check(!noAge.isCurrent() && noAge.observedAge().contains("unavailable"), "unknown age reported");
        check(cell(1, 0, true).isCurrent() && cell(1, 120_000, true).isCurrent(), "freshness boundary");
        check(!cell(1, 120_001, true).isCurrent(), "freshness cutoff");
        for (int i = 0; i < 320; i++) book.record(Arrays.asList(cell(1000L + i, 0, false)), 1_100_000 + i * 20_000L);
        check(book.size() == CellObservationBook.MAX_IDENTITIES, "memory bound");
        check(book.find(cell(1000, 0, false)) == null, "oldest evicted");
        check(book.find(cell(1319, 0, false)) != null, "newest retained");
        book.clear();
        check(book.size() == 0, "clear history");
        System.out.println("PASS CellObservationBookTest: " + assertions + " assertions; no modem activity");
    }
}
