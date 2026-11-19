package org.cubechat.android;

import android.os.Build;
import android.os.SystemClock;
import android.telephony.CellIdentityCdma;
import android.telephony.CellIdentityGsm;
import android.telephony.CellIdentityLte;
import android.telephony.CellIdentityNr;
import android.telephony.CellIdentityTdscdma;
import android.telephony.CellIdentityWcdma;
import android.telephony.CellInfo;
import android.telephony.CellInfoCdma;
import android.telephony.CellInfoGsm;
import android.telephony.CellInfoLte;
import android.telephony.CellInfoNr;
import android.telephony.CellInfoTdscdma;
import android.telephony.CellInfoWcdma;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/** Converts *reported* Android modem observations; no cell selection or RF commands. */
final class CellSnapshotReader {
    private CellSnapshotReader() { }

    private static long age(CellInfo info, long nowMs) {
        long seen = Build.VERSION.SDK_INT >= 30 ? info.getTimestampMillis() : info.getTimeStamp() / 1_000_000L;
        return seen > 0 && seen <= nowMs ? nowMs - seen : -1;
    }

    private static String operator(int value) {
        return value >= 0 && value <= 999 ? Integer.toString(value) : null;
    }

    private static long identifier(long value) {
        return value >= 0 && value != Long.MAX_VALUE && value != Integer.MAX_VALUE ? value : -1;
    }

    static List<CellObservation> convert(List<CellInfo> records) {
        if (records == null || records.isEmpty()) return Collections.emptyList();
        long nowMs = SystemClock.elapsedRealtime();
        List<CellObservation> result = new ArrayList<>();
        for (CellInfo info : records) {
            if (info == null) continue;
            try {
                final boolean serving = info.isRegistered();
                final long ageMs = age(info, nowMs);
                if (Build.VERSION.SDK_INT >= 29 && info instanceof CellInfoNr) {
                    CellInfoNr entry = (CellInfoNr) info;
                    CellIdentityNr id = (CellIdentityNr) entry.getCellIdentity();
                    result.add(new CellObservation("NR", id.getMccString(), id.getMncString(),
                            identifier(id.getNci()), id.getTac(), id.getPci(), id.getNrarfcn(),
                            entry.getCellSignalStrength().getDbm(), serving, ageMs));
                } else if (info instanceof CellInfoLte) {
                    CellInfoLte entry = (CellInfoLte) info;
                    CellIdentityLte id = entry.getCellIdentity();
                    result.add(new CellObservation("LTE",
                            Build.VERSION.SDK_INT >= 28 ? id.getMccString() : operator(id.getMcc()),
                            Build.VERSION.SDK_INT >= 28 ? id.getMncString() : operator(id.getMnc()),
                            identifier(id.getCi()), id.getTac(), id.getPci(), id.getEarfcn(),
                            entry.getCellSignalStrength().getDbm(), serving, ageMs));
                } else if (info instanceof CellInfoGsm) {
                    CellInfoGsm entry = (CellInfoGsm) info;
                    CellIdentityGsm id = entry.getCellIdentity();
                    result.add(new CellObservation("GSM",
                            Build.VERSION.SDK_INT >= 28 ? id.getMccString() : operator(id.getMcc()),
                            Build.VERSION.SDK_INT >= 28 ? id.getMncString() : operator(id.getMnc()),
                            identifier(id.getCid()), id.getLac(), id.getBsic(), id.getArfcn(),
                            entry.getCellSignalStrength().getDbm(), serving, ageMs));
                } else if (info instanceof CellInfoWcdma) {
                    CellInfoWcdma entry = (CellInfoWcdma) info;
                    CellIdentityWcdma id = entry.getCellIdentity();
                    result.add(new CellObservation("WCDMA",
                            Build.VERSION.SDK_INT >= 28 ? id.getMccString() : operator(id.getMcc()),
                            Build.VERSION.SDK_INT >= 28 ? id.getMncString() : operator(id.getMnc()),
                            identifier(id.getCid()), id.getLac(), id.getPsc(), id.getUarfcn(),
                            entry.getCellSignalStrength().getDbm(), serving, ageMs));
                } else if (Build.VERSION.SDK_INT >= 29 && info instanceof CellInfoTdscdma) {
                    CellInfoTdscdma entry = (CellInfoTdscdma) info;
                    CellIdentityTdscdma id = entry.getCellIdentity();
                    result.add(new CellObservation("TD-SCDMA", id.getMccString(), id.getMncString(),
                            identifier(id.getCid()), id.getLac(), id.getCpid(), id.getUarfcn(),
                            entry.getCellSignalStrength().getDbm(), serving, ageMs));
                } else if (info instanceof CellInfoCdma) {
                    CellInfoCdma entry = (CellInfoCdma) info;
                    CellIdentityCdma id = entry.getCellIdentity();
                    result.add(new CellObservation("CDMA", null, null,
                            identifier(id.getBasestationId()), id.getNetworkId(), id.getSystemId(), -1,
                            entry.getCellSignalStrength().getDbm(), serving, ageMs));
                }
            } catch (RuntimeException ignored) {
                // A malformed/vendor-specific record must not terminate the whole snapshot.
            }
        }
        return Collections.unmodifiableList(result);
    }
}
