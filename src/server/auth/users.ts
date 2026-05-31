import { randomUUID } from 'node:crypto';
import { normalizeAuthName } from '../../core/authValidation';
import { getPool } from '../db/pool';
import { hashPassword, verifyPassword } from './password';

export interface UserRecord {
  id: string;
  name: string;
  workspaceId: string;
}

interface UserRow {
  id: string;
  name: string;
  password_hash: string;
  workspace_id: string | null;
}

export async function registerUser(name: string, password: string): Promise<UserRecord> {
  const normalized = normalizeAuthName(name);
  const pool = getPool();
  const conn = await pool.getConnection();
  const userId = randomUUID();
  const workspaceId = randomUUID();
  const now = Date.now();
  const passwordHash = await hashPassword(password);

  try {
    await conn.beginTransaction();
    const [existing] = await conn.query(
      'SELECT id FROM users WHERE name = ? LIMIT 1',
      [normalized],
    );
    if ((existing as { id: string }[]).length > 0) {
      const err = new Error('NAME_TAKEN');
      (err as Error & { code: string }).code = 'NAME_TAKEN';
      throw err;
    }

    await conn.query(
      'INSERT INTO users (id, name, password_hash, created_at) VALUES (?, ?, ?, ?)',
      [userId, normalized, passwordHash, now],
    );
    await conn.query(
      'INSERT INTO workspaces (id, name, owner_user_id, created_at) VALUES (?, ?, ?, ?)',
      [workspaceId, `${normalized}'s workspace`, userId, now],
    );
    await conn.commit();
    return { id: userId, name: normalized, workspaceId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function loginUser(name: string, password: string): Promise<UserRecord | null> {
  const normalized = normalizeAuthName(name);
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.password_hash, w.id AS workspace_id
     FROM users u
     INNER JOIN workspaces w ON w.owner_user_id = u.id
     WHERE u.name = ?
     LIMIT 1`,
    [normalized],
  );
  const row = (rows as UserRow[])[0];
  if (!row?.workspace_id) return null;
  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) return null;
  return { id: row.id, name: row.name, workspaceId: row.workspace_id };
}

export async function findUserById(userId: string): Promise<UserRecord | null> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT u.id, u.name, w.id AS workspace_id
     FROM users u
     INNER JOIN workspaces w ON w.owner_user_id = u.id
     WHERE u.id = ?
     LIMIT 1`,
    [userId],
  );
  const row = (rows as { id: string; name: string; workspace_id: string }[])[0];
  if (!row) return null;
  return { id: row.id, name: row.name, workspaceId: row.workspace_id };
}
