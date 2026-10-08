#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "$0")/environment.sh"
cd "$setup_root/project"
for project in Content.Server Content.Client; do
 dotnet build "$project" --configuration Tools --maxcpucount:1 -p:UseSharedCompilation=false
done
