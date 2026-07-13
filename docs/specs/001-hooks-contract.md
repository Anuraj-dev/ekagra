# Spec 001 — v2 data-layer & hooks contract

> The **stable interface** the v2 backend (Sol) and v2 screens (Luna) both build to.
> Pinned by the driver so the two streams proceed in parallel without breaking each other.
> Companion to `docs/specs/001-app-v2-redesign.md` (§3 architecture) and `docs/DESIGN.md`.
>
> **Both streams read THIS file from disk.** Backend implements §2–§5; screens consume §6 hooks
> (mock them until the backend lands). Behavioral invariants (spec §3.4) stay behind these hooks.

## 0. Principles

- Supabase stays authoritative. Timer correctness never depends on JS running (spec §3.2).
- Every create/start mutation carries a **client-generated UUID** → server is **idempotent** (retry-safe). This is the top-2 rebuild risk (spec §3.1).
- Task/goal writes are **optimistic**: UI updates instantly, rolls back visibly on failure with retry. No re-GET-after-write.
- Sessions already return the full `Session` in their response — no re-GET; set cache directly.
- Keep `owner_id` scoping and existing RLS. Extend schema, never rewrite.

## 1. Scope

**In (wave 2A, Sol):** schema extensions below · `packages/core` type updates + `scripts/sync-core-vendor.sh` · edge-fn changes to persist/return new fields · idempotency on task/goal create + session start · pgTAP.
**In (wave 2B, Sol run B): TanStack Query layer** (§6) with optimistic mutations, idempotency wiring, persistence.
**Out (later):** analytics/meter SQL views (goal 7-day meter, insights) — screens show honest empty/"no data yet" states until these land · task manual reorder (no backend, not in wireframes) · web port (mobile-first; web mirrors later).

## 2. Domain types (final, with v2 extensions)

Update `packages/core/src/api.ts`. **NEW** fields are additive, **optional AND nullable** (`field?: T | null`) for back-compat during the rebuild — existing callers/fixtures/v1 screens don't set them, and a Task fetched before the edge-fn mapper update genuinely lacks them. Tighten to required later once mappers + hooks always populate/send them. Re-run `scripts/sync-core-vendor.sh` after (CI-enforced). **Status: implemented & verified (migration `20260713115504_hooks_contract.sql`, typecheck + 136 tests green).**

```ts
export type Priority = 'p1' | 'p2' | 'p3';               // NEW enum
export type TaskStatus = 'inbox' | 'planned' | 'done' | 'cancelled';

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  goalId: string | null;
  estimatedBlocks: number | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // NEW — required by wireframes (Tasks timeline, Capture sheet, priority dots)
  priority: Priority | null;
  scheduledFor: string | null;   // 'YYYY-MM-DD' local day for Timeline; null ⇒ Inbox
  scheduledTime: string | null;  // 'HH:MM' 24h, optional time-of-day
  deadline: string | null;       // 'YYYY-MM-DD'
  notes: string | null;
};

export type Goal = {
  id: string;
  title: string;
  identityRole: string;
  deadline: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  priority: Priority | null;      // NEW — shown on Goals cards / detail
};

// Session type is UNCHANGED (already rich; see packages/core/src/api.ts).
```

**Create/Update DTOs** (`TaskCreateRequest`/`TaskUpdateRequest`/`GoalCreateRequest`/`GoalUpdateRequest`) gain the same new optional fields, plus every create/start request gains:

```ts
clientOpId?: string;  // NEW — client-generated UUID v4; new v2 hooks always send it, server dedups when present
```

(`SessionStartRequest` gains `clientOpId` too. Update `packages/core` DTOs + the vendored copy.)

## 3. DB migration (`supabase/migrations/`)

Additive, idempotent DDL (`if not exists` / guarded). One migration:

- `tasks`: `priority text check (priority in ('p1','p2','p3'))`, `scheduled_for date`, `scheduled_time time`, `deadline date`, `notes text`, `client_op_id uuid`.
- `goals`: `priority text check (priority in ('p1','p2','p3'))`, `client_op_id uuid`.
- `sessions`: `client_op_id uuid`.
- **Idempotency:** partial unique index per table: `create unique index ... on <t>(owner_id, client_op_id) where client_op_id is not null`.
- **Timeline perf:** `create index on tasks(owner_id, scheduled_for)` and keep `status` filterable.
- RLS unchanged (owner_id = auth.uid()). pgTAP: cast uuid literals; fixtures as superuser BEFORE `set local role authenticated` (STATE gotcha).

## 4. Edge-fn changes (`supabase/functions/tasks|goals|sessions`)

