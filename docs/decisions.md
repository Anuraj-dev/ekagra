# Decisions — ekagra
> Append-only log of load-bearing choices and WHY. Newest at the bottom.
> Format: `## YYYY-MM-DD — <decision>` then a short **Why:** line.

## 2026-07-10 — V1 scope = the focus loop only
**Why:** Raja's Notion trackers (2025/2026) died from per-day logging friction; the loop that broke (task → timer → auto-log → insight) is the thing to fix first. Health/relationships/decisions/journal become v2 modules on the same data spine. Full PRD: issue #10.

## 2026-07-10 — Hard-block timer: no task, no timer
**Why:** 2026 data showed pomodoro count vs deep-work output at r≈0.08 — casual unattached timers made the metric a vanity number. Raja explicitly chose the hard wall over softer variants. Enforced in the shared engine AND server-side.

## 2026-07-10 — Session accounting split: time-honest minutes vs earned blocks
**Why:** Adopted from friend's app pomo (ADR 0002 there). All focus time counts in honest totals; only completed runs earn blocks that feed rates/streaks/leaderboard. Keeps stats truthful without gaming.

## 2026-07-10 — Rolling 7/30-day rates replace "Day X of N" streaks
**Why:** Both Notion years died right after a broken streak (reset spiral). A miss dents a rate, never zeroes it. One forgiveness token/week; nudges at miss #2 and after 2 silent days (data shows day 2–3 of a gap is where systems die).

## 2026-07-10 — Supabase is the single source of truth
**Why:** Cloud must own state (devices live on different networks); Postgres views handle leaderboard/rates efficiently at 12+ friends; auth/realtime/edge included; Raja's tooling (MCP) already wired. ESP8266 polls a compact HTTPS endpoint (~3s) — no websockets on the microcontroller.

## 2026-07-10 — Platforms: Expo native + web + ESP8266 first; CLI right after; Chrome extension v2
**Why:** Raja's choice. Mobile-efficiency principles adopted from the chat-to-pdf project: Expo Go-compatible, SDK pinned to device, browser-first UI iteration, EAS cloud builds, ≤7 screens total.

## 2026-07-10 — Shared timer engine as a pure TS package
**Why:** One implementation of timer/accounting rules across web, Expo, CLI — prevents 4-surface drift. It and the API contract are the primary test seams; UI stays thin.

## 2026-07-10 — Save-RAM rule: heavy tests run in CI only
**Why:** Raja's machine is RAM-constrained. Local = fast pure-TS unit tests. Anything needing Docker/Supabase or a browser (maya E2E) runs in GitHub Actions. Local heavy runs only when debugging a CI failure demands it.

## 2026-07-10 — Design gate before UI: propose 4 directions, Raja picks
**Why:** Prevents generic AI aesthetics; dark theme primary; tabular timer numerals. Design prompt already delivered to Raja.

## 2026-07-10 — Goals carry identity roles; seeded from Raja's life-direction doc
**Why:** 2026's "what role did you play today" was his best tracking insight. Seed roles: Student / Builder / Founder-in-training / Researcher, anchored to "I'm building a robotics company; software finances the mission." See issue #10 comment for seed mapping.

## 2026-07-10 — Phase 0 data spine follows the PRD model and keeps aggregate access separate
**Why:** Issue #1 and PRD #10 lock the first schema to profiles, friendships, goals, tasks, sessions, day records, and forgiveness tokens. Owner RLS protects every base row; the Crew view is a separate aggregate surface so friends can see earned blocks and honest minutes without task titles or reflections. Rolling rates use ended-session completion, while earned blocks remain the only leaderboard metric.

## 2026-07-10 — Phase 0 heavy verification is CI-only
**Why:** A fresh Supabase/Docker reset and database tests prove migrations and fixture views without violating the save-RAM rule. Local `bun test` stays limited to the pure TypeScript seam; browser E2E waits for the design-gated UI and will be added to the CI-only suite then. See issue #1 and PRD #10 testing decisions.

