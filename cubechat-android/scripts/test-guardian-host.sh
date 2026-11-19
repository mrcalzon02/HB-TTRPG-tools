#!/usr/bin/env bash
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
classes="$(mktemp -d)"
trap 'rm -rf "$classes"' EXIT
javac -encoding UTF-8 --release 17 -d "$classes" \
  "$here/app/src/main/java/org/cubechat/android/CellObservation.java" \
  "$here/app/src/main/java/org/cubechat/android/CellObservationBook.java" \
  "$here/app/src/main/java/org/cubechat/android/GuardianPolicyGate.java" \
  "$here/app/src/main/java/org/cubechat/android/GuardianTrafficPolicy.java" \
  "$here/app/src/main/java/org/cubechat/android/LockdownRecoverySummary.java" \
  "$here/app/src/main/java/org/cubechat/android/GuardianDeviceInventoryText.java" \
  "$here/app/src/main/java/org/cubechat/android/UpdateRunGate.java" \
  "$here/app/src/main/java/org/cubechat/android/LockdownReleaseReport.java" \
  "$here/app/src/main/java/org/cubechat/android/LockdownReleaseJournal.java" \
  "$here/app/src/main/java/org/cubechat/android/ManagedVpnOwnership.java" \
  "$here/tests/CellObservationBookTest.java" \
  "$here/tests/GuardianPolicyGateTest.java" \
  "$here/tests/GuardianTrafficPolicyTest.java" \
  "$here/tests/LockdownRecoverySummaryTest.java" \
  "$here/tests/GuardianDeviceInventoryTextTest.java" \
  "$here/tests/UpdateRunGateTest.java" \
  "$here/tests/LockdownReleaseReportTest.java" \
  "$here/tests/LockdownReleaseJournalTest.java" \
  "$here/tests/ManagedVpnOwnershipTest.java"
java -cp "$classes" org.cubechat.android.CellObservationBookTest
java -cp "$classes" org.cubechat.android.GuardianPolicyGateTest
java -cp "$classes" org.cubechat.android.GuardianTrafficPolicyTest
java -cp "$classes" org.cubechat.android.LockdownRecoverySummaryTest
java -cp "$classes" org.cubechat.android.GuardianDeviceInventoryTextTest
java -cp "$classes" org.cubechat.android.UpdateRunGateTest
java -cp "$classes" org.cubechat.android.LockdownReleaseReportTest
java -cp "$classes" org.cubechat.android.LockdownReleaseJournalTest
java -cp "$classes" org.cubechat.android.ManagedVpnOwnershipTest
bash "$here/scripts/test-lockdown-release-host.sh"
bash "$here/scripts/test-managed-vpn-host.sh"
bash "$here/scripts/test-radioguard-readonly-probe.sh"
