import type { HistoryEntry } from '../../core/types';
import { assertJsonSize } from './jsonLimit';
import { getPool } from './pool';

const HISTORY_LIMIT = 100;

interface HistoryRow {
  id: string;
  method: string;
  url: string;
  status: number;
  duration_ms: number;
  spec: string | object;
  response: string | object;
  curl: string | null;
  created_at: number;
}

function parseJson<T>(value: string | object): T {
  if (typeof value === 'string') return JSON.parse(value) as T;
  return value as T;
}

function rowToEntry(row: HistoryRow): HistoryEntry {
  return {
    id: row.id,
    method: row.method as HistoryEntry['method'],
    url: row.url,
    status: row.status,
    durationMs: row.duration_ms,
    at: Number(row.created_at),
    spec: parseJson(row.spec),
    response: parseJson(row.response),
    curl: row.curl ?? undefined,
  };
}

export async function listHistory(workspaceId: string): Promise<HistoryEntry[]> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, method, url, status, duration_ms, spec, response, curl, created_at
     FROM history_entries
     WHERE workspace_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [workspaceId, HISTORY_LIMIT],
  );
  return (rows as HistoryRow[]).map(rowToEntry);
}

export async function insertHistory(workspaceId: string, entry: HistoryEntry): Promise<void> {
  assertJsonSize(entry.spec, 'spec');
  assertJsonSize(entry.response, 'response');
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO history_entries
        (id, workspace_id, method, url, status, duration_ms, spec, response, curl, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        workspaceId,
        entry.method,
        entry.url.slice(0, 2048),
        entry.status,
        entry.durationMs,
        JSON.stringify(entry.spec),
        JSON.stringify(entry.response),
        entry.curl ?? null,
        entry.at,
      ],
    );
    await conn.query(
      `DELETE FROM history_entries
       WHERE workspace_id = ?
         AND id NOT IN (
           SELECT id FROM (
             SELECT id FROM history_entries
             WHERE workspace_id = ?
             ORDER BY created_at DESC
             LIMIT ?
           ) AS recent
         )`,
      [workspaceId, workspaceId, HISTORY_LIMIT],
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function clearHistory(workspaceId: string): Promise<void> {
  const pool = getPool();
  await pool.query('DELETE FROM history_entries WHERE workspace_id = ?', [workspaceId]);
}
