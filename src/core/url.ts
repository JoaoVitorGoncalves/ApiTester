/**
 * Normalize a user-typed URL by ensuring it carries an explicit scheme.
 * Empty input stays empty. Protocol-relative URLs become https. Everything
 * else without a scheme gets an `https://` prefix.
 */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  return `https://${trimmed}`;
}

/** Split a URL into its base (without query) and the parsed query pairs. */
export function splitQuery(url: string): { base: string; pairs: Array<{ key: string; value: string }> } {
  const hashIndex = url.indexOf('#');
  const fragment = hashIndex >= 0 ? url.slice(hashIndex) : '';
  const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const qIndex = withoutHash.indexOf('?');
  if (qIndex < 0) return { base: withoutHash + fragment, pairs: [] };

  const base = withoutHash.slice(0, qIndex);
  const query = withoutHash.slice(qIndex + 1);
  const pairs: Array<{ key: string; value: string }> = [];
  for (const part of query.split('&')) {
    if (!part) continue;
    const eq = part.indexOf('=');
    const rawKey = eq >= 0 ? part.slice(0, eq) : part;
    const rawValue = eq >= 0 ? part.slice(eq + 1) : '';
    pairs.push({ key: safeDecode(rawKey), value: safeDecode(rawValue) });
  }
  return { base: base + fragment, pairs };
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

/** Append query pairs to a base URL, preserving any existing query string. */
export function appendQuery(
  baseUrl: string,
  pairs: Array<{ key: string; value: string }>,
): string {
  const usable = pairs.filter((p) => p.key !== '');
  if (usable.length === 0) return baseUrl;
  const qs = usable
    .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    .join('&');
  const sep = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${sep}${qs}`;
}
