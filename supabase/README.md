# Supabase foundation

The migration, seed, and pgTAP checks in this directory define the Phase 0 data spine.

- `migrations/` owns tables, indexes, RLS, and aggregate views.
- `seed.sql` provides three local users: two accepted Crew members and one private user.
- `tests/phase_0.sql` verifies the view aggregates and privacy boundary in CI.
- `functions/health/` is the first Edge Function placeholder; product endpoints arrive later.

The local Supabase stack is intentionally a CI-only test dependency under the save-RAM rule.
