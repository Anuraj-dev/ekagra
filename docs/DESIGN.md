# DESIGN.md — ekagra v2 design law ("Warm Planning Desk")

> Single source of design truth for the v2 rebuild. **This file + the v2 wireframes are law.**
> If a request conflicts with it, flag the conflict — do not silently diverge.
>
> - Visual source of truth: `docs/design/v2/Warm Planning Desk Wireframes.dc.html` (13 frames, `1a`–`1m`).
> - Functional spec: `docs/specs/001-app-v2-redesign.md` (§6 is the design section this doc expands).
> - **Superseded:** `docs/design/refined/DESIGN-SPEC.md` (dark-ember v1) — do not consult for v2.
> - Tokens implemented in `apps/web/src/theme/tokens.ts` (mobile re-exports; see §12). Hex is truth.

## 0. Precedence & how to use this doc

1. This doc defines tokens and component rules. The wireframe frame it cites (e.g. `[1e]`) is the pixel reference.
2. Every agent building UI (Claude **or** codex/Luna) must be handed this doc's relevant sections inline — Luna cannot invoke the design skill, so the dispatch prompt carries the law.
3. When in doubt about a value not covered here, read the cited wireframe frame; do not invent hexes.

**Open decision (do not resolve unasked):** the wireframes brand the app **"Tempo"** (Focus wordmark `[1e]`,
Android notification `[1h]`), while the repo/product is **ekagra**. Product name for v2 UI copy is Raja's call —
until decided, keep the wordmark as a single `APP_NAME` constant, do not hard-code either string in screens.

---

## 1. Brand & voice

- **Feeling:** a warm planning desk — paper neutrals, calm, unhurried, instrument-grade for the timer. Not a "productivity dashboard," not therapy-app soft. Analog-desk meets precision tool.
- **Voice:** factual, explains state. "Saves to Inbox for later triage." / "Timer holds until you resume." Never therapy-speak, never hype. Copy states *where a thing goes* and *what will happen*.
- **One accent moment per view.** Quiet Indigo is a scalpel, not a highlighter — the primary CTA, the current pip, the active toggle. Ink (near-black) does most of the "selected/strong" work; indigo is reserved.
- **Icons:** line icons (lucide on RN). No emoji as icons. Wireframe glyphs (▶ ↺ ≫ ❚❚) are placeholders for real icons.

---

## 2. Color

### 2.1 Light theme — primary

| Role | Hex | Usage |
|---|---|---|
| `canvas` | `#f7f1e8` | App background (phone surface) |
| `canvasDeep` | `#efe9dd` | Desk surround / notification tray bg |
| `surface` | `#fdfaf4` | Raised cards (goal cards, notification card) |
| `surfaceSunk` | `#f2ead9` | Selected/inset wells (active timeline row, narrative block, goal chip fill) |
| `navBar` | `#f2ebdd` | Bottom nav background |
| `ink` | `#201914` | Primary text; strong/selected fills; high-priority dot |
| `inkOnDark` | `#f7f1e8` | Text on ink / dark chips / snackbars |
| `textSecondary` | `#6f6355` | **Informational** secondary text (passes AA, 5.2:1) — labels that carry meaning |
| `textMetaDecorative` | `#8a7c6c` | **Decorative** meta only (≤3.6:1 — never for info-bearing text; see §10) |
| `textPlaceholder` | `#a4977f` | Input placeholders, empty-state hints, tertiary |
| `line` | `#eae1d0` | Card borders, row dividers |
| `lineSoft` | `#e6dcc9` | Subtle dividers, nav top border, progress track (light), empty meter bar |
| `lineInput` | `#ddd2bf` | Input underlines |
| `lineStrong` | `#c9bda8` | Chip outlines, outline-button borders, drag handle |
| `accent` | `#6753c7` | Quiet Indigo — primary CTA, current pip, active toggle, accent moment |
| `accentPressed` | `#52409f` | Indigo pressed state |
| `accentOnDark` | `#c3b6f5` | Indigo tint for actions on dark surfaces (snackbar UNDO, mini-chip dot) |
| `dangerBg` | `#f6e2dc` | Failure banner background |
| `dangerLine` | `#dcb2a4` | Failure banner border / start-fail chip border |
| `dangerText` | `#5d2b1c` | Failure text + RETRY |
| `snackbarBg` | `#2a2119` | Dark snackbar / mini-timer chip / burst-flash pill |

