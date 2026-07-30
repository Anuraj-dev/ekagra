# Spec 002 — Life-OS Reimagining

> Synthesized 2026-07-31 from a 4-model design consultation (Sol-high, Grok 4.5, Opus 5, Fable 5) and a
> grilling session with Raja. Vocabulary: `CONTEXT.md`. Decisions: `docs/decisions.md` (2026-07-31 entries).
> Supersedes spec 001's scope boundaries (which cut NodeMCU/CLI/rituals); builds on its shipped v2 client.

## Problem Statement

Ekagra today is a polished focus loop: goal-bound pomodoro plus a day planner. Raja's life planning still
happens nowhere: yearly direction, quarterly goals, monthly targets, weekly commitments, habits, deep-work
scheduling, journaling, and motivation media are scattered or absent. The app he opens daily cannot answer
"what am I becoming, what did I commit to this week, and did I do the deep work" — so the books he trusts
(Deep Work, Atomic Habits, cadence-based planning) stay theory instead of mechanics he lives inside.

## Solution

Reshape ekagra into a life OS built on one entity chain instead of bolted-on modules:

**Identity → Goal (vision media) → Plan (year/quarter/month/week/day, self-referencing) → Commitment →
Task / HabitRule→Occurrence → Block (deep/shallow) → Session → Entry (+ generic Attachment)**

Planning any horizon is a few taps: commit a goal to a quarter, cascade commitments down to weeks and days,
time-box the day into blocks, run task-bound pomodoro sessions from blocks, close the day with a voice
entry, review the week with one forced pass whose headline is honest deep hours. The books are mechanics,
never content. UI law: icons and ≤2-word labels, no instructional copy, no em dashes, state shown by
fill/density/motion, five signature animations, everything else instant. Delivery is phased; the daily
loop ships first and must survive exam season lived-in.

## User Stories

1. As Raja, I want identities ("Builder", "Student") as first-class objects, so that goals and habits are votes for who I'm becoming.
2. As Raja, I want to attach images to a goal, so that opening it feels like a vision board, not a folder.
3. As Raja, I want one Plan cascade from year to day, so that all planning lives in one place.
4. As Raja, I want to commit a goal to a quarter with one tap, so that yearly direction becomes quarterly focus.
5. As Raja, I want to cascade a commitment down a horizon (year→quarter→month→week→day) without duplicating it, so that there is one source of truth.
6. As Raja, I want a Goal to stay committable at every horizon down to the day, while Task commitments live at week or day and Occurrence commitments only at day, so that a cascade is one subject and only the day is lived.
7. As Raja, I want to plan tomorrow in under a minute from this week's commitments, so that planning never becomes its own job.
8. As Raja, I want to time-box my day into deep, shallow, admin, and rest blocks, so that deep work is scheduled, not hoped for.
9. As Raja, I want a block to require a committed task before Focus starts, so that every honest minute stays attributable.
10. As Raja, I want to start a session from a block in one tap, so that sitting down and starting are the same motion.
11. As Raja, I want the pomodoro engine unchanged (server-owned, timestamp-true, one active session), so that the numbers stay honest.
12. As Raja, I want a habit to be a rule (recurrence, cue link, minimum version) that generates dated occurrences, so that editing the rule never rewrites history.
13. As Raja, I want to stack a habit onto another (cue chain) under an identity, so that habit stacking is structural, not a note.
14. As Raja, I want a generated occurrence to sit pending until I resolve it as done, skipped, or missed, so that today's untouched habit is not already a failure and a deliberate skip never reads as one.
15. As Raja, I want consistency shown as a computed never-miss-twice rate, so that one bad day never deletes a streak I'm ashamed to rebuild.
16. As Raja, I want every habit to hang off an identity (default "Me"), so that capture is one tap but the link is always real.
17. As Raja, I want Today to open straight into blocks, tasks, habit checks, and the timer chip, so that the first action is under 3 seconds away.
18. As Raja, I want an overdue chip and a one-tap Sweep after a broken day, so that the plan recovers by my decision, never silently.
19. As Raja, I want a mic sheet on Today, so that journaling is a hold-and-speak, not a writing task.
20. As Raja, I want voice entries transcribed automatically (Voisu-style pipeline) and attached to the day or session, so that my journal is searchable.
21. As Raja, I want a forced weekly review pass (sweep, deep hours, rates, journal playback), so that the week closes deliberately.
22. As Raja, I want the Sunday headline to be honest deep hours, so that the app is judged by the one number that matters.
23. As Raja, I want the desk device to show the running session and its state at a glance, so that the phone stays in the drawer during deep work.
24. As Raja, I want pause/resume/skip buttons on the desk device, so that controlling a session never means touching the phone.
25. As Raja, I want the desk device to never start sessions, so that task-binding can never be bypassed by hardware.
26. As Raja, I want the device transport secured (no `setInsecure` TLS), so that a desk token can't be harvested off my network.
27. As Raja, I want an icon-first UI with ≤2-word labels and zero instructional copy, so that the app reads like an instrument, not a manual.
28. As Raja, I want state shown by fill, density, and motion, so that I read the day at a glance.
29. As Raja, I want five signature animations (task→Focus morph, block ink-fill, cascade dock, habit-chain pulse, waveform→chip settle) and stillness everywhere else, so that motion means something.
30. As Raja, I want reduced-motion to degrade to fades, and every icon to carry a hidden accessibility label, so that minimal never means unusable.
31. As Raja, I want failures to be the only place text explains, so that silence never hides a problem.
32. As Raja, I want capture, voice, detail, and settings as sheets rather than screens, so that navigation stays four tabs and a takeover.
33. As Raja, I want the CLI kept alive against the new model, so that terminal capture and checks keep working.
34. As Raja, I want the web app starved (unrouted, out of CI) but not deleted, so that a big-screen planner stays a day away if proven needed.
35. As Raja, I want all new tables owner-scoped with RLS, so that multi-user later is an auth change, not a rewrite.
36. As Raja, I want the daily loop shipped in ~2 weeks and lived in through exams, so that the OS survives contact with life.

