import type { Collection, RequestSpec, SavedRequest } from '../../core/types';
import { assertJsonSize } from './jsonLimit';
import { getPool } from './pool';

interface CollectionRow {
  id: string;
  name: string;
  created_at: number;
}

interface SavedRequestRow {
  id: string;
  collection_id: string;
  name: string;
  spec: string | object;
  created_at: number;
  updated_at: number;
}

function parseJson<T>(value: string | object): T {
  if (typeof value === 'string') return JSON.parse(value) as T;
  return value as T;
}

export async function listCollections(workspaceId: string): Promise<Collection[]> {
  const pool = getPool();
  const [collections] = await pool.query(
    `SELECT id, name, created_at
     FROM collections
     WHERE workspace_id = ?
     ORDER BY created_at ASC`,
    [workspaceId],
  );
  const cols = collections as CollectionRow[];
  if (cols.length === 0) return [];

  const ids = cols.map((c) => c.id);
  const [requests] = await pool.query(
    `SELECT id, collection_id, name, spec, created_at, updated_at
     FROM saved_requests
     WHERE collection_id IN (?)
     ORDER BY created_at ASC`,
    [ids],
  );
  const byCollection = new Map<string, SavedRequest[]>();
  for (const row of requests as SavedRequestRow[]) {
    const list = byCollection.get(row.collection_id) ?? [];
    list.push({
      id: row.id,
      name: row.name,
      spec: parseJson<RequestSpec>(row.spec),
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
    });
    byCollection.set(row.collection_id, list);
  }

  return cols.map((c) => ({
    id: c.id,
    name: c.name,
    createdAt: Number(c.created_at),
    requests: byCollection.get(c.id) ?? [],
  }));
}

export async function createCollection(
  workspaceId: string,
  id: string,
  name: string,
  createdAt: number,
): Promise<Collection> {
  const pool = getPool();
  await pool.query(
    'INSERT INTO collections (id, workspace_id, name, created_at) VALUES (?, ?, ?, ?)',
    [id, workspaceId, name, createdAt],
  );
  return { id, name, createdAt, requests: [] };
}

export async function renameCollection(workspaceId: string, id: string, name: string): Promise<boolean> {
  const pool = getPool();
  const [result] = await pool.query(
    'UPDATE collections SET name = ? WHERE id = ? AND workspace_id = ?',
    [name, id, workspaceId],
  );
  return (result as { affectedRows: number }).affectedRows > 0;
}

export async function deleteCollection(workspaceId: string, id: string): Promise<boolean> {
  const pool = getPool();
  const [result] = await pool.query('DELETE FROM collections WHERE id = ? AND workspace_id = ?', [
    id,
    workspaceId,
  ]);
  return (result as { affectedRows: number }).affectedRows > 0;
}

export async function addSavedRequest(
  workspaceId: string,
  collectionId: string,
  saved: SavedRequest,
): Promise<boolean> {
  assertJsonSize(saved.spec, 'spec');
  const pool = getPool();
  const [cols] = await pool.query(
    'SELECT id FROM collections WHERE id = ? AND workspace_id = ?',
    [collectionId, workspaceId],
  );
  if ((cols as { id: string }[]).length === 0) return false;

  await pool.query(
    `INSERT INTO saved_requests (id, collection_id, name, spec, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      saved.id,
      collectionId,
      saved.name,
      JSON.stringify(saved.spec),
      saved.createdAt,
      saved.updatedAt,
    ],
  );
  return true;
}

export async function removeSavedRequest(
  workspaceId: string,
  collectionId: string,
  requestId: string,
): Promise<boolean> {
  const pool = getPool();
  const [result] = await pool.query(
    `DELETE sr FROM saved_requests sr
     INNER JOIN collections c ON c.id = sr.collection_id
     WHERE sr.id = ? AND sr.collection_id = ? AND c.workspace_id = ?`,
    [requestId, collectionId, workspaceId],
  );
  return (result as { affectedRows: number }).affectedRows > 0;
}
