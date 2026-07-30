# DESIGN.md: ekagra Life-OS P1 design law

> Single source of truth for the ekagra UI law. The product direction is **Warm Planning Desk II**.
> Preserve useful shipped v2 geometry and interaction behavior unless spec 002 supersedes it.
>
> - Product: `ekagra`.
> - Active functional authority: `docs/specs/002-life-os-reimagining.md`.
> - Chosen visual references: `docs/design/lifeos-mockups/today-warm-desk.html`,
>   `docs/design/lifeos-mockups/focus-warm-desk.html`, and
>   `docs/design/lifeos-mockups/plan-warm-desk.html`.
> - The old `docs/design/v2` wireframes remain component-feel references only where spec 002 does not
>   supersede them.
> - `docs/design/refined/DESIGN-SPEC.md` is superseded and is not an implementation input.

## 0. Precedence and use

1. Spec 002 controls product scope, information architecture, domain states, copy law, motion law, and
   P1 behavior.
2. This document controls tokens, geometry, component behavior, accessibility, and export compatibility.
3. Warm Planning Desk II mockups control the visual composition of Today, Focus, and Plan.
4. Shipped v2 wireframes supply reusable component geometry and interaction behavior only where they do
   not conflict with the preceding rules.

If a request conflicts with this law or spec 002, flag the conflict before implementation. Do not create a
parallel visual direction or silently diverge.

## 1. Brand and voice

- Feeling: a warm planning desk with paper neutrals, calm density, and instrument-grade Focus behavior.
- The product name is always `ekagra`. Do not use a legacy wordmark.
- UI is icon-first. Visible labels are no longer than two words.
- There is no explanatory or instructional UI copy. State is communicated through fill, density, and
  signature motion.
- Compact pending labels may name state only: `Saving`, `Starting`, `Syncing`.
- Clear text is reserved for failures and must include the recovery action.
- No em dashes in UI copy or design examples.
- Use line icons. Do not use emoji as icons.
- Accessibility labels are hidden from the visual UI and present on every icon-only control.
- One accent moment per view. Quiet Indigo is reserved for the primary action, current state, active
  control, or current pip.

## 2. Color tokens

Hex values are authoritative. Use semantic roles rather than component-local colors.

### 2.1 Core light tokens

| Token | Hex | Use |
|---|---|---|
| `bg` | `#FBF7F0` | App background |
| `surface` | `#F3EDE2` | Raised cards, sheets, and controls |
| `ink` | `#2B2621` | Primary text, selected fills, strong state |
| `accent` | `#6753C7` | Quiet Indigo actions, active state, current pip |
| `success` | `#3F7D58` | Successful state |
| `danger` | `#B3492E` | Failure state and recovery action |

### 2.2 Core dark tokens

| Token | Hex | Use |
|---|---|---|
| `bg` | `#1E1B17` | App background |
| `surface` | `#2A2520` | Raised cards, sheets, and controls |
| `ink` | `#F1EAE0` | Primary text, selected fills, strong state |
| `accent` | `#8F7CE8` | Quiet Indigo actions, active state, current pip |
| `success` | `#6FBF8B` | Successful state |
| `danger` | `#E38266` | Failure state and recovery action |

### 2.3 Supporting roles

| Token | Light | Dark | Use |
|---|---|---|---|
| `textSecondary` | `#6D6258` | `#C4B8AB` | Meaningful secondary information |
| `line` | `#DFD5C6` | `#4B433B` | Dividers and outlines |
| `track` | `#E2D8C9` | `#3A332C` | Empty progress and density |
| `onAccent` | `#FBF7F0` | `#1E1B17` | Content on the theme accent |
| `dangerSurface` | `#F5DED5` | `#3B2923` | Low-emphasis failure surface |
| `successSurface` | `#DDEBDD` | `#223229` | Low-emphasis success surface |

- Informational text must maintain a contrast ratio of at least 4.5:1 against its actual background.
- Text on the light `dangerSurface` and `successSurface` uses `ink`; status color remains available to
  borders and icons. Dark theme text may use `danger` or `success`; both pairings pass 4.5:1.
- Do not use low-contrast decorative meta for information. If a value matters, use `ink` or
  `textSecondary`.
- Do not reintroduce per-goal color hues. Goal identity comes from name, relationship, and density.

## 3. Typography

The shipped v2 families and hierarchy remain useful. Monospace is timer-only.

| Family | Use |
|---|---|
| `Source Serif 4` | Display titles, goal names, narrative review headline, wordmark |
| `Instrument Sans` | Body, controls, labels, metadata |
| `JetBrains Mono` | Focus time, timer chip, notification time |