## Implementation Decisions

- **Stack unchanged**: Bun monorepo, Expo SDK 54 (dev builds mandatory), Supabase (Postgres + RLS + edge fns + Storage), packages/core timer engine, ESP8266 firmware revived. No new clouds, no local-first database, no CRDTs. Server remains sole session authority.
- **Schema (additive migration, existing owner_id + RLS discipline)**:
  - `identities` — promoted from `goals.identity_role` text.
  - `plans` — one self-referencing table, `horizon ∈ {year, quarter, month, week, day}`, `parent_plan_id`, and `starts_on date not null` as the canonical calendar identity (the first date of the period). `day_records` absorbed into day plans, so a day plan is addressed by its date. Constraints: `starts_on` must be horizon-aligned (year → Jan 1, quarter → Jan/Apr/Jul/Oct 1, month → day 1, week → ISO Monday, day → any date); `unique (owner_id, horizon, starts_on)`; `parent_plan_id` must be the same owner, the next horizon up, and contain `starts_on` in its period, and is null only for `year`. Today is `(owner, 'day', current_date)` and the ISO week is `(owner, 'week', date_trunc('week', current_date))` — deterministic lookups, no scanning or tie-breaking.
  - `commitments` — edge `(plan_id, subject)` placing goals/tasks/occurrences into plans; cascade = child commitments referencing the same subject. A trigger enforces the horizon subject contract: a Goal may be committed at any horizon (year, quarter, month, week, day), a Task at week or day, an Occurrence at day only. This keeps a same-subject Goal cascade valid all the way through the day (the chosen `plan-warm-desk.html` GOAL → WEEK → WED flow) while executable subjects stay near the lived day. Blocks are unaffected and still require a committed Task or Occurrence — a Goal commitment is never block-eligible.
  - `habit_rules` — `identity_id not null` (default "Me" Identity seeded per owner so capture stays one tap), recurrence, `cue_rule_id` self-FK (stacking) constrained to the same `owner_id` and the same `identity_id` so a Stack never crosses identities, minimum version, effective-date edits; generates a rolling window of `occurrences` whose `outcome` is nullable — null means pending (generated, not yet resolved) and the terminal values are `done`/`skipped`/`missed`. Generation only ever inserts pending rows; it never resets a terminal outcome, and leaving pending is not the same as `missed`. Each occurrence owns one executable `tasks` projection, so the existing task-bound Session seam remains intact without putting rule history in `tasks`.
  - `blocks` — ordered time slots on a day plan, `kind ∈ {deep, shallow, admin, rest}`, each referencing a committed task/occurrence.
  - `sessions` — existing table gains `block_id`; its required `task_id` remains the executable Task directly committed to the Block or the one-to-one Task projection owned by its Occurrence. A trigger proves the Session task matches the Block commitment.
  - `entries` — first-class journal residue anchored to exactly one day Plan or Session; an Entry owns one or more Attachments, so multiple entries and non-media text entries remain distinct records.
  - `attachments` — generic `(subject_type, subject_id, kind ∈ {image, audio, text}, storage_path, transcript)` on an Entry, Goal, or other supported subject; vision boards and voice journal share the mechanism. Voice keeps the Attachment row and transcript after its transient audio object is deleted.
