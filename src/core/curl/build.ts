import { assembleRequest } from '../request';
import type { RequestSpec } from '../types';

function quote(value: string): string {
  // Wrap in single quotes; escape embedded single quotes the POSIX way.
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/** Build a copy-pasteable cURL command for the current request. */
export function buildCurl(spec: RequestSpec): string {
  const req = assembleRequest(spec);
  const lines: string[] = [`curl -X ${req.method} ${quote(req.url)}`];

  for (const [key, value] of Object.entries(req.headers)) {
    lines.push(`-H ${quote(`${key}: ${value}`)}`);
  }

  if (req.body !== undefined && req.body !== '') {
    lines.push(`--data ${quote(req.body)}`);
  }

  if (req.followRedirects) lines.push('-L');

  const seconds = Math.max(1, Math.round(req.timeoutMs / 1000));
  lines.push(`--max-time ${seconds}`);

  return lines.join(' \\\n  ');
}