**Priority / status dots:** P1/high = `ink`; mid = `#a4977f` (solid); low = transparent w/ `1.5px #a4977f` ring. Completed row: 55% opacity, strike-through in `#6f6355`, `✓` glyph.

### 2.2 Dark theme — derived (not primary)

Dark is *derived* from light; only Focus `[1f]` is fully specced in wireframes. Derive the rest by mapping roles:

| Role | Hex |
|---|---|
| `canvas` | `#1c1712` |
| `ink` (text) | `#ede4d6` |
| `textSecondary` | `#a4977f` |
| `textMetaDecorative` | `#8a7c6c` |
| `line` / track | `#3a3128` |
| `lineStrong` | `#4d4236` |
| progress fill | `#ede4d6` |
| `accent` | `#6753c7` (unchanged — accent is theme-invariant) |

### 2.3 Goal accent

Goals use **ink for their bar meters** in v2 wireframes (`[1i]` bars are indigo but that is the *accent moment*; goal identity is by name+chip, not per-goal hue). Keep the neutral system — do **not** reintroduce per-goal color hues from v1. The `goalPalette` export stays for back-compat but is unused in v2 screens.

---

## 3. Typography

Three families, three+ semantic roles. **Monospace is timer-only.**

| Family | Where |
|---|---|
| `Source Serif 4` (600, tracking −.01em) | **Display** — screen titles, goal names, narrative-insight sentence, session-complete heading, app wordmark |
| `Instrument Sans` (400/500/600) | **Body / UI** — everything else |
| `JetBrains Mono` (500/600) | **Timer readout only** — hero MM:SS, mini-chip time, notification time |

**Roles & scale (from wireframes):**

| Role | Font / size / weight | Notes |
|---|---|---|
| Display XL | Serif 32px 600 | Screen title (`Tasks`, `Goals`, `Insights`, `Settings`) |
| Display L | Serif 30px 600 | Goal-detail title |
| Display M | Serif 24px 600 | Session-complete heading |
| Display S | Serif 20px 600 | Goal card name |
| Narrative | Serif 19px 600, line-height 1.35 | Insights lead sentence, capture title input |
| Body | Sans 15px 400 | Task titles, row content, settings rows |
| Body S | Sans 13.5–14px 400 | Secondary content, buttons |
| Label/Button | Sans 13–15px 600 | Primary button, tab labels |
| **Meta** | Sans 11px 500, tracking .08em, **UPPERCASE** | Section kickers ("INBOX · 3", "CAPTURE", "FOCUS") — color per §2 rule |
| Meta inline | Sans 11px 500, tracking .02–.03em, sentence-case | Row sub-text ("added 2 d ago", "09:00 · 2 × 25 min") |
| Timer hero | Mono 92px 500, tracking −.02em, line-height 1 | Focus MM:SS |
| Timer small | Mono 13–14px 600 | Mini-chip, notification |

---

## 4. Spacing & layout

- Base rhythm: **4** (`space` scale 4/8/12/16/20/24/32/40). Screen gutters **20px** (headers), **16–24px** (content).
- Phone frame reference: 412 × 917. Edge-to-edge; respect safe areas + gesture bar.
- Task/settings row vertical padding **13px** (10px for compact settings rows), gutter 20px.
- Card interior padding **18px**; sheet interior gutter **24px**.
- Section kicker → content gap ~8–12px; inter-card gap **12px**.

---

## 5. Radii

| Token | px | Use |
|---|---|---|
| `xs` | 8 | Priority buttons (P1/P2/P3) |
| `sm` | 12 | Small chips-as-squares, snackbar |
| `md` | 14 | Rating squares, focus transport FAB |
| `lg` | 18–20 | Cards (goal 18, notif 20), nav FAB (20) |
| `xl` | 26 | Focus play FAB, focus transport container |
| `sheet` | 28 (top only) | Bottom sheets `28px 28px 0 0` |
| `pill` | 999 | Chips, pills, toggles, day cells, progress bars, dots |