- **Derived data stays SQL**: never-miss-twice rate, deep hours, weekly review projections as `security_invoker` views. No stored streaks.
- **Sweep**: explicit user-invoked operation (edge fn or RPC) carrying unfinished commitments forward; plans never mutate silently.
- **Voice**: record on device → upload to private Storage bucket (durable retry queue) → edge fn transcribes via the Voisu/Hyprvox-proven STT architecture → transcript on the attachment. Transcript is the artifact; audio transient.
- **Device**: existing poll transport and token-hash model kept; add pause/resume/skip commands through the existing device-action path; fix TLS trust before device carries tokens; provisioning polish later phase.
- **Client**: TanStack Query persisted cache stays the data layer; idempotent commands (`client_op_id`) stay the write pattern; no SQLite outbox (revisit only on logged pain).
- **IA**: tabs Today · Plan · Self · Review (Review may start as a sheet); Focus is a full-screen takeover; Capture/Voice/Detail/Settings are sheets. Insights dashboard, MorningCommit/EveningClose screens, Crew/social, goalPalette removed. Tokens move to a shared package; web unrouted and out of CI; CLI updated against the new entities.
- **Visual language**: locked after the research/mockup gate to Warm Planning Desk II: paper neutrals, Quiet Indigo `#6753C7`, light primary, and the shipped v2 component feel. The chosen references are `today-warm-desk.html`, `focus-warm-desk.html`, and `plan-warm-desk.html`; other theme explorations are retained but not implementation inputs.
- **Phases**: P1 spine migration + Today + Plan(week↔day) + copy-strip pass. P2 habit rules/occurrences/stacks + weekly review + voice + desk revival. P3 month/quarter/year cascade + vision media + Review surface. P4 motion signature pass, provisioning polish, hardening.

## Testing Decisions

- Good tests assert external behavior at the highest seam; no implementation-detail tests, no timing/race-dependent assertions, weekday-robust date fixtures.
- **pgTAP (CI-only)** is the primary seam: RLS on every new table; plan calendar identity (horizon-aligned `starts_on`, `(owner, horizon, starts_on)` uniqueness, parent containment, Today/ISO-week lookups); plan cascade integrity (horizon hierarchy, no orphan commitments); commitment horizon subject rules (Goal at every horizon including day, Task at week/day only, Occurrence at day only) and uniqueness (no duplicate placement of one subject in one plan); habit rules carry a non-null Identity and cue links stay within one owner and Identity; habit rule edits from an effective date never rewrite past occurrences; occurrence state transitions (pending → done/skipped/missed, generation never clears a terminal outcome); block→task binding invariant; session↔block linkage; attachment subject polymorphism constraints; sweep moves exactly the unfinished set. Prior art: `hooks_contract` (41 assertions), phase_2 tests.
- **packages/core (`bun test`, local)**: timer engine block-binding extension; pure planning logic (sweep set computation, never-miss-twice window math). Prior art: existing 140-test suite.
- **Edge-fn contract tests**: device pause/resume/skip commands, transcription fn, sweep RPC — same contract style as existing fns. Save-RAM rule holds: heavy suites CI-only.
- No new seam types; no UI test harness this cycle.

## Out of Scope

- Multi-user product features, onboarding for strangers, social anything (Crew/friendships/leaderboard stay dead).
- Local-first storage / SQLite outbox / CRDTs (revisit only with a week of logged offline pain).
- Count/duration habit targets (effort habits are blocks + sessions).
- Stored streaks or any shame mechanics.
- Gmail/Calendar sync, Kairo, external integrations.
- Web planner UI (frozen; resurrect only if year-planning-on-desktop proves needed).
- Desk-device session start, device menus, device provisioning UX overhaul (beyond the TLS fix).
- Keeping audio blobs permanently; transcript search infrastructure beyond Postgres text search.

## Further Notes

- Full consultation papers, fork rulings, and the deduped question pool live in the session scratchpad; the durable outcomes are entirely in `CONTEXT.md`, `docs/decisions.md`, and this spec.
- Success metric for P1 is behavioral, not feature count: Raja opens Today every morning through exam season (exams Aug 16, Sep 13).
- The v2 Focus screen is kept essentially verbatim; it is the best-designed surface in the repo and is not relitigated.
- Mockups: four researched directions were compared; Warm Planning Desk II is the chosen P1 implementation direction.
