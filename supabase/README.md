# Supabase foundation

The migration, seed, and pgTAP checks in this directory define the Phase 0 data spine.

- `migrations/` owns tables, indexes, RLS, and aggregate views.
- `seed.sql` provides three local users: two accepted Crew members and one private user.
- `tests/phase_0.sql` verifies the view aggregates and privacy boundary in CI.
- `tests/phase_2.sql` verifies the persisted session runtime, write boundary, device registry, and forgiveness-token invariant in CI.
- `functions/` exposes the Phase 2 contract: `sessions`, `tasks`, `goals`, `rituals?ritual=morning-commit|evening-close`, `forgiveness`, `devices`, `device-poll`, and `device-action`.
- `packages/core/src/api.ts` is the shared JSON contract and validator source for all clients and Edge Functions.

The local Supabase stack is intentionally a CI-only test dependency under the save-RAM rule.
