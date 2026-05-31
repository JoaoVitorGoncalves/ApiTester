export type Method =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS';

export const METHODS: Method[] = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
];

/** Methods that, by spec, never carry a request body. */
export const BODYLESS_METHODS: ReadonlySet<Method> = new Set<Method>(['GET', 'HEAD']);

export interface Row {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export type Auth =
  | { kind: 'none' }
  | { kind: 'bearer'; token: string }
  | { kind: 'basic'; username: string; password: string }
  | { kind: 'apiKey'; name: string; value: string; in: 'header' | 'query' };

export type BodyMode = 'none' | 'json' | 'text' | 'form';

export type Body =
  | { mode: 'none' }
  | { mode: 'json'; raw: string }
  | { mode: 'text'; raw: string }
  | { mode: 'form'; rows: Row[] };

export interface RequestSpec {
  method: Method;
  url: string;
  params: Row[];
  headers: Row[];
  auth: Auth;
  body: Body;
  timeoutMs: number;
  followRedirects: boolean;
  useProxy: boolean;
}

/** A fully assembled request ready to be sent directly or through the proxy. */
export interface ProxyRequest {
  method: Method;
  url: string;
  headers: Record<string, string>;
  body?: string;
  timeoutMs: number;
  followRedirects: boolean;
}

export interface ResponseResult {
  status: number;
  statusText: string;
  durationMs: number;
  sizeBytes: number;
  headers: Record<string, string>;
  body: string;
  contentType: string;
  /** Present when the request never produced an HTTP response (network/timeout/blocked). */
  error?: string;
  /** Whether the response was obtained through the server-side proxy. */
  viaProxy?: boolean;
}

let counter = 0;
export function uid(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export function createRow(key = '', value = '', enabled = true): Row {
  return { id: uid('row'), key, value, enabled };
}

export function defaultRequest(): RequestSpec {
  return {
    method: 'GET',
    url: '',
    params: [createRow()],
    headers: [createRow()],
    auth: { kind: 'none' },
    body: { mode: 'none' },
    timeoutMs: 30_000,
    followRedirects: true,
    useProxy: true,
  };
}

export interface SavedRequest {
  id: string;
  name: string;
  spec: RequestSpec;
  createdAt: number;
  updatedAt: number;
}

export interface Collection {
  id: string;
  name: string;
  requests: SavedRequest[];
  createdAt: number;
}

export interface HistoryEntry {
  id: string;
  method: Method;
  url: string;
  status: number;
  durationMs: number;
  at: number;
  spec: RequestSpec;
}
