import { describe, expect, it } from 'vitest';
import { assembleRequest } from '../request';
import { createRow, defaultRequest, type RequestSpec } from '../types';

function spec(overrides: Partial<RequestSpec> = {}): RequestSpec {
  return { ...defaultRequest(), params: [], headers: [], ...overrides };
}

describe('assembleRequest', () => {
  it('normalizes the url and appends enabled params', () => {
    const req = assembleRequest(
      spec({
        url: 'api.example.com/users',
        params: [createRow('page', '2'), createRow('off', 'x', false)],
      }),
    );
    expect(req.url).toBe('https://api.example.com/users?page=2');
  });

  it('folds bearer auth into the Authorization header', () => {
    const req = assembleRequest(spec({ url: 'x.dev', auth: { kind: 'bearer', token: 'abc' } }));
    expect(req.headers['Authorization']).toBe('Bearer abc');
  });

  it('encodes basic auth credentials', () => {
    const req = assembleRequest(
      spec({ url: 'x.dev', auth: { kind: 'basic', username: 'user', password: 'pass' } }),
    );
    expect(req.headers['Authorization']).toBe(`Basic ${btoa('user:pass')}`);
  });

  it('places api key auth in the query when requested', () => {
    const req = assembleRequest(
      spec({ url: 'x.dev', auth: { kind: 'apiKey', name: 'api_key', value: 'k1', in: 'query' } }),
    );
    expect(req.url).toBe('https://x.dev?api_key=k1');
  });

  it('serializes a json body and defaults the content type', () => {
    const req = assembleRequest(
      spec({ method: 'POST', url: 'x.dev', body: { mode: 'json', raw: '{"a":1}' } }),
    );
    expect(req.body).toBe('{"a":1}');
    expect(req.headers['Content-Type']).toBe('application/json');
  });

  it('url-encodes a form body', () => {
    const req = assembleRequest(
      spec({
        method: 'POST',
        url: 'x.dev',
        body: { mode: 'form', rows: [createRow('name', 'a b'), createRow('n', '2')] },
      }),
    );
    expect(req.body).toBe('name=a%20b&n=2');
    expect(req.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
  });

  it('drops the body for GET requests', () => {
    const req = assembleRequest(
      spec({ method: 'GET', url: 'x.dev', body: { mode: 'json', raw: '{"a":1}' } }),
    );
    expect(req.body).toBeUndefined();
  });

  it('respects an explicit content-type header', () => {
    const req = assembleRequest(
      spec({
        method: 'POST',
        url: 'x.dev',
        headers: [createRow('Content-Type', 'application/vnd.api+json')],
        body: { mode: 'json', raw: '{}' },
      }),
    );
    expect(req.headers['Content-Type']).toBe('application/vnd.api+json');
  });
});
