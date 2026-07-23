// The AI assistant is a work in progress — this edge function is stubbed out.
// When the feature is ready, this will proxy DeepSeek for the in-editor AI assistant.
// The DeepSeek API key is removed from environment configuration until then.

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}

Deno.serve(async (req) => {
  const headers = corsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  return new Response(
    JSON.stringify({
      type: 'error',
      text: 'The AI assistant is still being developed. This feature will be available in a future update.',
    }),
    { status: 200, headers }
  );
});
