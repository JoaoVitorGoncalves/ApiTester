import type { Context, Next } from 'hono';
import { verifyToken } from '../auth/jwt';
import { isDbConfigured, pingDb } from './pool';
import { ensureWorkspaceExists } from './workspaces';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AuthVariables = {
  workspaceId: string;
  userId?: string;
  authMode: 'user' | 'guest';
};

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

/** Resolve workspace from JWT (logged-in) or guest session header. */
export async function withAuthWorkspace(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (bearer) {
    const claims = await verifyToken(bearer);
    if (!claims) {
      return c.json({ error: 'Invalid or expired token.' }, 401);
    }
    c.set('workspaceId', claims.workspaceId);
    c.set('userId', claims.sub);
    c.set('authMode', 'user');
    return next();
  }

  const mode = c.req.header('X-ApiFlash-Mode');
  if (mode !== 'guest') {
    return c.json({ error: 'Authentication required.' }, 401);
  }

  const workspaceHeader = c.req.header('X-ApiFlash-Workspace')?.trim();
  if (!workspaceHeader || !UUID_RE.test(workspaceHeader)) {
    return c.json({ error: 'Invalid guest workspace.' }, 400);
  }

  await ensureWorkspaceExists(workspaceHeader);
  c.set('workspaceId', workspaceHeader);
  c.set('authMode', 'guest');
  return next();
}
