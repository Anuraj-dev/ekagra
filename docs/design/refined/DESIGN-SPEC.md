# Ekagra — Refined Design Direction (v1)

Dark-first focus app built around a **goal-bound, hard-block Pomodoro timer**. This spec
replaces the rough prototype's "spiritual dusk" styling with a calmer, more editorial and
confident system. It keeps the prototype's good product mechanics and its core token palette,
and strips everything that read as generic or templated.

Frames are **390 × 844** (mobile). The system is built to translate cleanly to both Expo
(React Native) and web.

---

## 1. Design principles

1. **The timer is the product.** Every other screen is support. Focus mode gets the boldest
   type, the calmest field, and the most deliberate motion.
2. **Honest, not preachy.** Numbers are shown plainly. No affirmations, no wellness poetry,
   no "you showed up" copy. The interface respects the user's intelligence.
3. **Quiet by default, warm on commitment.** Neutral graphite is the resting state; the ember
   accent appears only where the user has committed (a chosen task, a running timer, an earned
   block). Warmth is earned, not sprayed everywhere.
4. **Structure over decoration.** Hierarchy comes from type weight, spacing, and a restrained
   accent — not from gradients, glows, or badges. One accent moment per view, maximum.
5. **Goal color is data.** The per-goal colors carry meaning (which goal a task serves). They
   are used as small, precise marks — never as mood lighting.

### Deliberately killed vs the prototype
- Dusk gradient hero with sun + hills → flat editorial header with a thin day-progress ledger.
- Repeated "diagonal gradient + soft accent border" special cards → one flat surface system.
- Dot + pill badge on everything → goal shown as a 3px color **tick + label**, used once per row.
- Pulsing dots / drifting blur / breathing glow everywhere → motion reserved for the timer only.
- Frosted iOS pill tab bar → solid flat bar, hairline top border, active-tab tick indicator.
- All Hindi/Sanskrit labels and Devanagari → plain English (see §9).
- Bubbly 24–28px radii → tightened, intentional radius scale (§5).

---

## 2. Color tokens

Kept from the prototype (cleaned, named). Hex is the source of truth.

### Surfaces & lines
| Token | Hex | Use |
|---|---|---|
| `--bg-deep` | `#07080A` | Page behind the device frame; deepest wells |
| `--bg` | `#0E0F12` | App background (default screens) |
| `--bg-focus` | `#0A0B0E` | Focus mode background (one step darker, more cinematic) |
| `--surface` | `#16181D` | Primary card / raised surface |
| `--surface-2` | `#111318` | Recessed / secondary surface (entry rows, wells) |
| `--surface-3` | `#1B1E24` | Hover / pressed / selected surface |
| `--line` | `#23262E` | Default border |
| `--line-soft` | `#1D2028` | Track fills, hairlines, quiet dividers |

### Text ramp
| Token | Hex | Use |
|---|---|---|
| `--t1` | `#ECEDEF` | Primary text, timer, headings |
| `--t2` | `#B9BDC4` | Secondary text, active labels |
| `--t3` | `#8A8F98` | Tertiary, section labels |
| `--t4` | `#6B7078` | Muted captions, inactive tabs |
| `--t5` | `#41454D` | Faintest — hints, footnotes, disabled |

### Accents
| Token | Hex | Use |
|---|---|---|
| `--ember` | `#F08A3E` | Primary accent: commitment, running timer, earned blocks |
| `--ember-hi` | `#FFB25E` | Hover / active / leading edge highlight |
| `--ember-dim` | `#7C5638` | Paused / desaturated ember (state signalling) |
| `--green` | `#5BBF8A` | Success, break phase, earned confirmation |
| `--goal-mauve` | `#C48FBF` | Goal color — **Robotics Mission** |
| `--goal-blue` | `#7C9BC4` | Goal color — Freelance / Founder |
| `--goal-tan` | `#B7A46B` | Goal color (unassigned / future goal) |

