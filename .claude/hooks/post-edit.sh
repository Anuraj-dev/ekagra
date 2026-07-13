#!/usr/bin/env bash
# PostToolUse hook (Edit|Write). Reads the hook JSON on stdin, then:
#   1. Formats/lints the edited file with Biome (auto-fix).
#   2. Re-vendors @ekagra/core into supabase/functions when core changed,
#      so CI's `git diff --exit-code supabase/functions/_vendor` stays green.
# Failures are non-blocking: we never want a formatter hiccup to abort a turn.
set -uo pipefail

root="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
input="$(cat)"

# Extract every file path the tool touched (Edit/Write = one; MultiEdit = one too).
paths="$(printf '%s' "$input" | jq -r '
  [.tool_input.file_path // empty,
   (.tool_input.edits // [] | .[]?.file_path // empty)] | .[]' 2>/dev/null)"

[ -z "$paths" ] && exit 0

did_core=0
while IFS= read -r f; do
  [ -z "$f" ] && continue

  # 1. Biome auto-fix (only for files Biome actually handles; ignore its exit code).
  case "$f" in
    *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.json|*.jsonc)
      (cd "$root" && bunx biome check --write "$f") >/dev/null 2>&1 || true
      ;;
  esac

  # 2. Flag core edits for a single vendor sync at the end.
  case "$f" in
    */packages/core/src/*|packages/core/src/*) did_core=1 ;;
  esac
done <<< "$paths"

if [ "$did_core" = "1" ]; then
  (cd "$root" && ./scripts/sync-core-vendor.sh) >/dev/null 2>&1 || true
  echo '{"systemMessage":"Re-vendored @ekagra/core -> supabase/functions/_vendor (core changed)."}'
fi

exit 0
