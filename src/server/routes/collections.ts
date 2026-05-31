import { Hono } from 'hono';
import type { SavedRequest } from '../../core/types';
import * as collectionsDb from '../db/collections';
import { requireDb, withWorkspace } from '../db/middleware';

type Vars = { workspaceId: string };

const app = new Hono<{ Variables: Vars }>();

app.use('*', requireDb, withWorkspace);

app.get('/', async (c) => {
  const collections = await collectionsDb.listCollections(c.get('workspaceId'));
  return c.json({ data: collections });
});

app.post('/', async (c) => {
  const body = await c.req.json<{ id: string; name: string; createdAt: number }>();
  if (!body?.id || !body.name) {
    return c.json({ error: 'id and name are required.' }, 400);
  }
  const collection = await collectionsDb.createCollection(
    c.get('workspaceId'),
    body.id,
    body.name.trim(),
    body.createdAt ?? Date.now(),
  );
  return c.json({ data: collection }, 201);
});

app.patch('/:id', async (c) => {
  const body = await c.req.json<{ name: string }>();
  if (!body?.name?.trim()) {
    return c.json({ error: 'name is required.' }, 400);
  }
  const ok = await collectionsDb.renameCollection(c.get('workspaceId'), c.req.param('id'), body.name.trim());
  if (!ok) return c.json({ error: 'Collection not found.' }, 404);
  return c.json({ ok: true });
});

app.delete('/:id', async (c) => {
  const ok = await collectionsDb.deleteCollection(c.get('workspaceId'), c.req.param('id'));
  if (!ok) return c.json({ error: 'Collection not found.' }, 404);
  return c.json({ ok: true });
});

app.post('/:id/requests', async (c) => {
  const body = await c.req.json<SavedRequest>();
  if (!body?.id || !body.spec) {
    return c.json({ error: 'Invalid saved request.' }, 400);
  }
  try {
    const ok = await collectionsDb.addSavedRequest(c.get('workspaceId'), c.req.param('id'), body);
    if (!ok) return c.json({ error: 'Collection not found.' }, 404);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save request.';
    return c.json({ error: message }, 400);
  }
  return c.json({ data: body }, 201);
});

app.delete('/:id/requests/:requestId', async (c) => {
  const ok = await collectionsDb.removeSavedRequest(
    c.get('workspaceId'),
    c.req.param('id'),
    c.req.param('requestId'),
  );
  if (!ok) return c.json({ error: 'Request not found.' }, 404);
  return c.json({ ok: true });
});

export default app;