Ember is **purely system meaning** (commitment, running timer, earned blocks, active tab). No goal
uses it: Robotics Mission gets its own hue (mauve `#C48FBF`) so accent orange always reads as
"the system is on", never "which goal".

### Accent tints (for wells / fills only — never gradients)
`--ember-wash: rgba(240,138,62,.10)`, `--ember-line: rgba(240,138,62,.45)`,
`--green-wash: rgba(91,191,138,.12)`, `--green-line: rgba(91,191,138,.40)`.

---

## 3. Typography

**Manrope** (kept), Google Fonts, weights 400/500/600/700/800. Tabular numerals everywhere a
number can change (`font-variant-numeric: tabular-nums`). No second family — Manrope's range
carries display through caption; consistency is the point.

| Role | Size / Weight | Tracking | Notes |
|---|---|---|---|
| Timer | 86 / 800 | -3px | Tabular. Legible at 2 m. The one true display element. |
| Timer (compact/other numerics) | 34 / 800 | -0.5px | Stat values |
| H1 (screen title) | 26 / 800 | -0.3px | Today, Goals, Insights |
| H2 (card / block title) | 20 / 800 | -0.2px | Bound task title on Focus |
| Title | 16 / 700 | -0.1px | Task titles in lists |
| Body | 15 / 500 | 0 | Reflection, descriptions. Line-height 1.5 |
| Label | 13 / 600 | 0 | Sub-labels, secondary meta |
| Caption | 12 / 600 | 0 | Meta, counts |
| Overline | 11 / 700 | +1.4px, UPPERCASE | Section labels, phase label |

Line length in prose blocks capped ~40 chars given the 390 frame; line-height 1.5–1.6.

---

## 4. Spacing

4px base grid. Scale: **4 · 8 · 12 · 16 · 20 · 24 · 32 · 40**.
- Screen horizontal padding: **20px** (headers), **16px** (card columns, so cards get 16px gutters).
- Card internal padding: **16–20px**.
- Vertical rhythm between sections: **20–24px**.
- Safe zones: 56px top (status bar clearance on non-header screens), 96px bottom when tab bar present.

---

## 5. Radius & elevation

