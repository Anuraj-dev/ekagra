# Ekagra Visual Theme Research — Reference Apps + 4 Candidate Directions

Research date: 2026-07-31. Goal: ground ekagra's visual theme (horizon planning + pomodoro + habits + voice journal, minimal icon-first) in what proven productivity/focus apps actually do, then synthesize four distinct, WCAG-verified candidate palettes.

---

## Part 1: Reference App Research

Web search on public design write-ups, brand kits, and design-token extraction sites (mobbin, brandkit.opal.so, fontofweb, design analyses). Exact hex values were only publicly documented for a subset of apps (Opal, Amie, Todoist, Linear); the rest are captured qualitatively from design critiques and app-store/press descriptions — treat those as directional, not literal swatches.

### Things 3 (Cultured Code)
- **Base**: Light-first, near-white background; UI intentionally recedes ("more invisible") so content and typography carry the interface. Recent versions added translucency/glass in the sidebar to let a hint of color bleed through.
- **Accent**: A single iconic blue (used for the app icon "box" and primary actions); exact hex not published, but functions as one restrained brand color rather than a palette.
- **State without text**: Colored dots/tags for tags and areas; a filled checkbox is the only "done" signal — no color-coding of priority.
- **Premium feel**: Comes from restraint + typography + motion (checkbox animation), not from the palette itself. One accent, generous whitespace, soft rounded corners.

### Structured
- **Base**: Light, white/near-white timeline background.
- **Accent**: User-assigned colors per task/block — the app's "color" is the *user's* categorization system (e.g., red = urgent, green = flexible), not a fixed brand palette.
- **State without text**: Vertical timeline blocks colored + sized by duration; a moving "now" line. Color = category, not brand.
- **Premium feel**: The timeline metaphor itself (a physically laid-out day) plus letting user color choices stay muted/pastel by default so the grid doesn't turn into a rainbow.

### Amie
- **Base**: Warm neutrals (not stark white) — described as "warm minimalism," explicitly positioned against "cold corporate tools."
- **Accent**: A 15-scale, 135-token color system for calendar categories, but a single **muted blue that never appears in the calendar palette** is reserved purely for actionable UI (buttons), so "this is clickable" and "this is a calendar category" never collide.
- **State without text**: Color-coding of calendar events lets users read "the shape of the week" before reading any event title — pure color pattern recognition.
- **Premium feel**: Warmth (not pastel-cute, not corporate-cold) + a strict separation between decorative/informational color and functional/actionable color. Won a Product Hunt Golden Kitty for design.

