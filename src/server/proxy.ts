import type { Context } from 'hono';
import type { ProxyRequest, ResponseResult } from '../core/types';
import { assertSafeTarget } from './ssrf';

const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10 MB cap on proxied responses.
const MAX_TIMEOUT_MS = 120_000;

// Headers we must never forward verbatim from the client's assembled request.
const STRIPPED_REQUEST_HEADERS = new Set(['host', 'content-length', 'connection', 'accept-encoding']);

function errorResult(error: string): ResponseResult {
  return {
    status: 0,
    statusText: '',
    durationMs: 0,
    sizeBytes: 0,
    headers: {},
    body: '',
    contentType: '',
    error,
    viaProxy: true,
  };
}

function isValidPayload(payload: unknown): payload is ProxyRequest {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return typeof p.method === 'string' && typeof p.url === 'string';
}

export async function proxyHandler(c: Context): Promise<Response> {
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json(errorResult('Invalid proxy request payload.'), 400);
  }

  if (!isValidPayload(payload)) {
    return c.json(errorResult('Invalid proxy request payload.'), 400);
  }

  const request = payload;
  const verdict = await assertSafeTarget(request.url);
  if (!verdict.ok) {
    return c.json(errorResult(verdict.reason ?? 'Target blocked.'), 200);
  }

  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers ?? {})) {
    if (!STRIPPED_REQUEST_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  }

  const timeoutMs = Math.min(Math.max(1000, request.timeoutMs || 30_000), MAX_TIMEOUT_MS);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();

  try {
    const upstream = await fetch(request.url, {
      method: request.method,
      headers,
      body: request.body !== undefined && request.method !== 'GET' && request.method !== 'HEAD'
        ? request.body
        : undefined,
      redirect: request.followRedirects ? 'follow' : 'manual',
      signal: controller.signal,
    });

    const { text, bytes, truncated } = await readCapped(upstream);
    const durationMs = Math.round(performance.now() - started);

    const responseHeaders: Record<string, string> = {};
    upstream.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const result: ResponseResult = {
      status: upstream.status,
      statusText: upstream.statusText,
      durationMs,
      sizeBytes: bytes,
      headers: responseHeaders,
      body: truncated ? `${text}\n\n/* response truncated at ${MAX_BODY_BYTES} bytes */` : text,
      contentType: upstream.headers.get('content-type') ?? '',
      viaProxy: true,
    };
    return c.json(result, 200);
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    const message = aborted
      ? `Request timed out after ${timeoutMs} ms.`
      : err instanceof Error
        ? err.message
        : 'The proxied request failed.';
    return c.json(errorResult(message), 200);
  } finally {
    clearTimeout(timer);
  }
}

async function readCapped(response: Response): Promise<{ text: string; bytes: number; truncated: boolean }> {
  if (!response.body) return { text: '', bytes: 0, truncated: false };

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        const room = value.byteLength - (total - MAX_BODY_BYTES);
        if (room > 0) chunks.push(value.subarray(0, room));
        truncated = true;
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
  }

  const merged = new Uint8Array(chunks.reduce((n, ch) => n + ch.byteLength, 0));
  let offset = 0;
  for (const ch of chunks) {
    merged.set(ch, offset);
    offset += ch.byteLength;
  }
  const text = new TextDecoder('utf-8').decode(merged);
  return { text, bytes: total, truncated };
}
