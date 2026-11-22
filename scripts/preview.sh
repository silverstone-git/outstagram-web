#!/usr/bin/env bash
# Low-RAM dev loop helper: nothing is built locally; CI does the work.
#   scripts/preview.sh shots  [run-id]  -> download screenshots of the latest run on this branch
#   scripts/preview.sh deploy [run-id]  -> publish that run's dist to https://aryan.cfd/outstagram/
set -euo pipefail
cmd="${1:-shots}"; run="${2:-}"
repo="silverstone-git/outstagram-web"
branch="$(git rev-parse --abbrev-ref HEAD)"
if [ -z "$run" ]; then
  run="$(gh run list -R "$repo" -b "$branch" -w ci -L 1 --json databaseId,status -q '.[0].databaseId')"
  gh run watch -R "$repo" "$run" --exit-status >/dev/null || { echo "run $run failed"; gh run view -R "$repo" "$run" --log-failed | tail -40; exit 1; }
fi
out="${PREVIEW_TMP:-/tmp/outstagram-preview}/$run"
rm -rf "$out"; mkdir -p "$out"
case "$cmd" in
  shots)
    gh run download -R "$repo" "$run" -n screenshots -D "$out"
    echo "$out"; cat "$out/report.json" | head -40 ;;
  deploy)
    gh run download -R "$repo" "$run" -n dist -D "$out"
    dest="${PREVIEW_DEST:-/home/cyto/portfolio/outstagram}"
    # swap directories so visitors never see a half-copied build
    rm -rf "$dest.new" "$dest.old"; cp -r "$out" "$dest.new"
    [ -d "$dest" ] && mv "$dest" "$dest.old"; mv "$dest.new" "$dest"; rm -rf "$dest.old"
    echo "deployed run $run -> https://aryan.cfd/outstagram/" ;;
  *) echo "usage: $0 shots|deploy [run-id]"; exit 2 ;;
esac
