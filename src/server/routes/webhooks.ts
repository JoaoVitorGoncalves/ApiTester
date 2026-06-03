import { Hono } from 'hono';
import * as webhooksDb from '../db/webhooks';
import { isDbConfigured, pingDb } from '../db/pool';
import { requireDb, type AuthVariables, withAuthWorkspace } from '../db/middleware';
import { handleInbox } from '../webhooks/inbox';

const app = new Hono<{ Variables: AuthVariables }>();

app.all('/inbox/:webhookId', async (c) => {
  if (!isDbConfigured()) {
    return c.json({ error: 'Database is not configured.' }, 503);
  }
  const ok = await pingDb();
  if (!ok) {
    return c.json({ error: 'Database is unavailable.' }, 503);
  }
  return handleInbox(c, c.req.param('webhookId'));
});

const authed = new Hono<{ Variables: AuthVariables }>();
authed.use('*', requireDb, withAuthWorkspace);

authed.get('/receipts', async (c) => {
  const webhookId = c.req.query('webhookId');
  const receipts = await webhooksDb.listReceipts(c.get('workspaceId'), webhookId || undefined);
  return c.json({ data: receipts });
});

authed.get('/receipts/:receiptId', async (c) => {
  const receipt = await webhooksDb.getReceipt(c.get('workspaceId'), c.req.param('receiptId'));
  if (!receipt) return c.json({ error: 'Receipt not found.' }, 404);
  return c.json({ data: receipt });
});

authed.delete('/receipts', async (c) => {
  const webhookId = c.req.query('webhookId');
  await webhooksDb.clearReceipts(c.get('workspaceId'), webhookId || undefined);
  return c.json({ ok: true });
});

authed.get('/', async (c) => {
  const endpoints = await webhooksDb.listEndpoints(c.get('workspaceId'));
  return c.json({ data: endpoints });
});

authed.post('/', async (c) => {
  let body: { name?: string; secret?: string | null; generateSecret?: boolean };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body.' }, 400);
  }
  const name = body.name?.trim() || 'Webhook';
  const { endpoint, secretPlain } = await webhooksDb.createEndpoint(c.get('workspaceId'), name, {
    generateSecret: Boolean(body.generateSecret),
    secret: body.secret,
  });
  return c.json({ data: endpoint, secret: secretPlain ?? null }, 201);
});

authed.patch('/:id', async (c) => {
  let body: {
    name?: string;
    enabled?: boolean;
    responseStatus?: number | null;
    responseBody?: string | null;
    secret?: string | null;
    clearSecret?: boolean;
    generateSecret?: boolean;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body.' }, 400);
  }
  const result = await webhooksDb.updateEndpoint(c.get('workspaceId'), c.req.param('id'), body);
  if (!result) return c.json({ error: 'Webhook not found.' }, 404);
  return c.json({ data: result.endpoint, secret: result.secretPlain ?? null });
});

authed.delete('/:id/receipts', async (c) => {
  await webhooksDb.clearReceipts(c.get('workspaceId'), c.req.param('id'));
  return c.json({ ok: true });
});

authed.delete('/:id', async (c) => {
  const ok = await webhooksDb.deleteEndpoint(c.get('workspaceId'), c.req.param('id'));
  if (!ok) return c.json({ error: 'Webhook not found.' }, 404);
  return c.json({ ok: true });
});

app.route('/', authed);

export default app;
