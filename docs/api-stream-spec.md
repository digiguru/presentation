# Spec: `/api/stream` — streaming text endpoint for `ai-prompt-writer`

> Hand this to a Claude agent working **in the `ai-prompt-writer` repo** (the Vercel
> backend at `https://ai-prompt-writer.vercel.app`). It is the producer for a new
> streaming UI in the `presentation` repo's `<gpt-input>` web component, which already
> consumes this contract.

## Goal

Add a **new** endpoint, `POST /api/stream`, that returns the LLM completion as a
**stream of text** (tokens flushed as they are generated) instead of a single buffered
JSON object. This lets the presentation deck render the answer progressively during live
demos instead of showing a frozen "…loading…" box.

## Hard constraints (non-negotiable)

1. **Do NOT modify the existing `/api/raw` endpoint or its response shape.** Several
   presentations still call it and expect a buffered `{ "output": "..." }` JSON body.
   `/api/stream` must be additive and fully isolated. Do not refactor `/api/raw`'s
   internals in a way that changes its behaviour.
2. **Reuse everything `/api/raw` already does** for auth, API keys / env vars, model
   selection, system-prompt assembly, and **CORS** (see below). The only difference
   between the two endpoints should be *buffered JSON* vs *streamed text*. Extract shared
   logic into a helper if convenient, but don't alter `/api/raw`'s observable contract.

## Request contract

Identical request body to `/api/raw`, so the same prompt-building code path is reused:

```
POST /api/stream
Content-Type: application/json

{
  "system":   "<string: system prompt / context>",
  "examples": ["<string>", ...],   // prior conversation turns; may be empty []
  "prompt":   "<string: the user's input>"
}
```

- `system` maps to the model's system prompt (same as `/api/raw`).
- `examples` is an array of prior message strings (the component sends conversation
  history here when present; usually empty for the live demos).
- `prompt` is the user's latest input.

Build the model request **exactly** as `/api/raw` does today — same model, same
parameters — only with streaming enabled.

## Response contract

Stream **chunked plain text**. The frontend appends raw bytes as they arrive, so keep it
dead simple:

- `Content-Type: text/plain; charset=utf-8`
- Body: the model's text deltas written to the response as they are produced, flushed per
  chunk. **No JSON envelope, no SSE framing** — just the text. (The frontend concatenates
  every chunk and treats the result as the full answer.)
- The response must **not** be buffered to completion before sending. On Vercel that
  means returning a streaming `Response` backed by a `ReadableStream` (Edge runtime
  preferred — see below). If the platform buffers the whole body, the UI will look
  identical to today and the feature is pointless.
- End the stream cleanly when the model finishes.

> If you have a strong reason to use SSE instead of raw text, that's acceptable, but you
> must coordinate a frontend change: tell the presentation-repo owner, because the
> current consumer expects raw text and would need to strip `data:` framing. **Default to
> raw chunked text.**

## CORS (critical — easy to miss)

The frontend is served from a **different origin** than the API
(`localhost:8000` / `art.digiguru.co.uk` → `ai-prompt-writer.vercel.app`). `/api/raw`
already works cross-origin, so `/api/stream` **must send the same CORS headers**
`/api/raw` does, e.g.:

- `Access-Control-Allow-Origin: *` (or whatever `/api/raw` currently uses)
- Handle the `OPTIONS` preflight the same way `/api/raw` does.

Copy this behaviour verbatim from the existing endpoint. A streaming body with missing
CORS headers will fail silently in the browser.

## Implementation notes (Vercel)

- **Runtime:** prefer the **Edge runtime** (`export const runtime = 'edge'`) — it streams
  `ReadableStream` responses natively without buffering. If the project is locked to the
  Node serverless runtime, return a `Response` built from a `ReadableStream` and ensure
  no middleware/proxy buffers it.
- **Provider streaming:** enable streaming on whatever LLM SDK `/api/raw` uses:
  - OpenAI: `stream: true` on `chat.completions.create`, then iterate the async
    iterator and write `choices[0].delta.content` to the response.
  - Anthropic: `messages.stream(...)` / `stream: true`, write each `text_delta`.
  - Pipe each text delta into the `ReadableStream` controller
    (`controller.enqueue(new TextEncoder().encode(delta))`), then `controller.close()` on
    completion.
- **Errors:** if the upstream model call fails before streaming starts, return a non-200
  with a short text body. If it fails mid-stream, just close the stream — the frontend
  shows whatever arrived and logs the error.

## How the frontend consumes it (for your reference — already implemented)

In `presentation/js/gpt-component.js`:

```js
const response = await fetch(streamURL, {           // streamURL = baseURL + 'api/stream'
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ system, examples, prompt })
});
const reader = response.body.getReader();
const decoder = new TextDecoder();
let full = "";
for (;;) {
  const { done, value } = await reader.read();
  if (done) break;
  full += decoder.decode(value, { stream: true });   // appended to the <textarea> live
}
// `full` is treated as the complete answer (also fed to text-to-speech).
```

So: **any text you write to the body shows up in the UI immediately**, and the
concatenation of all chunks must equal the complete answer (same text `/api/raw` would
have returned in `{ output }`).

## Acceptance criteria

1. `POST /api/stream` with a valid body streams text incrementally — verifiable with
   curl showing output trickling in rather than arriving all at once:
   ```bash
   curl -N -X POST https://ai-prompt-writer.vercel.app/api/stream \
     -H 'Content-Type: application/json' \
     -d '{"system":"You are concise.","examples":[],"prompt":"Count to five slowly."}'
   ```
   (`-N` disables curl buffering; you should see tokens appear progressively.)
2. The concatenated stream output equals the answer `/api/raw` would return for the same
   input.
3. `/api/raw` is **byte-for-byte unchanged** in behaviour (regression check: existing
   callers still get `{ "output": "..." }`).
4. CORS headers match `/api/raw`; the endpoint works when called from a browser page on a
   different origin (test from the presentation deck on `localhost:8000`).
5. Preflight `OPTIONS /api/stream` succeeds the same way `/api/raw`'s does.

## Out of scope

- Image (`/api/image`) and voice (`/api/voice`) endpoints — unchanged.
- Any change to the request body shape — it must stay identical to `/api/raw`.
