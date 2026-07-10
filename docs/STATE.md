# ekagra — State
> Focus-first life-management app: goal-bound Pomodoro synced across Expo, web, CLI, and an ESP8266 desk companion. · Last checkpoint: 2026-07-10 (17:14)

## 🚧 In progress / next
- **PR #21 (Phase 6 backend, issue #7 backend half)** — review-fixed and pushed (head 1c12bd4); CI running via manual `gh workflow run ci.yml --ref feat/phase-6-motivation-backend` (run 29090318463) because `pull_request` synchronize events stopped firing on that branch (GitHub hiccup — if it recurs, dispatch manually or close/reopen won't help). **When green: merge #21, delete branch, remove worktree `.claude/worktrees/phase-6-backend`.** If the pgTAP job fails, the SQL is in supabase/migrations/20260710040000_phase_6_motivation.sql — desk-checked only, never run locally.
- **Then: Phase 6 UI half** — web+mobile screens for rates rings / streak / nudges / welcome-back / Crew leaderboard + friends mgmt, consuming `/motivation` + `/friends` + `weekly_leaderboard` (contract in packages/core/src/api.ts). Dispatch: codex `-m gpt-5.6-luna` (heavy frontend). New worktree off fresh main.
- **Then: Phase 7 insights (issue #8)** — 7a basics mostly exist; 7b weekly review + estimate-vs-actual; 7c correlations. Backend SQL: Sol; UI: Luna/Opus.
- Merged this session: PR #19 firmware (issue #5 ✅), PR #20 rituals (issue #6 ✅), PR #22 CLI (issue #9 ✅) — close those issues if GitHub didn't auto-close.
- Manual (Raja): device-test Expo app; add NodeMCU push button; flash firmware/ per firmware/MANUAL-CHECKLIST.md.

## Status
- Phases 0–5 + 8 merged to main; Phase 6 backend on PR #21 (review-fixed, awaiting CI/merge).
- Phase 4 firmware: PlatformIO nodemcuv2 thin client (3s poll, x-device-token, scrolling LCD, buzzer, debounced button, offline countdown + reconcile); portable logic host-tested via g++ harness under bun test.
- Phase 5 rituals: user-configurable cue times (mobile notifications, web in-app banners), plan-vs-actual on Insights via day_records reads, plan→timer shortlist verified.
- Phase 8 CLI: `ekagra capture|plan|start|pause|resume|done|abandon|today|week|login|logout|whoami`; GoTrue auth persisted ~/.config/ekagra (0600, memoized refresh); live countdown reusing core engine (poll + 15s reconcile); 33 unit tests + CI smoke in heavy job.
- Phase 6 backend (PR #21): rolling 7/30d rates, streak walking consecutive UTC days (forgiven counts, unforgiven miss breaks), atomic targeted forgiveness (1/ISO-week, most recent eligible miss), never-miss-twice + days-silent/welcome-back signals, friendships (cap 12 via ordered advisory locks) + /friends + /motivation fns, aggregates-only weekly leaderboard, pgTAP incl. privacy assertion.
- CI green on main (bun test ~94 incl. firmware host + CLI; heavy job: migrations + pgTAP + phase-2 smoke + CLI smoke).

## Architecture map
- Web -> apps/web/src · Mobile -> apps/mobile/src (cue prefs src/lib/cuePrefs.ts, notifications src/lib/notifications.ts)
- CLI -> apps/cli/src (auth/, api/client.ts, render/live.ts, commands/)
- Timer engine + API types -> packages/core/src/{index,api}.ts (vendored: supabase/functions/_vendor/core; sync scripts/sync-core-vendor.sh — CI enforces)
- Edge fns -> supabase/functions/* (+ friends, motivation on PR #21) · Migrations -> supabase/migrations/ · pgTAP -> supabase/tests/
- Firmware -> firmware/ (src/ekagra_logic.* portable, src/main.cpp shell, host-tests.test.ts)

## Stack & run
- Bun monorepo · Expo + Vite/React + bun CLI · Supabase · ESP8266 (PlatformIO).
- Test: `bun test` local; heavy suites CI-only (save-RAM rule).

## Key decisions (top 5)
- Codex model ids: fully-qualified `-m gpt-5.6-sol|terra|luna` work on this ChatGPT account; short ids 400-reject. Use codex extensively ONLY through ~2026-07-11 (reset window), then back to strategic-only (Plus quota).
- Subagent fix-cycle cap: max ~2 cycles per agent, then fresh spawn or higher effort (Raja rule — resumed transcripts get expensive, not smarter).
- Phase 6 time semantics pinned to UTC everywhere; per-user timezones deferred (decisions.md).
- Leaderboard/views: aggregates only, bigint contract on earned_blocks (phase_0 pgTAP type-checks it).
- Hard-block enforced client+server; honest minutes vs earned blocks (only blocks feed rates/leaderboard).

## Gotchas
- Biome ignores `**/.claude` — `bun run lint` inside a worktree checks 0 files; lint with `bunx biome check <paths>` on touched files; CI covers the real checkout.
- pgTAP: create fixtures as superuser BEFORE `set local role authenticated` (authenticated can't write day_records); wrap RLS asserts in role switch; no data-modifying CTEs.
- Recreating a view with changed column types breaks phase_0 type asserts (integer vs bigint) — keep view contracts.
- codex sandbox can't `git commit` in worktrees (read-only .git lock) — driver commits after verifying; codex may also rewrite docs/STATE.md — revert doc noise before committing.
- device-poll/device-action: verify_jwt=false, x-device-token only. service_role grants explicit. Leaderboard privacy: no task titles/reflections to friends.
- Old personal pomodoro (~/Anuraj-Dev/Pomodoro_timer): has hardcoded Notion token + WiFi creds in the .ino — warn Raja before it's ever pushed public. UX ideas worth stealing: distinct completion melodies per phase, "Growth:" label, high-friction cancel gesture.
- Evidence base in PRD #10 — don't re-derive.