**Radius scale** (tighter and more intentional than the prototype's uniform 24–28):
| Token | Value | Use |
|---|---|---|
| `--r-xs` | 8px | Chips, ticks, small tags |
| `--r-sm` | 12px | Inputs, small controls |
| `--r-md` | 16px | Cards (default) |
| `--r-lg` | 20px | Hero / feature surfaces |
| `--r-pill` | 999px | Buttons, phase labels, tab indicator |

**Elevation** — no `rgba(0,0,0,0.1)` slop. Depth comes from surface steps + borders. Two real shadows only:
- `--shadow-fab: 0 10px 30px rgba(240,138,62,.30)` — the running/resume primary control only.
- `--shadow-sheet: 0 -8px 40px rgba(0,0,0,.55)` — bottom sheets / raised bars.

Focus mode adds one **radial vignette** (not a gradient card): a faint ember glow anchored below
the ring while running, removed while paused. This is atmosphere, not a component.

---

## 6. Component inventory

### Buttons
- **Primary (filled ember):** `bg #F08A3E`, text `#0E0F12`, weight 800, pill, 52–56px tall.
  Hover/press → `#FFB25E`. Disabled → `bg #1D2028`, text `#6B7078` (used for the hard-block
  "Pick a task" state). Never a gradient fill.
- **Secondary (outline):** transparent, `1px #23262E` border, text `#B9BDC4`. Hover border `#3A3F49`.
- **Ghost / text:** ember text, no chrome (e.g. "Edit", "End session").
- **Circular control (FAB):** 76px, the timer's pause/resume. Filled ember when it starts the
  timer; outline when it pauses (see §8).

### Cards
One surface system, no per-card gradients:
- **Task card:** `--surface`, `1px --line`, `--r-md`, 16px pad. Selected → border `--ember-line`
  + surface `--surface-3`. Contains: goal mark row, title, block-progress meter.
- **Stat card:** `--surface`, `1px --line`, `--r-md`. Big tabular number + overline label.
- **Entry row (recessed):** `--surface-2`, `1px --line-soft`, `--r-md` — quieter than a card
  (used for "Close the day" entry, settings rows).

### Goal mark (replaces dot+pill badge)
A **3px-wide, 12px-tall rounded color tick** in the goal color, followed by the goal name in that
color at 12/700. Compact, precise, used **once per row**. No filled pill, no glow.

### Block meter (replaces block dots)
Segmented horizontal bar. Each segment = one estimated block. Earned segments filled goal-color
(or ember on aggregate); remaining segments `--line-soft`. Segment gap 4px, height 6px, radius 3px.
This reads as a ledger, not decoration.

### Day ledger (Today header)
A single row of slim vertical ticks — one per planned block across all tasks. Earned = ember,
planned = `--line-soft`; earned ticks may carry a barely-there ember halo. Communicates the
whole day at a glance without turning the header into a progress bar.

### Pills / chips
- **Phase label (Focus):** overline text in a pill, `--surface` bg, `1px --line`. NO pulsing dot.
  A tiny 6px goal/phase tick sits left of the text, static.
- **Earned toast:** green-wash pill, one-time entrance, auto-dismiss (see motion).

### Inputs
- Textarea/text: `--surface`, `1.5px --line`, `--r-sm`, 16px pad, text `--t1`, 15/500.
  Focus → border `--ember`. Placeholder `--t4`.

### Timer ring
Simple graphics, satisfying result — the ring is two circles and a glow, nothing more:
- SVG, **312px outer, r=146**, rotated -90°.
- **Track:** 2px hairline, `#1A1D23` — barely-there orbit that makes the progress arc read as light.
- **Progress:** 8px stroke, `stroke-linecap: round`, phase color (ember work / green break).
  The stroke carries its **own glow** via layered drop-shadows on the stroke itself
  (`drop-shadow(0 0 5px rgba(240,138,62,.6)) drop-shadow(0 0 16px rgba(240,138,62,.25))`) —
  no separate rotating glow element, no blur discs. The luminosity IS the arc.
- Progress motion: `stroke-dashoffset` transition 1s linear per tick; the whole stroke breathes
  opacity .94→1 over 4s (the only idle motion).
- Numerals: 86/800, -3px tracking, tabular, centered in the ring; overline sub-label beneath.
- Paused: progress stroke → `--ember-dim` static (glow removed), remaining arc → 2px dashed
  hairline (`3 8`), numerals drop to `--t3`.

### Tab bar
Solid, flat, honest — NOT frosted glass. `--bg` with a `1px --line` top hairline, 64px tall,
extends full width (safe-area padding at bottom on device). **5 items: Today · Goals · Insights ·
Crew · Tasks** (Tasks = the inbox). Icon + 11/700 label. Active item → ember icon + label, plus a
3px ember tick indicator above the icon. Inactive → `--t4`. No blur, no floating pill, no shadow
bloom. **Settings is not a tab** — it lives behind a 38px circular header icon (top-right of
Today), styled like the focus screen's chevron button.

---

## 7. Motion rules

Easing: `--ease: cubic-bezier(.2,.8,.2,1)` (settling), `--ease-in: cubic-bezier(.4,0,1,1)` (exits).
Respect `prefers-reduced-motion`: disable the ring glow rotation and breathing; keep instant state
changes and opacity-only transitions.

| Moment | Spec |
|---|---|
| Screen enter | Content fade + 8px rise, 320ms `--ease`, single stagger (header → body). Not per-section. |
| Task select | Border + surface color, 180ms. No scale. |
| **Start timer** | Ring sweeps from 0 to current in 480ms `--ease`; FAB morphs play→pause icon (140ms cross-fade); ember vignette fades up (300ms). |
| **Running (idle loop)** | Whole progress arc breathes opacity .94→1 over 4s ease-in-out; vignette breathes .7→1 over 7s. Nothing rotates. Timer digits do NOT animate per second (no flicker) — value swaps cleanly, tabular width prevents shift. |
| **Pause** | 220ms: stroke desaturates to `--ember-dim`, glow fades out, remaining arc dashes in, timer text dims to `--t3`, FAB → filled ember "Resume". Everything settles, nothing pulses. |
| **Block earned / complete** | Ring completes → one green ring flash (scale 1→1.04→1, 500ms) + green toast rises (fade+rise 400ms), auto-dismiss 4s. Single celebration, no confetti, no repeat. |
| Button press | Opacity/contrast shift, 120ms. No bounce. |
| Micro-interactions | 150–220ms range. Transform/opacity only. |

---

## 8. Focus screen — the two states (the hero)

Shared layout, top→bottom:
1. **Top bar:** close chevron (left), centered overline "FOCUS" with a static ember phase tick
   (ember = system running, not goal), "BLOCK 3 OF 3" beneath in `--t4`. Symmetric spacer right.
2. **Ring block:** 312px ring (hairline track + 8px luminous arc, see §6), centered. Inside:
   timer `25:00` at 86/800 tabular, and a small overline under it ("REMAINING" running /
   "PAUSED" paused).
3. **Bound task (first-class):** task title at 20/800, then goal mark (tick + goal name) and the
   block meter. This is the emotional anchor — the user sees *what* they committed to, not a caption.
4. **Primary control + secondary:** the FAB, then a ghost "End session — minutes are kept".
5. **Footer hint (conditional):** one line, `--t5`, shown **only when a paired Ekagra Desk device
   is connected**: "Desk light mirrors this timer" (running) / "Paused · desk light dimmed"
   (paused). With no device paired, the footer is absent entirely — no placeholder.

**Running state**
- Background `--bg-focus` + ember vignette anchored ~70% down.
- Ring stroke full ember with its self-glow; whole arc breathes opacity slowly.
- Timer `--t1`, sub-label "REMAINING" in `--t4`.
- FAB = **outline** circle with pause glyph (`--t1` stroke on transparent, `1px --line`), i.e. the
  calm "you're in flow, tapping stops it" affordance. No loud button while running.
- Footer visible.

**Paused state**
- Vignette removed; flat `--bg-focus`. Cooler, stiller.
- Ring stroke `--ember-dim`, remaining arc dashed hairline, no glow, fully static.
- Timer dims to `--t3`; sub-label "PAUSED" in `--ember` (the one warm cue that you're mid-session).
- A small "PAUSED" chip may replace the phase tick color.
- FAB = **filled ember** resume glyph with `--shadow-fab` — now it's the loud, obvious way back in.
- Secondary "End session" gains slightly more presence (it's a real decision point).

The contrast is intentional: **running is quiet** (don't distract the worker), **paused is loud**
(get them back to work). This inversion is the core interaction idea.

**Break phase** reuses running layout with green phase color, phase label "BREAK", and copy that
states the fact ("5:00 break · block 3 banked") — no "breathe" instruction.

---

## 9. Per-screen layout notes (all 7 + Morning Commit)

**Today** — Flat header: date overline, "Good morning, Arjun" (26/800), a 40px circular **settings
icon button** top-right (settings has no tab), status line
"2 of 6 blocks earned · 71 honest minutes" (13/600 `--t3`). Below: **Day ledger** ticks.
Section "COMMITTED · 3 TASKS" (overline) with ghost "Edit". Task cards (goal mark, title, block
meter). Then the **Start focus** bar — disabled well when no task selected (hard-block made
visible), ember bar when a task is selected, showing "Start · 25:00" + task title. Then the quiet
"Close the day" entry row. No hero gradient, no affirmation.

**Focus** — see §8.

**Tasks / Inbox** — Header "Inbox" + count. Flat list of all candidate tasks grouped by goal
(goal-color section headers with mark). Each row: checkbox-free; title, goal mark, estimate
("est 3 blocks"). Swipe/tap affordances for commit. Reuses task card without the block meter
(these aren't started yet). A "+ New task" ghost row at top.

**Goals** — Header "Goals" + plain sub ("What you're building, block by block" — factual, not
"who you are becoming"). Goal cards: goal mark + role overline + name; right-aligned "9 blocks/wk"
tabular. Two thin meters: 7-day rate (goal color, full opacity) and 30-day rate (goal color, .45).
Footer factual: "Rolling rates, not streaks. A slow week is data." Kept mechanic, trimmed copy.

**Insights** — Header "Insights" + "Honest numbers." (drop "held gently"). (1) **Earned blocks,
10 weeks** heat grid — ember alpha ramp on `--surface`, month ticks. (2) **Estimate vs actual**:
per-task twin bars (estimate ghost track `--surface-3`, actual filled goal-color) + one factual
insight line ("You run ~20% optimistic on estimates."). (3) **This week** summary card — NOT a
gradient card; a plain `--surface` card with an ember overline "THIS WEEK", the numeric facts,
and one concrete suggestion. No purple, no glow.

**Crew** — Header "Crew" + "Weekly earned blocks. Totals only — tasks stay private." Forgiveness
token as a plain recessed row (green mark, one factual line). Ranked list: rank number, initials
avatar (goal-color bg), name, thin bar, tabular block count. "You" row uses ember-wash surface +
ember-line border (the only highlighted row). No leaderboards drama.

**Evening Close** — Header "Evening Close" + "Close the day." (factual). Two stat cards (blocks
earned ember / honest minutes green). Optional **rate nudge** as a recessed ember-wash note, only
when the 7-day rate slips — factual and forward ("7-day rate is at 64%. Tomorrow, commit one task
fewer and finish it."). "One line" textarea + "Close the day" primary. Closed state: a calm
confirmation card (green check, "Day closed.", the reflection quoted, "Blocks banked."). No
"Shubh rātri", no "Rest is part of the work".

**Morning Commit** (flow, reached from Today "Edit" / new day) — Header "Morning Commit" + "Pick
1–3. Small and true beats big and false." (this one line is kept — it's instruction, not
affirmation). Candidate list with real checkboxes (ember when selected), goal mark + estimate.
Sticky bottom primary: "Commit 3 tasks" (ember) / "Pick 1–3 tasks" (disabled well). Enforces the
hard-block precondition: you can't start a day with zero commitments.

---

## 10. Voice & copy guidelines

- **Plain, present tense, factual.** State what is true. "2 of 6 blocks earned." "Minutes are kept."
- **No affirmations or therapy-speak.** Ban: "You showed up", "Rest is part of the work",
  "Breathe", "one-pointed", "who you are becoming".
- **Forward, not consoling.** When a rate slips, give the next action ("commit one task fewer"),
  not comfort.
- **Second person, sparing.** Address the user directly only for instructions and their own data.
- **Numbers do the talking.** Prefer a number + unit over an adjective. Never inflate.
- **English only.** App name "Ekagra" stays as a proper noun; no gloss, no Devanagari.
- **Overlines are labels, not slogans.** "COMMITTED · 3 TASKS", "THIS WEEK", "FOCUS".

---

## 11. Accessibility & platform notes

- Contrast: body text `--t2`/`--t3` on `--surface` clears 4.5:1; `--t4`/`--t5` reserved for
  non-essential meta only. Ember on `--bg` and `#0E0F12` on ember both pass for large text.
- Touch targets ≥ 44px (FAB 76, tab items full-height 64, task cards tall).
- Color is never the only signal: goal is color **+** name; phase is color **+** label; earned is
  fill **+** count.
- `prefers-reduced-motion`: kill ring glow rotation + breathing + vignette fade; keep static states.
- Translates to Expo: all effects are opacity/transform/border/color (Reanimated-friendly). The
  ring is an SVG stroke-dashoffset (react-native-svg). No web-only filters are load-bearing except
  the ambient blur glow, which degrades to a solid low-opacity radial on native.