Timeline day cells: 12px radius.

---

## 6. Elevation (named)

Shadows are warm-black, low-spread, never harsh. Named tiers + specific component shadows:

| Token | Value |
|---|---|
| `low` (card) | `0 2px 8px rgba(32,25,20,.08)` |
| `medium` (mini-chip / floating) | `0 3px 10px rgba(32,25,20,.25)` |
| `high` (snackbar) | `0 4px 14px rgba(32,25,20,.30)` |
| `sheet` | `0 -8px 30px rgba(32,25,20,.30)` |
| `fabAccent` (nav +) | `0 3px 10px rgba(103,83,199,.35)` |
| `fabAccentHi` (focus play) | `0 5px 16px rgba(103,83,199,.40)` |
| `notif` | `0 2px 10px rgba(32,25,20,.12)` |

Provide RN decompositions (shadowColor/Opacity/Radius/Offset + elevation) alongside CSS strings, as the current `shadow.fabNative` already does.

---

## 7. Motion

- **Durations:** `fast` 200ms, `base` 280ms. **Easing:** ease-out `cubic-bezier(.2,.8,.2,1)` for enter/standard; `easeIn cubic-bezier(.4,0,1,1)` for exits.
- **Springs only for gestures** (sheet drag/dismiss, swipe). Not for state changes.
- **Pulse** (`@keyframes pulse` opacity 1↔.25): Live dot 1.6s, text cursor 1.1s, pending dots ("Saving…"/"Starting…") 1s.
- **Pressed feedback (mandatory, synchronous):** scale `.94` (icon buttons), `.97` (chips), `.98` (primary buttons) + `filter: brightness(.85)` or a pressed color (indigo→`#52409f`). Fires on touch-down, before any async.
- **Reduced motion is first-class** (`[1l]` toggle): replace pulses with static states, cross-fades instead of slides, no springs. Respect OS setting + in-app toggle.

---

## 8. Components

Each spec cites its wireframe frame. Build to the frame; use tokens above.

### 8.1 Bottom nav + capture FAB `[1a,1i,1k,1l]`
- Height 84px, bg `navBar`, top border `lineSoft`. Order: **Tasks · Goals · [ + ] · Insights · Settings** (the `+` FAB sits center, overhanging −26px).
- Active tab: label in `ink` + **M3 pill** behind the glyph (56×30, radius pill, bg `lineSoft`). Inactive label `#6f6355`.
- Capture FAB: 60×60, radius `lg` (20), bg `accent`, white `+`, shadow `fabAccent`.

### 8.2 Mini-timer chip `[1b]`
Floating pill above nav while a session runs: bg `snackbarBg`, pulsing `accentOnDark` dot + task name + mono time. Tap → Focus. Shadow `medium`.

### 8.3 Task row `[1a,1b,1j]`
`[priority dot] [title + sub-meta] [▶ play]`. Padding 13px/20px, divider `line`. Running task: bg `surfaceSunk` + `3px ink` left border + bold title + right-aligned mono time (no play button). Completed: 55% opacity, strike-through `#6f6355`, `✓` in place of dot.

### 8.4 Play / "start focus" affordance `[1a]` + states `[1m]`
Default: 34×34 circle, `1.5px lineStrong` border, transparent. **States:** pressed → bg `#e6dcc9` scale .94; pending → pill "● Starting…" (pulsing dot, `#6f6355`); failure → pill "Couldn't start · **RETRY**" (border `dangerLine`, text `dangerText`), stays on screen. **Never a silent tap.**

### 8.5 Goal chip (`gchip`) `[1a]`
11px 500, padding 2px/8px, radius pill, border `lineInput`, text `#6f6355`, bg `surfaceSunk`.

### 8.6 Timeline day strip `[1a]`
Horizontal 7-cell strip. Selected day: filled `ink`, text `canvas`, count in `#cfc4ad`. Unselected: `1px lineSoft` border, count `#a4977f`, `—` when none.

