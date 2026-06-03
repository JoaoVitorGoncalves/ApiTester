import { describe, expect, it } from 'vitest';
import { checkWebhookRateLimit } from '../webhooks/rateLimit';

describe('checkWebhookRateLimit', () => {
  it('allows requests under the limit', () => {
    const id = `test-${Date.now()}`;
    expect(checkWebhookRateLimit(id)).toBe(true);
    expect(checkWebhookRateLimit(id)).toBe(true);
  });
});
