import type { Context } from 'hono';
import { verifyPassword } from '../auth/password';
import * as webhooksDb from '../db/webhooks';
import { checkWebhookRateLimit } from './rateLimit';

function clientIp(c: Context): string | null {
  const forwarded = c.req.header('X-Forwarded-For');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first.slice(0, 45);
  }
  const realIp = c.req.header('X-Real-IP')?.trim();
  if (realIp) return realIp.slice(0, 45);
  return null;
}

function collectHeaders(c: Context): Record<string, string> {
  const out: Record<string, string> = {};
  c.req.raw.headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function collectQuery(c: Context): Record<string, string> {
  const out: Record<string, string> = {};
  const url = new URL(c.req.url);
  url.searchParams.forEach((value, key) => {
    if (key === 'secret') return;
    out[key] = value;
  });
  return out;
}

async function readBody(c: Context): Promise<{ text: string | null; truncated: boolean }> {
  const limit = webhooksDb.bodyByteLimit();
  try {
    const buf = await c.req.arrayBuffer();
    if (buf.byteLength === 0) return { text: null, truncated: false };
    const truncated = buf.byteLength > limit;
    const slice = truncated ? buf.slice(0, limit) : buf;
    return { text: new TextDecoder('utf-8', { fatal: false }).decode(slice), truncated };
  } catch {
    return { text: null, truncated: false };
  }
}

async function validateSecret(
  endpoint: webhooksDb.WebhookEndpointRow,
  c: Context,
): Promise<boolean> {
  if (!endpoint.secret_hash) return true;
  const headerSecret = c.req.header('X-Webhook-Secret');
  const querySecret = new URL(c.req.url).searchParams.get('secret');
  const provided = headerSecret ?? querySecret;
  if (!provided) return false;
  return verifyPassword(provided, endpoint.secret_hash);
}

export async function handleInbox(c: Context, webhookId: string): Promise<Response> {
  const endpoint = await webhooksDb.getEndpointByPublicId(webhookId);
  if (!endpoint || !endpoint.enabled) {
    return c.json({ error: 'Webhook not found.' }, 404);
  }

  if (!checkWebhookRateLimit(webhookId)) {
    return c.json({ error: 'Rate limit exceeded.' }, 429);
  }

  if (!(await validateSecret(endpoint, c))) {
    return c.json({ error: 'Invalid webhook secret.' }, 401);
  }

  const url = new URL(c.req.url);
  const { text: bodyText, truncated } = await readBody(c);
  const responseStatus = endpoint.response_status ?? 200;
  const responseBody = endpoint.response_body;

  const receipt = await webhooksDb.insertReceipt({
    webhookId: endpoint.id,
    workspaceId: endpoint.workspace_id,
    method: c.req.method,
    path: url.pathname,
    query: collectQuery(c),
    headers: collectHeaders(c),
    bodyText,
    bodyTruncated: truncated,
    responseStatus,
    clientIp: clientIp(c),
  });

  if (responseStatus === 204) {
    return c.body(null, 204);
  }

  if (responseBody != null) {
    return c.body(responseBody, responseStatus as 200);
  }

  return c.json({ ok: true, receiptId: receipt.id }, responseStatus as 200);
}
