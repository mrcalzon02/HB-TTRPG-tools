#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "$0")/environment.sh"
cd "$setup_root/project"
exec tools/build/build "$@"
