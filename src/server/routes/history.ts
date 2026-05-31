import { Hono } from 'hono';
import type { HistoryEntry } from '../../core/types';
import * as historyDb from '../db/history';
import { type AuthVariables, requireDb, withAuthWorkspace } from '../db/middleware';

const app = new Hono<{ Variables: AuthVariables }>();

app.use('*', requireDb, withAuthWorkspace);

app.get('/', async (c) => {
  const entries = await historyDb.listHistory(c.get('workspaceId'));
  return c.json({ data: entries });
});

app.post('/', async (c) => {
  let body: HistoryEntry;
  try {
    body = await c.req.json<HistoryEntry>();
  } catch {
    return c.json({ error: 'Invalid JSON body.' }, 400);
  }
  if (!body?.id || !body.spec || !body.response) {
    return c.json({ error: 'Missing required history fields.' }, 400);
  }
  try {
    await historyDb.insertHistory(c.get('workspaceId'), body);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save history.';
    return c.json({ error: message }, 400);
  }
  return c.json({ data: body }, 201);
});

app.delete('/', async (c) => {
  await historyDb.clearHistory(c.get('workspaceId'));
  return c.json({ ok: true });
});

export default app;
