import { describe, expect, it } from 'vitest';
import { formatJson, minifyJson, validateJson } from '../json';

describe('validateJson', () => {
  it('flags blank input as empty, not valid', () => {
    expect(validateJson('   ')).toEqual({ valid: false, empty: true });
  });

  it('accepts valid json', () => {
    expect(validateJson('{"a":1}')).toEqual({ valid: true, empty: false });
  });

  it('reports an error for invalid json', () => {
    const result = validateJson('{a:1}');
    expect(result.valid).toBe(false);
    expect(result.empty).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe('formatJson', () => {
  it('pretty-prints with indentation', () => {
    expect(formatJson('{"a":1}').result).toBe('{\n  "a": 1\n}');
  });

  it('returns the original string on error', () => {
    const result = formatJson('{bad}');
    expect(result.ok).toBe(false);
    expect(result.result).toBe('{bad}');
  });
});

describe('minifyJson', () => {
  it('removes whitespace', () => {
    expect(minifyJson('{\n  "a": 1\n}').result).toBe('{"a":1}');
  });
});
