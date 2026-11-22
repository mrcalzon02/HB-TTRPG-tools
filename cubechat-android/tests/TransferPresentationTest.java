package org.cubechat.android;

/** No Android, file content, networking, or device activity. */
public final class TransferPresentationTest {
    private static int checks;
    private static void check(boolean condition, String message) {
        checks++;
        if (!condition) throw new AssertionError(message);
    }

    private static void progress() {
        check(TransferProgress.boundedBytes(-1, 500) == 0, "negative progress clamped");
        check(TransferProgress.boundedBytes(600, 500) == 500, "overrun progress clamped");
        check(TransferProgress.boundedBytes(25, 0) == 0, "empty transfer has no bytes");
        check(TransferProgress.percent(0, 200) == 0, "empty progress is zero percent");
        check(TransferProgress.percent(50, 200) == 25, "quarter transfer");
        check(TransferProgress.percent(199, 200) == 99, "near completion");
        check(TransferProgress.percent(200, 200) == 100, "all bytes transferred");
        check(TransferProgress.percent(999, 200) == 100, "overrun cannot exceed 100 percent");
        check(TransferProgress.percent(-1, 200) == 0, "negative count cannot show negative percent");
        check(TransferProgress.percent(123, 0) == -1, "zero-length file has no percent");
        check(TransferProgress.percent(123, -1) == -1, "invalid file size has no percent");
        check(TransferProgress.percent(Long.MAX_VALUE - 1, Long.MAX_VALUE) == 99,
                "enormous incomplete transfer cannot show 100 percent");
        check(TransferProgress.progressPermille(Long.MAX_VALUE - 1, Long.MAX_VALUE) == 999,
                "enormous incomplete transfer cannot fill the progress bar");
        check(TransferProgress.percent(1L << 53, (1L << 53) + 1) == 99,
                "floating-point precision loss cannot imply all bytes arrived");
        check(" · 99%".equals(TransferProgress.percentSuffix(
                Long.MAX_VALUE - 1, Long.MAX_VALUE)),
                "summary matches exact incomplete byte count");
        check(TransferProgress.percent(Long.MAX_VALUE, Long.MAX_VALUE) == 100,
                "large integers never overflow progress");
        check(TransferProgress.percent(Long.MAX_VALUE - 4, Long.MAX_VALUE) <= 100,
                "near-long-limit progress never overflows");
        check(TransferProgress.progressPermille(55, 200) == 275,
                "detail progress bar retains tenths of percent");
        check(TransferProgress.progressPermille(500, 500) == 1000, "full bar");
        check(TransferProgress.progressPermille(-1, 500) == 0, "bar negative count clamped");
        check(TransferProgress.progressPermille(1, 0) == -1, "bar unknown for empty file");
        check(" · 25%".equals(TransferProgress.percentSuffix(50, 200)),
                "consistent summary percentage");
        check("".equals(TransferProgress.percentSuffix(10, 0)),
                "zero-length transfer shows no percentage");
    }

    private static void status() {
        check("Sending".equals(TransferProgress.acceptedStatus(
                true,true,true,true,false,false,15,50)), "outgoing sends");
        check("Receiving".equals(TransferProgress.acceptedStatus(
                false,true,true,true,false,false,15,50)), "incoming receives");
        check("Awaiting delivery confirmation".equals(TransferProgress.acceptedStatus(
                true,true,true,true,false,false,50,50)),
                "sent bytes are not proof of final delivery");
        check("Verifying received file".equals(TransferProgress.acceptedStatus(
                false,true,true,true,false,false,50,50)),
                "received bytes are not proof of hash verification");
        check("Paused".equals(TransferProgress.acceptedStatus(
                true,true,true,true,true,false,50,50)),
                "explicit local pause precedes receipt state");
        check("Paused by contact".equals(TransferProgress.acceptedStatus(
                true,true,true,true,false,true,50,50)),
                "peer pause visible");
        check("Open conversation to resume".equals(TransferProgress.acceptedStatus(
                false,false,true,true,false,false,10,50)),
                "inactive conversation must not claim transfer");
        check("Waiting for connection".equals(TransferProgress.acceptedStatus(
                true,true,false,true,false,false,10,50)),
                "offline transfer not sending");
        check("Waiting for file support".equals(TransferProgress.acceptedStatus(
                true,true,true,false,false,false,10,50)),
                "missing peer capability not sending");
        check("Sending".equals(TransferProgress.acceptedStatus(
                true,true,true,true,false,false,0,0)),
                "empty accepted file does not falsely claim verified receipt");
    }

