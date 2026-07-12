# Ekagra Mobile — UI/UX Audit & Per-Page Fix Report

> Full line-by-line audit of every screen and shared component in `apps/mobile/src`,
> measured against `docs/design/refined/DESIGN-SPEC.md` (the project's own design spec and
> voice rules) — not against outside taste. Every finding is line-referenced, categorized,
> severity-ranked, and paired with a concrete fix.
>
> **Audience:** the fixing agent. Work **one page at a time**. Do the **Cross-cutting fixes
> (§A)** FIRST — they are single changes that resolve findings on many screens at once — then
> go page by page in the priority order in §B.
>
> **Scope:** 10 screens + 13 shared components. Web app mirrors mobile 1:1; when fixing a
> mobile file, check whether the same fix applies to `apps/web/src/...`.

---

## Legend

**Categories:** `EDITORIAL` (over-worded / double-decker / voice violation) · `DENSITY` ·
`HIERARCHY` · `TOKEN` (inline hex/rgba/magic number duplicating a token) · `SPACING` ·
`REUSE` (should use a shared primitive) · `INTERACTION` · `A11Y` · `SPEC-DRIFT` · `STATE`.

**Severity:** `P0` real defect/safety · `P1` clearly hurts the feel or breaks spec ·
`P2` notable · `P3` polish.

---

## 0. The diagnosis in one line

The app is **not vibe-coded** — it has a real token system, a type scale, and a detailed spec.
What makes it read as "bulky / AI-ish" is **editorial**, not visual: almost every element is a
**double-decker** (a clear label plus a redundant explanatory subtitle), the app leaks
**therapy/coaching voice** the spec explicitly bans, and **ember is sprayed** across many
elements instead of marking the one committed action per screen. Fixing those three things —
plus wiring up primitives that already exist — removes most of the problem without a redesign.

The five root patterns, each appearing on most screens:

1. **Double-decker copy** — label + redundant subtitle. Delete or merge the second line.
2. **Therapy/coaching voice** — violates spec §10 ("honest, not preachy"). Delete or make factual.
3. **Ember over-use** — violates "ONE accent moment per view." Reserve ember for the committed action.
4. **Reuse gaps** — finished primitives ignored (`GoalMark` is dead code), spec'd primitives missing (`SecondaryButton`).
5. **Un-tokenized values** — ember/green wash+line rgba and off-grid spacing hardcoded everywhere.

---

# §A. Cross-cutting fixes (do these ONCE, before per-page work)

These each resolve findings across multiple files. Doing them first shrinks the per-page work.

### A1 — Tokenize the wash/line tints  `[TOKEN, P1]`
The spec names these tints (§2) but they were never added to `apps/web/src/theme/tokens.ts`.
They are currently inlined (with **inconsistent alphas**) across ≥12 sites.

Add to the `color` object:
```ts
emberWash: 'rgba(240,138,62,0.10)',
emberLine: 'rgba(240,138,62,0.45)',
greenWash: 'rgba(91,191,138,0.12)',
greenLine: 'rgba(91,191,138,0.40)',
```
Then replace inline rgba at (non-exhaustive): `Today.tsx:278-281`, `Motivation.tsx:91,93`
(note: uses `0.12` where Today uses `0.10` — unify), `Focus.tsx:190,314,349,417-419`,
`Tasks.tsx:130`, `TaskCard.tsx:41`, `Crew.tsx:319`, `EveningClose.tsx:72,84,86,154,182,184,215`,
`Settings.tsx:203-205`, `Insights.tsx` bar/heatmap fills. A `withAlpha(hex, a)` helper would
also cover the one-off cases.

### A2 — Wire up `GoalMark` (it is dead code)  `[REUSE, P1]`
`components/GoalMark.tsx` correctly implements the spec goal tick but is **imported nowhere**.
`TaskCard.tsx:46-48`, `Tasks.tsx:216-217`, and `Focus.tsx:299` all hand-roll the identical
markup. Import and use `<GoalMark color={...} name={...} />` at all three sites. Also fix the
tick height in the component from `13` → `12` to match spec (§6).

### A3 — Add the missing primitives to `ui.tsx`  `[REUSE / SPEC-DRIFT, P1]`
- **`SecondaryButton`** — spec §6 names it ("outline, transparent, 1px `line`, text `t2`") but
  it does not exist anywhere. Mirror `PrimaryButton`'s API; add `minHeight: 52` to both for a
  spec-guaranteed touch target.
- **`Chip` / `SelectionChip`** `({label, active, tint, onPress})` — `Tasks.tsx` hand-rolls two
  mutually-inconsistent chip styles (goal filter + estimate stepper) because this doesn't exist.
- **`EntryRow`** — `Settings.tsx` repeats the recessed row shell (`surface2` / 1px `lineSoft` /
  `r-md`) **5×** with drifting padding. Extract one children-based component.
- **`SectionRow` padding prop** — it hardcodes `paddingHorizontal: 20`; give it an optional
  override so callers on a 16px grid stop misaligning (see A5).

### A4 — Fix `ScreenHeader` to the H1 token + migrate Crew  `[TOKEN, P1]`
`ScreenHeader.tsx:39` renders the title at `24/-0.3`, which matches **no** type-scale entry
(H1 is 26/-0.4). Crew hand-rolls its own header at the correct `26/-0.4`. Set `ScreenHeader`
to `26/-0.4`, add `accessibilityRole="header"`, then migrate `Crew.tsx:89-95` onto it. Now every
screen title shares one size from one component.

### A5 — Standardize the horizontal gutter  `[SPACING, P1]`
There is a live **4px misalignment**: headers pad `20`, card columns and `SectionRow` content
pad differently. Most visible in `Tasks.tsx` (header `20` at line 52 vs list/input `16` at
60/159, and `SectionRow`'s `20` vs its card list's `16`). Pick one rule app-wide (spec §4:
20px for headers, 16px for card columns) and apply it consistently; give `SectionRow` the
padding prop from A3 so section labels align with the cards beneath them.

