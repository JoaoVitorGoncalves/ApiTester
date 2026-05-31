import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assertSafeTarget } from '../ssrf';

describe('assertSafeTarget', () => {
  beforeEach(() => {
    delete process.env.APIFLASH_ALLOW_PRIVATE;
  });
  afterEach(() => {
    delete process.env.APIFLASH_ALLOW_PRIVATE;
  });

  it('rejects non-http(s) schemes', async () => {
    expect((await assertSafeTarget('ftp://example.com')).ok).toBe(false);
    expect((await assertSafeTarget('file:///etc/passwd')).ok).toBe(false);
  });

  it('rejects invalid urls', async () => {
    expect((await assertSafeTarget('not a url')).ok).toBe(false);
  });

  it('blocks localhost and loopback', async () => {
    expect((await assertSafeTarget('http://localhost:3000')).ok).toBe(false);
    expect((await assertSafeTarget('http://127.0.0.1')).ok).toBe(false);
    expect((await assertSafeTarget('http://[::1]')).ok).toBe(false);
  });

  it('blocks private ranges and cloud metadata', async () => {
    expect((await assertSafeTarget('http://10.0.0.5')).ok).toBe(false);
    expect((await assertSafeTarget('http://192.168.1.1')).ok).toBe(false);
    expect((await assertSafeTarget('http://172.16.4.4')).ok).toBe(false);
    expect((await assertSafeTarget('http://169.254.169.254/latest/meta-data')).ok).toBe(false);
  });

  it('allows a public ip literal', async () => {
    expect((await assertSafeTarget('https://8.8.8.8')).ok).toBe(true);
  });

  it('relaxes when APIFLASH_ALLOW_PRIVATE is set', async () => {
    process.env.APIFLASH_ALLOW_PRIVATE = '1';
    expect((await assertSafeTarget('http://localhost:3000')).ok).toBe(true);
    expect((await assertSafeTarget('http://127.0.0.1')).ok).toBe(true);
  });
});
