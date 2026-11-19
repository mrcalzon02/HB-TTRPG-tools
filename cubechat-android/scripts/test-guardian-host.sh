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
  "$here/tests/CellObservationBookTest.java" \
  "$here/tests/GuardianPolicyGateTest.java" \
  "$here/tests/GuardianTrafficPolicyTest.java" \
  "$here/tests/LockdownRecoverySummaryTest.java"
java -cp "$classes" org.cubechat.android.CellObservationBookTest
java -cp "$classes" org.cubechat.android.GuardianPolicyGateTest
java -cp "$classes" org.cubechat.android.GuardianTrafficPolicyTest
java -cp "$classes" org.cubechat.android.LockdownRecoverySummaryTest
