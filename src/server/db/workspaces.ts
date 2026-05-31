const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DEFAULT_WORKSPACE_ID =
  process.env.DEFAULT_WORKSPACE_ID ?? '00000000-0000-0000-0000-000000000001';

export function resolveWorkspaceId(headerValue: string | undefined): string {
  const trimmed = headerValue?.trim();
  if (trimmed && UUID_RE.test(trimmed)) return trimmed;
  return DEFAULT_WORKSPACE_ID;
}

export async function ensureWorkspaceExists(workspaceId: string): Promise<void> {
  const { getPool } = await import('./pool');
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS cnt FROM workspaces WHERE id = ?',
    [workspaceId],
  );
  const cnt = Number((rows as { cnt: number }[])[0]?.cnt ?? 0);
  if (cnt > 0) return;
  await pool.query(
    'INSERT INTO workspaces (id, name, owner_user_id, created_at) VALUES (?, ?, NULL, ?)',
    [workspaceId, 'guest-session', Date.now()],
  );
}
