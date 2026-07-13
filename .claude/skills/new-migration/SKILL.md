---
name: new-migration
description: Create a new Supabase SQL migration in this repo with a correct monotonic timestamp, idempotent DDL, RLS on new tables, and safe search_path on definer functions, then verify with a fresh reset. Use when adding or altering database schema under supabase/migrations.
disable-model-invocation: true
---

# Create a new migration

Argument: a short kebab/snake slug describing the change (e.g. `streaks`). Ask if not given.

## Steps

1. **Pick the filename.** Migrations are `supabase/migrations/<UTC-timestamp>_<slug>.sql` where the
   timestamp is `YYYYMMDDHHMMSS` and MUST sort after the latest existing migration. Check the
   newest one first:
   ```bash
   ls supabase/migrations | tail -1
   ```
   Then choose a strictly greater timestamp (bump the last existing one, or use the current UTC
   time if later). Do not fabricate a random time earlier than an existing migration.

2. **Write idempotent, re-runnable DDL** matching the existing style so `supabase db reset` stays
   clean. Rules (see existing migrations for examples):
   - Start with a short comment explaining *why* the change exists (see `..._phase_6_motivation.sql`).
   - `create table if not exists`, `add column if not exists`, `create index if not exists`,
     `create or replace function`.
   - **Every new `public` table**: `alter table ... enable row level security;` and at least one
     policy scoped by `auth.uid()` / `owner_id`. No table ships without RLS.
   - Index foreign keys and common filters (`owner_id`, date columns).
   - Any `security definer` function pins `set search_path = public` and authorizes via `auth.uid()`.
   - Grant to `service_role` only if genuinely needed (mirror `..._service_role_grants.sql`).

3. **Add a pgTAP test** in `supabase/tests/` covering the new schema/behavior (mirror `phase_7.sql`).

4. **Verify** — do not skip:
   ```bash
   supabase db lint --local
   supabase db reset --local   # applies all migrations from scratch
   supabase test db
   ```
   If the change touches types consumed by `packages/core`, also run `bun run typecheck`.

5. Consider dispatching the **supabase-migration-reviewer** subagent on the diff before finishing.

Report the migration file created, the RLS/policy decisions, and the verification output.
