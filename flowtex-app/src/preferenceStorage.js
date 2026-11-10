// Preferences are optional: blocked/full browser storage must not prevent editing.
export function readPreference(key) {
  try { return localStorage.getItem(key); }
  catch { return null; }
}

export function writePreference(key, value) {
  try { localStorage.setItem(key, value); }
  catch { /* Keep using the preference in memory. */ }
}
