import { supabase } from './supabase';

// Roughly a paragraph — mirrors MAX_SCOPE_CHARS in supabase/functions/ai-assist/index.ts.
export const AI_SCOPE_CHAR_LIMIT = 1500;

// Routes through the ai-assist Supabase Edge Function so the DeepSeek key
// never reaches the browser bundle. Returns one of:
//   { type: 'action', action, payload }
//   { type: 'message', text }
//   { type: 'error', text }
export async function requestAiAssist({ message, scopeText, orientation }) {
  if (!supabase) return { type: 'error', text: 'Supabase is not configured.' };
  const { data, error } = await supabase.functions.invoke('ai-assist', {
    body: { message, scopeText, orientation },
  });
  if (error) {
    return { type: 'error', text: error.message || 'The AI assistant is temporarily unavailable.' };
  }
  if (data?.error) return { type: 'error', text: data.error };
  return data;
}
