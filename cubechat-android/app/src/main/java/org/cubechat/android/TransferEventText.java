package org.cubechat.android;

/**
 * Local summary of a changed file-transfer state. This only describes events
 * already recorded by the attachment protocol; no notifications are sent to
 * other contacts or off-device services.
 */
final class TransferEventText {
    private TransferEventText() { }

    /**
     * Only newly observed terminal changes should show a notice. One special
     * case is an incoming offer automatically declined during the storage
     * preflight: it may arrive already DECLINED without ever appearing OFFERED.
     * Do not replay older historic file events when first opening a mailbox.
     */
    static boolean shouldNotify(boolean baselineLoaded, String previousStatus,
                                String currentStatus, boolean outgoing, String reason) {
        if (!baselineLoaded) return false;
        if (previousStatus == null)
            return !outgoing && "DECLINED".equals(currentStatus)
                    && "not_enough_storage".equals(reason);
        if (previousStatus.equals(currentStatus)) return false;
        return "COMPLETE".equals(currentStatus) || "DECLINED".equals(currentStatus)
                || "CANCELED".equals(currentStatus);
    }

    static String changed(String status, boolean outgoing, String filename, String reason) {
        if ("COMPLETE".equals(status))
            return (outgoing ? "File delivered: " : "File received: ") + filename(filename);
        if (!"DECLINED".equals(status) && !"CANCELED".equals(status))
            return null;
        if ("not_enough_storage".equals(reason))
            return outgoing
                    ? "File rejected: recipient has insufficient storage"
                    : "Incoming file rejected: insufficient local storage";
        return ("DECLINED".equals(status) ? "File declined: " : "Transfer canceled: ")
                + filename(filename);
    }

    private static String filename(String name) {
        if (name == null || name.isEmpty()) return "attachment";
        StringBuilder clean = new StringBuilder();
        int count = 0;
        for (int offset = 0; offset < name.length() && count < 100;) {
            int cp = name.codePointAt(offset);
            offset += Character.charCount(cp);
            if (Character.isISOControl(cp) || Character.getType(cp) == Character.FORMAT
                    || cp == 0x2028 || cp == 0x2029) continue;
            clean.appendCodePoint(cp);
            count++;
        }
        String result = clean.toString().trim();
        return result.isEmpty() ? "attachment" : result;
    }
}
