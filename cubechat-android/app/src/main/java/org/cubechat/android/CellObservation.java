package org.cubechat.android;

/** An unverified, passive cell observation; never a physical tower identity certificate. */
public final class CellObservation {
    public static final int UNKNOWN = -1;
    public static final long UNKNOWN_LONG = -1L;
    public static final long MAX_CURRENT_AGE_MS = 120_000L;

    public final String technology, mcc, mnc;
    public final long cellId;
    public final int areaCode, physicalCellId, channel, signalDbm;
    public final boolean registered;
    public final long ageMs;

    public CellObservation(String technology, String mcc, String mnc, long cellId,
                           int areaCode, int physicalCellId, int channel, int signalDbm,
                           boolean registered, long ageMs) {
        this.technology = normalizedTechnology(technology);
        this.mcc = digits(mcc);
        this.mnc = digits(mnc);
        this.cellId = cellId >= 0 && cellId != Long.MAX_VALUE ? cellId : UNKNOWN_LONG;
        this.areaCode = sane(areaCode);
        this.physicalCellId = sane(physicalCellId);
        this.channel = sane(channel);
        this.signalDbm = signalDbm >= -160 && signalDbm <= -20 ? signalDbm : UNKNOWN;
        this.registered = registered;
        this.ageMs = ageMs >= 0 ? ageMs : UNKNOWN_LONG;
    }

    private static int sane(int value) {
        return value >= 0 && value != Integer.MAX_VALUE ? value : UNKNOWN;
    }

    private static String digits(String code) {
        if (code == null || code.isEmpty() || code.length() > 3) return "?";
        for (int i = 0; i < code.length(); i++) {
            if (code.charAt(i) < '0' || code.charAt(i) > '9') return "?";
        }
        return code;
    }

    private static String normalizedTechnology(String type) {
        if ("NR".equals(type) || "LTE".equals(type) || "WCDMA".equals(type)
                || "GSM".equals(type) || "CDMA".equals(type) || "TD-SCDMA".equals(type)) return type;
        return "OTHER";
    }

    /** Numeric broadcast identifiers can be copied or replayed by a rogue station. */
    public String identityKey() {
        if (cellId < 0 || areaCode < 0 || "?".equals(mcc) || "?".equals(mnc)) return null;
        return technology + ':' + mcc + ':' + mnc + ':' + areaCode + ':' + cellId;
    }

    public boolean isCurrent() { return ageMs >= 0 && ageMs <= MAX_CURRENT_AGE_MS; }

    public String observedAge() {
        if (ageMs < 0) return "time unavailable";
        if (ageMs < 1_000) return "under 1 second old";
        if (ageMs < 60_000) return (ageMs / 1_000) + " seconds old";
        return (ageMs / 60_000) + " minutes old";
    }

    public String summary() {
        String signal = signalDbm == UNKNOWN ? "signal n/a" : signalDbm + " dBm";
        return technology + " · " + mcc + "-" + mnc
                + " · cell " + (cellId < 0 ? "?" : cellId)
                + " · area " + (areaCode < 0 ? "?" : areaCode)
                + " · PCI " + (physicalCellId < 0 ? "?" : physicalCellId)
                + " · channel " + (channel < 0 ? "?" : channel)
                + " · " + signal + " · " + observedAge();
    }
}
