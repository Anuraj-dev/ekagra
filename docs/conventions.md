# Conventions — ekagra
- Stack (decided, not yet scaffolded): Bun workspaces monorepo — `packages/core` (pure-TS timer engine), `apps/web` (Vite + React), `apps/mobile` (Expo, managed workflow, Expo Go-compatible), `apps/cli` (bun-published), `supabase/` (migrations + edge functions), `firmware/` (ESP8266/NodeMCU, Arduino/PlatformIO TBD in Phase 4)
- Run the app: TODO (Phase 0 scaffolds this)
- Run tests: locally `bun test` = pure unit tests ONLY; integration (local Supabase stack) + maya E2E run in GitHub Actions — never run heavy suites on the dev machine (save-RAM rule)
- Naming / structure notes: domain vocabulary is fixed — "earned block" (completed run), "honest minutes" (all focus time), "morning commit", "evening close", "day record", "Crew" (friends leaderboard). Timer numerals tabular/monospaced. ≤7 app screens total.
- Issue tracker: GitHub issues; PRD = #10 (pinned); phases #1–#9; label `ready-for-agent`
- No AI credits in commit messages or PR descriptions
