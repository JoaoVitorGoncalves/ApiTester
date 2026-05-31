import { describe, expect, it } from 'vitest';
import { buildCurl } from '../curl/build';
import { parseCurl, tokenize } from '../curl/parse';
import { assembleRequest } from '../request';
import { createRow, defaultRequest, type RequestSpec } from '../types';

function spec(overrides: Partial<RequestSpec> = {}): RequestSpec {
  return { ...defaultRequest(), params: [], headers: [], ...overrides };
}

describe('tokenize', () => {
  it('respects single and double quotes', () => {
    expect(tokenize(`curl 'https://x.dev/a b' -H "X: y z"`)).toEqual([
      'curl',
      'https://x.dev/a b',
      '-H',
      'X: y z',
    ]);
  });

  it('joins backslash line continuations', () => {
    expect(tokenize("curl x.dev \\\n  -X POST")).toEqual(['curl', 'x.dev', '-X', 'POST']);
  });
});

describe('parseCurl', () => {
  it('parses method, headers and json body', () => {
    const { spec } = parseCurl(
      `curl -X POST 'https://api.example.com/users?team=1' -H 'Content-Type: application/json' -H 'X-Trace: 9' --data '{"name":"ada"}'`,
    );
    expect(spec.method).toBe('POST');
    expect(spec.url).toBe('https://api.example.com/users');
    expect(spec.params.filter((p) => p.key !== '')).toEqual([
      expect.objectContaining({ key: 'team', value: '1' }),
    ]);
    expect(spec.body).toEqual({ mode: 'json', raw: '{"name":"ada"}' });
    expect(spec.headers.map((h) => h.key)).toContain('X-Trace');
  });

  it('defaults to POST when data is present without an explicit method', () => {
    const { spec } = parseCurl(`curl x.dev -d 'a=1'`);
    expect(spec.method).toBe('POST');
  });

  it('extracts bearer auth from the Authorization header', () => {
    const { spec } = parseCurl(`curl x.dev -H 'Authorization: Bearer tok123'`);
    expect(spec.auth).toEqual({ kind: 'bearer', token: 'tok123' });
    expect(spec.headers.find((h) => h.key.toLowerCase() === 'authorization')).toBeUndefined();
  });

  it('decodes basic auth from -u', () => {
    const { spec } = parseCurl(`curl x.dev -u alice:secret`);
    expect(spec.auth).toEqual({ kind: 'basic', username: 'alice', password: 'secret' });
  });

  it('turns -G data into query params', () => {
    const { spec } = parseCurl(`curl -G x.dev --data 'q=hi&n=2'`);
    expect(spec.method).toBe('GET');
    expect(
      spec.params.filter((p) => p.key !== '').map((p) => [p.key, p.value]),
    ).toEqual([
      ['q', 'hi'],
      ['n', '2'],
    ]);
  });

  it('handles bundled short flags and -L', () => {
    const { spec } = parseCurl(`curl -sL x.dev`);
    expect(spec.followRedirects).toBe(true);
    expect(spec.url).toBe('x.dev');
  });

  it('always leaves a trailing blank header row after import', () => {
    const { spec } = parseCurl(
      `curl -X GET 'https://evolutionmanager.deliverydigital.cloud/instance/fetchInstances' \\
  -H 'apikey: SbfyU1NSx8Z6xmxIBabqxj1ZtHHCCBFx' \\
  --max-time 30`,
    );
    expect(spec.headers.length).toBeGreaterThanOrEqual(2);
    const last = spec.headers[spec.headers.length - 1];
    expect(last.key).toBe('');
    expect(last.value).toBe('');
    expect(spec.headers[0].key).toBe('apikey');
  });

  it('parses urlencoded bodies into form rows', () => {
    const { spec } = parseCurl(
      `curl -X POST x.dev -H 'content-type: application/x-www-form-urlencoded' --data 'a=1&b=two'`,
    );
    expect(spec.body).toEqual({
      mode: 'form',
      rows: [
        expect.objectContaining({ key: 'a', value: '1' }),
        expect.objectContaining({ key: 'b', value: 'two' }),
      ],
    });
  });
});

describe('buildCurl', () => {
  it('produces a command that round-trips through the parser', () => {
    const original = spec({
      method: 'POST',
      url: 'https://api.example.com/items',
      params: [createRow('page', '2')],
      headers: [createRow('X-Trace', '7')],
      auth: { kind: 'bearer', token: 'tok' },
      body: { mode: 'json', raw: '{"a":1}' },
    });

    const curl = buildCurl(original);
    expect(curl).toContain("curl -X POST 'https://api.example.com/items?page=2'");
    expect(curl).toContain("-H 'Authorization: Bearer tok'");

    const { spec: reparsed } = parseCurl(curl);
    const a = assembleRequest(original);
    const b = assembleRequest(reparsed);
    expect(b.method).toBe(a.method);
    expect(b.url).toBe(a.url);
    expect(b.body).toBe(a.body);
    expect(b.headers['Authorization']).toBe('Bearer tok');
  });

  it('escapes single quotes in values', () => {
    const curl = buildCurl(spec({ method: 'POST', url: 'x.dev', body: { mode: 'text', raw: "it's" } }));
    expect(curl).toContain(`--data 'it'\\''s'`);
  });
});
