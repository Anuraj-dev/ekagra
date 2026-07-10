# ekagra — State
> Focus-first life-management app: goal-bound Pomodoro synced across Expo, web, CLI, and an ESP8266 desk companion. · Last checkpoint: 2026-07-10 — Phase 2 API review fixes

## 🚧 In progress / next
- Phase 2 API review fixes are implemented on `phase-2-api` and remain uncommitted; CI still needs to run the Supabase migration/pgTAP and Edge Function smoke suites.
- Waiting on Raja: pick a design direction (propose-4 prompt already on his clipboard) — blocks Phase 3 UI only.
- Hardware: Raja to add a push button to the NodeMCU (~₹10) for physical start/pause.

## Status
- Phase 0 data spine, Phase 1 timer engine, and Phase 2 Edge Function API are present. The current review round adds JWT configuration, compact device polling aggregates, token lifecycle operations, and an atomic morning-commit RPC.
- PRD published and pinned: **issue #10** (problem, 42 user stories, all implementation/testing decisions, acceptance criteria). Phase issues **#1–#9** cover the full v1, labeled `ready-for-agent`.
- Acceptance for v1: full loop end-to-end on all surfaces AND Raja logs ≥70% day-coverage over 30 days (his 2026 Notion baseline: 36.7%).
- Goal seed data (identity roles + anchor mission from Raja's life-direction doc) documented in a comment on #10.

## Architecture map
- `packages/core` — pure TypeScript hard-block and session-accounting seam, ready for the Phase 1 state machine.
- `apps/web`, `apps/mobile`, `apps/cli` — non-UI entry-point scaffolds; UI remains design-gated.
- `supabase/` — Phase 0/2 migrations, seed fixtures, aggregate views/RPCs, RLS, Edge Functions, and pgTAP checks.
- `firmware/` — Phase 4 placeholder only.

## Stack & run
- Stack: Bun monorepo · Expo + Vite/React + bun CLI · Supabase (Postgres/auth/realtime/edge) · ESP8266 firmware. · Run: `bun install`; Test: `bun test`, `bun run lint`, `bun run typecheck` locally, heavy suites CI-only (save-RAM rule)

## Key decisions (top 5)
- Hard-block timer: no task, no timer (client engine + server both enforce)
- Honest minutes vs earned blocks accounting; only blocks feed rates/leaderboard
- Rolling 7/30-day rates, forgiveness token, nudges — no fragile Day-X-of-N streaks
- Supabase owns truth; ESP8266 is a thin polling client (~3s HTTPS)
- Heavy tests CI-only; shared pure-TS timer engine is the main test seam

## Gotchas
- Evidence base (r≈0.08 vanity pomodoros, 2x morning-routine lever, silent-gap death pattern) is in PRD #10 — don't re-derive; don't redesign against it.
- Luna frontend experiment (Jul 10–17): Raja's default routes frontend work to GPT-5.6 Luna via codex — but the Ekagra design prompt was explicitly requested for Claude/Opus. Confirm routing per task.
- Design gate: NO UI implementation before Raja picks one of the 4 proposed directions.
- Leaderboard privacy: aggregates only — task titles/reflections must never be queryable by friends.
