# ekagra — State
> Focus-first life-management app: goal-bound Pomodoro synced across Expo, web, CLI, and an ESP8266 desk companion. · Last checkpoint: 2026-07-13 (15:30)

## 🚧 In progress / next
- **v2 UI rebuild is BUILT and up as PR #43** (branch `feat/app-v2`). Full spec: `docs/specs/001-app-v2-redesign.md` (issue #42). Screens rebuilt on Warm Planning Desk, light-default: Tasks, Focus, Goals, Insights, Settings, Capture — all on real TanStack-Query data. Backend/data model extended, not rewritten.
- **CI is GREEN** on HEAD `1b46ae4` (both jobs: lint+unit, fresh-Supabase DB/pgTAP).
- **Review loop**: Sol (med) round 1 = 8 findings → all fixed; re-review = 7 CLOSED, 2 open (#7 Focus blind-resend, #2 status↔schedule trigger holes) → BOTH now fixed & pushed. A final focused Sol re-review of the #2+#7 delta was dispatched — **read its verdict, then if APPROVE + CI green, MERGE PR #43** per Raja's standing permission.
- **Standing git workflow (Raja, 2026-07-13):** commit as you go → push → open PR → let review + CI run → merge ONLY when review approved AND CI green. See memory [[git-merge-workflow]].
- **RITUALS product decision (pending Raja):** MorningCommit + EveningClose are now unreachable (Today.tsx deleted). Left dormant, old DataProvider still wraps them. Decide: reintroduce with a v2 entry point, or drop screens+nav+ritual api+DataProvider. Noted in PR body.

## Status
- v0.1.6 mobile; gates green locally: typecheck, `bun test` (140), biome 0 errors, vendor-sync clean.
- Hosted Supabase `gstdhscdvbzwkwipjfrr` (ap-south-1). Test account e2e-tester@ekagra.dev.
- Migrations: latest `20260713170000_task_edit_status_schedule_invariant.sql` (status↔schedule trigger + morning-commit GUC bypass). pgTAP hooks_contract = 41 assertions; CI-only (no local Supabase image).

## Architecture map
- Web -> apps/web/src · Mobile -> apps/mobile/src · CLI -> apps/cli/src
- Mobile data layer: apps/mobile/src/data — TanStack Query (persisted AsyncStorage), optimistic mutations, `queries/`, `mutations/` (RetryableMutationResult w/ stable clientOpId), `queryClient.tsx` (cache-owner isolation).
- Auth cache isolation -> apps/mobile/src/auth/AuthProvider.tsx (owner marker; wipe on identity change, keep same-user cold-boot cache).
- Theme tokens: single source apps/web/src/theme/tokens.ts — mobile re-exports. Design law: `docs/DESIGN.md` (Warm Planning Desk, light primary).
- Timer engine + API types -> packages/core/src (vendored to supabase/functions/_vendor/core; scripts/sync-core-vendor.sh, CI-enforced).
- Edge fns -> supabase/functions/* · Migrations -> supabase/migrations/ · pgTAP -> supabase/tests/

## Stack & run
- Bun monorepo · Expo SDK 54 (RN Nav v7) + Vite/React + bun CLI · Supabase (Deno edge) · ESP8266 (PlatformIO).
- Test: `bun test` (140) · Typecheck: `bun run typecheck` · Lint: `bunx biome check --write <paths>` · Vendor: `./scripts/sync-core-vendor.sh` then `git diff --exit-code supabase/functions/_vendor`.
- Device driving: adb screencap/input; Supabase CLI as `bunx supabase`.

## Key decisions (top 5)
- **v2: keep backend/data model, rebuild all mobile UI** — Pravah planner + pomo timer UX; Warm Planning Desk (paper neutrals, Quiet Indigo #6753c7), light primary. OUT: Kairo, Gmail/Cal sync, Crew, NodeMCU/CLI (spec §8).
- Session-start idempotency: client `clientOpId` + partial unique `(owner_id, client_op_id)`; server insert→catch 23505→select→200 (fresh 201). Plus `one_active_session_per_owner`. App-level pre-check removed (relies on constraint).
- Task status↔schedule invariant enforced by BEFORE trigger on `(status, scheduled_for)`; morning-commit bypasses via transaction-local GUC `ekagra.morning_commit_bypass` so "committed for today" (planned w/o schedule) survives.
- Session commands never auto-retry (`retry:false`) — uncertain failure reconciles to server truth via refetch; UI shows dismiss, not blind-resend.
- Nothing silent, ever; no fabricated data (analytics = auth.uid()-scoped SQL views, `security_invoker=true`).

## Gotchas
- NEVER `git commit -am` with dirty root files (broke main in #31) — stage explicit paths only.
- Notifee requires an Expo dev build — Expo Go cannot run the v2 timer (follow-up PR).
- pgTAP is CI-only; seed-relative date assertions must be weekday-robust (Monday flake fixed in phase_2 test 19).
- Codex Sol never above `high` effort (Raja's hard rule). Background codex worked reliably this session via task-notifications, but verify every diff before commit.
- Tables use `owner_id`. Supabase MCP is read-only; `db push` needs DB password via `bunx supabase`.
