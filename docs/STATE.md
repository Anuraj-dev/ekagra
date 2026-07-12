# ekagra — State
> Focus-first life-management app: goal-bound Pomodoro synced across Expo, web, CLI, and an ESP8266 desk companion. · Last checkpoint: 2026-07-12 (13:46)

## 🚧 In progress / next
- **UI/UX audit executed** on branch `fix/ui-ux-audit` (9 commits, not pushed, no PR — Raja to review).
  Next: device E2E sanity pass of the reworked screens, then PR to main.
- Audit deferred items (follow-up work):
  - **Insights heat grid is not dated history** — no per-calendar-date earned-block source exists client-side; grid projects weekday all-time intensity onto every week column. Needs a dated daily-earned view (data-layer change).
  - TimerRing continuous progress tween (needs timer anchor/rate plumbed into ring; verify current 1000ms tween on device).
  - Web: mode-toggle pressed state (no global `:active` pattern), CueBanner adds a 2nd ember moment on Today when active, GhostButton lacks a `tint` prop (danger applied inline).
  - GoalMark label 12/700 vs spec Label 13/600 — decide app-wide.
- Remaining known-minor issues: `isSupabaseConfigured` dead guard + silent localhost fallback in both `lib/supabase.ts`; no timeout/error state on update banner; heatmap mobile/web orientation parity.

## Status
- **v0.1.5 released**; E2E rounds 1–3 done on device; updater verified.
- **UI/UX audit fully executed** (docs/design/UI-UX-AUDIT.md → done): §A cross-cutting (tint tokens + withAlpha, GoalMark wiring, SecondaryButton/Chip/EntryRow primitives, 26/800 H1, gutter fixes) + all 10 screens/13 components per §C, mobile + web 1:1. Both behavioral fixes in and independently verified: Settings Revoke confirm (P0), Focus paused block-meter uses dimmed goal color not mauve (P1). Goals dual meter collapsed to one honest 7-day meter (30d bar was fabricated). Insights rebuilt 8→3 blocks. EveningClose Yes/No removed — `planMatch` now derived as `tag === 'on-plan'` (signals coupled by design).
- Gates green: typecheck, bun test 136, biome.
- Hosted Supabase `gstdhscdvbzwkwipjfrr` (ap-south-1): migrations applied, 11 edge functions. Test account e2e-tester@ekagra.dev.

## Architecture map
- Web -> apps/web/src · Mobile -> apps/mobile/src (1:1 mirror) · CLI -> apps/cli/src
- **Theme tokens: single source apps/web/src/theme/tokens.ts — mobile tokens.ts just re-exports it.**
- Timer engine + API types -> packages/core/src (vendored to supabase/functions/_vendor/core; scripts/sync-core-vendor.sh, CI-enforced)
- Edge fns -> supabase/functions/* · Migrations -> supabase/migrations/ · pgTAP -> supabase/tests/
- Design docs -> docs/design/UI-UX-AUDIT.md (executed), docs/design/refined/DESIGN-SPEC.md (source of truth)
- Insights = RLS-scoped view selects (daily_activity, weekly_review, focus_hours_heatmap, weekly_leaderboard, …).

## Stack & run
- Bun monorepo · Expo SDK 54 + Vite/React + bun CLI · Supabase · ESP8266 (PlatformIO).
- Test: `bun test` (136) · Typecheck: `bun run typecheck` · Lint: `bunx biome check --write <paths>`.
- Device driving: adb screencap/input; screen 1220x2712. Supabase CLI must run as `bunx supabase`.

## Key decisions (top 5)
- Ember = one accent moment per view; voice = factual, no therapy-speak (DESIGN-SPEC §10).
- No fabricated data in UI: Goals 30d meter removed, Insights grid caveat documented in-code rather than faked.
- `planMatch` derived from evening tag (`tag === 'on-plan'`) — Yes/No control removed.
- Daily totals server-derived from `daily_activity` view; honest minutes ≠ earned blocks.
- Release APK = arm64-v8a only (50MB cap). All analytics are SQL views.

## Gotchas
- NEVER `git commit -am` with the long-lived dirty root files (broke main in #31) — stage explicit paths only.
- `supabase db push` needs the DB password; use `bunx supabase`, not bare `supabase`. Supabase MCP is read-only.
- pgTAP: cast uuid literals; fixtures as superuser BEFORE `set local role authenticated`.
- Biome ignores `**/.claude` — in worktrees use `bunx biome check --write <paths>`.
- Tables use `owner_id`, not `user_id`. Stale Expo Go process → phantom network errors; `adb shell am force-stop` first.
