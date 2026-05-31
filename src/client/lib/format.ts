import type { Method } from '@core/types';

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

/** Map an HTTP status (or 0 for transport error) to a semantic color token. */
export function statusColor(status: number): string {
  if (status === 0) return 'var(--danger)';
  if (status >= 500) return 'var(--danger)';
  if (status >= 400) return 'var(--danger)';
  if (status >= 300) return 'var(--warn)';
  if (status >= 200) return 'var(--ok)';
  return 'var(--info)';
}

export function methodColor(method: Method): string {
  return `var(--m-${method.toLowerCase()})`;
}

export function relativeTime(at: number, lang: 'pt' | 'en'): string {
  const diff = Date.now() - at;
  const sec = Math.round(diff / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  const L = lang === 'pt';
  if (sec < 45) return L ? 'agora' : 'now';
  if (min < 60) return L ? `${min} min` : `${min}m ago`;
  if (hr < 24) return L ? `${hr} h` : `${hr}h ago`;
  if (day < 7) return L ? `${day} d` : `${day}d ago`;
  return new Date(at).toLocaleDateString(L ? 'pt-BR' : 'en-US');
}

export function prettyMaybeJson(body: string, contentType: string): string {
  const looksJson = contentType.includes('json') || /^\s*[[{]/.test(body);
  if (!looksJson) return body;
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}
