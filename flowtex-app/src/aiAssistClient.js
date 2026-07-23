// The AI assistant is a work in progress — this client is stubbed out.
// When the feature is ready, this module will call the supabase ai-assist function.

export const AI_SCOPE_CHAR_LIMIT = 1500;

export async function requestAiAssist({ message, scopeText, orientation }) {
  return {
    type: 'error',
    text: 'The AI assistant is still being developed. This feature will be available in a future update.',
  };
}