    private static void events() {
        check("File delivered: report.pdf".equals(TransferEventText.changed(
                "COMPLETE", true, "report.pdf", "")), "outgoing completion");
        check("File received: report.pdf".equals(TransferEventText.changed(
                "COMPLETE", false, "report.pdf", "")), "incoming completion");
        check("File rejected: recipient has insufficient storage".equals(
                TransferEventText.changed("DECLINED", true, "report.pdf", "not_enough_storage")),
                "sender sees recipient storage reason");
        check("Incoming file rejected: insufficient local storage".equals(
                TransferEventText.changed("DECLINED", false, "report.pdf", "not_enough_storage")),
                "recipient sees local storage reason");
        check("Transfer canceled: notes.txt".equals(TransferEventText.changed(
                "CANCELED", true, "notes.txt", "")), "cancellation");
        check("File declined: notes.txt".equals(TransferEventText.changed(
                "DECLINED", true, "notes.txt", "")), "ordinary refusal");
        check(TransferEventText.changed("ACCEPTED", true, "notes.txt", "") == null,
                "progress changes do not create a completion notification");
        check(TransferEventText.changed("OFFERED", false, "notes.txt", "") == null,
                "an offer is not a terminal notification");
        check("File received: report.txt".equals(TransferEventText.changed(
                "COMPLETE", false, "report.txt\n\r", "")),
                "newlines cannot create fake second notifications");
        check("File received: report.txt".equals(TransferEventText.changed(
                "COMPLETE", false, "report.\u202Etxt", "")),
                "bidirectional formatting removed from notification");
        check("File received: attachment".equals(TransferEventText.changed(
                "COMPLETE", false, null, "")), "missing filename has safe fallback");
        check("File received: attachment".equals(TransferEventText.changed(
                "COMPLETE", false, "\n\u202E", "")), "unprintable filename has safe fallback");
        String veryLong = "🐟".repeat(180);
        String event = TransferEventText.changed("COMPLETE", false, veryLong, "");
        String name = event.substring("File received: ".length());
        check(name.codePointCount(0, name.length()) <= 100,
                "notification filename bounded in Unicode codepoints");
        check(!Character.isHighSurrogate(name.charAt(name.length() - 1)),
                "filename cannot end with half a surrogate pair");
    }

    private static void notificationTransitions() {
        // Duplicate/out-of-order snapshots must not resurrect terminal history.
        for (String terminal : new String[] {"CANCELED", "DECLINED", "COMPLETE"}) {
            for (String late : new String[] {"ACCEPTED", "COMPLETE", "DECLINED", "CANCELED"}) {
                for (boolean outgoing : new boolean[] {false, true}) {
                    check(!TransferEventText.shouldNotify(true, terminal, late, outgoing, ""),
                            "terminal " + terminal + " cannot announce late " + late);
                }
            }
        }
        check(!TransferEventText.shouldNotify(false, null, "DECLINED", false,
                "not_enough_storage"), "opening a mailbox does not replay historical failures");
        check(TransferEventText.shouldNotify(true, null, "DECLINED", false,
                "not_enough_storage"), "new preflight refusal is visible even without OFFERED state");
        check(!TransferEventText.shouldNotify(true, null, "DECLINED", true,
                "not_enough_storage"), "new outgoing history does not invent an alert");
        check(!TransferEventText.shouldNotify(true, null, "DECLINED", false,
                "user_declined"), "new ordinary declined history does not invent an alert");
        check(!TransferEventText.shouldNotify(true, null, "COMPLETE", false, ""),
                "newly loaded old completion does not trigger alert");
        check(TransferEventText.shouldNotify(true, "OFFERED", "DECLINED", true,
                "not_enough_storage"), "existing outgoing offer rejection is surfaced");
        check(TransferEventText.shouldNotify(true, "ACCEPTED", "COMPLETE", false,
                ""), "completed active transfer creates a notification");
        check(TransferEventText.shouldNotify(true, "OFFERED", "CANCELED", false,
                ""), "canceled offer creates a notification");
        check(!TransferEventText.shouldNotify(true, "DECLINED", "DECLINED", false,
                "not_enough_storage"), "unchanged refused transfer does not repeat notification");
        check(!TransferEventText.shouldNotify(true, "OFFERED", "ACCEPTED", false,
                ""), "acceptance alone is not a terminal notification");
        check(!TransferEventText.shouldNotify(true, "ACCEPTED", "UNKNOWN", false,
                ""), "unrecognized state cannot announce terminal result");
    }

