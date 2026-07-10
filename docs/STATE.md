# ekagra — State
> Focus-first life-management app: goal-bound Pomodoro synced across Expo, web, CLI, and an ESP8266 desk companion. · Last checkpoint: 2026-07-10 (23:45)

## 🚧 In progress / next
- **State-refresh batch** — `daily_activity` migration + pgTAP coverage added locally; next verify the pgTAP suite in CI, then commit through the owning branch (checkout currently reports `main` despite the staged batch).
- **App icon/logo** — generate ekagra logo (codex Luna designs SVG → render PNG), wire into Expo app config (apps/mobile/app.json icon/adaptive-icon/splash).
- **Then: build APK + install on Raja's phone via adb** (device already connected). Expo: likely `eas build` local or `npx expo run:android` / gradle assembleRelease; verify which works offline.
- **Then: live device testing over adb** — Raja logs in manually; agent drives the app, seeds test data (tasks/sessions/friends), verifies Phase 3–7 flows on-device (Crew, Insights, nudges), fixes bugs found, then deletes all seeded data.
- Manual (Raja): NodeMCU push button; flash firmware/ per firmware/MANUAL-CHECKLIST.md.

## Status
- `daily_activity` now supplies one auth-scoped current-UTC-day row for both DataProviders, with ended-session honest minutes kept separate from earned blocks; local `bun test` is 124 pass.
- **All phases 0–8 merged to main.** Issues #5–#9 closed; only #10 (PRD tracking) open.
- This session: PR #21 (phase 6 backend) fixed (pgTAP uuid casts) + merged; PR #23 (phase 6 UI: rate rings, streak, nudges, Crew friends+leaderboard, web+mobile) merged; PR #24 (phase 7 backend: identity_role_hours, distraction_breakdown, weekly_review, ritual_correlations views + pgTAP) merged; PR #25 (phase 7 UI: weekly review, role hours, distraction breakdown, 7x24 focus heatmap, ritual-correlation cards) merged.
- CI green on main (bun test 122; heavy job: migrations + pgTAP phases 0/2/6/7 + smokes).

## Architecture map
- Web -> apps/web/src (screens/, lib/api.ts has motivationApi/friendsApi/leaderboardApi + insights view selects, components/Motivation.tsx)
- Mobile -> apps/mobile/src (mirrors web 1:1; nav/RootNavigator.tsx)
- CLI -> apps/cli/src · Timer engine + API types -> packages/core/src/{index,api}.ts (vendored to supabase/functions/_vendor/core; scripts/sync-core-vendor.sh, CI-enforced)
- Edge fns -> supabase/functions/* · Migrations -> supabase/migrations/ (latest 20260710050000_phase_7_insights.sql) · pgTAP -> supabase/tests/
- Firmware -> firmware/ (portable logic host-tested via bun test)
- Insights data = direct auth-scoped view selects (no edge fn): daily_activity, rolling_rates, focus_hours_heatmap, estimate_vs_actual, identity_role_hours, distraction_breakdown, weekly_review, ritual_correlations, weekly_leaderboard.

## Stack & run
- Bun monorepo · Expo + Vite/React + bun CLI · Supabase · ESP8266 (PlatformIO).
- Test: `bun test` local; heavy suites CI-only (save-RAM rule).

## Key decisions (top 5)
- Codex quota: use extensively ONLY through ~2026-07-11 (reset window), then strategic-only. Fully-qualified `-m gpt-5.6-sol|terra|luna` ids.
- All analytics are SQL views (issue #8 hard rule) — auth.uid()-scoped views + grants, no reporting code in edge fns/app.
- UTC everywhere for day/week boundaries; per-user timezones deferred.
- Honest minutes (durations) vs earned blocks (achievement metrics) — never conflate.
- Subagent fix-cycle cap ~2, then fresh spawn/higher effort.

## Gotchas
- pgTAP/SQL: ALWAYS cast uuid/uuid[] literals in insert-select unions (`'...'::uuid`) — burned twice. Chained `using (week_start)` joins are ambiguous — use explicit `on`.
- Fixtures as superuser BEFORE `set local role authenticated`; no data-modifying CTEs; view column types are contracts (bigint vs int).
- Biome ignores `**/.claude` — `bun run lint` in worktrees checks 0 files; use `bunx biome check <paths>` AND `--write` before pushing (formatter failures broke PR #23 CI once).
- GitHub `pull_request` synchronize events flaked once on PR #21 (close/reopen didn't help; manual `gh workflow run` did). Recovered on later pushes.
- codex sandbox can't `git commit` in worktrees — driver commits; codex verification often blocked by missing node_modules in fresh worktrees (`bun install` first).
- device-poll/device-action: verify_jwt=false, x-device-token only. Leaderboard/friends UI: only display_name + earned_blocks (privacy, pgTAP-tested).
- Old personal pomodoro (~/Anuraj-Dev/Pomodoro_timer) has hardcoded Notion token + WiFi creds in .ino — warn before pushing public.
- Evidence base in PRD #10 — don't re-derive.
