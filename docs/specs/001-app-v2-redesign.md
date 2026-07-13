# Spec 001 — ekagra v2: full UI rebuild (Pravah planner + pomo timer)

Status: approved 2026-07-13 · Owner: Raja · Backend/data model stays; every screen is rebuilt.
Sources: Pravah (`~/Anuraj-Dev/Snehit_projects/Pravah`), pomo (`~/Anuraj-Dev/Snehit_projects/pomo`),
GPT-5.6 Sol architecture consult (2026-07-13), web research on best-in-class focus apps.

## 1. Problem (functionality issues — the honest list)

1. **Timer start feels dead / "doesn't start".** `Today.tsx:84` silently returns when no task
   selected or a stale active session exists (button only dims, no explanation). Start awaits
   `auth.getSession()` + Edge Function fetch with **no timeout, retry, spinner, or label change**
   (`apps/mobile/src/lib/api.ts:48`). A stalled request is indistinguishable from a dead tap.
2. **Every create feels laggy.** Task creation waits for POST **then a full re-GET**
   (`DataProvider.tsx:140`) before the UI updates. Goal creation waits on the POST. No optimistic UI
   anywhere. No dedicated, obvious create button.
3. **Slow cold start.** All 5 tab screens eagerly imported (`RootNavigator.tsx:1`),
   `assetBundlePatterns: ['**/*']` bundles everything, shell gated on a 4-request `reloadAll`.
4. **Timer has no Android backbone.** No foreground service; JS-only. Killed app = lost timer UX.
5. **Design/UX rejected by the owner.** Current dark-ember language is discarded; nav order wrong;
   creation flow has no clear affordance; timer screen and its start affordance unacceptable.
6. **Hardware/CLI unusable for humans** — no setup guide (parked; see §8).

## 2. Scope

- **In:** full mobile (Expo Android) UI rebuild; data-layer replacement; timer reliability
  architecture; new nav; Pravah core-planner features; pomo timer features. Web mirrors later.
