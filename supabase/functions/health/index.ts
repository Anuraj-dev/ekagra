const response = new Response(JSON.stringify({ service: 'ekagra', phase: 0, ok: true }), {
  headers: { 'content-type': 'application/json' },
});

Deno.serve(() => response);