## 2026-07-10 — Vendor @ekagra/core inside supabase/functions
**Why:** Supabase edge runtime cannot import outside supabase/functions; monorepo path imports 502'd at boot. Rejected import maps/symlinks (CLI bundling ignores them). scripts/sync-core-vendor.sh copies + fixes .ts extensions; CI fails if the copy drifts.

## 2026-07-10 — Explicit service_role grants migration
**Why:** A fresh `supabase db reset` database left service_role without table grants (42501 in edge functions). Explicit `grant all ... to service_role` + default privileges beats relying on platform defaults.

## 2026-07-10 — Sub-agent model routing updated (Raja)
**Why:** GPT Sol (medium) for heavy/architectural backend, Sol (low) for reviews, GPT-5.6 Luna for heavy frontend with Opus fallback. Codex ChatGPT account 400-rejects explicit -m ids → use account default at the same effort levels.

## 2026-07-10 — Phase 6 motivation calendar uses UTC and targeted forgiveness
**Why:** V1 needs one deterministic day/week boundary across Postgres views and edge callers before user timezone storage exists. A weekly token targets the latest explicit miss, or a missing pre-today date after the user's first non-empty morning commitment in that UTC ISO week; this preserves a real consecutive-day streak without forgiving unfinished today or pre-tracking gaps. Per-user timezone boundaries are deferred.

## 2026-07-10 — Codex model ids corrected + usage window
**Why:** Fully-qualified ids (`-m gpt-5.6-sol|terra|luna`) DO work on the ChatGPT account — only short ids (`gpt-sol`) 400-reject (verified via frontend-ai-model-benchmark runs). Supersedes the earlier "use account default" note. Raja: use codex extensively only through ~2026-07-11 (quota reset window), then strategic-only (Codex Plus).

## 2026-07-10 — Subagent fix-cycle cap (Raja)
**Why:** Resumed agents replay ever-growing transcripts — cost rises, quality plateaus. Max ~2 cycles (build + one fix round) per agent; repeat mistakes → fresh spawn with distilled findings, or higher effort. Same-agent continuation only when its in-context knowledge is genuinely load-bearing.
## 2026-07-10 — Insights analytics are auth.uid()-scoped SQL views, read directly by clients
**Why:** Issue #8 hard rule "all analytics are SQL views"; avoids new edge fns, RLS stays in the view predicate. Rejected: insights edge function aggregating in TS.

## 2026-07-11 — completeEarly as a first-class timer event, work-phase-only
**Why:** "Done early" must persist honest minutes + the earned block instead of forcing abandon; restricted to the work phase because early completion is a statement about work (breaks end via complete). Alternative rejected: reusing complete with a force flag — muddies the reach-zero invariant.