    /**
     * The formatter sees ACCEPTED snapshots, not authenticated receipts.
     * Repeated full-byte snapshots after pause/reconnect/retry must therefore
     * remain pending for either direction until the protocol says COMPLETE.
     */
    private static void unconfirmedReceiptAcrossInterruptions() {
        for (boolean outgoing : new boolean[] {true, false}) {
            String pending = outgoing
                    ? "Awaiting delivery confirmation" : "Verifying received file";
            String active = outgoing ? "Sending" : "Receiving";
            check(pending.equals(TransferProgress.acceptedStatus(
                    outgoing, true, true, true, false, false, 129, 128)),
                    "overrun bytes alone cannot prove delivery in either direction");
            check("Paused".equals(TransferProgress.acceptedStatus(
                    outgoing, true, true, true, true, false, 129, 128)),
                    "local pause overrides an unverified full-byte snapshot");
            check("Paused by contact".equals(TransferProgress.acceptedStatus(
                    outgoing, true, true, true, false, true, 129, 128)),
                    "peer pause overrides an unverified full-byte snapshot");
            check("Open conversation to resume".equals(TransferProgress.acceptedStatus(
                    outgoing, false, true, true, false, false, 129, 128)),
                    "inactive conversation does not claim delivery");
            check("Waiting for connection".equals(TransferProgress.acceptedStatus(
                    outgoing, true, false, true, false, false, 129, 128)),
                    "reconnection is not a delivery receipt");
            check("Waiting for file support".equals(TransferProgress.acceptedStatus(
                    outgoing, true, true, false, false, false, 129, 128)),
                    "peer capability failure is not a delivery receipt");
            check(pending.equals(TransferProgress.acceptedStatus(
                    outgoing, true, true, true, false, false, 129, 128)),
                    "resume after interruption stays unverified at full bytes");
            check(" · 100%".equals(TransferProgress.percentSuffix(129, 128)),
                    "overrun summary is clamped to 100 percent while receipt pending");
            check(TransferProgress.progressPermille(129, 128) == 1000,
                    "overrun progress bar is clamped while receipt pending");
            check(!TransferEventText.shouldNotify(true, "ACCEPTED", "ACCEPTED",
                    outgoing, ""), "duplicate accepted snapshots never announce completion");
            check(TransferEventText.changed("ACCEPTED", outgoing, "retry.txt", "") == null,
                    "unverified snapshots cannot generate delivered notices");
            check(active.equals(TransferProgress.acceptedStatus(
                    outgoing, true, true, true, false, false, 1, 128)),
                    "a retried partial byte count resumes transfer display");
            check(pending.equals(TransferProgress.acceptedStatus(
                    outgoing, true, true, true, false, false, 500, 128)),
                    "retry reaching full bytes still requires receipt");
            check(active.equals(TransferProgress.acceptedStatus(
                    outgoing, true, true, true, false, false, 500, 0)),
                    "unknown total never invents receipt state");
            check(TransferProgress.percent(500, 0) == -1,
                    "unknown total has no numeric percent on retry");
            check("".equals(TransferProgress.percentSuffix(500, -1)),
                    "invalid total has no misleading percentage suffix");
            check(TransferProgress.percent(-7, 128) == 0,
                    "retry cannot show a negative percent");
            check(TransferProgress.progressPermille(-7, 128) == 0,
                    "retry cannot show a negative progress bar");
            check(TransferEventText.shouldNotify(true, "ACCEPTED", "COMPLETE",
                    outgoing, ""), "only an actual COMPLETE transition may announce delivery");
        }
    }

    public static void main(String[] args) {
        progress();
        status();
        unconfirmedReceiptAcrossInterruptions();
        events();
        notificationTransitions();
        System.out.println("TransferPresentation: " + checks
                + " offline checks passed (no network, files or device actions)");
    }
}