| Role | Size and weight | Use |
|---|---|---|
| Display XL | Serif 32px 600 | Today, Plan, Self, Review titles |
| Display L | Serif 30px 600 | Detail sheet title |
| Display M | Serif 24px 600 | Session completion title |
| Display S | Serif 20px 600 | Goal and identity names |
| Narrative | Serif 19px 600, line-height 1.35 | Review headline only |
| Body | Sans 15px 400 | Tasks and row content |
| Body S | Sans 13.5 to 14px 400 | Compact values and controls |
| Label | Sans 13 to 15px 600 | Visible labels, never over two words |
| Meta | Sans 11px 500, tracking `.08em` | Compact state and section markers |
| Timer hero | Mono 92px 500, line-height 1 | Focus time |
| Timer small | Mono 13 to 14px 600 | Timer chip and notifications |

Content names such as a task or goal may be longer than two words. The two-word limit applies to visible
UI labels, actions, tabs, section markers, and status labels.

## 4. Information architecture

The primary navigation has four destinations, in this order:

`Today` · `Plan` · `Self` · `Review`

Focus is a full-screen takeover with no bottom navigation. Capture, Voice, Detail, and Settings are
bottom sheets. Review may initially open as a sheet. MorningCommit, EveningClose, Insights, Goals as a
standalone tab, and other v2 dashboard surfaces are not part of this IA.

- `Today`: blocks, committed tasks, habit checks, overdue state, Sweep, and the running timer chip.
- `Plan`: week and day plans, commitment cascade, and time-boxed blocks.
- `Self`: identities, goals, habits, and their relationships.
- `Review`: the forced review pass, honest rates, journal residue, and `Deep`.
- `Focus`: task-bound timer takeover from an eligible block.

## 5. Spacing and layout

- Base rhythm: 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px.
- Phone reference: 412 x 917, edge-to-edge with safe areas and the gesture bar respected.
- Screen gutters: 20px for headers and 16 to 24px for content.
- Task and settings rows retain shipped v2 vertical padding of 13px, with 10px for compact settings.
- Card interior padding: 18px. Sheet interior gutter: 24px.
- Section marker to content: 8 to 12px. Inter-card gap: 12px.
- Bottom navigation is 64px high with four evenly spaced destinations. Today owns the floating capture
  affordance shown in the chosen mockup.
- Layout must hold at 375px, 768px, and 1440px without horizontal scrolling.

## 6. Radii

| Token | Px | Use |
|---|---:|---|
| `xs` | 8 | Priority controls |
| `sm` | 12 | Compact chips and snackbars |
| `md` | 14 | Rating squares and Focus transport |
| `lg` | 18 | Cards and navigation capture control |
| `xl` | 26 | Focus play control and transport container |
| `sheet` | 28 | Sheet top corners only |
| `pill` | 999 | Chips, toggles, progress, and pips |

Timeline day cells retain a 12px radius.

## 7. Elevation

Use warm-black, low-spread shadows. Keep the shipped v2 named tiers and provide CSS and RN forms:

| Token | CSS value | Use |
|---|---|---|
| `low` | `0 2px 8px rgba(43, 38, 33, .08)` | Card lift |
| `medium` | `0 3px 10px rgba(43, 38, 33, .25)` | Floating timer chip |
| `high` | `0 4px 14px rgba(43, 38, 33, .30)` | Persistent failure surface |
| `sheet` | `0 -8px 30px rgba(43, 38, 33, .30)` | Sheet separation |
| `fabAccent` | `0 5px 15px rgba(103, 83, 199, .28)` | Today capture control |
| `fabAccentHi` | `0 5px 16px rgba(103, 83, 199, .40)` | Focus play control |
| `notif` | `0 2px 10px rgba(43, 38, 33, .12)` | Notification card |

No new shadow tier is introduced for a single component.

## 8. Motion law

Motion has exactly five signature animations:

1. Task to Focus morph.
2. Block ink-fill.
3. Cascade dock.
4. Habit-chain pulse.
5. Waveform to chip settle.

Every other state change is instant. Pressed feedback is synchronous on touch-down, using fill or density
change. Cascade dock is the only spring animation. The remaining signatures may use the shipped v2 fast
and base timings, with ease-out entry and ease-in exit. Sheets and swipe gestures track the pointer
directly and settle without a separate animation.

Reduced motion replaces the five signatures with fades. The OS preference and the in-app setting are both
honored. Do not add cursor, pending-dot, live-dot, or generic pulse animations outside the five signatures.

## 9. Components and interaction

### 9.1 Bottom navigation and capture control

- Height: 64px. Background: `surface`. Top border: `line`.
- Order: `Today`, `Plan`, `Self`, `Review`.
- Active destination: ink label and a 56 x 30px pill behind the icon.
- Inactive destinations: `textSecondary` label.
- Today capture control: 46 x 46px circle, `accent` fill, `onAccent` icon, `fabAccent` shadow.
- Capture opens the Capture or Voice sheet from Today. It does not become a fifth destination.