- `view()` mappers: include new snake_case↔camelCase fields.
- POST create (tasks, goals) & POST start (sessions): read `clientOpId`; **on conflict (owner_id, client_op_id) do nothing → then SELECT and return the existing row with 200** (not a new insert). Fresh insert returns 201. Retry with the same `clientOpId` is a no-op that returns the same row.
- PATCH update: accept new fields.
- Keep sessions on `adminClient()` + server `Date.now()` truth. Re-run vendored core sync so functions compile against new types.

## 5. Idempotency protocol (summary)

1. Client mints `clientOpId = uuidv4()` when the user commits a create/start (once per logical op; reused across retries of that op).
2. Server insert uses `... on conflict (owner_id, client_op_id) where client_op_id is not null do nothing`; if 0 rows inserted, `select` the existing row by `(owner_id, client_op_id)` and return it.
3. Result: network retry, double-tap, or optimistic-replay never duplicates a task/goal/session.

## 6. TanStack Query hooks (wave 2B — the interface screens consume)

Location: `apps/mobile/src/data/` — `queries/`, `mutations/`, `keys.ts`, `queryClient.ts`. Consume the existing `tasksApi/goalsApi/sessionsApi` in `apps/mobile/src/lib/api.ts` (already handles auth). Web ports the same shape later. Add `@tanstack/react-query` (+ persist client) to `apps/mobile`.

### 6.1 Query keys (`keys.ts`)
```ts
export const qk = {
  tasks: ['tasks'] as const,
  goals: ['goals'] as const,
  session: ['session', 'current'] as const,
};
```

### 6.2 Query hooks
```ts
useTasks(): UseQueryResult<Task[]>          // all tasks; screens derive Inbox (status==='inbox') vs Timeline (scheduledFor!=null)
useGoals(): UseQueryResult<Goal[]>
useCurrentSession(): UseQueryResult<CurrentSessionResponse>  // { session: Session|null, serverNow }
```
- Persisted cache (render instantly on launch, revalidate in bg).
- `useCurrentSession` reconciled on foreground / connectivity recovery / notif action / launch (server wins).

### 6.3 Mutation hooks — all optimistic, all return `{ mutate, isPending, isError, reset }`
```ts
useCreateTask()    // mints clientOpId; onMutate: insert provisional Task (flag syncing) into ['tasks'], close composer; onError: rollback + surface retry; onSuccess: swap server row; onSettled: invalidate ['tasks']
useUpdateTask()    // optimistic patch (used for edit, schedule, priority)
useCompleteTask()  // sugar: status→'done' + completedAt; optimistic; pairs with an UNDO grace window in UI
useDeleteTask()    // optimistic remove; UNDO grace window
useCreateGoal()    // clientOpId; optimistic append; onSuccess swap
useUpdateGoal()    // optimistic patch
useDeleteGoal()    // optimistic remove; also unlink goalId on affected tasks in cache
useStartSession()  // clientOpId; sets ['session','current'] from response (no re-GET); on definitive failure → prominent retry state (spec §3.2). 8–10s timeout on the request.
useSessionCommand()// pause/resume/complete/completeEarly/abandon; set session cache from response; on end → clear session + invalidate ['tasks']
```

**Optimistic invariants:** `onMutate` cancels in-flight queries + snapshots + inserts provisional (marked `syncing`); `onError` restores snapshot + shows on-screen retry (never a vanishing toast); `onSuccess` swaps in the server object; `onSettled` invalidates. Provisional rows render with the pending affordance from DESIGN §8.15 / §9.

### 6.4 Timer hooks (thin, over the existing engine — DO NOT reimplement)
```ts
useTimer(): { state: TimerState, remainingMs, elapsedMs, phase, status }  // built on packages/core engine + timerStateFromSession + serverClockOffset; render ticks only repaint, never decrement stored state (spec §3.2/§3.4)
```

## 7. Screen → hook map (for the frontend stream)

| Screen (frame) | Hooks |
|---|---|
| Tasks `1a/1b` | `useTasks`, `useCompleteTask`, `useDeleteTask`, `useStartSession`, `useCurrentSession` |
| Capture `1c/1d` | `useCreateTask`, `useCreateGoal`, `useGoals` |
| Focus `1e/1f/1g` | `useTimer`, `useCurrentSession`, `useSessionCommand`, `useStartSession` |
| Goals `1i/1j` | `useGoals`, `useCreateGoal`, `useUpdateGoal`, `useTasks` (linked), `useCreateTask` (inline add) |
| Insights `1k` | read-model hooks over analytics views (later); honest empty state until views exist |
| Settings `1l` | local prefs + account; timer durations feed `useTimer`/session start |

## 8. Acceptance

- `bun run typecheck` green across monorepo; `bun test` green; pgTAP green.
- Same `clientOpId` twice ⇒ one row (idempotency test).
- Task/goal create/complete/delete reflect in cache instantly; failure rolls back with a visible retry.
- Vendored core in `supabase/functions/_vendor/core/` matches `packages/core` (sync script run).