### A6 — Voice pass: delete therapy/coaching copy  `[EDITORIAL, P1]`
Spec §10 bans affirmations and therapy-speak by name. Offending strings are catalogued per-page
below (Motivation nudges, all Insights empty/loading states, `EveningClose` textarea prompt,
Crew streak caption, SignIn tagline, Insights "Notice it, then return."). Where the spec gives
**verbatim** copy for a screen (Goals footer, Crew sub, MorningCommit sub), restore it exactly.

---

# §B. Priority index (P0/P1 across all pages)

Fix in roughly this order after §A.

| Page | P0 / P1 finding | Why it matters |
|---|---|---|
| **Settings** | `Revoke` device fires with no confirm (P0) | Irreversible security action on a single tap |
| **Goals** | Fake dual-meter — one number rescaled twice (P1) | Honesty violation: two bars imply independent data |
| **Focus** | Block-meter hardcodes mauve tint (P1 bug) | Blue/tan goals render the wrong color when paused |
| **Today** | `MotivationPanel` + rhythm rings not in spec (P1) | Biggest density/therapy-copy offender on the landing screen |
| **Insights** | 8 sections vs spec's 3; ember as chart fill; real heat grid absent (P1) | Scope creep is the bulk; ember loses its meaning |
| **Focus** | Top-bar paused-pill inverts "paused is quiet" (P1) | Loudest element appears exactly where it should recede |
| **Focus** | EndSheet triple-explains before one tap (P1) | Purest double-decker instance in the app |
| **Crew** | "You" row not highlighted; rows missing avatar+bar (P1) | The one spec'd accent is invisible; anatomy incomplete |
| **EveningClose** | Spec'd rate-nudge missing; 2 un-spec'd blocks added (P1) | More taps demanded, the one useful nudge absent |
| **Tasks** | `InboxRow` duplicates `TaskCard`; placeholder double-decker (P1) | Reuse + copy, both spec violations |
| **SignIn** | No client validation; raw SDK errors reach user (P1-ish) | First screen; brittle + leaks error strings |

---

# §C. Per-page reports

Each page: purpose → verdict → spec conformance → findings table → copy rewrites → top 3 fixes.

---

## Today — `screens/Today.tsx` (335 lines)
**Purpose:** Daily landing — header, motivation nudge, rhythm rings, day ledger, committed tasks, start bar, close-day entry.
**Verdict:** The single worst offender for "bulky/AI-ish." Six content blocks stack with no hero; ember appears in 4+ places at once; several blocks carry their own double-decker copy.
**Spec conformance:** Header, day ledger, committed section, start bar, close-day row all match §9. But the **`MotivationPanel` + "Your rhythm" `RateRings` block (121–143) is not in §9 at all** — it's the biggest density/hierarchy violation and carries banned therapy copy.

| # | Line(s) | Element | Cat | Sev | Problem | Fix |
|---|---|---|---|---|---|---|
| 1 | 121–143 | MotivationPanel + RateRings | SPEC-DRIFT/HIERARCHY | P1 | Two extra card blocks above the ledger; not in §9; nudge copy is therapy-speak ("A small restart counts.", "Keep the thread.") | Remove both from Today, or demote to a single plain `t3` status line (e.g. "3 days since last block") shown only when `daysSilent >= 2`. Don't carry the ember-tinted `welcomeBack` card onto Today. |
| 2 | 260–262 | StartBar disabled subtitle | EDITORIAL | P2 | `"Select a task above to start"` + `"Tap a committed task — a focus block always belongs to one"` — subtitle restates the label in precious prose | Delete subtitle. The dim disabled well already shows the hard-block visually. |
| 3 | 207–209 | "Close the day" subtitle | EDITORIAL | P2 | `"{N} honest minutes so far"` repeats the header status-line number three sections down | Delete subtitle; `"Close the day"` + chevron is enough. |
| 4 | 316–317 | EmptyCommit body | EDITORIAL | P2 | Two sentences state the same constraint twice | Merge: `"Commit 1–3 tasks to start the day."` (drop 2nd sentence). |
| 5 | whole screen | Ember count | HIERARCHY | P1 | Ember at header number, MotivationPanel, RateRings ×2, ledger ticks, StartBar (bg/border/icon/timer) — 6+ at once | After #1, ember reads as: header number + ledger (data) → StartBar (the one commitment). |
| 6 | 296–303 | StartBar active | EDITORIAL | P3 | "Start focus" + task title + `25:00` — "Start focus" redundant beside ember play icon + timer | Promote task title to primary; merge "Start · 25:00" as trailing label (matches spec wording). |
| 7 | 278–281 | StartBar bg/border | TOKEN | P3 | Inline `rgba(240,138,62,0.10/0.45)` | Use `color.emberWash`/`emberLine` (A1). |
| 8 | 175–186 | Error text | A11Y | P3 | Plain `Text`, no live region | Add `accessibilityLiveRegion="polite"` / `accessibilityRole="alert"` (UpdateBanner already does this). |

**Copy rewrites:**
- `"Select a task above to start"` + subtitle → `"Select a task to start"` (delete subtitle)
- `"Close the day"` + `"{N} honest minutes so far"` → `"Close the day"`
- `"Commit 1–3 tasks to start the day. You can't start a focus block without a plan."` → `"Commit 1–3 tasks to start the day."`

**Top 3:** (1) Remove/demote MotivationPanel+RateRings — cuts ~35 lines, two card surfaces, therapy copy, and 2–3 ember hits at once. (2) Strip the three redundant subtitles. (3) Consolidate ember to StartBar only.

