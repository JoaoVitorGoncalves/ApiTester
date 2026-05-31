export interface JsonResult {
  ok: boolean;
  /** Resulting string (formatted/minified) when ok; original input otherwise. */
  result: string;
  error?: string;
}

export interface JsonCheck {
  valid: boolean;
  /** True when the input is blank (treated as not-an-error, but not valid JSON either). */
  empty: boolean;
  error?: string;
}

export function validateJson(raw: string): JsonCheck {
  if (raw.trim() === '') return { valid: false, empty: true };
  try {
    JSON.parse(raw);
    return { valid: true, empty: false };
  } catch (err) {
    return { valid: false, empty: false, error: friendly(err) };
  }
}

export function formatJson(raw: string, indent = 2): JsonResult {
  if (raw.trim() === '') return { ok: true, result: '' };
  try {
    return { ok: true, result: JSON.stringify(JSON.parse(raw), null, indent) };
  } catch (err) {
    return { ok: false, result: raw, error: friendly(err) };
  }
}

export function minifyJson(raw: string): JsonResult {
  if (raw.trim() === '') return { ok: true, result: '' };
  try {
    return { ok: true, result: JSON.stringify(JSON.parse(raw)) };
  } catch (err) {
    return { ok: false, result: raw, error: friendly(err) };
  }
}

function friendly(err: unknown): string {
  return err instanceof Error ? err.message : 'Invalid JSON';
}
