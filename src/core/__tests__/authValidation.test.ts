import { describe, expect, it } from 'vitest';
import { normalizeAuthName, validateAuthInput } from '../authValidation';

describe('validateAuthInput', () => {
  it('accepts valid name and password', () => {
    expect(validateAuthInput({ name: 'dev_user', password: 'secret123' })).toBeNull();
  });

  it('rejects short name', () => {
    expect(validateAuthInput({ name: 'ab', password: 'secret123' })).toMatch(/3–64/);
  });

  it('rejects invalid name characters', () => {
    expect(validateAuthInput({ name: 'user name', password: 'secret123' })).toMatch(/3–64/);
  });

  it('rejects short password', () => {
    expect(validateAuthInput({ name: 'valid_user', password: 'short' })).toMatch(/8 characters/);
  });
});

describe('normalizeAuthName', () => {
  it('trims whitespace', () => {
    expect(normalizeAuthName('  alice  ')).toBe('alice');
  });
});