### 8.7 Capture sheet `[1c,1d]`
Modal bottom sheet, radius `sheet`, blurred+dimmed backdrop (`rgba(32,25,20,.35)`), drag handle (36×4 `lineStrong`), swipe-down dismiss (spring-back if unsaved). Kicker "CAPTURE".
- **Segmented underline tabs** New task / New goal: active = 600 ink + `2.5px ink` underline; inactive = 500 `#8a7c6c` + transparent underline. **No filled pills.**
- Title: auto-focused, 19px, animated indigo caret (`2px×22px`, pulse 1.1s), `2px ink` underline.
- **Task:** date presets Inbox/Today/Tomorrow/Later·{weekday} (selected = filled ink pill; rest = `lineStrong` outline). Goal chip picker (selected = `1.5px ink` border + ✓; rest outline; "No goal"). "More ▲" disclosure → Notes, Deadline, Time, Priority P1–P3.
- **Goal:** "First task (optional)" seed field + Priority.
- **Sticky footer** above keyboard: full-width `accent` button, adaptive label ("Save & close" / "Create goal" / "Saving…"). Below: Discard (link) + outcome copy ("Saves to Inbox for later triage." / "Creates goal · appears in Goals.").
- **Burst capture:** Enter = save-and-stay, sticky date/goal/priority, "✓ Saved · N captured" flash pill (`snackbarBg`) at top `[1d]`.

### 8.8 Focus (timer takeover) `[1e]` light / `[1f]` dark
Full-screen, no nav. Top→bottom: app wordmark (serif 16, `#6f6355`); "FOCUS" meta (tracking .22em); **mono 92px MM:SS**; live indicator (pulsing ink dot + "Live" / `[ Paused ]` in meta / "READY"); task name (15px) + "Goal · session N of M today" meta; thin progress bar (280×3, track `lineSoft`, fill `ink`); **launch pips** (11×11 radius 3, one per daily-goal session ≤12: done = `ink`, current = `accent`, future = `1.5px lineStrong` outline); stats strip Today/Sessions/Streak (tap → Insights); **Extend +1/+5** outline pills; transport row **↺ Reset (52) · ❚❚/▶ Play FAB (72, radius 26, `accent`, shadow `fabAccentHi`) · ≫ Skip (52)**. Paused adds "Timer holds until you resume." Dark = §2.2.

### 8.9 Session-end sheet `[1g]`
Bottom sheet, no navigation away. Heading "Session N of M complete" (serif 24) + meta ("task · 25:00 focused · goal"). "How was your focus?" → 1–5 squares (48×48, radius `md`; selected = filled ink). Optional note (underline input). Primary `accent` button "Log session · start break". Auto-break countdown caption ("Break starts automatically in 0:24.").

### 8.10 Android notification `[1h]`
Card radius `lg`, bg `surface`, shadow `notif`. Indigo app square + "Tempo · Focus · now" + mono time + "remaining · session N of M". Indigo progress bar. Actions: **Pause · Stop** (indigo text). Body tap → Focus. Live countdown each second (from absolute expiry; JS-independent per spec §3.2).

### 8.11 Goals card + 7-day meter `[1i]`
Card `surface`, radius `lg`, border `line`. Name (serif 20) + priority meta (right) + "N linked · M scheduled today". **Honest 7-day bar meter:** one bar/day, height ∝ sessions done, `accent` fills, empty day = 4px `lineSoft` stub. Caption "X of Y planned sessions done, last 7 days". **No fabricated data.**

### 8.12 Goal detail `[1j]`
Back + "GOAL" kicker; serif 30 title; meta; 7-day meter with weekday axis. "Linked tasks · N" list of task rows (per-task ▶). Inline "+ Add task to {goal}…" underline field at list end.

### 8.13 Insights `[1k]`
Max **3 blocks**, narrative first. Block 1: `surfaceSunk` card, serif-19 lead sentence + meta stat line. Block 2/3: `surface` cards — completion-trend bars (`#d9cdb6`, today = `accent`) w/ weekday axis; focus-hours-by-goal (label + hours + `ink` fill bar on `line` track). No fabricated data; heat grid only when dated source exists.

