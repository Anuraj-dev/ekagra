# ekagra — State
> Focus-first life-management app: goal-bound Pomodoro synced across Expo, web, CLI, and an ESP8266 desk companion. · Last checkpoint: 2026-07-10 (14:1x, post Phase 3 merge)

## 🚧 In progress / next
- **HANDOFF (PC restart)** — Phase 3 (issue #4) is DONE and closed: PRs #17 (web) + #18 (mobile) merged, CI green, worktrees/branches cleaned. Nothing in flight.
- **Next session start here:** Phase 4 firmware (issue #5) or Phase 5 (issue #6) — dispatch per model-routing rules. Only pending manual item: Raja to test the Expo app on-device and add the NodeMCU push button (~₹10).

## Status
- **Phase 3 merged & issue #4 closed**: web (PR #17) — Vite/React core-loop screens (Today, Focus, Tasks, Goals, Insights, Crew, rituals), timer bridge tests, design gate passed; mobile (PR #18) — Expo app, 7 screens + Morning Commit mirroring web, 57 tests, terminal-session fix mirrored, Expo Go notification-permission errors handled.
- **Phases 0–2 merged to main** (PRs #11, #12/#14, #13; issues #1–#3 closed):
  - Phase 0: Bun monorepo (packages/core, apps/{web,mobile,cli}, supabase, firmware), Supabase data spine + RLS, CI.
  - Phase 1: pure-TS timer engine in packages/core (state machine, hard-block, honest minutes vs earned blocks, injected monotonic clock, serializable state; 18 tests).
  - Phase 2: typed API contract (packages/core/src/api.ts), edge functions (sessions, tasks, goals, rituals, forgiveness, devices, device-poll/action), device token auth + rotation/revoke, atomic morning-commit RPC, cheap poll-aggregates RPC.
- CI all green on main: fast job = lint + typecheck + bun test + vendor-sync check; heavy job = fresh-DB migrations + pgTAP + edge-function HTTP smoke (CI-only per save-RAM rule).

## Architecture map
- Web app -> apps/web/src (Vite/React)
- Mobile app -> apps/mobile/src (Expo; notifications guard in src/lib/notifications.ts)
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
- Biome formatter is enforced in CI (`bun run lint` = `biome check .`) — run it before pushing; it does NOT check files inside .claude/worktrees (path ignored), so lint from the main checkout or rely on CI.
- device-poll/device-action have verify_jwt=false in supabase/config.toml — auth is x-device-token only; never route privileged logic there without the token check.
- service_role grants are explicit (20260710030000 migration); default privileges cover future tables.
- pgTAP: wrap RLS assertions in `set local role authenticated` … `reset role` (superuser bypasses RLS silently); no data-modifying CTEs in asserts.
- CI: `supabase functions serve` must be setsid-detached; edge container logs dumped on failure.
- Leaderboard privacy: aggregates only — task titles/reflections never queryable by friends.
- Evidence base in PRD #10 — don't re-derive.
