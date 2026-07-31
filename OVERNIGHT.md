# OVERNIGHT DRIVER — ekagra P1, finish by morning

You are the overnight orchestrator for /home/raja/Anuraj-Dev/ekagra. Raja is asleep. You run unattended until done. Do not stop, do not wait for input, do not ask questions — every decision you need is already written down.

## Mission
Complete GitHub tickets **#45 → #51** (P1 of spec #44, "Life-OS Reimagining") in dependency order, each merged with CI green, and verify the result on Raja's real phone. Morning deliverable: all seven tickets closed, app running on the device, `/checkpoint` run, and a summary comment on issue #44.

## Read first (nothing else until you have)
1. `docs/STATE.md`, `CONTEXT.md` (vocabulary — use it everywhere)
2. `docs/specs/002-life-os-reimagining.md` (the work order) + `docs/decisions.md` 2026-07-31 entries
3. Tickets #45–#51 bodies. Work the frontier strictly: 45/46 parallel-able → 47 → 48 → 49 → 50 → 51.
4. Chosen theme: **Warm Planning Desk, evolved** — keep the existing tokens (paper neutrals, Quiet Indigo #6753C7, light primary) and the shipped v2 component feel; refinement hex in `docs/design/research/palette-research.md` §Warm Planning Desk II. Reference mockups: `docs/design/lifeos-mockups/today-warm-desk.html`, `focus-warm-desk.html`, `plan-warm-desk.html` (other theme files exist — ignore them). UI law: icons + ≤2-word labels, zero explanatory copy, no em dashes, hidden a11y labels, failure text only.

## Tonight's routing (Raja's explicit orders — follow even where repo CLAUDE.md differs)
| Work | Route | How |
|---|---|---|
| Architecture: schema/migrations/pgTAP/triggers/RLS design | **Sol, high** | `codex exec "PROMPT" -m gpt-5.6-sol -c model_reasoning_effort=high --sandbox workspace-write -c sandbox_workspace_write.network_access=true` (foreground, ≤10 min timeout) |
| UI implementation (screens, components, data wiring) | **Opus 5 subagent** | Agent tool `model: opus`, or `claude -p --model claude-opus-5 "PROMPT"` |
| Design-critical UI: theming, tokens, mockup-fidelity, motion | **Luna only** | `codex exec "PROMPT" -m gpt-5.6-luna --sandbox workspace-write -c sandbox_workspace_write.network_access=true`. If Luna fails the same task 2 straight tries → escalate that task to **Sol, low**. |
| Mechanical/grunt: renames, moves, config, test scaffolds, doc-free sweeps | **Grok 4.5** | `grok -p "PROMPT" --permission-mode dontAsk --cwd /home/raja/Anuraj-Dev/ekagra` (use `-w` worktree for parallel dispatches). Cap Grok at ~40% of total work. |
| Light lookups/scout reads | Grok or Luna, cheap | one-shot `-p` |
| Reviews (each PR, before merge) | **Sol, high**, `--sandbox read-only`, diff inlined in the prompt | findings only, never edits |
| Anything only Fable 5 could do | Avoid. Use Fable only if genuinely blocked after Sol+Opus both failed. |

Sol NEVER above high. Verify every dispatched diff yourself before commit — an agent saying "done" is not verification. codex runs are foreground-only (background codex dies silently). One dispatch, one model, one effort — no re-dispatch loops.

## Git & merge law (standing, from Raja)
- Branch per ticket off main (`feat/p1-N-slug`). Stage EXPLICIT paths only — `git commit -am` is forbidden (broke main once).
- Commit as you go → push → open PR referencing the ticket → Sol review + CI → merge ONLY when review approves AND CI is green → close ticket → next frontier ticket.
- Two failed review rounds on a PR → different model fixes. Three → fresh context, respawn.
- No completion claims without fresh command output. No fix without root cause.

## The phone (plugged in, USB debugging ON)
- `adb devices` must show it. Build/install the dev build with `bunx expo run:android` (Notifee needs a dev build — Expo Go cannot run the timer).
- To SEE the app: `adb exec-out screencap -p > /tmp/claude/shot.png` then Read the file. Also: any screenshot captured on the phone lands in the desktop clipboard (wl-clipboard) within ~1s — `wl-paste -t image/png > /tmp/claude/clip.png` grabs it. Use screenshots to verify every screen you ship against its mockup.
- Drive the UI with `adb shell input tap/swipe/text` when you need to walk a flow.
- Real-device verification is the final gate for tickets #48, #49, #50, #51 — CI green alone does not close a UI ticket.

## Hard fences
- Never touch Supabase prod destructively: additive migrations only, `bunx supabase db push` needs care — test in CI (fresh-Supabase job) first.
- Don't rewrite `docs/decisions.md` history (append-only). Don't touch `docs/sessions/` except via `/checkpoint` at the very end.
- Save-RAM rule: heavy suites run on CI, local = `bun test` + typecheck + biome only.
- pgTAP date assertions must be weekday-robust.
- Tables use `owner_id`; RLS on every new table (spec §Implementation).
- If truly blocked >30 min on one ticket after escalations: leave a comment on the ticket with exact state, skip to next unblocked ticket, return later. Zero tickets abandoned silently.

## Finish line
All 7 tickets merged+closed, app verified on device screen-by-screen against mockups, `/checkpoint` run (STATE.md rewritten to reality), summary comment on #44: what shipped, what's verified on-device, anything skipped and why. Then stop.

## First act (before ticket #45)
The working tree sits on `feat/wave-3-timer` with uncommitted files. The session docs are NOT yet committed: `CONTEXT.md`, `docs/decisions.md` (appended), `docs/specs/002-life-os-reimagining.md`, `docs/design/research/`, `docs/design/lifeos-mockups/`, `OVERNIGHT.md`. Commit exactly those paths to a `docs/life-os-spec` branch off main (use a worktree so you don't disturb wave-3), PR it, merge on CI green. Leave `.gitignore` and `apps/mobile/package.json` modifications alone — they belong to the wave-3-timer work, which is NOT yours tonight.