---

## Focus — `screens/Focus.tsx` (575 lines)  *(the hero — highest bar)*
**Purpose:** Running/paused timer for a bound task, with end-session flow.
**Verdict:** Structurally close to spec, but the top-bar state machine inverts the spec's core idea (running quiet / paused loud), several strings are double-decker, and colors/sizes are inlined. The FAB itself is correct.
**Spec conformance:** Diverges at the top bar. §8 says the overline is always "FOCUS" + "BLOCK N OF N"; code swaps it to a pill-shaped "Paused" badge, making the top bar the **loudest** ember element when paused. FAB (outline running / filled+shadow paused) matches precisely.

| # | Line(s) | Element | Cat | Sev | Problem | Fix |
|---|---|---|---|---|---|---|
| 1 | 237–268 | Top bar overline | SPEC-DRIFT | P1 | Swaps "FOCUS" → ember "Paused" pill when paused; contradicts "paused quiet up top, loud only at FAB" | Keep static `"FOCUS"` in both states; let TimerRing's sub-label ("Remaining"/"Paused") carry state. Remove the pill bg/border. |
| 2 | 240–241, 259–261 | Phase tick dot | TOKEN/SPEC-DRIFT | P2 | `6×6 radius 2` (rounded square, not circle); ember in both states so it signals nothing | Make it a real static tick (goal-mark style), ember only when running, `t4` when paused; or drop when paused. |
| 3 | 246–257 | Paused chip chrome | TOKEN | P2 | Ad-hoc pill (surface/line/999) adds weight exactly where paused should be calmer | Delete wrapper; render plain text like the running branch. |
| 4 | 304–318 | Block-meter paused fill | TOKEN/**BUG** | **P1** | `'rgba(196,143,191,0.45)'` hardcodes goal**mauve**; a blue/tan goal renders the WRONG color when paused | Derive a dimmed variant of the actual `gColor` via `withAlpha(gColor, 0.45)`. |
| 5 | 502–535 | EndSheet header+chip+subtitle | EDITORIAL/DENSITY | P1 | Three explanatory lines before one option: overline "What ended it?" + "still counting/paused" chip + "Minutes are kept either way. Tap outside to keep going." ("minutes are kept" also duplicates the ghost button behind it) | Delete the subtitle (533–535); "tap outside" is a standard sheet affordance. Keep only "What ended it?". |
| 6 | 385, 408–429 | EarnedToast | EDITORIAL | P2 | `"Block earned. Banked."` — "earned" = "banked", said twice | `"Block banked."` |
| 7 | 431–453 | DismissToast | EDITORIAL | P2 | `"Session continues — timer never stopped"` / `"— still paused"` — 2nd clause restates 1st | `"Still running."` / `"Still paused."` |
| 8 | 360–366 | "End session — minutes are kept" | EDITORIAL | P2 | Em-dash explainer on a button; "minutes are kept" repeats in EndSheet | Shorten to `"End session"`; keep the reassurance only in the sheet (once). |
| 9 | 190–207 | Vignette | TOKEN/SPEC-DRIFT | P3 | `rgba(...0.05)` (half the spec wash) at `top:'32%'` (spec says ~70% down) | Tokenize; move to ~`58–62%`. |
| 10 | 329–356 | FAB shadow | TOKEN | P2 | Inline shadow four-tuple; `shadow.fab` token exists | Use `shadow.fab`. |
| 11 | 528–530 | Status vocabulary | EDITORIAL | P3 | "still counting", "never stopped", "still paused", "Remaining", "Paused" — 5 status words | Standardize on `Running` / `Paused` app-wide. |
| 12 | 324–367 | Control gaps | SPACING | P3 | `gap:22`, `marginBottom:46` off the 4px scale | Use `space.5`/`space.6`; name the 46 constant. |
| 13 | 300 | Goal name text | TOKEN | P3 | `12/700` maps to no type token (Caption 12/600, Label 13/600) | Use Label (13/600) or comment the deviation. |
| 14 | 470–482 | Scrim | A11Y | P3 | `accessibilityLabel` but no `accessibilityRole="button"` | Add role. |
| 15 | 369–383 | Desk footer | EDITORIAL | P3 | Two sentence shapes for one status | `"Desk light: mirroring"` / `"Desk light: dimmed"`. |

**Copy rewrites:** `"Block earned. Banked."`→`"Block banked."`; `"Session continues — …"`→`"Still running."`/`"Still paused."`; EndSheet subtitle → delete; desk footer → symmetric pair above; top-bar "Paused" pill → static "FOCUS".

**Top 3:** (1) Restore static "FOCUS" top bar, strip paused pill (#1–3). (2) Cut EndSheet triple-explain (#5). (3) Fix the mauve block-meter color bug (#4).

---

## TimerRing — `components/TimerRing.tsx` (143 lines)
**Purpose:** The 312px ring + centered digits + sub-label — the app's focal point.
**Verdict:** Tight and mostly on-spec. Main issues: one bespoke hex, and the glow breathes in lockstep with the arc (double motion on the calmest element).
**Spec conformance:** Matches almost exactly (312px, hairline track, 8px arc, tabular digits, ember/emberDim/green states, dashed paused track, digits t1→t3, sub-label ember when paused).

| # | Line(s) | Element | Cat | Sev | Problem | Fix |
|---|---|---|---|---|---|---|
| 1 | 91 | Track stroke | TOKEN | P2 | `stroke="#1A1D23"` — bespoke hex, not a token | Use `color.lineSoft`, or add `color.trackHairline` if a distinct shade is truly needed. |
| 2 | 72–75 | Glow breathing | SPEC-DRIFT | P3 | Glow opacity ties to the same breath cycle as the arc → both pulse together | Make glow static (fixed opacity while running) so only one layer moves. |
| 3 | 44–50 | Progress tween | SPEC-DRIFT | P3 | 1000ms `withTiming` re-fires every ~250ms tick → possible arc stutter | Verify on device; if it jitters, drive from a continuous elapsed-time derived value. |

**Copy rewrites:** none. **Top 3:** (1) tokenize `#1A1D23`; (2) decouple glow from arc breathing; (3) verify tween smoothness on device.

---

## motion — `components/motion.tsx` (28 lines)
**Verdict:** Clean, respects reduced-motion, matches its spec. One nit.

| # | Line | Cat | Sev | Problem | Fix |
|---|---|---|---|---|---|
| 1 | 22 | SPEC-DRIFT | P3 | Relies on Reanimated's default `FadeInDown` offset; comment claims "8px rise" but doesn't pin it | Chain `.withInitialValues({ transform:[{ translateY: 8 }] })` to guarantee 8px. |

---

## Screen — `components/Screen.tsx` (42 lines)
**Verdict:** Small, correct. Two token/consistency nits.

| # | Line | Cat | Sev | Problem | Fix |
|---|---|---|---|---|---|
| 1 | 35 | TOKEN | P3 | `paddingBottom: 40` literal (= `space[10]`) | Use `space[10]`. |
| 2 | 27 | SPACING | P3 | Non-scroll branch omits the `40` tab-clearance the scroll branch has | If any `scroll={false}` screen is tabbed, apply the same padding; else document why. |

---

## TabBar — `nav/TabBar.tsx` (76 lines)
**Verdict:** Essentially spec-compliant (flat bg, 1px hairline, 64px, ember tick+icon+label active, no blur/pill/shadow). Only a11y hygiene.

| # | Line | Cat | Sev | Problem | Fix |
|---|---|---|---|---|---|
| 1 | 41 | A11Y | P3 | Inactive tabs get `accessibilityState={}` instead of `{selected:false}` | `accessibilityState={{ selected: active }}`. |
| 2 | 69 | EDITORIAL | P3 | Raw route name rendered, no `textTransform` (harmless today) | Optional explicit casing for resilience. |

---

## Tasks (Inbox) — `screens/Tasks.tsx` (243 lines)
**Purpose:** Quick-capture input + goal-grouped list of uncommitted tasks + commit action.
**Verdict:** Functionally solid but noisy — capture area breaks "one accent per view," list rows don't reuse `TaskCard` (spec says they should), and horizontal padding drifts 4px.
**Spec conformance:** Partial. Grouping/goal-mark/estimate present. Fails "Reuses task card" (builds a parallel `InboxRow`).

| # | Line(s) | Element | Cat | Sev | Problem | Fix |
|---|---|---|---|---|---|---|
| 1 | 191–234 | `InboxRow` | REUSE/SPEC-DRIFT | P1 | Duplicates `TaskCard` (which already has `showMeter={false}` → `est N blocks`) | Delete `InboxRow`; render `<TaskCard ... showMeter={false} />`; move Delete to swipe/long-press. |
| 2 | 216–217 | Goal tick | REUSE | P1 | Hand-rolls `GoalMark` markup | Use `<GoalMark />` (A2). |
| 3 | 70 | Capture placeholder | EDITORIAL | P1 | `"+ New task — Enter saves and stays"` bakes an instruction into the placeholder | `"New task"`. |
| 4 | 53–56 | Header | EDITORIAL | P2 | `"Inbox"` + `"{n} tasks waiting"` — "waiting" filler, double-decker | `"Inbox · {n}"` single line. |
| 5 | 93–145 | Goal chips + estimate steppers | HIERARCHY | P1 | Multiple goal colors + ember active competing, no hero | Unselected chips neutral (`t3`/`line`); only the selected control uses color. |
| 6 | 93–114 | Goal filter chips | REUSE | P2 | Hand-rolled; no `Chip` primitive | Extract `Chip`/`SelectionChip` (A3). |
| 7 | 52 vs 60/159 | Horizontal padding | SPACING | P1 | Header `20` vs input/list `16` — visible 4px misalignment | Standardize gutter (A5). |
| 8 | 158/159 | `SectionRow` vs list | SPACING | P1 | Section label `20` vs cards `16` | Pass padding prop / fix `SectionRow` (A3/A5). |
| 9 | 226–231 | "Commit to today"/"Delete" links | REUSE | P2 | Hand-rolled `Pressable`+`Text`, loses `accessibilityRole` | Use `<GhostButton>`. |
| 10 | 183 | Empty state | EDITORIAL | P2 | `"Inbox zero. Capture the next task above."` — jargon + double-decker | `"Inbox is empty."` |
| 11 | 130 | Active border | TOKEN | P2 | `rgba(240,138,62,0.45)` inline | `color.emberLine` (A1). |
| 12 | 93–143 | Chips/estimate | A11Y | P2 | No role/state; estimate boxes 28×28 (<44px) | Add role/state; `hitSlop`. |

**Copy rewrites:** `"Inbox"`/`"{n} tasks waiting"`→`"Inbox · {n}"`; `"+ New task — Enter saves and stays"`→`"New task"`; `"Inbox zero. …"`→`"Inbox is empty."`

**Top 3:** (1) `InboxRow`→`TaskCard(showMeter=false)`+`GoalMark`. (2) Fix 16-vs-20 padding. (3) Strip placeholder/empty-state double-deckers.

---

## TaskCard — `components/TaskCard.tsx` (84 lines)
**Verdict:** Structurally right (surface/line/r-md/16pad); undermined only by not using `GoalMark` and a hardcoded color. `showMeter` already anticipates the Inbox case — it's just not called that way.

| # | Line(s) | Cat | Sev | Problem | Fix |
|---|---|---|---|---|---|
| 1 | 46–48 | REUSE | P1 | Duplicates `GoalMark` | Import + use `<GoalMark />` (A2). |
| 2 | 41 | TOKEN | P2 | `rgba(240,138,62,0.45)` inline | `color.emberLine` (A1). |
| 3 | 56–73 | REUSE | P3 | Bespoke radio circle (fine until a 2nd consumer appears) | Extract later. |

---

## ui.tsx — `components/ui.tsx` (118 lines)
**Verdict:** Incomplete vs spec/screens. `PrimaryButton`/`GhostButton`/`CircleButton` are good; the gaps force hand-rolling elsewhere.

| # | Line(s) | Cat | Sev | Problem | Fix |
|---|---|---|---|---|---|
| 1 | (missing) | SPEC-DRIFT | P1 | `SecondaryButton` (spec §6) does not exist anywhere | Add it (A3). |
| 2 | (missing) | REUSE | P2 | No `Chip`/`SelectionChip` | Add it (A3). |
| 3 | 108 | SPACING | P2 | `SectionRow` hardcodes `paddingHorizontal:20` → misalignment | Add padding prop (A3/A5). |
| 4 | 7–44 | SPEC | P3 | `PrimaryButton` meets 52–56px only via padding math | Add `minHeight:52`. |

---

## GoalMark — `components/GoalMark.tsx` (13 lines)
**Verdict:** Correct, minimal — but **dead code** (zero imports). Its only fix is to be used (A2), plus tick height `13`→`12`.

---

## Goals — `screens/Goals.tsx` (466 lines)
**Purpose:** Goal cards (identity, weekly count, twin rate meters) + create/edit/delete.
**Verdict:** Close to spec but leaks a **fabricated-looking dual-meter** and a footer that fuses an interaction tip with the spec motto. Heavy hardcoded pixel literals.
**Spec conformance:** Header/sub/card layout match. Meters are unlabeled and driven by one fake number. Footer copy diverges from spec text.

| # | Line(s) | Element | Cat | Sev | Problem | Fix |
|---|---|---|---|---|---|---|
| 1 | 88–89, 45 | Twin rate meters | STATE/EDITORIAL | P1 | Both derive from the **same** `weeklyBlocks` (`/9` and `/20`) — no real 7d/30d data; two bars imply independent signals from one number | Compute genuine 7d/30d totals, or collapse to ONE meter until that data exists. Don't fake a second window. |
| 2 | 88–89 | Meters | HIERARCHY | P2 | No legend distinguishing 7d (full) vs 30d (faded) | Add a tiny `7d`/`30d` caption, or fold into the footer. |
| 3 | 93–105 | Footer | SPEC-DRIFT/EDITORIAL | P1 | `"Tap a goal to rename, re-role, or delete it. Rolling rates, not streaks."` drops the spec's 2nd clause and bolts on an affordance tip | Restore verbatim: `"Rolling rates, not streaks. A slow week is data."` Drop the tap hint. |
| 4 | 69 | Block count | SPEC-DRIFT | P2 | `"{n} blocks this session"` — spec wants `"9 blocks/wk"` | `"{weeklyBlocks} blocks/wk"`. |
| 5 | 56–58,185,337,429 | Radii | TOKEN | P2 | `borderRadius:16/12/20` literals; `radius` not imported | Import `radius`; use `radius.md/sm/lg`. |
| 6 | 57,186,323 | Padding | TOKEN/SPACING | P3 | `padding:18` off-scale | Use `space[4]`/`space[5]`. |
| 7 | 447–450 | RateMeter | TOKEN | P2 | `height:4 radius:2` — off BlockMeter's spec'd 6/3, un-tokenized | Standardize meter thickness or document the difference. |
| 8 | 47–71 | Goal card | A11Y | P2 | Label set but children not collapsed → SR reads each `Text` separately | Mark card `accessible` / hide descendants. |
| 9 | 396–398 | Delete confirm | EDITORIAL | P3 | Wordy tail | `Delete "{title}"? Tasks stay, lose the goal.` |
| 10 | 174, 210 | "+ New goal"/"Create goal" | TOKEN | P3 | Ember on both affordance and commit | Ember only on `Create goal`; `+ New goal` neutral. |

**Copy rewrites:** footer → spec verbatim; `"{n} blocks this session"`→`"{n} blocks/wk"`; delete-confirm tightened.

**Top 3:** (1) Fix/collapse the fake dual-meter. (2) Restore spec footer. (3) `blocks/wk` label.

---

## BlockMeter — `components/BlockMeter.tsx` (51 lines)
**Verdict:** Tight, matches numeric spec (gap 4/height 6/radius 3). Two real gaps: a phantom segment on empty input, and zero a11y.

| # | Line(s) | Cat | Sev | Problem | Fix |
|---|---|---|---|---|---|
| 1 | 21 | STATE | P2 | `Math.max(1,total)` renders 1 empty segment when `total===0` — the ledger lies | Return `null` when `total<=0`; drop the floor. |
| 2 | 22–49 | A11Y | P2 | No label/role; SR gets N empty views | `accessible accessibilityLabel="{earned} of {total} blocks" accessibilityRole="progressbar"`; hide segments. |
| 3 | 41–43 | REUSE | P3 | `flexBasis`/`width`/`maxWidth` all driven by one value | Simplify to `width` + `flexGrow:0` + `flexShrink:0`. |
| 4 | 27 | TOKEN | P3 | `marginTop:12` literal | `space[3]`. |
| 5 | 16,32 | STATE | P3 | No clamp on `earned` | `Math.max(0, Math.min(earned, segments))`. |

---

## Insights — `screens/Insights.tsx` (503 lines)
**Purpose:** Reporting — weekly review, bar charts, heatmap, correlations, estimate-vs-actual, plan-vs-actual.
**Verdict:** **Badly overbuilt vs spec** and the "bulky/AI-ish" complaint peaks here: chatty personified empty/loading states, a triple-decker stat tile ×6, a coaching imperative, and ember used as a generic chart color in 3 unrelated sections.
**Spec conformance:** Low. §9 specifies exactly **3** blocks (10-week ember heat grid, estimate-vs-actual + one insight line, "This week" summary). The file ships **8** sections. The required 10-week calendar heat grid **does not exist** (there's a 7×24 day/hour grid with ternary shading instead). The one matching section (est-vs-actual twin bars) is **missing its required insight line**.

| # | Line(s) | Element | Cat | Sev | Problem | Fix |
|---|---|---|---|---|---|---|
| 1 | 86–312 | Whole screen | SPEC-DRIFT | P1 | 8 sections vs spec's 3 ("Today", identity roles, distractions, rituals, plan-vs-actual have no spec basis) | Cut to the 3 spec'd blocks; fold "Today" into the summary; demote the rest to a later details screen. |
| 2 | 418–454 | Heatmap | SPEC-DRIFT | P1 | 7×24 grid with `value?ember:emberDim:surface3` ternary; not the 10-week earned-blocks alpha-ramp grid with month ticks | Replace with the 10-week calendar grid, fill = ember scaled continuously by `value/max`, add month ticks. |
| 3 | 99,101,103,173,190,207,215,238 | Empty/error copy | EDITORIAL | P1 | "Gathering this week's story…", "taking a breather", "will light up after a few sessions" | Flat factual (see rewrites). No personification/coaching. |
| 4 | 150–151 | ReviewFact detail | EDITORIAL | P1 | `"Notice it, then return."` coaching line among 5 numeric siblings | Delete or replace with a number (minutes lost). |
| 5 | 182,199,299,441 | Bar/heatmap/"Off plan" fills | TOKEN | P1 | Ember used as generic fill for 4+ non-committed data series | Reserve ember for the weekly accent/heat grid; use `t3`/`t2` or goal color for bars; `danger` for "Off plan". |
| 6 | 349–358,373 | Stat sizes | TOKEN | P2 | `Fact` 30/800, `ReviewFact` 21/… — neither matches the 34/800 stat token, differ from each other | Standardize on the stat token; one intentional compact size max. |
| 7 | 369–371 | ReviewFact label | REUSE | P2 | Hand-rolls overline + `.toUpperCase()` | Use `overline` token. |
| 8 | 132–137,359–378 | Empty-detail tile | HIERARCHY/STATE | P2 | Renders empty `Text` with `marginTop` → ragged grid | Render detail only when truthy. |
| 9 | 105–502 | Spacing | SPACING | P2 | `gap:10`, `padding:18/14`, `height:7`, `marginTop:5/6/7` off-scale | Snap to `space.N`. |
| 10 | 243–272 | Est-vs-actual | SPEC-DRIFT | P2 | Twin bars correct but the required single insight line is absent | Compute aggregate ratio; render one line ("You ran ~X% over/under"). |
| 11 | 418–454 | Heatmap | A11Y | P2 | 168 cells, no labels | Add summary/per-cell `accessibilityLabel`. |
| 12 | 163–169 | "Today" section | STATE | P3 | No loading/empty handling unlike siblings | Fold into summary or add `AsyncBlock`. |
| 13 | 23 | `pretty()` | EDITORIAL | P3 | Lowercased tags vs Title-case labels | Title-case or make consistent. |

**Copy rewrites:** "Gathering this week's story…"→"Loading this week…"; "…taking a breather. Try again soon."→"Couldn't load weekly review. Retry."; "Your focus map will light up after a few sessions."→"No focus-hour data yet."; "Keep a few mornings and evenings consistent…"→"Needs 5+ days with/without a ritual to compare."; "Notice it, then return."→drop/number; "No abandoned sessions this week. Keep protecting your focus."→"No abandoned sessions this week."

**Top 3:** (1) Cut to spec's 3 sections. (2) De-ember the generic chart fills. (3) Rewrite every empty/loading/error string.

---

## icons — `components/icons.tsx` (145 lines)
**Verdict:** Mostly consistent nav family (1.8 stroke / 20px). Two real inconsistencies.

| # | Line(s) | Cat | Sev | Problem | Fix |
|---|---|---|---|---|---|
| 1 | 80–89 | TOKEN | P2 | `SettingsIcon` renders `18×18` in a `20×20` viewBox → ~10% smaller than sibling nav icons | Set `20×20`. |
| 2 | 131–144 | TOKEN | P2 | `CheckIcon` stroke `2.6/18` ≈60% heavier than nav family; called at `size=12` in MorningCommit → blobby | Drop to ~1.8–2.0 or scale stroke by size. |
| 3 | 123–129 | REUSE | P3 | `ResumeGlyph` — only icon with no color prop, not `*Icon` named | Rename `ResumeIcon`; add `fill` prop or document. |

---

## Crew — `screens/Crew.tsx` (368 lines)
**Purpose:** Weekly leaderboard + friends + forgiveness token.
**Verdict:** Solid but drifts on the two things §9 calls out: the "You" highlight and the row anatomy. Also bypasses `ScreenHeader` and duplicates the privacy line.

| # | Line(s) | Element | Cat | Sev | Problem | Fix |
|---|---|---|---|---|---|---|
| 1 | 89–95 | Header | REUSE | P1 | Hand-rolled (26/-0.4) instead of `ScreenHeader` (24/-0.3) — two header scales | Use `<ScreenHeader>` (after A4). |
| 2 | 92–94 | Header sub | SPEC-DRIFT | P1 | `"A little visible momentum. Nothing personal is shared."` vs spec | Spec verbatim: `"Weekly earned blocks. Totals only — tasks stay private."` |
| 3 | 138–151 | "You" row | SPEC-DRIFT | P1 | Only text recolored — no ember-wash bg / ember-line border (the spec'd ONLY highlight) | Wrap in `emberWash` bg + `emberLine` border when `row.userId===session.user.id`. |
| 4 | 131–156 | Leaderboard row | SPEC-DRIFT | P1 | Missing initials avatar (goal-color bg) and thin bar | Add 24–28px initials avatar + proportional bar. |
| 5 | 356–359 | Forgiveness row | EDITORIAL/DENSITY | P1 | Title + description double-decker | One line: `"Forgiveness token · one per week, protects one missed day."` |
| 6 | 227–238 | Footer disclaimer | DENSITY | P2 | Restates the header privacy claim | Delete once #2 lands. |
| 7 | 105–107 | Streak caption | EDITORIAL | P2 | `"…misses dent rates, they do not erase them"` — reassuring, not factual | `"day streak"` (or trim). |
| 8 | 319 | Action bg | TOKEN | P3 | `rgba(240,138,62,0.14)` inline | `color.emberWash` (A1). |
| 9 | 175 | Empty state | EDITORIAL | P3 | `"…make progress visible together."` marketing | `"Your Crew is empty. Invite someone by email."` |
| 10 | 160–169 | Invite input/Action | A11Y | P3 | No label/role | Add `accessibilityLabel`/`role`/`state`. |
| 11 | 96–113 | Rhythm card + MotivationPanel | SPEC-DRIFT | P3 | Not in §9; pushes the leaderboard below the fold | Confirm vs full spec; demote if not spec'd. |

**Top 3:** (1) Highlight the "You" row (spec's only accent). (2) Collapse forgiveness to one line. (3) `<ScreenHeader>` + spec sub, delete footer.

---

## Evening Close — `screens/EveningClose.tsx` (286 lines)
**Purpose:** End-of-day close — stats, plan-match, one-line note, submit.
**Verdict:** Header/stats clean, but **bulkier than spec**: two extra decision blocks not in §9, while the one required feature — the rate-slip nudge — is **absent**. Net effect: more taps, missing the useful nudge.

| # | Line(s) | Element | Cat | Sev | Problem | Fix |
|---|---|---|---|---|---|---|
| 1 | (absent) | Rate nudge | SPEC-DRIFT | P1 | Spec requires a recessed ember-wash nudge when 7-day rate slips; not implemented | Add it between stats and the plan question, off a 7d-rate signal ("7-day rate is at 64%. Tomorrow, commit one task fewer and finish it."). |
| 2 | 132–164 | "Did the day match the plan?" Yes/No | SPEC-DRIFT/DENSITY | P1 | Extra block not in §9 | Cut, or fold into the tag picker (#3). |
| 3 | 166–196 | "What shaped the day" tags | SPEC-DRIFT/DENSITY | P2 | Not in §9; `'on-plan'` duplicates the Yes/No answer | Merge: drop Yes/No, keep tags as the single "what happened", default `on-plan`. |
| 4 | 208 | Textarea placeholder | EDITORIAL | P2 | `"What did today teach you?"` coaching prompt | `"One line on today."` |
| 5 | 109–111 | Closed-state stat line | SPEC-DRIFT | P3 | Run-on blocks+minutes sentence | Two short stat chips (mirror the pre-close cards). |
| 6 | 72,84,86,154,182,184,215 | Wash/line colors | TOKEN | P3 | Inlined rgba | Tokenize (A1). |
| 7 | 143–163,174–194 | Toggle buttons | A11Y | P2 | No role/selected state | Add `accessibilityRole`/`state`. |
| 8 | 113–117 | "Back to Today" | A11Y | P3 | No affordance/role | Add role + chevron. |

**Top 3:** (1) Implement the missing rate nudge. (2) Cut the redundant Yes/No block. (3) Factual textarea placeholder.

---

## Morning Commit — `screens/MorningCommit.tsx` (179 lines)
**Purpose:** Pick 1–3 tasks for the day; sticky commit button.
**Verdict:** Closest to spec of the ritual screens. Two small text/state drifts.

| # | Line(s) | Element | Cat | Sev | Problem | Fix |
|---|---|---|---|---|---|---|
| 1 | 63 | Header sub | SPEC-DRIFT | P2 | `"Pick up to 3. …"` — spec keeps `"Pick 1–3. Small and true beats big and false."` verbatim; "up to 3" drops the floor | Restore `"Pick 1–3. …"` |
| 2 | 170–174 | Sticky button | SPEC-DRIFT | P2 | Shows `"Select at least one task"`; spec disabled copy is `"Pick 1–3 tasks"` | `len===0 ? "Pick 1–3 tasks" : "Commit N tasks"`. |
| 3 | 95–121 | Candidate checkbox | A11Y | P2 | No `accessibilityRole="checkbox"`/`checked` | Add them. |
| 4 | 136–138 | Estimate label | EDITORIAL | P3 | `"est {n}"` ambiguous | `"{n} blocks"`. |
| 5 | 57 | `canCommit` | REUSE | P3 | `<=3` is dead (toggle caps at 3) | Simplify/comment. |

**Top 3:** (1) Spec-verbatim header. (2) Spec disabled-button copy. (3) Checkbox a11y.

---

## ScreenHeader — `components/ScreenHeader.tsx` (49 lines)
**Verdict:** Clean, but its title size matches no token, and Crew bypasses it — the component meant to keep headers consistent is inconsistent with itself.

| # | Line | Cat | Sev | Problem | Fix |
|---|---|---|---|---|---|
| 1 | 39 | TOKEN | P1 | `fontSize:24/-0.3` matches no type token (H1 is 26/-0.4); Crew uses 26/-0.4 | Set `26/-0.4` (A4); migrate Crew onto it. |
| 2 | 39 | A11Y | P3 | No `accessibilityRole="header"` | Add it. |
| 3 | 38–45 | SPACING | P3 | No `numberOfLines`/ellipsize guard | Add `numberOfLines`. |

---

## Settings — `screens/Settings.tsx` (396 lines)
**Purpose:** Account, ritual-cue times, paired devices, version/update — pushed behind the Today header icon.
**Verdict:** Correct entry-row tokens and header reuse, but 5 rows hand-roll the same shell, a literal sentence is duplicated, and the destructive Revoke has **no confirmation**.

| # | Line(s) | Element | Cat | Sev | Problem | Fix |
|---|---|---|---|---|---|---|
| 1 | 89–97,179–184 | Revoke button | INTERACTION | **P0** | `revoke(device.id)` fires immediately — no confirm for an irreversible, security-relevant action; neutral `t4` tint (not destructive) | Add a confirm (`Alert.alert` or "tap again to confirm"); tint `danger`/`dangerDim`. |
| 2 | 211–213,232–234 | Device-token panel | EDITORIAL | P1 | Two lines both say "shown once" | Keep one: `"Device token — copy it into the firmware now."` |
| 3 | 107–129,156–170,214–223,306–314,346–358 | 5 entry rows | REUSE | P2 | Same shell repeated 5×, padding drifts (15 vs 12) | Extract `EntryRow` (A3); standardize padding. |
| 4 | 123–128,179–184,187–198,320–326 | 4 buttons | REUSE | P2 | Hand-rolled `Pressable`+`Text` = `GhostButton`'s signature | Use `<GhostButton>`. |
| 5 | 133–148 | Section headers | REUSE | P3 | 4× hand-rolled overline instead of `SectionRow` | Use `<SectionRow>`. |
| 6 | 268–291 | UpdateRow status | HIERARCHY/EDITORIAL | P2 | 20-line ternary of verbose sentences | Trim to Label terseness; `state.detail` → debug-only. |
| 7 | 145–147 | Ritual-cues footer | EDITORIAL | P3 | Third unlabeled disclosure sentence | Delete or inline as `t5` note. |
| 8 | 145,173,232,329 | Captions | TOKEN | P3 | `text(600,{fontSize:12})` re-derived ad hoc | Use a `caption` token if present. |

**Copy rewrites:** `"Device token — shown once, copy it into the firmware:"` + `"Shown once — copy it now."`→`"Device token — copy it into the firmware now."`; `"Could not verify the download — try again."`→`"Verify failed — retry."`; `"You are on the latest version."`→`"Up to date."`; `"Network error — try again."`→`"Offline — retry."`

**Top 3:** (1) Confirm on Revoke. (2) Kill the duplicate "shown once". (3) Extract `EntryRow`/use `GhostButton`.

---

## Sign In — `screens/SignIn.tsx` (123 lines)
**Purpose:** Email/password auth gate — the first screen a logged-out user sees.
**Verdict:** Lean and close to spec (inputs/button match §6). Gaps: fixed `paddingTop:120` (no safe-area), error/notice look identical, no client validation, a marketing tagline.

| # | Line(s) | Element | Cat | Sev | Problem | Fix |
|---|---|---|---|---|---|---|
| 1 | 42 | Top padding | SPACING/A11Y | P2 | `paddingTop:120` magic, no `useSafeAreaInsets` (Settings uses insets) | `insets.top + space.10`. |
| 2 | 49–51 | Tagline | EDITORIAL | P2 | `"Goal-bound focus. One block at a time."` — marketing copy / second subtitle under the title | Delete; overline "Ekagra" + "Sign in" is enough. |
| 3 | 84–85 | Error/notice | HIERARCHY | P2 | Both plain `Text`, differ only by color; a real error reads as a passive caption | Give error a `dangerDim` background chip (like Settings' green success box). |
| 4 | 21–38 | `submit()` | STATE | P2 | No client validation; raw Supabase `err.message` shown verbatim | Guard empty fields; map/sanitize SDK errors to plain copy. |
| 5 | 30 | Signup notice | EDITORIAL | P3 | Hedged "if confirmation is required" | Commit to the true branch. |
| 6 | 94–98 | Mode toggle | INTERACTION | P3 | No pressed-state opacity (rest of app has it) | Add `opacity: pressed?0.6:1`. |
| 7 | 88–90 | Busy label | EDITORIAL | P3 | Generic `"Please wait…"` | `"Signing in…"` / `"Creating…"`. |

**Copy rewrites:** tagline → delete; `"Account created. Check your email if confirmation is required, then sign in."`→`"Account created — sign in."`; `"Please wait…"`→mode-aware.

**Top 3:** (1) Delete tagline. (2) Safe-area top padding. (3) Client validation + sanitized errors.

---

# §D. Handoff notes for the fixing agent

- **Order:** §A (cross-cutting) → §B priority index → remaining per-page P2/P3.
- **Batch by category** where cheaper than by page: e.g. do the whole ember-wash tokenization
  (A1) in one pass across all files; do the a11y role/label pass in one sweep.
- **After any mobile change, check the web mirror** (`apps/web/src/...`) — the two are 1:1.
- **Verify voice changes against `docs/design/refined/DESIGN-SPEC.md` §10** — where the spec gives
  exact copy, use it verbatim; don't paraphrase.
- **Two changes are behavioral, not cosmetic** — treat as real fixes with a test/observe step:
  Focus block-meter color bug (Focus #4) and Settings Revoke confirmation (Settings #1).
- **Don't over-correct into terseness that loses meaning** — the goal is *confident*, not *cryptic*.
  Keep the one instruction line the spec explicitly preserves (MorningCommit sub).
