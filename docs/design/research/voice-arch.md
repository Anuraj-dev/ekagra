# Voice-transcription architecture — voisu (current) vs hyprvox (predecessor)

## Repos
- `/home/raja/Anuraj-Dev/voisu` — Rust/Tokio desktop daemon, the CURRENT, actively-shipped product (v0.10.1). Internal brain: `internal/STATE.md`, `internal/decisions.md`, `docs/adr/`.
- `/home/raja/Anuraj-Dev/Snehit_projects/hyprvox` — Bun/TypeScript predecessor daemon. Superseded by voisu (clean-room rewrite per user memory). Still useful as a reference implementation with more explicit docs (`docs/STT_FLOW.md`).

## Providers: both survived, no removal happened

Deepgram was NOT removed. Both repos run **Groq (Whisper) + Deepgram (Nova-3) concurrently** and reconcile the two results — this is voisu ADR-0001 ("cloud-only dual-provider transcription", no local model) and ADR-0005 ("stream concurrently with a bounded quality wait"). The earlier "Deepgram removal recommended" note (in the voisu project memory) does not appear to have been acted on in-repo; voisu's Jul 28 STATE.md shows both providers active in production (`provider_timings_ms=deepgram:410,groq:966`). What did change: **Groq is the default winner on any lexical disagreement** — voisu's `TranscriptDecisionPipeline::decide` (`voisu-core/src/lib.rs`) keeps Groq's transcript whenever the two differ, because "a difference in words may be a change of meaning" (PR #90). Deepgram's advantage is streaming/interim latency, not final accuracy; Groq's short-clip round trip wins on time-to-final (internal/model-benchmark.md row 125). hyprvox instead LLM-merges the two (Llama 3.3 70B via Groq) trusting Groq for words and Deepgram for punctuation/formatting — voisu deliberately dropped the LLM-merge step in favor of the simpler lexical-diff/pick-a-winner rule.

## Request flow (voisu, `voisu-app/src/system.rs`)

- **Groq**: `POST https://api.groq.com/openai/v1/audio/transcriptions`, model `whisper-large-v3` (env override `VOISU_GROQ_MODEL`), language default `en`. Small recordings (≤ ~120s of 16kHz mono 16-bit PCM) go as a single full-audio request. Larger ones are chunked: 60s chunks with 4s overlap, merged with 48-word overlap trimming (`GROQ_CHUNK_BYTES`/`GROQ_CHUNK_OVERLAP_BYTES`/`GROQ_MERGE_OVERLAP_WORDS`). Endpoint must be HTTPS except on loopback (`provider_endpoint_is_secure`).
- **Deepgram**: WebSocket streaming, `wss://api.deepgram.com/v1/listen` (nova-3, keyterm boosting), continuous PCM frames pushed live during recording, not a single POST-after-stop call. Connect deadline 5s; keepalive JSON ping every 5s (Deepgram drops idle sockets after ~10-12s); after `CloseStream`, bounded 10s grace to receive the final flush; bounded reconnect (2 attempts, 250ms backoff) — treated as unrecoverable beyond that since Deepgram has no server-side resume.
- Audio format both providers get: 16kHz mono 16-bit PCM.
- Credentials: `SecretStore` (no `keyring` crate — deliberate ADR-level rule), loaded per-provider.

hyprvox's flow (`docs/STT_FLOW.md`) is the same shape but simpler: record → `ffmpeg` normalize to 16kHz/mono/PCM16 WAV → `Promise.all([groq, deepgram])` → LLM merge (or deterministic pick) → validation/repair pass (filters hallucinated outros, prompt-leakage, injected command bursts) → clipboard append (never overwrites existing clipboard) + notification + history log. hyprvox reports median latency 882ms end-to-end.

## Latency / error handling
- voisu: "Provider Deadline" bounds the whole reconciliation wait — if one provider is still pending at the deadline, voisu delivers whichever valid transcript it already has rather than blocking (ADR-0005). Real host-gate numbers: `first_chunk_ms=165`, `provider_timings_ms=deepgram:410,groq:966`, full release-to-text ~601s for a 10-min dictation (dominated by capture length, not the API calls).
- Deepgram reconnect: bounded 2 retries / 250ms backoff, then fail that provider (other provider still carries the Recording).
- Groq: per-chunk async tasks; a failed chunk task surfaces as a `BoundaryError` on that provider without necessarily failing the whole Recording if the other provider succeeded.
- hyprvox: explicit "if one service fails, use the other; if both fail, critical error notification." Uses a generic `withRetry` utility around provider calls.
- A key invariant carried in both: never silently deliver a "wordless"/hallucinated transcript — voisu has a whole quality-guard/validation layer (meaning-inversion checks were tried and then *deleted* after review found the mechanism itself introduced meaning-inverting bugs — see decisions.md rows 244-247 — current guard is deliberately simple: lexical diff only).

## What's portable to ekagra (mobile app → Supabase Storage → edge function → STT API)

1. **Provider choice + request shape** — Groq `POST /openai/v1/audio/transcriptions`, `whisper-large-v3`, multipart file upload, 16kHz mono PCM/WAV input, technical-vocabulary prompt hint (both repos build a capped prompt string with boost words — good pattern for an edge function). This is the simplest piece to port: a single-shot Groq call is trivial to run inside a Supabase Edge Function (Deno fetch, multipart body from the storage-downloaded audio blob).
2. **Skip Deepgram's WebSocket streaming path** — that's built for live desktop dictation with a persistent daemon and a Trigger-Key session; a mobile-upload-to-Storage flow is inherently batch (record → upload → invoke), so the whole streaming/keepalive/reconnect machinery is not applicable. If mobile ever wants live captions, that's a separate, much larger feature.
3. **Dual-provider + lexical-diff reconciliation is optional weight** — worth deferring for v1 of ekagra; single-provider (Groq) is enough for a spec, matching hyprvox/voisu's own read that Groq wins the accuracy/latency tradeoff for short clips.
4. **Bounded-deadline delivery pattern** is portable as a policy, even with one provider: set a timeout on the edge function's fetch to Groq and treat timeout as a distinct, user-visible error state rather than hanging.
5. **Validation/quality-guard philosophy** — "never deliver a wordless/hallucinated result," "meaning-preservation over polish" — worth carrying as a design principle even without porting voisu's actual (deleted, then simplified) code.
6. **Audio prep**: both repos normalize to 16kHz mono 16-bit PCM/WAV before sending — replicate this client-side (Expo) before upload, or in the edge function, to keep upload size small and match provider expectations.
7. **Secrets**: provider API key belongs in the Supabase Edge Function's server-side env/secrets, never shipped to the Expo client — mirrors both repos' "credential never touches the untrusted surface" discipline (voisu forbids the `keyring` crate client-side; the equivalent mobile rule is "no provider key in the app bundle").

## Gotcha to carry over
Deepgram keyterm/custom-vocab lists have a hard cap — voisu benchmark work found Deepgram 400-errors past ~500 tokens/100 keyterms and the *whole stream dies* (internal/model-benchmark.md row 126). Irrelevant if ekagra skips Deepgram, but if a "boost words" / custom dictionary feature is ever added to Groq, keep the prompt-hint character cap approach both repos already use (896 chars in hyprvox, similar capping in voisu) rather than passing an unbounded word list.