### 8.14 Settings `[1l]`
Sectioned (Timer / Sound & haptics / Appearance / Account) with meta section headers. Rows: label + value + `›`, or label+sub + **toggle** (48×28: on = `accent` + knob right; off = `lineStrong` + knob left `#fdfaf4`). Preview button (outline). Account row + "Sign out" (indigo).

### 8.15 Feedback primitives `[1m]`
- **Primary button:** default `accent` / pressed `accentPressed` scale .98 / pending "● Saving…" opacity .75.
- **Error banner:** bg `dangerBg`, border `dangerLine`, text `dangerText`, inline RETRY — **persists, no auto-dismiss.**
- **Snackbars** (`snackbarBg`): "Completed …" + UNDO / "Sync failed · last synced HH:MM" + RETRY. UNDO/RETRY in `accentOnDark`.
- Chips: default outline / pressed `#e6dcc9` scale .97 / selected filled `ink`.

---

## 9. Feedback law — "nothing silent, ever"

Non-negotiable, applies to every interactive element:
1. **Every tap** → synchronous pressed state **+ haptic**, fired on touch-down before any await.
2. **Every async action** → a factual pending label ("Saving…", "Starting…"), never a spinner-only dead state.
3. **Every failure** → an **on-screen** explanation **+ Retry** that persists. No toasts that vanish; no silent no-op returns (this is the timer bug spec §1 exists to kill).

---

## 10. Accessibility gates (CRITICAL — non-negotiable)

- **Contrast ≥ 4.5:1 for all info-bearing text.** Verified: `ink`/`#6f6355`/`accent`(white) pass. **`#8a7c6c` on canvas ≈ 3.6:1 and `#a4977f` lower — these FAIL AA and are decorative/placeholder only.** Any meta text that conveys real information ("3 in inbox", "session 4 of 8") uses `textSecondary` `#6f6355`, or ≥18.66px-bold / ≥24px if it must stay lighter.
- **Touch targets ≥ 44×44px.** The 34px play affordance needs a ≥44px hit slop.
- **Visible focus states** on all interactive elements (keyboard/switch-access order correct).
- **Labels on all inputs**; icon-only buttons get accessible labels.
- **Reduced motion** honored (OS + in-app `[1l]`): no pulse, no springs, cross-fades only.
- Timer hero is decorative-mono but must expose remaining time to AT via label.

---

## 11. Screen index (wireframe map)

| Frame | Screen |
|---|---|
| `1a` | Tasks — idle (Inbox + Timeline) |
| `1b` | Tasks — session running (undo snackbar, mini-timer chip) |
| `1c` | Capture — task (More expanded) |
| `1d` | Capture — goal (burst flash) |
| `1e` | Focus — running (light, primary) |
| `1f` | Focus — paused (dark) |
| `1g` | Session-end sheet |
| `1h` | Android notification |
| `1i` | Goals — list (7-day meters) |
| `1j` | Goal detail |
| `1k` | Insights (narrative-first) |
| `1l` | Settings |
| `1m` | Interaction states (pressed / pending / failure) |

---

## 12. Token implementation

Single source: **`apps/web/src/theme/tokens.ts`**; `apps/mobile/src/theme/tokens.ts` re-exports it verbatim (Metro watches the workspace root). Keep the **export surface stable** (`color`, `radius`, `space`, `font`, `motion`, `shadow`, `ring`, `withAlpha`, `tokensToCssVars`) so consumers don't break; **replace the values** with §2–§7 and **extend** with:
- Semantic color roles from §2.1/§2.2 (a `light`/`dark` map, not a flat dark-only object).
- `font`: add `serif` (Source Serif 4), `mono` (JetBrains Mono); keep `sans` (Instrument Sans) as `family`.
- `motion`: add `fast` 200 / `base` 280 durations + named easings.
- `shadow`: add `low`/`medium`/`high`/`sheet`/`fabAccent`/`fabAccentHi`/`notif` (CSS + RN forms).
- `radius`: add `md` 14, `xl` 26, `sheet` 28.

`ring` (SVG timer geometry) is v1-specific — v2 Focus uses a **linear** progress bar + pips, not a ring; keep the export only if still referenced, else remove when the Focus screen lands.

Migration must keep `bun run typecheck` green; consumers referencing removed/renamed color keys are updated in the same change.