### 9.2 Timer chip

When a session runs, a floating pill sits above navigation. It shows an accent state dot, task name, and
monospace time. Tap opens Focus. Use the shipped v2 medium shadow and compact geometry.

### 9.3 Today rows and blocks

- Preserve the shipped v2 task row geometry: priority mark, task content, and a play affordance.
- Blocks are the primary Today structure. Density communicates deep, shallow, admin, and rest.
- A block cannot enter Focus without a committed Task or Occurrence.
- Starting a task uses the task to Focus morph. The default play control remains a minimum 44 x 44px hit
  target even when the visible icon is smaller.
- A running task uses an ink edge, denser fill, stronger title, and timer value instead of a duplicate
  play control.
- Completed rows use reduced opacity, strike-through, and a completion icon.
- Overdue state uses a chip and `Sweep`. Sweep is explicit and never mutates a plan silently.

### 9.4 Capture sheet

- Bottom sheet with 28px top radius, dimmed backdrop, 36 x 4px drag handle, and swipe-down dismissal.
- Preserve the shipped segmented underline geometry for `Task` and `Goal` capture.
- Auto-focus the title field. Use hidden accessibility labels for fields and controls.
- Task capture supports date, goal, and priority controls. Advanced fields remain behind a compact `More`
  control.
- Goal capture supports identity, priority, and an optional first task.
- Sticky footer retains a full-width accent action above the keyboard. Actions are `Save`, `Create`, and
  `Discard`, each no longer than two words.
- Remove outcome and destination explanations. Success uses fill, density, or the waveform to chip settle
  signature. Failure is persistent, adjacent, and text-bearing.
- Burst capture keeps the shipped flash-pill behavior. Its visible state label is compact, such as
  `Saved 3`.

### 9.5 Voice sheet

- Voice opens as a sheet from Today.
- Hold-to-speak is the primary control. Waveform to chip settle is the only recording completion
  signature.
- Pending labels may say `Transcribing` or `Saving`. They must not explain the pipeline.
- The transcript is the durable artifact. Audio is transient.
- Failure text remains visible with `Retry` until resolved or dismissed.

### 9.6 Plan

- Use `plan-warm-desk.html` as the visual reference for the week to day cascade.
- Preserve shipped v2 card, day strip, goal chip, and outline control geometry where it supports the
  cascade.
- A commitment moves through the hierarchy by explicit user action. Cascade dock is the signature motion.
- Goal commitments may appear at every horizon. Task commitments are week or day. Occurrence commitments
  are day only.
- Time-boxed blocks show kind through fill and density. No helper paragraph explains the hierarchy.

### 9.7 Self

- Self is the home for identities, goals, habit rules, and cue chains.
- Identity is always present on a habit. The default identity is `Me`.
- Goal media uses the shared attachment treatment. Do not add per-goal color palettes.
- Habit stacking uses habit-chain pulse. Pending occurrences are visually distinct from done, skipped, and
  missed through fill and density.

### 9.8 Review

- Review is a forced pass, not a dashboard of unlimited cards.
- Keep the shipped narrative-first card geometry where useful, with a maximum of three blocks.
- The headline metric is `Deep`.
- Rates, deep hours, journal residue, and playback use honest derived data only. Never fabricate a chart,
  heat map, streak, or completion value.
- Review controls are compact and icon-first. Explanatory copy is not permitted outside failure states.

### 9.9 Focus takeover

- Focus is full-screen, task-bound, and preserves the shipped v2 Focus geometry and timer engine behavior.
- Top to bottom: ekagra wordmark, `Focus` marker, mono `MM:SS`, live state, task name, goal/session data,
  linear progress bar, launch pips, stats, extension controls, and transport.
- Stats are `Today`, `Sessions`, and `Deep`.
- Launch pips remain one per daily-goal session up to 12. Done uses `ink`, current uses `accent`, and future
  uses an outline.
- Transport retains reset, 72px play or pause control, and skip geometry. Icon-only controls have hidden
  accessibility labels.
- Paused state is shown through fill and density. Do not show a pause explanation.
- Focus uses the light core tokens by default and the dark core tokens for the dark reference state.

### 9.10 Detail sheet and session completion

- Detail opens as a sheet, retaining the shipped goal-detail list, meter, back control, and inline add-field
  geometry where useful.
- Session completion remains a bottom sheet with a serif heading, five 48 x 48px rating squares, optional
  note field, and sticky primary action.
- Visible actions are compact: `Log session`, `Start break`, `Dismiss`.
- Auto-break state is represented by the timer and density. Only failure states receive explanatory text.

