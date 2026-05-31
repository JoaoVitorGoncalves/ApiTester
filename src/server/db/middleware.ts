import type { Context, Next } from 'hono';
import { isDbConfigured, pingDb } from './pool';
import { ensureWorkspaceExists, resolveWorkspaceId } from './workspaces';

export async function requireDb(c: Context, next: Next) {
  if (!isDbConfigured()) {
    return c.json({ error: 'Database is not configured.' }, 503);
  }
  const ok = await pingDb();
  if (!ok) {
    return c.json({ error: 'Database is unavailable.' }, 503);
  }
  return next();
}

export async function withWorkspace(c: Context, next: Next) {
  const workspaceId = resolveWorkspaceId(c.req.header('X-ApiFlash-Workspace'));
  await ensureWorkspaceExists(workspaceId);
  c.set('workspaceId', workspaceId);
  return next();
}
