# Conventions: ekagra

- Stack: Bun workspaces; `packages/core` for the pure TypeScript timer and API contracts;
  `apps/mobile` for Expo SDK 54; `apps/cli` for the Bun CLI; `supabase/` for additive migrations,
  pgTAP, and Edge Functions; `firmware/` for ESP8266. `apps/web` is frozen and outside active CI.
- Mobile requires an Expo development build because Notifee cannot run in Expo Go. Build and install with
  `bunx expo run:android` from `apps/mobile`; use `bun --cwd apps/mobile start` for Metro.
- Local gates are `bun test`, `bun run typecheck`, and targeted `bunx biome check <paths>`. Supabase and
  device suites run in CI; preserve the save-RAM rule.
- Domain vocabulary is fixed by `CONTEXT.md`: Identity, Goal, Plan, Commitment, Task, HabitRule,
  Occurrence, Block, Session, Entry, and Sweep. Use those terms in code, schema, tests, UI, and docs.
- Active tracker: issue #44 and P1 tickets #45 through #51. Spec 002 is the work order.
- Tables use `owner_id`; every new table has RLS; migrations are additive; pgTAP dates are
  weekday-robust.
- Never include AI credits in commit messages or PR descriptions.