### 9.11 Settings sheet

- Settings opens as a sheet with compact section markers and the shipped row and toggle geometry.
- Keep timer, sound, appearance, account, and reduced-motion controls.
- Use visible labels of no more than two words. Inputs and toggles have hidden accessibility labels.
- Account failure states persist with `Retry` where recovery is possible.

### 9.12 Notifications and feedback

- Preserve the shipped notification card geometry, absolute-expiry countdown, progress bar, and Pause or
  Stop actions. Use `ekagra` branding.
- Every tap receives synchronous pressed feedback and haptic feedback on touch-down.
- Every async action exposes a compact pending state such as `Saving` or `Starting`. A spinner alone is not
  a state.
- Every failure is visible, adjacent to the affected action, persistent, and paired with `Retry` when
  retry is possible. Failures may use clear text.
- No success toast, explanatory snackbar, or silent no-op is part of the law.

## 10. Accessibility gates

- All informational text has contrast of at least 4.5:1 against its actual background. Large text still
  follows the same rule for simplicity.
- Every touch target is at least 44 x 44px, including icon hit slop around smaller visible glyphs.
- Every icon-only control has a hidden accessibility label.
- Every input has a hidden associated label.
- Visible focus states exist on all interactive elements. Keyboard and switch-access order follows visual
  order.
- State must remain understandable without motion. Reduced motion uses fades.
- The timer hero exposes remaining time to assistive technology even though its visual type is decorative
  monospace.
- Do not use color as the only signal. Pair fill with density, position, icon, or text when text is allowed.

## 11. Reference map

| Surface | Primary reference | Preserved shipped v2 input |
|---|---|---|
| Today | `today-warm-desk.html` | Task rows, timer chip, navigation, capture control |
| Focus | `focus-warm-desk.html` | Full takeover, timer geometry, transport, pips |
| Plan | `plan-warm-desk.html` | Cards, day strip, chips, detail list |
| Self | Warm Planning Desk II tokens and components | Cards, sheets, controls |
| Review | Warm Planning Desk II tokens and components | Narrative-first card geometry only |

The v2 frame IDs `1a` through `1m` are historical component references, not the current IA.

## 12. Token implementation and compatibility

The target token source is a shared workspace package consumed by mobile and CLI where relevant. No import
may reach into `apps/web`. The web app remains in the repository, but is unrouted, starved, and outside the
active CI path.

Keep the existing export surface compatible while moving ownership:

`color`, `radius`, `space`, `font`, `motion`, `shadow`, `ring`, `withAlpha`, `tokensToCssVars`

The shared package must expose:

- Light and dark semantic color maps with the core values in §2.
- `font.family`, `font.serif`, and `font.mono`.
- Signature motion names, reduced-motion behavior, and compatibility fields for existing consumers.
- The shipped radius and shadow names, including `md`, `xl`, `sheet`, `low`, `medium`, `high`, `fabAccent`,
  `fabAccentHi`, and `notif`.

`ring` is retained only for export compatibility while referenced. Focus implementation uses a linear
progress bar and pips. Consumers of renamed or removed roles must migrate in the same change as the token
source, and mobile or CLI imports must never be repaired by importing from web.

## 13. Critical review checklist

### Tier 1: block completion

- [ ] Informational text contrast is at least 4.5:1 in light and dark states.
- [ ] Every touch target is at least 44 x 44px.
- [ ] Every icon-only control has a hidden accessibility label.
- [ ] Every input has a hidden associated label.
- [ ] Visible focus states and correct keyboard order exist.
- [ ] Async actions show a compact pending state and disable duplicate submission.
- [ ] Failures are adjacent, persistent, clear, and recoverable where possible.
- [ ] No action is silent.

### Tier 2: high

- [ ] Today, Plan, Self, Review, Focus, and sheet boundaries match the IA.
- [ ] No visible UI label exceeds two words.
- [ ] No explanatory or instructional copy appears outside failures.
- [ ] Only the five signature animations exist. All other state changes are instant.
- [ ] Reduced motion uses fades.
- [ ] No horizontal scroll exists at 375px, 768px, or 1440px.
- [ ] Web is not an import source for mobile or CLI.
- [ ] Metrics and charts use dated, owner-scoped data only.

### Tier 3: polish

- [ ] Colors, spacing, radii, motion, and elevation use shared tokens.
- [ ] Shipped v2 geometry is preserved where spec 002 does not supersede it.
- [ ] Focus stats use `Today`, `Sessions`, and `Deep`.
- [ ] Goal colors remain neutral; no per-goal palette returns.
- [ ] Hover, active, pending, empty, and failure states are designed without adding explanatory copy.
