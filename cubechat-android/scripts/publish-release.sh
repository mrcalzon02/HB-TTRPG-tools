#!/usr/bin/env bash
# Called after release_manifest.py has verified the APK, signature and manifest.
set -euo pipefail

repo=${GITHUB_REPOSITORY:?}
commit=${GITHUB_SHA:?}
manifest=cubechat-android/release.json
apk=cubechat-android/downloads/CubeChat.apk
tag=$(jq -er .tag "$manifest")
version=$(jq -er .versionName "$manifest")
code=$(jq -er .versionCode "$manifest")
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
upload="$tmp/upload"
readback="$tmp/readback"
mkdir -p "$upload" "$readback"

# Reserve the tag once. A simultaneous publisher or an interrupted run can leave
# a valid tag behind. In that case only the exact same assets may be published.
if [[ -z "$(git ls-remote --refs origin "refs/tags/$tag")" ]]; then
  if ! gh api --method POST "repos/$repo/git/refs" -f ref="refs/tags/$tag" -f sha="$commit" > /dev/null; then
    git ls-remote --refs --exit-code origin "refs/tags/$tag" > /dev/null
  fi
fi
git fetch --no-tags --depth=1 origin "refs/tags/$tag"
git show "FETCH_HEAD:$manifest" | cmp - "$manifest"
git show "FETCH_HEAD:$apk" | cmp - "$apk"
tag_commit=$(git rev-parse 'FETCH_HEAD^{commit}')

# Package only the public build inputs, tests and documentation from the exact tag.
# Uncompressed ZIP entries and UTC commit timestamps make the archive repeatable.
source_zip="$upload/CubeChat-Android-$version-Source.zip"
extra_docs=()
if git cat-file -e "$tag_commit:cubechat-android/DEVELOPMENT_LEDGER.md" 2>/dev/null; then
  extra_docs+=(cubechat-android/DEVELOPMENT_LEDGER.md)
fi
TZ=UTC git archive --format=zip -0 --prefix="CubeChat-Android-$version/" \
  --output="$source_zip" "$tag_commit" shadowrun-binary-cube-engine.js \
  cubechat-android/app/build.gradle cubechat-android/app/src cubechat-android/build.gradle \
  cubechat-android/settings.gradle cubechat-android/gradle cubechat-android/gradlew \
  cubechat-android/gradlew.bat cubechat-android/tests cubechat-android/scripts \
  cubechat-android/README.md cubechat-android/RELEASE_NOTES.md cubechat-android/release.json "${extra_docs[@]}"
git show "$tag_commit:cubechat-android/RELEASE_NOTES.md" > "$upload/RELEASE_NOTES.md"
grep -Fxq "# CubeChat Android $version" "$upload/RELEASE_NOTES.md"
grep -Fxq "Android version code: $code" "$upload/RELEASE_NOTES.md"
cp "$apk" "$manifest" "$upload"
(
  cd "$upload"
  sha256sum CubeChat.apk release.json "${source_zip##*/}" RELEASE_NOTES.md > SHA256SUMS.txt
)
assets=("$upload/CubeChat.apk" "$upload/release.json" "$source_zip" "$upload/RELEASE_NOTES.md" "$upload/SHA256SUMS.txt")

# The authenticated Releases list includes drafts so reruns resume interrupted uploads.
release_id=
get_release() {
  if [[ -n "$release_id" ]]; then
    gh api "repos/$repo/releases/$release_id?read_at=$(date +%s%N)"
    return
  fi
  gh api --paginate "repos/$repo/releases?per_page=100&read_at=$(date +%s%N)" --jq ".[] | select(.tag_name == \"$tag\")" |
    jq -sc 'if length > 1 then error("Multiple releases share this tag") else .[0] end'
}

# GitHub may acknowledge a draft, upload or publish request before GET reflects it.
wait_for_release() {
  local condition=$1 name=${2:-} state delay
  for delay in 0 1 2 4 8 16; do
    if (( delay )); then sleep "$delay"; fi
    state=$(get_release) || return 1
    if jq -e --arg name "$name" "$condition" <<< "$state" > /dev/null; then
      printf '%s\n' "$state"
      return
    fi
  done
  echo "GitHub did not report the expected state for $tag ${name:-release}: $condition" >&2
  return 1
}

release=$(get_release)
prerelease=false
if [[ ${version%%+*} == *-* ]]; then prerelease=true; fi
if [[ "$release" == null ]]; then
  flags=(--draft --latest=false --verify-tag)
  if [[ "$prerelease" == true ]]; then flags+=(--prerelease); fi
  gh release create "$tag" --repo "$repo" --target "$commit" --title "CubeChat Android $version" --notes-file "$upload/RELEASE_NOTES.md" "${flags[@]}"
  release=$(wait_for_release '.id != null')
fi
release_id=$(jq -er .id <<< "$release")

jq -e --arg code "$code" --argjson pre "$prerelease" '
  .id and .prerelease == $pre and (.body | split("\n") | map(rtrimstr("\r")) | index("Android version code: " + $code) != null)
' <<< "$release" > /dev/null
draft=$(jq -r .draft <<< "$release")

for path in "${assets[@]}"; do
  name=${path##*/}
  asset=$(jq -c --arg name "$name" '.assets[] | select(.name == $name)' <<< "$release")
  if [[ -n "$asset" && "$draft" == true && "$(jq -r .state <<< "$asset")" == starter && "$(jq -r .size <<< "$asset")" == 0 ]]; then
    # GitHub can leave an empty starter after an interrupted asset upload.
    gh api --method DELETE "repos/$repo/releases/assets/$(jq -r .id <<< "$asset")"
    asset=
  fi
  if [[ -z "$asset" ]]; then
    if [[ "$draft" != true ]]; then echo "Published release is missing $name" >&2; exit 1; fi
    gh release upload "$tag" "$path" --repo "$repo"
    release=$(wait_for_release 'any(.assets[]?; .name == $name and .state == "uploaded")' "$name")
    asset=$(jq -ce --arg name "$name" '.assets[] | select(.name == $name)' <<< "$release")
  fi
  digest="sha256:$(sha256sum "$path" | cut -d ' ' -f1)"
  size=$(wc -c < "$path")
  id=$(jq -er --arg digest "$digest" --argjson size "$size" '
    select(.state == "uploaded" and .size == $size and .digest == $digest) | .id
  ' <<< "$asset")
  gh api -H 'Accept: application/octet-stream' "repos/$repo/releases/assets/$id" > "$readback/$name"
  cmp "$path" "$readback/$name"
done

if [[ "$draft" == true ]]; then
  gh release edit "$tag" --repo "$repo" --draft=false --latest=false
fi
wait_for_release '.draft == false' | jq -er .html_url
