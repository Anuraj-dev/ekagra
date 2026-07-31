# ekagra — State
> Focus-first Life OS: Identity → Goal → Plan → Commitment → Task/Occurrence → Block → Session → Entry. · Last checkpoint: 2026-07-13 (15:30)

## 🚧 In progress / next
- **Life-OS P1 is the active work order:** `docs/specs/002-life-os-reimagining.md` (issue #44), delivered through #45–#51 in dependency order. PR #43 already merged the v2 UI foundation.
- **Documentation baseline is PR #59** (`docs/life-os-spec`). Two Sol-high review rounds exposed contract
  conflicts; Opus fixed the second round and Luna reconciled the design law. A fresh Sol-high final review
  exceeded its 10-minute cap while tracing calendar boundaries and was terminated without a verdict; its
  owner-time-zone concern has been resolved, but review approval is still pending.
- **External CI blocker:** GitHub rejected both PR #59 jobs before assigning a runner because the account payment failed or its Actions spending limit must be increased. No workflow step ran; do not diagnose this as a repository test failure.
- **Standing git workflow (Raja, 2026-07-13):** commit as you go → push → open PR → let review + CI run → merge ONLY when review approved AND CI green. See memory [[git-merge-workflow]].
- MorningCommit/EveningClose and Insights are superseded by the Life-OS Today/Plan/Review shape; no pending product decision remains.

## Status
- v0.1.6 mobile; gates green locally: typecheck, `bun test` (140), biome 0 errors, vendor-sync clean.
- Hosted Supabase `gstdhscdvbzwkwipjfrr` (ap-south-1). Test account e2e-tester@ekagra.dev.
- Migrations: latest `20260713170000_task_edit_status_schedule_invariant.sql` (status↔schedule trigger + morning-commit GUC bypass). pgTAP hooks_contract = 41 assertions; CI-only (no local Supabase image).

## Architecture map
- Web -> apps/web/src · Mobile -> apps/mobile/src · CLI -> apps/cli/src
- Mobile data layer: apps/mobile/src/data — TanStack Query (persisted AsyncStorage), optimistic mutations, `queries/`, `mutations/` (RetryableMutationResult w/ stable clientOpId), `queryClient.tsx` (cache-owner isolation).
- Auth cache isolation -> apps/mobile/src/auth/AuthProvider.tsx (owner marker; wipe on identity change, keep same-user cold-boot cache).
- Theme tokens: currently sourced from apps/web/src/theme/tokens.ts and re-exported by mobile; ticket #45
  moves them to a shared package. Design law: `docs/DESIGN.md` (Warm Planning Desk II, light primary).
- Timer engine + API types -> packages/core/src (vendored to supabase/functions/_vendor/core; scripts/sync-core-vendor.sh, CI-enforced).
- Edge fns -> supabase/functions/* · Migrations -> supabase/migrations/ · pgTAP -> supabase/tests/

## Stack & run
- Bun monorepo · Expo SDK 54 (RN Nav v7) + Vite/React + bun CLI · Supabase (Deno edge) · ESP8266 (PlatformIO).
- Test: `bun test` (140) · Typecheck: `bun run typecheck` · Lint: `bunx biome check --write <paths>` · Vendor: `./scripts/sync-core-vendor.sh` then `git diff --exit-code supabase/functions/_vendor`.
- Device driving: adb screencap/input; Supabase CLI as `bunx supabase`.

## Key decisions (top 5)
- **Life-OS builds on the shipped v2 client without a stack rewrite** using an additive Postgres spine,
  TanStack Query, server-owned timer, and the live CLI. Warm Planning Desk II is the chosen visual system.
- Session-start idempotency: client `clientOpId` + partial unique `(owner_id, client_op_id)`; server insert→catch 23505→select→200 (fresh 201). Plus `one_active_session_per_owner`. App-level pre-check removed (relies on constraint).
- Task status↔schedule invariant enforced by BEFORE trigger on `(status, scheduled_for)`; morning-commit bypasses via transaction-local GUC `ekagra.morning_commit_bypass` so "committed for today" (planned w/o schedule) survives.
- Session commands never auto-retry (`retry:false`) — uncertain failure reconciles to server truth via refetch; UI shows dismiss, not blind-resend.
- Nothing silent, ever; no fabricated data (analytics = auth.uid()-scoped SQL views, `security_invoker=true`).

## Gotchas
- NEVER `git commit -am` with dirty root files (broke main in #31) — stage explicit paths only.
- Notifee requires an Expo dev build — Expo Go cannot run the v2 timer (follow-up PR).
- pgTAP is CI-only; seed-relative date assertions must be weekday-robust (Monday flake fixed in phase_2 test 19).
- Codex Sol never above `high` effort (Raja's hard rule); verify every dispatched diff before commit.
- GitHub Actions is externally blocked by account billing/spend state as of 2026-07-31; merge law still requires actual green CI.
- Tables use `owner_id`. Supabase MCP is read-only; `db push` needs DB password via `bunx supabase`.
