#!/usr/bin/env bash
# RadioGuard preflight: reads device metadata and kernel filesystem capability hints.
# No install, root, network request, radio toggle, cellular operation or emergency procedure.
set -euo pipefail

usage() {
  echo 'Usage: bash radioguard-readonly-probe.sh <ADB_DEVICE_SERIAL>' >&2
  echo 'Select a spare device explicitly; the script does not select or modify phones.' >&2
}

if [[ $# -ne 1 || -z "${1:-}" || ! "$1" =~ ^[A-Za-z0-9_.:-]+$ ]]; then
  usage
  exit 2
fi
serial="$1"
adb_bin="${ADB_BIN:-adb}"
if ! command -v "$adb_bin" >/dev/null 2>&1; then
  echo 'adb not found; install Android Platform Tools first.' >&2
  exit 2
fi
state="$("$adb_bin" -s "$serial" get-state 2>/dev/null | tr -d '\r' || true)"
if [[ "$state" != device ]]; then
  echo 'Selected ADB target is not ready. No probe was performed.' >&2
  exit 1
fi

# Limit the output to printable, bounded text and never query identifying
# subscriber, SIM, contact, MAC, GPS, or device serial fields.
clean() {
  LC_ALL=C tr '\r\n\t' '   ' | LC_ALL=C tr -cd '[:print:]' | cut -c 1-180
}
property() {
  local label="$1" key="$2" value
  value="$("$adb_bin" -s "$serial" shell getprop "$key" 2>/dev/null | clean || true)"
  [[ -n "$value" ]] || value='UNAVAILABLE'
  printf '%-32s %s\n' "$label:" "$value"
}
probe() {
  local label="$1" query="$2" value
  value="$("$adb_bin" -s "$serial" shell "$query" 2>/dev/null | clean || true)"
  [[ -n "$value" ]] || value='UNAVAILABLE'
  printf '%-32s %s\n' "$label:" "$value"
}

cat <<'HEADER'
CubeChat RadioGuard — read-only device feasibility preflight
Selected target: explicitly supplied (serial intentionally not printed)
NO changes to Android, modem, Wi-Fi, Bluetooth, kernel, or emergency services.
No security feature is verified by these basic inventory results.
HEADER
property 'Manufacturer' ro.product.manufacturer
property 'Model' ro.product.model
property 'Device codename' ro.product.device
property 'Hardware/SoC hint' ro.hardware
property 'Android SDK' ro.build.version.sdk
property 'Security patch' ro.build.version.security_patch
property 'Build fingerprint' ro.build.fingerprint
property 'Boot verified state hint' ro.boot.verifiedbootstate
property 'Flash lock state hint' ro.boot.flash.locked
property 'Baseband revision' gsm.version.baseband
probe 'Kernel release' 'uname -r'
probe 'SELinux mode' 'getenforce'
probe 'BPF filesystem mount hint' 'test -d /sys/fs/bpf && echo PRESENT || echo ABSENT'
probe 'BPF config readable' 'test -r /proc/config.gz && echo YES || echo UNKNOWN'
probe 'tc tool available' 'command -v tc >/dev/null 2>&1 && echo YES || echo NO'
probe 'bpftool available' 'command -v bpftool >/dev/null 2>&1 && echo YES || echo NO'
probe 'Network interface names' 'ls /sys/class/net 2>/dev/null'
cat <<'FOOTER'
Kernel BPF support: NOT VERIFIED (filesystem/tool hints are insufficient).
Hardware offload coverage: NOT VERIFIED.
Kernel policy attach points: NOT VERIFIED.
Modem / radio controls: NOT VERIFIED.
Independent priority-release integration: NOT IMPLEMENTED.
Device safe for privileged modifications: NOT ESTABLISHED.
No personal identifiers or radio/call activity intentionally queried.
FOOTER
