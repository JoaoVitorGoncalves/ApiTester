import { describe, expect, it } from 'vitest';
import { ensureTrailingRow } from '../rows';
import { createRow } from '../types';

describe('ensureTrailingRow', () => {
  it('returns a single blank row when input is empty', () => {
    const rows = ensureTrailingRow([]);
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe('');
    expect(rows[0].value).toBe('');
  });

  it('appends a blank row when the last row is filled', () => {
    const rows = ensureTrailingRow([createRow('apikey', 'secret', true)]);
    expect(rows).toHaveLength(2);
    expect(rows[0].key).toBe('apikey');
    expect(rows[1].key).toBe('');
    expect(rows[1].value).toBe('');
  });

  it('does not duplicate when a trailing blank row already exists', () => {
    const rows = ensureTrailingRow([createRow('a', '1'), createRow()]);
    expect(rows).toHaveLength(2);
  });
});