### Sunsama
- **Base**: White backgrounds, pastel surfaces, geometric sans (Outfit-style) typography.
- **Accent**: Orange as the primary brand color — chosen for warmth/energy against an otherwise calm, therapeutic layout (Sunsama's whole positioning is "sustainable daily planning ritual," so the accent needed to feel encouraging, not urgent).
- **State without text**: Channel/tag pills in soft pastel colors; drag-and-drop task cards use elevation (shadow) more than color to show active state.
- **Premium feel**: Calm palette + one warm accent + a ritual-like flow (plan → shutdown), so color reinforces the emotional arc of the product rather than just labeling data.

### Rise (calendar)
- **Base**: Very light lavender/off-white base.
- **Accent**: Soft, muted multi-color set (mauve-rose, mint-cyan) rather than one dominant brand color — closer to a pastel calendar-category system than a single CTA color.
- **State without text**: Color blocks for calendar categories, similar pattern to Amie/Rise-family calendar apps generally.
- **Premium feel**: Restrained saturation (all muted/desaturated) keeps a multi-color system from reading as "cluttered rainbow."

### Opal (screen time)
- **Base**: Pure black (`#000000`), pure white text (`#FFFFFF`), secondary text `#BCBBC0`, surfaces `#3A3A3A`. Fully committed dark-mode-first, near-monochrome system.
- **Accent**: No flat brand accent color for everyday UI — instead **five two-color gradients** (e.g. `#E2C9FF→#8CFFDD`, `#A9CBFF→#B39AFF`, `#D4FF9C→#9EF9FF`, `#EDC9F2→#EDFF4A`, `#ECB8FF→#FFD6AA`) reserved *exclusively* for milestone/celebration moments — never used as a background or a persistent UI color.
- **State without text**: Progress rings/blocks in white-on-black; gradients only appear as a reward flash, so their rarity is what makes them feel special.
- **Premium feel**: Monochrome discipline + typographic weight (SF Pro, 5 weights) + gradients used as *punctuation*, not decoration. This is the clearest "restraint = premium" example found — directly useful as a caution against a busy palette.

### Endel
- No specific hex data surfaced (brand kit gated behind Brandfetch). Qualitatively: generative, ambient, calming visuals paired with real-time-reactive soundscapes; minimal, iconography-first controls (play/pause/timer). Directionally: calm, low-saturation, ambient-gradient visuals that *move slowly* rather than static flat color — a reminder that "premium calm" can come from motion/generative texture, not just a static swatch.

### (Not Boring) Habits
- Monochrome base "shot through with flashes of vibrant color," 3D graphics, playful micro-animations. Confirms the neutral-base-plus-accent-highlights pattern already seen in Amie/Sunsama, applied to habit-streak gamification specifically.

### Atoms (James Clear / Atomic Habits app)
- Each habit gets a **user-assigned accent color** manifested as a circle; long-press fills the circle with that color and triggers a small celebratory shape/animation ("dopamine hit"). Confirms: **color-as-identity-per-item** (one habit = one color) is a proven pattern for habit trackers, distinct from category-color systems in calendars.

### Forest
- Not independently verifiable from search (results returned generic "forest green" palette guides, not Forest-app-specific data). Directionally well known: warm off-white/cream background, single saturated green as the "growth" metaphor color, tree illustrations carry all the visual richness so the chrome around them stays quiet.

### Tide
- No exact hex surfaced. Directionally: soft blues/purples/greens layered over nature photography/video, very low-chroma UI chrome so the background scenery (moving water, forest) is the actual "palette."

### Todoist
- **Confirmed hex**: primary red **`#DE483A`**; supporting neutrals **Zeus `#25221E`** (near-black ink), **Fantasy `#FEFDFC`** (near-white bg), **Frost `#F0F6DF`** (pale green-tinted surface).
- **State without text**: Priority flags (p1–p4) use a red→orange→blue→none ramp; karma/streak uses color-filled progress rings.
- **Premium feel**: The red is confident and slightly muted (not neon), used sparingly for the logo/checkmark-adjacent moments and priority — most of the UI stays near-monochrome.

### Linear
- **Confirmed hex**: single chromatic accent **`#5E6AD2`** ("lavender-blue" / indigo), with a lighter hover state `#828FFF` and a focus-tinted variant `#5E69D1` — all the *same hue family*, no second competing accent color. Reserved for brand mark, focus rings, and the primary CTA only.
- **Base**: Dark-first (near-black `#0” tier backgrounds), four "surface lifts" (elevation via lightness steps, not color) create hierarchy instead of drop shadows.
- **State without text**: Status/priority icons (small colored dots/bars — todo/in-progress/done/canceled) are the only place multiple colors appear; everything else stays neutral gray + the one indigo.
- **Premium feel**: The oft-cited example of "restraint scales" — one accent hue, one type family, elevation via lightness. Directly relevant precedent for ekagra given the existing Quiet Indigo accent already sits in the same indigo/lavender family as Linear's `#5E6AD2`.

### Cross-cutting patterns observed
1. **One functional accent, not a rainbow.** Amie, Sunsama, Linear, Todoist all reserve exactly one hue for "this is actionable," even when they allow many colors elsewhere for categorization.
2. **Warm-neutral bases beat stark white/black for "life" apps.** Amie and Sunsama explicitly position warm neutrals against "cold corporate" tools; Opal and Linear go the other way (near-black) but for a different emotional register (focus/discipline vs. warmth/ritual).
3. **State is shown via color-as-identity (per-item color) or elevation/lightness, rarely via saturation intensity alone.** Atoms = per-habit color. Amie/Rise = per-category color. Linear = elevation steps, not color, for hierarchy.
4. **Gradients, when used at all (Opal), are rationed to reward/milestone moments** — never backgrounds, never persistent chrome. This is a strong argument against any ambient gradient in ekagra's default UI.
5. **Premium reads as restraint + one confident accent + generous negative space**, not as more colors or glass/blur effects.

Sources:
- [Opal Brand Kit](https://brandkit.opal.so/)
- [Amie: Joyful Productivity Through Warm Minimalism](https://blakecrosley.com/guides/design/amie)
- [Todoist Brand Color Codes](https://colorcodeshub.com/brand/todoist)
- [Linear Design System — shadcn.io](https://www.shadcn.io/design/linear)
- [Linear.app Design Tokens — FontOfWeb](https://fontofweb.com/tokens/linear.app)
- [Structured — Improve Productivity With Color Coding](https://structured.app/blog/color-coding)
- [Sunsama UI Design Examples — SaaSUI](https://www.saasui.design/application/sunsama)
- [(Not Boring) Habits review — TapSmart](https://www.tapsmart.com/apps/review-not-boring-habits/)
- [Atoms — from Atomic Habits](https://atoms.jamesclear.com/)
- [Things Blog — Cultured Code](https://culturedcode.com/things/blog/)

---

## Part 2: Four Candidate Theme Directions for Ekagra

All contrast ratios below were computed directly (WCAG 2.x relative-luminance formula), not estimated. **AA minimum = 4.5:1 for normal text, 3:1 for large text/UI components.** All "ink on bg" and "accent on bg" pairs below hit **4.5:1 or higher** (full AA for body text, not just large-text/UI-only), except where explicitly noted.

Format per direction: name → lineage → palette table (light + dark) → contrast → what makes it not-generic.

---

### Direction 1 — "Warm Planning Desk II" (evolution of the existing theme)

**Lineage**: Direct evolution of the current paper-neutral + Quiet Indigo direction. Draws from **Amie** (warm-neutral base instead of stark white, one reserved actionable accent) and **Todoist** (a confident, slightly muted accent color used sparingly rather than everywhere) and **Things 3** (single-accent restraint, content-forward chrome).

| Token | Light | Dark |
|---|---|---|
| bg | `#FBF7F0` | `#1E1B17` |
| surface | `#F3EDE2` | `#2A2520` |
| ink | `#2B2621` | `#F1EAE0` |
| accent (Quiet Indigo) | `#6753C7` | `#8F7CE8` |
| success | `#3F7D58` | `#6FBF8B` |
| danger | `#B3492E` | `#E38266` |

**Contrast (verified)**:
- Light: ink/bg 14.03:1 · accent/bg 5.40:1 · success/bg 4.59:1 · danger/bg 5.03:1 · ink/surface 12.86:1
- Dark: ink/bg 14.36:1 · accent/bg 5.08:1 · success/bg 7.76:1 · danger/bg 6.25:1 · ink/surface 12.71:1

**Why it's not generic**: it's the only direction that keeps a warm, paper-like base (not cool gray, not stark white) — this is what differentiates "life OS" from "SaaS dashboard." The indigo accent is desaturated enough to read as calm/intentional (a planning tool) rather than "AI product purple."

---

### Direction 2 — "Graphite Studio"

**Lineage**: Draws from **Linear** (single lavender-indigo chromatic accent, elevation via lightness steps not color, near-black dark-first base) and **Opal** (monochrome-disciplined base, color rationed to rare moments) and **Structured** (clean neutral timeline chrome that lets user data carry color).

| Token | Light | Dark |
|---|---|---|
| bg | `#FAFAFA` | `#101012` |
| surface | `#F0F0F1` | `#17181B` |
| ink | `#17181B` | `#EDEDEF` |
| accent | `#4F53D6` | `#6E76F0` |
| success | `#227A53` | `#4FAE7B` |
| danger | `#C13A2C` | `#E5584A` |

**Contrast (verified)**:
- Light: ink/bg 17.01:1 · accent/bg 5.68:1 · success/bg 5.06:1 · danger/bg 5.15:1 · ink/surface 15.59:1
- Dark: ink/bg 16.26:1 · accent/bg 4.99:1 · success/bg 6.94:1 · danger/bg 5.27:1 · ink/surface 15.18:1

**Why it's not generic**: this is deliberately the "tool for focused execution" register (pomodoro/deep-work mode) rather than the "warm planning" register — cool, near-neutral grays with exactly one chromatic hue, hierarchy built from lightness/elevation rather than added colors. It reads as a disciplined instrument, which is the opposite emotional target from Direction 1 and 3 — useful if ekagra wants the pomodoro/focus surface to feel visually distinct from the planning surface.

---

### Direction 3 — "Forest Ledger"

**Lineage**: Draws from **Forest** (single saturated growth-green as the emotional anchor, warm cream base) and **Tide** (low-chroma nature calm) and **Todoist** (one confident non-green accent kept separate from the success-state green, so "done/growing" and "act on this" never collide, mirroring Amie's rule of never reusing the actionable color as a category color).

| Token | Light | Dark |
|---|---|---|
| bg | `#F4F1E8` | `#14201A` |
| surface | `#E9E4D4` | `#1C2B23` |
| ink | `#232A22` | `#E7EFE4` |
| accent (terracotta) | `#A85423` | `#E08654` |
| success (leaf green) | `#2F7A45` | `#6FBF87` |
| danger | `#A83D2E` | `#E2695A` |

**Contrast (verified)**:
- Light: ink/bg 13.04:1 · accent/bg 4.70:1 · success/bg 4.66:1 · danger/bg 5.51:1 · ink/surface 11.58:1
- Dark: ink/bg 14.28:1 · accent/bg 6.16:1 · success/bg 7.57:1 · danger/bg 5.12:1 · ink/surface 12.59:1

**Why it's not generic**: pairs a genuinely warm, slightly greenish parchment base (not the beige-yellow "paper" every note app uses) with a terracotta accent instead of yet another blue/purple SaaS accent — and keeps success-green structurally distinct from the terracotta accent so habit-streak growth (green) and "act now" (terracotta) stay legible without text. Best fit if habit-building/streaks are meant to be the emotional centerpiece of the app.

---

### Direction 4 — "Sunlit Slate"

**Lineage**: Draws from **Rise/Amie-style calendar warmth** (muted multi-tone calendar coding sitting on a cool, very light slate base rather than warm paper) and **Endel** (soft, low-saturation ambient calm) and **Todoist's** confident-but-muted warm accent used against a cool neutral field — inverts Direction 1's warm-base/cool-accent relationship into a cool-base/warm-accent one.

| Token | Light | Dark |
|---|---|---|
| bg | `#F3F5F7` | `#14181C` |
| surface | `#E7EBEF` | `#1D2328` |
| ink | `#232B33` | `#E9EEF2` |
| accent (coral-ember) | `#C24717` | `#FF8354` |
| success (teal) | `#1F7A64` | `#4FBFA0` |
| danger | `#C22F2F` | `#F2685E` |

**Contrast (verified)**:
- Light: ink/bg 13.12:1 · accent/bg 4.57:1 · success/bg 4.77:1 · danger/bg 5.14:1 · ink/surface 11.97:1
- Dark: ink/bg 15.27:1 · accent/bg 7.33:1 · success/bg 7.89:1 · danger/bg 5.88:1 · ink/surface 13.58:1

**Why it's not generic**: cool slate base is calmer/more "morning light" than stark white or warm paper, and pairing it with a warm coral-ember accent (rather than blue/indigo, which is what nearly every focus/productivity app defaults to) avoids the single most common "AI SaaS" tell — blue-to-purple as the default accent. Teal success color also breaks from the expected green, keeping the palette internally distinctive.

---

## Summary Table

| # | Name | Base register | Accent | Best-fit surface |
|---|---|---|---|---|
| 1 | Warm Planning Desk II | warm paper (evolution) | Quiet Indigo `#6753C7`/`#8F7CE8` | planning/horizon view |
| 2 | Graphite Studio | cool near-neutral, dark-first | Lavender-indigo `#4F53D6`/`#6E76F0` | pomodoro/deep-focus mode |
| 3 | Forest Ledger | warm parchment-green | Terracotta `#A85423`/`#E08654` | habits/streaks |
| 4 | Sunlit Slate | cool slate | Coral-ember `#C24717`/`#FF8354` | journal/calendar overview |

All four are internally coherent enough to run as the single app-wide theme; the "best-fit surface" column is a hint for where each direction's emotional register lands most naturally if ekagra ever wants per-module tinting, not a requirement to fragment the theme.
