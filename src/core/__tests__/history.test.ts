import { describe, expect, it } from 'vitest';
import { toHistoryEntry } from '../history';
import { defaultRequest } from '../types';

describe('toHistoryEntry', () => {
  it('includes spec, response and generated curl', () => {
    const spec = { ...defaultRequest(), method: 'GET' as const, url: 'https://example.com' };
    const result = {
      status: 200,
      statusText: 'OK',
      durationMs: 42,
      sizeBytes: 10,
      headers: { 'content-type': 'application/json' },
      body: '{"ok":true}',
      contentType: 'application/json',
    };
    const entry = toHistoryEntry(spec, result);
    expect(entry.method).toBe('GET');
    expect(entry.status).toBe(200);
    expect(entry.spec.url).toBe('https://example.com');
    expect(entry.response.body).toBe('{"ok":true}');
    expect(entry.curl).toContain('curl -X GET');
    expect(entry.curl).toContain('https://example.com');
  });
});
