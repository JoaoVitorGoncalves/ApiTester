import { ensureTrailingRow } from '../rows';
import {
  createRow,
  defaultRequest,
  type Auth,
  type Method,
  type RequestSpec,
  type Row,
} from '../types';
import { splitQuery } from '../url';

const KNOWN_METHODS: Method[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

/** Tokenize a shell-style cURL command, honoring quotes and line continuations. */
export function tokenize(input: string): string[] {
  const cleaned = input.replace(/\\\r?\n/g, ' ');
  const tokens: string[] = [];
  let i = 0;
  const n = cleaned.length;

  while (i < n) {
    while (i < n && /\s/.test(cleaned[i])) i++;
    if (i >= n) break;

    let token = '';
    let hasContent = false;
    while (i < n && !/\s/.test(cleaned[i])) {
      const ch = cleaned[i];
      if (ch === "'") {
        hasContent = true;
        i++;
        while (i < n && cleaned[i] !== "'") {
          token += cleaned[i];
          i++;
        }
        i++;
      } else if (ch === '"') {
        hasContent = true;
        i++;
        while (i < n && cleaned[i] !== '"') {
          if (cleaned[i] === '\\' && i + 1 < n && /["\\$`]/.test(cleaned[i + 1])) {
            token += cleaned[i + 1];
            i += 2;
          } else {
            token += cleaned[i];
            i++;
          }
        }
        i++;
      } else if (ch === '\\') {
        if (i + 1 < n) {
          token += cleaned[i + 1];
          i += 2;
        } else {
          i++;
        }
      } else {
        token += ch;
        i++;
      }
      hasContent = true;
    }
    if (hasContent) tokens.push(token);
  }
  return tokens;
}

interface FlagInfo {
  long: string;
  takesValue: boolean;
}

// Short flag -> canonical long form. Only the subset relevant to building a request.
const SHORT_FLAGS: Record<string, FlagInfo> = {
  X: { long: 'request', takesValue: true },
  H: { long: 'header', takesValue: true },
  d: { long: 'data', takesValue: true },
  F: { long: 'form', takesValue: true },
  u: { long: 'user', takesValue: true },
  b: { long: 'cookie', takesValue: true },
  A: { long: 'user-agent', takesValue: true },
  e: { long: 'referer', takesValue: true },
  G: { long: 'get', takesValue: false },
  L: { long: 'location', takesValue: false },
  I: { long: 'head', takesValue: false },
};

const LONG_TAKES_VALUE = new Set<string>([
  'request',
  'header',
  'data',
  'data-raw',
  'data-binary',
  'data-ascii',
  'data-urlencode',
  'form',
  'user',
  'cookie',
  'user-agent',
  'referer',
  'url',
  'max-time',
  'connect-timeout',
]);

export interface ParseResult {
  spec: RequestSpec;
  warnings: string[];
}

/** Parse a cURL command into a full RequestSpec, filling sensible defaults. */
export function parseCurl(input: string): ParseResult {
  const warnings: string[] = [];
  const spec = defaultRequest();
  spec.params = [];
  spec.headers = [];

  const tokens = tokenize(input);
  let idx = 0;
  if (tokens[0] && tokens[0].toLowerCase() === 'curl') idx = 1;

  let explicitMethod: Method | null = null;
  let url = '';
  const headerRows: Row[] = [];
  const dataParts: string[] = [];
  const formParts: Array<{ key: string; value: string }> = [];
  let useGet = false;
  let isHead = false;
  let followRedirects = false;
  let basicUser = '';
  let timeoutMs: number | null = null;

  const next = (): string | undefined => tokens[++idx];

  for (; idx < tokens.length; idx++) {
    const token = tokens[idx];

    if (token.startsWith('--')) {
      const eq = token.indexOf('=');
      const name = eq >= 0 ? token.slice(2, eq) : token.slice(2);
      let value = eq >= 0 ? token.slice(eq + 1) : undefined;
      if (value === undefined && LONG_TAKES_VALUE.has(name)) value = next();
      applyFlag(name, value);
      continue;
    }

    if (token.startsWith('-') && token.length > 1) {
      // Possibly bundled short flags, e.g. -sL or -H'...'
      let j = 1;
      while (j < token.length) {
        const ch = token[j];
        const info = SHORT_FLAGS[ch];
        if (!info) {
          // Unknown short flag (e.g. -s, -k, -v). Skip just this character so
          // bundled clusters like `-sL` still reach the flags we understand.
          j++;
          continue;
        }
        if (info.takesValue) {
          const attached = token.slice(j + 1);
          const value = attached !== '' ? attached : next();
          applyFlag(info.long, value);
          j = token.length;
        } else {
          applyFlag(info.long, undefined);
          j++;
        }
      }
      continue;
    }

    // Bare token -> the URL (first one wins).
    if (!url) url = token;
  }

  function applyFlag(name: string, value: string | undefined) {
    switch (name) {
      case 'request':
        if (value) explicitMethod = value.toUpperCase() as Method;
        break;
      case 'url':
        if (value) url = value;
        break;
      case 'header':
        if (value) {
          const c = value.indexOf(':');
          if (c >= 0) {
            headerRows.push(createRow(value.slice(0, c).trim(), value.slice(c + 1).trim()));
          }
        }
        break;
      case 'data':
      case 'data-raw':
      case 'data-binary':
      case 'data-ascii':
      case 'data-urlencode':
        if (value !== undefined) dataParts.push(value);
        break;
      case 'form':
        if (value) {
          const c = value.indexOf('=');
          if (c >= 0) formParts.push({ key: value.slice(0, c), value: value.slice(c + 1) });
        }
        break;
      case 'user':
        if (value) basicUser = value;
        break;
      case 'cookie':
        if (value) headerRows.push(createRow('Cookie', value));
        break;
      case 'user-agent':
        if (value) headerRows.push(createRow('User-Agent', value));
        break;
      case 'referer':
        if (value) headerRows.push(createRow('Referer', value));
        break;
      case 'get':
        useGet = true;
        break;
      case 'location':
        followRedirects = true;
        break;
      case 'head':
        isHead = true;
        break;
      case 'max-time':
      case 'connect-timeout':
        if (value) {
          const secs = Number.parseFloat(value);
          if (Number.isFinite(secs)) timeoutMs = Math.round(secs * 1000);
        }
        break;
      default:
        warnings.push(`Ignored unsupported flag: --${name}`);
        break;
    }
  }

  // Resolve method.
  if (isHead) {
    spec.method = 'HEAD';
  } else if (explicitMethod && KNOWN_METHODS.includes(explicitMethod)) {
    spec.method = explicitMethod;
  } else if ((dataParts.length > 0 || formParts.length > 0) && !useGet) {
    spec.method = 'POST';
  } else {
    spec.method = 'GET';
  }
  if (explicitMethod && !KNOWN_METHODS.includes(explicitMethod)) {
    warnings.push(`Unknown method "${explicitMethod}", defaulting to ${spec.method}.`);
  }

  // Split URL into base + query params.
  const { base, pairs } = splitQuery(url);
  spec.url = base;
  for (const p of pairs) spec.params.push(createRow(p.key, p.value));

  // Detect content type from headers.
  const contentTypeHeader = headerRows.find((h) => h.key.toLowerCase() === 'content-type');
  const contentType = contentTypeHeader?.value.toLowerCase() ?? '';

  // Extract auth from Authorization header / -u.
  let auth: Auth = { kind: 'none' };
  const authHeaderIndex = headerRows.findIndex((h) => h.key.toLowerCase() === 'authorization');
  if (authHeaderIndex >= 0) {
    const authValue = headerRows[authHeaderIndex].value;
    const bearer = /^Bearer\s+(.+)$/i.exec(authValue);
    const basic = /^Basic\s+(.+)$/i.exec(authValue);
    if (bearer) {
      auth = { kind: 'bearer', token: bearer[1].trim() };
      headerRows.splice(authHeaderIndex, 1);
    } else if (basic) {
      const decoded = decodeBase64(basic[1].trim());
      const sep = decoded.indexOf(':');
      auth = {
        kind: 'basic',
        username: sep >= 0 ? decoded.slice(0, sep) : decoded,
        password: sep >= 0 ? decoded.slice(sep + 1) : '',
      };
      headerRows.splice(authHeaderIndex, 1);
    }
  } else if (basicUser) {
    const sep = basicUser.indexOf(':');
    auth = {
      kind: 'basic',
      username: sep >= 0 ? basicUser.slice(0, sep) : basicUser,
      password: sep >= 0 ? basicUser.slice(sep + 1) : '',
    };
  }
  spec.auth = auth;

  spec.headers = headerRows;

  // Body handling.
  if (useGet && dataParts.length > 0) {
    // -G turns data into query params.
    for (const part of dataParts) {
      for (const pair of part.split('&')) {
        if (!pair) continue;
        const eq = pair.indexOf('=');
        spec.params.push(
          createRow(
            eq >= 0 ? pair.slice(0, eq) : pair,
            eq >= 0 ? pair.slice(eq + 1) : '',
          ),
        );
      }
    }
  } else if (formParts.length > 0) {
    spec.body = {
      mode: 'form',
      rows: formParts.map((p) => createRow(p.key, p.value)),
    };
  } else if (dataParts.length > 0) {
    const raw = dataParts.join('&');
    if (contentType.includes('application/json')) {
      spec.body = { mode: 'json', raw };
    } else if (contentType.includes('x-www-form-urlencoded')) {
      const rows: Row[] = [];
      for (const pair of raw.split('&')) {
        if (!pair) continue;
        const eq = pair.indexOf('=');
        rows.push(
          createRow(
            decodeURIComponent(eq >= 0 ? pair.slice(0, eq) : pair),
            decodeURIComponent(eq >= 0 ? pair.slice(eq + 1) : ''),
          ),
        );
      }
      spec.body = { mode: 'form', rows };
    } else {
      spec.body = { mode: 'text', raw };
    }
  }

  if (timeoutMs !== null) spec.timeoutMs = timeoutMs;
  spec.followRedirects = followRedirects;

  spec.params = ensureTrailingRow(spec.params);
  spec.headers = ensureTrailingRow(spec.headers);

  return { spec, warnings };
}

function decodeBase64(value: string): string {
  try {
    if (typeof atob === 'function') {
      return decodeURIComponent(escape(atob(value)));
    }
    return Buffer.from(value, 'base64').toString('utf-8');
  } catch {
    return value;
  }
}
