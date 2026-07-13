---
name: new-edge-function
description: Scaffold a new Supabase edge function in this repo following the established convention (_shared http/supabase helpers, _vendor/core imports, requireUser auth, handle wrapper) plus a matching pgTAP test stub. Use when adding a new backend endpoint under supabase/functions.
disable-model-invocation: true
---

# Scaffold a new edge function

Argument: the function name in kebab-case (e.g. `streaks`). Ask for it if not given.

## Steps

1. **Create `supabase/functions/<name>/index.ts`** using this repo's convention. Model it on an
   existing function like `supabase/functions/sessions/index.ts`. Required shape:
   - Import HTTP/auth helpers from `../_shared/http.ts` and `../_shared/supabase.ts`.
   - Import any domain parsing/logic from `../_vendor/core/index.ts` — **never** import from
     outside `supabase/functions/` (the Deno edge runtime forbids it; that's what `_vendor` is for).
   - Call `requireUser(request)` to get `ownerId` before any owner-scoped work.
   - Wrap the body in `handle(request, async () => { ... })`.
   - Return via `json(...)`; gate methods with `method(request, [...])`.

   Template:
   ```ts
   import { body, json, method } from '../_shared/http.ts';
   import { adminClient, handle, repositoryForClient, requireUser } from '../_shared/supabase.ts';
   // import { parseXxx } from '../_vendor/core/index.ts';

   Deno.serve((request) =>
     handle(request, async () => {
       const { ownerId } = await requireUser(request);
       const repository = repositoryForClient(adminClient());
       const now = Date.now();

       if (request.method === 'GET') {
         // ... read for ownerId
         return json({ /* ... */ });
       }

       method(request, ['POST']);
       const input = await body(request); // parse with a core parser
       // ... write for ownerId
       return json({ /* ... */ }, 201);
     }),
   );
   ```

2. **If new domain logic is needed**, add the parser/handler to `packages/core/src/` (NOT directly
   in `_vendor` — that's generated). Then run `./scripts/sync-core-vendor.sh` to vendor it. (The
   PostToolUse hook also does this automatically after you edit `packages/core/src`.)

3. **Add a test.** Extend the relevant file in `supabase/tests/` (pgTAP, e.g. mirror `phase_2.sql`)
   for DB-level behavior, and/or add a `*.test.ts` beside `_shared/handlers.test.ts` for handler
   logic. Do not leave the function untested — CI runs `supabase test db` and `bun test`.

4. **Verify locally**: `bun run typecheck`, `bun run lint`, and if Supabase is running,
   `supabase functions serve` + a curl against `/<name>`.

Report the files created and the exact verification commands you ran with their results.
