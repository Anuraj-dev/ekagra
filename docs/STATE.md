# ekagra — State
> Focus-first life-management app: goal-bound Pomodoro synced across Expo, web, CLI, and an ESP8266 desk companion. · Last checkpoint: 2026-07-10

## 🚧 In progress / next
- Next task: **Phase 3 (issue #4)** — Web + Expo apps. BLOCKED on design gate: Raja is prototyping a design direction in Claude (prompt delivered 2026-07-10 morning) and will hand back a prototype. Until then, Phase 4 (firmware, #5) or Phase 5 (#6) non-UI parts can go next.
- Hardware: Raja to add a push button to the NodeMCU (~₹10) for physical start/pause.

## Status
- **Phases 0–2 merged to main** (PRs #11, #12/#14, #13; issues #1–#3 closed):
  - Phase 0: Bun monorepo (packages/core, apps/{web,mobile,cli}, supabase, firmware), Supabase data spine + RLS, CI.
  - Phase 1: pure-TS timer engine in packages/core (state machine, hard-block, honest minutes vs earned blocks, injected monotonic clock, serializable state; 18 tests).
  - Phase 2: typed API contract (packages/core/src/api.ts), edge functions (sessions, tasks, goals, rituals, forgiveness, devices, device-poll/action), device token auth + rotation/revoke, atomic morning-commit RPC, cheap poll-aggregates RPC.
- CI all green on main: fast job = lint + typecheck + bun test + vendor-sync check; heavy job = fresh-DB migrations + pgTAP + edge-function HTTP smoke (CI-only per save-RAM rule).

## Architecture map
- Timer engine + API types -> packages/core/src/{index,api}.ts
- Edge functions -> supabase/functions/* (shared logic in _shared/)
- Vendored core for Deno -> supabase/functions/_vendor/core (sync: scripts/sync-core-vendor.sh; CI enforces)
- Migrations -> supabase/migrations/ (phase_0 spine, phase_2 api, phase_2 review fixes, service_role grants)
- DB tests -> supabase/tests/*.sql · HTTP smoke -> scripts/phase-2-smoke.ts

## Stack & run
- Stack: Bun monorepo · Expo + Vite/React + bun CLI · Supabase (Postgres/auth/realtime/edge) · ESP8266 firmware.
- Run: (apps still stubs) · Test: `bun test` local; heavy suites CI-only (save-RAM rule).

## Key decisions (top 5)
- Hard-block timer enforced client AND server side (sessions fn rejects start without owned planned task)
- Honest minutes vs earned blocks; only blocks feed rates/leaderboard
- Supabase owns truth; ESP8266 thin polling client — device-poll returns one-row RPC aggregates, last_seen writes throttled to 60s
- Edge functions can't import outside supabase/functions → core is vendored; CI fails if out of sync
- Model routing (Raja 2026-07-10): GPT Sol med = heavy backend, Sol low = reviews, GPT-5.6 Luna = heavy frontend (Opus fallback); codex ChatGPT account rejects -m ids → account default at same effort

## Gotchas
- Design gate STILL closed: no Phase 3 UI until Raja returns a chosen design prototype.
- device-poll/device-action have verify_jwt=false in supabase/config.toml — auth is x-device-token only; never route privileged logic there without the token check.
- service_role grants are explicit (20260710030000 migration); default privileges cover future tables.
- pgTAP: wrap RLS assertions in `set local role authenticated` … `reset role` (superuser bypasses RLS silently); no data-modifying CTEs in asserts.
- CI: `supabase functions serve` must be setsid-detached; edge container logs dumped on failure.
- Leaderboard privacy: aggregates only — task titles/reflections never queryable by friends.
- Evidence base in PRD #10 — don't re-derive.
