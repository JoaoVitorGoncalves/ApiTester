import { assembleRequest } from '@core/request';
import type { ProxyRequest, RequestSpec, ResponseResult } from '@core/types';

export interface SendOutcome {
  result: ResponseResult;
  request: ProxyRequest;
}

/** Send a request either through the server proxy or directly from the browser. */
export async function sendRequest(spec: RequestSpec, signal: AbortSignal): Promise<SendOutcome> {
  const request = assembleRequest(spec);
  const result = spec.useProxy
    ? await sendViaProxy(request, signal)
    : await sendDirect(request, signal);
  return { result, request };
}

async function sendViaProxy(request: ProxyRequest, signal: AbortSignal): Promise<ResponseResult> {
  try {
    const res = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    });
    const data = (await res.json()) as ResponseResult;
    return { ...data, viaProxy: true };
  } catch (err) {
    return transportError(err, true);
  }
}

async function sendDirect(request: ProxyRequest, signal: AbortSignal): Promise<ResponseResult> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal.addEventListener('abort', onAbort);
  const timer = setTimeout(() => controller.abort(), Math.max(1000, request.timeoutMs));
  const started = performance.now();

  try {
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) headers.set(key, value);

    const res = await fetch(request.url, {
      method: request.method,
      headers,
      body:
        request.body !== undefined && request.method !== 'GET' && request.method !== 'HEAD'
          ? request.body
          : undefined,
      redirect: request.followRedirects ? 'follow' : 'manual',
      signal: controller.signal,
    });

    const body = await res.text();
    const durationMs = Math.round(performance.now() - started);
    const responseHeaders: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      status: res.status,
      statusText: res.statusText,
      durationMs,
      sizeBytes: new Blob([body]).size,
      headers: responseHeaders,
      body,
      contentType: res.headers.get('content-type') ?? '',
      viaProxy: false,
    };
  } catch (err) {
    return transportError(err, false);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', onAbort);
  }
}

function transportError(err: unknown, viaProxy: boolean): ResponseResult {
  const aborted = err instanceof Error && err.name === 'AbortError';
  const message = aborted
    ? 'Request aborted or timed out.'
    : err instanceof Error
      ? `${err.message}${viaProxy ? '' : ' (the browser may have blocked this by CORS; try the server proxy)'}`
      : 'The request failed.';
  return {
    status: 0,
    statusText: '',
    durationMs: 0,
    sizeBytes: 0,
    headers: {},
    body: '',
    contentType: '',
    error: message,
    viaProxy,
  };
}