## 2026-07-11 — Daily totals server-derived from auth.uid()-scoped daily_activity view
**Why:** Client-accumulated honest minutes/earned blocks were lost on re-login. A UTC-day RLS view keeps analytics in SQL (issue #8 rule) and clients merely overlay optimistic updates. Alternative rejected: persisting totals in client storage — drifts from server truth.

## 2026-07-12 — No fabricated data in the UI (audit execution)
**Why:** Goals' 30-day meter was the 7-day number rescaled /20 — a second signal that didn't exist; collapsed to one 7-day meter rather than adding data plumbing mid-audit. Insights' 10-week grid has no dated per-day source (focus_hours_heatmap is dow×hour all-time), so it projects weekday intensity onto every week — documented in-code instead of faking history; a dated daily-earned view is the follow-up.

## 2026-07-12 — planMatch derived from evening tag
**Why:** The Yes/No "did today match the plan" control was cut per the audit; `parseEveningCloseRequest` hard-requires `planMatch`, so it's now `tag === 'on-plan'`. Alternative (API change to drop the field) rejected to keep the audit UI-scoped. planMatch and the tag are now coupled by design.

## 2026-07-13 — v2 full UI rebuild on existing backend (spec 001, issue #42)
**Why:** Raja rejected the current UX outright (dead-feeling timer start, laggy creates, dark-ember design).
Rebuild all mobile screens to Pravah's core planner + pomo's timer UX under "Warm Planning Desk" language;
keep Supabase/data model/timer engine. Rejected alternatives: restyle-only (wouldn't fix data-layer lag)
and full from-scratch rewrite (backend is sound). Kairo, Gmail/Calendar, Crew, NodeMCU/CLI explicitly parked.

## 2026-07-13 — TanStack Query + Notifee foreground service for the v2 client
**Why:** Sol consult: TanStack fits Supabase server-state with optimistic rollback + idempotency keys
(Legend-State rejected — local-first DB not required yet). Timer correctness stays server-anchored,
timestamp-based; Notifee gives the ongoing notification + actions but never owns truth. Requires dev build.

## 2026-07-13 — Scheduling owns non-done task planning status
**Why:** Timeline visibility and focus eligibility both depend on `planned`; allowing `scheduled_for` and
status to drift strands scheduled tasks in Inbox. Postgres now atomically derives `planned` when scheduled
and `inbox` when unscheduled, while schedule-only edits preserve `done`.

## 2026-07-13 — Create retry replays one operation; auth changes erase server-state cache
**Why:** Re-minting operation IDs creates duplicates after lost responses, while restoring one global
persisted query cache can disclose the previous account's data. Create/start hooks retain one ID until
success or explicit reset, and account transitions clear memory plus persistence before rendering.

## 2026-07-13 — Task-edit schedule normalization exempts morning commit explicitly
**Why:** Task PATCHes need one atomic database invariant across independent `status`/`scheduled_for` fields,
but morning commit intentionally means planned for today without a calendar date. The trigger now normalizes
both edited columns and preserves `done`/`cancelled`; `commit_morning_plan` alone uses a scoped, restored GUC
bypass. A handler read/merge was rejected because it adds a race and cannot be covered directly by pgTAP.

## 2026-07-31 — Life-OS reimagining: one entity chain, phased, no stack rewrite (4-model consult)
**Why:** Raja rescoped ekagra from focus app to all-in-one life OS (horizon planning, habits, deep work,
voice journal, vision media, desk device). Sol-high, Grok 4.5, Opus 5, and Fable 5 debated to consensus:
keep Bun/Expo/Supabase/timer-engine/firmware; rebuild the product shape around Identity → Goal → Plan
(self-referencing year/quarter/month/week/day) → Commitment → Task/Occurrence → Block → Session → Entry,
with one generic Attachment mechanism. Rejected: stack rewrite, five bolted-on modules, local-first SQLite
outbox (4-0 — no proven offline pain; server must stay session truth for phone+desk), second cloud for media.
Phased delivery (daily loop in ~2wk, then habits/voice/desk, then cascade/vision, then polish) — full-vision-
before-shipping rejected as solo-dev suicide during exams. Web starved (unrouted, out of CI, not deleted);
CLI stays alive per Raja; Crew/social, Insights dashboard, ritual screens, explanatory copy discarded.

## 2026-07-31 — Habits: split tables in Postgres, unified at the seam
**Why:** HabitRule (generator: recurrence, cue self-FK, minimum version, effective-date edits, rolling
generation window) + Occurrence (dated instance: done/skipped/missed) — a nullable-rule task table makes
future-rule edits dangerous and leaves "skip Thursday" nowhere to live (Sol). But Occurrence shares the
task row shape so Today, block placement, and session binding stay one code path (Grok/Opus). Binary
occurrences only; count/duration habits rejected year one (effort habits are blocks+sessions instead).
Consistency = computed never-miss-twice rate (SQL view); stored streaks rejected as shame mechanics.

## 2026-07-31 — Timer stays task-bound absolutely; blocks never run bare
**Why:** Deep-work Blocks collided with the no-task-no-session invariant. Ruling: a Block must carry a
committed task/occurrence before Focus starts from it — starting a block means picking its task (one tap
when planned). Bare block sessions rejected: honest minutes must stay attributable or the analytics
honesty rule erodes. Same reason the ESP8266 gets pause/resume/skip but never start (start needs task
choice; a 3-button OLED can't express it). Server remains sole session authority.

## 2026-07-31 — Plans never mutate silently: one-tap Sweep, no auto-rebalance
**Why:** When a week breaks midweek, auto-redistribution would hide slippage from weekly review and
violate "nothing silent, ever". Today shows an overdue chip; one Sweep gesture carries unfinished
commitments forward — Raja decides, app executes. Stale-until-Sunday rejected (kills the daily loop).
Weekly review headline = deep hours (honest deep-block session hours); review is a forced pass, not a report.

## 2026-07-31 — Voice journal rides the proven Voisu/Hyprvox transcription architecture
**Why:** Transcript is the durable, searchable artifact attached to day/session; audio is transient.
The capture→STT pipeline is already solved in Raja's Voisu/Hyprvox work — reuse that architecture over
Supabase Storage + edge fn rather than designing a new one. Media and voice share ONE generic Attachment
mechanism (subject_type/subject_id) so vision boards cost no extra infra.

## 2026-07-31 — Personal-only, door open; identity required for habits; UI law: instruments don't narrate
**Why:** Build for one user, zero social/team abstractions, but keep owner_id+RLS discipline on every new
table so multi-user later is an auth change, not a rewrite. Every habit must hang off an Identity (default
"Me" keeps capture one-tap) — identity-as-optional-tag would quietly kill the Atomic Habits mechanic.
UI: icons + ≤2-word labels, no instructional copy, no em dashes, state shown by fill/density/motion,
hidden a11y labels mandatory, text survives only for failures; ~5 signature animations, rest instant,
reduced-motion → fades. Visual language deliberately NOT locked — palette research (real apps, contrast)
precedes mockups.

## 2026-07-31 — Warm Planning Desk II chosen after the mockup gate
**Why:** Raja selected the evolved paper-neutral direction after the four-theme comparison. P1 keeps the
shipped v2 component feel and Quiet Indigo `#6753C7`, uses the contrast-verified refinement palette, and
treats the warm Today, Focus, and Plan mockups as implementation references. The other theme files remain
research artifacts, not competing sources of truth.

## 2026-07-31 — Life-OS contract clarifications: horizon subjects, plan calendar identity, pending occurrences, identity-bound rules
**Why:** The second Sol-high review of PR #59 found four contract conflicts between `CONTEXT.md`, spec 002, and
the chosen `plan-warm-desk.html` mockup. Rulings, clarifying (not reversing) the 2026-07-31 entries above:
(1) Commitment horizon rules are per subject type — a Goal commits at ANY horizon down to day (the mockup's
GOAL → WEEK → WED cascade is one subject, not a duplicate), a Task at week or day, an Occurrence at day only;
Blocks still require a committed Task/Occurrence, so a Goal commitment is never block-eligible. The earlier
"day accepts Task or Occurrence" phrasing would have broken the chosen cascade UI.
(2) Plans get a canonical calendar identity: horizon-aligned `starts_on`, `unique (owner, horizon, starts_on)`,
and parent containment in the next horizon up — because absorbing `day_records` made a day plan the day
record, and Today / ISO-week selection must be a deterministic lookup, not a scan with tie-breaking.
(3) Occurrence `outcome` is nullable: null = pending, terminal = done/skipped/missed. A rolling generation
window must be able to create tomorrow's rows without pre-declaring an outcome, and an untouched habit today
is not a miss. The terminal contract is unweakened — generation never clears a terminal outcome.
(4) Every HabitRule carries a non-null `identity_id` (default "Me" seeded per owner, so capture stays one tap)
and a cue link must stay within the same owner AND the same Identity, since a Stack that crosses identities
would break the Atomic Habits mechanic identity-required was adopted to protect.

## 2026-07-31 — Life-OS calendar boundaries become owner-local
**Why:** The 2026-07-10 UTC-only boundary was an explicit v1 deferral until per-user time zones existed.
Life-OS makes Today, Sweep, occurrences, and weekly review the primary daily loop, so UTC would show Raja
the wrong day around local midnight. `profiles.time_zone` now carries an IANA zone with a `UTC` fallback;
calendar dates derive from that zone, never the database session's `current_date`. This supersedes only the
old deferral while preserving deterministic server-owned boundaries.
