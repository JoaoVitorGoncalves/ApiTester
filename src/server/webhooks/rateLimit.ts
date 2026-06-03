const WINDOW_MS = 60_000;
const DEFAULT_MAX = 120;

const hits = new Map<string, { count: number; resetAt: number }>();

function maxPerWindow(): number {
  const raw = process.env.APIFLASH_WEBHOOK_RATE_LIMIT;
  if (!raw) return DEFAULT_MAX;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_MAX;
}

/** Light in-memory rate limit per webhook inbox id (v1). */
export function checkWebhookRateLimit(webhookId: string): boolean {
  const now = Date.now();
  const max = maxPerWindow();
  const entry = hits.get(webhookId);
  if (!entry || now >= entry.resetAt) {
    hits.set(webhookId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}
