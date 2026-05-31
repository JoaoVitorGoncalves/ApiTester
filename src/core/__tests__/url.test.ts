import { describe, expect, it } from 'vitest';
import { appendQuery, normalizeUrl, splitQuery } from '../url';

describe('normalizeUrl', () => {
  it('keeps empty input empty', () => {
    expect(normalizeUrl('')).toBe('');
    expect(normalizeUrl('   ')).toBe('');
  });

  it('prefixes https for bare hosts', () => {
    expect(normalizeUrl('api.example.com')).toBe('https://api.example.com');
    expect(normalizeUrl('example.com/users?id=1')).toBe('https://example.com/users?id=1');
  });

  it('preserves explicit schemes', () => {
    expect(normalizeUrl('http://localhost:3000')).toBe('http://localhost:3000');
    expect(normalizeUrl('https://x.dev')).toBe('https://x.dev');
  });

  it('upgrades protocol-relative urls', () => {
    expect(normalizeUrl('//cdn.example.com/a')).toBe('https://cdn.example.com/a');
  });
});

describe('splitQuery', () => {
  it('splits base and pairs', () => {
    const { base, pairs } = splitQuery('https://x.dev/path?a=1&b=two');
    expect(base).toBe('https://x.dev/path');
    expect(pairs).toEqual([
      { key: 'a', value: '1' },
      { key: 'b', value: 'two' },
    ]);
  });

  it('decodes percent-encoded values', () => {
    const { pairs } = splitQuery('https://x.dev?q=hello%20world&plus=a+b');
    expect(pairs).toEqual([
      { key: 'q', value: 'hello world' },
      { key: 'plus', value: 'a b' },
    ]);
  });

  it('handles urls without a query', () => {
    expect(splitQuery('https://x.dev/a')).toEqual({ base: 'https://x.dev/a', pairs: [] });
  });
});

describe('appendQuery', () => {
  it('appends with ? when no query exists', () => {
    expect(appendQuery('https://x.dev', [{ key: 'a', value: '1' }])).toBe('https://x.dev?a=1');
  });

  it('appends with & when a query already exists', () => {
    expect(appendQuery('https://x.dev?z=9', [{ key: 'a', value: '1' }])).toBe('https://x.dev?z=9&a=1');
  });

  it('encodes keys and values and skips empty keys', () => {
    expect(
      appendQuery('https://x.dev', [
        { key: 'q', value: 'a b' },
        { key: '', value: 'ignored' },
      ]),
    ).toBe('https://x.dev?q=a%20b');
  });
});
