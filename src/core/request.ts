import {
  BODYLESS_METHODS,
  type ProxyRequest,
  type RequestSpec,
  type Row,
} from './types';
import { appendQuery, normalizeUrl } from './url';

function enabled(rows: Row[]): Row[] {
  return rows.filter((r) => r.enabled && r.key.trim() !== '');
}

function base64(input: string): string {
  if (typeof btoa === 'function') {
    // Encode UTF-8 safely before base64.
    return btoa(unescape(encodeURIComponent(input)));
  }
  // Node fallback.
  return Buffer.from(input, 'utf-8').toString('base64');
}

function findHeader(headers: Record<string, string>, name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) return headers[key];
  }
  return undefined;
}

/**
 * Assemble a `RequestSpec` (UI state) into a concrete `ProxyRequest`: a fully
 * resolved URL with query string, a flat header map (auth folded in), and a
 * single string body with the right content type. Shared by the direct-fetch
 * path, the proxy path and the cURL generator.
 */
export function assembleRequest(spec: RequestSpec): ProxyRequest {
  const headers: Record<string, string> = {};
  for (const row of enabled(spec.headers)) {
    headers[row.key.trim()] = row.value;
  }

  const queryPairs = enabled(spec.params).map((r) => ({ key: r.key.trim(), value: r.value }));

  // Fold auth into headers / query.
  switch (spec.auth.kind) {
    case 'bearer':
      if (spec.auth.token.trim()) headers['Authorization'] = `Bearer ${spec.auth.token.trim()}`;
      break;
    case 'basic':
      headers['Authorization'] = `Basic ${base64(`${spec.auth.username}:${spec.auth.password}`)}`;
      break;
    case 'apiKey':
      if (spec.auth.name.trim()) {
        if (spec.auth.in === 'header') {
          headers[spec.auth.name.trim()] = spec.auth.value;
        } else {
          queryPairs.push({ key: spec.auth.name.trim(), value: spec.auth.value });
        }
      }
      break;
    case 'none':
    default:
      break;
  }

  const url = appendQuery(normalizeUrl(spec.url), queryPairs);

  let body: string | undefined;
  if (!BODYLESS_METHODS.has(spec.method)) {
    switch (spec.body.mode) {
      case 'json':
        if (spec.body.raw.trim() !== '') {
          body = spec.body.raw;
          if (!findHeader(headers, 'content-type')) headers['Content-Type'] = 'application/json';
        }
        break;
      case 'text':
        if (spec.body.raw !== '') {
          body = spec.body.raw;
          if (!findHeader(headers, 'content-type')) headers['Content-Type'] = 'text/plain';
        }
        break;
      case 'form': {
        const pairs = enabled(spec.body.rows);
        if (pairs.length > 0) {
          body = pairs
            .map((p) => `${encodeURIComponent(p.key.trim())}=${encodeURIComponent(p.value)}`)
            .join('&');
          if (!findHeader(headers, 'content-type')) {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
          }
        }
        break;
      }
      case 'none':
      default:
        break;
    }
  }

  return {
    method: spec.method,
    url,
    headers,
    body,
    timeoutMs: spec.timeoutMs,
    followRedirects: spec.followRedirects,
  };
}
