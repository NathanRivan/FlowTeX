// Proxies DeepSeek v4 for the in-editor AI assistant (phase 1: suggest-only,
// one action per request, no chaining — see AiPanel.js/AiSuggestionExtension.js
// on the client). Runs server-side so DEEPSEEK_API_KEY never reaches the
// browser bundle. Deployed with Supabase's default JWT verification, so only
// signed-in users can invoke it — no separate auth check needed here.
//
// Uses DeepSeek's beta strict tool-calling (base_url .../beta, strict: true
// per function) rather than prompt+json_object mode: json_object mode is
// documented by DeepSeek as occasionally returning empty content, while
// strict mode guarantees schema-conformant tool-call arguments. Still
// validated below regardless, since strict mode is beta.
//
// The model is never trusted with document positions: the three tools take
// no "range" — the range is always exactly the scope the client sent
// (current selection or current paragraph), so a hallucinated position can
// never corrupt the document.

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
const DEEPSEEK_MODEL = Deno.env.get('DEEPSEEK_MODEL') || 'deepseek-v4-pro';
const DEEPSEEK_URL = 'https://api.deepseek.com/beta/chat/completions';

// Roughly a paragraph — mirrors the client-side cap in AiPanel.js. Enforced
// again here since the edge function, not the browser, is the trust boundary.
const MAX_SCOPE_CHARS = 1500;

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'propose_rewrite',
      description: 'Propose replacing the entire scoped text with improved text.',
      strict: true,
      parameters: {
        type: 'object',
        properties: {
          newText: { type: 'string', description: 'Full replacement text for the scoped range.' },
          reason: { type: 'string', description: 'One short sentence explaining the change.' },
        },
        required: ['newText', 'reason'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_delete',
      description: 'Propose deleting the entire scoped text.',
      strict: true,
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'One short sentence explaining why it should go.' },
        },
        required: ['reason'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'suggest_citation',
      description: 'Point at a specific claim within the scoped text that reads as needing a citation. Does not invent or name a source — the app resolves an actual reference separately.',
      strict: true,
      parameters: {
        type: 'object',
        properties: {
          claimText: { type: 'string', description: 'Exact substring of the scoped text making the claim.' },
        },
        required: ['claimText'],
        additionalProperties: false,
      },
    },
  },
];

function systemPrompt(orientation) {
  return [
    'You are a scoped writing assistant embedded in an academic document editor.',
    'You only ever see a small piece of text the user selected (or their current paragraph), plus this orientation:',
    `Title: ${orientation.title || '(untitled)'}`,
    orientation.outline?.length ? `Outline: ${orientation.outline.join(' / ')}` : null,
    orientation.abstract ? `Abstract: ${orientation.abstract}` : null,
    '',
    'You may take at most ONE action per reply, and only by calling exactly one of the three provided tools.',
    'Never call more than one tool. Never reply with both a tool call and a message.',
    "If the user's request cannot be satisfied using only the scoped text — it refers to other parts of the document, or implies a much larger edit than the scoped text — do NOT call a tool. Reply in plain text asking them to select the specific text they mean, or to narrow their selection to roughly a paragraph.",
    'For suggest_citation, only point at a claim that genuinely reads as needing a source — never invent an author, title, or citation yourself.',
  ].filter(Boolean).join('\n');
}

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
  if (!DEEPSEEK_API_KEY) {
    return new Response(JSON.stringify({ error: 'AI assistant is not configured.' }), { status: 500, headers });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body.' }), { status: 400, headers });
  }

  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  const scopeText = typeof body?.scopeText === 'string' ? body.scopeText : '';
  const orientation = body?.orientation && typeof body.orientation === 'object' ? body.orientation : {};

  if (!message) {
    return new Response(JSON.stringify({ error: 'Message is required.' }), { status: 400, headers });
  }
  if (!scopeText.trim()) {
    return new Response(JSON.stringify({ error: 'Select some text first — the assistant needs a selection or paragraph to work with.' }), { status: 400, headers });
  }
  if (scopeText.length > MAX_SCOPE_CHARS) {
    return new Response(JSON.stringify({ error: `Selection is too large (${scopeText.length} chars, max ${MAX_SCOPE_CHARS}). Narrow it to roughly a paragraph.` }), { status: 400, headers });
  }

  const deepseekResp = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: systemPrompt(orientation) },
        { role: 'user', content: `Scoped text:\n"""${scopeText}"""\n\nRequest: ${message}` },
      ],
      tools: TOOLS,
      tool_choice: 'auto',
      max_tokens: 1024,
      temperature: 0.3,
    }),
  });

  if (!deepseekResp.ok) {
    const errText = await deepseekResp.text().catch(() => '');
    console.error('DeepSeek error', deepseekResp.status, errText);
    return new Response(JSON.stringify({ error: 'The AI assistant is temporarily unavailable.' }), { status: 502, headers });
  }

  const data = await deepseekResp.json();
  const choice = data.choices?.[0]?.message;
  const result = validateResponse(choice, scopeText);
  return new Response(JSON.stringify(result), { status: 200, headers });
});

// Never trust the model past this point — even in strict mode, this is the
// one place that decides what the client is allowed to render as an action.
function validateResponse(choice, scopeText) {
  const toolCalls = choice?.tool_calls;
  if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
    const text = typeof choice?.content === 'string' && choice.content.trim()
      ? choice.content.trim()
      : "I couldn't do that within the selected text — try selecting the specific part you mean.";
    return { type: 'message', text };
  }
  if (toolCalls.length > 1) {
    return { type: 'message', text: 'That request implies multiple edits — ask for one change at a time.' };
  }

  const call = toolCalls[0];
  const name = call?.function?.name;
  let args;
  try {
    args = JSON.parse(call?.function?.arguments || '{}');
  } catch {
    return { type: 'message', text: "I couldn't format that suggestion properly — try rephrasing your request." };
  }

  if (name === 'propose_rewrite') {
    if (typeof args.newText !== 'string' || !args.newText.trim() || typeof args.reason !== 'string') {
      return { type: 'message', text: "I couldn't format that rewrite properly — try rephrasing your request." };
    }
    if (args.newText.length > MAX_SCOPE_CHARS * 2) {
      return { type: 'message', text: 'That rewrite came out too long for this scope — try narrowing your selection.' };
    }
    return { type: 'action', action: 'propose_rewrite', payload: { newText: args.newText, reason: args.reason } };
  }

  if (name === 'propose_delete') {
    if (typeof args.reason !== 'string' || !args.reason.trim()) {
      return { type: 'message', text: "I couldn't format that suggestion properly — try rephrasing your request." };
    }
    return { type: 'action', action: 'propose_delete', payload: { reason: args.reason } };
  }

  if (name === 'suggest_citation') {
    if (typeof args.claimText !== 'string' || !args.claimText.trim()) {
      return { type: 'message', text: "I couldn't pin that to specific text — try selecting just the sentence in question." };
    }
    if (!scopeText.toLowerCase().includes(args.claimText.trim().toLowerCase())) {
      return { type: 'message', text: "I couldn't pin that to specific text — try selecting just the sentence in question." };
    }
    return { type: 'action', action: 'suggest_citation', payload: { claimText: args.claimText.trim() } };
  }

  return { type: 'message', text: "I couldn't do that within the selected text — try rephrasing your request." };
}