- **Out:** Kairo (Pravah's AI assistant), Gmail/Calendar sync + review queue, Crew/social tab,
  NodeMCU + CLI guides (after app ships and is tested), backend/schema rewrites (extend only).

## 3. Architecture

### 3.1 Data layer — TanStack Query replaces DataProvider
- Optimistic mutations for task/goal create/complete/delete/reorder:
  `onMutate` cancel+snapshot+insert provisional row (marked `syncing`), close composer immediately;
  `onError` rollback + visible retry; `onSuccess` swap in server object; `onSettled` invalidate.
- **Client-generated operation/session UUIDs on every mutation; server made idempotent** —
  prevents duplicate tasks/sessions on retry (top-2 rebuild risk).
- Query persistence: render cached data instantly on launch, revalidate in background.

### 3.2 Timer — server-anchored truth + native backbone
- Keep Supabase authoritative and timestamps as the only truth (existing `timer.ts` reconstruction
  is correct). Render ticks only repaint; never decrement stored state.
- **Start = optimistic navigation:** tap → synchronous pressed state + haptic → Focus opens with a
  provisional `starting` session → server confirm swaps the anchor → definitive failure shows a
  prominent retry state. 8–10 s request timeout. Instrument tap→auth→request→response with durations.
- **Notifee foreground service** (requires dev build, not Expo Go): ongoing low-importance
  notification "Focus · <task>" with chronometer from absolute expiry + Pause/Resume/Stop actions;
  tap opens Focus. Separate completion channel; `expo-notifications` schedules the completion alert
  at the absolute server-derived deadline as backup (needs `SCHEDULE_EXACT_ALARM` for exactness).
- Reconcile `/sessions` on foreground, connectivity recovery, notification action, app launch —
  server wins. Every transition idempotent (risk #1: three authorities must never diverge).
- If stale active session blocks start: say so on screen with a resolve action — never silent.

### 3.3 Cold start & interaction latency
- Lazy-mount tabs; dynamic-import Insights charts, updater, notifications code.
- Fix `assetBundlePatterns`; audit bundle; verify Hermes bytecode in the release artifact.
- FlashList for task/history lists.
- Baselines before/after (release builds, real device): cold start, tap-to-feedback,
  tap-to-server-confirm, JS frame rate (risk #5: measure, don't guess).

### 3.4 Behavioral invariants to preserve (risk #4)
Server-clock offset conversion, one-active-session constraint, honest-minutes accounting,
completion semantics — kept behind stable hooks so the UI rewrite can't break them.

## 4. Navigation

Bottom tab bar, M3 pill active indicator: **Tasks · [+ capture, center] · Goals · Insights**.
(Crew reserved as 4th tab later.) Timer is NOT a tab — full-screen takeover from a task.
Persistent mini-timer chip above the tab bar while a session runs (tap returns to Focus).
Edge-to-edge, predictive back, no iOS-tell components.

## 5. Screens

### 5.1 Tasks (default tab)
Pravah pattern: **Inbox** (untriaged) + **Timeline** (day strip/carousel, list vs calendar-grid
toggle). FlashList rows reusing one TaskCard. Complete/delete get an undo grace window.
Each task row has a direct "start focus" affordance.

### 5.2 Capture sheet (center +)
Pravah's `AddTaskSheet`, faithfully: modal card sliding up (max-w 480, ≤92% height, blurred
backdrop, swipe-down dismiss with unsaved-draft spring-back); kicker "Capture"; underline-tab
segmented **New task / New goal**; auto-focused title; task date presets Inbox/Today/Tomorrow/
Later-{weekday}; goal chip picker (inline expanding list, "No goal" option); "More" disclosure →
notes, deadline, time, priority p1–p3; goals get an optional "First task" seed field;
**sticky footer primary button** with adaptive label (Create goal / Save & close / Saving…);
Enter = save-and-stay burst capture with sticky date/goal/priority and "✓ Saved · N captured"
flash; outcome copy line explains where the item goes. Optional later: series/bulk capture.

### 5.3 Goals
Goal list with linked-task counts and the honest 7-day meter (no fabricated 30d data).
Goal detail = plan-from-goal: linked tasks, add-task inline, start focus from any task.

### 5.4 Focus (timer takeover)
pomo's `TimerScreen`, faithfully: caps phase label FOCUS/SHORT BREAK/LONG BREAK (text, not
color-coded); giant monospace MM:SS hero (JetBrainsMono-style instrument feel); live indicator
(pulsing dot LIVE / [PAUSED] / READY); thin animated progress bar; **launch pips** (one square per
daily-goal session, filled/current/outline, ≤12); bound task+goal name always visible but small;
stats strip Today/Sessions/Streak (tap → Insights); **EXTEND +1/+5** pills while running;
controls row Reset (long-press fill) · Play/Pause FAB 72dp · Skip. Session-end: tiny bottom-sheet
review (rate focus, optional note) — no navigation away. **Cue system:** audio + haptic players,
selectable cue families/variants with rotation and in-settings preview; distinct haptics on
Start/Pause/Skip/Reset. Home-screen widget mirroring timer state (post-v2 candidate).

### 5.5 Insights
Max 3 blocks. Narrative summary first ("You focused 6.5 h across 3 goals, most on X"),
charts second (dynamic-imported). No fabricated data; heat grid only when a dated
daily-earned source exists (existing deferred data-layer item).

### 5.6 Settings
Sectioned rows (durations, daily goal count, auto-start next phase, cue family/variant + preview,
theme light/dark, reduced motion, account/revoke with confirm).

## 6. Design language — "Warm Planning Desk, pushed further"

- Palette: paper neutrals — canvas `#f7f1e8`, ink `#201914`; single accent **Quiet Indigo
  `#6753c7`** used sparingly (one accent moment per view). Dark theme derived, not primary.
- Type: semantic roles Display / Body / Metadata; monospace only for the timer readout.
- Components: chip pickers with caret disclosure, underline-tab segmented controls (no filled
  pills), sticky footers above keyboard, named elevation tokens (low/medium/high), named motion
  tokens (fast 200 ms / base 280 ms ease-out; springs only for gestures), reduced-motion first-class.
- Voice: factual, explains state ("Saves to Inbox for later triage."), no therapy-speak.
- Feedback: every tap has a synchronous pressed state + haptic; every async action has a pending
  label; every failure has an on-screen explanation and retry. **Nothing silent, ever.**
- Tokens remain single-sourced in `apps/web/src/theme/tokens.ts` (mobile re-exports).

## 7. Success criteria

1. Timer start: tap-to-visible-feedback < 100 ms, always; no silent no-op path exists.
2. Create task/goal: appears in list instantly (optimistic), composer supports burst capture.
3. Timer survives app kill/Doze; notification shows live countdown; completion fires in Doze.
4. Cold start to interactive Tasks shell measurably reduced (baseline first) on release build.
5. Raja uses the app daily and does not call it slop.

## 8. Parked (explicit backlog)

Crew tab (leaderboard + friends) · NodeMCU full setup guide + simpler pairing (QR/code from app)
· CLI install/usage guide · Gmail/Calendar sync · home-screen widget · series/bulk capture.
