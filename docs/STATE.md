# ekagra — State
> Focus-first life-management app: goal-bound Pomodoro synced across Expo, web, CLI, and an ESP8266 desk companion. · Last checkpoint: 2026-07-13 (11:17)

## 🚧 In progress / next
- **v2 FULL UI REBUILD approved** — Raja rejected the current UI/UX entirely. Everything is specified in
  `docs/specs/001-app-v2-redesign.md` (committed) and published as GitHub issue **#42**. READ THE SPEC FIRST;
  it is the single source of truth for the rebuild (screens, architecture, timer fix, success criteria).
- **Wireframes**: Raja generated "Warm Planning Desk Wireframes" in claude.ai/design
  (project `a9615a6f-f065-4868-9929-6ec42a5c62fb`). He is downloading the file to
  `docs/design/v2/Warm Planning Desk Wireframes.dc.html` — verify it exists; if not, ask him for it.
  It is the visual source of truth; DESIGN-SPEC.md (dark ember) is superseded for v2.
- Very next step: implementation plan from spec 001 → phased execution. Suggested order:
  (1) data layer swap to TanStack Query + optimistic mutations + idempotency UUIDs,
  (2) timer start-path fix + Notifee foreground service (needs dev build, NOT Expo Go),
  (3) new nav + screens per wireframes, (4) cold-start work with before/after measurements.
- Decide fate of branch `fix/ui-ux-audit` (10 commits incl. spec, unpushed): its screen polish is
  superseded by the rebuild; the spec commit must survive. Ask Raja: PR it or cherry-pick the spec.

## Status
- v0.1.6 on mobile; v0.1.5 released; E2E rounds 1–3 done; updater verified.
- UI/UX audit executed on `fix/ui-ux-audit` — now largely moot (v2 rebuild replaces those screens).
- Gates green: typecheck, bun test 136, biome.
- Hosted Supabase `gstdhscdvbzwkwipjfrr` (ap-south-1): migrations applied, 11 edge functions. Test account e2e-tester@ekagra.dev.
- Timer bug diagnosed (GPT-5.6 Sol consult, in spec §1): silent return in `Today.tsx:84`, no
  timeout/feedback in `api.ts:48`, task create does POST+full re-GET (`DataProvider.tsx:140`).

## Architecture map
- Web -> apps/web/src · Mobile -> apps/mobile/src (1:1 mirror) · CLI -> apps/cli/src
- Theme tokens: single source apps/web/src/theme/tokens.ts — mobile re-exports.
- Timer engine + API types -> packages/core/src (vendored to supabase/functions/_vendor/core; scripts/sync-core-vendor.sh, CI-enforced)
- Edge fns -> supabase/functions/* · Migrations -> supabase/migrations/ · pgTAP -> supabase/tests/
- **v2 spec -> docs/specs/001-app-v2-redesign.md · v2 wireframes -> docs/design/v2/ · issue #42**
- Feature sources: Pravah `~/Anuraj-Dev/Snehit_projects/Pravah` (capture sheet, inbox/timeline) ·
  pomo `~/Anuraj-Dev/Snehit_projects/pomo` (timer screen, cue system).

## Stack & run
- Bun monorepo · Expo SDK 54 + Vite/React + bun CLI · Supabase · ESP8266 (PlatformIO).
- Test: `bun test` (136) · Typecheck: `bun run typecheck` · Lint: `bunx biome check --write <paths>`.
- Device driving: adb screencap/input; screen 1220x2712. Supabase CLI must run as `bunx supabase`.

## Key decisions (top 5)
- **v2 rebuild (2026-07-13): keep backend/data model, rebuild all mobile UI** — Pravah core planner
  (Inbox+Timeline, capture sheet) + pomo timer UX; Warm Planning Desk design language (paper neutrals,
  Quiet Indigo #6753c7). OUT: Kairo, Gmail/Calendar sync, Crew tab, NodeMCU/CLI (parked, spec §8).
- TanStack Query over Legend-State (Sol consult): server-state fit, optimistic rollback; local-first DB not required yet.
- Timer: Supabase stays authoritative, timestamp-anchored; Notifee foreground service for notification/actions; correctness never depends on JS running.
- Nothing silent, ever: every tap has pressed state+haptic, every async a pending label, every failure on-screen retry.
- No fabricated data in UI (carried over). All analytics are SQL views. Release APK arm64-v8a only.

## Gotchas
- NEVER `git commit -am` with the long-lived dirty root files (broke main in #31) — stage explicit paths only.
- Notifee requires an Expo dev build — Expo Go cannot run the v2 timer.
- `supabase db push` needs the DB password; use `bunx supabase`. Supabase MCP is read-only.
- pgTAP: cast uuid literals; fixtures as superuser BEFORE `set local role authenticated`.
- Tables use `owner_id`, not `user_id`. Stale Expo Go process → phantom network errors; `adb shell am force-stop` first.
- Raja's hard rule: codex Sol never above high effort; consults for this project already done — don't re-run them, results are in spec 001.
