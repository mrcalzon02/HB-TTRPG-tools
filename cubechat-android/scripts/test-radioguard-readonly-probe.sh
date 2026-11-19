#!/usr/bin/env bash
# Mocked ADB inventory only. No device, network, telephony, or radio interactions.
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mock="$(mktemp)"
trap 'rm -f "$mock"' EXIT
cat > "$mock" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
if [[ $# -lt 3 || "$1" != -s || "$2" != MOCK123 ]]; then exit 20; fi
shift 2
case "$1" in
  get-state) echo device ;;
  shell)
    shift
    case "$1" in
      getprop)
        case "$2" in
          ro.product.model) echo MockPhone ;;
          ro.build.version.sdk) echo 35 ;;
          *) echo 'lab-only' ;;
        esac
        ;;
      'uname -r') echo 6.1-mock ;;
      'getenforce') echo Enforcing ;;
      'test -d /sys/fs/bpf && echo PRESENT || echo ABSENT') echo PRESENT ;;
      'test -r /proc/config.gz && echo YES || echo UNKNOWN') echo UNKNOWN ;;
      'command -v tc >/dev/null 2>&1 && echo YES || echo NO') echo NO ;;
      'command -v bpftool >/dev/null 2>&1 && echo YES || echo NO') echo NO ;;
      'ls /sys/class/net 2>/dev/null') echo wlan0 ;;
      *) echo "Unexpected device command" >&2; exit 30 ;;
    esac
    ;;
  *) echo "Unexpected ADB action" >&2; exit 40 ;;
esac
MOCK
chmod 0700 "$mock"
bash -n "$root/radioguard-readonly-probe.sh"
report="$(ADB_BIN="$mock" bash "$root/radioguard-readonly-probe.sh" MOCK123)"
[[ "$report" == *'Model:'*MockPhone* ]]
[[ "$report" == *'Kernel release:'*6.1-mock* ]]
[[ "$report" == *'Kernel BPF support: NOT VERIFIED'* ]]
[[ "$report" == *'Independent priority-release integration: NOT IMPLEMENTED'* ]]
[[ "$report" != *'MOCK123'* ]]
if ADB_BIN="$mock" bash "$root/radioguard-readonly-probe.sh" >/dev/null 2>&1; then
  echo 'Unselected device was accepted' >&2; exit 1
fi
if ADB_BIN="$mock" bash "$root/radioguard-readonly-probe.sh" 'MOCK123;evil' >/dev/null 2>&1; then
  echo 'Invalid selector was accepted' >&2; exit 1
fi
echo 'RadioGuard read-only ADB probe: 7 host-only assertions passed; no device commands executed'
