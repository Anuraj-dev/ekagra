# ekagra — State
> Focus-first life-management app: goal-bound Pomodoro synced across Expo, web, CLI, and an ESP8266 desk companion. · Last checkpoint: 2026-07-11 (00:29)

## 🚧 In progress / next
- **E2E round 2 running on Raja's phone** (Opus agent over adb, device ZN42274J4F): in-app update 0.1.0→0.1.1 (first live updater test), then re-verify fixed bugs (goal creation, stale pomo checkbox, done-early, honest minutes across re-login, settings header, heatmap), cleanup, sign out.
- **Overnight plan (Raja's directive)**: work ~15–16 min → sleep ~2h30m → then LOOP: read E2E findings → fix bugs → ship → re-test on device → repeat until the product is solid. Leave app signed out (Raja uses his own account).
- Codex quota EXHAUSTED (5h limit) — Claude-only until reset (~later on 2026-07-11).
- Remaining known-minor issues: `isSupabaseConfigured` dead guard + silent localhost fallback in both `lib/supabase.ts`; no timeout/error state on update banner; heatmap mobile/web orientation parity (deferred); "Pick a task to start" affordance unclear.

## Status
- **v0.1.1 released** (arm64 APK in public `app-releases` bucket + app_releases row + GitHub Release). Phone had v0.1.0 → updater test in progress.
- Merged today: #29 (UI batch: goal composer, settings safe-area, heatmap sizing, pluralization), #30 (state batch: `completeEarly` timer event, server-derived daily activity via new `daily_activity` view, stale-selection refresh + review fixes: completeEarly work-phase-only, maybeSingle zero fallback, ticketed activity refresh), #31 (0.1.1 bump), #32 (restored root configs #31 accidentally swept in).
- Hosted Supabase `gstdhscdvbzwkwipjfrr` (ap-south-1): all migrations applied (incl. daily_activity), 11 edge functions deployed. Test account e2e-tester@ekagra.dev.
- CI green on main (bun test 125; heavy job: migrations + pgTAP incl. daily_activity coverage).

## Architecture map
- Web -> apps/web/src · Mobile -> apps/mobile/src (1:1 mirror) · CLI -> apps/cli/src
- Timer engine + API types -> packages/core/src (vendored to supabase/functions/_vendor/core; scripts/sync-core-vendor.sh, CI-enforced)
- Edge fns -> supabase/functions/* · Migrations -> supabase/migrations/ (latest 20260710070000_daily_activity.sql) · pgTAP -> supabase/tests/
- Release pipeline -> .github/workflows/release.yml (push to main, gate on app_releases row, stable debug keystore secret, arm64-only for 50MB cap)
- Insights = RLS-scoped view selects (daily_activity, weekly_review, identity_role_hours, distraction_breakdown, focus_hours_heatmap, ritual_correlations, weekly_leaderboard).

## Stack & run
- Bun monorepo · Expo SDK 54 + Vite/React + bun CLI · Supabase · ESP8266 (PlatformIO).
- Test: `bun test` (125) · Typecheck: `bun run typecheck` · Lint: `bunx biome check --write <paths>`.
- Device driving: adb screencap/input; screen 1220x2712. Supabase CLI must run as `bunx supabase` (bare `supabase` is NOT on PATH — fails silently in scripts).

## Key decisions (top 5)
- completeEarly is a first-class timer event, valid only in the work phase; breaks end via complete.
- Daily totals are server-derived from the auth.uid()-scoped `daily_activity` view (UTC day) — client state is only an optimistic overlay. Honest minutes ≠ earned blocks, never conflate.
- All analytics are SQL views (issue #8 hard rule) — no reporting code in edge fns/app.
- Release APK = arm64-v8a only (Supabase free-tier 50MB upload cap).
- Subagent fix-cycle cap ~2, then fresh spawn/driver takes over.

## Gotchas
- NEVER `git commit -am` with the long-lived dirty root files — that's how #31 broke main (root package.json/bun.lock/tsconfig.json local edits got committed; reverted in #32). Stage explicit paths only.
- `supabase db push` needs the DB password; a temporary copy lives in the old job scratchpad under /tmp/claude-1000/-home-raja-Anuraj-Dev-ekagra/05188310-*/scratchpad/ (Raja must save it somewhere durable) — and use `bunx supabase`, not bare `supabase`.
- Supabase MCP is read-only (no DDL) — apply migrations via `bunx supabase db push`.
- pgTAP: cast uuid literals (`'...'::uuid`); fixtures as superuser BEFORE `set local role authenticated`; view column types are contracts.
- Biome ignores `**/.claude` — in worktrees use `bunx biome check --write <paths>`.
- Tables use `owner_id`, not `user_id`. Classifier requires Raja to NAME merges/prod pushes/secret writes explicitly.
- Stale Expo Go process caused phantom "Network request failed" — `adb shell am force-stop` first.
